import Docker from 'dockerode';
import fs from 'fs';
import { getCollectionData } from '../db/firestoreDb.js';
import { getRollback, transitionRollback } from './remediationService.js';
import { getDockerRollbackSnapshot } from './dockerRollbackSnapshotService.js';

function dockerClient(host: any): Docker | null {
  if (host.socketPath && fs.existsSync(host.socketPath)) return new Docker({ socketPath: host.socketPath });
  if (!host.endpoint) return null;
  try {
    const url = new URL(host.endpoint);
    if (!['tcp:', 'http:', 'https:'].includes(url.protocol)) return null;
    return new Docker({ protocol: url.protocol.replace(':', '') as any, host: url.hostname, port: Number(url.port || 2375) });
  } catch { return null; }
}

export async function executeDockerRollback(organizationId: string, rollbackId: string) {
  const rollback = getRollback(organizationId, rollbackId);
  if (!rollback) throw new Error('Rollback not found.');
  if (rollback.status !== 'approved') throw new Error('Rollback must be explicitly approved.');
  if (rollback.rollbackType !== 'docker_container_snapshot') {
    throw new Error('Docker rollback requires rollbackType docker_container_snapshot.');
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

  transitionRollback(organizationId, rollbackId, 'approved', 'executing');

  try {
    await docker.ping();
    const container = docker.getContainer(containerId);
    const current = await container.inspect();

    if (current.Config?.Image !== snapshot.image) {
      throw new Error('Rollback refused: current container image differs from trusted snapshot.');
    }

    if (snapshot.running && !current.State?.Running) await container.start();
    if (!snapshot.running && current.State?.Running) await container.stop();

    const verified = await container.inspect();
    if (Boolean(verified.State?.Running) !== Boolean(snapshot.running)) {
      throw new Error('Docker rollback verification failed: state does not match snapshot.');
    }

    const verification = `Docker container ${containerId} restored to snapshot state captured at ${snapshot.capturedAt}.`;
    transitionRollback(organizationId, rollbackId, 'executing', 'verified', { verification });
    return { success: true, rollbackId, resourceId: rollback.resourceId, verification };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    transitionRollback(organizationId, rollbackId, 'executing', 'failed', { failureReason });
    throw error;
  }
}
