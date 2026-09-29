import {
  listKubernetesClusters,
  getClusterNodes,
  getClusterPods,
  getClusterDeployments,
  getClusterServices,
  getKubernetesEvents,
  getPodLogs,
  restartDeployment,
  scaleDeployment,
  rollbackDeployment
} from '../src/services/k8sService.js';
import { getCollectionData } from '../src/db/firestoreDb.js';

async function runKubernetesTestSuite() {
  console.log('----------------------------------------------------');
  console.log('☸️ STARTING REAL KUBERNETES ENGINE INTEGRATION TESTS ☸️');
  console.log('----------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Cluster Management
  console.log('\n[CLUSTER TEST] Cluster Discovery');
  const clusters = await listKubernetesClusters();
  assert(Array.isArray(clusters) && clusters.length > 0, 'Listed registered Kubernetes clusters');

  // 2. Node Discovery
  console.log('\n[NODE TEST] Node Discovery & Health');
  const nodes = await getClusterNodes();
  assert(Array.isArray(nodes) && nodes.length > 0, 'Discovered Kubernetes cluster nodes');
  assert(nodes[0].status === 'Ready', 'Node ready status validated');

  // 3. Workloads - Pods & Deployments
  console.log('\n[WORKLOAD TEST] Pods & Deployments Inspection');
  const pods = await getClusterPods();
  assert(Array.isArray(pods) && pods.length > 0, 'Discovered active Kubernetes pods');

  const deployments = await getClusterDeployments();
  assert(Array.isArray(deployments) && deployments.length > 0, 'Discovered Kubernetes deployments');

  // 4. Deployment Lifecycle Actions (Restart, Scale, Rollback)
  console.log('\n[LIFECYCLE TEST] Deployment Rolling Restart & Scaling');
  const targetDep = deployments[0].name;
  
  const restartRes = await restartDeployment(targetDep, 'default', 'sre_test_suite');
  assert(restartRes.message.includes('restart'), 'Triggered deployment rolling restart');

  const scaleRes = await scaleDeployment(targetDep, 5, 'default', 'sre_test_suite');
  assert(scaleRes.message.includes('scaled to 5'), 'Scaled deployment replicas');

  const rollbackRes = await rollbackDeployment(targetDep, 'default', 'sre_test_suite');
  assert(rollbackRes.message.includes('rolled back'), 'Triggered deployment rollback');

  // 5. Network & Services
  console.log('\n[NETWORK TEST] Services & Ingress Networking');
  const services = await getClusterServices();
  assert(Array.isArray(services) && services.length > 0, 'Discovered Kubernetes cluster services');

  // 6. Logs & Events
  console.log('\n[LOGS & EVENTS TEST] Pod Logs & Cluster Events');
  const logs = await getPodLogs(pods[0].name, pods[0].namespace);
  assert(typeof logs === 'string' && logs.length > 0, 'Fetched pod stdout/stderr logs');

  const events = await getKubernetesEvents();
  assert(Array.isArray(events) && events.length > 0, 'Collected cluster events');

  // 7. AI Memory & Audit Logs Recording
  console.log('\n[AI MEMORY TEST] Recorded K8s Rollout Events & Audit Logs');
  const memoryEvents = getCollectionData('events', []);
  assert(memoryEvents.some((e: any) => e.type === 'KUBERNETES_ROLLOUT' || e.type === 'KUBERNETES_ROLLBACK'), 'Recorded Kubernetes deployment action in AI Memory');

  const auditLogs = getCollectionData('auditLogs', []);
  assert(auditLogs.some((a: any) => a.action.startsWith('K8S_')), 'Recorded K8s action in Audit Logs');

  console.log('\n----------------------------------------------------');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runKubernetesTestSuite().catch(err => {
  console.error('Fatal Kubernetes test runner error:', err);
  process.exit(1);
});
