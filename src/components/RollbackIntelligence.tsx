import React, { useState } from 'react';
import { 
  ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, UserCheck, 
  HelpCircle, Terminal, Cpu, Clock, Layers, Sparkles, Plus, History
} from 'lucide-react';

interface GoldenConfig {
  id: string;
  name: string;
  type: 'golden' | 'rollback-safe' | 'stable-staging';
  version: string;
  approvedBy: string;
  approvedAt: string;
  reason: string;
  riskScore: 'low' | 'medium' | 'high';
  successProbability: number;
  rollbackSteps: string[];
}

const INITIAL_GOLDEN_CONFIGS: GoldenConfig[] = [
  {
    id: 'gold-01',
    name: 'Production Core Golden State',
    type: 'golden',
    version: 'v2.4.0',
    approvedBy: 'sre_sarah',
    approvedAt: '2026-07-15T08:00:00Z',
    reason: 'Fully completed load testing with 10k RPS. Zero OOM errors, average response time 38ms.',
    riskScore: 'low',
    successProbability: 99,
    rollbackSteps: [
      "git checkout tags/v2.4.0",
      "terraform apply -var='app_version=v2.4.0' -auto-approve",
      "kubectl rollout status deployment/auth-service -n core",
      "docker-compose -f docker-compose.prod.yml up -d --force-recreate redis-cache"
    ]
  },
  {
    id: 'gold-02',
    name: 'Rollback Recovery Point',
    type: 'rollback-safe',
    version: 'v2.3.9',
    approvedBy: 'sysadmin_clara',
    approvedAt: '2026-07-12T14:30:00Z',
    reason: 'Pre-kernel-migration backup. Verified database schema compatibility.',
    riskScore: 'low',
    successProbability: 95,
    rollbackSteps: [
      "git checkout tags/v2.3.9",
      "terraform apply -var='app_version=v2.3.9' -auto-approve",
      "kubectl rollout undo deployment/frontend-portal"
    ]
  },
  {
    id: 'gold-03',
    name: 'Staging Baseline Safe State',
    type: 'stable-staging',
    version: 'v2.5.0-rc3',
    approvedBy: 'devops_alex',
    approvedAt: '2026-07-10T11:20:00Z',
    reason: 'Staging environment validated against standard automated integration suites.',
    riskScore: 'medium',
    successProbability: 85,
    rollbackSteps: [
      "git checkout tags/v2.5.0-rc3",
      "helm rollback frontend-portal-staging 3"
    ]
  }
];

export default function RollbackIntelligence() {
  const [goldenConfigs, setGoldenConfigs] = useState<GoldenConfig[]>(INITIAL_GOLDEN_CONFIGS);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('gold-01');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  
  // Custom Known Good configuration creation modal state
  const [isAdding, setIsAdding] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigType, setNewConfigType] = useState<'golden' | 'rollback-safe' | 'stable-staging'>('golden');
  const [newConfigVersion, setNewConfigVersion] = useState('v2.4.1');
  const [newConfigApprover, setNewConfigApprover] = useState('sre_operator');
  const [newConfigReason, setNewConfigReason] = useState('');

  const selectedConfig = goldenConfigs.find(c => c.id === selectedConfigId) || goldenConfigs[0];

  const handleAddNewConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfigName || !newConfigReason) return;

    const newConfig: GoldenConfig = {
      id: `gold-${Date.now()}`,
      name: newConfigName,
      type: newConfigType,
      version: newConfigVersion,
      approvedBy: newConfigApprover,
      approvedAt: new Date().toISOString(),
      reason: newConfigReason,
      riskScore: 'low',
      successProbability: 94,
      rollbackSteps: [
        `git checkout tags/${newConfigVersion}`,
        `terraform apply -var='app_version=${newConfigVersion}' -auto-approve`
      ]
    };

    setGoldenConfigs(prev => [newConfig, ...prev]);
    setSelectedConfigId(newConfig.id);
    setIsAdding(false);
    
    // Push configuration approval to persistent compliance audit log!
    fetch('/api/alerts/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: newConfigApprover,
        role: 'SRE Operator',
        action: `Approve Configuration Profile: ${newConfigName}`,
        result: `Successfully approved baseline schema version ${newConfigVersion}.`,
        auditEntry: `Operator ${newConfigApprover} approved new configuration state profile "${newConfigName}" (Version ${newConfigVersion}) with reason: "${newConfigReason}".`,
        ip: '127.0.0.1',
        severity: 'INFO',
        category: 'COMPLIANCE'
      })
    }).catch(err => console.error('Failed to log config approval:', err));

    // Reset form states
    setNewConfigName('');
    setNewConfigReason('');
  };

  const handleTriggerRollback = () => {
    setIsExecuting(true);
    setExecutionOutput([]);

    // Push rollback execution to persistent compliance audit log!
    fetch('/api/alerts/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: selectedConfig.approvedBy || 'sysadmin_clara',
        role: 'Senior SRE Operator',
        action: `Execute SRE Rollback Recovery`,
        result: `Successfully rolled back infrastructure to golden state ${selectedConfig.name} (${selectedConfig.version}).`,
        auditEntry: `Initiated cluster rollback recovery script to target version ${selectedConfig.version}. Steps executed: ${selectedConfig.rollbackSteps.join(' && ')}.`,
        ip: '127.0.0.1',
        severity: 'CRITICAL',
        category: 'INFRA'
      })
    }).catch(err => console.error('Failed to log config rollback:', err));
    
    const logs = [
      "🛡️ Initiating Rollback Intelligence Engine...",
      `📍 Selected Golden target: ${selectedConfig.name} (${selectedConfig.version})`,
      `🧬 Pre-calculating rollback success index: ${selectedConfig.successProbability}% Success Probability.`,
      "🔒 Verification Check: DB schemas match golden definition... PASS",
      "⏳ Initiating target resource rollbacks...",
      ...selectedConfig.rollbackSteps.map(step => `💻 Executing shell: \`${step}\``),
      "🔄 Reloading Nginx daemon & clearing upstream socket pool caches...",
      "✔️ Rollback state validated successfully! High priority alerts cancelled on-call."
    ];

    logs.forEach((log, idx) => {
      setTimeout(() => {
        setExecutionOutput(prev => [...prev, log]);
        if (idx === logs.length - 1) {
          setIsExecuting(false);
        }
      }, (idx + 1) * 600);
    });
  };

  return (
    <div className="space-y-6">
      {/* Platform Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-emerald-400" />
            Rollback Intelligence & Known Good Configurations
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain an audit history of golden baseline deployments, predict restore risk profiles, and simulate automated system-wide rolls to guaranteed uptime states.
          </p>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow cursor-pointer transition-all flex items-center gap-1.5 self-start"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          Mark Known Good Config
        </button>
      </div>

      {/* Creation Modal form */}
      {isAdding && (
        <form onSubmit={handleAddNewConfig} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Register Golden Baseline Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Configuration Name:</label>
              <input
                type="text"
                placeholder="e.g., Post-patch verified database cluster"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Deployment Version Tag:</label>
              <input
                type="text"
                placeholder="e.g., v2.4.1"
                value={newConfigVersion}
                onChange={(e) => setNewConfigVersion(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Config classification:</label>
              <select
                value={newConfigType}
                onChange={(e) => setNewConfigType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded text-xs py-1.5 px-2 text-zinc-300"
              >
                <option value="golden">Golden Production State</option>
                <option value="rollback-safe">Rollback Safe Backup</option>
                <option value="stable-staging">Staging Verified Baseline</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Approving SRE Operator Name:</label>
              <input
                type="text"
                placeholder="e.g., sre_sarah"
                value={newConfigApprover}
                onChange={(e) => setNewConfigApprover(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase">Approval justification / Verification notes:</label>
            <textarea
              rows={2}
              placeholder="List tests ran, CPU benchmarks, or reasoning why this is a robust state."
              value={newConfigReason}
              onChange={(e) => setNewConfigReason(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-xs text-zinc-400 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Register Stable Configuration
            </button>
          </div>
        </form>
      )}

      {/* Golden configurations dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Configuration registry list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-zinc-900/25 border border-zinc-900 rounded-xl space-y-3.5">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <History className="w-4 h-4 text-emerald-400" /> Safe Baseline Registry
            </h3>

            <div className="space-y-2">
              {goldenConfigs.map((config) => (
                <button
                  key={config.id}
                  id={`config-item-${config.id}`}
                  onClick={() => setSelectedConfigId(config.id)}
                  className={`w-full p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedConfigId === config.id
                      ? 'border-emerald-500 bg-emerald-950/10 text-white'
                      : 'border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded ${
                      config.type === 'golden' 
                        ? 'bg-amber-950/40 border border-amber-500/20 text-amber-400' 
                        : config.type === 'rollback-safe'
                          ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'
                          : 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-400'
                    }`}>
                      {config.type}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{config.version}</span>
                  </div>

                  <div className="text-xs font-bold truncate">{config.name}</div>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1 font-mono">By: @{config.approvedBy}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Active intelligence details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
              <div className="flex gap-2.5 items-center">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{selectedConfig.name}</h3>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Target version: {selectedConfig.version}</span>
                </div>
              </div>

              {/* Confidence Predictor Meter */}
              <div className="flex gap-2.5 items-center self-start bg-zinc-900/40 border border-zinc-800 p-2.5 rounded-lg">
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 font-mono block uppercase">Success probability</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{selectedConfig.successProbability}% SAFE</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 shadow-sm shadow-emerald-500/10">
                  9.9
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-zinc-900/15 border border-zinc-900 rounded-lg">
                <span className="text-zinc-500 block text-[9px] uppercase mb-1">Approved SRE:</span>
                <span className="text-zinc-200 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> @{selectedConfig.approvedBy}
                </span>
              </div>
              <div className="p-3 bg-zinc-900/15 border border-zinc-900 rounded-lg col-span-2">
                <span className="text-zinc-500 block text-[9px] uppercase mb-1">Authorization Timestamp:</span>
                <span className="text-zinc-300">
                  {new Date(selectedConfig.approvedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-zinc-500 text-[10px] font-mono uppercase block">Verification notes / Uptime Justification:</span>
              <p className="text-xs text-zinc-300 bg-zinc-900/20 p-3 rounded border border-zinc-900 leading-relaxed font-sans">
                {selectedConfig.reason}
              </p>
            </div>

            {/* Steps execution preview */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-[10px] font-mono uppercase">Calculated Rollback Command Script:</span>
                <span className="text-[9px] font-mono text-zinc-600">4 automated operations detected</span>
              </div>

              <div className="rounded-lg border border-zinc-900 bg-zinc-950 overflow-hidden divide-y divide-zinc-900">
                <div className="bg-zinc-900/40 px-3 py-1.5 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>Terminal Automation Shell</span>
                  <span className="text-zinc-600">sh -e</span>
                </div>
                <div className="p-3 bg-zinc-950/80 space-y-1.5">
                  {selectedConfig.rollbackSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex gap-2.5 font-mono text-[11px] text-zinc-300">
                      <span className="text-zinc-700 select-none">{sIdx + 1}</span>
                      <span className="text-indigo-400 font-bold">$</span>
                      <span className="whitespace-pre truncate">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action triggering */}
            <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-2 items-center">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-zinc-500 font-sans">
                  Rollback execution updates central cloud endpoints dynamically. Verify load balancer connections before trigger.
                </p>
              </div>

              <button
                onClick={handleTriggerRollback}
                disabled={isExecuting}
                className="py-2 px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center uppercase font-mono tracking-wider"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    Deploy Golden Config
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Execution Output console */}
          {(isExecuting || executionOutput.length > 0) && (
            <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950 space-y-2">
              <h4 className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" /> DevOps Deployer Console output
              </h4>
              <div className="rounded bg-zinc-950 p-4 font-mono text-[10px] text-zinc-400 space-y-1.5 max-h-[180px] overflow-y-auto border border-zinc-900">
                {executionOutput.map((log, idx) => (
                  <div key={idx} className="transition-all duration-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
