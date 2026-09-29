import * as k8s from '@kubernetes/client-node';
import { getCollectionData } from '../db/firestoreDb.js';
import { getRemediation, transitionRemediation } from './remediationService.js';
import { ALLOWED_REMEDIATION_ACTIONS } from './remediationExecutor.js';
import { decryptSecret } from './sshService.js';

function tenantClusters(organizationId: string): any[] {
  return getCollectionData('k8sClusters', []).filter(
    (cluster: any) => cluster.organizationId === organizationId
  );
}

function buildKubeConfig(cluster: any): k8s.KubeConfig | null {
  if (!cluster?.kubeconfig) return null;
  try {
    const raw = decryptSecret(cluster.kubeconfig);
    const config = new k8s.KubeConfig();
    config.loadFromString(raw);
    return config;
  } catch {
    return null;
  }
}

function responseItems(response: any): any[] {
  return response?.items || response?.body?.items || [];
}

export async function executeKubernetesRemediation(
  organizationId: string,
  remediationId: string
) {
  const remediation = getRemediation(organizationId, remediationId);
  if (!remediation) throw new Error('Remediation not found.');
  if (remediation.status !== 'approved') throw new Error('Remediation must be approved.');
  if (!ALLOWED_REMEDIATION_ACTIONS.includes(remediation.actionType as any)) {
    throw new Error('Action is not allowlisted.');
  }
  if (remediation.actionType !== 'restart_service') {
    throw new Error('Kubernetes adapter currently supports restart_service only.');
  }

  const [namespace, deployment] = remediation.resourceId.split(':');
  if (!namespace || !deployment || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace) ||
      !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(deployment)) {
    throw new Error('Kubernetes resourceId must be namespace:deployment.');
  }

  transitionRemediation(organizationId, remediationId, 'approved', 'executing');

  for (const cluster of tenantClusters(organizationId)) {
    const config = buildKubeConfig(cluster);
    if (!config) continue;

    try {
      const apps = config.makeApiClient(k8s.AppsV1Api);
      const deploymentObject = await apps.readNamespacedDeployment({ name: deployment, namespace });
      const current = deploymentObject;
      const podTemplate = current.spec?.template;
      const annotations = podTemplate?.metadata?.annotations || {};
      const nextAnnotations = {
        ...annotations,
        'aime.io/restarted-at': new Date().toISOString()
      };

      const patched = {
        metadata: {
          annotations: nextAnnotations
        }
      };

      await apps.patchNamespacedDeployment({
        name: deployment,
        namespace,
        body: patched as any,
        headers: { 'Content-Type': 'application/strategic-merge-patch+json' }
      });

      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        const response = await apps.readNamespacedDeployment({ name: deployment, namespace });
        const updated = response;
        const desired = Number(updated.spec?.replicas ?? 1);
        const available = Number(updated.status?.availableReplicas ?? 0);
        const ready = Number(updated.status?.readyReplicas ?? 0);

        if (available >= desired && ready >= desired) {
          const verification = `Deployment ${namespace}/${deployment} reports ${ready}/${desired} ready replicas after restart.`;
          transitionRemediation(organizationId, remediationId, 'executing', 'verified', { verification });
          return {
            success: true,
            actionType: remediation.actionType,
            resourceId: remediation.resourceId,
            verification
          };
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const failureReason = `Deployment ${namespace}/${deployment} did not become ready within 120 seconds.`;
      transitionRemediation(organizationId, remediationId, 'executing', 'failed', { failureReason });
      throw new Error(failureReason);
    } catch (error) {
      if (error instanceof Error && error.message.includes('did not become ready')) {
        throw error;
      }
    }
  }

  const failureReason = 'Kubernetes deployment could not be restarted or verified on any tenant-authorized cluster.';
  transitionRemediation(organizationId, remediationId, 'executing', 'failed', { failureReason });
  throw new Error(failureReason);
}
