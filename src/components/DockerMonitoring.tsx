import React, { useState } from 'react';
import { Layers, Play, Square, RotateCcw, AlertTriangle, ShieldCheck, HardDrive, Database, Sparkles, Terminal } from 'lucide-react';
import { DockerContainer, MemoryEvent } from '../types';

interface DockerMonitoringProps {
  containers: DockerContainer[];
  onUpdateContainerStatus: (id: string, status: 'running' | 'exited' | 'restarting', restartsIncrement?: number) => void;
  onAddMemoryEvent: (event: MemoryEvent) => void;
  operatorUsername?: string;
}

export default function DockerMonitoring({
  containers,
  onUpdateContainerStatus,
  onAddMemoryEvent,
  operatorUsername
}: DockerMonitoringProps) {
  const [activeHostFilter, setActiveHostFilter] = useState('all');

  const filteredContainers = containers.filter(c => activeHostFilter === 'all' || c.serverId === activeHostFilter);

  const totalCount = filteredContainers.length;
  const runningCount = filteredContainers.filter(c => c.status === 'running').length;
  const exitedCount = filteredContainers.filter(c => c.status === 'exited').length;
  const totalRestarts = filteredContainers.reduce((sum, c) => sum + c.restarts, 0);

  const handleAction = (container: DockerContainer, action: 'start' | 'stop' | 'restart') => {
    let nextStatus: 'running' | 'exited' | 'restarting' = 'running';
    let incRestarts = 0;

    if (action === 'stop') {
      nextStatus = 'exited';
    } else if (action === 'restart') {
      nextStatus = 'restarting';
      incRestarts = 1;
    }

    onUpdateContainerStatus(container.id, nextStatus, incRestarts);

    // If restarting, reset to running after 2 seconds
    if (action === 'restart') {
      setTimeout(() => {
        onUpdateContainerStatus(container.id, 'running');
      }, 2000);
    }

    // Log action to infrastructure timeline memory!
    const containerEvent: MemoryEvent = {
      id: `evt-container-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverId: container.serverId,
      serverName: 'srv-docker-host',
      type: 'command',
      message: `docker ${action} ${container.name}`,
      user: operatorUsername || 'devops_alex',
      details: `Action '${action.toUpperCase()}' initiated on container ${container.name} (${container.image}). Status set to ${nextStatus}.`,
      category: 'docker',
      severity: action === 'stop' ? 'warning' : 'healthy'
    };
    onAddMemoryEvent(containerEvent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-white tracking-tight">Docker Engine & Container Monitoring</h1>
          <p className="text-xs text-slate-400 font-mono">RESTART TELEMETRY, CPU/RAM BOUNDS & LIFECYCLE CONTROLS</p>
        </div>
        <div>
          <label className="text-xs font-mono text-slate-500 mr-2 uppercase">Filter by SRE Host:</label>
          <select
            value={activeHostFilter}
            onChange={(e) => setActiveHostFilter(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
          >
            <option value="all">All Connected Hosts</option>
            <option value="srv-02">srv-docker-host (10.0.1.45)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/80">
          <span className="block text-[10px] font-mono text-slate-500 uppercase">Total Containers</span>
          <span className="text-2xl font-extrabold text-white">{totalCount}</span>
          <span className="block text-[10px] text-slate-500 font-mono mt-1">INVENTORY TRACKED</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/80">
          <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold text-emerald-400">Running States</span>
          <span className="text-2xl font-extrabold text-emerald-400">{runningCount}</span>
          <span className="block text-[10px] text-slate-500 font-mono mt-1">HEALTHY CONNECTIONS</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/80">
          <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold text-red-400">Exited / Failed</span>
          <span className="text-2xl font-extrabold text-red-400">{exitedCount}</span>
          <span className="block text-[10px] text-slate-500 font-mono mt-1">REPAIRS REQUIRED</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/80">
          <span className="block text-[10px] font-mono text-slate-500 uppercase">Accumulated Restarts</span>
          <span className="text-2xl font-extrabold text-yellow-400">{totalRestarts}</span>
          <span className="block text-[10px] text-slate-500 font-mono mt-1">RESTART LIMIT CRITICAL</span>
        </div>
      </div>

      {/* Containers Table */}
      <div className="rounded-xl border border-slate-900 bg-slate-950 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Docker Container Process Inventory ({filteredContainers.length})
          </h3>
          <span className="text-[10px] font-mono text-slate-500">DAEMON PORT: LOCAL UNIX SOCKET</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase bg-slate-950">
                <th className="p-4">Container</th>
                <th className="p-4">Image tag</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Restarts</th>
                <th className="p-4 text-right">CPU Limit</th>
                <th className="p-4 text-right">RAM Util</th>
                <th className="p-4 text-right">Action controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredContainers.map((container) => {
                let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (container.status === 'exited') statusBadge = 'bg-red-500/10 text-red-400 border-red-500/20';
                if (container.status === 'restarting') statusBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse';

                return (
                  <tr key={container.id} className="border-b border-slate-900/50 hover:bg-slate-900/10 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-200 block">{container.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Port mapping: {container.ports}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{container.image}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${statusBadge}`}>
                        {container.status}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-300">{container.restarts}</td>
                    <td className="p-4 text-right font-mono text-slate-300">{container.cpu}%</td>
                    <td className="p-4 text-right font-mono text-slate-300">{container.ram} MB</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        {container.status === 'exited' ? (
                          <button
                            id={`btn-start-${container.id}`}
                            onClick={() => handleAction(container, 'start')}
                            className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Start container"
                          >
                            <Play className="w-3.5 h-3.5 fill-emerald-400/20" />
                          </button>
                        ) : (
                          <button
                            id={`btn-stop-${container.id}`}
                            onClick={() => handleAction(container, 'stop')}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Stop container"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          id={`btn-restart-${container.id}`}
                          onClick={() => handleAction(container, 'restart')}
                          className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                          title="Restart container"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docker Volumes and Image registries section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Left: Volumes */}
        <div className="p-5 rounded-xl border border-slate-900 bg-slate-950">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" /> Docker Storage Volumes (Active)
          </h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-900/50 flex justify-between border border-slate-900">
              <span className="text-slate-300">redis_persistence_vol</span>
              <span className="text-slate-500">Size: 4.2 GB • Read/Write</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900/50 flex justify-between border border-slate-900">
              <span className="text-slate-300">nginx_log_vol</span>
              <span className="text-slate-500">Size: 12.8 GB • Read/Write</span>
            </div>
          </div>
        </div>

        {/* Right: Images */}
        <div className="p-5 rounded-xl border border-slate-900 bg-slate-950">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" /> Docker Cached Local Images
          </h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-900/50 flex justify-between border border-slate-900">
              <span className="text-slate-300">postgres:15-alpine</span>
              <span className="text-slate-500">379 MB • Loaded</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900/50 flex justify-between border border-slate-900">
              <span className="text-slate-300">prom/prometheus:latest</span>
              <span className="text-slate-500">224 MB • Loaded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
