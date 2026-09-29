import assert from 'node:assert/strict';
import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';

const event = createInfrastructureEvent({
  organizationId: 'org-test',
  source: 'aws',
  resourceType: 'AWS::EC2::Instance',
  resourceId: 'i-test',
  eventType: 'resource.state_changed',
  timestamp: new Date().toISOString(),
  severity: 'warning',
  actor: 'test-user',
  isLive: true
});

assert.equal(event.organizationId, 'org-test');
assert.equal(event.source, 'aws');
assert.equal(event.isLive, true);
assert.ok(event.collectorVersion.startsWith('aime-collector/'));
assert.ok(event.id.startsWith('evt-'));
console.log('AWS CloudTrail event schema tests passed.');
