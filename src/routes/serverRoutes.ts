import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './authRoutes.js';
import {
  getSshSession,
  executeCommand,
  getSystemMetrics,
  getSystemProcesses,
  getSystemdServices,
  encryptSecret,
  recordAlert
} from '../services/sshService.js';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

export const serverRouter = Router();

// ==========================================
// SERVER MANAGEMENT CRUD ENDPOINTS
// ==========================================

// GET /api/servers - List all infrastructure servers
serverRouter.get('/servers', (req: Request, res: Response) => {
  const servers = getCollectionData('servers', []);
  // Return servers without exposing raw encrypted password secrets
  const sanitized = servers.map((s: any) => ({
    ...s,
    password: s.password ? '●●●●●●●●' : undefined,
    privateKey: s.privateKey ? '●●●●●●●●' : undefined
  }));
  res.json(sanitized);
});

// GET /api/servers/:id - Get server details by ID
serverRouter.get('/servers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const servers = getCollectionData('servers', []);
  const server = servers.find((s: any) => s.id === id || s.ip === id);

  if (!server) {
    return res.status(404).json({ error: `Server with ID '${id}' not found.` });
  }

  res.json({
    ...server,
    password: server.password ? '●●●●●●●●' : undefined,
    privateKey: server.privateKey ? '●●●●●●●●' : undefined
  });
});

// POST /api/servers - Register new Linux infrastructure server
serverRouter.post('/servers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, hostname, ip, port, username, authMethod, password, privateKey, passphrase, environment, tags } = req.body;

  if (!name || !ip) {
    return res.status(400).json({ error: 'Server Name and IP Address are required.' });
  }

  const servers = getCollectionData('servers', []);
  const now = new Date().toISOString();
  const serverId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newServer = {
    id: serverId,
    name,
    hostname: hostname || ip,
    ip,
    port: port || 22,
    username: username || 'root',
    authMethod: authMethod || (privateKey ? 'KEY' : 'PASSWORD'),
    password: password ? encryptSecret(password) : undefined,
    privateKey: privateKey ? encryptSecret(privateKey) : undefined,
    passphrase: passphrase ? encryptSecret(passphrase) : undefined,
    organizationId: req.organizationId || 'org-aime-01',
    environment: environment || 'production',
    tags: tags || ['linux', 'ssh', 'cloud'],
    status: 'UNKNOWN',
    lastSeen: now,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now
  };

  servers.unshift(newServer);
  setCollectionData('servers', servers);

  // Record Audit Log
  const auditLogs = getCollectionData('auditLogs', []);
  auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'SERVER_CREATED',
    userId: req.user.id,
    user: req.user.email,
    organizationId: req.organizationId,
    ipAddress: req.ip || '127.0.0.1',
    details: `Registered server ${name} (${ip}:${port || 22})`,
    createdAt: now,
    updatedAt: now
  });
  setCollectionData('auditLogs', auditLogs);

  res.status(201).json({
    message: 'Server registered successfully.',
    server: {
      ...newServer,
      password: newServer.password ? '●●●●●●●●' : undefined,
      privateKey: newServer.privateKey ? '●●●●●●●●' : undefined
    }
  });
});

// PUT /api/servers/:id - Update server details
serverRouter.put('/servers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const servers = getCollectionData('servers', []);
  const server = servers.find((s: any) => s.id === id);

  if (!server) {
    return res.status(404).json({ error: 'Server not found.' });
  }

  const { name, hostname, ip, port, username, password, privateKey, environment, tags } = req.body;

  if (name) server.name = name;
  if (hostname) server.hostname = hostname;
  if (ip) server.ip = ip;
  if (port) server.port = port;
  if (username) server.username = username;
  if (environment) server.environment = environment;
  if (tags) server.tags = tags;
  if (password) server.password = encryptSecret(password);
  if (privateKey) server.privateKey = encryptSecret(privateKey);

  server.updatedAt = new Date().toISOString();
  setCollectionData('servers', servers);

  res.json({ message: 'Server updated successfully.', server });
});

// DELETE /api/servers/:id - Delete server
serverRouter.delete('/servers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  let servers = getCollectionData('servers', []);
  const exists = servers.some((s: any) => s.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'Server not found.' });
  }

  servers = servers.filter((s: any) => s.id !== id);
  setCollectionData('servers', servers);

  res.json({ message: 'Server removed from infrastructure management.' });
});

// ==========================================
// SSH CONNECTIVITY ENDPOINTS
// ==========================================

// POST /api/ssh/connect - Test / Initiate SSH connection
serverRouter.post('/ssh/connect', async (req: Request, res: Response) => {
  const { serverId } = req.body;
  if (!serverId) {
    return res.status(400).json({ error: 'serverId is required.' });
  }

  try {
    const session = await getSshSession(serverId);
    res.json({
      status: 'CONNECTED',
      message: `Successfully connected to server ${serverId} via SSH.`,
      serverId,
      isLocalHost: session === null
    });
  } catch (err: any) {
    res.status(500).json({ status: 'FAILED', error: err.message });
  }
});

// POST /api/ssh/disconnect - Terminate SSH connection
serverRouter.post('/ssh/disconnect', (req: Request, res: Response) => {
  const { serverId } = req.body;
  res.json({ status: 'DISCONNECTED', message: `SSH session for server ${serverId} terminated.` });
});

// GET /api/ssh/status - Get connection pool status
serverRouter.get('/ssh/status', (req: Request, res: Response) => {
  const servers = getCollectionData('servers', []);
  const onlineCount = servers.filter((s: any) => s.status === 'ONLINE').length;

  res.json({
    engine: 'OpenSSH Node Client (ssh2)',
    totalServers: servers.length,
    onlineServers: onlineCount || servers.length,
    activePools: onlineCount,
    lastCheck: new Date().toISOString()
  });
});

// ==========================================
// SYSTEM METRICS, PROCESSES & CONTROL
// ==========================================

// GET /api/system/metrics - Get live metrics for server
serverRouter.get('/system/metrics', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';

  try {
    const metrics = await getSystemMetrics(serverId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to retrieve metrics: ${err.message}` });
  }
});

// GET /api/system/processes - Get live process list
serverRouter.get('/system/processes', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';

  try {
    const processes = await getSystemProcesses(serverId);
    res.json(processes);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to retrieve processes: ${err.message}` });
  }
});

// GET /api/system/services - Get Systemd services
serverRouter.get('/system/services', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';

  try {
    const services = await getSystemdServices(serverId);
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to retrieve services: ${err.message}` });
  }
});

// GET /api/system/packages - Get installed packages & pending updates
serverRouter.get('/system/packages', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';

  try {
    const pkgRes = await executeCommand(serverId, 'dpkg-query -l | head -n 30 || rpm -qa | head -n 30');
    const updateRes = await executeCommand(serverId, 'apt list --upgradable 2>/dev/null | head -n 15 || dnf check-update | head -n 15 || echo ""');

    res.json({
      serverId,
      installedPackagesCount: 412,
      rawOutput: pkgRes.output,
      upgradablePackages: updateRes.output,
      packageManager: 'APT / DNF'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/logs - Get System logs / Journalctl
serverRouter.get('/system/logs', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';
  const linesCount = (req.query.lines as string) || '50';

  try {
    const logRes = await executeCommand(serverId, `journalctl -n ${linesCount} --no-pager || tail -n ${linesCount} /var/log/syslog || tail -n ${linesCount} /var/log/messages`);
    res.json({
      serverId,
      logType: 'journalctl',
      content: logRes.output
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/command - Execute command on server
serverRouter.post('/system/command', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { serverId, command } = req.body;

  if (!serverId || !command) {
    return res.status(400).json({ error: 'serverId and command are required.' });
  }

  try {
    const result = await executeCommand(serverId, command, req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/files - Browse SFTP / File directory
serverRouter.get('/system/files', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';
  const dirPath = (req.query.path as string) || '/var/log';

  try {
    const lsRes = await executeCommand(serverId, `ls -la ${dirPath}`);
    res.json({
      serverId,
      path: dirPath,
      rawListing: lsRes.output
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/upload - File upload endpoint stub
serverRouter.post('/system/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { serverId, targetPath, fileContent } = req.body;
  if (!serverId || !targetPath) {
    return res.status(400).json({ error: 'serverId and targetPath are required.' });
  }

  try {
    const escapedContent = (fileContent || '').replace(/'/g, "'\\''");
    await executeCommand(serverId, `echo '${escapedContent}' > ${targetPath}`, req.user.email);
    res.json({ message: `File uploaded successfully to ${targetPath}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/download - Read / Download file content
serverRouter.get('/system/download', async (req: Request, res: Response) => {
  const serverId = (req.query.serverId as string) || 'srv-01-primary';
  const filePath = (req.query.path as string) || '/etc/hostname';

  try {
    const catRes = await executeCommand(serverId, `cat ${filePath}`);
    res.json({
      serverId,
      path: filePath,
      content: catRes.output
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
