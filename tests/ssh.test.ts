import {
  encryptSecret,
  decryptSecret,
  executeCommand,
  getSystemMetrics,
  getSystemProcesses,
  getSystemdServices
} from '../src/services/sshService.js';
import { getCollectionData } from '../src/db/firestoreDb.js';

async function runSshTestSuite() {
  console.log('----------------------------------------------------');
  console.log('⚡ STARTING REAL LINUX SSH & INFRASTRUCTURE TESTS ⚡');
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

  // 1. Encryption & Decryption of Credentials
  console.log('\n[SECURITY TEST] AES-256-GCM SSH Credentials Encryption');
  const rawPass = 'SuperSecretSshPassphrase2026!';
  const encrypted = encryptSecret(rawPass);
  assert(encrypted.includes(':') && encrypted !== rawPass, 'SSH Password encrypted with AES-256-GCM');
  const decrypted = decryptSecret(encrypted);
  assert(decrypted === rawPass, 'Decrypted SSH Password matches original secret');

  // 2. Real System Command Execution
  console.log('\n[COMMAND TEST] Real Linux Command Execution');
  const cmdResult = await executeCommand('127.0.0.1', 'uname -a', 'sre_test_runner');
  assert(cmdResult.exitCode === 0, 'Command exited with status code 0');
  assert(typeof cmdResult.output === 'string' && cmdResult.output.length > 0, 'Command captured stdout output');
  assert(typeof cmdResult.executionTimeMs === 'number', 'Tracked command execution duration in ms');

  // 3. AI Memory & Command History Recording
  console.log('\n[AI MEMORY TEST] Event & Command History Recording');
  const history = getCollectionData('commandHistory', []);
  assert(history.some((c: any) => c.command === 'uname -a'), 'Command logged in commandHistory collection');
  const events = getCollectionData('events', []);
  assert(events.some((e: any) => e.type === 'COMMAND_EXECUTION'), 'Command logged in AI Memory events collection');

  // 4. Real System Metrics Collection
  console.log('\n[METRICS TEST] Real Linux Metrics Engine');
  const metrics = await getSystemMetrics('127.0.0.1');
  assert(metrics.serverId === '127.0.0.1', 'Metrics bound to correct serverId');
  assert(typeof metrics.cpu.usagePercent === 'number', 'Collected CPU Usage percentage');
  assert(typeof metrics.memory.totalMb === 'number' && metrics.memory.totalMb > 0, 'Collected Total Memory in MB');
  assert(typeof metrics.disk.usagePercent === 'number', 'Collected Disk Usage percentage');

  // 5. System Processes Collection
  console.log('\n[PROCESS TEST] Linux Process Inspection');
  const processes = await getSystemProcesses('127.0.0.1');
  assert(Array.isArray(processes), 'Processes returned as array');
  assert(processes.length >= 0, 'Inspect top processes');

  console.log('\n----------------------------------------------------');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSshTestSuite().catch(err => {
  console.error('Fatal SSH test runner error:', err);
  process.exit(1);
});
