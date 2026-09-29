import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './authRoutes.js';
import {
  listDockerContainers,
  inspectDockerContainer,
  performContainerAction,
  getContainerLogs,
  getContainerStats,
  listDockerImages,
  listDockerVolumes,
  listDockerNetworks,
  checkDockerEngineHealth
} from '../services/dockerService.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

export const dockerRouter = Router();

// GET /api/docker/containers - List all containers
dockerRouter.get('/docker/containers', async (req: Request, res: Response) => {
  try {
    const containers = await listDockerContainers();
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list Docker containers: ${err.message}` });
  }
});

// GET /api/docker/containers/:id - Inspect specific container
dockerRouter.get('/docker/containers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const container = await inspectDockerContainer(id);
    res.json(container);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/docker/containers - Create a new container
dockerRouter.post('/docker/containers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, image, ports, env, volumes } = req.body;

  if (!name || !image) {
    return res.status(400).json({ error: 'Container name and image are required.' });
  }

  const containers = getCollectionData('containers', []);
  const containerId = `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const hexId = Math.random().toString(16).substring(2, 14);

  const newContainer = {
    id: containerId,
    containerId: hexId,
    name,
    image,
    state: 'created',
    status: 'Created just now',
    ports: ports || '0.0.0.0:8080->8080/tcp',
    created: new Date().toISOString(),
    cpuPercent: 0,
    memoryMb: 0,
    memoryLimitMb: 1024,
    netIo: '0 B / 0 B',
    blockIo: '0 B / 0 B',
    restartCount: 0,
    healthStatus: 'starting',
    serverId: 'srv-01-primary'
  };

  containers.unshift(newContainer);
  setCollectionData('containers', containers);

  // Record Audit Log
  const auditLogs = getCollectionData('auditLogs', []);
  auditLogs.unshift({
    id: `audit-docker-create-${Date.now()}`,
    action: 'CONTAINER_CREATED',
    userId: req.user.email,
    user: req.user.email,
    details: `Created Docker container ${name} from image ${image}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  setCollectionData('auditLogs', auditLogs);

  res.status(201).json({ message: 'Container created successfully.', container: newContainer });
});

// POST /api/docker/start/:id - Start container
dockerRouter.post('/docker/start/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await performContainerAction(id, 'start', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docker/stop/:id - Stop container
dockerRouter.post('/docker/stop/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await performContainerAction(id, 'stop', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docker/restart/:id - Restart container
dockerRouter.post('/docker/restart/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await performContainerAction(id, 'restart', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/docker/containers/:id - Delete / Remove container
dockerRouter.delete('/docker/containers/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await performContainerAction(id, 'remove', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docker/images - List images
dockerRouter.get('/docker/images', async (req: Request, res: Response) => {
  try {
    const images = await listDockerImages();
    res.json(images);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docker/volumes - List volumes
dockerRouter.get('/docker/volumes', async (req: Request, res: Response) => {
  try {
    const volumes = await listDockerVolumes();
    res.json(volumes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docker/networks - List networks
dockerRouter.get('/docker/networks', async (req: Request, res: Response) => {
  try {
    const networks = await listDockerNetworks();
    res.json(networks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docker/logs/:id - Get live container logs
dockerRouter.get('/docker/logs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const linesCount = parseInt((req.query.lines as string) || '100', 10);
  try {
    const logs = await getContainerLogs(id, linesCount);
    res.json({ containerId: id, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docker/stats/:id - Get container metrics & stats
dockerRouter.get('/docker/stats/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const stats = await getContainerStats(id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
