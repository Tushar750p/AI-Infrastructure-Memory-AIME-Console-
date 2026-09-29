import * as k8s from '@kubernetes/client-node';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent, createInfrastructureEvent } from '../types/infrastructureEvent.js';
import { ingestInfrastructureEvent } from './infrastructureEventService.js';
import { decryptSecret } from './sshService.js';

export interface KubernetesCollectorResult {
  source: 'live' | 'seed';
  emitted: number;
  events: InfrastructureEvent[];
  reason?: string;
}

function tenantClusters(organizationId: string): any[] {
  return getCollectionData('k8sClusters', []).filter(
    (cluster: any) => cluster.organizationId === organizationId
  );
}

function buildKubeConfig(cluster: any): k8s.KubeConfig | null {
  if (!cluster?.kubeconfig) return null;

  try {
    const raw = decryptSecret(cluster.kubeconfig);
    const config = new k8s.KubeConfig();
    config.loadFromString(raw);
    return config;
  } catch (error) {
    console.warn('[Kubernetes Collector] Unable to load tenant kubeconfig:', (error as Error).message);
    return null;
  }
}

function getCoreApi(config: k8s.KubeConfig): k8s.CoreV1Api {
  return config.makeApiClient(k8s.CoreV1Api);
}

function getAppsApi(config: k8s.KubeConfig): k8s.AppsV1Api {
  return config.makeApiClient(k8s.AppsV1Api);
}

function responseItems(response: any): any[] {
  return response?.items || response?.body?.items || [];
}

function severityForEvent(event: any): InfrastructureEvent['severity'] {
  if (event.type === 'Warning') return 'warning';
  const reason = String(event.reason || '').toLowerCase();
  if (/(failed|error|unhealthy|backoff|evicted|notready)/.test(reason)) return 'warning';
  return 'info';
}

function eventTypeForK8sEvent(event: any): InfrastructureEvent['eventType'] {
  const reason = String(event.reason || '').toLowerCase();
  if (/(failed|error|unhealthy|backoff|evicted)/.test(reason)) return 'incident.detected';
  if (/(scheduled|created|pulled|started|successful|provisioned)/.test(reason)) return 'resource.state_changed';
  if (/(delete|deleted|terminated)/.test(reason)) return 'resource.deleted';
  return 'configuration.changed';
}

function mapKubernetesEvent(event: any, organizationId: string, cluster: any): InfrastructureEvent {
  const involved = event.involvedObject || {};
  const resourceType = String(involved.kind || 'KubernetesEvent').toLowerCase();
  const resourceId = String(involved.uid || involved.name || event.metadata?.uid || 'unknown');
  const resourceName = involved.name || resourceId;
  const timestamp = event.lastTimestamp || event.eventTime || event.firstTimestamp || event.metadata?.creationTimestamp || new Date().toISOString();

  return createInfrastructureEvent({
    organizationId,
    source: 'kubernetes',
    resourceType,
    resourceId,
    resourceName,
    eventType: eventTypeForK8sEvent(event),
    timestamp: new Date(timestamp).toISOString(),
    severity: severityForEvent(event),
    actor: event.source?.component || event.reportingController || 'kubernetes',
    before: undefined,
    after: {
      reason: event.reason,
      type: event.type,
      message: event.message,
      count: event.count
    },
    rawEvent: event,
    correlationId: event.metadata?.uid || undefined,
    tags: ['kubernetes', cluster.name, resourceType, String(event.reason || 'unknown')],
    isLive: true
  });
}

async function collectClusterEvents(
  organizationId: string,
  cluster: any,
  config: k8s.KubeConfig
): Promise<InfrastructureEvent[]> {
  const api = getCoreApi(config);
  const response = await api.listEventForAllNamespaces();
  return responseItems(response).map(event => mapKubernetesEvent(event, organizationId, cluster));
}

function snapshotKey(organizationId: string, clusterId: string, resourceType: string): string {
  return `k8sStateSnapshot:${organizationId}:${clusterId}:${resourceType}`;
}

function snapshotById(items: any[], idField: string = 'id'): Record<string, any> {
  return Object.fromEntries(items.map(item => [String(item[idField]), item]));
}

function emitStateChange(
  organizationId: string,
  cluster: any,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  before: any,
  after: any,
  eventType: InfrastructureEvent['eventType'],
  severity: InfrastructureEvent['severity']
): InfrastructureEvent {
  return createInfrastructureEvent({
    organizationId,
    source: 'kubernetes',
    resourceType,
    resourceId,
    resourceName,
    eventType,
    timestamp: new Date().toISOString(),
    severity,
    actor: 'aime-collector',
    before,
    after,
    tags: ['kubernetes', cluster.name, resourceType, eventType],
    isLive: true
  });
}

function diffSnapshots(
  organizationId: string,
  cluster: any,
  resourceType: string,
  previous: Record<string, any>,
  current: Record<string, any>
): InfrastructureEvent[] {
  const events: InfrastructureEvent[] = [];

  for (const [id, after] of Object.entries(current)) {
    const before = previous[id];
    if (!before) {
      events.push(emitStateChange(
        organizationId, cluster, resourceType, id, after.name || id,
        undefined, after, 'resource.created', 'info'
      ));
      continue;
    }

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      const statusChanged =
        before.status !== after.status ||
        before.ready !== after.ready ||
        before.available !== after.available;

      events.push(emitStateChange(
        organizationId,
        cluster,
        resourceType,
        id,
        after.name || id,
        before,
        after,
        statusChanged ? 'resource.state_changed' : 'resource.updated',
        /notready|failed|unhealthy|crashloop/i.test(String(after.status || '')) ? 'warning' : 'info'
      ));
    }
  }

  for (const [id, before] of Object.entries(previous)) {
    if (!current[id]) {
      events.push(emitStateChange(
        organizationId, cluster, resourceType, id, before.name || id,
        before, undefined, 'resource.deleted', 'warning'
      ));
    }
  }

  return events;
}

async function collectClusterState(
  organizationId: string,
  cluster: any,
  config: k8s.KubeConfig
): Promise<InfrastructureEvent[]> {
  const core = getCoreApi(config);
  const apps = getAppsApi(config);

  const [nodesResponse, podsResponse, deploymentsResponse] = await Promise.all([
    core.listNode(),
    core.listPodForAllNamespaces(),
    apps.listDeploymentForAllNamespaces()
  ]);

  const nodes = responseItems(nodesResponse).map((node: any) => {
    const ready = node.status?.conditions?.find((condition: any) => condition.type === 'Ready');
    return {
      id: node.metadata?.uid || node.metadata?.name,
      name: node.metadata?.name || 'unknown',
      status: ready?.status === 'True' ? 'Ready' : 'NotReady',
      ready: ready?.status === 'True',
      version: node.status?.nodeInfo?.kubeletVersion,
      labels: node.metadata?.labels || {}
    };
  });

  const pods = responseItems(podsResponse).map((pod: any) => ({
    id: pod.metadata?.uid || pod.metadata?.name,
    name: pod.metadata?.name || 'unknown',
    namespace: pod.metadata?.namespace || 'default',
    status: pod.status?.phase || 'Unknown',
    ready: (pod.status?.containerStatuses || []).every((container: any) => container.ready),
    restartCount: (pod.status?.containerStatuses || []).reduce(
      (sum: number, container: any) => sum + Number(container.restartCount || 0), 0
    )
  }));

  const deployments = responseItems(deploymentsResponse).map((deployment: any) => ({
    id: deployment.metadata?.uid || deployment.metadata?.name,
    name: deployment.metadata?.name || 'unknown',
    namespace: deployment.metadata?.namespace || 'default',
    status: deployment.status?.conditions?.find((condition: any) => condition.type === 'Progressing')?.reason || 'Unknown',
    ready: Number(deployment.status?.readyReplicas || 0),
    available: Number(deployment.status?.availableReplicas || 0),
    replicas: Number(deployment.spec?.replicas || 0),
    image: deployment.spec?.template?.spec?.containers?.map((container: any) => container.image).join(',') || ''
  }));

  const resourceSets = [
    ['node', nodes],
    ['pod', pods],
    ['deployment', deployments]
  ] as const;

  const events: InfrastructureEvent[] = [];

  for (const [resourceType, items] of resourceSets) {
    const key = snapshotKey(organizationId, cluster.id, resourceType);
    const previous = getCollectionData(key, {}) as Record<string, any>;
    const current = snapshotById(items);
    events.push(...diffSnapshots(organizationId, cluster, resourceType, previous, current));
    setCollectionData(key, current);
  }

  return events;
}

export async function collectKubernetesEvents(organizationId: string): Promise<KubernetesCollectorResult> {
  const clusters = tenantClusters(organizationId);
  const configured = clusters.filter(cluster => Boolean(cluster.kubeconfig));

  if (configured.length === 0) {
    return {
      source: 'seed',
      emitted: 0,
      events: [],
      reason: 'No tenant Kubernetes cluster has an encrypted kubeconfig configured.'
    };
  }

  const events: InfrastructureEvent[] = [];

  for (const cluster of configured) {
    const config = buildKubeConfig(cluster);
    if (!config) continue;

    try {
      events.push(...await collectClusterEvents(organizationId, cluster, config));
    } catch (error) {
      console.warn(`[Kubernetes Collector] Event collection failed for ${cluster.name}:`, (error as Error).message);
    }
  }

  const ingested = events.map(ingestInfrastructureEvent);

  return {
    source: 'live',
    emitted: ingested.length,
    events: ingested,
    reason: ingested.length === 0 ? 'Live Kubernetes API was reachable, but no new events were emitted.' : undefined
  };
}

export async function collectKubernetesState(organizationId: string): Promise<KubernetesCollectorResult> {
  const clusters = tenantClusters(organizationId);
  const configured = clusters.filter(cluster => Boolean(cluster.kubeconfig));

  if (configured.length === 0) {
    return {
      source: 'seed',
      emitted: 0,
      events: [],
      reason: 'No tenant Kubernetes cluster has an encrypted kubeconfig configured.'
    };
  }

  const events: InfrastructureEvent[] = [];

  for (const cluster of configured) {
    const config = buildKubeConfig(cluster);
    if (!config) continue;

    try {
      events.push(...await collectClusterState(organizationId, cluster, config));
    } catch (error) {
      console.warn(`[Kubernetes Collector] State collection failed for ${cluster.name}:`, (error as Error).message);
    }
  }

  const ingested = events.map(ingestInfrastructureEvent);

  return {
    source: 'live',
    emitted: ingested.length,
    events: ingested,
    reason: ingested.length === 0 ? 'Live Kubernetes API was reachable, but no resource changes were detected.' : undefined
  };
}
