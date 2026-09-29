import { getCollectionData } from '../db/firestoreDb.js';
import { storeMemoryItem } from './memoryEngine.js';
import { correlateInfrastructureEvents, CorrelatedEventGroup } from './eventIntelligenceService.js';

export interface EventMemorySyncResult {
  organizationId: string;
  groupsProcessed: number;
  memoriesCreated: number;
  memoryIds: string[];
}

function groupKey(group: CorrelatedEventGroup) {
  return group.correlationId;
}

export async function syncCorrelatedEventsToMemory(
  organizationId: string,
  windowMinutes = 15
): Promise<EventMemorySyncResult> {
  const groups = correlateInfrastructureEvents(organizationId, windowMinutes);
  const memories = getCollectionData('ai_memory', []);
  const memoryIds: string[] = [];

  for (const group of groups) {
    const existing = memories.find((m: any) =>
      m.organizationId === organizationId &&
      Array.isArray(m.tags) &&
      m.tags.includes(`correlation:${groupKey(group)}`)
    );

    if (existing) continue;

    const events = getCollectionData('infrastructureEvents', []).filter(
      (event: any) => event.organizationId === organizationId && group.eventIds.includes(event.id)
    );

    if (!events.length) continue;

    const critical = group.severity === 'critical';
    const memory = await storeMemoryItem({
      memoryType: critical ? 'Incident Memory' : 'Infrastructure Memory',
      timestamp: group.firstSeen,
      user: 'aime-collector',
      serverId: group.resourceIds[0],
      serverName: group.resourceIds[0],
      resource: group.resourceIds.join(', '),
      eventType: critical ? 'CORRELATED_INCIDENT' : 'CORRELATED_INFRASTRUCTURE_EVENT',
      severity: group.severity,
      tags: [
        'aime-correlated',
        ...group.sources.map(source => `source:${source}`),
        `correlation:${groupKey(group)}`
      ],
      aiSummary: `Correlated ${group.eventIds.length} infrastructure events across ${group.sources.join(', ')} with ${Math.round(group.confidence * 100)}% correlation confidence.`,
      details: JSON.stringify({
        correlationId: group.correlationId,
        eventIds: group.eventIds,
        sources: group.sources,
        resourceIds: group.resourceIds,
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen,
        confidence: group.confidence
      }),
      rawEvent: events,
      rootCause: critical
        ? 'Potential root cause requires correlation with configuration, deployment, and command history.'
        : undefined,
      recommendation: critical
        ? 'Review correlated events in the AIME timeline before approving remediation.'
        : 'Continue observing the correlated event group for recurrence.',
      organizationId,
      createdBy: 'aime-collector'
    });

    memoryIds.push(memory.id);
  }

  return {
    organizationId,
    groupsProcessed: groups.length,
    memoriesCreated: memoryIds.length,
    memoryIds
  };
}
