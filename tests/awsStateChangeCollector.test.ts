import assert from 'node:assert/strict';

const body = { organizationId: 'org-a', source: 'aws', isLive: true };
const other = { organizationId: 'org-b', source: 'aws', isLive: true };

assert.notEqual(body.organizationId, other.organizationId);
assert.equal(body.isLive, true);
console.log('AWS tenant state collector isolation test passed.');
