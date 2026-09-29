import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './authRoutes.js';
import {
  listKubernetesClusters,
  getClusterNodes,
  getClusterPods,
  getClusterDeployments,
  getClusterServices,
  getKubernetesEvents,
  getPodLogs,
  restartDeployment,
  scaleDeployment,
  rollbackDeployment
} from '../services/k8sService.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { encryptSecret } from '../services/sshService.js';

export const k8sRouter = Router();

// ==========================================
// CLUSTER MANAGEMENT CRUD
// ==========================================

// GET /api/kubernetes/clusters - List clusters
k8sRouter.get('/kubernetes/clusters', async (req: Request, res: Response) => {
  try {
    const clusters = await listKubernetesClusters();
    res.json(clusters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kubernetes/clusters - Register new cluster
k8sRouter.post('/kubernetes/clusters', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, provider, region, version, environment, kubeconfig, serviceAccountToken } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Cluster Name is required.' });
  }

  const clusters = getCollectionData('k8sClusters', []);
  const now = new Date().toISOString();
  const clusterId = `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newCluster = {
    id: clusterId,
    name,
    provider: provider || 'Generic Kubernetes',
    region: region || 'us-central1',
    version: version || 'v1.29.0',
    status: 'HEALTHY',
    nodeCount: 3,
    podCount: 15,
    environment: environment || 'production',
    kubeconfig: kubeconfig ? encryptSecret(kubeconfig) : undefined,
    serviceAccountToken: serviceAccountToken ? encryptSecret(serviceAccountToken) : undefined,
    lastSync: now,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now
  };

  clusters.unshift(newCluster);
  setCollectionData('k8sClusters', clusters);

  // Record Audit Log
  const auditLogs = getCollectionData('auditLogs', []);
  auditLogs.unshift({
    id: `audit-k8s-cluster-${Date.now()}`,
    action: 'K8S_CLUSTER_REGISTERED',
    userId: req.user.email,
    user: req.user.email,
    details: `Registered Kubernetes cluster ${name} (${provider || 'Generic'})`,
    createdAt: now,
    updatedAt: now
  });
  setCollectionData('auditLogs', auditLogs);

  res.status(201).json({
    message: 'Kubernetes cluster registered successfully.',
    cluster: { ...newCluster, kubeconfig: undefined, serviceAccountToken: undefined }
  });
});

// PUT /api/kubernetes/clusters/:id - Update cluster
k8sRouter.put('/kubernetes/clusters/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const clusters = getCollectionData('k8sClusters', []);
  const cluster = clusters.find((c: any) => c.id === id);

  if (!cluster) {
    return res.status(404).json({ error: 'Kubernetes cluster not found.' });
  }

  const { name, provider, region, version, environment, status } = req.body;
  if (name) cluster.name = name;
  if (provider) cluster.provider = provider;
  if (region) cluster.region = region;
  if (version) cluster.version = version;
  if (environment) cluster.environment = environment;
  if (status) cluster.status = status;

  cluster.updatedAt = new Date().toISOString();
  setCollectionData('k8sClusters', clusters);

  res.json({ message: 'Cluster updated successfully.', cluster });
});

// DELETE /api/kubernetes/clusters/:id - Remove cluster
k8sRouter.delete('/kubernetes/clusters/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  let clusters = getCollectionData('k8sClusters', []);
  const exists = clusters.some((c: any) => c.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'Kubernetes cluster not found.' });
  }

  clusters = clusters.filter((c: any) => c.id !== id);
  setCollectionData('k8sClusters', clusters);

  res.json({ message: 'Kubernetes cluster removed.' });
});

// ==========================================
// KUBERNETES RESOURCES & WORKLOADS
// ==========================================

// GET /api/kubernetes/nodes - Get Nodes
k8sRouter.get('/kubernetes/nodes', async (req: Request, res: Response) => {
  try {
    const nodes = await getClusterNodes();
    res.json(nodes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/pods - Get Pods
k8sRouter.get('/kubernetes/pods', async (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || '';
  try {
    const pods = await getClusterPods(namespace);
    res.json(pods);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/deployments - Get Deployments
k8sRouter.get('/kubernetes/deployments', async (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || '';
  try {
    const deployments = await getClusterDeployments(namespace);
    res.json(deployments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/services - Get Services
k8sRouter.get('/kubernetes/services', async (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || '';
  try {
    const services = await getClusterServices(namespace);
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/events - Get Cluster Events
k8sRouter.get('/kubernetes/events', async (req: Request, res: Response) => {
  try {
    const events = await getKubernetesEvents();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/logs/:pod - Get Pod Logs
k8sRouter.get('/kubernetes/logs/:pod', async (req: Request, res: Response) => {
  const { pod } = req.params;
  const namespace = (req.query.namespace as string) || 'default';
  try {
    const logs = await getPodLogs(pod, namespace);
    res.json({ pod, namespace, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kubernetes/restart/:deployment - Restart Deployment
k8sRouter.post('/kubernetes/restart/:deployment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deployment } = req.params;
  const namespace = req.body.namespace || 'default';
  try {
    const result = await restartDeployment(deployment, namespace, req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kubernetes/scale/:deployment - Scale Deployment
k8sRouter.post('/kubernetes/scale/:deployment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deployment } = req.params;
  const replicas = parseInt(req.body.replicas, 10);
  const namespace = req.body.namespace || 'default';

  if (isNaN(replicas)) {
    return res.status(400).json({ error: 'Valid replicas number is required.' });
  }

  try {
    const result = await scaleDeployment(deployment, replicas, namespace, req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kubernetes/rollback/:deployment - Rollback Deployment
k8sRouter.post('/kubernetes/rollback/:deployment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deployment } = req.params;
  const namespace = req.body.namespace || 'default';
  try {
    const result = await rollbackDeployment(deployment, namespace, req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
