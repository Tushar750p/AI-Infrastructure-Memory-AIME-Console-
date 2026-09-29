import { calculateFailureRisk } from '../src/services/failureRiskService.js';
import { getCollectionData, setCollectionData } from '../src/db/firestoreDb.js';
import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

async function run() {
  const org = 'org-risk-test';
  const now = Date.now();

  const events = Array.from({ length: 3 }, (_, i) => createInfrastructureEvent({
    organizationId: org,
    source: 'linux',
    resourceType: 'system',
    resourceId: 'risk-server',
    resourceName: 'risk-server',
    eventType: i === 2 ? 'incident.detected' : 'metric.threshold',
    timestamp: new Date(now - i * 60_000).toISOString(),
    severity: i === 2 ? 'critical' : 'warning',
    actor: 'test',
    tags: ['risk-test'],
    isLive: true
  }));

  const all = getCollectionData('infrastructureEvents', []);
  setCollectionData('infrastructureEvents', [...events, ...all]);

  const signals = await calculateFailureRisk(org, 24);
  assert(signals.length >= 1, 'Repeated infrastructure instability creates a risk signal');
  assert(signals[0].riskScore >= 40, 'Risk score crosses the actionable threshold');
  assert(signals[0].evidenceEventIds.length >= 3, 'Risk signal retains event evidence');

  console.log('Failure risk tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
