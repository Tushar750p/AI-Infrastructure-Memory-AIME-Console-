import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from './authRoutes.js';
import {
  initializeMemoryStore,
  storeMemoryItem,
  searchMemory,
  getTimeline,
  getRootCauseAnalysis,
  getAIRecommendations,
  getSummaryReports,
  deleteMemoryItem,
  MemoryType
} from '../services/memoryEngine.js';
import { getCollectionData } from '../db/firestoreDb.js';
import { getTenantId, tenantRecords, findTenantRecord } from '../services/tenantAccess.js';
import { listInfrastructureEvents, getCollectorStatus } from '../services/infrastructureEventService.js';
import { listDurableInfrastructureEvents } from '../services/durableInfrastructureHistoryService.js';
import { ingestAwsCloudTrailEvents } from '../services/awsCloudTrailCollector.js';
import { collectAwsStateChanges } from '../services/awsStateChangeCollector.js';
import { correlateInfrastructureEvents } from '../services/eventIntelligenceService.js';
import { collectKubernetesEvents, collectKubernetesState } from '../services/kubernetesEventCollector.js';
import { collectDockerEvents, collectDockerState } from '../services/dockerEventCollector.js';
import { collectLinuxEvents } from '../services/linuxEventCollector.js';
import { syncCorrelatedEventsToMemory } from '../services/eventMemoryBridge.js';
import { buildKnowledgeGraph, neighbors } from '../services/knowledgeGraphService.js';
import { getResourceTimeline, getResourceStateAt, getDurableResourceTimeline, getDurableResourceStateAt } from '../services/timeMachineService.js';
import { analyzeIncident } from '../services/incidentIntelligenceService.js';
import { calculateFailureRisk } from '../services/failureRiskService.js';
import { proposeRemediation, approveRemediation, listRemediations, proposeRollback, approveRollback, getRollback } from '../services/remediationService.js';
import { executeApprovedRemediation } from '../services/remediationExecutor.js';
import { executeDockerRemediation } from '../services/dockerRemediationAdapter.js';
import { executeKubernetesRemediation } from '../services/kubernetesRemediationAdapter.js';
import { executeAwsRemediation } from '../services/awsRemediationAdapter.js';
import { executeDockerRollback } from '../services/dockerRollbackAdapter.js';
import { captureDockerRollbackSnapshot, listDockerRollbackCandidates } from '../services/dockerRollbackSnapshotService.js';
import { getCollectorCheckpoints, getCollectorHealth, runInfrastructureCollectors } from '../services/infrastructureCollectorScheduler.js';

export const memoryRouter = Router();

// Phase 2: canonical infrastructure event stream, scoped to the authenticated tenant.
memoryRouter.post('/infrastructure/remediations/:id/execute/aws', requirePermission('infra:deploy'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeAwsRemediation(getTenantId(req), req.params.id);
    res.json({ success: result.success, execution: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/remediations/:id/execute/kubernetes', requirePermission('infra:deploy'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeKubernetesRemediation(getTenantId(req), req.params.id);
    res.json({ success: result.success, execution: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/remediations/:id/execute/docker', requirePermission('infra:deploy'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeDockerRemediation(getTenantId(req), req.params.id);
    res.json({ success: result.success, execution: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/remediations/:id/execute', requirePermission('infra:deploy'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = executeApprovedRemediation(getTenantId(req), req.params.id);
    res.json({ success: result.success, execution: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/rollbacks', requirePermission('infra:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getTenantId(req);
    const remediationId = String(req.body?.remediationId || '');
    const resourceId = String(req.body?.resourceId || '');
    const rollbackType = String(req.body?.rollbackType || '');
    if (!remediationId || !resourceId || !rollbackType) {
      return res.status(400).json({ success: false, error: 'remediationId, resourceId and rollbackType are required.' });
    }
    const rollback = proposeRollback({
      organizationId,
      remediationId,
      resourceId,
      rollbackType,
      description: String(req.body?.description || ''),
      reason: String(req.body?.reason || ''),
      proposedBy: req.user.id,
      evidenceEventIds: Array.isArray(req.body?.evidenceEventIds) ? req.body.evidenceEventIds : [],
      targetSnapshotId: req.body?.targetSnapshotId ? String(req.body.targetSnapshotId) : undefined
    });
    res.status(201).json({ success: true, rollback });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
memoryRouter.post('/infrastructure/rollbacks/docker/snapshot', requirePermission('infra:write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getTenantId(req);
    const hostId = String(req.body?.hostId || '');
    const containerId = String(req.body?.containerId || '');
    if (!hostId || !containerId) {
      return res.status(400).json({ success: false, error: 'hostId and containerId are required.' });
    }
    const snapshot = await captureDockerRollbackSnapshot(organizationId, hostId, containerId);
    const { env, ...metadata } = snapshot;
    res.status(201).json({ success: true, snapshot: { ...metadata, env: [] } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/rollbacks/docker/candidates', requirePermission('infra:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const hostId = String(req.query?.hostId || '');
    const containerId = String(req.query?.containerId || '');
    const limit = Math.min(Math.max(parseInt(String(req.query?.limit || '20'), 10) || 20, 1), 100);
    if (!hostId || !containerId) return res.status(400).json({ success: false, error: 'hostId and containerId are required.' });
    const candidates = listDockerRollbackCandidates(getTenantId(req), hostId, containerId, limit);
    res.json({
      success: true,
      candidates: candidates.map((candidate: any) => ({
        candidateEventId: candidate.candidateEventId,
        candidateCreatedAt: candidate.candidateCreatedAt,
        capturedAt: candidate.capturedAt,
        image: candidate.image,
        running: candidate.running,
        name: candidate.name,
        integrityHash: candidate.integrityHash
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/rollbacks/:id/approve', requirePermission('infra:deploy'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const rollback = approveRollback(getTenantId(req), req.params.id, req.user.id);
    if (!rollback) return res.status(404).json({ success: false, error: 'Rollback not found.' });
    res.json({ success: true, rollback });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/rollbacks/:id/execute/docker', requirePermission('infra:deploy'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeDockerRollback(getTenantId(req), req.params.id);
    res.json({ success: result.success, rollback: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/rollbacks/:id', requirePermission('infra:read'), (req: AuthenticatedRequest, res: Response) => {
  const rollback = getRollback(getTenantId(req), req.params.id);
  if (!rollback) return res.status(404).json({ success: false, error: 'Rollback not found.' });
  res.json({ success: true, rollback });
});

memoryRouter.get('/infrastructure/remediations', (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, remediations: listRemediations(getTenantId(req)) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/remediations', requirePermission('infra:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId, actionType, description, reason, riskLevel, evidenceEventIds = [] } = req.body || {};
    if (!resourceId || !actionType || !description || !reason || !riskLevel) {
      return res.status(400).json({ success: false, error: 'resourceId, actionType, description, reason and riskLevel are required.' });
    }

    const remediation = proposeRemediation({
      organizationId: getTenantId(req),
      resourceId,
      actionType,
      description,
      reason,
      riskLevel,
      proposedBy: req.user.id,
      evidenceEventIds: Array.isArray(evidenceEventIds) ? evidenceEventIds : []
    });

    res.status(201).json({ success: true, remediation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/remediations/:id/approve', requirePermission('infra:deploy'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const remediation = approveRemediation(getTenantId(req), req.params.id, req.user.id);
    if (!remediation) return res.status(404).json({ success: false, error: 'Remediation not found.' });
    res.json({ success: true, remediation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


memoryRouter.get('/infrastructure/remediation-audit', requirePermission('audit:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
    const audit = getCollectionData('remediationAudit', [])
      .filter((entry: any) => entry.organizationId === getTenantId(req))
      .slice(0, limit);
    res.json({ success: true, total: audit.length, audit });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


memoryRouter.get('/infrastructure/collector-health', (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, ...getCollectorHealth(getTenantId(req)) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/collector-checkpoints', (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, checkpoints: getCollectorCheckpoints(getTenantId(req)) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/infrastructure/collectors/run', requirePermission('infra:write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await runInfrastructureCollectors();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/risk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lookbackHours = Math.min(Math.max(parseInt(String(req.query.lookbackHours || '24'), 10) || 24, 1), 168);
    res.json({
      success: true,
      lookbackHours,
      signals: await calculateFailureRisk(getTenantId(req), lookbackHours)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/incidents/:correlationId/intelligence', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const correlationId = decodeURIComponent(req.params.correlationId);
    const result = await analyzeIncident(getTenantId(req), correlationId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Incident correlation not found.' });
    }
    res.json({ success: true, intelligence: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/time-machine/:resourceId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const source = req.query.source as string | undefined;
    const limit = Math.min(parseInt(String(req.query.limit || '200'), 10) || 200, 1000);
    res.json({
      success: true,
      resourceId: req.params.resourceId,
      timeline: await getDurableResourceTimeline(getTenantId(req), req.params.resourceId, { start, end, source, limit })
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/time-machine/:resourceId/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const at = String(req.query.at || '');
    if (!at || Number.isNaN(new Date(at).getTime())) {
      return res.status(400).json({ success: false, error: 'Valid "at" timestamp is required.' });
    }
    res.json({
      success: true,
      resourceId: req.params.resourceId,
      at,
      state: await getDurableResourceStateAt(getTenantId(req), req.params.resourceId, at)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/graph', (req: AuthenticatedRequest, res: Response) => {
  try {
    const graph = buildKnowledgeGraph(getTenantId(req));
    res.json({ success: true, ...graph });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/graph/neighbors/:nodeId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const depth = Math.min(Math.max(parseInt(String(req.query.depth || '1'), 10) || 1, 1), 5);
    const nodeId = decodeURIComponent(req.params.nodeId);
    res.json({
      success: true,
      nodeId,
      depth,
      nodes: neighbors(getTenantId(req), nodeId, depth)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    res.json({ events: await listDurableInfrastructureEvents(getTenantId(req), limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/aws/cloudtrail', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getTenantId(req);
    const minutes = Math.min(Math.max(parseInt(String(req.body?.minutes || '60'), 10) || 60, 1), 1440);
    const result = await ingestAwsCloudTrailEvents(organizationId, {
      maxResults: 50,
      startTime: new Date(Date.now() - minutes * 60 * 1000),
      endTime: new Date()
    });
    const status = result.source === 'live' && !result.reason ? 200 : 503;
    res.status(status).json({
      success: result.source === 'live' && !result.reason,
      source: result.source,
      ingested: result.ingested,
      reason: result.reason || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

memoryRouter.get('/infrastructure/correlations', (req: AuthenticatedRequest, res: Response) => {
  try {
    const windowMinutes = Math.min(Math.max(parseInt(String(req.query.windowMinutes || '15'), 10) || 15, 1), 120);
    res.json({
      windowMinutes,
      groups: correlateInfrastructureEvents(getTenantId(req), windowMinutes)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/linux/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectLinuxEvents(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/docker/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectDockerEvents(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/docker/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectDockerState(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/kubernetes/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectKubernetesEvents(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/kubernetes/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectKubernetesState(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/collect/aws/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await collectAwsStateChanges(getTenantId(req));
    const ok = result.source === 'live';
    res.status(ok ? 200 : 503).json({ success: ok, ...result });
  } catch (err: any) {
    res.status(502).json({ success: false, source: 'live', error: err.message });
  }
});

memoryRouter.post('/infrastructure/memory-sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const windowMinutes = Math.min(Math.max(parseInt(String(req.body?.windowMinutes || '15'), 10) || 15, 1), 120);
    const result = await syncCorrelatedEventsToMemory(getTenantId(req), windowMinutes);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/infrastructure/collector-status', (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(getCollectorStatus(getTenantId(req)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize memory store on module load
initializeMemoryStore().catch(err => {
  console.warn('[AI Memory Router] Memory store initialization warning:', err);
});

// GET /api/memory - List all memory items with optional filters
memoryRouter.get('/memory', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memoryType, severity, serverId, search, limit = '50', page = '1' } = req.query;
    let memories = tenantRecords(getCollectionData('ai_memory', []), getTenantId(req));

    if (memoryType) {
      const mt = String(memoryType).toLowerCase();
      memories = memories.filter((m: any) => m.memoryType && m.memoryType.toLowerCase() === mt);
    }

    if (severity) {
      const sev = String(severity).toLowerCase();
      memories = memories.filter((m: any) => m.severity && m.severity.toLowerCase() === sev);
    }

    if (serverId) {
      const sid = String(serverId);
      memories = memories.filter((m: any) => m.serverId === sid || m.server === sid || m.serverName === sid);
    }

    if (search) {
      const q = String(search).toLowerCase();
      memories = memories.filter((m: any) =>
        (m.aiSummary && m.aiSummary.toLowerCase().includes(q)) ||
        (m.eventType && m.eventType.toLowerCase().includes(q)) ||
        (m.details && m.details.toLowerCase().includes(q)) ||
        (m.rootCause && m.rootCause.toLowerCase().includes(q)) ||
        (m.tags && Array.isArray(m.tags) && m.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }

    // Sort descending by timestamp
    memories.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = memories.slice(startIndex, startIndex + limitNum);

    res.json({
      total: memories.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(memories.length / limitNum) || 1,
      data: paginated
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch memory items: ${err.message}` });
  }
});

// GET /api/memory/search - Natural Language & Vector Semantic Search
memoryRouter.get('/memory/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = (req.query.q || req.query.query || '') as string;
    const memoryType = req.query.type as string | undefined;
    const severity = req.query.severity as string | undefined;
    const serverId = req.query.serverId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 0.15;

    if (!query) {
      return res.status(400).json({ error: 'Search query parameter "q" or "query" is required.' });
    }

    const searchResult = await searchMemory({
      query,
      memoryType,
      severity,
      serverId,
      organizationId: getTenantId(req),
      limit,
      threshold
    });

    res.json({
      success: true,
      query: searchResult.query,
      matchesCount: searchResult.totalMatches,
      results: searchResult.results
    });
  } catch (err: any) {
    res.status(500).json({ error: `Semantic memory search failed: ${err.message}` });
  }
});

// GET /api/memory/timeline - Infrastructure Event Timeline
memoryRouter.get('/memory/timeline', (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const type = req.query.type as string | undefined;
    const serverId = req.query.serverId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const timeline = getTimeline({ start, end, type, serverId, limit, organizationId: getTenantId(req) });

    res.json({
      totalEvents: timeline.length,
      timeline
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate timeline: ${err.message}` });
  }
});

// GET /api/memory/incidents - Incident Memories with Root Cause & Previous Fixes
memoryRouter.get('/memory/incidents', (req: AuthenticatedRequest, res: Response) => {
  try {
    const memories = tenantRecords(getCollectionData('ai_memory', []), getTenantId(req));
    const incidents = memories.filter((m: any) =>
      m.memoryType === 'Incident Memory' || m.severity === 'critical'
    );

    incidents.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      totalIncidents: incidents.length,
      incidents: incidents.map((m: any) => ({
        id: m.id,
        timestamp: m.timestamp,
        serverName: m.serverName || m.server,
        eventType: m.eventType,
        severity: m.severity,
        aiSummary: m.aiSummary,
        rootCause: m.rootCause || m.details,
        suggestedFix: m.suggestedFix || m.recommendation,
        previousResolution: m.previousResolution,
        tags: m.tags
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch incident memories: ${err.message}` });
  }
});

// GET /api/memory/recommendations - AI Recommendations categorized
memoryRouter.get('/memory/recommendations', (req: AuthenticatedRequest, res: Response) => {
  try {
    const recommendations = getAIRecommendations(getTenantId(req));
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch AI recommendations: ${err.message}` });
  }
});

// GET /api/memory/root-cause - Root Cause Analysis
memoryRouter.get('/memory/root-cause', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = (req.query.q || req.query.query || req.query.id || 'Nginx connection pool exhaustion') as string;
    const rca = await getRootCauseAnalysis(query, getTenantId(req));
    res.json(rca);
  } catch (err: any) {
    res.status(500).json({ error: `Root cause analysis failed: ${err.message}` });
  }
});

// POST /api/memory/store - Store new AI Memory item
memoryRouter.post('/memory/store', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      memoryType,
      timestamp,
      user,
      server,
      serverId,
      serverName,
      cluster,
      awsAccount,
      resource,
      eventType,
      severity,
      tags,
      aiSummary,
      recommendation,
      details,
      rawEvent,
      rootCause,
      suggestedFix,
      previousResolution,
      command,
      exitCode,
      environment
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType field is required.' });
    }

    const storedItem = await storeMemoryItem({
      memoryType: memoryType as MemoryType,
      timestamp,
      user,
      server,
      serverId,
      serverName,
      cluster,
      awsAccount,
      resource,
      eventType,
      severity,
      tags,
      aiSummary,
      recommendation,
      details,
      rawEvent,
      rootCause,
      suggestedFix,
      previousResolution,
      command,
      exitCode,
      environment,
      organizationId: getTenantId(req),
      createdBy: req.user.id
    });

    res.status(201).json({
      message: 'AI Memory item successfully indexed and stored in vector engine.',
      memory: storedItem
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to store AI memory item: ${err.message}` });
  }
});

// DELETE /api/memory/:id - Delete AI Memory item
memoryRouter.delete('/memory/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = deleteMemoryItem(id, getTenantId(req));

    if (!success) {
      return res.status(404).json({ error: `AI Memory item with ID '${id}' not found.` });
    }

    res.json({ message: `AI Memory item '${id}' deleted successfully.`, success: true });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to delete AI memory item: ${err.message}` });
  }
});

// GET /api/memory/reports - Daily and Weekly summary reports
memoryRouter.get('/memory/reports', (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = getSummaryReports(getTenantId(req));
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate memory reports: ${err.message}` });
  }
});
