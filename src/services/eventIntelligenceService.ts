import crypto from 'crypto';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

export interface EventFingerprint {
  fingerprint: string;
  duplicate: boolean;
}

export interface CorrelatedEventGroup {
  correlationId: string;
  eventIds: string[];
  sources: string[];
  resourceIds: string[];
  severity: InfrastructureEvent['severity'];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  tags: string[];
}

function stable(value: unknown): string {
  return JSON.stringify(value, Object.keys((value && typeof value === 'object') ? value as object : {}).sort());
}

export function fingerprintEvent(event: InfrastructureEvent): string {
  const basis = [
    event.organizationId,
    event.source,
    event.resourceType,
    event.resourceId,
    event.eventType,
    event.timestamp.slice(0, 19),
    event.actor || ''
  ].join('|');
  return crypto.createHash('sha256').update(basis).digest('hex');
}

export function isDuplicateEvent(event: InfrastructureEvent): boolean {
  const fp = fingerprintEvent(event);
  return getCollectionData('infrastructureEventFingerprints', [])
    .some((x: any) => x.organizationId === event.organizationId && x.fingerprint === fp);
}

export function rememberEventFingerprint(event: InfrastructureEvent): EventFingerprint {
  const fingerprints = getCollectionData('infrastructureEventFingerprints', []);
  const fingerprint = fingerprintEvent(event);
  const duplicate = fingerprints.some((x: any) =>
    x.organizationId === event.organizationId && x.fingerprint === fingerprint
  );
  if (!duplicate) {
    fingerprints.unshift({
      organizationId: event.organizationId,
      fingerprint,
      eventId: event.id,
      createdAt: new Date().toISOString()
    });
    setCollectionData('infrastructureEventFingerprints', fingerprints.slice(0, 50000));
  }
  return { fingerprint, duplicate };
}

function severityRank(s: InfrastructureEvent['severity']): number {
  return ({ healthy: 0, info: 1, warning: 2, critical: 3 } as any)[s] ?? 1;
}

export function correlateInfrastructureEvents(
  organizationId: string,
  windowMinutes = 15
): CorrelatedEventGroup[] {
  const events = getCollectionData('infrastructureEvents', [])
    .filter((e: InfrastructureEvent) => e.organizationId === organizationId)
    .sort((a: InfrastructureEvent, b: InfrastructureEvent) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const windowMs = windowMinutes * 60 * 1000;
  const groups: CorrelatedEventGroup[] = [];

  for (const event of events) {
    const ts = new Date(event.timestamp).getTime();
    const candidates = groups.filter(g =>
      ts - new Date(g.lastSeen).getTime() <= windowMs &&
      (g.resourceIds.includes(event.resourceId) ||
       g.sources.includes(event.source) ||
       event.tags?.some(tag => g.tags.includes(tag)))
    );

    const group = candidates[0];
    if (!group) {
      groups.push({
        correlationId: event.correlationId || 'corr-' + crypto.createHash('sha256')
          .update([organizationId, event.timestamp, event.resourceId, event.eventType].join('|'))
          .digest('hex')
          .slice(0, 24),
        eventIds: [event.id],
        sources: [event.source],
        resourceIds: [event.resourceId],
        severity: event.severity,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        confidence: 0.55,
        tags: [...(event.tags || [])]
      });
      continue;
    }

    group.eventIds.push(event.id);
    if (!group.sources.includes(event.source)) group.sources.push(event.source);
    if (!group.resourceIds.includes(event.resourceId)) group.resourceIds.push(event.resourceId);
    for (const tag of event.tags || []) {
      if (!group.tags.includes(tag)) group.tags.push(tag);
    }
    group.lastSeen = event.timestamp;
    if (severityRank(event.severity) > severityRank(group.severity)) group.severity = event.severity;

    const multiSourceBonus = group.sources.length >= 2 ? 0.15 : 0;
    const multiResourceBonus = group.resourceIds.length >= 2 ? 0.10 : 0;
    group.confidence = Math.min(0.99, 0.55 + multiSourceBonus + multiResourceBonus + Math.min(group.eventIds.length, 5) * 0.05);
  }

  return groups.filter(g => g.eventIds.length > 1);
}
