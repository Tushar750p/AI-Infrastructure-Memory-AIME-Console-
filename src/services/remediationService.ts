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
  executionLock?: string;
  proposedBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  executingAt?: string;
  executedAt?: string;
  failedAt?: string;
  verifiedAt?: string;
  evidenceEventIds: string[];
  verification?: string;
  failureReason?: string;
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
  auditRemediation(action, 'proposed', 'Remediation proposal created.');
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
  auditRemediation(actions[index], 'approved', 'Remediation explicitly approved.', approvedBy);
  return actions[index];
}

export function transitionRemediation(
  organizationId: string,
  remediationId: string,
  from: RemediationStatus,
  to: RemediationStatus,
  details?: { verification?: string; failureReason?: string; verifiedResourceId?: string }
): RemediationAction | null {
  const actions = getCollectionData('remediationActions', []);
  const index = actions.findIndex((a: RemediationAction) =>
    a.organizationId === organizationId && a.id === remediationId
  );
  if (index < 0) return null;

  const action = actions[index];
  if (from === 'approved' && to === 'executing' && action.executionLock) {
    throw new Error('Remediation execution is already locked.');
  }
  if (action.status !== from) {
    throw new Error(`Invalid remediation transition: ${action.status} -> ${to}`);
  }

  const now = new Date().toISOString();
  actions[index] = {
    ...action,
    status: to,
    ...(to === 'executing' ? { executionLock: crypto.randomUUID() } : {}),
    ...(to === 'verified' || to === 'failed' ? { executionLock: undefined } : {}),
    ...(to === 'executing' ? { executingAt: now } : {}),
    ...(to === 'verified'
      ? { executedAt: action.executedAt || now, verifiedAt: now, verification: details?.verification }
      : {}),
    ...(to === 'failed'
      ? { executedAt: action.executedAt || now, failedAt: now, failureReason: details?.failureReason }
      : {})
  };

  setCollectionData('remediationActions', actions);
  auditRemediation(actions[index], to, details?.verification || details?.failureReason || `Remediation transitioned from ${from} to ${to}.`);
  return actions[index];
}

export function listRemediations(organizationId: string): RemediationAction[] {
  return getCollectionData('remediationActions', [])
    .filter((a: RemediationAction) => a.organizationId === organizationId);
}

export function getRemediation(organizationId: string, remediationId: string): RemediationAction | null {
  return listRemediations(organizationId).find(a => a.id === remediationId) || null;
}

export type RollbackStatus = 'proposed' | 'approved' | 'executing' | 'verified' | 'failed' | 'rejected';

export interface RollbackAction {
  id: string;
  organizationId: string;
  remediationId: string;
  resourceId: string;
  rollbackType: string;
  description: string;
  reason: string;
  status: RollbackStatus;
  proposedBy: string;
  approvedBy?: string;
  executionLock?: string;
  createdAt: string;
  approvedAt?: string;
  executingAt?: string;
  verifiedAt?: string;
  failedAt?: string;
  verification?: string;
  failureReason?: string;
  evidenceEventIds: string[];
  targetSnapshotId?: string;
  verifiedResourceId?: string;
}

function rollbackId() { return 'rollback-' + crypto.randomUUID(); }

export function proposeRollback(input: Omit<RollbackAction, 'id' | 'status' | 'createdAt'>): RollbackAction {
  if (!input.organizationId || !input.resourceId || !input.rollbackType || !input.proposedBy) {
    throw new Error('organizationId, resourceId, rollbackType and proposedBy are required.');
  }
  const action: RollbackAction = { ...input, id: rollbackId(), status: 'proposed', createdAt: new Date().toISOString() };
  const rollbacks = getCollectionData('rollbackActions', []);
  rollbacks.unshift(action);
  setCollectionData('rollbackActions', rollbacks.slice(0, 10000));
  auditRollback(action, 'proposed', 'Rollback proposal created.');
  return action;
}

export function getRollback(organizationId: string, rollbackIdValue: string): RollbackAction | null {
  return getCollectionData('rollbackActions', []).find((r: RollbackAction) => r.organizationId === organizationId && r.id === rollbackIdValue) || null;
}

export function approveRollback(organizationId: string, rollbackIdValue: string, approvedBy: string): RollbackAction | null {
  const rollbacks = getCollectionData('rollbackActions', []);
  const index = rollbacks.findIndex((r: RollbackAction) => r.organizationId === organizationId && r.id === rollbackIdValue);
  if (index < 0) return null;
  if (rollbacks[index].status !== 'proposed') return rollbacks[index];
  rollbacks[index] = { ...rollbacks[index], status: 'approved', approvedBy, approvedAt: new Date().toISOString() };
  setCollectionData('rollbackActions', rollbacks);
  auditRollback(rollbacks[index], 'approved', 'Rollback explicitly approved.', approvedBy);
  return rollbacks[index];
}

export function transitionRollback(organizationId: string, rollbackIdValue: string, from: RollbackStatus, to: RollbackStatus, details?: { verification?: string; failureReason?: string }): RollbackAction | null {
  const rollbacks = getCollectionData('rollbackActions', []);
  const index = rollbacks.findIndex((r: RollbackAction) => r.organizationId === organizationId && r.id === rollbackIdValue);
  if (index < 0) return null;
  const action = rollbacks[index];
  if (from === 'approved' && to === 'executing' && action.executionLock) throw new Error('Rollback execution is already locked.');
  if (action.status !== from) throw new Error(`Invalid rollback transition: ${action.status} -> ${to}`);
  const now = new Date().toISOString();
  rollbacks[index] = { ...action, status: to,
    ...(to === 'executing' ? { executionLock: crypto.randomUUID(), executingAt: now } : {}),
    ...(to === 'verified' || to === 'failed' ? { executionLock: undefined } : {}),
    ...(to === 'verified' ? { verifiedAt: now, verification: details?.verification, verifiedResourceId: details?.verifiedResourceId } : {}),
    ...(to === 'failed' ? { failedAt: now, failureReason: details?.failureReason } : {})
  };
  setCollectionData('rollbackActions', rollbacks);
  auditRollback(rollbacks[index], to, details?.verification || details?.failureReason || `Rollback transitioned from ${from} to ${to}.`);
  return rollbacks[index];
}

function auditRollback(action: RollbackAction, status: string, details: string, actor?: string) {
  const audit = getCollectionData('remediationAudit', []);
  audit.unshift({ id: `rollback-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, organizationId: action.organizationId, remediationId: action.remediationId, resourceId: action.resourceId, actionType: `rollback:${action.rollbackType}`, status, details, actor: actor || action.approvedBy || action.proposedBy, createdAt: new Date().toISOString() });
  setCollectionData('remediationAudit', audit.slice(0, 20000));
}
