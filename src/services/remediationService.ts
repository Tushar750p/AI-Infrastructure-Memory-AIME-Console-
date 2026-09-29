import crypto from 'crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

export type RemediationStatus =
  | 'proposed'
  | 'approved'
  | 'executing'
  | 'verified'
  | 'failed'
  | 'rejected';

export interface RemediationAction {
  id: string;
  organizationId: string;
  resourceId: string;
  actionType: string;
  description: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: RemediationStatus;
  proposedBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
  verifiedAt?: string;
  evidenceEventIds: string[];
  verification?: string;
}

function id() {
  return 'rem-' + crypto.randomUUID();
}

export function proposeRemediation(input: Omit<RemediationAction, 'id' | 'status' | 'createdAt'>): RemediationAction {
  const action: RemediationAction = {
    ...input,
    id: id(),
    status: 'proposed',
    createdAt: new Date().toISOString()
  };

  const actions = getCollectionData('remediationActions', []);
  actions.unshift(action);
  setCollectionData('remediationActions', actions.slice(0, 10000));
  return action;
}

export function approveRemediation(
  organizationId: string,
  remediationId: string,
  approvedBy: string
): RemediationAction | null {
  const actions = getCollectionData('remediationActions', []);
  const index = actions.findIndex((a: RemediationAction) =>
    a.organizationId === organizationId && a.id === remediationId
  );

  if (index < 0) return null;
  if (actions[index].status !== 'proposed') return actions[index];

  actions[index] = {
    ...actions[index],
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString()
  };

  setCollectionData('remediationActions', actions);
  return actions[index];
}

export function listRemediations(organizationId: string): RemediationAction[] {
  return getCollectionData('remediationActions', [])
    .filter((a: RemediationAction) => a.organizationId === organizationId);
}

export function getRemediation(organizationId: string, remediationId: string): RemediationAction | null {
  return listRemediations(organizationId).find(a => a.id === remediationId) || null;
}
