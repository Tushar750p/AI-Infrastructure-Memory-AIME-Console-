import React, { useState } from 'react';
import { 
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  ArrowLeftRight, FileCode, Layers, Shield, RefreshCw, Eye, Sparkles, History
} from 'lucide-react';

interface TimeState {
  label: string;
  timestamp: string;
  snapshotId: string;
  changedBy: string;
  description: string;
  resourcesCount: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  details: {
    terraform: string;
    docker: string;
    k8s: string;
    iam: string;
    env: string;
  };
}

const HISTORICAL_STATES: TimeState[] = [
  {
    label: "Current State (De-stabilized)",
    timestamp: "2026-07-16T10:00:00Z",
    snapshotId: "snap-c98f12",
    changedBy: "monitoring_bot",
    description: "Postgres high disk usage and Redis container memory constraints. Upstream gateway timeouts warning.",
    resourcesCount: 42,
    healthStatus: 'critical',
    details: {
      terraform: `resource "aws_security_group" "db_sg" {
  name        = "db-security-group"
  description = "Access to Primary DB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # WARNING: Wildcard ingress access added
  }
}`,
      docker: `version: '3.8'
services:
  redis-cache:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    # missing memory limits
    restart: always`,
      k8s: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana-dashboard
  namespace: logging
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: kibana-dashboard
        image: kibana:8.8.0
        env:
        - name: ELASTICSEARCH_HOSTS
          value: "http://elasticsearch-cluster-0.logging.svc:9200"
        # missing liveness probe config`,
      iam: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`,
      env: `PORT=3000
DB_HOST=10.0.2.10
REDIS_URL=redis://10.0.1.45:6379
DEBUG=true
API_SECRET_KEY=unencrypted_raw_string_in_env_variable`
    }
  },
  {
    label: "1 Hour Ago (Pre-Incident)",
    timestamp: "2026-07-16T09:00:00Z",
    snapshotId: "snap-981fa1",
    changedBy: "devops_alex",
    description: "Nginx connections reconfigured. Background scraper daemon active.",
    resourcesCount: 42,
    healthStatus: 'healthy',
    details: {
      terraform: `resource "aws_security_group" "db_sg" {
  name        = "db-security-group"
  description = "Access to Primary DB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}`,
      docker: `version: '3.8'
services:
  redis-cache:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 1024M
    restart: always`,
      k8s: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana-dashboard
  namespace: logging
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: kibana-dashboard
        image: kibana:8.8.0
        livenessProbe:
          httpGet:
            path: /api/status
            port: 5601
          initialDelaySeconds: 120`,
      iam: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:*"
      ],
      "Resource": "*"
    }
  ]
}`,
      env: `PORT=3000
DB_HOST=10.0.2.10
REDIS_URL=redis://10.0.1.45:6379
DEBUG=false`
    }
  },
  {
    label: "Yesterday (Stable baseline)",
    timestamp: "2026-07-15T12:00:00Z",
    snapshotId: "snap-412f82",
    changedBy: "sre_sarah",
    description: "Golden deployment version v2.4.0 active. All probes green, latencies under 50ms.",
    resourcesCount: 40,
    healthStatus: 'healthy',
    details: {
      terraform: `resource "aws_security_group" "db_sg" {
  name        = "db-security-group"
  description = "Access to Primary DB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}`,
      docker: `version: '3.8'
services:
  redis-cache:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 1024M
    restart: always`,
      k8s: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana-dashboard
  namespace: logging
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: kibana-dashboard
        image: kibana:8.8.0
        livenessProbe:
          httpGet:
            path: /api/status
            port: 5601
          initialDelaySeconds: 120`,
      iam: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:*"
      ],
      "Resource": "*"
    }
  ]
}`,
      env: `PORT=3000
DB_HOST=10.0.2.10
REDIS_URL=redis://10.0.1.45:6379
DEBUG=false`
    }
  },
  {
    label: "Last Week (Pre-Migration State)",
    timestamp: "2026-07-09T08:00:00Z",
    snapshotId: "snap-a82f34",
    changedBy: "sysadmin_clara",
    description: "Database storage limits standard. No multi-region clustering enabled.",
    resourcesCount: 38,
    healthStatus: 'healthy',
    details: {
      terraform: `resource "aws_security_group" "db_sg" {
  name        = "db-security-group"
  description = "Access to Primary DB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}`,
      docker: `version: '3.8'
services:
  redis-cache:
    image: redis:6.2-alpine
    ports:
      - "6379:6379"
    restart: always`,
      k8s: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana-dashboard
  namespace: logging
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: kibana-dashboard
        image: kibana:7.17.0`,
      iam: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*"
      ],
      "Resource": "*"
    }
  ]
}`,
      env: `PORT=3000
DB_HOST=10.0.2.10
DEBUG=false`
    }
  }
];

export default function InfrastructureTimeMachine() {
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState<number>(1); // Default to Yesterday/1 Hour ago
  const [selectedSnapshotIdx, setSelectedSnapshotIdx] = useState<number>(2); // Default to Yesterday
  const [activeConfigTab, setActiveConfigTab] = useState<'terraform' | 'docker' | 'k8s' | 'iam' | 'env'>('terraform');
  const [isSimulatingReplay, setIsSimulatingReplay] = useState(false);
  const [replayLog, setReplayLog] = useState<string[]>([]);

  // Dynamic current state state to support live interactive healing
  const [currentSnapshot, setCurrentSnapshot] = useState<TimeState>({
    ...HISTORICAL_STATES[0],
    details: { ...HISTORICAL_STATES[0].details }
  });
  const [isDriftResolved, setIsDriftResolved] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const selectedSnapshot = HISTORICAL_STATES[selectedSnapshotIdx];

  const handleStartReplay = () => {
    setIsSimulatingReplay(true);
    setReplayLog([]);
    const logs = [
      "🔄 Initializing Time Machine replayer daemon on AIME workspace...",
      `📍 Mounting snapshot ${selectedSnapshot.snapshotId} (${selectedSnapshot.label})...`,
      "🔎 Reading cloud inventory mappings & resource states...",
      "⚙️ Recomputing local virtualization environment parameters...",
      "🧪 Replaying 14 connected DevOps actions sequentially...",
      "🛠️ Simulating Nginx configuration rollback in dev namespace...",
      "✔️ Replay simulation completed! Sandbox environment matches historical state perfectly."
    ];
    
    logs.forEach((log, idx) => {
      setTimeout(() => {
        setReplayLog(prev => [...prev, log]);
        if (idx === logs.length - 1) {
          setIsSimulatingReplay(false);
        }
      }, (idx + 1) * 700);
    });
  };

  // Helper to generate a colored diff for configurations
  const renderConfigDiff = () => {
    const textA = selectedSnapshot.details[activeConfigTab];
    const textB = currentSnapshot.details[activeConfigTab];

    const linesA = textA.split('\n');
    const linesB = textB.split('\n');

    const maxLines = Math.max(linesA.length, linesB.length);
    const diffElements: React.ReactNode[] = [];

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i] || '';
      const lineB = linesB[i] || '';

      if (lineA === lineB) {
        diffElements.push(
          <div key={i} className="grid grid-cols-12 font-mono text-[11px] py-0.5 border-b border-zinc-900 text-zinc-400">
            <span className="col-span-1 text-[9px] text-zinc-600 select-none text-right pr-2">{i+1}</span>
            <span className="col-span-1 text-[9px] text-zinc-600 select-none text-right pr-2">{i+1}</span>
            <span className="col-span-10 pl-3 whitespace-pre">{lineA}</span>
          </div>
        );
      } else {
        // Red (Deleted / Historical)
        if (linesA[i] !== undefined) {
          diffElements.push(
            <div key={`del-${i}`} className="grid grid-cols-12 font-mono text-[11px] py-0.5 border-b border-zinc-900 bg-red-950/20 text-red-400/90">
              <span className="col-span-1 text-[9px] text-red-700/60 select-none text-right pr-2">{i+1}</span>
              <span className="col-span-1 text-[9px] text-zinc-700 select-none text-right pr-2">-</span>
              <span className="col-span-10 pl-3 whitespace-pre bg-red-950/10">- {lineA}</span>
            </div>
          );
        }
        // Green (Added / Current)
        if (linesB[i] !== undefined) {
          diffElements.push(
            <div key={`add-${i}`} className="grid grid-cols-12 font-mono text-[11px] py-0.5 border-b border-zinc-900 bg-emerald-950/20 text-emerald-400/95">
              <span className="col-span-1 text-[9px] text-zinc-700 select-none text-right pr-2">-</span>
              <span className="col-span-1 text-[9px] text-emerald-700/60 select-none text-right pr-2">{i+1}</span>
              <span className="col-span-10 pl-3 whitespace-pre bg-emerald-950/10">+ {lineB}</span>
            </div>
          );
        }
      }
    }

    return (
      <div className="rounded-lg border border-zinc-900 bg-zinc-950 overflow-hidden divide-y divide-zinc-900">
        <div className="bg-zinc-900/40 px-4 py-2.5 flex items-center justify-between border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-red-950/40 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">
              {selectedSnapshot.label}
            </span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[10px] font-mono uppercase bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
              Current Active Configuration
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Config: {activeConfigTab.toUpperCase()}</span>
        </div>
        <div className="p-2 max-h-[400px] overflow-y-auto bg-zinc-950/90 flex flex-col">
          {diffElements}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Platform Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5.5 h-5.5 text-indigo-400" />
            Infrastructure Time Machine & Configuration Diff
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Travel back across operational snapshots, analyze environment drift, and compare exact Terraform, Docker, and K8s configuration files with green/yellow/red tracking.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 rounded bg-zinc-900 px-2 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Snapshot System Active
          </span>
        </div>
      </div>

      {/* Snapshot Time Slider Grid */}
      <div className="p-4 bg-zinc-900/25 border border-zinc-900 rounded-xl space-y-4">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest pl-1">
          Select Historical Destination Snapshot
        </h3>
        
        {/* Visual Slider/Track Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {HISTORICAL_STATES.map((state, idx) => (
            <button
              key={idx}
              id={`snapshot-select-${idx}`}
              onClick={() => {
                if (idx !== 0) {
                  setSelectedSnapshotIdx(idx);
                  setIsDriftResolved(false);
                  setCurrentSnapshot({
                    ...HISTORICAL_STATES[0],
                    details: { ...HISTORICAL_STATES[0].details }
                  });
                }
              }}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                idx === 0 
                  ? 'border-red-900/30 bg-red-950/5 cursor-not-allowed opacity-80'
                  : selectedSnapshotIdx === idx
                    ? 'border-indigo-500 bg-indigo-950/15 text-white'
                    : 'border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {idx === 0 ? "LIVE STATE" : `SNAPSHOT #${idx}`}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  state.healthStatus === 'healthy' 
                    ? 'bg-emerald-400' 
                    : state.healthStatus === 'warning' 
                      ? 'bg-amber-400' 
                      : 'bg-red-400'
                }`} />
              </div>
              <div className="text-xs font-bold truncate">{state.label}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{state.timestamp.split('T')[0]} @ {state.timestamp.split('T')[1].replace('Z', '')}</div>
              <p className="text-[10px] line-clamp-1 text-zinc-500 mt-2 font-mono">By: @{state.changedBy}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Replayer & Comparator Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Historical Stats and Time Replay */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950 space-y-4">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" /> Target Snapshot Info
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Snapshot Reference:</span>
                <span className="font-mono text-zinc-200">{selectedSnapshot.snapshotId}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Committed By Operator:</span>
                <span className="text-zinc-200 font-medium">@{selectedSnapshot.changedBy}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Operational Impact:</span>
                <span className="text-zinc-300 font-sans">{selectedSnapshot.description}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Active Resources Count:</span>
                <span className="text-indigo-400 font-mono font-bold text-sm">{selectedSnapshot.resourcesCount} cloud assets</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-900">
              <button
                onClick={handleStartReplay}
                disabled={isSimulatingReplay}
                className="w-full py-2 px-4 rounded bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSimulatingReplay ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Simulating Time Replay...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-white" />
                    Simulate Time Replay & Sync State
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Replay Simulation Outputs */}
          {(isSimulatingReplay || replayLog.length > 0) && (
            <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950 space-y-2">
              <h4 className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Replay Log Daemon output
              </h4>
              <div className="rounded bg-zinc-950 p-3 font-mono text-[10px] text-zinc-400 space-y-1.5 max-h-[180px] overflow-y-auto">
                {replayLog.map((log, idx) => (
                  <div key={idx} className="transition-all duration-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drift Alert Summary */}
          {isDriftResolved ? (
            <div className="p-4 rounded-xl border border-emerald-950/30 bg-emerald-950/5 space-y-3">
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-200">Configuration Drift Restored</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    AIME active reconciliation successfully verified that all configurations match snapshot <span className="font-mono text-emerald-400">{selectedSnapshot.snapshotId}</span> perfectly. No vulnerability alarms are active.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-red-950/30 bg-red-950/5 space-y-3">
              <div className="flex gap-2 items-start">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-200">AI Drift & Security Risks</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    AIME Drift detection identified 3 configuration modifications that violate CIS Hardening Guides in the current live state compared to snapshot <span className="font-mono text-indigo-400">{selectedSnapshot.snapshotId}</span>.
                  </p>
                </div>
              </div>
              
              <div className="space-y-1.5 pl-6 font-mono text-[10px] text-zinc-400">
                <div className="flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-3 h-3 text-red-400" /> IP Ingress Allowed: CIDR 0.0.0.0/0 on port 5432
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Missing memory boundaries in redis-cache.yaml
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Sensitive key API_SECRET_KEY in raw ENV
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Config Diff Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex border-b border-zinc-900 gap-1 overflow-x-auto">
            {(['terraform', 'docker', 'k8s', 'iam', 'env'] as const).map((tab) => (
              <button
                key={tab}
                id={`diff-tab-${tab}`}
                onClick={() => setActiveConfigTab(tab)}
                className={`px-4 py-2 border-b-2 text-xs font-mono transition-all cursor-pointer ${
                  activeConfigTab === tab
                    ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-950/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'terraform' && <FileCode className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'docker' && <Layers className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'k8s' && <Layers className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'iam' && <Shield className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'env' && <FileCode className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {renderConfigDiff()}

          {/* Quick AI Rollback Proposal Card */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Generate AI Rollback script?</h4>
                <p className="text-[10px] text-zinc-500">Produce Terraform command sequences to sync live state back to selected safe point.</p>
              </div>
            </div>
            {isDriftResolved ? (
              <span className="py-1.5 px-3 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> State Synchronized
              </span>
            ) : (
              <button 
                onClick={() => setIsCopilotOpen(true)}
                className="py-1.5 px-3 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 text-zinc-300 hover:text-white text-[10px] font-mono cursor-pointer transition-all"
              >
                Analyze with DevOps Copilot
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SRE DevOps Copilot Dialog Modal */}
      {isCopilotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 text-left">
            <div className="flex justify-between items-start border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">AIME DevOps Copilot Reconciliation Plan</h3>
              </div>
              <button 
                onClick={() => setIsCopilotOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded text-xs text-indigo-300">
                <strong>Intelligence Insight:</strong> AIME identified that the live state has deviated from snapshot <span className="font-mono text-white">{selectedSnapshot.snapshotId}</span>. The proposed plan contains exact git-based remediation commits.
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Proposed Commit Log</h4>
                <div className="rounded bg-zinc-900/60 p-3.5 space-y-3.5 border border-zinc-900">
                  <div className="text-xs">
                    <span className="font-mono text-red-400 text-[10px] block font-bold">1. SEC_REVERT_INGRESS (Terraform)</span>
                    <p className="text-zinc-400 mt-1">Reverts the security group wildcard rule <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px] text-zinc-300">0.0.0.0/0</code> back to the internal VPC CIDR block <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px] text-zinc-300">10.0.0.0/16</code> on PostgreSQL port 5432.</p>
                  </div>
                  <div className="text-xs border-t border-zinc-800/60 pt-3">
                    <span className="font-mono text-yellow-400 text-[10px] block font-bold">2. STABILIZE_DOCKER_LIMITS (Docker)</span>
                    <p className="text-zinc-400 mt-1">Restores resource constraints of <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px] text-zinc-300">limits: {`{ memory: 1024M }`}</code> on the redis-cache compose stack.</p>
                  </div>
                  <div className="text-xs border-t border-zinc-800/60 pt-3">
                    <span className="font-mono text-emerald-400 text-[10px] block font-bold">3. ENFORCE_HEALTHCHECK_POLICIES (K8s)</span>
                    <p className="text-zinc-400 mt-1">Applies standard liveness probes & startup delays in kibana-dashboard config to prevent CrashLoopBackOff restarts.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
              <button 
                onClick={() => setIsCopilotOpen(false)}
                className="px-3.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                Discard
              </button>
              <button 
                onClick={() => {
                  // Simulate applying the configuration healing
                  setCurrentSnapshot(prev => ({
                    ...prev,
                    healthStatus: 'healthy',
                    details: { ...selectedSnapshot.details }
                  }));
                  setIsDriftResolved(true);
                  setIsCopilotOpen(false);
                }}
                className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apply Drift Resolution & Heal State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
