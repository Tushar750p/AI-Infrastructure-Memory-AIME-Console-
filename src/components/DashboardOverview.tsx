import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend, PieChart as ReChartsPieChart, Pie } from 'recharts';
import { 
  Server, Activity, AlertTriangle, Cpu, HardDrive, Layers, Clock, 
  AlertCircle, Sparkles, Terminal, Play, FileText, Search, Check, 
  Loader, Download, ChevronRight, X, ShieldAlert, Sparkle, RefreshCw,
  DollarSign, TrendingUp, TrendingDown, UserCheck, Shield, Zap
} from 'lucide-react';
import { LinuxServer, MemoryEvent, DockerContainer } from '../types';

interface DashboardOverviewProps {
  servers: LinuxServer[];
  events: MemoryEvent[];
  containers: DockerContainer[];
  onNavigate: (tab: string) => void;
  onSelectEventForAnalysis: (event: MemoryEvent) => void;
}

export default function DashboardOverview({
  servers,
  events,
  containers,
  onNavigate,
  onSelectEventForAnalysis
}: DashboardOverviewProps) {
  // Executive Persona State
  const [activePersona, setActivePersona] = useState<'ceo' | 'cto' | 'devops' | 'sre' | 'finance'>('sre');

  // Interactive Cloud Cost Optimizer States
  const [costSavingsRecaptured, setCostSavingsRecaptured] = useState<number>(0);
  const [prunedVolumes, setPrunedVolumes] = useState(false);
  const [decomEC2, setDecomEC2] = useState(false);
  const [downsizedRDS, setDownsizedRDS] = useState(false);
  const [cleanedNAT, setCleanedNAT] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null);

  // Quick Actions States
  const [activeAction, setActiveAction] = useState<'deploy' | 'report' | 'search' | null>(null);
  
  // Deploy Simulator
  const [deployService, setDeployService] = useState('auth-service');
  const [deployStep, setDeployStep] = useState<number>(0); // 0: idle, 1: init, 2: build, 3: test, 4: deploy, 5: success
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [localDeployments, setLocalDeployments] = useState<Array<{service: string, version: string, timestamp: string}>>([]);

  // Report Simulator
  const [selectedReportType, setSelectedReportType] = useState('sla');
  const [reportGenerating, setReportGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);

  // Search Simulator
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [isSearchingLogs, setIsSearchingLogs] = useState(false);

  const startDeploymentSimulation = () => {
    if (deployStep > 0) return;
    setDeployStep(1);
    const initialLog = `[${new Date().toLocaleTimeString()}] [INFO] Initializing CI/CD deploy runner pipeline on k8s-us-central-prod...`;
    setDeployLogs([initialLog]);

    const logs = [
      `[${new Date().toLocaleTimeString()}] [INFO] Initializing CI/CD deploy runner pipeline on k8s-us-central-prod...`,
      `[${new Date().toLocaleTimeString()}] [BUILD] Compiling container image for ${deployService} with target SHA: v${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}...`,
      `[${new Date().toLocaleTimeString()}] [TEST] Executing integration testing suite... Passed (42/42 assertions successfully validated)`,
      `[${new Date().toLocaleTimeString()}] [DEPLOY] Updating Kubernetes rolling deployment manifests on namespace: 'core'...`,
      `[${new Date().toLocaleTimeString()}] [SUCCESS] Deployment completed! New pods are healthy and running 2/2 replica states.`
    ];

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep++;
      setDeployStep(currentStep);
      setDeployLogs(prev => [...prev, logs[currentStep - 1]]);
      if (currentStep === 5) {
        clearInterval(interval);
        // Save deployment history
        setLocalDeployments(prev => [
          {
            service: deployService,
            version: `v${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
      }
    }, 1000);
  };

  const startReportSimulation = () => {
    setReportGenerating(true);
    setGeneratedReport(null);
    setTimeout(() => {
      setReportGenerating(false);
      if (selectedReportType === 'sla') {
        setGeneratedReport({
          title: 'SLA Compliance Report (July 2026)',
          metrics: [
            { label: 'Target Uptime SLA', value: '99.99%' },
            { label: 'Calculated SLA Uptime', value: '99.983% (Slight Deviation)' },
            { label: 'Active Warning Events', value: '2' },
            { label: 'Mean Time to Repair (MTTR)', value: '8.2 minutes' },
            { label: 'Primary Incidents Logged', value: '4' }
          ],
          csvContent: `Metric,Value\nTarget Uptime SLA,99.99%\nCalculated SLA Uptime,99.983%\nActive Warning Events,2\nMean Time to Repair (MTTR),8.2 mins\nPrimary Incidents Logged,4`
        });
      } else if (selectedReportType === 'security') {
        setGeneratedReport({
          title: 'SRE System Drift & Security Audit',
          metrics: [
            { label: 'Security Group State Lock', value: 'LOCKED' },
            { label: 'Ingress Port Violations Detected', value: '0 active (1 resolved)' },
            { label: 'SSM Agent Status', value: 'Healthy (100% telemetry online)' },
            { label: 'Unsecured IAM Credential Keys', value: 'None identified' },
            { label: 'HIPAA Validation Check', value: 'PASSED' }
          ],
          csvContent: `Security Check,Status\nSecurity Group State Lock,LOCKED\nIngress Port Violations,0 active\nSSM Agent Status,Healthy 100%\nUnsecured IAM Keys,None\nHIPAA Validation,PASSED`
        });
      } else {
        setGeneratedReport({
          title: 'Resource Capacity Planning Snapshot',
          metrics: [
            { label: 'EKS Compute Cluster Buffer', value: '41.5% Headroom' },
            { label: 'Database IOPS Peak utilization', value: '22% of gp3 baseline' },
            { label: 'Predicted Disk Saturation', value: '184 days remaining' },
            { label: 'Orphaned EBS Volumes found', value: '2 instances (140 GB)' },
            { label: 'Estimated AWS Cost Savings', value: '$240 / month potential' }
          ],
          csvContent: `Capacity metric,Value\nEKS Compute Headroom,41.5%\nDatabase Peak IOPS,22%\nPredicted Disk Saturation,184 days\nOrphaned Volumes,2 instances\nEst AWS Cost Savings,$240/month`
        });
      }
    }, 1200);
  };

  const downloadCSVReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${generatedReport.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeLogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logsSearchQuery.trim()) return;
    setIsSearchingLogs(true);
    setTimeout(() => {
      setIsSearchingLogs(false);
      onNavigate('logs');
    }, 800);
  };

  // Compute metrics
  const totalServers = servers.length;
  const healthyCount = servers.filter(s => s.status === 'healthy').length;
  const warningCount = servers.filter(s => s.status === 'warning').length;
  const criticalCount = servers.filter(s => s.status === 'critical').length;
  
  // Total running containers
  const runningContainers = containers.filter(c => c.status === 'running').length;
  
  // Active incidents are events of type 'incident' that haven't been resolved by a later 'fix'
  // For simplicity, let's show all events of type 'incident' from the last 24 hours or general unresolved alerts.
  const recentIncidents = events.filter(e => e.type === 'incident' && e.severity === 'critical');

  // Prepare chart data - resource trends over time (mocked 6 hour interval)
  const resourceData = [
    { time: '14:00', CPU: 32, RAM: 58, Disk: 60 },
    { time: '15:00', CPU: 45, RAM: 60, Disk: 60 },
    { time: '16:00', CPU: 68, RAM: 64, Disk: 61 },
    { time: '17:00', CPU: 92, RAM: 78, Disk: 62 }, // Spike during nginx incident
    { time: '18:00', CPU: 54, RAM: 71, Disk: 62 },
    { time: '19:00', CPU: 41, RAM: 68, Disk: 62 },
    { time: '20:00', CPU: 38, RAM: 64, Disk: 62 }
  ];

  // Event category counts
  const categoryCounts = events.reduce((acc: { [key: string]: number }, event) => {
    const cat = event.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name.toUpperCase().replace('_', ' '),
    count: value
  }));

  // Average CPU, RAM, Disk
  const validTotalServers = (servers && servers.length > 0) ? servers.length : 1;
  const rawAvgCpu = Math.round(servers.reduce((sum, s) => sum + (Number(s.cpu) || 0), 0) / validTotalServers);
  const avgCpu = isNaN(rawAvgCpu) ? 0 : rawAvgCpu;
  const rawAvgRam = Math.round(servers.reduce((sum, s) => sum + (Number(s.ram) || 0), 0) / validTotalServers);
  const avgRam = isNaN(rawAvgRam) ? 0 : rawAvgRam;
  const rawAvgDisk = Math.round(servers.reduce((sum, s) => sum + (Number(s.disk) || 0), 0) / validTotalServers);
  const avgDisk = isNaN(rawAvgDisk) ? 0 : rawAvgDisk;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-sans font-bold text-white tracking-tight">Infrastructure Core Overview</h1>
          <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">LIVE STATUS MONITORING & INCIDENT MEMORY TRIGGERS</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ENGINE CONNECTED
          </span>
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wide bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-900">
            Role: {activePersona.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Executive Persona Switcher Bar */}
      <div className="bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-mono text-zinc-500 uppercase px-2 tracking-wider">Dashboard Views:</span>
          <button
            onClick={() => setActivePersona('sre')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${activePersona === 'sre' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900'}`}
          >
            SRE Engine View
          </button>
          <button
            onClick={() => setActivePersona('ceo')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${activePersona === 'ceo' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900'}`}
          >
            CEO View
          </button>
          <button
            onClick={() => setActivePersona('cto')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${activePersona === 'cto' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900'}`}
          >
            CTO View
          </button>
          <button
            onClick={() => setActivePersona('devops')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${activePersona === 'devops' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900'}`}
          >
            DevOps View
          </button>
          <button
            onClick={() => setActivePersona('finance')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${activePersona === 'finance' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900'}`}
          >
            Finance / Cost Optimizer
          </button>
        </div>
        <div className="hidden lg:flex items-center gap-2 pr-2 text-[10px] text-zinc-500 font-mono">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Role-Based SRE Intel</span>
        </div>
      </div>

      {/* CEO View */}
      {activePersona === 'ceo' && (
        <div className="space-y-4 text-left">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">CEO Executive Health Scorecard</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 animate-pulse">Global Security Status: SECURE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Service SLA Availability</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">99.983%</div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-400">
                  Target SLA: <span className="font-bold text-white">99.99%</span>. Slight deviation during nginx memory event (mitigated in 8.2 mins).
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Business Revenue Protection</span>
                  <div className="text-2xl font-black text-indigo-400 font-mono">100.0% Protected</div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-400">
                  Daily checkout gateway throughput is <span className="font-bold text-white">Fully Functional</span>. Latency: 12ms.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Corporate Risk Rating</span>
                  <div className="text-2xl font-black text-amber-500 font-mono">LOW RISK</div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-400">
                  Zero active critical blockages. Compliance drift vector is locked and secured.
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block">Strategic AI Action Roadmap (CEO Summary)</span>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                  <p>
                    <strong className="text-white">Active Infrastructure Drift Secured:</strong> AI automatically mitigated 1 non-compliant configuration update in production web security groups. Compliance status is locked.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                  <p>
                    <strong className="text-white">Relational Database Buffer:</strong> RDS Database primary reports 184 days remaining before storage limits reach expansion threshold. No immediate capital cost expenditure is required.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                  <p>
                    <strong className="text-white">Multi-Cloud Budget Recapture:</strong> Cloud cost auditing identified <strong className="text-emerald-400">$506/month</strong> in idle or orphaned multi-cloud assets. Approve optimization inside the Finance tab.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTO View */}
      {activePersona === 'cto' && (
        <div className="space-y-4 text-left">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">CTO Technical Velocity & Compliance</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Compliance Framework: SOC2 Ready</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Mean Time to Repair (MTTR)</span>
                <div className="text-xl font-bold text-zinc-200">8.2 Minutes</div>
                <div className="text-[9px] text-zinc-500 mt-1">Industry standard: 45m (AIME SRE 82% faster)</div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Mean Time to Detect (MTTD)</span>
                <div className="text-xl font-bold text-zinc-200">1.4 Minutes</div>
                <div className="text-[9px] text-zinc-500 mt-1">AI instant ingestion of nginx server anomaly</div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Weekly Deployment Velocity</span>
                <div className="text-xl font-bold text-zinc-200">294 Pipelines</div>
                <div className="text-[9px] text-zinc-500 mt-1">100% rollout stability with 0 pipeline rollbacks</div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Infrastructure Compliance</span>
                <div className="text-xl font-bold text-zinc-200">98.4% drift-immune</div>
                <div className="text-[9px] text-zinc-500 mt-1">1 locked deviation under active supervision</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs pb-1 border-b border-zinc-900">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  AI Predictive Resource Forecasting
                </div>
                <div className="space-y-2.5 text-xs text-zinc-400 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Database disk exhaustion forecast</span>
                    <span className="text-zinc-200">184 days remaining</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next Peak Memory Anomaly Spike</span>
                    <span className="text-amber-400">Friday 15:00 UTC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API Gateway scale-up likelihood</span>
                    <span className="text-zinc-200">92% in next 4 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>EKS container storage headroom</span>
                    <span className="text-emerald-400">41.5% buffer OK</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs pb-1 border-b border-zinc-900">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  SRE Technology Debt Analysis
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-zinc-400 leading-relaxed">
                    No critical technical debt identified. The platform operates on native <strong className="text-white">Terraform configuration standards</strong>. Drift detection acts as a continuous self-healing guardrail.
                  </p>
                  <div className="p-2 rounded bg-zinc-900/40 border border-zinc-800 text-[10px] font-mono text-zinc-500">
                    SRE Recommendation: Automatically downscale secondary Kubernetes namespaces at 20:00 UTC to reclaim $350/mo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DevOps View */}
      {activePersona === 'devops' && (
        <div className="space-y-4 text-left">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">DevOps Pipeline Cockpit & Clusters</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">EKS Node Cluster Group: active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Active Cluster Replicas</span>
                <div className="text-2xl font-black text-white font-mono">3/3 Available</div>
                <p className="text-[10px] text-zinc-500 mt-2">Namespace production-core is fully synced. Ingress controllers running.</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Kubernetes Namespace Quota</span>
                <div className="text-xl font-bold text-zinc-200">CPU: 24 Cores</div>
                <p className="text-[10px] text-zinc-500 mt-2">Allocated memory: 96 GB. Network Policies active (Strict Egress).</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Frequent Alert Restarts</span>
                <div className="text-md font-bold text-amber-400">auth-service-replica-420</div>
                <p className="text-[10px] text-zinc-500 mt-1.5">Restarted once due to a minor memory leak, automatically mitigated via resource quota adjustment.</p>
              </div>
            </div>

            {/* Simulated Deployment */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <span className="text-xs font-bold text-white uppercase block mb-3 font-mono">Trigger Simulated Canary Rollout</span>
              <div className="flex items-center gap-3">
                <select className="text-xs bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500">
                  <option>api-gateway (Namespace: default)</option>
                  <option>auth-service (Namespace: core)</option>
                  <option>payment-processor (Namespace: financial)</option>
                </select>
                <button 
                  onClick={() => {
                    alert("Canary deployment simulated! 10% of traffic shifted to v2.4.3. All telemetry is 100% stable.");
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded cursor-pointer uppercase font-mono"
                >
                  Rollout Canary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance / Cost Optimizer View */}
      {activePersona === 'finance' && (
        <div className="space-y-4 text-left">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cloud Cost Optimizer & Resource Waste Analyst</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Dynamic Optimization Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Total Monthly Cloud Spend</span>
                  <div className="text-3xl font-black text-white font-mono">${22300 - costSavingsRecaptured}</div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-500">
                  Baseline Multi-Cloud Cost: <span className="font-bold text-zinc-300">$22,300/mo</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Cost Savings Recaptured</span>
                  <div className="text-3xl font-black text-emerald-400 font-mono">+{costSavingsRecaptured}/mo</div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-500">
                  Pruned or downsized idle waste assets.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Identified Potential Waste</span>
                  <div className="text-3xl font-black text-amber-500 font-mono">
                    ${506 - costSavingsRecaptured}
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-500">
                  Orphaned EBS volumes, unused gateways, or over-provisioned primary RDS nodes.
                </div>
              </div>
            </div>

            {/* Saving Feedback Toast */}
            {savingFeedback && (
              <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-400 font-mono animate-pulse flex items-center justify-between">
                <span>{savingFeedback}</span>
                <button onClick={() => setSavingFeedback(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-[10px] uppercase">dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cost Allocation Chart */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs pb-1 border-b border-zinc-900">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Multi-Cloud Allocation
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">AWS Core Cloud</span>
                    <span className="text-zinc-300">$14,240 (63.8%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400">Azure Enterprise</span>
                    <span className="text-zinc-300">$4,120 (18.5%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">GCP Compute Engine</span>
                    <span className="text-zinc-300">$2,840 (12.7%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400">Oracle Edge Infrastructure</span>
                    <span className="text-zinc-300">$1,100 (4.9%)</span>
                  </div>
                </div>
              </div>

              {/* Actionable Cost Optimization Grid */}
              <div className="lg:col-span-2 p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                <div className="flex items-center justify-between text-zinc-200 font-bold text-xs pb-1 border-b border-zinc-900">
                  <span>Interactive SRE Spend Recapture Recommendations</span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold text-zinc-400">Click to Optimize</span>
                </div>

                <div className="space-y-2">
                  {/* Recommendation 1: Prune EBS */}
                  <div className="p-3 rounded border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        Prune Detached Virtual Storage Volumes
                        {prunedVolumes && <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded">SUCCESS</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">2 detached EBS volumes (vol-09ea123f, vol-09ea42af) idle for 30 days.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">$14/mo</span>
                      <button
                        onClick={() => {
                          if (prunedVolumes) return;
                          setPrunedVolumes(true);
                          setCostSavingsRecaptured(prev => prev + 14);
                          setSavingFeedback("Pruned 2 detached EBS volumes successfully. Recaptured $14/mo from AWS compute bill.");
                        }}
                        disabled={prunedVolumes}
                        className={`px-3 py-1 text-[11px] rounded font-bold uppercase transition-all cursor-pointer ${prunedVolumes ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {prunedVolumes ? 'Pruned' : 'Prune Assets'}
                      </button>
                    </div>
                  </div>

                  {/* Recommendation 2: Idle EC2 */}
                  <div className="p-3 rounded border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        Decommission Idle Compute Instance
                        {decomEC2 && <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded">SUCCESS</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">srv-nginx-test (i-09f12a3bc) average CPU &lt; 1.2% for 14 continuous days.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">$110/mo</span>
                      <button
                        onClick={() => {
                          if (decomEC2) return;
                          setDecomEC2(true);
                          setCostSavingsRecaptured(prev => prev + 110);
                          setSavingFeedback("Decommissioned idle EC2 test server srv-nginx-test successfully. Recaptured $110/mo from AWS EC2 pool.");
                        }}
                        disabled={decomEC2}
                        className={`px-3 py-1 text-[11px] rounded font-bold uppercase transition-all cursor-pointer ${decomEC2 ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {decomEC2 ? 'Decommed' : 'Decommission'}
                      </button>
                    </div>
                  </div>

                  {/* Recommendation 3: Unused NAT */}
                  <div className="p-3 rounded border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        Decommission Orphaned NAT Gateway
                        {cleanedNAT && <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded">SUCCESS</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">nat-03aa99 has 0 active route table connections across subnets.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">$32/mo</span>
                      <button
                        onClick={() => {
                          if (cleanedNAT) return;
                          setCleanedNAT(true);
                          setCostSavingsRecaptured(prev => prev + 32);
                          setSavingFeedback("Decommissioned redundant VPC NAT gateway successfully. Recaptured $32/mo.");
                        }}
                        disabled={cleanedNAT}
                        className={`px-3 py-1 text-[11px] rounded font-bold uppercase transition-all cursor-pointer ${cleanedNAT ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {cleanedNAT ? 'Removed' : 'Remove NAT'}
                      </button>
                    </div>
                  </div>

                  {/* Recommendation 4: Downsize Overprovisioned RDS */}
                  <div className="p-3 rounded border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        Downscale Over-provisioned Production Database
                        {downsizedRDS && <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded">SUCCESS</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">db-postgres-prod-primary operates at &lt; 8% storage IOPS utilization.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">$350/mo</span>
                      <button
                        onClick={() => {
                          if (downsizedRDS) return;
                          setDownsizedRDS(true);
                          setCostSavingsRecaptured(prev => prev + 350);
                          setSavingFeedback("Database primary downscaled to db.r6g.large safely during maintenance hours. Recaptured $350/mo from AWS RDS bill.");
                        }}
                        disabled={downsizedRDS}
                        className={`px-3 py-1 text-[11px] rounded font-bold uppercase transition-all cursor-pointer ${downsizedRDS ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {downsizedRDS ? 'Downscaled' : 'Downsize RDS'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SRE Engine Dashboard Content */}
      {activePersona === 'sre' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Servers */}
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Linux Servers</span>
            <Server className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-white">{totalServers}</span>
            <span className="text-[10px] text-emerald-400 font-mono">({healthyCount} OK)</span>
          </div>
          <button 
            id="kpi-view-servers"
            onClick={() => onNavigate('servers')}
            className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 mt-1.5 block text-left uppercase tracking-wider cursor-pointer"
          >
            Manage Servers →
          </button>
        </div>

        {/* Card 2: Alerts */}
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Active Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-white">{criticalCount + warningCount}</span>
            <span className="text-[10px] text-red-400 font-mono">({criticalCount} CRIT)</span>
          </div>
          <button 
            id="kpi-view-memory"
            onClick={() => onNavigate('memory')}
            className="text-[9px] font-mono text-red-400 hover:text-red-300 mt-1.5 block text-left uppercase tracking-wider cursor-pointer"
          >
            Inspect Incidents →
          </button>
        </div>

        {/* Card 3: Containers */}
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-12 h-12 bg-violet-500/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Docker Containers</span>
            <Layers className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-white">{containers.length}</span>
            <span className="text-[10px] text-violet-400 font-mono">({runningContainers} Active)</span>
          </div>
          <button 
            id="kpi-view-docker"
            onClick={() => onNavigate('docker')}
            className="text-[9px] font-mono text-violet-400 hover:text-violet-300 mt-1.5 block text-left uppercase tracking-wider cursor-pointer"
          >
            Container Status →
          </button>
        </div>

        {/* Card 4: Hardware Average */}
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Avg Usage</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-200">{avgCpu}%</span>
              <span className="text-[8px] text-zinc-600 font-mono uppercase">CPU</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-200">{avgRam}%</span>
              <span className="text-[8px] text-zinc-600 font-mono uppercase">RAM</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-200">{avgDisk}%</span>
              <span className="text-[8px] text-zinc-600 font-mono uppercase">Disk</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 block mt-1.5 uppercase tracking-wider">SRE Telemetry Live</span>
        </div>
      </div>

      {/* Quick Actions Cockpit */}
      <div className="rounded border border-zinc-800 bg-zinc-950/40 p-4 space-y-4 text-left">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Quick Actions Cockpit</h3>
          </div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Operations Hub</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Action 1: Trigger Deployment */}
          <button 
            id="action-trigger-deploy"
            onClick={() => {
              setActiveAction(activeAction === 'deploy' ? null : 'deploy');
              setDeployStep(0);
              setDeployLogs([]);
            }}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              activeAction === 'deploy' 
                ? 'bg-indigo-600/15 border-indigo-500' 
                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                Trigger Deployment
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 uppercase">v2.4.2</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Execute automatic container rebuild & rolling-update pipelines across active cluster pods.
            </p>
          </button>

          {/* Action 2: Generate Report */}
          <button 
            id="action-generate-report"
            onClick={() => {
              setActiveAction(activeAction === 'report' ? null : 'report');
              setGeneratedReport(null);
              setReportGenerating(false);
            }}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              activeAction === 'report' 
                ? 'bg-violet-600/15 border-violet-500' 
                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                Generate Report
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/10 uppercase">Compliance</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Assemble SLA metrics, security state drift vectors, and active container performance records.
            </p>
          </button>

          {/* Action 3: Search Logs */}
          <button 
            id="action-search-logs"
            onClick={() => {
              setActiveAction(activeAction === 'search' ? null : 'search');
            }}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              activeAction === 'search' 
                ? 'bg-emerald-600/15 border-emerald-500' 
                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                Search Logs
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase">Live Trace</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Scan chronological server outputs, systemd warnings, and docker daemon outputs instantly.
            </p>
          </button>
        </div>

        {/* Expandable Panel for Active Quick Action */}
        {activeAction && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition-all space-y-3">
            {/* Deploy View */}
            {activeAction === 'deploy' && (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-200">Deploy Pipeline Runner Configuration</span>
                  <button 
                    onClick={() => { setActiveAction(null); setDeployStep(0); }}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Target Microservice</label>
                    <select 
                      value={deployService}
                      onChange={(e) => setDeployService(e.target.value)}
                      disabled={deployStep > 0 && deployStep < 5}
                      className="w-full text-xs font-semibold bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="auth-service">auth-service (EKS Namespace: core)</option>
                      <option value="payment-processor">payment-processor (EKS Namespace: financial)</option>
                      <option value="nginx-ingress">nginx-ingress (Ingress Controller Gateway)</option>
                      <option value="api-gateway">api-gateway (Namespace: default)</option>
                    </select>
                    
                    <button
                      onClick={startDeploymentSimulation}
                      disabled={deployStep > 0 && deployStep < 5}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {deployStep > 0 && deployStep < 5 ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Running Deploy Pipeline...
                        </>
                      ) : deployStep === 5 ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Redeploy / Reset
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Trigger Deploy Pipeline
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">Pipeline Execution Streams</span>
                    <div className="rounded bg-black/80 border border-zinc-900 p-3 h-28 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1">
                      {deployLogs.length === 0 ? (
                        <div className="text-zinc-600 text-center py-6 italic">Pipeline idle. Click Trigger to begin SRE deployment validation.</div>
                      ) : (
                        deployLogs.map((log, idx) => (
                          <div key={idx} className={idx === 4 ? 'text-emerald-400 font-bold animate-pulse' : 'text-zinc-300'}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Local Deployment History */}
                {localDeployments.length > 0 && (
                  <div className="pt-2 border-t border-zinc-900">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Session Rollout Logs</span>
                    <div className="flex flex-wrap gap-2">
                      {localDeployments.map((dep, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          Deployed {dep.service} ({dep.version}) at {dep.timestamp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Report View */}
            {activeAction === 'report' && (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-200">Infrastructure Reports Engine</span>
                  <button 
                    onClick={() => { setActiveAction(null); setGeneratedReport(null); }}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Report Category</label>
                    <select 
                      value={selectedReportType}
                      onChange={(e) => { setSelectedReportType(e.target.value); setGeneratedReport(null); }}
                      className="w-full text-xs font-semibold bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="sla">SLA Compliance Report</option>
                      <option value="security">System Drift & Security Audit</option>
                      <option value="capacity">Resource Capacity Planning</option>
                    </select>

                    <button
                      onClick={startReportSimulation}
                      disabled={reportGenerating}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {reportGenerating ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Gathering SRE telemetry...
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          Generate Report Now
                        </>
                      )}
                    </button>
                  </div>

                  <div className="md:col-span-8">
                    {generatedReport ? (
                      <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3 space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">{generatedReport.title}</span>
                          <button
                            onClick={downloadCSVReport}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono border border-zinc-700 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Download CSV
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {generatedReport.metrics.map((m: any, idx: number) => (
                            <div key={idx} className="p-2 rounded bg-zinc-950 border border-zinc-900 text-left">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase block">{m.label}</span>
                              <span className="text-xs font-bold text-zinc-200 block mt-0.5">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : reportGenerating ? (
                      <div className="h-28 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                        <Loader className="w-5 h-5 animate-spin text-violet-500" />
                        <span>Querying AWS cloud logs and Kubernetes daemonset states...</span>
                      </div>
                    ) : (
                      <div className="h-28 flex items-center justify-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded bg-zinc-900/5">
                        Select a category and click generate to populate compliance matrices.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search View */}
            {activeAction === 'search' && (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-200">Log Query & Analysis Engine</span>
                  <button 
                    onClick={() => setActiveAction(null)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={executeLogSearch} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search log trace stream (e.g., 'OutOfMemory', 'connection refused', 'syslog error')..."
                      value={logsSearchQuery}
                      onChange={(e) => setLogsSearchQuery(e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded pl-9 pr-3 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingLogs || !logsSearchQuery.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    {isSearchingLogs ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Terminal className="w-3.5 h-3.5" />
                        Analyze Stream Logs
                      </>
                    )}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Suggested telemetry keywords:</span>
                  {['SIGSEGV', 'upstream timed out', 'PostgreSQL database', 'rebooting'].map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setLogsSearchQuery(kw)}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Graphs & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recharts Resource Utilization Trend */}
        <div className="lg:col-span-2 rounded border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Cluster Resource Utilization (Last 6 Hours)
            </h3>
            <span className="text-[9px] font-mono text-zinc-500">REAL-TIME DATA FEED</span>
          </div>
          <div className="h-56 text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourceData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5' }} />
                <Legend />
                <Area type="monotone" dataKey="CPU" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="RAM" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRam)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Events Distribution */}
        <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              Memory Categories Distribution
            </h3>
          </div>
          <div className="h-56 text-[10px] font-mono">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600">
                No telemetry distribution found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Incidents Feed & AI Diagnosis Trigger */}
      <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-zinc-200">Active High Severity Incidents ({recentIncidents.length})</h3>
          </div>
          <button 
            id="view-all-incidents"
            onClick={() => onNavigate('memory')}
            className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            View Memory Timeline
          </button>
        </div>

        <div className="space-y-2">
          {recentIncidents.length > 0 ? (
            recentIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className="p-3 rounded border border-red-500/20 bg-red-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-red-500/30 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-red-400/10 text-red-400 border border-red-400/20 uppercase">
                      {incident.category || 'incident'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(incident.timestamp).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 underline decoration-indigo-500/30">
                      Node: {incident.serverName}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200">{incident.message}</h4>
                  <p className="text-[11px] text-zinc-400 leading-normal max-w-3xl">{incident.details}</p>
                </div>
                <button
                  onClick={() => onSelectEventForAnalysis(incident)}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-600/15 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer self-end md:self-center"
                >
                  <Sparkles className="w-3 h-3" /> Ask AI Fix
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 rounded border border-dashed border-zinc-800 text-center text-zinc-500 text-xs">
              🎉 No active critical incidents in progress! All Linux servers running normally.
            </div>
          )}
        </div>
      </div>

      {/* SRE Memory Terminal Feed logs */}
      <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <h3 className="text-xs font-bold text-zinc-200">Recent SRE Operational Logs (Chronological Stream)</h3>
          </div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Trace Feed</span>
        </div>
        <div className="rounded bg-zinc-950/80 border border-zinc-800 p-3 font-mono text-xs text-zinc-400 space-y-1.5 max-h-40 overflow-y-auto">
          {events.slice(0, 5).map((e) => {
            let typeColor = 'text-blue-400';
            if (e.type === 'incident') typeColor = 'text-red-400 font-bold';
            if (e.type === 'fix') typeColor = 'text-emerald-400';
            if (e.type === 'command') typeColor = 'text-indigo-400';
            if (e.type === 'config') typeColor = 'text-yellow-400';

            return (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 py-0.5 border-b border-zinc-800/40 last:border-0">
                <span className="text-zinc-600 flex-shrink-0">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
                <span className={`uppercase text-[9px] tracking-wide flex-shrink-0 w-14 ${typeColor}`}>
                  {e.type}
                </span>
                <span className="text-zinc-500 flex-shrink-0 underline">@{e.serverName}:</span>
                <span className="text-zinc-200">{e.message}</span>
                <span className="text-zinc-600 text-[9px] ml-auto">({e.user})</span>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
