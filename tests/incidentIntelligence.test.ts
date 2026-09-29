import { analyzeIncident } from '../src/services/incidentIntelligenceService.js';
import { getCollectionData, setCollectionData } from '../src/db/firestoreDb.js';
import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

async function run() {
  const org = 'org-incident-test';
  const base = Date.now();

  const events = [
    createInfrastructureEvent({
      organizationId: org, source: 'linux', resourceType: 'system',
      resourceId: 'srv-test', resourceName: 'linux-test',
      eventType: 'configuration.changed',
      timestamp: new Date(base).toISOString(), severity: 'warning',
      actor: 'test', before: { limit: 100 }, after: { limit: 10 },
      tags: ['test'], isLive: true
    }),
    createInfrastructureEvent({
      organizationId: org, source: 'docker', resourceType: 'container',
      resourceId: 'container-test', resourceName: 'app-test',
      eventType: 'incident.detected',
      timestamp: new Date(base + 60_000).toISOString(), severity: 'critical',
      actor: 'test', tags: ['test'], isLive: true
    })
  ];

  const all = getCollectionData('infrastructureEvents', []);
  setCollectionData('infrastructureEvents', [...events, ...all]);

  const { correlateInfrastructureEvents } = await import('../src/services/eventIntelligenceService.js');
  const groups = correlateInfrastructureEvents(org, 15);
  assert(groups.length >= 1, 'Related events form a correlation group');

  const intelligence = analyzeIncident(org, groups[0].correlationId);
  assert(!!intelligence, 'Incident intelligence is generated');
  assert((intelligence?.evidence.length || 0) >= 2, 'Incident includes surrounding evidence');
  assert((intelligence?.rootCauseCandidates.length || 0) >= 1, 'Root-cause candidates are evidence based');

  console.log('Incident intelligence tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
