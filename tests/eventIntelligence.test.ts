import assert from 'node:assert/strict';
import { fingerprintEvent, correlateInfrastructureEvents } from '../src/services/eventIntelligenceService.js';
import { getCollectionData, setCollectionData } from '../src/db/firestoreDb.js';

const base = {
  organizationId: 'org-correlation-test',
  timestamp: new Date().toISOString(),
  severity: 'warning' as const,
  isLive: true,
  collectorVersion: 'aime-collector/1.0',
  createdAt: new Date().toISOString()
};

const a = { ...base, id: 'a', source: 'aws' as const, resourceType: 'EC2', resourceId: 'i-1', eventType: 'resource.state_changed' as const };
const b = { ...base, id: 'b', source: 'linux' as const, resourceType: 'server', resourceId: 'i-1', eventType: 'metric.threshold' as const };

assert.equal(fingerprintEvent(a), fingerprintEvent(a));
setCollectionData('infrastructureEvents', [a, b]);
const groups = correlateInfrastructureEvents('org-correlation-test', 15);
assert.equal(groups.length, 1);
assert.equal(groups[0].eventIds.length, 2);
assert.ok(groups[0].confidence > 0.55);
console.log('Event intelligence tests passed.');
