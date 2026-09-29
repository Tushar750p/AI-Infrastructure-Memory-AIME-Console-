import Docker from 'dockerode';
import fs from 'fs';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

function dockerClient(host: any): Docker | null {
  if (host.socketPath && fs.existsSync(host.socketPath)) return new Docker({ socketPath: host.socketPath });
  if (!host.endpoint) return null;
  try {
    const url = new URL(host.endpoint);
    if (!['tcp:', 'http:', 'https:'].includes(url.protocol)) return null;
    return new Docker({ protocol: url.protocol.replace(':', '') as any, host: url.hostname, port: Number(url.port || 2375) });
  } catch { return null; }
}

export function dockerRollbackSnapshotKey(org: string, hostId: string, containerId: string) {
  return `dockerRollbackSnapshot:${org}:${hostId}:${containerId}`;
}

export async function captureDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  const host = getCollectionData('dockerHosts', []).find((h: any) => h.organizationId === organizationId && h.id === hostId);
  if (!host) throw new Error('Tenant-authorized Docker host not found.');
  const docker = dockerClient(host);
  if (!docker) throw new Error('Docker host connection is unavailable.');

  const container = docker.getContainer(containerId);
  const inspected = await container.inspect();
  const snapshot = {
    organizationId,
    hostId,
    containerId,
    capturedAt: new Date().toISOString(),
    image: inspected.Config?.Image || '',
    running: Boolean(inspected.State?.Running),
    name: inspected.Name || containerId,
    env: inspected.Config?.Env || [],
    cmd: inspected.Config?.Cmd || [],
    entrypoint: inspected.Config?.Entrypoint || [],
    workingDir: inspected.Config?.WorkingDir || '',
    exposedPorts: inspected.Config?.ExposedPorts || {},
    labels: inspected.Config?.Labels || {},
    binds: inspected.HostConfig?.Binds || [],
    portBindings: inspected.HostConfig?.PortBindings || {},
    networkMode: inspected.HostConfig?.NetworkMode || '',
    restartPolicy: inspected.HostConfig?.RestartPolicy || {},
    privileged: Boolean(inspected.HostConfig?.Privileged)
  };

  setCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), snapshot);
  return snapshot;
}

export function getDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  return getCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), null);
}
