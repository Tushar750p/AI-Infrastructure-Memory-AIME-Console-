import { getCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';

export interface LinuxCollectorResult {
  source: 'live' | 'seed';
  emitted: number;
  events: InfrastructureEvent[];
  reason?: string;
}

/**
 * Linux collection is intentionally kept behind the existing tenant-authorized
 * SSH service. This module is the canonical event boundary; command execution
 * and credential handling remain in sshService/serverRoutes.
 */
export function linuxCollectorServers(organizationId: string): any[] {
  return getCollectionData('servers', []).filter(
    (server: any) => server.organizationId === organizationId
  );
}

export function emptyLinuxCollectorResult(reason: string): LinuxCollectorResult {
  return {
    source: 'seed',
    emitted: 0,
    events: [],
    reason
  };
}
