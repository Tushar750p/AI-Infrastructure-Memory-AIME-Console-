import assert from 'node:assert/strict';
import { proposeRemediation, approveRemediation, transitionRemediation } from '../src/services/remediationService.js';

const base = {
  organizationId: 'org-rem-test',
  resourceId: 'i-test',
  actionType: 'restart_service',
  description: 'Test restart',
  reason: 'Test failure',
  riskLevel: 'medium' as const,
  proposedBy: 'test-user',
  evidenceEventIds: []
};

const proposed = proposeRemediation(base);
assert.equal(proposed.status, 'proposed');

const approved = approveRemediation('org-rem-test', proposed.id, 'approver');
assert.equal(approved?.status, 'approved');
assert.equal(approved?.approvedBy, 'approver');

const executing = transitionRemediation('org-rem-test', proposed.id, 'approved', 'executing');
assert.equal(executing?.status, 'executing');
assert.ok(executing?.executionLock);

assert.throws(
  () => transitionRemediation('org-rem-test', proposed.id, 'approved', 'executing'),
  /already locked|Invalid remediation transition/
);

const verified = transitionRemediation(
  'org-rem-test',
  proposed.id,
  'executing',
  'verified',
  { verification: 'Test verification passed.' }
);
assert.equal(verified?.status, 'verified');
assert.equal(verified?.executionLock, undefined);
assert.equal(verified?.verification, 'Test verification passed.');

console.log('Remediation lifecycle tests passed.');


const invalidRollback = () => proposeRollback({ organizationId: '', remediationId: 'r', resourceId: 'h:c', rollbackType: 'docker_container_snapshot', description: 'x', reason: 'x', proposedBy: 'u', evidenceEventIds: [] });
assert.throws(invalidRollback, /organizationId/);
