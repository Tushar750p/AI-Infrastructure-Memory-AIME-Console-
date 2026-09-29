import crypto from 'crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';

export interface KnowledgeGraphNode {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  source: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  organizationId: string;
  from: string;
  to: string;
  relation: string;
  source: string;
  confidence: number;
  evidenceEventIds: string[];
  createdAt: string;
}

function nodeId(org: string, source: string, resourceId: string) {
  return `node:${org}:${source}:${resourceId}`;
}

function edgeId(org: string, from: string, to: string, relation: string) {
  return 'edge:' + crypto.createHash('sha256')
    .update(`${org}|${from}|${to}|${relation}`)
    .digest('hex')
    .slice(0, 24);
}

function upsertNode(node: KnowledgeGraphNode) {
  const nodes = getCollectionData('knowledgeGraphNodes', []);
  const index = nodes.findIndex((n: any) => n.id === node.id && n.organizationId === node.organizationId);
  if (index >= 0) nodes[index] = { ...nodes[index], ...node };
  else nodes.unshift(node);
  setCollectionData('knowledgeGraphNodes', nodes.slice(0, 50000));
}

function upsertEdge(edge: KnowledgeGraphEdge) {
  const edges = getCollectionData('knowledgeGraphEdges', []);
  const index = edges.findIndex((e: any) => e.id === edge.id && e.organizationId === edge.organizationId);
  if (index >= 0) {
    edges[index] = {
      ...edges[index],
      evidenceEventIds: [...new Set([...(edges[index].evidenceEventIds || []), ...edge.evidenceEventIds])]
    };
  } else edges.unshift(edge);
  setCollectionData('knowledgeGraphEdges', edges.slice(0, 100000));
}

export function ingestEventIntoKnowledgeGraph(event: InfrastructureEvent): void {
  const resourceNode = nodeId(event.organizationId, event.source, event.resourceId);

  upsertNode({
    id: resourceNode,
    organizationId: event.organizationId,
    type: event.resourceType,
    name: event.resourceName || event.resourceId,
    source: event.source,
    resourceId: event.resourceId,
    metadata: {
      severity: event.severity,
      lastEventType: event.eventType,
      lastSeen: event.timestamp,
      isLive: event.isLive
    }
  });

  if (event.correlationId) {
    const correlationNode = nodeId(event.organizationId, 'correlation', event.correlationId);
    upsertNode({
      id: correlationNode,
      organizationId: event.organizationId,
      type: 'correlation',
      name: event.correlationId,
      source: 'aime',
      resourceId: event.correlationId
    });

    upsertEdge({
      id: edgeId(event.organizationId, resourceNode, correlationNode, 'participates_in'),
      organizationId: event.organizationId,
      from: resourceNode,
      to: correlationNode,
      relation: 'participates_in',
      source: 'event',
      confidence: 0.95,
      evidenceEventIds: [event.id],
      createdAt: new Date().toISOString()
    });
  }

  if (event.before !== undefined && event.after !== undefined) {
    const changeNode = nodeId(event.organizationId, 'change', event.id);
    upsertNode({
      id: changeNode,
      organizationId: event.organizationId,
      type: 'change',
      name: event.eventType,
      source: event.source,
      metadata: { before: event.before, after: event.after, timestamp: event.timestamp }
    });

    upsertEdge({
      id: edgeId(event.organizationId, resourceNode, changeNode, 'changed_by'),
      organizationId: event.organizationId,
      from: resourceNode,
      to: changeNode,
      relation: 'changed_by',
      source: 'event',
      confidence: 0.99,
      evidenceEventIds: [event.id],
      createdAt: new Date().toISOString()
    });
  }
}

export function buildKnowledgeGraph(organizationId: string): {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
} {
  const nodes = getCollectionData('knowledgeGraphNodes', [])
    .filter((n: any) => n.organizationId === organizationId);
  const edges = getCollectionData('knowledgeGraphEdges', [])
    .filter((e: any) => e.organizationId === organizationId);

  return { nodes, edges };
}

export function neighbors(organizationId: string, nodeIdValue: string, depth = 1) {
  const graph = buildKnowledgeGraph(organizationId);
  const visited = new Set([nodeIdValue]);
  let frontier = [nodeIdValue];

  for (let level = 0; level < Math.min(depth, 5); level++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.edges) {
        if (edge.from !== id && edge.to !== id) continue;
        const other = edge.from === id ? edge.to : edge.from;
        if (!visited.has(other)) {
          visited.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
  }

  return graph.nodes.filter(node => visited.has(node.id));
}
