import { getCollectionData } from '../db/firestoreDb.js';
import { executeCommand } from './sshService.js';
import { createInfrastructureEvent, InfrastructureEvent } from '../types/infrastructureEvent.js';
import { ingestInfrastructureEvent } from './infrastructureEventService.js';

export interface LinuxCollectorResult {
  source: 'live' | 'seed';
  emitted: number;
  events: InfrastructureEvent[];
  reason?: string;
}

export function linuxCollectorServers(organizationId: string): any[] {
  return getCollectionData('servers', []).filter(
    (server: any) => server.organizationId === organizationId
  );
}

function makeEvent(
  organizationId: string,
  server: any,
  resourceType: string,
  eventType: InfrastructureEvent['eventType'],
  severity: InfrastructureEvent['severity'],
  after: unknown,
  tags: string[]
): InfrastructureEvent {
  return createInfrastructureEvent({
    organizationId,
    source: 'linux',
    resourceType,
    resourceId: server.id,
    resourceName: server.name || server.hostname || server.ip,
    eventType,
    timestamp: new Date().toISOString(),
    severity,
    actor: 'aime-collector',
    after,
    tags: ['linux', ...tags],
    isLive: true
  });
}

function parseMetrics(output: string) {
  const memoryLine = output.split('\n').find(line => /^Mem:/i.test(line.trim()));
  const memory = memoryLine?.trim().split(/\s+/) || [];
  const totalMb = Number(memory[1] || 0);
  const usedMb = Number(memory[2] || 0);
  const memoryPercent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;
  const diskMatch = output.match(/\s(\d+)%\s+\/\s*$/m);
  const loadMatch = output.match(/load average[s]?:\s*([\d.]+)/i);

  return {
    memoryPercent,
    totalMb,
    usedMb,
    diskPercent: Number(diskMatch?.[1] || 0),
    load1: Number(loadMatch?.[1] || 0)
  };
}

async function collectServer(organizationId: string, server: any): Promise<InfrastructureEvent[]> {
  const events: InfrastructureEvent[] = [];

  const metrics = await executeCommand(server.id, 'free -m; df -P /; uptime');
  if (metrics.exitCode !== 0) return events;

  const parsed = parseMetrics(metrics.output);

  if (parsed.memoryPercent >= 90) {
    events.push(makeEvent(
      organizationId, server, 'system', 'metric.threshold', 'critical',
      { metric: 'memory', percent: parsed.memoryPercent, usedMb: parsed.usedMb, totalMb: parsed.totalMb },
      ['metrics', 'memory']
    ));
  }

  if (parsed.diskPercent >= 85) {
    events.push(makeEvent(
      organizationId, server, 'filesystem', 'metric.threshold',
      parsed.diskPercent >= 95 ? 'critical' : 'warning',
      { metric: 'disk', mount: '/', percent: parsed.diskPercent },
      ['metrics', 'disk']
    ));
  }

  if (parsed.load1 >= 4) {
    events.push(makeEvent(
      organizationId, server, 'system', 'metric.threshold', 'warning',
      { metric: 'load1', value: parsed.load1 },
      ['metrics', 'load']
    ));
  }

  const failedServices = await executeCommand(
    server.id,
    'systemctl list-units --type=service --state=failed --no-pager --no-legend 2>/dev/null | head -n 30'
  );

  if (failedServices.exitCode === 0 && failedServices.output.trim()) {
    events.push(makeEvent(
      organizationId, server, 'systemd-service', 'incident.detected', 'warning',
      { failedServices: failedServices.output.trim().split('\n').slice(0, 30) },
      ['systemd', 'failed-service']
    ));
  }

  const journal = await executeCommand(
    server.id,
    'journalctl -p warning..alert -n 50 --no-pager 2>/dev/null || true'
  );

  if (journal.exitCode === 0 && journal.output.trim()) {
    events.push(makeEvent(
      organizationId, server, 'journal', 'incident.detected', 'warning',
      { lines: journal.output.slice(0, 12000) },
      ['journal', 'system-log']
    ));
  }

  const packages = await executeCommand(
    server.id,
    "sh -c 'if command -v apt >/dev/null 2>&1; then apt list --upgradable 2>/dev/null | tail -n +2 | head -n 50; elif command -v dnf >/dev/null 2>&1; then dnf check-update 2>/dev/null | head -n 50; elif command -v yum >/dev/null 2>&1; then yum check-update 2>/dev/null | head -n 50; fi'"
  );

  if (packages.exitCode === 0 && packages.output.trim()) {
    events.push(makeEvent(
      organizationId, server, 'package-manager', 'configuration.changed', 'info',
      { pendingUpdates: packages.output.trim().split('\n').slice(0, 50) },
      ['packages', 'updates']
    ));
  }

  return events;
}

export async function collectLinuxEvents(organizationId: string): Promise<LinuxCollectorResult> {
  const servers = linuxCollectorServers(organizationId);

  if (!servers.length) {
    return {
      source: 'seed',
      emitted: 0,
      events: [],
      reason: 'No tenant Linux servers are registered.'
    };
  }

  const events: InfrastructureEvent[] = [];

  for (const server of servers) {
    try {
      events.push(...await collectServer(organizationId, server));
    } catch (error) {
      console.warn(`[Linux Collector] Collection failed for ${server.name || server.id}:`, (error as Error).message);
    }
  }

  const ingested = events.map(ingestInfrastructureEvent);

  return {
    source: 'live',
    emitted: ingested.length,
    events: ingested,
    reason: ingested.length
      ? undefined
      : 'SSH collection completed, but no Linux threshold or system events were detected.'
  };
}
