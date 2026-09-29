import { collectLinuxEvents } from '../src/services/linuxEventCollector.js';
import { getCollectionData, setCollectionData } from '../src/db/firestoreDb.js';
import { createInfrastructureEvent } from '../src/types/infrastructureEvent.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

async function run() {
  const organizationId = 'org-linux-collector-test';
  const servers = getCollectionData('servers', []);
  servers.unshift({
    id: 'linux-test-server',
    name: 'linux-test',
    ip: '192.0.2.10',
    organizationId,
    username: 'collector'
  });
  setCollectionData('servers', servers);

  const result = await collectLinuxEvents(organizationId);

  assert(result.source === 'live', 'Registered tenant Linux server uses live collection mode');
  assert(Array.isArray(result.events), 'Linux collector returns canonical event array');

  const event = createInfrastructureEvent({
    organizationId,
    source: 'linux',
    resourceType: 'system',
    resourceId: 'linux-test-server',
    resourceName: 'linux-test',
    eventType: 'metric.threshold',
    timestamp: new Date().toISOString(),
    severity: 'warning',
    actor: 'aime-collector',
    after: { metric: 'disk', percent: 90 },
    tags: ['linux', 'metrics', 'disk'],
    isLive: true
  });

  assert(event.source === 'linux', 'Canonical event schema supports Linux');
  assert(event.isLive === true, 'Linux events preserve live marker');
  console.log('Linux collector tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
