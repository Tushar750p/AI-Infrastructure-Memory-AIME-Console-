import React, { useState, useEffect } from 'react';
import { 
  Search, Terminal, ShieldAlert, Cpu, Settings, CheckCircle2, 
  AlertTriangle, Play, Sparkles, ChevronDown, ChevronUp, 
  RefreshCw, BarChart2, Eye, GitCommit, UserCheck, Heart, 
  Trash2, Layers, HelpCircle, AlertCircle, ArrowRight, CornerDownRight 
} from 'lucide-react';
import { MemoryEvent, LinuxServer } from '../types';

interface MemoryTimelineProps {
  events: MemoryEvent[];
  servers: LinuxServer[];
  onSelectEventForAnalysis: (event: MemoryEvent) => void;
  onAddMemoryEvent: (event: MemoryEvent) => void;
  onUpdateMemoryEvent?: (id: string, updatedFields: Partial<MemoryEvent>) => void;
  operatorUsername?: string;
  onClearAllEvents?: () => void;
}

export default function MemoryTimeline({ 
  events, 
  servers, 
  onSelectEventForAnalysis, 
  onAddMemoryEvent,
  onUpdateMemoryEvent,
  operatorUsername,
  onClearAllEvents 
}: MemoryTimelineProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'timeline' | 'servers' | 'commands' | 'root_cause' | 'simulation'>('dashboard');
  
  // Local edit states for change attribution & notes
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    user: '',
    team: '',
    changeReason: '',
    commitId: '',
    terraformApplyId: '',
    gitBranch: '',
    pullRequest: '',
    jiraTicket: '',
    environment: 'Production' as 'Dev' | 'QA' | 'Production',
    editableNote: ''
  });

  const startEditingEvent = (event: MemoryEvent) => {
    setEditingEventId(event.id);
    setEditForm({
      user: event.user || '',
      team: event.team || '',
      changeReason: event.changeReason || '',
      commitId: event.commitId || '',
      terraformApplyId: event.terraformApplyId || '',
      gitBranch: event.gitBranch || '',
      pullRequest: event.pullRequest || '',
      jiraTicket: event.jiraTicket || '',
      environment: event.environment || 'Production',
      editableNote: event.editableNote || ''
    });
  };

  const saveEditedEvent = (eventId: string) => {
    if (onUpdateMemoryEvent) {
      onUpdateMemoryEvent(eventId, editForm);
    }
    setEditingEventId(null);
  };
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Simulation Form states
  const [simServerId, setSimServerId] = useState(servers[0]?.id || '');
  const [simOperator, setSimOperator] = useState(operatorUsername || 'devops_alex');
  const [simDetails, setSimDetails] = useState('');

  // Deployments state (with rollback toggle stored in localStorage to persist rollback status)
  const [rollbackStatus, setRollbackStatus] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem('aime_rollbacks');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('aime_rollbacks', JSON.stringify(rollbackStatus));
  }, [rollbackStatus]);

  const handleToggleRollback = (eventId: string) => {
    setRollbackStatus(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
    
    // Add a memory event documenting the rollback action!
    const originalEvent = events.find(e => e.id === eventId);
    if (originalEvent) {
      const isRollingBack = !rollbackStatus[eventId];
      const rollbackEvent: MemoryEvent = {
        id: `evt-rollback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        serverId: originalEvent.serverId,
        serverName: originalEvent.serverName,
        type: 'fix',
        message: isRollingBack 
          ? `Rollback triggered for deployment on ${originalEvent.serverName}` 
          : `Rollback reverted for deployment on ${originalEvent.serverName}`,
        user: operatorUsername || 'devops_alex',
        details: `SRE operator requested a rollback state change. Deployment version ${originalEvent.details?.match(/v\d+\.\d+\.\d+/) || 'unknown'} has been marked as ${isRollingBack ? 'ROLLED BACK' : 'ACTIVE'}.`,
        category: originalEvent.category || 'deployment',
        severity: 'healthy'
      };
      onAddMemoryEvent(rollbackEvent);
    }
  };

  // Pre-configured Quick SRE Memory queries
  const handleQuickSearch = (query: string, filterType = 'all', filterCat = 'all') => {
    setSearchTerm(query);
    setSelectedType(filterType);
    setSelectedCategory(filterCat);
    setActiveSubTab('timeline');
  };

  // Filter events logic
  const filteredEvents = events.filter((e) => {
    const matchesSearch = 
      e.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.serverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.details && e.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'all' || e.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesServer = selectedServerId === 'all' || e.serverId === selectedServerId;

    return matchesSearch && matchesType && matchesCategory && matchesServer;
  });

  // Calculate Memory Dashboard KPIs
  const totalIncidents = events.filter(e => e.type === 'incident' || e.type === 'error').length;
  
  // Repeated Incidents: Count of incidents that have occurred more than once with identical/similar messages
  const incidentMessages = events.filter(e => e.type === 'incident').map(e => e.message);
  const repeatedCount = incidentMessages.reduce((acc, msg) => {
    const dups = incidentMessages.filter(m => m.toLowerCase().includes(msg.toLowerCase()) || msg.toLowerCase().includes(m.toLowerCase()));
    if (dups.length > 1) {
      acc.add(msg);
    }
    return acc;
  }, new Set<string>()).size;

  const recurringErrors = events.filter(e => e.type === 'error').reduce((acc, err) => {
    const dups = events.filter(e2 => e2.type === 'error' && e2.message.toLowerCase().includes(err.message.toLowerCase()));
    if (dups.length > 1) {
      acc.add(err.message);
    }
    return acc;
  }, new Set<string>()).size;

  // Top Engineers (operators with the most registered fixes or configs)
  const engineerFixCounts = events.reduce((acc: { [key: string]: number }, event) => {
    if (event.user && !event.user.includes('bot')) {
      acc[event.user] = (acc[event.user] || 0) + 1;
    }
    return acc;
  }, {});
  const topEngineers = Object.entries(engineerFixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  // Most Common Fixes
  const fixCounts = events.filter(e => e.type === 'fix').reduce((acc: { [key: string]: number }, event) => {
    const cleanMsg = event.message.split(' - ')[0]; // Group by general message prefix
    acc[cleanMsg] = (acc[cleanMsg] || 0) + 1;
    return acc;
  }, {});
  const commonFixes = Object.entries(fixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([fix, count]) => ({ fix, count }));

  // SRE Infrastructure Health Score calculation
  // Base 100, subtract 15 for each active/critical unresolved incident, 5 for warning, etc.
  const activeCriticalIncidents = events.filter(e => e.type === 'incident' && e.severity === 'critical').length;
  const activeWarningIncidents = events.filter(e => e.type === 'incident' && e.severity === 'warning').length;
  // Account for resolves (for simplicity, subtracting based on current counts)
  const totalFixes = events.filter(e => e.type === 'fix').length;
  const healthReduction = Math.max(0, (activeCriticalIncidents * 12) + (activeWarningIncidents * 5) - (totalFixes * 2));
  const healthScore = Math.max(10, Math.min(100, 100 - healthReduction));

  // Incident Cascades (Root Cause Knowledge Trees)
  const INCIDENT_CASCADES = [
    {
      id: 'cascade-01',
      title: 'Out-Of-Memory (OOM) Cache Cascade',
      triggers: [
        { title: 'Disk Usage Spike', desc: 'Srv-03 high WAL write operations', type: 'error' },
        { title: 'Host Resource Limit', desc: 'Host server reaches 94% memory utilization', type: 'incident' },
        { title: 'Container Exit (OOM)', desc: 'Redis cache killed with Exit Code 137', type: 'crash' },
        { title: 'Application Outage', desc: 'Node-api container throws 504 gateway timeout', type: 'service_down' }
      ],
      recommendation: 'Configure Redis MaxMemory policy to allkeys-lru and specify Docker hard container limits.'
    },
    {
      id: 'cascade-02',
      title: 'Nginx connection saturation cascade',
      triggers: [
        { title: 'Heavy Traffic Wave', desc: 'HTTP request rate increases by 400%', type: 'info' },
        { title: 'Nginx Worker Exhaustion', desc: 'Connection pool threshold reached (768/768)', type: 'incident' },
        { title: 'Packet Drops', desc: 'Connections dropped in upstream socket buffers', type: 'crash' },
        { title: 'Frontend Outage', desc: 'Web requests return HTTP 504 Gateway Timeout', type: 'service_down' }
      ],
      recommendation: 'Raise events { worker_connections 4096; } and adjust worker_rlimit_nofile 8192.'
    }
  ];

  // Helper to trigger custom simulated memory events
  const handleSimulateEvent = (type: 'incident' | 'error' | 'command' | 'config' | 'deployment' | 'fix') => {
    const selectedServer = servers.find(s => s.id === simServerId) || servers[0];
    if (!selectedServer) return;

    let message = '';
    let details = simDetails || 'Simulated infrastructure event recorded in AIME Memory Engine.';
    let category = 'system';
    let severity: 'healthy' | 'warning' | 'critical' = 'healthy';
    let cmdExitCode: number | undefined = undefined;

    const timestamp = new Date().toISOString();

    if (type === 'incident') {
      message = 'Kubernetes ingress controller pod crash';
      category = 'docker';
      details = details || 'Incident warning: Core nginx pod crashed in namespace ingress-nginx. High request queuing detected.';
      severity = 'critical';
    } else if (type === 'error') {
      message = 'Disk drive hardware block I/O failure';
      category = 'kernel';
      details = details || 'Kernel dmesg alert: block device /dev/sdb1 experienced hardware sector errors.';
      severity = 'critical';
    } else if (type === 'command') {
      message = 'systemctl restart nginx';
      category = 'nginx';
      details = details || 'Executed shell command to reload load balancer configuration.';
      cmdExitCode = 0;
    } else if (type === 'config') {
      message = 'Modified sysctl.conf kernel virtual memory parameters';
      category = 'kernel';
      details = details || 'Updated vm.max_map_count to 262144 for optimal Elasticsearch host operation.';
      severity = 'warning';
    } else if (type === 'deployment') {
      const commit = Math.random().toString(16).substring(2, 9);
      const version = `v1.12.${Math.floor(Math.random() * 10)}`;
      message = `Deployed core-billing-service ${version} to cluster`;
      category = 'provisioning';
      details = details || `Git commit SHA: [${commit}]. Kubernetes container rollout started.`;
    } else if (type === 'fix') {
      message = 'Resolved memory saturation by running swapoff/swapon cycle';
      category = 'kernel';
      details = details || 'Swap buffer cleared and background dirty pages flushed. Server RAM returned to normal bounds.';
    }

    const simEvent: MemoryEvent = {
      id: `evt-sim-${Date.now()}`,
      timestamp,
      serverId: selectedServer.id,
      serverName: selectedServer.name,
      type,
      message,
      user: simOperator,
      details,
      category,
      severity,
      commandExitCode: cmdExitCode
    };

    onAddMemoryEvent(simEvent);
    setSimDetails('');
    setActiveSubTab('timeline');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5.5 h-5.5 text-cyan-500 animate-pulse" />
            Infrastructure Memory Engine (AIME DB)
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            PERMANENT CHRONOLOGICAL STORAGE, ROOT CAUSE CASUISTRY & INCIDENT HISTORIES
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClearAllEvents && (
            <button
              onClick={onClearAllEvents}
              className="px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400 hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset SRE database to pre-seeded logs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Wipe Memory DB
            </button>
          )}
          <span className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> SYNCHRONIZED TO CLOUD
          </span>
        </div>
      </div>

      {/* SRE Engine Tabs */}
      <div className="flex flex-wrap border-b border-slate-900 gap-1">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'dashboard' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Memory Dashboard
        </button>
        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'timeline' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Search & Timeline Archive
        </button>
        <button
          onClick={() => setActiveSubTab('servers')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'servers' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Incident Lifecycle (Per-Server)
        </button>
        <button
          onClick={() => setActiveSubTab('commands')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'commands' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          SSH Commands & Deployments
        </button>
        <button
          onClick={() => setActiveSubTab('root_cause')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'root_cause' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Root Cause Knowledge
        </button>
        <button
          onClick={() => setActiveSubTab('simulation')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'simulation' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Memory Simulator
        </button>
      </div>

      {/* Sub-Tab Panels */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Health Score Card */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 lg:col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Infrastructure health</span>
                <span className="text-3xl font-extrabold text-white font-mono mt-1 block">
                  {healthScore}%
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      healthScore > 85 ? 'bg-emerald-500' : healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase mt-1.5 block">
                  {healthScore > 85 ? 'OPTIMAL SLA HEALTHY' : healthScore > 60 ? 'DEGRADED PERFORMANCE' : 'CRITICAL OUTAGE WARNING'}
                </span>
              </div>
            </div>

            {/* Total Incidents */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Incidents</span>
                <span className="text-3xl font-extrabold text-white font-mono mt-1 block">{totalIncidents}</span>
              </div>
              <span className="text-[9px] font-mono text-red-400 uppercase mt-2 block">
                🚨 LOGGED IN ENGINE
              </span>
            </div>

            {/* Repeated Incidents */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Repeated Incidents</span>
                <span className="text-3xl font-extrabold text-amber-400 font-mono mt-1 block">{repeatedCount}</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase mt-2 block">
                🔁 RECURRING ALERTS
              </span>
            </div>

            {/* Recurring Errors */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Recurring Errors</span>
                <span className="text-3xl font-extrabold text-purple-400 font-mono mt-1 block">{recurringErrors}</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase mt-2 block">
                ⚠️ SYSTEM ERRORS
              </span>
            </div>

            {/* Total Commands Logged */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">SSH Audits</span>
                <span className="text-3xl font-extrabold text-cyan-400 font-mono mt-1 block">
                  {events.filter(e => e.type === 'command').length}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase mt-2 block">
                💻 COMMAND HISTORY
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top SRE Engineers */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Top SRE Operators & Automated Bots
              </h3>
              <div className="space-y-3">
                {topEngineers.map((eng, idx) => (
                  <div key={eng.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-300 font-mono">@{eng.name}</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/10">
                      {eng.count} memory modifications
                    </span>
                  </div>
                ))}
                {topEngineers.length === 0 && (
                  <div className="text-center p-6 text-slate-500 text-xs font-mono">No operator history available.</div>
                )}
              </div>
            </div>

            {/* Most Common SRE Fixes */}
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Most Common SRE Fixes & Resolutions
              </h3>
              <div className="space-y-3">
                {commonFixes.map((f, idx) => (
                  <div key={f.fix} className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200">{f.fix}</h4>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1">
                        Applied {f.count}x
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">RESOLVED CASCADE OUTAGE SUCCESSFULLY</p>
                  </div>
                ))}
                {commonFixes.length === 0 && (
                  <div className="text-center p-6 text-slate-500 text-xs font-mono">No fix history recorded. Run a simulation to log fixes!</div>
                )}
              </div>
            </div>
          </div>

          {/* Quick NLP search suggestions */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
              NLP SRE Memory Queries
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              AIME indexes system events directly. Click any of the pre-built memory filters below to query the Infrastructure Memory Database:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleQuickSearch('', 'incident', 'all')}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-red-500/30 text-[11px] text-slate-300 font-mono hover:text-white transition-all cursor-pointer"
              >
                🔍 "Show incidents from last month"
              </button>
              <button
                onClick={() => handleQuickSearch('nginx', 'all', 'nginx')}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-cyan-500/30 text-[11px] text-slate-300 font-mono hover:text-white transition-all cursor-pointer"
              >
                🔍 "Show all nginx failures"
              </button>
              <button
                onClick={() => handleQuickSearch('alex', 'all', 'all')}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-indigo-500/30 text-[11px] text-slate-300 font-mono hover:text-white transition-all cursor-pointer"
              >
                🔍 "Show commands executed by Alex"
              </button>
              <button
                onClick={() => handleQuickSearch('OOM', 'all', 'docker')}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-purple-500/30 text-[11px] text-slate-300 font-mono hover:text-white transition-all cursor-pointer"
              >
                🔍 "Show every Docker crash"
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'timeline' && (
        <div className="space-y-6">
          {/* Search Filters */}
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search command strings, servers, operators, errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-950 border border-slate-900 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Event Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              >
                <option value="all">ALL TYPES</option>
                <option value="incident">INCIDENTS</option>
                <option value="error">ERRORS</option>
                <option value="command">COMMANDS</option>
                <option value="config">CONFIGURATIONS</option>
                <option value="deployment">DEPLOYMENTS</option>
                <option value="fix">FIXES</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Linux Server</label>
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              >
                <option value="all">ALL SERVERS</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SRE Memory Feed */}
          <div className="relative border-l-2 border-slate-900 pl-6 sm:pl-8 ml-4 space-y-5">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const isExpanded = expandedEventId === event.id;
                
                let icon = <Terminal className="w-3.5 h-3.5" />;
                let badgeBg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                let dotBg = 'bg-cyan-500 ring-cyan-500/10';

                if (event.type === 'incident') {
                  icon = <ShieldAlert className="w-3.5 h-3.5" />;
                  badgeBg = 'bg-red-500/10 text-red-400 border-red-500/20';
                  dotBg = 'bg-red-500 ring-red-500/10';
                } else if (event.type === 'error') {
                  icon = <AlertTriangle className="w-3.5 h-3.5" />;
                  badgeBg = 'bg-red-500/10 text-red-400 border-red-500/20';
                  dotBg = 'bg-red-500 ring-red-500/10';
                } else if (event.type === 'config') {
                  icon = <Settings className="w-3.5 h-3.5" />;
                  badgeBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  dotBg = 'bg-yellow-500 ring-yellow-500/10';
                } else if (event.type === 'deployment') {
                  icon = <Cpu className="w-3.5 h-3.5" />;
                  badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  dotBg = 'bg-blue-500 ring-blue-500/10';
                } else if (event.type === 'fix') {
                  icon = <CheckCircle2 className="w-3.5 h-3.5" />;
                  badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  dotBg = 'bg-emerald-500 ring-emerald-500/10';
                }

                return (
                  <div key={event.id} className="relative group">
                    <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border border-slate-950 bg-slate-950 shadow-sm text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${dotBg} ring-4`} />
                    </div>

                    <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 hover:border-slate-800 transition-all text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-900/50">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${badgeBg} flex items-center gap-1`}>
                            {icon}
                            {event.type}
                          </span>
                          {event.category && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-900/50 uppercase">
                              {event.category.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-cyan-400 font-bold">
                            @{event.serverName}
                          </span>
                          {typeof event.riskScore === 'number' && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border flex items-center gap-1 ${
                              event.riskScore >= 70
                                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                                : event.riskScore >= 40
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                              <Sparkles className="w-2.5 h-2.5" />
                              RISK: {event.riskScore}/100
                            </span>
                          )}
                          {event.aiPatternCategory && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
                              AI: {event.aiPatternCategory}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <button
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                            className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-200">{event.message}</h4>
                          <p className="text-xs font-mono text-slate-500">Operator: {event.user}</p>
                        </div>
                        {(event.type === 'incident' || event.type === 'error') && (
                          <button
                            onClick={() => onSelectEventForAnalysis(event)}
                            className="px-3 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px] hover:bg-cyan-400 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                          >
                            <Sparkles className="w-3 h-3" /> Ask AI Fix
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {/* Details block */}
                          {event.details && (
                            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-900 space-y-2">
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Operational Details Trace:</span>
                              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{event.details}</p>
                              {event.commandExitCode !== undefined && (
                                <div className="flex items-center gap-2 text-xs font-mono mt-1">
                                  <span className="text-slate-500">EXIT STATUS:</span>
                                  <span className={event.commandExitCode === 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                    {event.commandExitCode} ({event.commandExitCode === 0 ? 'Success' : 'Error'})
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Gemini AI Pattern Risk Analysis Block */}
                          {(event.aiReasoning || event.aiRecommendedAction) && (
                            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Gemini AI Event Pattern Analysis
                                </span>
                                {typeof event.riskScore === 'number' && (
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                    event.riskScore >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  }`}>
                                    Risk Score: {event.riskScore}/100
                                  </span>
                                )}
                              </div>
                              {event.aiReasoning && (
                                <p className="text-xs text-indigo-100 font-sans leading-relaxed">
                                  <strong className="text-indigo-300 font-mono text-[11px]">Pattern Insight:</strong> {event.aiReasoning}
                                </p>
                              )}
                              {event.aiRecommendedAction && (
                                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-indigo-500/20 text-xs font-mono text-amber-300 flex items-start gap-2">
                                  <span className="text-amber-400 font-bold shrink-0">FIX RECOM:</span>
                                  <span>{event.aiRecommendedAction}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Change Attribution & Audit Logs */}
                          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-900/80 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <GitCommit className="w-3.5 h-3.5" /> Change Attribution & SRE Audit Logs
                              </span>
                              {editingEventId === event.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => saveEditedEvent(event.id)}
                                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-[9px] uppercase cursor-pointer"
                                  >
                                    Save Audit
                                  </button>
                                  <button
                                    onClick={() => setEditingEventId(null)}
                                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[9px] uppercase cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditingEvent(event)}
                                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-cyan-400 font-mono text-[9px] uppercase cursor-pointer flex items-center gap-1"
                                >
                                  <Settings className="w-3 h-3" /> Edit Audit Info
                                </button>
                              )}
                            </div>

                            {editingEventId === event.id ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Engineer / Author</label>
                                  <input
                                    type="text"
                                    value={editForm.user}
                                    onChange={(e) => setEditForm({ ...editForm, user: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Team</label>
                                  <input
                                    type="text"
                                    value={editForm.team}
                                    onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Environment</label>
                                  <select
                                    value={editForm.environment}
                                    onChange={(e) => setEditForm({ ...editForm, environment: e.target.value as any })}
                                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-855 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  >
                                    <option value="Dev">Dev</option>
                                    <option value="QA">QA</option>
                                    <option value="Production">Production</option>
                                  </select>
                                </div>
                                <div className="md:col-span-3">
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Change Reason</label>
                                  <input
                                    type="text"
                                    value={editForm.changeReason}
                                    onChange={(e) => setEditForm({ ...editForm, changeReason: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Commit ID</label>
                                  <input
                                    type="text"
                                    value={editForm.commitId}
                                    onChange={(e) => setEditForm({ ...editForm, commitId: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Git Branch</label>
                                  <input
                                    type="text"
                                    value={editForm.gitBranch}
                                    onChange={(e) => setEditForm({ ...editForm, gitBranch: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Pull Request</label>
                                  <input
                                    type="text"
                                    value={editForm.pullRequest}
                                    onChange={(e) => setEditForm({ ...editForm, pullRequest: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Terraform Apply ID</label>
                                  <input
                                    type="text"
                                    value={editForm.terraformApplyId}
                                    onChange={(e) => setEditForm({ ...editForm, terraformApplyId: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Jira/ServiceNow Ticket</label>
                                  <input
                                    type="text"
                                    value={editForm.jiraTicket}
                                    onChange={(e) => setEditForm({ ...editForm, jiraTicket: e.target.value })}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase block">Engineer</span>
                                  <span className="text-slate-300 font-bold">@{event.user || 'Unknown'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase block">Team</span>
                                  <span className="text-slate-300">{event.team || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase block">Environment</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    event.environment === 'Production' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    event.environment === 'QA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  }`}>
                                    {event.environment || 'Production'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 uppercase block">Jira/SNOW Ticket</span>
                                  <span className="text-amber-400 font-bold">{event.jiraTicket || '—'}</span>
                                </div>
                                <div className="col-span-2 md:col-span-4 border-t border-slate-900/40 pt-2">
                                  <span className="text-[9px] text-slate-500 uppercase block">Reason for Change</span>
                                  <span className="text-slate-300 font-sans">{event.changeReason || '—'}</span>
                                </div>
                                <div className="col-span-1 border-t border-slate-900/40 pt-2">
                                  <span className="text-[9px] text-slate-500 uppercase block">Commit ID</span>
                                  <span className="text-indigo-400">{event.commitId || '—'}</span>
                                </div>
                                <div className="col-span-1 border-t border-slate-900/40 pt-2">
                                  <span className="text-[9px] text-slate-500 uppercase block">Git Branch</span>
                                  <span className="text-slate-400">{event.gitBranch || '—'}</span>
                                </div>
                                <div className="col-span-1 border-t border-slate-900/40 pt-2">
                                  <span className="text-[9px] text-slate-500 uppercase block">Pull Request</span>
                                  <span className="text-blue-400 font-bold">{event.pullRequest || '—'}</span>
                                </div>
                                <div className="col-span-1 border-t border-slate-900/40 pt-2">
                                  <span className="text-[9px] text-slate-500 uppercase block">Terraform ID</span>
                                  <span className="text-slate-400">{event.terraformApplyId || '—'}</span>
                                </div>
                              </div>
                            )}

                            {/* Editable Note Area */}
                            <div className="border-t border-slate-900/80 pt-3 space-y-1.5">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">SRE Operator Explanatory Note (Editable):</span>
                              {editingEventId === event.id ? (
                                <textarea
                                  value={editForm.editableNote}
                                  onChange={(e) => setEditForm({ ...editForm, editableNote: e.target.value })}
                                  placeholder="Write a clear SRE note explaining the circumstances or post-mortem actions of this change..."
                                  rows={2}
                                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                                />
                              ) : (
                                <div className="p-3 rounded-lg bg-indigo-950/10 border border-indigo-500/10 text-xs leading-relaxed text-indigo-200 font-sans whitespace-pre-wrap">
                                  {event.editableNote || 'No operator explanatory note attached. Click "Edit Audit Info" above to document this infrastructure action.'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center rounded-xl border border-slate-900 text-slate-500 font-mono text-sm">
                No events match your current query or filters.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'servers' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Select Linux Machine</h3>
              <p className="text-xs text-slate-500 font-mono">CHRONOLOGICAL HISTORY OF BOOT, CONTEXT, CRASH & FIX EVENTS</p>
            </div>
            <select
              value={selectedServerId === 'all' ? (servers[0]?.id || '') : selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
            >
              {servers.map(s => (
                <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Timeline of the Selected Server */}
          {(() => {
            const currentSelectedId = selectedServerId === 'all' ? (servers[0]?.id || '') : selectedServerId;
            const targetServer = servers.find(s => s.id === currentSelectedId);
            const serverSpecificEvents = events
              .filter(e => e.serverId === currentSelectedId)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // oldest to newest

            if (!targetServer) {
              return <div className="p-12 text-center text-slate-500 font-mono text-xs">No active server.</div>;
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-2">
                      Chronological Lifecycle for {targetServer.name}
                    </h3>

                    {serverSpecificEvents.length > 0 ? (
                      <div className="relative pl-6 border-l-2 border-slate-900 ml-2 space-y-6">
                        {serverSpecificEvents.map((evt, idx) => {
                          let color = 'bg-cyan-500';
                          if (evt.type === 'incident' || evt.type === 'error') color = 'bg-red-500 animate-pulse';
                          if (evt.type === 'fix') color = 'bg-emerald-500';
                          if (evt.type === 'config') color = 'bg-yellow-500';

                          return (
                            <div key={evt.id} className="relative">
                              <span className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ${color} ring-4 ring-slate-950`} />
                              <div className="text-left space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-200">{evt.message}</span>
                                  <span className="text-[9px] font-mono text-slate-500 uppercase bg-slate-900 px-1.5 py-0.5 rounded">
                                    {evt.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                                    {new Date(evt.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                {evt.details && (
                                  <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">{evt.details}</p>
                                )}
                                <p className="text-[10px] font-mono text-slate-500">Initiator: @{evt.user}</p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Current healthy / final status node */}
                        <div className="relative">
                          <span className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ${
                            targetServer.status === 'healthy' ? 'bg-emerald-500' : targetServer.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                          } ring-4 ring-slate-950`} />
                          <div className="text-left space-y-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono">
                              <Heart className={`w-3.5 h-3.5 ${targetServer.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`} />
                              Current State: {targetServer.status.toUpperCase()}
                            </span>
                            <p className="text-xs text-slate-500 font-sans">
                              Server is currently exhibiting {targetServer.status} parameters on standard health endpoints. Uptime is logged at {targetServer.uptime}.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 font-mono text-xs">
                        No events logged for this server yet. Add simulated events below to build history!
                      </div>
                    )}
                  </div>
                </div>

                {/* Server mini info */}
                <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 h-fit space-y-4 text-left">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-2">
                    System Parameters
                  </h3>
                  <div className="space-y-3.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">IP ADDRESS:</span>
                      <span className="text-slate-300 font-bold">{targetServer.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HOST OPERATING SYSTEM:</span>
                      <span className="text-slate-300 text-right">{targetServer.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SSH USERNAME:</span>
                      <span className="text-slate-300">@{targetServer.sshUser}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CLOUD PROVIDER:</span>
                      <span className="text-slate-300">{targetServer.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">UPTIME TIMER:</span>
                      <span className="text-slate-300">{targetServer.uptime}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeSubTab === 'commands' && (
        <div className="space-y-6">
          {/* SSH Command History Grid */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Terminal className="w-4.5 h-4.5 text-cyan-400" />
                SSH Terminal Executed Command History (Audit Trace)
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                A permanent secure trace record of every bash command run across connected SSH linux hosts:
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500">
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">LINUX SERVER</th>
                    <th className="py-2.5 px-3">OPERATOR</th>
                    <th className="py-2.5 px-3">COMMAND EXECUTED</th>
                    <th className="py-2.5 px-3 text-center">EXIT STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {events.filter(e => e.type === 'command').map((cmd) => (
                    <tr key={cmd.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-3 px-3 text-slate-500">{new Date(cmd.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">@{cmd.serverName}</td>
                      <td className="py-3 px-3 text-slate-300">@{cmd.user}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">
                        <code>{cmd.message}</code>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cmd.commandExitCode === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {cmd.commandExitCode === undefined ? '0 (SUCCESS)' : `${cmd.commandExitCode}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {events.filter(e => e.type === 'command').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                        No terminal commands executed yet. Run a command inside the Linux Server SSH tab!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deployment History Grid */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Cpu className="w-4.5 h-4.5 text-blue-400" />
                Code Deployment History & Rollback Console
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Indexes deployment time, version tags, Git commit SHAs, and lets you manage operational rollback flags:
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500">
                    <th className="py-2.5 px-3">DEPLOY TIME</th>
                    <th className="py-2.5 px-3">SERVER HOST</th>
                    <th className="py-2.5 px-3">VERSION</th>
                    <th className="py-2.5 px-3">GIT COMMIT</th>
                    <th className="py-2.5 px-3">RELEASE STATUS</th>
                    <th className="py-2.5 px-3 text-right">ROLLBACK ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-left">
                  {events.filter(e => e.type === 'deployment').map((dep) => {
                    const isRolledBack = rollbackStatus[dep.id] || false;
                    const commitHash = dep.details?.match(/\[([a-f0-9]{7})\]/) || dep.details?.match(/SHA:\s*([a-f0-9]{7})/) || ['[d7a2e4b]', 'd7a2e4b'];
                    const matchVer = dep.details?.match(/v\d+\.\d+\.\d+/) || dep.message?.match(/v\d+\.\d+\.\d+/) || ['v1.12.0'];

                    return (
                      <tr key={dep.id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{new Date(dep.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-3 text-cyan-400 font-bold">@{dep.serverName}</td>
                        <td className="py-3 px-3 text-slate-200 font-bold">{matchVer[0]}</td>
                        <td className="py-3 px-3 text-zinc-500 flex items-center gap-1">
                          <GitCommit className="w-3.5 h-3.5 text-zinc-600" />
                          <code>{commitHash[1] || 'd7a2e4b'}</code>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isRolledBack 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isRolledBack ? 'ROLLED BACK' : 'ACTIVE RELEASE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleRollback(dep.id)}
                            className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                              isRolledBack
                                ? 'bg-zinc-800 border border-zinc-700 text-slate-300 hover:bg-zinc-700'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {isRolledBack ? 'Re-enable Deploy' : 'Force Rollback'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'root_cause' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BarChart2 className="w-4.5 h-4.5 text-cyan-400" />
                SRE Root Cause Knowledge Cascade Map
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                AIME's cognitive knowledge graphs link overlapping infrastructure failures together into logical causality lines:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {INCIDENT_CASCADES.map((cascade) => (
                <div key={cascade.id} className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase">{cascade.title}</h4>
                    <span className="text-[9px] font-mono text-zinc-500">CONNECTED PATTERN</span>
                  </div>

                  {/* Flow Graph */}
                  <div className="space-y-3.5 relative pl-4 border-l border-dashed border-slate-800">
                    {cascade.triggers.map((trigger, idx) => {
                      let tagColor = 'bg-slate-900 text-slate-400';
                      if (trigger.type === 'incident') tagColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/10';
                      if (trigger.type === 'crash') tagColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
                      if (trigger.type === 'service_down') tagColor = 'bg-red-500 text-slate-950 font-bold';

                      return (
                        <div key={idx} className="relative group">
                          {/* Circle Connector Node */}
                          <div className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-slate-800 group-hover:bg-cyan-400 transition-colors" />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">{trigger.title}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${tagColor}`}>
                                {trigger.type.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">{trigger.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fix Recommendation */}
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">Recommended Preventative Action:</span>
                    <p className="text-xs text-slate-300 font-sans leading-normal">{cascade.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'simulation' && (
        <div className="space-y-6">
          {/* SRE Simulation Panel */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Play className="w-4.5 h-4.5 text-cyan-400" />
                AIME Memory Simulation Control Center
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Execute testing scenarios to trigger incidents, load balancing updates, database blockages, or config repairs. Every simulation logs permanently into the Infrastructure Memory Engine!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Target Linux Server</label>
                  <select
                    value={simServerId}
                    onChange={(e) => setSimServerId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  >
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">SRE Operator Name</label>
                  <input
                    type="text"
                    value={simOperator}
                    onChange={(e) => setSimOperator(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Custom Operational Log Details (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific sector maps, kernel traces, log outputs or command blocks..."
                    value={simDetails}
                    onChange={(e) => setSimDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Instant simulation dispatch grid */}
              <div className="space-y-3.5 text-left flex flex-col justify-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Trigger simulated memory event:</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSimulateEvent('incident')}
                    className="p-3 text-left rounded-xl border border-slate-900 bg-slate-950 hover:border-red-500/30 cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Incident / Crash
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono">Trigger OOM or pod crash</p>
                  </button>

                  <button
                    onClick={() => handleSimulateEvent('fix')}
                    className="p-3 text-left rounded-xl border border-slate-900 bg-slate-950 hover:border-emerald-500/30 cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Successful Fix
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono">Log configuration resolution</p>
                  </button>

                  <button
                    onClick={() => handleSimulateEvent('deployment')}
                    className="p-3 text-left rounded-xl border border-slate-900 bg-slate-950 hover:border-blue-500/30 cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> Code Deploy
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono">Commit and deploy version tag</p>
                  </button>

                  <button
                    onClick={() => handleSimulateEvent('command')}
                    className="p-3 text-left rounded-xl border border-slate-900 bg-slate-950 hover:border-cyan-500/30 cursor-pointer transition-all space-y-1 group"
                  >
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" /> SSH Command
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono">Audit bash systemctl command</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
