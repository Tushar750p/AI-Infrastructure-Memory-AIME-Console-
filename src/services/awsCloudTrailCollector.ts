import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { getCollectionData } from '../db/firestoreDb.js';
import { decryptSecret } from './sshService.js';
import { createInfrastructureEvent, InfrastructureEvent } from '../types/infrastructureEvent.js';
import { ingestInfrastructureEvent } from './infrastructureEventService.js';

function tenantAwsCredentials(organizationId: string) {
  const account = getCollectionData('awsAccounts', []).find((a: any) =>
    a.organizationId === organizationId && a.status === 'CONFIGURED' &&
    a.accessKeyId && a.secretAccessKey
  );
  if (!account) return null;
  return {
    region: account.region || 'us-east-1',
    accessKeyId: decryptSecret(account.accessKeyId),
    secretAccessKey: decryptSecret(account.secretAccessKey),
    sessionToken: account.sessionToken ? decryptSecret(account.sessionToken) : undefined
  };
}

function severity(eventName = ''): InfrastructureEvent['severity'] {
  if (/delete|terminate|destroy|revoke|disable|detach/i.test(eventName)) return 'critical';
  if (/stop|update|modify|change|put|remove|authorize/i.test(eventName)) return 'warning';
  return 'info';
}

function eventType(eventName = ''): InfrastructureEvent['eventType'] {
  if (/create|run|launch/i.test(eventName)) return 'resource.created';
  if (/delete|terminate|destroy/i.test(eventName)) return 'resource.deleted';
  if (/start|stop|reboot|enable|disable/i.test(eventName)) return 'resource.state_changed';
  if (/security|authorize|revoke|policy|encrypt|decrypt/i.test(eventName)) return 'security.finding';
  return 'configuration.changed';
}

export async function collectAwsCloudTrailEvents(
  organizationId: string,
  options: { maxResults?: number; startTime?: Date; endTime?: Date } = {}
) {
  const creds = tenantAwsCredentials(organizationId);
  if (!creds) return { events: [] as InfrastructureEvent[], source: 'seed' as const, reason: 'No tenant-scoped AWS credentials configured.' };

  try {
    const client = new CloudTrailClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken
      }
    });
    const response = await client.send(new LookupEventsCommand({
      MaxResults: Math.min(Math.max(options.maxResults || 50, 1), 50),
      StartTime: options.startTime,
      EndTime: options.endTime
    }));

    const events = (response.Events || []).map((e: any) => {
      const resource = e.Resources?.[0];
      const resourceId = resource?.ResourceName || e.EventId || 'unknown';
      return createInfrastructureEvent({
        organizationId,
        source: 'aws',
        resourceType: resource?.ResourceType || e.EventSource?.split('.')[0]?.toUpperCase() || 'AWS',
        resourceId,
        resourceName: resource?.ResourceName,
        eventType: eventType(e.EventName),
        timestamp: e.EventTime?.toISOString?.() || new Date().toISOString(),
        severity: severity(e.EventName),
        actor: e.Username,
        rawEvent: {
          eventId: e.EventId,
          eventName: e.EventName,
          eventSource: e.EventSource,
          eventTime: e.EventTime?.toISOString?.(),
          username: e.Username,
          resources: e.Resources || []
        },
        correlationId: e.EventId,
        tags: ['cloudtrail', e.EventSource || 'aws'],
        isLive: true
      });
    });
    return { events, source: 'live' as const };
  } catch (error: any) {
    return { events: [] as InfrastructureEvent[], source: 'live' as const, reason: error?.message || 'CloudTrail request failed.' };
  }
}

export async function ingestAwsCloudTrailEvents(
  organizationId: string,
  options: { maxResults?: number; startTime?: Date; endTime?: Date } = {}
) {
  const result = await collectAwsCloudTrailEvents(organizationId, options);
  if (result.source !== 'live') return { ...result, ingested: 0 };
  for (const event of result.events) ingestInfrastructureEvent(event);
  return { ...result, ingested: result.events.length };
}
