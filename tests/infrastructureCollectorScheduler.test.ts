import assert from 'node:assert/strict';
import { getCollectorHealth } from '../src/services/infrastructureCollectorScheduler.js';

process.env.AIME_COLLECTOR_INTERVAL_MS = '30000';

const health = getCollectorHealth('org-test');

assert.equal(health.organizationId, 'org-test');
assert.equal(health.total, 7);
assert.ok(['healthy', 'degraded', 'failed'].includes(health.status));
assert.equal(typeof health.truncated, 'number');
assert.equal(typeof health.stale, 'number');
assert.equal(typeof health.failed, 'number');
assert.equal(typeof health.healthy, 'number');
assert.ok(Array.isArray(health.collectors));
assert.equal(health.collectors.length, 7);

console.log('Infrastructure collector health tests passed.');
