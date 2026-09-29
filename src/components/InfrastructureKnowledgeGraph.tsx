import React, { useState } from 'react';
import { 
  Network, Search, Server, Shield, Layers, HelpCircle, 
  Info, Cpu, Database, Cloud, Radio, Activity, Link2, Sparkles
} from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'cloud' | 'lb' | 'sg' | 'vm' | 'k8s' | 'pod' | 'db' | 'cache';
  status: 'healthy' | 'warning' | 'critical';
  details: {
    ip?: string;
    role?: string;
    provider?: string;
    region?: string;
    ports?: string;
    metric?: string;
    description: string;
    connections: string[];
  };
}

const NODES_DATA: Node[] = [
  {
    id: 'aws-vpc',
    label: 'AWS VPC (10.0.0.0/16)',
    type: 'cloud',
    status: 'healthy',
    details: {
      provider: 'Amazon Web Services',
      region: 'us-east-1',
      description: 'Primary corporate VPC for production web apps, databases, and microservices.',
      connections: ['lb-ingress', 'sg-web', 'sg-db']
    }
  },
  {
    id: 'lb-ingress',
    label: 'AWS ALBs Ingress',
    type: 'lb',
    status: 'healthy',
    details: {
      ports: '80, 443',
      metric: '3.4k request/sec',
      description: 'Public elastic load balancer routing HTTPS sessions to EC2 server instances and EKS endpoints.',
      connections: ['srv-nginx-prod', 'k8s-ingress']
    }
  },
  {
    id: 'sg-web',
    label: 'SG SecurityGroup-Web',
    type: 'sg',
    status: 'healthy',
    details: {
      ports: '22, 80, 443',
      description: 'Firewall rules allowing external web traffic and internal maintenance SSH tunnels.',
      connections: ['srv-nginx-prod', 'srv-docker-host']
    }
  },
  {
    id: 'srv-nginx-prod',
    label: 'srv-nginx-prod (EC2)',
    type: 'vm',
    status: 'healthy',
    details: {
      ip: '10.0.1.12',
      metric: 'CPU: 28% | RAM: 44%',
      description: 'Primary Nginx proxy host serving as reverse-proxy and gateway coordinator.',
      connections: ['srv-docker-host', 'sg-db']
    }
  },
  {
    id: 'srv-docker-host',
    label: 'srv-docker-host (Droplet)',
    type: 'vm',
    status: 'warning',
    details: {
      ip: '10.0.1.45',
      metric: 'CPU: 65% | RAM: 78%',
      description: 'Primary Docker container runtime host hosting Redis, microservices, and Prometheus.',
      connections: ['redis-cache', 'node-api-server']
    }
  },
  {
    id: 'redis-cache',
    label: 'redis-cache (Docker)',
    type: 'cache',
    status: 'healthy',
    details: {
      ports: '6379',
      metric: 'Hit Rate: 94.2%',
      description: 'Redis in-memory caching engine used for session state and fast telemetry caching.',
      connections: ['node-api-server']
    }
  },
  {
    id: 'node-api-server',
    label: 'node-api-server (Docker)',
    type: 'pod',
    status: 'healthy',
    details: {
      ports: '8080',
      metric: '142 req/sec',
      description: 'Fast Node.js application API microservice processing database transactions.',
      connections: ['sg-db']
    }
  },
  {
    id: 'sg-db',
    label: 'SG SecurityGroup-DB',
    type: 'sg',
    status: 'warning',
    details: {
      ports: '5432 (0.0.0.0/0 allowed)',
      description: 'Access policies guarding persistent database layers. Currently shows security warning.',
      connections: ['srv-db-primary']
    }
  },
  {
    id: 'srv-db-primary',
    label: 'srv-db-primary (EC2)',
    type: 'db',
    status: 'critical',
    details: {
      ip: '10.0.2.10',
      metric: 'Disk: 92% (CRITICAL)',
      description: 'Red Hat Enterprise hosting our primary PostgreSQL relational transactional database.',
      connections: []
    }
  },
  {
    id: 'k8s-ingress',
    label: 'EKS Kubernetes Ingress',
    type: 'lb',
    status: 'healthy',
    details: {
      ports: '80:31080, 443:31443',
      description: 'Kubernetes ingress controller load balancer dividing traffic into EKS node namespaces.',
      connections: ['k8s-node-01', 'k8s-node-02']
    }
  },
  {
    id: 'k8s-node-01',
    label: 'k8s-node-01 (EKS Node)',
    type: 'k8s',
    status: 'healthy',
    details: {
      ip: '10.0.3.101',
      metric: 'Ready | Allocatable: 4 vCPU, 16GB',
      description: 'Primary worker node hosting our frontends, telemetry agents, and auth microservices.',
      connections: ['pod-auth-svc', 'pod-frontend']
    }
  },
  {
    id: 'k8s-node-02',
    label: 'k8s-node-02 (EKS Node)',
    type: 'k8s',
    status: 'healthy',
    details: {
      ip: '10.0.3.102',
      metric: 'Ready | Allocatable: 4 vCPU, 16GB',
      description: 'Secondary worker node handling core payment gateways and high resource logging clusters.',
      connections: ['pod-payment-gateway', 'pod-elasticsearch']
    }
  },
  {
    id: 'pod-auth-svc',
    label: 'auth-service (K8s Pod)',
    type: 'pod',
    status: 'healthy',
    details: {
      metric: '2 replicas | CPU: 85m',
      description: 'Kubernetes microservice validating user access and session tokens.',
      connections: ['srv-db-primary']
    }
  },
  {
    id: 'pod-frontend',
    label: 'frontend-portal (K8s Pod)',
    type: 'pod',
    status: 'healthy',
    details: {
      metric: '3 replicas | CPU: 210m',
      description: 'React client portal rendering SaaS interface for incoming user sessions.',
      connections: ['pod-auth-svc']
    }
  },
  {
    id: 'pod-payment-gateway',
    label: 'payment-gateway (K8s Pod)',
    type: 'pod',
    status: 'healthy',
    details: {
      metric: '2 replicas | CPU: 140m',
      description: 'Highly secure microservice integrating Stripe and recurring SaaS subscription controllers.',
      connections: ['srv-db-primary']
    }
  },
  {
    id: 'pod-elasticsearch',
    label: 'elasticsearch-cluster (K8s)',
    type: 'db',
    status: 'healthy',
    details: {
      metric: '1.2 vCPU | 3.4 GiB RAM',
      description: 'Distributed document database storing syslog structures and developer console history.',
      connections: []
    }
  }
];

export default function InfrastructureKnowledgeGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('aws-vpc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeConnectionsOnly, setActiveConnectionsOnly] = useState<boolean>(true);

  const selectedNode = NODES_DATA.find(n => n.id === selectedNodeId) || NODES_DATA[0];

  const filteredNodes = NODES_DATA.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          node.details.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  });

  const getNodeColor = (status: 'healthy' | 'warning' | 'critical', isSelected: boolean) => {
    if (isSelected) return 'stroke-indigo-500 stroke-[3] drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]';
    if (status === 'critical') return 'stroke-red-500 stroke-[2]';
    if (status === 'warning') return 'stroke-amber-500 stroke-[2]';
    return 'stroke-emerald-500 stroke-[1.5]';
  };

  const getNodeFill = (status: 'healthy' | 'warning' | 'critical') => {
    if (status === 'critical') return 'bg-red-950/40 border-red-500 text-red-400';
    if (status === 'warning') return 'bg-amber-950/40 border-amber-500 text-amber-400';
    return 'bg-emerald-950/40 border-emerald-500 text-emerald-400';
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'cloud': return <Cloud className="w-4 h-4" />;
      case 'lb': return <Radio className="w-4 h-4" />;
      case 'sg': return <Shield className="w-4 h-4" />;
      case 'vm': return <Server className="w-4 h-4" />;
      case 'k8s': return <Cpu className="w-4 h-4" />;
      case 'pod': return <Layers className="w-4 h-4" />;
      case 'db': return <Database className="w-4 h-4" />;
      case 'cache': return <Database className="w-4 h-4 text-cyan-400" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5.5 h-5.5 text-indigo-400" />
            Infrastructure Connected Knowledge Graph
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visual map of cloud topology. Understand exact mappings of ingress controllers, firewall policies, virtual hosts, and clustered pods to pinpoint failure propagation vectors.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={activeConnectionsOnly} 
              onChange={() => setActiveConnectionsOnly(!activeConnectionsOnly)}
              className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0"
            />
            Highlight Traffic Channels
          </label>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Topology Search & Nodes Directory */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-3">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Search Node Directory</h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-mono">FILTER BY TYPE:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded text-[11px] py-1 px-1.5 text-zinc-400 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">ALL SERVICES</option>
                <option value="cloud">CLOUD INSTANCES</option>
                <option value="lb">LOAD BALANCERS</option>
                <option value="sg">SECURITY GROUPS</option>
                <option value="vm">LINUX HOSTS (VM)</option>
                <option value="k8s">K8S NODES</option>
                <option value="pod">MICROSERVICE PODS</option>
                <option value="db">DATABASES</option>
              </select>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-950 max-h-[350px] overflow-y-auto space-y-1">
            {filteredNodes.map((node) => (
              <button
                key={node.id}
                id={`node-dir-${node.id}`}
                onClick={() => setSelectedNodeId(node.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded text-xs transition-all text-left cursor-pointer ${
                  selectedNodeId === node.id
                    ? 'bg-indigo-950/20 text-white font-medium border border-indigo-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  node.status === 'healthy' 
                    ? 'bg-emerald-400' 
                    : node.status === 'warning' 
                      ? 'bg-amber-400' 
                      : 'bg-red-400'
                }`} />
                <span className="truncate">{node.label}</span>
                <span className="ml-auto text-[9px] font-mono uppercase text-zinc-600">{node.type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center column: Beautiful Interactive Connected Layout Mapping */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-zinc-900 bg-zinc-950/80 flex flex-col justify-between min-h-[480px]">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" /> Live Topology Mapping
            </span>
            <span className="text-[10px] font-mono text-zinc-600">Click nodes to query active metadata</span>
          </div>

          {/* Connected Grid Layout */}
          <div className="my-6 grid grid-cols-3 gap-y-10 gap-x-6 relative py-4">
            {/* AWS Cloud VPC Root - Row 1 */}
            <div className="col-span-3 flex justify-center">
              <button
                id="tg-node-aws-vpc"
                onClick={() => setSelectedNodeId('aws-vpc')}
                className={`px-4 py-2.5 rounded-lg border font-mono text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  selectedNodeId === 'aws-vpc' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Cloud className="w-4 h-4 text-indigo-400" />
                AWS VPC Corporate (10.0.0.0/16)
              </button>
            </div>

            {/* Load balancers - Row 2 */}
            <div className="col-span-3 flex justify-around">
              <button
                id="tg-node-lb-ingress"
                onClick={() => setSelectedNodeId('lb-ingress')}
                className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedNodeId === 'lb-ingress' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                AWS ALB Ingress
              </button>

              <button
                id="tg-node-k8s-ingress"
                onClick={() => setSelectedNodeId('k8s-ingress')}
                className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedNodeId === 'k8s-ingress' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                EKS ALB Ingress
              </button>
            </div>

            {/* Compute Hosts - Row 3 */}
            <div className="col-span-3 flex justify-between gap-2 px-2">
              <button
                id="tg-node-srv-nginx-prod"
                onClick={() => setSelectedNodeId('srv-nginx-prod')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer w-28 ${
                  selectedNodeId === 'srv-nginx-prod' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Server className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-bold">srv-nginx-prod</span>
                <span className="text-[8px] font-mono text-zinc-500">10.0.1.12</span>
              </button>

              <button
                id="tg-node-srv-docker-host"
                onClick={() => setSelectedNodeId('srv-docker-host')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer w-28 ${
                  selectedNodeId === 'srv-docker-host' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Server className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-bold">srv-docker-host</span>
                <span className="text-[8px] font-mono text-zinc-500">10.0.1.45</span>
              </button>

              <button
                id="tg-node-k8s-node-01"
                onClick={() => setSelectedNodeId('k8s-node-01')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer w-28 ${
                  selectedNodeId === 'k8s-node-01' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-bold">k8s-node-01</span>
                <span className="text-[8px] font-mono text-zinc-500">10.0.3.101</span>
              </button>
            </div>

            {/* Docker Containers & Pods - Row 4 */}
            <div className="col-span-3 flex justify-around">
              <button
                id="tg-node-redis-cache"
                onClick={() => setSelectedNodeId('redis-cache')}
                className={`p-2.5 rounded-lg border font-mono text-[9px] flex items-center gap-1 transition-all cursor-pointer ${
                  selectedNodeId === 'redis-cache' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300' 
                    : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                redis-cache
              </button>

              <button
                id="tg-node-pod-auth-svc"
                onClick={() => setSelectedNodeId('pod-auth-svc')}
                className={`p-2.5 rounded-lg border font-mono text-[9px] flex items-center gap-1 transition-all cursor-pointer ${
                  selectedNodeId === 'pod-auth-svc' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300' 
                    : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                auth-service-pod
              </button>

              <button
                id="tg-node-pod-frontend"
                onClick={() => setSelectedNodeId('pod-frontend')}
                className={`p-2.5 rounded-lg border font-mono text-[9px] flex items-center gap-1 transition-all cursor-pointer ${
                  selectedNodeId === 'pod-frontend' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300' 
                    : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                frontend-portal
              </button>
            </div>

            {/* Relational Databases - Row 5 */}
            <div className="col-span-3 flex justify-center gap-10">
              <button
                id="tg-node-srv-db-primary"
                onClick={() => setSelectedNodeId('srv-db-primary')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer w-32 ${
                  selectedNodeId === 'srv-db-primary' 
                    ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 ring-1 ring-indigo-500/20' 
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <Database className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="text-[10px] font-bold">srv-db-primary</span>
                <span className="text-[8px] font-mono text-zinc-500">Postgres (10.0.2.10)</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-zinc-900/40 rounded border border-zinc-900 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <p className="text-[10px] text-zinc-500 leading-normal">
              AIME SRE daemon monitors kernel network interfaces continuously. Active TCP routes are dynamically remapped when routes transition status indicators.
            </p>
          </div>
        </div>

        {/* Right column: Selected Node Metadata Inspector Panel */}
        <div className="lg:col-span-1">
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Metadata Inspector</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase ${getNodeFill(selectedNode.status)}`}>
                  {selectedNode.status}
                </span>
              </div>

              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-tight">{selectedNode.label}</h3>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">{selectedNode.type} resource</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-3">
                {selectedNode.details.description}
              </p>

              <div className="space-y-2.5 pt-3 border-t border-zinc-900 text-[11px] font-mono text-zinc-400">
                {selectedNode.details.ip && (
                  <div>
                    <span className="text-zinc-600 block text-[9px] uppercase">IP Address:</span>
                    <span className="text-zinc-300">{selectedNode.details.ip}</span>
                  </div>
                )}
                {selectedNode.details.ports && (
                  <div>
                    <span className="text-zinc-600 block text-[9px] uppercase">Open Ports:</span>
                    <span className="text-zinc-300">{selectedNode.details.ports}</span>
                  </div>
                )}
                {selectedNode.details.metric && (
                  <div>
                    <span className="text-zinc-600 block text-[9px] uppercase">Performance Metric:</span>
                    <span className="text-indigo-400 font-bold">{selectedNode.details.metric}</span>
                  </div>
                )}
                {selectedNode.details.region && (
                  <div>
                    <span className="text-zinc-600 block text-[9px] uppercase">Cloud Region:</span>
                    <span className="text-zinc-300">{selectedNode.details.region}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Connection relations mapper */}
            <div className="mt-5 pt-3 border-t border-zinc-900 space-y-2.5">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">CONNECTED TO:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.details.connections.length > 0 ? (
                  selectedNode.details.connections.map((connId) => {
                    const matchedNode = NODES_DATA.find(n => n.id === connId);
                    return (
                      <button
                        key={connId}
                        id={`conn-badge-${connId}`}
                        onClick={() => setSelectedNodeId(connId)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Link2 className="w-3 h-3 text-zinc-500" />
                        {matchedNode ? matchedNode.label.split(' ')[0] : connId}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-zinc-600 font-mono">No downstream connections</span>
                )}
              </div>

              {selectedNode.status !== 'healthy' && (
                <div className="p-3 rounded bg-red-950/15 border border-red-500/20 mt-3">
                  <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" /> AI Root Cause correlation
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed mt-1 font-sans">
                    Incident detected on downstream DB cluster srv-db-primary (92% PG WAL Disk space). Check database replica synchronizations immediately.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
