import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';
import {
  collectKubernetesEvents,
  collectKubernetesState
} from '../src/services/kubernetesEventCollector.js';
import { getCollectionData, setCollectionData } from '../src/db/firestoreDb.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

async function run() {
  const organizationId = 'org-k8s-collector-test';
  const clusterId = 'cluster-no-credentials';
  const clusters = getCollectionData('k8sClusters', []);
  clusters.unshift({
    id: clusterId,
    name: 'test-cluster',
    provider: 'Generic Kubernetes',
    organizationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  setCollectionData('k8sClusters', clusters);

  const eventResult = await collectKubernetesEvents(organizationId);
  assert(eventResult.source === 'seed', 'Collector does not claim live mode without tenant kubeconfig');
  assert(eventResult.emitted === 0, 'No fake Kubernetes events are emitted without live credentials');

  const stateResult = await collectKubernetesState(organizationId);
  assert(stateResult.source === 'seed', 'State collector remains explicit about missing live credentials');
  assert(stateResult.emitted === 0, 'No fake Kubernetes state changes are emitted without live credentials');

  const event = createInfrastructureEvent({
    organizationId,
    source: 'kubernetes',
    resourceType: 'pod',
    resourceId: 'pod-123',
    resourceName: 'api-123',
    eventType: 'incident.detected',
    timestamp: new Date().toISOString(),
    severity: 'warning',
    actor: 'kubelet',
    after: { reason: 'Unhealthy' },
    tags: ['kubernetes', 'pod'],
    isLive: true
  });

  assert(event.source === 'kubernetes', 'Canonical event schema supports Kubernetes source');
  assert(event.isLive === true, 'Kubernetes canonical events preserve live marker');
  console.log('Kubernetes collector tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
