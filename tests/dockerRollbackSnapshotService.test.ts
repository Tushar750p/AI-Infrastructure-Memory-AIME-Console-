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

assert.throws(() => verifyDockerRollbackSnapshot({ ...unsigned, integrityHash: 'tampered' }), /integrity verification failed/);

console.log('Docker rollback snapshot integrity tests passed.');

const unsigned = {
  organizationId: 'org-test',
  hostId: 'host-1',
  containerId: 'container-1',
  capturedAt: '2026-01-01T00:00:00.000Z',
  image: 'nginx:latest',
  running: true,
  name: '/web',
  env: ['APP_MODE=prod', 'DB_PASSWORD=__AIME_ENCRYPTED__cipher'],
  cmd: ['nginx'],
  entrypoint: [],
  workingDir: '/',
  exposedPorts: {},
  labels: { app: 'web' },
  binds: [],
  portBindings: {},
  networkMode: 'default',
  restartPolicy: { Name: 'always' },
  privileged: false,
  user: '1000',
  healthcheck: { Test: ['CMD-SHELL', 'true'] },
  stopSignal: 'SIGTERM',
  stopTimeout: 10,
  tty: false,
  openStdin: false,
  networkSettings: {},
  devices: [],
  capabilities: { capAdd: [], capDrop: [] },
  securityOpt: [],
  init: false,
  readOnlyRootfs: false,
  schemaVersion: 3
};
