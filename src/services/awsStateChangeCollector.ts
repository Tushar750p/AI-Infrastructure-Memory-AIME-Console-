import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { decryptSecret } from './sshService.js';
import { createInfrastructureEvent } from '../types/infrastructureEvent.js';
import { ingestInfrastructureEvent } from './infrastructureEventService.js';

function credentials(organizationId: string) {
  const account = getCollectionData('awsAccounts', []).find((a: any) =>
    a.organizationId === organizationId && a.status === 'CONFIGURED' && a.accessKeyId && a.secretAccessKey
  );
  if (!account) return null;
  return {
    region: account.region || 'us-east-1',
    accessKeyId: decryptSecret(account.accessKeyId),
    secretAccessKey: decryptSecret(account.secretAccessKey),
    sessionToken: account.sessionToken ? decryptSecret(account.sessionToken) : undefined
  };
}

function changed(before: any, after: any) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function snapshotKey(org: string, kind: string) {
  return `awsStateSnapshot:${org}:${kind}`;
}

async function collectSnapshots(organizationId: string) {
  const creds = credentials(organizationId);
  if (!creds) return { source: 'seed' as const, reason: 'No tenant-scoped AWS credentials configured.', snapshots: {} };

  const base = { region: creds.region, credentials: creds };
  const ec2 = await new EC2Client(base).send(new DescribeInstancesCommand({}));
  const rds = await new RDSClient(base).send(new DescribeDBInstancesCommand({}));
  const eksClient = new EKSClient(base);
  const eksList = await eksClient.send(new ListClustersCommand({}));

  const ec2Snapshot = (ec2.Reservations || []).flatMap(r => r.Instances || []).map(i => ({
    id: i.InstanceId, state: i.State?.Name, type: i.InstanceType, privateIp: i.PrivateIpAddress,
    tags: i.Tags || []
  }));
  const rdsSnapshot = (rds.DBInstances || []).map(db => ({
    id: db.DBInstanceIdentifier, status: db.DBInstanceStatus, engine: db.Engine,
    version: db.EngineVersion, multiAZ: db.MultiAZ
  }));
  const eksSnapshot: any[] = [];
  for (const name of eksList.clusters || []) {
    const d = await eksClient.send(new DescribeClusterCommand({ name }));
    if (d.cluster) eksSnapshot.push({ id: d.cluster.name, status: d.cluster.status, version: d.cluster.version });
  }

  return { source: 'live' as const, snapshots: { ec2: ec2Snapshot, rds: rdsSnapshot, eks: eksSnapshot } };
}

function emitChanges(organizationId: string, kind: string, before: any[], after: any[]) {
  const previous = new Map(before.map(x => [x.id, x]));
  const current = new Map(after.map(x => [x.id, x]));
  let emitted = 0;

  for (const item of after) {
    const old = previous.get(item.id);
    if (!old) {
      ingestInfrastructureEvent(createInfrastructureEvent({
        organizationId, source: 'aws', resourceType: `AWS::${kind}`, resourceId: item.id,
        eventType: 'resource.created', timestamp: new Date().toISOString(), severity: 'info',
        actor: 'aime-collector', before: null, after: item, tags: ['aws', kind.toLowerCase()], isLive: true
      }));
      emitted++;
    } else if (changed(old, item)) {
      const stateChanged = kind === 'EC2' && old.state !== item.state;
      ingestInfrastructureEvent(createInfrastructureEvent({
        organizationId, source: 'aws', resourceType: `AWS::${kind}`, resourceId: item.id,
        eventType: stateChanged ? 'resource.state_changed' : 'resource.updated',
        timestamp: new Date().toISOString(),
        severity: stateChanged && /stopped|terminated|shutting-down/i.test(item.state || '') ? 'warning' : 'info',
        actor: 'aime-collector', before: old, after: item, tags: ['aws', kind.toLowerCase()], isLive: true
      }));
      emitted++;
    }
  }

  for (const item of before) {
    if (!current.has(item.id)) {
      ingestInfrastructureEvent(createInfrastructureEvent({
        organizationId, source: 'aws', resourceType: `AWS::${kind}`, resourceId: item.id,
        eventType: 'resource.deleted', timestamp: new Date().toISOString(), severity: 'warning',
        actor: 'aime-collector', before: item, after: null, tags: ['aws', kind.toLowerCase()], isLive: true
      }));
      emitted++;
    }
  }
  return emitted;
}

export async function collectAwsStateChanges(organizationId: string) {
  const result = await collectSnapshots(organizationId);
  if (result.source !== 'live') return { ...result, emitted: 0 };

  let emitted = 0;
  for (const [kind, snapshot] of Object.entries(result.snapshots)) {
    const key = snapshotKey(organizationId, kind);
    const previous = getCollectionData(key, []);
    emitted += emitChanges(organizationId, kind.toUpperCase(), previous, snapshot as any[]);
    setCollectionData(key, snapshot);
  }
  return { source: 'live' as const, emitted };
}
