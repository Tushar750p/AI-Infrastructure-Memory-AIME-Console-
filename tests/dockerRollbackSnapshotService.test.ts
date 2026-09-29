import assert from 'node:assert/strict';
import { dockerRollbackSnapshotKey, verifyDockerRollbackSnapshot } from '../src/services/dockerRollbackSnapshotService.js';

assert.equal(
  dockerRollbackSnapshotKey('org-test', 'host-1', 'container-1'),
  'dockerRollbackSnapshot:org-test:host-1:container-1'
);

assert.throws(
  () => verifyDockerRollbackSnapshot({ schemaVersion: 2 }),
  /no integrity hash/
);

assert.throws(
  () => verifyDockerRollbackSnapshot({
    schemaVersion: 2,
    organizationId: 'org-test',
    image: 'nginx:latest',
    integrityHash: 'tampered'
  }),
  /integrity verification failed/
);

console.log('Docker rollback snapshot integrity tests passed.');
