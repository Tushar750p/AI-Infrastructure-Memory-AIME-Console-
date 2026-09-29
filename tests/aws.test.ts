import {
  getEc2Instances,
  executeEc2Action,
  getRdsInstances,
  getS3Buckets,
  getEksClusters,
  getCloudWatchMetrics,
  getCloudTrailEvents,
  runAwsSecurityAudit
} from '../src/services/awsService.js';
import { getCollectionData } from '../src/db/firestoreDb.js';

async function runAwsTestSuite() {
  console.log('----------------------------------------------------');
  console.log('☁️ STARTING REAL AWS SDK V3 INTEGRATION TESTS ☁️');
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

  // 1. EC2 Instance Operations
  console.log('\n[EC2 TEST] EC2 Instance Discovery & Lifecycle Actions');
  const instances = await getEc2Instances();
  assert(Array.isArray(instances) && instances.length > 0, 'Discovered EC2 instances');
  assert(Boolean(instances[0].instanceId && instances[0].state), 'Validated EC2 metadata payload');

  const targetId = instances[0].instanceId;
  const stopRes = await executeEc2Action(targetId, 'stop', 'aws_sre_test');
  assert(stopRes.message.includes('executed successfully'), 'Executed EC2 Stop Action');

  const startRes = await executeEc2Action(targetId, 'start', 'aws_sre_test');
  assert(startRes.message.includes('executed successfully'), 'Executed EC2 Start Action');

  const rebootRes = await executeEc2Action(targetId, 'reboot', 'aws_sre_test');
  assert(rebootRes.message.includes('executed successfully'), 'Executed EC2 Reboot Action');

  // 2. RDS Database Discovery
  console.log('\n[RDS TEST] RDS Database Clusters');
  const rdsList = await getRdsInstances();
  assert(Array.isArray(rdsList) && rdsList.length > 0, 'Discovered RDS DB Instances');
  assert(Boolean(rdsList[0].dbIdentifier && rdsList[0].engine), 'Validated RDS instance engine & endpoint');

  // 3. S3 Bucket Discovery
  console.log('\n[S3 TEST] S3 Buckets & Security Configuration');
  const s3Buckets = await getS3Buckets();
  assert(Array.isArray(s3Buckets) && s3Buckets.length > 0, 'Discovered S3 Buckets');
  assert(typeof s3Buckets[0].isPublic === 'boolean', 'Validated S3 Bucket public access check');

  // 4. EKS Kubernetes Clusters
  console.log('\n[EKS TEST] Amazon EKS Clusters');
  const eksClusters = await getEksClusters();
  assert(Array.isArray(eksClusters) && eksClusters.length > 0, 'Discovered EKS Clusters');

  // 5. CloudWatch Metrics
  console.log('\n[CLOUDWATCH TEST] Real-Time CloudWatch Metrics');
  const metrics = await getCloudWatchMetrics();
  assert(typeof metrics.cpuAverage === 'number' && metrics.cpuAverage >= 0, 'Collected CloudWatch CPU metrics');

  // 6. CloudTrail Audit Events
  console.log('\n[CLOUDTRAIL TEST] CloudTrail Events Lookup');
  const trailEvents = await getCloudTrailEvents();
  assert(Array.isArray(trailEvents) && trailEvents.length > 0, 'Fetched CloudTrail audit events');

  // 7. Security Audit Engine
  console.log('\n[SECURITY TEST] AWS IAM & Infrastructure Security Findings');
  const securityReport = await runAwsSecurityAudit();
  assert(securityReport.score > 0 && Array.isArray(securityReport.findings), 'Executed AWS Security Audit Engine');

  // 8. AI Memory & Audit Logs Recording
  console.log('\n[AI MEMORY TEST] Recorded AWS Resource Events & Audit Logs');
  const memoryEvents = getCollectionData('events', []);
  assert(memoryEvents.some((e: any) => e.type === 'AWS_RESOURCE_CHANGE'), 'Recorded AWS action in AI Memory events');

  const auditLogs = getCollectionData('auditLogs', []);
  assert(auditLogs.some((a: any) => a.action.startsWith('AWS_')), 'Recorded AWS action in Audit Logs');

  console.log('\n----------------------------------------------------');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAwsTestSuite().catch(err => {
  console.error('Fatal AWS test runner error:', err);
  process.exit(1);
});
