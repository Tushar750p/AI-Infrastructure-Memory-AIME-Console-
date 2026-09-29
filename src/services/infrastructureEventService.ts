import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';
import { isDuplicateEvent, rememberEventFingerprint } from './eventIntelligenceService.js';
import { ingestEventIntoKnowledgeGraph } from './knowledgeGraphService.js';

const COLLECTION = 'infrastructureEvents';

export function ingestInfrastructureEvent(event: InfrastructureEvent): InfrastructureEvent {
  const events = getCollectionData(COLLECTION, []);
  if (isDuplicateEvent(event)) return event;
  rememberEventFingerprint(event);
  const tenantEvents = events.filter((e: any) => e.organizationId === event.organizationId);
  const duplicate = tenantEvents.find((e: any) => e.id === event.id);
  if (duplicate) return duplicate;
  events.unshift(event);
  ingestEventIntoKnowledgeGraph(event);
  setCollectionData(COLLECTION, events.slice(0, 10000));
  return event;
}

export function listInfrastructureEvents(organizationId: string, limit = 100): InfrastructureEvent[] {
  return getCollectionData(COLLECTION, []).filter((e: any) => e.organizationId === organizationId).slice(0, limit);
}

export function getCollectorStatus(organizationId: string) {
  const events = listInfrastructureEvents(organizationId, 1000);
  const live = events.filter(e => e.isLive);
  return {
    organizationId, totalEvents: events.length, liveEvents: live.length,
    lastEventAt: events[0]?.timestamp || null,
    sources: [...new Set(events.map(e => e.source))],
  };
}