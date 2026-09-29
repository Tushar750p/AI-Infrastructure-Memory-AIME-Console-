import Docker from 'dockerode';
import fs from 'fs';
import { getCollectionData } from '../db/firestoreDb.js';
import { getRollback, transitionRollback } from './remediationService.js';
import { getDockerRollbackSnapshot, decodeSnapshotEnv, verifyDockerRollbackSnapshot } from './dockerRollbackSnapshotService.js';

function dockerClient(host: any): Docker | null {
  if (host.socketPath && fs.existsSync(host.socketPath)) return new Docker({ socketPath: host.socketPath });
  if (!host.endpoint) return null;
  try {
    const url = new URL(host.endpoint);
    if (!['tcp:', 'http:', 'https:'].includes(url.protocol)) return null;
    return new Docker({ protocol: url.protocol.replace(':', '') as any, host: url.hostname, port: Number(url.port || 2375) });
  } catch { return null; }
}


export async function validateSnapshotCompatibility(docker: Docker, snapshot: any) {
  verifyDockerRollbackSnapshot(snapshot);
  if (!snapshot.image) throw new Error('Rollback snapshot has no Docker image.');
  try {
    await docker.getImage(snapshot.image).inspect();
  } catch {
    throw new Error(`Rollback preflight failed: Docker image "${snapshot.image}" is not available on the target host.`);
  }

  const networkMode = String(snapshot.networkMode || '');
  if (networkMode && networkMode !== 'default' && !networkMode.startsWith('container:') && !networkMode.startsWith('host')) {
    try {
      await docker.getNetwork(networkMode).inspect();
    } catch {
      throw new Error(`Rollback preflight failed: Docker network "${networkMode}" is not available on the target host.`);
    }
  }

  const binds = Array.isArray(snapshot.binds) ? snapshot.binds : [];
  for (const bind of binds) {
    const source = String(bind).split(':')[0];
    if (!source || !source.startsWith('/')) continue;
    if (!fs.existsSync(source)) {
      throw new Error(`Rollback preflight failed: bind source "${source}" is not available on the target host.`);
    }
  }
}

export async function executeDockerRollback(organizationId: string, rollbackId: string) {
  const rollback = getRollback(organizationId, rollbackId);
  if (!rollback) throw new Error('Rollback not found.');
  if (rollback.status !== 'approved') throw new Error('Rollback must be explicitly approved.');
  if (!['docker_container_snapshot', 'docker_container_config'].includes(rollback.rollbackType)) {
    throw new Error('Docker rollback requires docker_container_snapshot or docker_container_config.');
  }

  const separator = rollback.resourceId.indexOf(':');
  if (separator <= 0) throw new Error('Docker rollback resourceId must be hostId:containerId.');
  const hostId = rollback.resourceId.slice(0, separator);
  const containerId = rollback.resourceId.slice(separator + 1);

  const snapshot = getDockerRollbackSnapshot(organizationId, hostId, containerId);
  if (!snapshot) throw new Error('No trusted Docker rollback snapshot exists for this tenant resource.');

  const host = getCollectionData('dockerHosts', []).find((h: any) => h.organizationId === organizationId && h.id === hostId);
  if (!host) throw new Error('Tenant-authorized Docker host not found.');
  const docker = dockerClient(host);
  if (!docker) throw new Error('Docker host connection is unavailable.');

  try {
    await docker.ping();
    if (rollback.rollbackType === 'docker_container_config') {
      await validateSnapshotCompatibility(docker, snapshot);
    }
    transitionRollback(organizationId, rollbackId, 'approved', 'executing');
    let container = docker.getContainer(containerId);
    let current: any;
    try {
      current = await container.inspect();
    } catch (error) {
      const snapshotName = String(snapshot.name || '').replace(/^\\//, '');
      if (!snapshotName) throw error;
      container = docker.getContainer(snapshotName);
      current = await container.inspect();
    }

    if (rollback.rollbackType === 'docker_container_snapshot') {
      if (current.Config?.Image !== snapshot.image) {
        throw new Error('Rollback refused: current container image differs from trusted snapshot.');
      }
      if (snapshot.running && !current.State?.Running) await container.start();
      if (!snapshot.running && current.State?.Running) await container.stop();
    } else if (rollback.rollbackType === 'docker_container_config') {
      const wasRunning = Boolean(current.State?.Running);
      if (wasRunning) await container.stop();
      await container.remove({ force: true });
      const recreated = await docker.createContainer({
        name: String(snapshot.name || containerId).replace(/^\//, ''),
        Image: snapshot.image,
        Env: decodeSnapshotEnv(snapshot.env),
        Cmd: snapshot.cmd,
        Entrypoint: snapshot.entrypoint,
        WorkingDir: snapshot.workingDir,
        ExposedPorts: snapshot.exposedPorts,
        Labels: snapshot.labels,
        HostConfig: {
          Binds: snapshot.binds,
          PortBindings: snapshot.portBindings,
          NetworkMode: snapshot.networkMode,
          RestartPolicy: snapshot.restartPolicy,
          Privileged: snapshot.privileged
        }
      } as any);
      if (snapshot.running) await recreated.start();
    } else {
      throw new Error('Unsupported Docker rollback type.');
    }

    let verified: any;
    let verifiedContainerId = containerId;
    try {
      verified = await docker.getContainer(containerId).inspect();
    } catch {
      const byName = docker.getContainer(String(snapshot.name || '').replace(/^\//, ''));
      verified = await byName.inspect();
      verifiedContainerId = String(verified.Id || verified.Id || containerId);
    }
    if (Boolean(verified.State?.Running) !== Boolean(snapshot.running)) {
      throw new Error('Docker rollback verification failed: state does not match snapshot.');
    }

    const verification = `Docker container ${verifiedContainerId} restored from snapshot captured at ${snapshot.capturedAt}.`;
    transitionRollback(organizationId, rollbackId, 'executing', 'verified', { verification });
    return { success: true, rollbackId, resourceId: `${hostId}:${verifiedContainerId}`, verification };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    transitionRollback(organizationId, rollbackId, 'executing', 'failed', { failureReason });
    throw error;
  }
}
