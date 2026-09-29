import Docker from 'dockerode';
import fs from 'fs';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent, createInfrastructureEvent } from '../types/infrastructureEvent.js';
import { ingestInfrastructureEvent } from './infrastructureEventService.js';
import { captureDockerRollbackSnapshot, getLatestDockerRollbackSnapshot, preserveDockerRollbackCandidate } from './dockerRollbackSnapshotService.js';

export interface DockerCollectorResult {
  source: 'live' | 'seed';
  emitted: number;
  events: InfrastructureEvent[];
  reason?: string;
}

function hostsForTenant(organizationId: string): any[] {
  return getCollectionData('dockerHosts', []).filter(
    (host: any) => host.organizationId === organizationId
  );
}

function clientForHost(host: any): Docker | null {
  const socketPath = String(host.socketPath || '').trim();
  if (socketPath) {
    if (!fs.existsSync(socketPath)) return null;
    return new Docker({ socketPath });
  }

  const endpoint = String(host.endpoint || '').trim();
  if (!endpoint) return null;

  try {
    const url = new URL(endpoint);
    if (!['tcp:', 'http:', 'https:'].includes(url.protocol)) return null;
    return new Docker({
      protocol: url.protocol.replace(':', '') as any,
      host: url.hostname,
      port: Number(url.port || 2375)
    });
  } catch {
    return null;
  }
}

function actionType(action: string): InfrastructureEvent['eventType'] {
  if (action === 'create') return 'resource.created';
  if (action === 'destroy') return 'resource.deleted';
  if (['start', 'stop', 'die', 'kill', 'restart', 'pause', 'unpause', 'oom'].includes(action)) {
    return 'resource.state_changed';
  }
  return 'configuration.changed';
}

function actionSeverity(action: string): InfrastructureEvent['severity'] {
  if (action === 'oom' || action === 'die') return 'critical';
  if (['stop', 'kill'].includes(action)) return 'warning';
  return 'info';
}

function mapEvent(raw: any, organizationId: string, host: any): InfrastructureEvent {
  const action = String(raw.Action || raw.status || 'unknown').toLowerCase();
  const attrs = raw.Actor?.Attributes || {};
  const id = String(raw.id || raw.ID || raw.Actor?.ID || 'unknown');
  const timestamp = raw.timeNano
    ? new Date(Number(raw.timeNano) / 1e6).toISOString()
    : raw.time
      ? new Date(Number(raw.time) * 1000).toISOString()
      : new Date().toISOString();

  return createInfrastructureEvent({
    organizationId,
    source: 'docker',
    resourceType: 'container',
    resourceId: id,
    resourceName: attrs.name || id,
    eventType: actionType(action),
    timestamp,
    severity: actionSeverity(action),
    actor: attrs.image || 'docker-engine',
    after: { action, status: raw.status, image: attrs.image, exitCode: attrs.exitCode },
    rawEvent: raw,
    correlationId: id,
    tags: ['docker', host.name || host.id, action],
    isLive: true
  });
}

function snapshotKey(org: string, host: any): string {
  return `dockerStateSnapshot:${org}:${host.id}`;
}

export async function collectDockerEvents(organizationId: string): Promise<DockerCollectorResult> {
  const hosts = hostsForTenant(organizationId);
  if (!hosts.length) {
    return { source: 'seed', emitted: 0, events: [], reason: 'No tenant Docker host has been registered.' };
  }

  const events: InfrastructureEvent[] = [];

  for (const host of hosts) {
    const docker = clientForHost(host);
    if (!docker) continue;

    try {
      await docker.ping();
      const stream: any = await docker.getEvents({
        since: Math.floor(Date.now() / 1000) - 300
      });

      const rawEvents = await new Promise<any[]>((resolve, reject) => {
        const parsed: any[] = [];
        let buffer = '';
        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try { parsed.push(JSON.parse(line)); } catch {}
          }
        });
        stream.on('end', () => resolve(parsed));
        stream.on('error', reject);
      });

      events.push(...rawEvents.map(event => mapEvent(event, organizationId, host)));
    } catch (error) {
      console.warn(`[Docker Collector] Event collection failed for ${host.name || host.id}:`, (error as Error).message);
    }
  }

  const ingested = events.map(ingestInfrastructureEvent);
  return {
    source: 'live',
    emitted: ingested.length,
    events: ingested,
    reason: ingested.length ? undefined : 'Docker API was reachable, but no new events were returned.'
  };
}

export async function collectDockerState(organizationId: string): Promise<DockerCollectorResult> {
  const hosts = hostsForTenant(organizationId);
  if (!hosts.length) {
    return { source: 'seed', emitted: 0, events: [], reason: 'No tenant Docker host has been registered.' };
  }

  const events: InfrastructureEvent[] = [];

  for (const host of hosts) {
    const docker = clientForHost(host);
    if (!docker) continue;

    try {
      await docker.ping();
      const containers = await docker.listContainers({ all: true });
      const current = Object.fromEntries(containers.map(c => [
        c.Id,
        {
          id: c.Id,
          name: (c.Names?.[0] || '').replace(/^\//, ''),
          image: c.Image,
          state: c.State,
          status: c.Status
        }
      ]));
      const previous = getCollectionData(snapshotKey(organizationId, host), {}) as Record<string, any>;

      for (const [id, after] of Object.entries(current)) {
        const latestSnapshot = getLatestDockerRollbackSnapshot(organizationId, host.id, id);
        if (!latestSnapshot) {
          try {
            await captureDockerRollbackSnapshot(organizationId, host.id, id);
          } catch (error) {
            console.warn(`[Docker Collector] Initial rollback snapshot failed for ${id}:`, (error as Error).message);
          }
        }
        const before = previous[id];
        if (!before) {
          events.push(createInfrastructureEvent({
            organizationId,
            source: 'docker',
            resourceType: 'container',
            resourceId: id,
            resourceName: (after as any).name,
            eventType: 'resource.created',
            timestamp: new Date().toISOString(),
            severity: 'info',
            actor: 'aime-collector',
            after,
            tags: ['docker', host.name || host.id, 'container'],
            isLive: true
          }));
        } else if (JSON.stringify(before) !== JSON.stringify(after)) {
          const changeEvent = createInfrastructureEvent({
            organizationId,
            source: 'docker',
            resourceType: 'container',
            resourceId: id,
            resourceName: (after as any).name,
            eventType: before.state !== (after as any).state ? 'resource.state_changed' : 'resource.updated',
            timestamp: new Date().toISOString(),
            severity: /exited|dead/i.test(String((after as any).state)) ? 'warning' : 'info',
            actor: 'aime-collector',
            before,
            after,
            tags: ['docker', host.name || host.id, 'container'],
            isLive: true
          });
          events.push(changeEvent);
          if (latestSnapshot) {
            try {
              preserveDockerRollbackCandidate(organizationId, host.id, id, latestSnapshot, changeEvent.id);
            } catch (error) {
              console.warn(`[Docker Collector] Rollback candidate preservation failed for ${id}:`, (error as Error).message);
            }
          }
          try {
            await captureDockerRollbackSnapshot(organizationId, host.id, id);
          } catch (error) {
            console.warn(`[Docker Collector] Post-change rollback snapshot failed for ${id}:`, (error as Error).message);
          }
        }
      }

      for (const [id, before] of Object.entries(previous)) {
        if (!current[id]) {
          events.push(createInfrastructureEvent({
            organizationId,
            source: 'docker',
            resourceType: 'container',
            resourceId: id,
            resourceName: (before as any).name,
            eventType: 'resource.deleted',
            timestamp: new Date().toISOString(),
            severity: 'warning',
            actor: 'aime-collector',
            before,
            tags: ['docker', host.name || host.id, 'container'],
            isLive: true
          }));
        }
      }

      setCollectionData(snapshotKey(organizationId, host), current);
    } catch (error) {
      console.warn(`[Docker Collector] State collection failed for ${host.name || host.id}:`, (error as Error).message);
    }
  }

  const ingested = events.map(ingestInfrastructureEvent);
  return {
    source: 'live',
    emitted: ingested.length,
    events: ingested,
    reason: ingested.length ? undefined : 'Docker API was reachable, but no container state changes were detected.'
  };
}
