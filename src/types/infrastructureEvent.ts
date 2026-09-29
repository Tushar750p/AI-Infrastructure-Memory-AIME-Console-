export type InfrastructureSource = 'aws' | 'kubernetes' | 'docker' | 'linux' | 'terraform' | 'git';

export type InfrastructureEventType =
  | 'resource.created' | 'resource.updated' | 'resource.deleted' | 'resource.state_changed'
  | 'deployment.started' | 'deployment.completed' | 'deployment.failed'
  | 'incident.detected' | 'incident.resolved' | 'configuration.changed'
  | 'security.finding' | 'command.executed' | 'alert.fired' | 'metric.threshold';

export interface InfrastructureEvent {
  id: string; organizationId: string; source: InfrastructureSource;
  resourceType: string; resourceId: string; resourceName?: string;
  eventType: InfrastructureEventType; timestamp: string;
  severity: 'info' | 'warning' | 'critical' | 'healthy'; actor?: string;
  before?: unknown; after?: unknown; rawEvent?: unknown; correlationId?: string;
  tags?: string[]; isLive: boolean; collectorVersion: string; createdAt: string;
}

export function createInfrastructureEvent(input: Omit<InfrastructureEvent, 'id' | 'createdAt' | 'collectorVersion'>): InfrastructureEvent {
  const now = new Date().toISOString();
  return { ...input, id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), collectorVersion: 'aime-collector/1.0', createdAt: now };
}