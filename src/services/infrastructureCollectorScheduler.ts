import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { getDurableCollectorCheckpoint, setDurableCollectorCheckpoint } from './durableCollectorCheckpointService.js';
import { acquireCollectorLock, releaseCollectorLock } from './collectorLockService.js';
import { ingestAwsCloudTrailEvents } from './awsCloudTrailCollector.js';
import { collectAwsStateChanges } from './awsStateChangeCollector.js';
import { collectKubernetesEvents, collectKubernetesState } from './kubernetesEventCollector.js';
import { collectDockerEvents, collectDockerState } from './dockerEventCollector.js';
import { collectLinuxEvents } from './linuxEventCollector.js';

type CollectorName = 'aws-cloudtrail' | 'aws-state' | 'kubernetes-events' | 'kubernetes-state' | 'docker-events' | 'docker-state' | 'linux-events';

interface Checkpoint {
  organizationId: string;
  collector: CollectorName;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastStatus: 'never' | 'running' | 'success' | 'failed';
  lastEmitted: number;
  lastError?: string;
  lastPagesFetched?: number;
  lastTruncated?: boolean;
  staleAfterMs?: number;
}

const INTERVAL_MS = Math.max(Number(process.env.AIME_COLLECTOR_INTERVAL_MS || 60000), 30000);
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function checkpointKey(org: string, collector: string) {
  return `collectorCheckpoint:${org}:${collector}`;
}

function organizations(): string[] {
  const ids: string[] = getCollectionData('organizations', [])
    .map((o: any) => o.id)
    .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id));
  return [...new Set(ids)];
}


function getCheckpoint(org: string, collector: CollectorName): Checkpoint {
  return getCollectionData(checkpointKey(org, collector), {
    organizationId: org,
    collector,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastStatus: 'never',
    lastEmitted: 0,
    staleAfterMs: INTERVAL_MS * 3
  });
}

function saveCheckpoint(cp: Checkpoint) {
  setCollectionData(checkpointKey(cp.organizationId, cp.collector), cp);
}

async function runOne(org: string, collector: CollectorName, fn: () => Promise<any>) {
  const previous = await getDurableCollectorCheckpoint(org, collector, getCheckpoint(org, collector));
  const started = new Date().toISOString();
  await setDurableCollectorCheckpoint({ ...previous, lastStartedAt: started, lastStatus: 'running', lastError: undefined });

  try {
    const result = await fn();
    const emitted = Number(result?.ingested ?? result?.emitted ?? 0);
    await setDurableCollectorCheckpoint({
      ...await getDurableCollectorCheckpoint(org, collector, getCheckpoint(org, collector)),
      lastCompletedAt: new Date().toISOString(),
      lastStatus: 'success',
      lastEmitted: emitted,
      lastError: result?.reason,
      lastPagesFetched: Number.isFinite(Number(result?.pagesFetched)) ? Number(result.pagesFetched) : undefined,
      lastTruncated: Boolean(result?.truncated),
      staleAfterMs: INTERVAL_MS * 3
    });
  } catch (error) {
    await setDurableCollectorCheckpoint({
      ...await getDurableCollectorCheckpoint(org, collector, getCheckpoint(org, collector)),
      lastCompletedAt: new Date().toISOString(),
      lastStatus: 'failed',
      lastEmitted: 0,
      lastError: error instanceof Error ? error.message : String(error),
      staleAfterMs: INTERVAL_MS * 3
    });
  }
}

async function runCollectorsForTenant(org: string) {
  await runOne(org, 'aws-cloudtrail', async () => {
    const previous = await getDurableCollectorCheckpoint(org, 'aws-cloudtrail', getCheckpoint(org, 'aws-cloudtrail'));
    const start = previous.lastCompletedAt
      ? new Date(new Date(previous.lastCompletedAt).getTime() - 30_000)
      : new Date(Date.now() - 5 * 60_000);
    return ingestAwsCloudTrailEvents(org, { startTime: start, endTime: new Date(), maxResults: 50 });
  });

  await runOne(org, 'aws-state', () => collectAwsStateChanges(org));
  await runOne(org, 'kubernetes-events', () => collectKubernetesEvents(org));
  await runOne(org, 'kubernetes-state', () => collectKubernetesState(org));
  await runOne(org, 'docker-events', () => collectDockerEvents(org));
  await runOne(org, 'docker-state', () => collectDockerState(org));
  await runOne(org, 'linux-events', () => collectLinuxEvents(org));
}

export async function runInfrastructureCollectors() {
  if (running) return { skipped: true, reason: 'Collector cycle already running.' };

  const lock = await acquireCollectorLock('all');
  if (!lock) return { skipped: true, reason: 'Collector cycle lease is already held by another instance.' };

  running = true;
  try {
    const orgs = organizations();
    for (const org of orgs) {
      await runCollectorsForTenant(org);
    }
    return { skipped: false, organizations: orgs.length };
  } finally {
    running = false;
    await releaseCollectorLock(lock);
  }
}

export function getCollectorCheckpoints(organizationId: string) {
  const collectors: CollectorName[] = [
    'aws-cloudtrail', 'aws-state',
    'kubernetes-events', 'kubernetes-state',
    'docker-events', 'docker-state',
    'linux-events'
  ];
  const now = Date.now();
  return collectors.map(name => {
    const checkpoint = getCheckpoint(organizationId, name);
    const last = checkpoint.lastCompletedAt ? new Date(checkpoint.lastCompletedAt).getTime() : 0;
    return { ...checkpoint, stale: !last || now - last > (checkpoint.staleAfterMs || INTERVAL_MS * 3) };
  });
}


export function getCollectorHealth(organizationId: string) {
  const checkpoints = getCollectorCheckpoints(organizationId);
  const failed = checkpoints.filter((c: any) => c.lastStatus === 'failed').length;
  const stale = checkpoints.filter((c: any) => c.stale).length;
  const truncated = checkpoints.filter((c: any) => c.lastTruncated).length;
  const healthy = checkpoints.filter((c: any) => c.lastStatus === 'success' && !c.stale && !c.lastTruncated).length;

  const status = failed > 0 ? 'failed' : stale > 0 || truncated > 0 ? 'degraded' : 'healthy';

  return {
    organizationId,
    status,
    healthy,
    stale,
    truncated,
    failed,
    total: checkpoints.length,
    checkedAt: new Date().toISOString(),
    collectors: checkpoints
  };
}

export function startInfrastructureCollectorScheduler() {
  if (timer) return;
  const enabled = process.env.AIME_COLLECTOR_SCHEDULER !== 'false';
  if (!enabled) {
    console.log('[AIME Collector] Scheduler disabled by AIME_COLLECTOR_SCHEDULER=false');
    return;
  }

  void runInfrastructureCollectors();
  timer = setInterval(() => void runInfrastructureCollectors(), INTERVAL_MS);
  console.log(`[AIME Collector] Scheduler started; interval=${INTERVAL_MS}ms`);
}

export function stopInfrastructureCollectorScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
