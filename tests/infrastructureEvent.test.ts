import assert from 'node:assert/strict';
import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';
import { ingestInfrastructureEvent, listInfrastructureEvents } from '../src/services/infrastructureEventService.js';

const event = createInfrastructureEvent({ organizationId: 'org-test', source: 'aws', resourceType: 'ec2', resourceId: 'i-test', eventType: 'resource.state_changed', timestamp: new Date().toISOString(), severity: 'info', isLive: true });
assert.equal(event.organizationId, 'org-test');
assert.equal(event.isLive, true);
ingestInfrastructureEvent(event);
assert.equal(listInfrastructureEvents('org-test', 10).some(e => e.id === event.id), true);
assert.equal(listInfrastructureEvents('org-other', 10).some(e => e.id === event.id), false);
console.log('Infrastructure event ingestion tests passed.');