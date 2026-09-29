import Docker from 'dockerode';
import fs from 'fs';
import { getCollectionData } from '../db/firestoreDb.js';
import { getRemediation } from './remediationService.js';
import { ALLOWED_REMEDIATION_ACTIONS } from './remediationExecutor.js';

function dockerClientForHost(host: any): Docker | null {
  if (host.socketPath && fs.existsSync(host.socketPath)) {
    return new Docker({ socketPath: host.socketPath });
  }

  if (!host.endpoint) return null;

  try {
    const url = new URL(host.endpoint);
    if (!['tcp:', 'http:', 'https:'].includes(url.protocol)) return null;
    return new Docker({
      protocol: url.protocol.replace(':', '') as any,
      host: url.hostname,
      port: Number(url.port || 2375)
    });
  } catch {
    return null;
  }
}

export interface DockerRemediationResult {
  success: boolean;
  actionType: string;
  resourceId: string;
  verification: string;
}

export async function executeDockerRemediation(
  organizationId: string,
  remediationId: string
): Promise<DockerRemediationResult> {
  const remediation = getRemediation(organizationId, remediationId);
  if (!remediation) throw new Error('Remediation not found.');
  if (remediation.status !== 'approved') throw new Error('Remediation is not approved.');

  if (!ALLOWED_REMEDIATION_ACTIONS.includes(remediation.actionType as any)) {
    throw new Error('Action is not allowed by remediation policy.');
  }

  if (!['restart_container', 'acknowledge_alert'].includes(remediation.actionType)) {
    throw new Error('Docker adapter only supports restart_container and acknowledge_alert.');
  }

  if (remediation.actionType === 'acknowledge_alert') {
    return {
      success: true,
      actionType: remediation.actionType,
      resourceId: remediation.resourceId,
      verification: 'Alert acknowledged at policy layer; no Docker mutation performed.'
    };
  }

  const hosts = getCollectionData('dockerHosts', []).filter(
    (host: any) => host.organizationId === organizationId
  );

  for (const host of hosts) {
    const docker = dockerClientForHost(host);
    if (!docker) continue;

    try {
      await docker.ping();
      const container = docker.getContainer(remediation.resourceId);
      await container.inspect();
      await container.restart();

      const verified = await container.inspect();
      if (verified.State?.Running) {
        return {
          success: true,
          actionType: remediation.actionType,
          resourceId: remediation.resourceId,
          verification: 'Container restart completed and Docker reports the container as running.'
        };
      }
    } catch {
      // Try the next tenant-authorized Docker host.
    }
  }

  throw new Error('Docker container could not be restarted or verified on any tenant-authorized host.');
}
