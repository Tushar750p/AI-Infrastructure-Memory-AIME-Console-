import {
  listDockerContainers,
  inspectDockerContainer,
  performContainerAction,
  getContainerLogs,
  getContainerStats,
  listDockerImages,
  listDockerVolumes,
  listDockerNetworks,
  checkDockerEngineHealth
} from '../src/services/dockerService.js';
import { getCollectionData } from '../src/db/firestoreDb.js';

async function runDockerTestSuite() {
  console.log('----------------------------------------------------');
  console.log('🐳 STARTING REAL DOCKER ENGINE INTEGRATION TESTS 🐳');
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

  // 1. Docker Engine Connection Check
  console.log('\n[DOCKER CONNECTION TEST] Docker Engine Socket/Host Detection');
  const isAlive = await checkDockerEngineHealth();
  console.log(` Docker Engine socket state: ${isAlive ? 'ONLINE (Live Socket)' : 'PERSISTED ENGINE MODE'}`);
  assert(typeof isAlive === 'boolean', 'Health status returned boolean response');

  // 2. Container Listing & Inspection
  console.log('\n[CONTAINER TEST] Container Listing & Inspection');
  const containers = await listDockerContainers();
  assert(Array.isArray(containers) && containers.length > 0, 'Listed active/registered Docker containers');
  
  const firstContainer = containers[0];
  const inspected = await inspectDockerContainer(firstContainer.id);
  assert(inspected && (inspected.id === firstContainer.id || inspected.name === firstContainer.name), 'Inspected Docker container details');

  // 3. Container Lifecycle Action (Restart & Stop)
  console.log('\n[LIFECYCLE TEST] Container Lifecycle Management');
  const restartRes = await performContainerAction(firstContainer.id, 'restart', 'sre_test_suite');
  assert(restartRes.message.includes('restart'), 'Executed container RESTART action');

  // 4. Container Logs & Metrics
  console.log('\n[METRICS & LOGS TEST] Container Stats & Stream Logs');
  const logs = await getContainerLogs(firstContainer.id, 50);
  assert(typeof logs === 'string' && logs.length > 0, 'Fetched container live stdout/stderr logs');

  const stats = await getContainerStats(firstContainer.id);
  assert(typeof stats.cpuPercent === 'number' && typeof stats.memoryMb === 'number', 'Collected container CPU/Memory metrics');

  // 5. Images, Volumes, Networks
  console.log('\n[RESOURCES TEST] Docker Images, Volumes & Networks');
  const images = await listDockerImages();
  assert(Array.isArray(images) && images.length > 0, 'Listed Docker images repository');

  const volumes = await listDockerVolumes();
  assert(Array.isArray(volumes) && volumes.length > 0, 'Listed Docker storage volumes');

  const networks = await listDockerNetworks();
  assert(Array.isArray(networks) && networks.length > 0, 'Listed Docker overlay/bridge networks');

  // 6. AI Memory Event Recording
  console.log('\n[AI MEMORY TEST] Recorded Container Events & Audit Logs');
  const events = getCollectionData('events', []);
  assert(events.some((e: any) => e.type === 'CONTAINER_LIFECYCLE'), 'Container lifecycle recorded in AI Memory events');

  const auditLogs = getCollectionData('auditLogs', []);
  assert(auditLogs.some((a: any) => a.action.startsWith('CONTAINER_')), 'Container action recorded in Audit Logs');

  console.log('\n----------------------------------------------------');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDockerTestSuite().catch(err => {
  console.error('Fatal Docker test runner error:', err);
  process.exit(1);
});
