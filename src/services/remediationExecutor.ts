import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { getRemediation, RemediationAction } from './remediationService.js';

export const ALLOWED_REMEDIATION_ACTIONS = [
  'acknowledge_alert',
  'restart_container',
  'restart_service',
  'scale_workload'
] as const;

export type AllowedRemediationAction = typeof ALLOWED_REMEDIATION_ACTIONS[number];

export interface ExecutionResult {
  success: boolean;
  dryRun: boolean;
  remediationId: string;
  actionType: string;
  verification: string;
}

function recordAudit(remediation: RemediationAction, status: string, details: string) {
  const audit = getCollectionData('remediationAudit', []);
  audit.unshift({
    id: `rem-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: remediation.organizationId,
    remediationId: remediation.id,
    resourceId: remediation.resourceId,
    actionType: remediation.actionType,
    status,
    details,
    actor: remediation.approvedBy || remediation.proposedBy,
    createdAt: new Date().toISOString()
  });
  setCollectionData('remediationAudit', audit.slice(0, 20000));
}

export function executeApprovedRemediation(
  organizationId: string,
  remediationId: string
): ExecutionResult {
  const remediation = getRemediation(organizationId, remediationId);

  if (!remediation) {
    throw new Error('Remediation not found.');
  }

  if (remediation.status !== 'approved') {
    throw new Error('Remediation must be explicitly approved before execution.');
  }

  if (!ALLOWED_REMEDIATION_ACTIONS.includes(remediation.actionType as AllowedRemediationAction)) {
    throw new Error(`Remediation action is not allowlisted: ${remediation.actionType}`);
  }

  // Execution adapters are intentionally not enabled yet. This prevents an
  // unreviewed connector from turning an approval record into arbitrary
  // infrastructure commands.
  recordAudit(remediation, 'dry_run', `Allowlisted action ${remediation.actionType} passed execution policy; connector adapter not enabled.`);

  return {
    success: true,
    dryRun: true,
    remediationId,
    actionType: remediation.actionType,
    verification: 'Policy validation passed. No infrastructure mutation was performed.'
  };
}
