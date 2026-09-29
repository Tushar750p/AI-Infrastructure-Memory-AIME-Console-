import Docker from 'dockerode';
import fs from 'fs';
import crypto from 'crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { encryptSecret, decryptSecret } from './sshService.js';

const SECRET_ENV_PATTERN = /(^|_)(PASSWORD|PASS|TOKEN|SECRET|KEY|PRIVATE|CREDENTIAL|APIKEY|API_KEY|AUTH)(_|$)/i;

function protectEnv(env: string[]) {
  return env.map((entry) => {
    const separator = entry.indexOf('=');
    if (separator <= 0) return entry;
    const name = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    return SECRET_ENV_PATTERN.test(name) ? `${name}=__AIME_ENCRYPTED__${encryptSecret(value)}` : entry;
  });
}

export function decodeSnapshotEnv(env: string[] = []) {
  return env.map((entry) => {
    const marker = '=__AIME_ENCRYPTED__';
    const index = entry.indexOf(marker);
    if (index < 0) return entry;
    const name = entry.slice(0, index);
    const encrypted = entry.slice(index + marker.length);
    return `${name}=${decryptSecret(encrypted)}`;
  });
}

function snapshotHash(snapshot: Record<string, any>) {
  const { integrityHash, ...unsigned } = snapshot;
  return crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('hex');
}

export function verifyDockerRollbackSnapshot(snapshot: any) {
  if (!snapshot?.integrityHash) throw new Error('Rollback snapshot has no integrity hash.');
  if (snapshotHash(snapshot) !== snapshot.integrityHash) throw new Error('Rollback snapshot integrity verification failed.');
  return true;
}

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
    env: protectEnv(inspected.Config?.Env || []),
    cmd: inspected.Config?.Cmd || [],
    entrypoint: inspected.Config?.Entrypoint || [],
    workingDir: inspected.Config?.WorkingDir || '',
    exposedPorts: inspected.Config?.ExposedPorts || {},
    labels: inspected.Config?.Labels || {},
    binds: inspected.HostConfig?.Binds || [],
    portBindings: inspected.HostConfig?.PortBindings || {},
    networkMode: inspected.HostConfig?.NetworkMode || '',
    restartPolicy: inspected.HostConfig?.RestartPolicy || {},
    privileged: Boolean(inspected.HostConfig?.Privileged),
    schemaVersion: 2
  };
  snapshot.integrityHash = snapshotHash(snapshot);

  setCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), snapshot);
  return snapshot;
}

export function preserveDockerRollbackCandidate(
  organizationId: string,
  hostId: string,
  containerId: string,
  snapshot: any,
  eventId: string
) {
  verifyDockerRollbackSnapshot(snapshot);
  const key = `dockerRollbackCandidate:${organizationId}:${hostId}:${containerId}:${eventId}`;
  setCollectionData(key, { ...snapshot, candidateEventId: eventId, candidateCreatedAt: new Date().toISOString() });
  return key;
}

export function getDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  return getCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), null);
}
