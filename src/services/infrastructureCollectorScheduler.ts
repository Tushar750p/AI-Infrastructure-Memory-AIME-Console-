import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
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
}

const INTERVAL_MS = Math.max(Number(process.env.AIME_COLLECTOR_INTERVAL_MS || 60000), 30000);
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function checkpointKey(org: string, collector: string) {
  return `collectorCheckpoint:${org}:${collector}`;
}

function organizations(): string[] {
  return [...new Set(
    getCollectionData('organizations', [])
      .map((o: any) => o.id)
      .filter(Boolean)
  )];
}

function getCheckpoint(org: string, collector: CollectorName): Checkpoint {
  return getCollectionData(checkpointKey(org, collector), {
    organizationId: org,
    collector,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastStatus: 'never',
    lastEmitted: 0
  });
}

function saveCheckpoint(cp: Checkpoint) {
  setCollectionData(checkpointKey(cp.organizationId, cp.collector), cp);
}

async function runOne(org: string, collector: CollectorName, fn: () => Promise<any>) {
  const previous = getCheckpoint(org, collector);
  const started = new Date().toISOString();
  saveCheckpoint({ ...previous, lastStartedAt: started, lastStatus: 'running', lastError: undefined });

  try {
    const result = await fn();
    const emitted = Number(result?.ingested ?? result?.emitted ?? 0);
    saveCheckpoint({
      ...getCheckpoint(org, collector),
      lastCompletedAt: new Date().toISOString(),
      lastStatus: 'success',
      lastEmitted: emitted,
      lastError: result?.reason
    });
  } catch (error) {
    saveCheckpoint({
      ...getCheckpoint(org, collector),
      lastCompletedAt: new Date().toISOString(),
      lastStatus: 'failed',
      lastEmitted: 0,
      lastError: error instanceof Error ? error.message : String(error)
    });
  }
}

async function runCollectorsForTenant(org: string) {
  await runOne(org, 'aws-cloudtrail', () => {
    const previous = getCheckpoint(org, 'aws-cloudtrail');
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
  running = true;

  try {
    for (const org of organizations()) {
      await runCollectorsForTenant(org);
    }
    return { skipped: false, organizations: organizations().length };
  } finally {
    running = false;
  }
}

export function getCollectorCheckpoints(organizationId: string) {
  const collectors: CollectorName[] = [
    'aws-cloudtrail', 'aws-state',
    'kubernetes-events', 'kubernetes-state',
    'docker-events', 'docker-state',
    'linux-events'
  ];
  return collectors.map(name => getCheckpoint(organizationId, name));
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
