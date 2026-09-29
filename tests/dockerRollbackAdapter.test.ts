import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validateSnapshotCompatibility } from '../src/services/dockerRollbackAdapter.js';

function fakeDocker(overrides: any = {}) {
  return {
    getImage: () => ({ inspect: async () => ({}) }),
    getNetwork: () => ({ inspect: async () => ({}) }),
    getVolume: () => ({ inspect: async () => ({}) }),
    listContainers: async () => [],
    ...overrides
  };
}

const base = {
  image: 'nginx:latest',
  networkMode: 'default',
  binds: [],
  portBindings: {}
};

function signed(snapshot: any) {
  const { integrityHash, ...unsigned } = snapshot;
  return {
    ...snapshot,
    integrityHash: crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('hex')
  };
}

await validateSnapshotCompatibility(fakeDocker(), signed(base));

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    getImage: () => ({ inspect: async () => { throw new Error('missing'); } })
  }), signed(base)),
  /image "nginx:latest" is not available/
);

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    getVolume: (name: string) => ({ inspect: async () => { throw new Error('missing ' + name); } })
  }), signed({ ...base, binds: ['missing-volume:/data'] })),
  /volume "missing-volume" is not available/
);

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    listContainers: async () => [{ Names: ['/other'], Ports: [{ PublicPort: 8080 }] }]
  }), signed({ ...base, portBindings: { '80/tcp': [{ HostPort: '8080' }] } })),
  /host port "8080" is already in use/
);

await validateSnapshotCompatibility(fakeDocker({
  listContainers: async () => [{ Names: ['/other'], Ports: [{ PublicPort: 8080 }] }]
}), signed({ ...base, portBindings: { '80/tcp': [{ HostPort: '8081' }] } }));

console.log('Docker rollback preflight tests passed.');
