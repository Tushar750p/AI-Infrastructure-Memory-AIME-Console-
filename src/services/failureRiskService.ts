import { getCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';

export interface FailureRiskSignal {
  organizationId: string;
  resourceId: string;
  resourceName?: string;
  source: string;
  riskScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: string[];
  evidenceEventIds: string[];
  generatedAt: string;
}

function level(score: number): FailureRiskSignal['level'] {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function calculateFailureRisk(
  organizationId: string,
  lookbackHours = 24
): FailureRiskSignal[] {
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  const events: InfrastructureEvent[] = getCollectionData('infrastructureEvents', [])
    .filter((e: InfrastructureEvent) =>
      e.organizationId === organizationId &&
      new Date(e.timestamp).getTime() >= cutoff
    );

  const byResource = new Map<string, InfrastructureEvent[]>();
  for (const event of events) {
    const list = byResource.get(event.resourceId) || [];
    list.push(event);
    byResource.set(event.resourceId, list);
  }

  const results: FailureRiskSignal[] = [];

  for (const [resourceId, resourceEvents] of byResource.entries()) {
    let score = 0;
    const signals: string[] = [];
    const evidence = resourceEvents.map(e => e.id);

    const critical = resourceEvents.filter(e => e.severity === 'critical').length;
    const warnings = resourceEvents.filter(e => e.severity === 'warning').length;
    const thresholdEvents = resourceEvents.filter(e => e.eventType === 'metric.threshold').length;
    const incidents = resourceEvents.filter(e => e.eventType === 'incident.detected').length;
    const changes = resourceEvents.filter(e =>
      e.eventType === 'configuration.changed' ||
      e.eventType === 'resource.updated' ||
      e.eventType === 'deployment.failed'
    ).length;

    if (critical) {
      score += Math.min(40, critical * 20);
      signals.push(`${critical} critical event(s) detected in the lookback window.`);
    }

    if (warnings >= 3) {
      score += Math.min(20, warnings * 4);
      signals.push(`${warnings} warning events indicate recurring instability.`);
    }

    if (thresholdEvents >= 2) {
      score += Math.min(20, thresholdEvents * 5);
      signals.push(`${thresholdEvents} threshold events indicate repeated resource pressure.`);
    }

    if (incidents >= 2) {
      score += 20;
      signals.push(`${incidents} incidents were detected for the same resource.`);
    }

    if (changes >= 2 && incidents >= 1) {
      score += 15;
      signals.push('Recent changes overlap with incident activity.');
    }

    score = Math.min(100, score);

    if (score >= 40) {
      const latest = resourceEvents.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      results.push({
        organizationId,
        resourceId,
        resourceName: latest.resourceName,
        source: latest.source,
        riskScore: score,
        level: level(score),
        signals,
        evidenceEventIds: evidence,
        generatedAt: new Date().toISOString()
      });
    }
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}
