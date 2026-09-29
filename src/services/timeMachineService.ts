import crypto from 'crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';
import { queueTimeMachineSnapshot, loadDurableHistory } from './durableInfrastructureHistoryService.js';

export interface TimeMachineSnapshot {
  id: string;
  organizationId: string;
  source: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  timestamp: string;
  state: unknown;
  eventId?: string;
  isLive: boolean;
}

export interface TimeMachinePoint {
  timestamp: string;
  state: unknown;
  eventId?: string;
  eventType?: string;
  severity?: InfrastructureEvent['severity'];
}

function snapshotId(event: InfrastructureEvent) {
  return 'snap:' + crypto.createHash('sha256')
    .update(`${event.organizationId}|${event.source}|${event.resourceId}|${event.timestamp}|${event.id}`)
    .digest('hex')
    .slice(0, 28);
}

export function recordTimeMachineSnapshot(event: InfrastructureEvent): TimeMachineSnapshot {
  const snapshots = getCollectionData('timeMachineSnapshots', []);
  const snapshot: TimeMachineSnapshot = {
    id: snapshotId(event),
    organizationId: event.organizationId,
    source: event.source,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    resourceName: event.resourceName,
    timestamp: event.timestamp,
    state: event.after !== undefined ? event.after : event.rawEvent,
    eventId: event.id,
    isLive: event.isLive
  };

  queueTimeMachineSnapshot(snapshot);

  if (!snapshots.some((s: any) => s.id === snapshot.id)) {
    snapshots.unshift(snapshot);
    setCollectionData('timeMachineSnapshots', snapshots.slice(0, 100000));
  }

  return snapshot;
}

export function getResourceTimeline(
  organizationId: string,
  resourceId: string,
  options: { start?: string; end?: string; source?: string; limit?: number } = {}
): TimeMachinePoint[] {
  const start = options.start ? new Date(options.start).getTime() : Number.NEGATIVE_INFINITY;
  const end = options.end ? new Date(options.end).getTime() : Number.POSITIVE_INFINITY;
  const limit = Math.min(options.limit || 200, 1000);

  const events = getCollectionData('infrastructureEvents', [])
    .filter((e: InfrastructureEvent) =>
      e.organizationId === organizationId &&
      e.resourceId === resourceId &&
      (!options.source || e.source === options.source)
    )
    .filter((e: InfrastructureEvent) => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= start && ts <= end;
    })
    .sort((a: InfrastructureEvent, b: InfrastructureEvent) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .slice(-limit);

  return events.map((event: InfrastructureEvent) => ({
    timestamp: event.timestamp,
    state: event.after !== undefined ? event.after : event.rawEvent,
    eventId: event.id,
    eventType: event.eventType,
    severity: event.severity
  }));
}

export function getResourceStateAt(
  organizationId: string,
  resourceId: string,
  at: string
): TimeMachinePoint | null {
  const atMs = new Date(at).getTime();
  const points = getResourceTimeline(organizationId, resourceId, { end: at, limit: 1000 });
  const snapshots = getCollectionData('timeMachineSnapshots', [])
    .filter((s: TimeMachineSnapshot) =>
      s.organizationId === organizationId &&
      s.resourceId === resourceId &&
      new Date(s.timestamp).getTime() <= atMs
    )
    .sort((a: TimeMachineSnapshot, b: TimeMachineSnapshot) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  if (snapshots[0]) {
    return {
      timestamp: snapshots[0].timestamp,
      state: snapshots[0].state,
      eventId: snapshots[0].eventId
    };
  }

  return points.length ? points[points.length - 1] : null;
}


export async function getDurableResourceTimeline(
  organizationId: string,
  resourceId: string,
  options: { start?: string; end?: string; source?: string; limit?: number } = {}
): Promise<TimeMachinePoint[]> {
  const start = options.start ? new Date(options.start).getTime() : Number.NEGATIVE_INFINITY;
  const end = options.end ? new Date(options.end).getTime() : Number.POSITIVE_INFINITY;
  const limit = Math.min(options.limit || 200, 1000);
  const { events } = await loadDurableHistory(organizationId, 1000);

  return events
    .filter((event: InfrastructureEvent) =>
      event.organizationId === organizationId &&
      event.resourceId === resourceId &&
      (!options.source || event.source === options.source)
    )
    .filter((event: InfrastructureEvent) => {
      const ts = new Date(event.timestamp).getTime();
      return ts >= start && ts <= end;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-limit)
    .map(event => ({
      timestamp: event.timestamp,
      state: event.after !== undefined ? event.after : event.rawEvent,
      eventId: event.id,
      eventType: event.eventType,
      severity: event.severity
    }));
}

export async function getDurableResourceStateAt(
  organizationId: string,
  resourceId: string,
  at: string
): Promise<TimeMachinePoint | null> {
  const atMs = new Date(at).getTime();
  const { snapshots } = await loadDurableHistory(organizationId, 1000);
  const snapshot = snapshots
    .filter((item: TimeMachineSnapshot) =>
      item.organizationId === organizationId &&
      item.resourceId === resourceId &&
      new Date(item.timestamp).getTime() <= atMs
    )
    .sort((a: TimeMachineSnapshot, b: TimeMachineSnapshot) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

  if (!snapshot) return null;
  return {
    timestamp: snapshot.timestamp,
    state: snapshot.state,
    eventId: snapshot.eventId
  };
}
