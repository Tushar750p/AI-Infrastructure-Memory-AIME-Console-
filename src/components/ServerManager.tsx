import React, { useState } from 'react';
import { Server, Plus, ShieldAlert, CheckCircle2, Cpu, HardDrive, Terminal, Play, CornerDownRight, PlusCircle, Trash } from 'lucide-react';
import { LinuxServer, MemoryEvent } from '../types';

interface ServerManagerProps {
  servers: LinuxServer[];
  onAddServer: (server: LinuxServer) => void;
  onRemoveServer: (id: string) => void;
  onAddMemoryEvent: (event: MemoryEvent) => void;
  operatorUsername?: string;
}

export default function ServerManager({
  servers,
  onAddServer,
  onRemoveServer,
  onAddMemoryEvent,
  operatorUsername
}: ServerManagerProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>(servers[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [os, setOs] = useState('Ubuntu 22.04 LTS');
  const [provider, setProvider] = useState('AWS EC2');
  const [region, setRegion] = useState('us-east-1');
  const [sshUser, setSshUser] = useState('ubuntu');
  const [sshPort, setSshPort] = useState(22);

  // Terminal states
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ type: 'cmd' | 'output' | 'error'; text: string }>>([
    { type: 'output', text: '# Secure SSH Connection Established. AIME Shell Audit Mode Active.' },
    { type: 'output', text: '# Type a command below, or click any quick diagnostic command below.' }
  ]);

  const selectedServer = servers.find(s => s.id === selectedServerId);

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ip) return;

    const newServer: LinuxServer = {
      id: `srv-${Date.now()}`,
      name,
      ip,
      os,
      status: 'healthy',
      uptime: '1m',
      cpu: 12,
      ram: 28,
      disk: 15,
      provider,
      region,
      sshUser,
      sshPort
    };

    onAddServer(newServer);
    
    // Log creation into infrastructure memory
    const creationEvent: MemoryEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverId: newServer.id,
      serverName: newServer.name,
      type: 'deployment',
      message: `Linux server '${newServer.name}' added with SSH connection on port ${newServer.sshPort}`,
      user: operatorUsername || 'devops_alex',
      details: `Initialized connection to IP ${newServer.ip}. SSH verification complete.`,
      category: 'provisioning',
      severity: 'healthy'
    };
    onAddMemoryEvent(creationEvent);

    setSelectedServerId(newServer.id);
    setName('');
    setIp('');
    setShowAddForm(false);
  };

  const handleRunCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!terminalCommand.trim() || !selectedServer) return;

    const cmd = terminalCommand.trim();
    const newLogs = [...terminalLogs, { type: 'cmd' as const, text: `$ ${cmd}` }];

    // Simulate different terminal responses based on query
    let responseText = '';
    let isError = false;

    if (cmd.includes('nginx')) {
      responseText = `● nginx.service - A high performance web server and a reverse proxy server\n   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)\n   Active: active (running) since Sun 2026-07-12 11:24:12 UTC; 8h ago\n   Main PID: 1422 (nginx)\n   Tasks: 2 (limit: 4915)\n   Memory: 8.2M\n   CPU: 18.2s`;
    } else if (cmd.includes('df -h') || cmd.includes('disk')) {
      const sDisk = Number(selectedServer.disk) || 0;
      responseText = `Filesystem      Size  Used Avail Use% Mounted on\n/dev/xvda1       80G   ${sDisk}%   ${80 - Math.round(80 * sDisk / 100)}G  ${sDisk}% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm`;
    } else if (cmd.includes('free -m') || cmd.includes('free') || cmd.includes('ram')) {
      const sRam = Number(selectedServer.ram) || 0;
      responseText = `               total        used        free      shared  buff/cache   available\nMem:            7984        ${Math.round(7984 * sRam / 100)}        ${7984 - Math.round(7984 * sRam / 100)}         120        1140        5214\nSwap:           2048         142        1906`;
    } else if (cmd.includes('docker ps')) {
      responseText = `CONTAINER ID   IMAGE             COMMAND                  CREATED        STATUS         PORTS\ne31abf9048a1   redis:7.0-alpine  "docker-entrypoint.s…"   6 days ago     Up 14 hours    0.0.0.0:6379->6379/tcp\nd4209bf11c21   nginx:alpine      "/docker-entrypoint.…"   6 days ago     Up 14 hours    0.0.0.0:80->80/tcp`;
    } else if (cmd.includes('uptime')) {
      responseText = ` 19:39:23 up ${selectedServer.uptime},  1 user,  load average: 0.24, 0.45, 0.58`;
    } else {
      responseText = `Command executed successfully. Exit Code: 0. [SRE Memory Audit Complete]`;
    }

    setTerminalLogs([...newLogs, { type: isError ? 'error' as const : 'output' as const, text: responseText }]);
    setTerminalCommand('');

    // Register terminal command in Infrastructure Memory!
    const commandEvent: MemoryEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverId: selectedServer.id,
      serverName: selectedServer.name,
      type: 'command',
      message: cmd,
      user: operatorUsername || 'devops_alex',
      details: responseText.slice(0, 150) + (responseText.length > 150 ? '...' : ''),
      commandExitCode: 0,
      category: cmd.includes('docker') ? 'docker' : cmd.includes('nginx') ? 'nginx' : 'logs_inspect',
      severity: 'healthy'
    };
    onAddMemoryEvent(commandEvent);
  };

  const runQuickCommand = (cmd: string) => {
    setTerminalCommand(cmd);
    setTimeout(() => {
      // Small timeout to allow input rendering, then run
      setTerminalCommand(cmd);
    }, 10);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-white tracking-tight">Linux Server Infrastructure Farm</h1>
          <p className="text-xs text-slate-400 font-mono">SSH SESSIONS, LIVE METRICS & MEMORY INTEGRATION</p>
        </div>
        <button
          id="btn-toggle-add-server"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="w-4.5 h-4.5" /> {showAddForm ? 'Close panel' : 'Add Linux Server'}
        </button>
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <form onSubmit={handleAddServer} className="p-6 rounded-xl border border-slate-900 bg-slate-950/60 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Add SSH Linux Server Config</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Server Name</label>
              <input
                type="text"
                required
                placeholder="srv-api-prod-01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">IP Address</label>
              <input
                type="text"
                required
                placeholder="10.0.1.52"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Operating System</label>
              <select
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-300 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              >
                <option>Ubuntu 22.04 LTS</option>
                <option>Debian 12 Bookworm</option>
                <option>RHEL 9.2 (Red Hat)</option>
                <option>CentOS Stream 9</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Cloud Provider</label>
              <input
                type="text"
                placeholder="AWS EC2"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">SSH Username</label>
              <input
                type="text"
                placeholder="ubuntu"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">SSH Port</label>
              <input
                type="number"
                placeholder="22"
                value={sshPort}
                onChange={(e) => setSshPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            Add Server & Connect
          </button>
        </form>
      )}

      {/* Main Server Browser Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Server Cards List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest pl-1">Active Linux Hosts ({servers.length})</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {servers.map((s) => {
              const isSelected = s.id === selectedServerId;
              let statusColor = 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40';
              let statusDot = 'bg-emerald-400';
              if (s.status === 'warning') {
                statusColor = 'border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40';
                statusDot = 'bg-yellow-400';
              } else if (s.status === 'critical') {
                statusColor = 'border-red-500/20 bg-red-500/5 hover:border-red-500/40';
                statusDot = 'bg-red-400';
              }

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedServerId(s.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected ? 'ring-1 ring-cyan-400 border-cyan-400/50 bg-slate-950' : statusColor
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                      {s.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{s.ip}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>{s.os.split(' ')[0]} • {s.region}</span>
                    <span>Uptime: {s.uptime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Server Details & SSH Simulator */}
        <div className="lg:col-span-2 space-y-4">
          {selectedServer ? (
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <div className="flex items-center gap-3">
                  <Server className="w-5.5 h-5.5 text-cyan-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedServer.name}</h2>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      {selectedServer.os} • {selectedServer.provider} ({selectedServer.region})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onRemoveServer(selectedServer.id);
                    setSelectedServerId(servers[0]?.id || '');
                  }}
                  className="p-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-mono"
                  title="Remove server"
                >
                  <Trash className="w-3.5 h-3.5" /> Remove Host
                </button>
              </div>

              {/* Hardware stats widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* CPU */}
                <div className="p-3.5 rounded-lg border border-slate-900 bg-slate-950/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                    <span>CPU LOAD</span>
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-xl font-bold text-slate-200">{Number(selectedServer.cpu) || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${(selectedServer.cpu || 0) > 80 ? 'bg-red-500' : (selectedServer.cpu || 0) > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, Number(selectedServer.cpu) || 0))}%` }} 
                    />
                  </div>
                </div>

                {/* RAM */}
                <div className="p-3.5 rounded-lg border border-slate-900 bg-slate-950/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                    <span>RAM USED</span>
                    <HardDrive className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-xl font-bold text-slate-200">{Number(selectedServer.ram) || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${(selectedServer.ram || 0) > 80 ? 'bg-red-500' : (selectedServer.ram || 0) > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, Number(selectedServer.ram) || 0))}%` }} 
                    />
                  </div>
                </div>

                {/* Disk Space */}
                <div className="p-3.5 rounded-lg border border-slate-900 bg-slate-950/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                    <span>DISK SPACE</span>
                    <HardDrive className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-xl font-bold text-slate-200">{Number(selectedServer.disk) || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${(selectedServer.disk || 0) > 80 ? 'bg-red-500' : (selectedServer.disk || 0) > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, Number(selectedServer.disk) || 0))}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* SSH Interactive Terminal Simulator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    SSH TERMINAL SIMULATOR • AUDITED STREAM
                  </span>
                  <span className="text-[10px] font-mono text-cyan-500">
                    SSH: {selectedServer.sshUser}@{selectedServer.ip}:{selectedServer.sshPort}
                  </span>
                </div>

                {/* Console box */}
                <div className="rounded-lg border border-slate-900 bg-slate-950 p-4 font-mono text-xs text-left text-cyan-400 space-y-2 max-h-[220px] overflow-y-auto">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className={`whitespace-pre-wrap ${log.type === 'cmd' ? 'text-slate-200' : log.type === 'error' ? 'text-red-400' : 'text-cyan-500'}`}>
                      {log.text}
                    </div>
                  ))}
                </div>

                {/* CLI entry */}
                <form onSubmit={handleRunCommand} className="flex gap-2">
                  <span className="text-slate-500 font-mono text-sm self-center">$</span>
                  <input
                    type="text"
                    value={terminalCommand}
                    onChange={(e) => setTerminalCommand(e.target.value)}
                    placeholder="Type diagnostic bash command (e.g. systemctl status nginx, df -h, docker ps)..."
                    className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-900 text-slate-100 text-xs font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors cursor-pointer"
                  >
                    Run
                  </button>
                </form>

                {/* Quick SRE Commands pill list */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Quick diagnostic triggers (Click to run):</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runQuickCommand('systemctl status nginx')}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      systemctl status nginx
                    </button>
                    <button
                      onClick={() => runQuickCommand('df -h')}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      df -h
                    </button>
                    <button
                      onClick={() => runQuickCommand('free -m')}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      free -m
                    </button>
                    <button
                      onClick={() => runQuickCommand('docker ps')}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      docker ps
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl border border-slate-900 text-slate-500">
              No servers configured. Add a Linux Server above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
