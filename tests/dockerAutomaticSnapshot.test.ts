import assert from 'node:assert/strict';
import { dockerRollbackSnapshotKey } from '../src/services/dockerRollbackSnapshotService.js';
import { collectDockerState } from '../src/services/dockerEventCollector.js';

assert.equal(
  dockerRollbackSnapshotKey('org-auto', 'host-1', 'container-1'),
  'dockerRollbackSnapshot:org-auto:host-1:container-1'
);

const result = await collectDockerState('org-auto-no-host-' + Date.now());
assert.equal(result.source, 'seed');
assert.equal(result.emitted, 0);
assert.match(result.reason || '', /No tenant Docker host/);

assert.notEqual(
  dockerRollbackSnapshotKey('org-auto-a', 'host-1', 'container-1'),
  dockerRollbackSnapshotKey('org-auto-b', 'host-1', 'container-1')
);

console.log('Docker automatic snapshot isolation tests passed.');
