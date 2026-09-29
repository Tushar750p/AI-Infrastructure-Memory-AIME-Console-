import { Router, Request, Response } from 'express';
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

export const memoryRouter = Router();

// Initialize memory store on module load
initializeMemoryStore().catch(err => {
  console.warn('[AI Memory Router] Memory store initialization warning:', err);
});

// GET /api/memory - List all memory items with optional filters
memoryRouter.get('/memory', (req: Request, res: Response) => {
  try {
    const { memoryType, severity, serverId, search, limit = '50', page = '1' } = req.query;
    let memories = getCollectionData('ai_memory', []);

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
memoryRouter.get('/memory/search', async (req: Request, res: Response) => {
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
memoryRouter.get('/memory/timeline', (req: Request, res: Response) => {
  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const type = req.query.type as string | undefined;
    const serverId = req.query.serverId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const timeline = getTimeline({ start, end, type, serverId, limit });

    res.json({
      totalEvents: timeline.length,
      timeline
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate timeline: ${err.message}` });
  }
});

// GET /api/memory/incidents - Incident Memories with Root Cause & Previous Fixes
memoryRouter.get('/memory/incidents', (req: Request, res: Response) => {
  try {
    const memories = getCollectionData('ai_memory', []);
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
memoryRouter.get('/memory/recommendations', (req: Request, res: Response) => {
  try {
    const recommendations = getAIRecommendations();
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch AI recommendations: ${err.message}` });
  }
});

// GET /api/memory/root-cause - Root Cause Analysis
memoryRouter.get('/memory/root-cause', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q || req.query.query || req.query.id || 'Nginx connection pool exhaustion') as string;
    const rca = await getRootCauseAnalysis(query);
    res.json(rca);
  } catch (err: any) {
    res.status(500).json({ error: `Root cause analysis failed: ${err.message}` });
  }
});

// POST /api/memory/store - Store new AI Memory item
memoryRouter.post('/memory/store', async (req: Request, res: Response) => {
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
      environment
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
memoryRouter.delete('/memory/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = deleteMemoryItem(id);

    if (!success) {
      return res.status(404).json({ error: `AI Memory item with ID '${id}' not found.` });
    }

    res.json({ message: `AI Memory item '${id}' deleted successfully.`, success: true });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to delete AI memory item: ${err.message}` });
  }
});

// GET /api/memory/reports - Daily and Weekly summary reports
memoryRouter.get('/memory/reports', (req: Request, res: Response) => {
  try {
    const reports = getSummaryReports();
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate memory reports: ${err.message}` });
  }
});
