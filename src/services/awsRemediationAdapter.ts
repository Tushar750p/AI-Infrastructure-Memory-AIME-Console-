import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { getCollectionData } from '../db/firestoreDb.js';
import { decryptSecret } from './sshService.js';
import { getRemediation, transitionRemediation } from './remediationService.js';
import { ALLOWED_REMEDIATION_ACTIONS } from './remediationExecutor.js';

function tenantAccounts(organizationId: string): any[] {
  return getCollectionData('awsAccounts', []).filter(
    (account: any) => account.organizationId === organizationId && account.status === 'CONFIGURED'
  );
}

function clientForAccount(account: any): EC2Client {
  return new EC2Client({
    region: account.region || 'us-east-1',
    credentials: {
      accessKeyId: decryptSecret(account.accessKeyId),
      secretAccessKey: decryptSecret(account.secretAccessKey),
      sessionToken: account.sessionToken ? decryptSecret(account.sessionToken) : undefined
    }
  });
}

export async function executeAwsRemediation(organizationId: string, remediationId: string) {
  const remediation = getRemediation(organizationId, remediationId);
  if (!remediation) throw new Error('Remediation not found.');
  if (remediation.status !== 'approved') throw new Error('Remediation must be approved.');
  if (!ALLOWED_REMEDIATION_ACTIONS.includes(remediation.actionType as any)) {
    throw new Error('Action is not allowlisted.');
  }

  if (!['restart_service'].includes(remediation.actionType)) {
    throw new Error('AWS adapter currently supports restart_service only.');
  }

  const instanceId = remediation.resourceId;
  if (!/^i-[a-zA-Z0-9]+$/.test(instanceId)) {
    throw new Error('AWS EC2 resourceId must be a valid instance id.');
  }

  transitionRemediation(organizationId, remediationId, 'approved', 'executing');

  for (const account of tenantAccounts(organizationId)) {
    const ec2 = clientForAccount(account);

    try {
      const before = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
      const instance = before.Reservations?.[0]?.Instances?.[0];
      if (!instance) continue;

      const state = instance.State?.Name;
      if (state === 'running') {
        await ec2.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
        await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
      } else if (state === 'stopped') {
        await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
      } else {
        throw new Error(`EC2 instance is in unsupported state: ${state || 'unknown'}`);
      }

      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        const check = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
        const current = check.Reservations?.[0]?.Instances?.[0];
        if (current?.State?.Name === 'running') {
          const verification = `EC2 instance ${instanceId} is running after remediation.`;
          transitionRemediation(organizationId, remediationId, 'executing', 'verified', { verification });
          return {
            success: true,
            actionType: remediation.actionType,
            resourceId: instanceId,
            verification
          };
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      throw new Error(`EC2 instance ${instanceId} did not return to running state within 180 seconds.`);
    } catch (error) {
      if (error instanceof Error && /did not return|unsupported state/.test(error.message)) {
        transitionRemediation(organizationId, remediationId, 'executing', 'failed', { failureReason: error.message });
        throw error;
      }
    }
  }

  const failureReason = `AWS EC2 instance ${instanceId} was not found in any tenant-authorized AWS account.`;
  transitionRemediation(organizationId, remediationId, 'executing', 'failed', { failureReason });
  throw new Error(failureReason);
}
