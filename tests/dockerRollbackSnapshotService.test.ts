import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { dockerRollbackSnapshotKey, verifyDockerRollbackSnapshot, preserveDockerRollbackCandidate, listDockerRollbackCandidates, getDockerRollbackCandidate, migrateLatestDockerRollbackSnapshot } from '../src/services/dockerRollbackSnapshotService.js';
import { setCollectionData } from '../src/db/firestoreDb.js';

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

assert.throws(() => verifyDockerRollbackSnapshot({ ...unsigned, integrityHash: 'tampered' }), /integrity verification failed/);

const candidateBase = {
  ...unsigned,
  integrityHash: ''
};
candidateBase.integrityHash = createHash(candidateBase);

function createHash(snapshot: any) {
  const { integrityHash, ...rest } = snapshot;
  return require('node:crypto').createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}

setCollectionData('dockerRollbackCandidates', []);
const keyA = preserveDockerRollbackCandidate('org-a', 'host-1', 'container-1', candidateBase, 'event-a');
const keyB = preserveDockerRollbackCandidate('org-b', 'host-1', 'container-1', candidateBase, 'event-b');

assert.ok(getDockerRollbackCandidate('org-a', 'host-1', 'container-1', 'event-a'));
assert.equal(getDockerRollbackCandidate('org-a', 'host-1', 'container-1', 'event-b'), null);
assert.equal(getDockerRollbackCandidate('org-b', 'host-1', 'container-1', 'event-a'), null);
assert.equal(listDockerRollbackCandidates('org-a', 'host-1', 'container-1').length, 1);
assert.equal(listDockerRollbackCandidates('org-b', 'host-1', 'container-1').length, 1);
assert.match(keyA, /org-a/);
assert.match(keyB, /org-b/);

process.env.AIME_DOCKER_ROLLBACK_RETENTION = '5';
setCollectionData('dockerRollbackCandidates', []);

for (let i = 0; i < 6; i++) {
  const snapshot = {
    ...candidateBase,
    capturedAt: new Date(Date.now() + i).toISOString(),
    integrityHash: ''
  };
  snapshot.integrityHash = createHash(snapshot);
  preserveDockerRollbackCandidate('org-retention', 'host-1', 'container-1', snapshot, `event-${i}`);
}

const retained = listDockerRollbackCandidates('org-retention', 'host-1', 'container-1', 100);
assert.equal(retained.length, 5);
assert.equal(getDockerRollbackCandidate('org-retention', 'host-1', 'container-1', 'event-0'), null);
assert.ok(getDockerRollbackCandidate('org-retention', 'host-1', 'container-1', 'event-5'));

setCollectionData('dockerRollbackCandidates', []);
for (const eventId of ['event-a', 'event-c', 'event-b', 'event-d', 'event-e', 'event-f']) {
  const snapshot = {
    ...candidateBase,
    capturedAt: '2026-01-01T00:00:00.000Z',
    integrityHash: ''
  };
  snapshot.integrityHash = createHash(snapshot);
  preserveDockerRollbackCandidate('org-tie', 'host-1', 'container-1', snapshot, eventId);
}
const tied = listDockerRollbackCandidates('org-tie', 'host-1', 'container-1', 100);
assert.equal(tied.length, 5);
assert.deepEqual(
  tied.map((candidate: any) => candidate.candidateEventId),
  ['event-f', 'event-e', 'event-d', 'event-c', 'event-b']
);
assert.equal(getDockerRollbackCandidate('org-tie', 'host-1', 'container-1', 'event-a'), null);

const tampered = getDockerRollbackCandidate('org-retention', 'host-1', 'container-1', 'event-5');
assert.ok(tampered);
tampered.image = 'tampered:image';
assert.throws(
  () => verifyDockerRollbackSnapshot(tampered),
  /integrity verification failed/
);

delete process.env.AIME_DOCKER_ROLLBACK_RETENTION;

function legacyEncrypt(plainText: string) {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(
    process.env.CREDENTIALS_ENCRYPTION_KEY || 'aime-dev-credentials-key',
    'salt',
    32
  );
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

const legacySecret = legacyEncrypt('legacy-test-secret');
const legacySnapshot = {
  ...unsigned,
  env: [`DB_PASSWORD=__AIME_ENCRYPTED__${legacySecret}`],
  integrityHash: ''
};
legacySnapshot.integrityHash = createHash(legacySnapshot);
setCollectionData(
  dockerRollbackSnapshotKey('org-migration', 'host-1', 'container-1'),
  legacySnapshot
);
const migrated = migrateLatestDockerRollbackSnapshot('org-migration', 'host-1', 'container-1');
assert.ok(migrated);
assert.match(migrated.env[0], /^DB_PASSWORD=__AIME_ENCRYPTED__v1:/);
assert.doesNotThrow(() => verifyDockerRollbackSnapshot(migrated));

const tamperedLegacy = {
  ...unsigned,
  env: [`DB_PASSWORD=__AIME_ENCRYPTED__${legacySecret.slice(0, -1)}0`],
  integrityHash: ''
};
tamperedLegacy.integrityHash = createHash(tamperedLegacy);
setCollectionData(
  dockerRollbackSnapshotKey('org-migration-tampered', 'host-1', 'container-1'),
  tamperedLegacy
);
assert.throws(
  () => migrateLatestDockerRollbackSnapshot('org-migration-tampered', 'host-1', 'container-1'),
  /Legacy encrypted secret authentication failed/
);

const plaintextSnapshot = {
  ...unsigned,
  env: ['DB_PASSWORD=__AIME_ENCRYPTED__plaintext-secret'],
  integrityHash: ''
};
plaintextSnapshot.integrityHash = createHash(plaintextSnapshot);
setCollectionData(
  dockerRollbackSnapshotKey('org-migration-plaintext', 'host-1', 'container-1'),
  plaintextSnapshot
);
assert.throws(
  () => migrateLatestDockerRollbackSnapshot('org-migration-plaintext', 'host-1', 'container-1'),
  /Invalid encrypted secret format/
);

console.log('Docker rollback snapshot integrity, tenant isolation, retention, and migration tests passed.');

