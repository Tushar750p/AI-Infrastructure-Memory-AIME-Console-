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

function dockerRollbackTargetKey(org: string, hostId: string, containerId: string) {
  return `dockerRollbackTarget:${org}:${hostId}:${containerId}`;
}

export async function captureDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  const host = getCollectionData('dockerHosts', []).find((h: any) => h.organizationId === organizationId && h.id === hostId);
  if (!host) throw new Error('Tenant-authorized Docker host not found.');
  const docker = dockerClient(host);
  if (!docker) throw new Error('Docker host connection is unavailable.');

  const container = docker.getContainer(containerId);
  const inspected: any = await container.inspect();
  const snapshot: Record<string, any> = {
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
    user: inspected.Config?.User || '',
    healthcheck: inspected.Config?.Healthcheck || null,
    stopSignal: inspected.Config?.StopSignal || '',
    stopTimeout: inspected.Config?.StopTimeout ?? null,
    tty: Boolean(inspected.Config?.Tty),
    openStdin: Boolean(inspected.Config?.OpenStdin),
    networkSettings: inspected.NetworkSettings?.Networks || {},
    devices: inspected.HostConfig?.Devices || [],
    capabilities: {
      capAdd: inspected.HostConfig?.CapAdd || [],
      capDrop: inspected.HostConfig?.CapDrop || []
    },
    securityOpt: inspected.HostConfig?.SecurityOpt || [],
    init: Boolean(inspected.HostConfig?.Init),
    readOnlyRootfs: Boolean(inspected.HostConfig?.ReadonlyRootfs),
    schemaVersion: 3
  };
  snapshot.integrityHash = snapshotHash(snapshot);

  setCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), snapshot);
  if (!getCollectionData(dockerRollbackTargetKey(organizationId, hostId, containerId), null)) {
    setCollectionData(dockerRollbackTargetKey(organizationId, hostId, containerId), snapshot);
  }
  return snapshot;
}

function pruneDockerRollbackCandidates(organizationId: string, hostId: string, containerId: string) {
  const retention = Math.min(Math.max(Number(process.env.AIME_DOCKER_ROLLBACK_RETENTION || 50), 5), 500);
  const candidates = getCollectionData('dockerRollbackCandidates', [])
    .filter((candidate: any) =>
      !(candidate.organizationId === organizationId && candidate.hostId === hostId && candidate.containerId === containerId)
    );
  const allCandidates = getCollectionData('dockerRollbackCandidates', []);
  const scoped = allCandidates
    .filter((candidate: any) =>
      candidate.organizationId === organizationId &&
      candidate.hostId === hostId &&
      candidate.containerId === containerId
    )
    .sort((a: any, b: any) => {
      const timeDiff =
        new Date(b.candidateCreatedAt || 0).getTime() -
        new Date(a.candidateCreatedAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(b.candidateEventId || '').localeCompare(String(a.candidateEventId || ''));
    });
  const retained = scoped.slice(0, retention);
  const retainedKeys = new Set(
    retained.map((candidate: any) =>
      `dockerRollbackCandidate:${organizationId}:${hostId}:${containerId}:${candidate.candidateEventId}`
    )
  );
  for (const candidate of scoped.slice(retention)) {
    const key = `dockerRollbackCandidate:${organizationId}:${hostId}:${containerId}:${candidate.candidateEventId}`;
    if (!retainedKeys.has(key)) setCollectionData(key, null);
  }
  const retainedSet = new Set(retained);
  const remaining = allCandidates.filter((candidate: any) =>
    !(candidate.organizationId === organizationId && candidate.hostId === hostId && candidate.containerId === containerId)
    || retainedSet.has(candidate)
  );
  setCollectionData('dockerRollbackCandidates', remaining.slice(0, 50000));
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
  const candidate = {
    ...snapshot,
    organizationId,
    hostId,
    containerId,
    candidateEventId: eventId,
    candidateCreatedAt: snapshot.capturedAt || new Date().toISOString()
  };
  setCollectionData(key, candidate);
  const candidates = getCollectionData('dockerRollbackCandidates', []);
  candidates.unshift(candidate);
  setCollectionData('dockerRollbackCandidates', candidates.slice(0, 50000));
  pruneDockerRollbackCandidates(organizationId, hostId, containerId);
  setCollectionData(dockerRollbackTargetKey(organizationId, hostId, containerId), candidate);
  return key;
}

function migrateSnapshotEnv(snapshot: any) {
  if (!snapshot || !Array.isArray(snapshot.env)) return snapshot;
  let migrated = false;
  const env = snapshot.env.map((entry: string) => {
    const marker = '=__AIME_ENCRYPTED__';
    const index = entry.indexOf(marker);
    if (index < 0) return entry;
    const encrypted = entry.slice(index + marker.length);
    if (encrypted.startsWith('v1:')) return entry;
    const name = entry.slice(0, index);
    const plaintext = decryptSecret(encrypted);
    migrated = true;
    return `${name}=__AIME_ENCRYPTED__${encryptSecret(plaintext)}`;
  });
  if (!migrated) return snapshot;
  const migratedSnapshot = { ...snapshot, env, schemaVersion: Math.max(Number(snapshot.schemaVersion || 0), 3) };
  migratedSnapshot.integrityHash = snapshotHash(migratedSnapshot);
  return migratedSnapshot;
}

export function migrateLatestDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  const key = dockerRollbackSnapshotKey(organizationId, hostId, containerId);
  const snapshot = getCollectionData(key, null);
  if (!snapshot) return null;
  const migrated = migrateSnapshotEnv(snapshot);
  if (migrated !== snapshot) setCollectionData(key, migrated);
  return migrated;
}

export function getLatestDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  return getCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), null);
}

export function listDockerRollbackCandidates(organizationId: string, hostId: string, containerId: string, limit = 20) {
  return getCollectionData('dockerRollbackCandidates', [])
    .filter((candidate: any) =>
      candidate.organizationId === organizationId &&
      candidate.hostId === hostId &&
      candidate.containerId === containerId
    )
    .sort((a: any, b: any) => {
      const timeDiff =
        new Date(b.candidateCreatedAt || 0).getTime() -
        new Date(a.candidateCreatedAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(b.candidateEventId || '').localeCompare(String(a.candidateEventId || ''));
    })
    .slice(0, Math.min(Math.max(limit, 1), 100));
}

export function getDockerRollbackCandidate(organizationId: string, hostId: string, containerId: string, candidateEventId: string) {
  return getCollectionData(`dockerRollbackCandidate:${organizationId}:${hostId}:${containerId}:${candidateEventId}`, null);
}

export function getDockerRollbackSnapshot(organizationId: string, hostId: string, containerId: string) {
  return getCollectionData(dockerRollbackTargetKey(organizationId, hostId, containerId), null) || getCollectionData(dockerRollbackSnapshotKey(organizationId, hostId, containerId), null);
}
