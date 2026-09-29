import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Server, Layers, Clock, FileText, X, CornerDownLeft, 
  ArrowUp, ArrowDown, HelpCircle, Activity, Cpu, Database, 
  Terminal, Shield, Compass, Copy, Check, ExternalLink, Sliders, AlertTriangle
} from 'lucide-react';

import { LinuxServer, MemoryEvent, DockerContainer } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  servers: LinuxServer[];
  containers: DockerContainer[];
  events: MemoryEvent[];
  onNavigate: (tabId: string) => void;
}

// Structured high-quality SRE documentation articles
interface DocArticle {
  id: string;
  title: string;
  category: 'Documentation';
  summary: string;
  content: string;
  tags: string[];
  icon: React.ComponentType<any>;
}

const DOCUMENTATION_ARTICLES: DocArticle[] = [
  {
    id: 'doc-oom-redis',
    title: 'Resolving Redis Out of Memory (OOM) Constraints',
    category: 'Documentation',
    summary: 'Best practices for setting memory caps and eviction policies on Redis container hosts.',
    content: `### Redis OOM Prevention Guide

Redis instances running in containerized environments must have strict memory caps to prevent host kernel out-of-memory killer terminations.

1. **Configure Memory Limits in Docker-Compose**:
   Add the memory resource constraint to your service definition:
   \`\`\`yaml
   services:
     redis-cache:
       image: redis:7.0-alpine
       deploy:
         resources:
           limits:
             memory: 1g
   \`\`\`

2. **Set Redis Maxmemory Policy**:
   Mount a custom \`redis.conf\` or pass command line arguments to enforce the Least Recently Used (LRU) eviction policy when memory is full:
   \`\`\`bash
   redis-server --maxmemory 950mb --maxmemory-policy allkeys-lru
   \`\`\`

3. **Monitor Active Memory Diagnostics**:
   Inspect memory usage in real-time from the Docker tab or running:
   \`\`\`bash
   docker stats redis-cache
   \`\`\``,
    tags: ['redis', 'oom', 'memory', 'docker', 'crash', 'limits'],
    icon: Database
  },
  {
    id: 'doc-rds-scaling',
    title: 'RDS Postgres Storage Scaling & Terraform Lifecycle',
    category: 'Documentation',
    summary: 'How to scale RDS PostgreSQL storage capacity via Terraform without triggering unexpected restarts.',
    content: `### RDS Postgres Storage Expansion Protocol

Expanding RDS storage in Terraform is usually an online operation, but specific flags can cause service reboots.

1. **Verify Terraform Resource Definition**:
   In \`rds.tf\`, ensure storage parameters allow autoscaling and that \`apply_immediately\` is used with caution:
   \`\`\`hcl
   resource "aws_db_instance" "primary" {
     allocated_storage     = 500  # Expanded from 100
     max_allocated_storage = 1000 # Enables storage autoscaling
     apply_immediately     = true
   }
   \`\`\`

2. **Reboot Triggers**:
   Ensure that \`parameter_group_name\` modifications or change of DB engine parameters are NOT applied simultaneously, as these force a database restart.

3. **Post-Expansion Verification**:
   Query active metrics to confirm filesystems are expanded:
   \`\`\`sql
   SELECT df_allocated_size, df_free_space FROM system_metrics;
   \`\`\``,
    tags: ['rds', 'postgres', 'terraform', 'database', 'storage', 'scaling'],
    icon: Sliders
  },
  {
    id: 'doc-rollback-policy',
    title: 'Rollback Intelligence & Golden Deployments',
    category: 'Documentation',
    summary: 'Standard Operating Procedure (SOP) for rolling back to stable gold configurations.',
    content: `### Golden Rollback Protocol

When critical alerts trigger, restoring service via a known-good configuration (Golden Image) is the fastest resolution pathway.

1. **Identify Stable Target**:
   Access the **Rollbacks & Golden** workspace. Identify the most recent deployment tagged \`[GOLDEN]\`.

2. **Trigger Kubernetes/Docker Rollback**:
   To roll back an active container to a golden image:
   \`\`\`bash
   # For Kubernetes:
   kubectl rollout undo deployment/api-gateway
   
   # For Docker Engine:
   docker-compose -f docker-compose.prod.yml up -d --force-recreate <service-name>:<golden-tag>
   \`\`\`

3. **Verify Integrity Logs**:
   Compare the configuration checksums inside the **Time Machine** before and after applying the change to verify no configuration drift.`,
    tags: ['rollback', 'golden', 'deployment', 'sre', 'incident', 'stable'],
    icon: Shield
  },
  {
    id: 'doc-compliance-standards',
    title: 'Enterprise Trust & CIS Compliance Frameworks',
    category: 'Documentation',
    summary: 'Overview of security scanning, CIS hardening, and SOC2 report generations.',
    content: `### SRE Security & Compliance Hardening

AIME platforms are built to sustain continuous SOC2 Type II and ISO 27001 readiness.

1. **SSH Hardening**:
   - Standard SSH port must be changed from 22 (e.g., port 2222 on \`srv-docker-host\`).
   - Root login must be disabled in \`/etc/ssh/sshd_config\`.
   - Implement passwordless public-key authentication only.

2. **Vulnerability Assessment**:
   Run daily compliance reports via the **Compliance Reports** tab to catch outdated packages, unpatched Kernels, or exposed daemon sockets.

3. **Access Control**:
   Keep administrative credentials rotated. Revoke developer access badges instantly if credentials leak.`,
    tags: ['compliance', 'cis', 'security', 'ssh', 'hardening', 'soc2'],
    icon: Shield
  },
  {
    id: 'doc-slack-notifications',
    title: 'Slack & Teams Alert Hub Configuration',
    category: 'Documentation',
    summary: 'Step-by-step setup for webhook relays and notification channels.',
    content: `### Slack & Teams Integrations Setup

To route SRE incident telemetry to Slack channels or Microsoft Teams spaces:

1. **Provision Webhook**:
   - In Slack: Go to App Directory → Incoming Webhooks → Add to Slack.
   - Copy the webhook URL \`https://hooks.slack.example.com/services/... \`

2. **Configure Channel Mapping**:
   Navigate to the **Slack & Teams** tab inside the AIME Console, paste the webhook URL, and assign the critical level subscription toggles.

3. **Notification Thresholds**:
   - **Critical Alerts**: Instantly push with \`@here\` notifies.
   - **Warning Logs**: Accumulated and pushed as hourly digest summaries.`,
    tags: ['slack', 'teams', 'webhook', 'notifications', 'alerting', 'chat'],
    icon: Compass
  }
];

export default function GlobalSearch({
  isOpen,
  onClose,
  servers,
  containers,
  events,
  onNavigate
}: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'servers' | 'containers' | 'events' | 'docs'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount/open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle global shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Unified items structure
  const searchItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'server' | 'container' | 'event' | 'doc';
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      icon: React.ComponentType<any>;
      originalData: any;
    }> = [];

    // 1. Map Servers
    servers.forEach(s => {
      items.push({
        id: s.id,
        type: 'server',
        title: s.name,
        subtitle: `IP: ${s.ip} | OS: ${s.os} | Provider: ${s.provider}`,
        badge: s.status.toUpperCase(),
        badgeColor: s.status === 'healthy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    s.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20',
        icon: Server,
        originalData: s
      });
    });

    // 2. Map Containers
    containers.forEach(c => {
      const parentSrv = servers.find(s => s.id === c.serverId);
      const hostName = parentSrv ? parentSrv.name : 'srv-docker-host';
      items.push({
        id: c.id,
        type: 'container',
        title: c.name,
        subtitle: `Image: ${c.image} | Host: ${hostName}`,
        badge: c.status.toUpperCase(),
        badgeColor: c.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'restarting' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        icon: Layers,
        originalData: c
      });
    });

    // 3. Map Events
    events.forEach(e => {
      items.push({
        id: e.id,
        type: 'event',
        title: e.message,
        subtitle: `User: ${e.user || 'SRE Engine'} | Server: ${e.serverName || 'System'} | ID: ${e.id}`,
        badge: (e.type || 'EVENT').toUpperCase(),
        badgeColor: e.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    e.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        icon: Clock,
        originalData: e
      });
    });

    // 4. Map Docs
    DOCUMENTATION_ARTICLES.forEach(doc => {
      items.push({
        id: doc.id,
        type: 'doc',
        title: doc.title,
        subtitle: doc.summary,
        badge: 'DOCS',
        badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        icon: doc.icon,
        originalData: doc
      });
    });

    return items;
  }, [servers, containers, events]);

  // Filter items based on active tab and query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return searchItems.filter(item => {
      // Filter by category
      if (activeTab === 'servers' && item.type !== 'server') return false;
      if (activeTab === 'containers' && item.type !== 'container') return false;
      if (activeTab === 'events' && item.type !== 'event') return false;
      if (activeTab === 'docs' && item.type !== 'doc') return false;

      if (!query) return true;

      // Match logic
      const titleMatch = item.title.toLowerCase().includes(query);
      const subtitleMatch = item.subtitle.toLowerCase().includes(query);
      const idMatch = item.id.toLowerCase().includes(query);
      
      let tagMatch = false;
      if (item.type === 'doc') {
        const doc = item.originalData as DocArticle;
        tagMatch = doc.tags.some(t => t.toLowerCase().includes(query));
      }

      return titleMatch || subtitleMatch || idMatch || tagMatch;
    });
  }, [searchItems, searchQuery, activeTab]);

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeTab]);

  // Scroll into view helper
  const scrollItemIntoView = (index: number) => {
    const listNode = listRef.current;
    if (!listNode) return;
    const itemNode = listNode.children[index] as HTMLElement;
    if (!itemNode) return;

    const listScrollTop = listNode.scrollTop;
    const listHeight = listNode.clientHeight;
    const itemOffsetTop = itemNode.offsetTop;
    const itemHeight = itemNode.clientHeight;

    if (itemOffsetTop < listScrollTop) {
      listNode.scrollTop = itemOffsetTop;
    } else if (itemOffsetTop + itemHeight > listScrollTop + listHeight) {
      listNode.scrollTop = itemOffsetTop + itemHeight - listHeight;
    }
  };

  const currentSelectedItem = filteredItems[selectedIndex];

  // Handle keys for navigating list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const next = prev < filteredItems.length - 1 ? prev + 1 : 0;
        setTimeout(() => scrollItemIntoView(next), 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredItems.length - 1;
        setTimeout(() => scrollItemIntoView(next), 0);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentSelectedItem) {
        handleActionClick(currentSelectedItem);
      }
    }
  };

  const handleActionClick = (item: typeof searchItems[0]) => {
    if (item.type === 'server') {
      onNavigate('servers');
    } else if (item.type === 'container') {
      onNavigate('docker');
    } else if (item.type === 'event') {
      onNavigate('memory');
    } else if (item.type === 'doc') {
      // Stay on modal but display detailed article
    }
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="global-search-portal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 select-none print:hidden"
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div 
        id="global-search-container"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-4xl h-[560px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-300"
      >
        {/* Header Search Box */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
          <Search className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          <input
            id="global-search-input"
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search servers, docker engines, syslog events, guides... (use ↑↓ to browse)"
            className="w-full bg-transparent border-0 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-0 focus:outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 uppercase tracking-wider transition-colors cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/60 overflow-x-auto scrollbar-none">
          {(['all', 'servers', 'containers', 'events', 'docs'] as const).map(tab => (
            <button
              key={tab}
              id={`search-tab-filter-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-xs font-medium tracking-wide capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab === 'all' ? 'All Results' : tab === 'docs' ? 'Documentation' : tab}
            </button>
          ))}
          <div className="ml-auto text-[10px] font-mono text-zinc-500 hidden sm:block">
            Found {filteredItems.length} records
          </div>
        </div>

        {/* Content Body: Split Panel */}
        <div className="flex-1 flex min-h-0 bg-zinc-900/40">
          {/* Left Results List */}
          <div className="w-full md:w-1/2 flex flex-col border-r border-zinc-800/60 h-full">
            <div 
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-zinc-500">
                  <HelpCircle className="w-8 h-8 mb-3 text-zinc-600 stroke-[1.5]" />
                  <p className="text-xs font-medium text-zinc-400">No matches found for "{searchQuery}"</p>
                  <p className="text-[10px] text-zinc-600 mt-1 max-w-[250px] text-center font-mono">
                    Try simpler terms like "nginx", "redis", "OOM", "Tushar", or "storage".
                  </p>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      id={`search-item-${item.type}-${item.id}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleActionClick(item)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-zinc-800/90 border-indigo-500/40 text-white shadow-lg shadow-indigo-950/10'
                          : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800/30'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate block">{item.title}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate block mt-0.5">{item.subtitle}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Details Inspect Panel */}
          <div className="hidden md:flex md:w-1/2 flex-col h-full bg-zinc-950/30 overflow-y-auto p-4 scrollbar-thin">
            {currentSelectedItem ? (
              <div className="flex flex-col h-full">
                {/* Header info */}
                <div className="border-b border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">
                      {currentSelectedItem.type} parameters
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">ID: {currentSelectedItem.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{currentSelectedItem.title}</h3>
                </div>

                {/* Dynamic Content depending on type */}
                <div className="flex-1 min-h-0 text-xs text-zinc-300">
                  {currentSelectedItem.type === 'server' && (() => {
                    const s = currentSelectedItem.originalData as LinuxServer;
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">IP Address</span>
                            <span className="font-mono text-xs text-zinc-200">{s.ip}</span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Uptime</span>
                            <span className="text-xs text-zinc-200">{s.uptime}</span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Cloud Provider</span>
                            <span className="text-xs text-zinc-200">{s.provider}</span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Region Zone</span>
                            <span className="text-xs text-zinc-200 font-mono">{s.region}</span>
                          </div>
                        </div>

                        {/* Real-time Hardware Metrics meters */}
                        <div className="space-y-2.5 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/40">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <Activity className="w-3 h-3 text-indigo-400" />
                            Hardware utilization
                          </h4>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1 font-mono">
                              <span className="text-zinc-500">CPU Usage</span>
                              <span className={(Number(s.cpu) || 0) > 80 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{Number(s.cpu) || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${(Number(s.cpu) || 0) > 80 ? 'bg-red-500' : (Number(s.cpu) || 0) > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, Number(s.cpu) || 0))}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1 font-mono">
                              <span className="text-zinc-500">RAM Allocation</span>
                              <span className={(Number(s.ram) || 0) > 80 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{Number(s.ram) || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${(Number(s.ram) || 0) > 80 ? 'bg-red-500' : (Number(s.ram) || 0) > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, Number(s.ram) || 0))}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1 font-mono">
                              <span className="text-zinc-500">Disk Partition</span>
                              <span className="text-zinc-300">{Number(s.disk) || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, Number(s.disk) || 0))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Connection configuration */}
                        <div className="bg-zinc-950/80 p-3 rounded font-mono text-[10px] text-zinc-400 border border-zinc-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-zinc-500">Credential string:</span>
                            <button
                              onClick={() => handleCopyToClipboard(`ssh -p ${s.sshPort} ${s.sshUser}@${s.ip}`, s.id)}
                              className="text-[9px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === s.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              Copy
                            </button>
                          </div>
                          <div className="bg-zinc-900 p-1.5 rounded select-all text-zinc-300 overflow-x-auto whitespace-nowrap scrollbar-none">
                            ssh -p {s.sshPort} {s.sshUser}@{s.ip}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {currentSelectedItem.type === 'container' && (() => {
                    const c = currentSelectedItem.originalData as DockerContainer;
                    const parentSrv = servers.find(s => s.id === c.serverId);
                    const hostName = parentSrv ? parentSrv.name : 'srv-docker-host';
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Status</span>
                            <span className={`text-xs font-bold font-mono capitalize ${c.status === 'running' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                              ● {c.status}
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Restarts</span>
                            <span className={`text-xs font-mono ${c.restarts > 5 ? 'text-red-400 font-bold' : 'text-zinc-200'}`}>
                              {c.restarts} count
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60 col-span-2">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Image tag</span>
                            <span className="text-xs text-zinc-200 font-mono break-all">{c.image}</span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60 col-span-2">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">SRE Host Server Name</span>
                            <span className="text-xs text-zinc-200 font-mono flex items-center gap-1.5">
                              <Server className="w-3 h-3 text-zinc-400" />
                              {hostName}
                            </span>
                          </div>
                        </div>

                        {/* Simulated resource bounds */}
                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/40 font-mono text-[11px] text-zinc-400 space-y-2">
                          <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                            <span>Cpu Shares Limit:</span>
                            <span className="text-zinc-200">1024</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                            <span>Memory Constraint:</span>
                            <span className="text-zinc-200">1024 MB</span>
                          </div>
                          <div className="flex justify-between pb-0.5">
                            <span>Network Node Port:</span>
                            <span className="text-zinc-200">0.0.0.0:6379</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {currentSelectedItem.type === 'event' && (() => {
                    const e = currentSelectedItem.originalData as MemoryEvent;
                    return (
                      <div className="space-y-3.5">
                        <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60 space-y-2.5">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 block">Operational Message</span>
                            <span className="text-xs text-white font-medium">{e.message}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-zinc-500">Operator:</span>
                              <span className="text-zinc-300 block font-semibold">@{e.user || 'SRE Engine'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Team:</span>
                              <span className="text-zinc-300 block font-semibold">{e.team || 'Automation'}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-zinc-500">Type classification:</span>
                              <span className="text-zinc-300 block font-mono capitalize">{e.type}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-zinc-500">Environment:</span>
                              <span className="text-indigo-400 block font-mono">{e.environment || 'Production'}</span>
                            </div>
                          </div>
                        </div>

                        {e.changeReason && (
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60 text-[11px]">
                            <span className="text-[10px] font-mono text-zinc-500 block mb-0.5">Operational Reason</span>
                            <p className="text-zinc-300 leading-normal">{e.changeReason}</p>
                          </div>
                        )}

                        {e.commitId && (
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/60 font-mono text-[10px] space-y-1 text-zinc-400">
                            <div className="flex justify-between">
                              <span>Git Commit ID:</span>
                              <span className="text-zinc-200 font-bold">{e.commitId}</span>
                            </div>
                            {e.gitBranch && (
                              <div className="flex justify-between">
                                <span>Git Branch:</span>
                                <span className="text-zinc-400">{e.gitBranch}</span>
                              </div>
                            )}
                            {e.pullRequest && (
                              <div className="flex justify-between">
                                <span>Pull Request Ref:</span>
                                <span className="text-indigo-400 font-bold">{e.pullRequest}</span>
                              </div>
                            )}
                            {e.jiraTicket && (
                              <div className="flex justify-between">
                                <span>Jira Ticket ID:</span>
                                <span className="text-amber-400 font-semibold">{e.jiraTicket}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {currentSelectedItem.type === 'doc' && (() => {
                    const doc = currentSelectedItem.originalData as DocArticle;
                    return (
                      <div className="space-y-3.5 pr-1">
                        <div className="text-[11px] prose prose-invert max-w-none text-zinc-300 leading-relaxed font-sans select-text">
                          {/* Crude custom renderer to skip installing md packages for simple inline code */}
                          {doc.content.split('\n').map((line, lIdx) => {
                            if (line.startsWith('###')) {
                              return <h4 key={lIdx} className="text-xs font-bold text-white mt-4 mb-2 tracking-tight">{line.replace('###', '').trim()}</h4>;
                            }
                            if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
                              return <p key={lIdx} className="font-bold text-zinc-200 mt-2.5 mb-1 text-[11px]">{line}</p>;
                            }
                            if (line.startsWith('-')) {
                              return <li key={lIdx} className="ml-3 list-disc text-zinc-400 my-0.5">{line.replace('-', '').trim()}</li>;
                            }
                            if (line.startsWith('\`\`\`')) {
                              return null; // strip block wrappers
                            }
                            if (line.includes('  ')) {
                              return <pre key={lIdx} className="bg-zinc-950 p-2 rounded text-[10px] font-mono text-indigo-300 my-1.5 overflow-x-auto whitespace-pre">{line}</pre>;
                            }
                            return <p key={lIdx} className="mb-2 text-[11px]">{line}</p>;
                          })}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800/60">
                          {doc.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-mono bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom navigation link button */}
                {currentSelectedItem.type !== 'doc' && (
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => handleActionClick(currentSelectedItem)}
                      className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Inspect in Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
                <Compass className="w-10 h-10 mb-3 stroke-[1.2] text-zinc-700" />
                <p className="text-xs">No item selected</p>
                <p className="text-[10px] font-mono mt-1">Select an index from the results grid</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts guide */}
        <div className="h-10 border-t border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">↑↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">esc</kbd>
              to exit
            </span>
          </div>
          <div className="hidden sm:block">
            SRE Core Diagnostics Terminal
          </div>
        </div>
      </motion.div>
    </div>
  );
}
