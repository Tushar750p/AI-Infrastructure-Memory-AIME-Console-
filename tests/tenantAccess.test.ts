import assert from 'node:assert/strict';
import { belongsToTenant, findTenantRecord, tenantRecords } from '../src/services/tenantAccess.js';

const records = [
  { id: 'a', organizationId: 'org-aime-01' },
  { id: 'b', organizationId: 'org-other' }
];

assert.equal(belongsToTenant(records[0], 'org-aime-01'), true);
assert.equal(belongsToTenant(records[0], 'org-other'), false);
assert.deepEqual(tenantRecords(records, 'org-aime-01').map(r => r.id), ['a']);
assert.equal(findTenantRecord(records, 'org-other', r => r.id === 'a'), undefined);
assert.equal(findTenantRecord(records, 'org-other', r => r.id === 'b')?.id, 'b');

console.log('Tenant isolation helper tests passed.');
