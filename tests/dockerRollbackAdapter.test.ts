import assert from 'node:assert/strict';
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

await validateSnapshotCompatibility(fakeDocker(), base);

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    getImage: () => ({ inspect: async () => { throw new Error('missing'); } })
  }), base),
  /image "nginx:latest" is not available/
);

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    getVolume: (name: string) => ({ inspect: async () => { throw new Error('missing ' + name); } })
  }), { ...base, binds: ['missing-volume:/data'] }),
  /volume "missing-volume" is not available/
);

await assert.rejects(
  () => validateSnapshotCompatibility(fakeDocker({
    listContainers: async () => [{ Names: ['/other'], Ports: [{ PublicPort: 8080 }] }]
  }), { ...base, portBindings: { '80/tcp': [{ HostPort: '8080' }] } }),
  /host port "8080" is already in use/
);

await validateSnapshotCompatibility(fakeDocker({
  listContainers: async () => [{ Names: ['/other'], Ports: [{ PublicPort: 8080 }] }]
}), { ...base, portBindings: { '80/tcp': [{ HostPort: '8081' }] } });

console.log('Docker rollback preflight tests passed.');
