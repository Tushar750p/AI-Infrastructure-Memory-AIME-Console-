import assert from 'node:assert/strict';
import { dockerRollbackSnapshotKey } from '../src/services/dockerRollbackSnapshotService.js';

assert.equal(
  dockerRollbackSnapshotKey('org-auto', 'host-1', 'container-1'),
  'dockerRollbackSnapshot:org-auto:host-1:container-1'
);

console.log('Docker automatic snapshot key tests passed.');
