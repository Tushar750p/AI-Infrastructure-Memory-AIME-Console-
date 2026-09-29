import crypto from 'crypto';
import { getCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';
import { correlateInfrastructureEvents, CorrelatedEventGroup } from './eventIntelligenceService.js';
import { getResourceTimeline } from './timeMachineService.js';
import { buildKnowledgeGraph } from './knowledgeGraphService.js';

export interface IncidentEvidence {
  eventId: string;
  timestamp: string;
  source: string;
  resourceId: string;
  eventType: string;
  severity: InfrastructureEvent['severity'];
  relation: 'preceding' | 'same-window' | 'following';
  evidenceScore: number;
}

export interface IncidentIntelligence {
  correlationId: string;
  severity: InfrastructureEvent['severity'];
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  resources: string[];
  sources: string[];
  evidence: IncidentEvidence[];
  rootCauseCandidates: Array<{
    resourceId: string;
    source: string;
    eventType: string;
    reason: string;
    evidenceScore: number;
  }>;
}

function scoreEvent(event: InfrastructureEvent, incidentStart: number, resourceIds: string[]) {
  let score = 0.35;
  const ts = new Date(event.timestamp).getTime();

  if (event.severity === 'critical') score += 0.3;
  else if (event.severity === 'warning') score += 0.15;

  if (ts <= incidentStart && incidentStart - ts <= 15 * 60 * 1000) score += 0.25;
  if (resourceIds.includes(event.resourceId)) score += 0.1;

  return Math.min(0.99, score);
}

export function analyzeIncident(
  organizationId: string,
  correlationId: string
): IncidentIntelligence | null {
  const groups = correlateInfrastructureEvents(organizationId, 60);
  const group: CorrelatedEventGroup | undefined = groups.find(g => g.correlationId === correlationId);
  if (!group) return null;

  const events: InfrastructureEvent[] = getCollectionData('infrastructureEvents', [])
    .filter((e: InfrastructureEvent) => e.organizationId === organizationId);

  const start = new Date(group.firstSeen).getTime();
  const end = new Date(group.lastSeen).getTime();
  const surrounding = events
    .filter(e => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= start - 15 * 60 * 1000 && ts <= end + 15 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const graph = buildKnowledgeGraph(organizationId);
  const evidence: IncidentEvidence[] = surrounding.map(event => {
    const ts = new Date(event.timestamp).getTime();
    const relation = ts < start ? 'preceding' : ts > end ? 'following' : 'same-window';
    return {
      eventId: event.id,
      timestamp: event.timestamp,
      source: event.source,
      resourceId: event.resourceId,
      eventType: event.eventType,
      severity: event.severity,
      relation,
      evidenceScore: scoreEvent(event, start, group.resourceIds)
    };
  });

  const rootCauseCandidates = surrounding
    .filter(event => event.eventType === 'configuration.changed' ||
      event.eventType === 'resource.updated' ||
      event.eventType === 'resource.state_changed' ||
      event.eventType === 'deployment.failed' ||
      event.eventType === 'command.executed' ||
      event.eventType === 'metric.threshold')
    .map(event => ({
      resourceId: event.resourceId,
      source: event.source,
      eventType: event.eventType,
      reason: event.eventType === 'metric.threshold'
        ? 'Resource threshold was observed near the incident window.'
        : event.eventType === 'configuration.changed'
          ? 'A configuration change preceded or overlapped the incident.'
          : event.eventType === 'deployment.failed'
            ? 'A failed deployment occurred near the incident window.'
            : 'A state or operational change was recorded near the incident window.',
      evidenceScore: scoreEvent(event, start, group.resourceIds)
    }))
    .sort((a, b) => b.evidenceScore - a.evidenceScore)
    .slice(0, 10);

  const graphEvidence = graph.edges.filter(edge =>
    edge.organizationId === organizationId &&
    group.resourceIds.some(id =>
      edge.from.includes(id) || edge.to.includes(id)
    )
  );

  if (graphEvidence.length) {
    for (const candidate of rootCauseCandidates) {
      if (graphEvidence.some(edge => edge.from.includes(candidate.resourceId) || edge.to.includes(candidate.resourceId))) {
        candidate.evidenceScore = Math.min(0.99, candidate.evidenceScore + 0.1);
      }
    }
    rootCauseCandidates.sort((a, b) => b.evidenceScore - a.evidenceScore);
  }

  return {
    correlationId,
    severity: group.severity,
    confidence: group.confidence,
    firstSeen: group.firstSeen,
    lastSeen: group.lastSeen,
    resources: group.resourceIds,
    sources: group.sources,
    evidence,
    rootCauseCandidates
  };
}

function correlateEventsFromList(events: InfrastructureEvent[], organizationId: string, windowMinutes: number): CorrelatedEventGroup[] {
  const windowMs = windowMinutes * 60 * 1000;
  const groups: CorrelatedEventGroup[] = [];
  for (const event of events.filter(e => e.organizationId === organizationId).sort((a,b)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())) {
    const group = groups.find(g => new Date(event.timestamp).getTime() - new Date(g.lastSeen).getTime() <= windowMs && (g.resourceIds.includes(event.resourceId) || g.sources.includes(event.source) || event.tags?.some(tag=>g.tags.includes(tag))));
    if (!group) {
      groups.push({ correlationId: event.correlationId || 'corr-' + crypto.createHash('sha256').update([organizationId,event.timestamp,event.resourceId,event.eventType].join('|')).digest('hex').slice(0,24), eventIds:[event.id], sources:[event.source], resourceIds:[event.resourceId], severity:event.severity, firstSeen:event.timestamp, lastSeen:event.timestamp, confidence:.55, tags:[...(event.tags||[])]});
      continue;
    }
    group.eventIds.push(event.id); if(!group.sources.includes(event.source))group.sources.push(event.source); if(!group.resourceIds.includes(event.resourceId))group.resourceIds.push(event.resourceId);
    for(const tag of event.tags||[])if(!group.tags.includes(tag))group.tags.push(tag);
    group.lastSeen=event.timestamp;
  }
  return groups.filter(g=>g.eventIds.length>1);
}


import { loadDurableHistory } from './durableInfrastructureHistoryService.js';

export async function analyzeIncidentDurable(
  organizationId: string,
  correlationId: string
): Promise<IncidentIntelligence | null> {
  const history = await loadDurableHistory(organizationId, 1000);
  const events = history.events;
  const groups = correlateEventsFromList(events, organizationId, 60);
  const group = groups.find(g => g.correlationId === correlationId);
  if (!group) return null;
  return buildIncidentIntelligence(group, events);
}
