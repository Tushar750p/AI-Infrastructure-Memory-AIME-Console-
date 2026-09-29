import React, { useState, useEffect } from 'react';
import { 
  Compass, RefreshCw, Server, Cpu, Layers, Database, Shield, 
  Cloud, HardDrive, Radio, Activity, Terminal, Key, FileCode, CheckCircle2,
  AlertCircle, Search, Calendar, User, Eye, ArrowRight, ToggleLeft, ToggleRight, List, Lock,
  Wifi, WifiOff, Settings2, Database as DbIcon, GitBranch, Plus, X, Globe, GitPullRequest, Slack
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'warning' | 'critical' | 'synced' | 'drifted' | 'failed';
  category: 'aws' | 'azure' | 'gcp' | 'k8s' | 'docker' | 'linux' | 'terraform' | 'github_gitlab' | 'oracle' | 'digitalocean' | 'vmware' | 'jira' | 'slack_teams';
  details: Record<string, string | number | boolean | string[]>;
}

interface IntegrationItem {
  id: string;
  provider: string;
  name: string;
  status: 'connected' | 'disconnected';
  connectedAt?: string;
  connectedResources: number;
  syncStatus: 'synced' | 'failed' | 'syncing';
  lastSync: string;
  host: string;
}

interface InfrastructureDiscoveryProps {
  discoveryResources?: ResourceItem[];
  integrations?: IntegrationItem[];
  onToggleIntegration?: (id: string) => void;
}

export default function InfrastructureDiscovery({
  discoveryResources = [],
  integrations = [],
  onToggleIntegration
}: InfrastructureDiscoveryProps) {
  const [activeTab, setActiveTab] = useState<'aws' | 'azure' | 'gcp' | 'k8s' | 'docker' | 'linux' | 'terraform' | 'github_gitlab' | 'oracle' | 'digitalocean' | 'vmware' | 'jira' | 'slack_teams'>('aws');
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastSynced, setLastSynced] = useState<string>('Just now');
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

  // Connection Wizard states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedWizardProvider, setSelectedWizardProvider] = useState<string>('AWS');
  const [wizardName, setWizardName] = useState('');
  const [wizardDetails, setWizardDetails] = useState<Record<string, string>>({});
  const [localIntegrations, setLocalIntegrations] = useState<IntegrationItem[]>(integrations);
  const [localResources, setLocalResources] = useState<ResourceItem[]>(discoveryResources);

  // Sync state with incoming props
  useEffect(() => {
    if (integrations.length > 0) {
      setLocalIntegrations(integrations);
    }
  }, [integrations]);

  useEffect(() => {
    if (discoveryResources.length > 0) {
      setLocalResources(discoveryResources);
    }
  }, [discoveryResources]);

  // Trigger manual scanner simulation
  const handleTriggerDiscovery = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setLastSynced(new Date().toLocaleTimeString());
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  // Reconnect simulation
  const handleReconnect = (id: string) => {
    setLocalIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'connected',
          syncStatus: 'syncing',
          lastSync: 'Syncing now...'
        };
      }
      return item;
    }));

    setTimeout(() => {
      setLocalIntegrations(prev => prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            syncStatus: 'synced',
            lastSync: 'Just now'
          };
        }
        return item;
      }));
    }, 1200);
  };

  // Disconnect simulation
  const handleDisconnect = (id: string) => {
    setLocalIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'disconnected',
          syncStatus: 'failed',
          lastSync: 'Never',
          connectedResources: 0
        };
      }
      return item;
    }));
  };

  // Connection wizard handler
  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `${selectedWizardProvider.toLowerCase()}-${Date.now()}`;
    const newIntegration: IntegrationItem = {
      id: newId,
      provider: selectedWizardProvider,
      name: wizardName || `${selectedWizardProvider} Integration Endpoint`,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      connectedResources: selectedWizardProvider === 'AWS' ? 24 : selectedWizardProvider === 'Azure' ? 18 : selectedWizardProvider === 'Google Cloud' ? 15 : 12,
      syncStatus: 'synced',
      lastSync: 'Just now',
      host: wizardDetails.endpoint || wizardDetails.host || 'api.sre.aime.internal'
    };

    setLocalIntegrations(prev => [...prev, newIntegration]);
    setIsWizardOpen(false);
    // Reset wizard
    setWizardStep(1);
    setWizardName('');
    setWizardDetails({});
    // Trigger scanning for new resources
    handleTriggerDiscovery();
  };

  // Filter resources based on connection status and active tab
  const getResourcesForTab = () => {
    // Check if the tab provider is connected
    const providerMapping: Record<string, string> = {
      aws: 'AWS',
      azure: 'Azure',
      gcp: 'Google Cloud',
      k8s: 'Kubernetes',
      docker: 'Docker',
      linux: 'Linux SSH',
      terraform: 'Terraform',
      github_gitlab: 'GitHub',
      oracle: 'Oracle Cloud',
      digitalocean: 'DigitalOcean',
      vmware: 'VMware',
      jira: 'Jira',
      slack_teams: 'Slack'
    };

    const providerName = providerMapping[activeTab];
    const matchingIntegrations = localIntegrations.filter(i => 
      i.provider === providerName || 
      (activeTab === 'github_gitlab' && (i.provider === 'GitHub' || i.provider === 'GitLab')) ||
      (activeTab === 'slack_teams' && (i.provider === 'Slack' || i.provider === 'Teams'))
    );
    const isAnyConnected = matchingIntegrations.some(i => i.status === 'connected');

    if (!isAnyConnected) {
      return []; // Return empty if provider disconnected
    }

    return localResources.filter(r => r.category === activeTab);
  };

  const currentResources = getResourcesForTab().filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
      case 'synced':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'drifted':
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'critical':
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'AWS': return <Cloud className="w-5 h-5 text-amber-400" />;
      case 'Azure': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'Google Cloud': return <Cloud className="w-5 h-5 text-red-400" />;
      case 'Oracle Cloud': return <Cloud className="w-5 h-5 text-orange-500" />;
      case 'DigitalOcean': return <Globe className="w-5 h-5 text-sky-500" />;
      case 'VMware': return <Layers className="w-5 h-5 text-emerald-500" />;
      case 'Kubernetes': return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'Docker': return <Layers className="w-5 h-5 text-sky-400" />;
      case 'Linux SSH': return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'Terraform': return <FileCode className="w-5 h-5 text-purple-400" />;
      case 'GitHub': return <GitBranch className="w-5 h-5 text-zinc-300" />;
      case 'GitLab': return <GitPullRequest className="w-5 h-5 text-orange-400" />;
      case 'Jira': return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case 'Slack': return <Slack className="w-5 h-5 text-[#36C5F0]" />;
      case 'Teams': return <Radio className="w-5 h-5 text-[#5B5FC7]" />;
      default: return <Server className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-5.5 h-5.5 text-indigo-400" />
            AI SRE Infrastructure Discovery Engine
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Continuously query connected cloud resources, auto-discover services, and map drift states securely.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500 text-zinc-200 hover:text-white font-medium text-xs tracking-wider transition-all uppercase font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect New Provider
          </button>
          
          <button
            onClick={handleTriggerDiscovery}
            disabled={isScanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs tracking-wider transition-all disabled:opacity-50 uppercase font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? `SCANNING ${scanProgress}%` : 'TRIGGER RE-DISCOVERY'}
          </button>
        </div>
      </div>

      {/* Cloud & Server Connections Console deck */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            Connected Credentials & Integrations Status
          </h2>
          <span className="text-[10px] text-zinc-500 font-mono">
            Active Loop Polling rate: 5s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {localIntegrations.map((item) => {
            const isConnected = item.status === 'connected';
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -1 }}
                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isConnected 
                    ? 'bg-zinc-950/60 border-indigo-500/20' 
                    : 'bg-zinc-950/20 border-zinc-900/60 opacity-55'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${isConnected ? 'bg-indigo-950/50 text-indigo-400' : 'bg-zinc-900 text-zinc-500'}`}>
                      {getProviderIcon(item.provider)}
                    </div>
                    
                    <div className="flex gap-1.5">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleReconnect(item.id)}
                            className="px-2 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-950 text-[9px] font-mono font-bold text-indigo-400 transition-all cursor-pointer"
                          >
                            Reconnect
                          </button>
                          <button
                            onClick={() => handleDisconnect(item.id)}
                            className="px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-950 text-[9px] font-mono font-bold text-red-400 transition-all cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReconnect(item.id)}
                          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[9px] font-mono font-bold text-white transition-all cursor-pointer"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                      {item.provider}
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-indigo-400 animate-ping' : 'bg-zinc-600'}`} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">{item.name}</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1 truncate">{item.host}</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2 border-t border-zinc-900/60 grid grid-cols-2 gap-1 text-[9px] font-mono">
                  <div>
                    <span className="text-zinc-500 uppercase block">Resources:</span>
                    <span className="font-bold text-zinc-300">{item.connectedResources} Auto-Discovered</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase block">Sync:</span>
                    <span className={`font-bold uppercase ${item.syncStatus === 'synced' ? 'text-indigo-400' : 'text-zinc-600'}`}>
                      {item.syncStatus} ({item.lastSync})
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-2.5 pt-2">
        <div className="flex flex-wrap bg-zinc-950 p-1 rounded-lg border border-zinc-900 text-[11px] font-mono gap-y-1">
          <button
            onClick={() => { setActiveTab('aws'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'aws' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Cloud className="w-3 h-3" />
            AWS CORE
          </button>
          <button
            onClick={() => { setActiveTab('azure'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'azure' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Globe className="w-3 h-3" />
            AZURE
          </button>
          <button
            onClick={() => { setActiveTab('gcp'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'gcp' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Cloud className="w-3 h-3" />
            GCP
          </button>
          <button
            onClick={() => { setActiveTab('oracle'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'oracle' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Cloud className="w-3 h-3 text-orange-400" />
            OCI
          </button>
          <button
            onClick={() => { setActiveTab('digitalocean'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'digitalocean' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Globe className="w-3 h-3 text-sky-400" />
            DO
          </button>
          <button
            onClick={() => { setActiveTab('vmware'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'vmware' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-3 h-3 text-emerald-400" />
            VMWARE
          </button>
          <button
            onClick={() => { setActiveTab('k8s'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'k8s' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Cpu className="w-3 h-3" />
            K8S
          </button>
          <button
            onClick={() => { setActiveTab('docker'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'docker' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-3 h-3" />
            DOCKER
          </button>
          <button
            onClick={() => { setActiveTab('linux'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'linux' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Server className="w-3 h-3" />
            SSH LINUX
          </button>
          <button
            onClick={() => { setActiveTab('terraform'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'terraform' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <FileCode className="w-3 h-3" />
            TERRAFORM
          </button>
          <button
            onClick={() => { setActiveTab('github_gitlab'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'github_gitlab' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <GitBranch className="w-3 h-3" />
            GIT REPOS
          </button>
          <button
            onClick={() => { setActiveTab('jira'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'jira' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            JIRA
          </button>
          <button
            onClick={() => { setActiveTab('slack_teams'); setSelectedResource(null); }}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${activeTab === 'slack_teams' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Slack className="w-3 h-3 text-[#36C5F0]" />
            ALERTS CHANNELS
          </button>
        </div>

        {/* Resource Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search discovered resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Scanning Banner overlay */}
      {isScanning && (
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
            <div>
              <span className="text-xs font-bold text-white block">AIME Discovery Scan Active...</span>
              <span className="text-[10px] font-mono text-zinc-400">Discovering VM cores, clusters, VPC routes, container instances, DB storage, and Git repository hooks...</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-400">{scanProgress}%</span>
        </div>
      )}

      {/* Grid: Left - Resources List; Right - Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Discovered Resources List Column */}
        <div className="lg:col-span-2 space-y-2">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-mono uppercase bg-zinc-950/40">
                    <th className="p-3.5">Discovered Resource</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Sync Status</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResources.length > 0 ? (
                    currentResources.map((resource) => {
                      const isDrifted = resource.status === 'drifted' || resource.status === 'warning';
                      const isCritical = resource.status === 'critical' || resource.status === 'failed';

                      return (
                        <tr 
                          key={resource.id} 
                          className={`border-b border-zinc-900/40 hover:bg-zinc-900/20 transition-all cursor-pointer ${
                            selectedResource?.id === resource.id ? 'bg-indigo-950/15 border-indigo-500/20' : ''
                          }`}
                          onClick={() => setSelectedResource(resource)}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isCritical 
                                  ? 'bg-red-500 animate-pulse'
                                  : isDrifted
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-emerald-400'
                              }`} />
                              <span className={`font-mono font-bold ${isDrifted ? 'text-amber-300' : isCritical ? 'text-red-400' : 'text-zinc-200'}`}>
                                {resource.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="text-zinc-400 font-sans">{resource.type}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${getStatusStyle(resource.status)}`}>
                              {resource.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              id={`view-resource-btn-${resource.id}`}
                              onClick={(e) => { e.stopPropagation(); setSelectedResource(resource); }}
                              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-600 font-mono">
                        No active resources discovered. Ensure the corresponding credential is connected to enable active scan tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono text-left pl-1 flex items-center justify-between">
            <span>Discovered infrastructure mapped on tab: {currentResources.length} items.</span>
            <span>Last polled sync: {lastSynced}</span>
          </div>
        </div>

        {/* Resource Details Inspector Panel Column */}
        <div className="lg:col-span-1">
          {selectedResource ? (
            <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between h-full min-h-[420px] text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">SRE Spec Inspector</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase border ${getStatusStyle(selectedResource.status)}`}>
                    {selectedResource.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white font-mono break-all leading-tight">{selectedResource.name}</h3>
                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider">{selectedResource.type} Details</span>
                </div>

                {selectedResource.status === 'drifted' && (
                  <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/20 text-[10px] text-amber-400 font-mono leading-normal">
                    ⚠️ <strong>Drift Detected:</strong> External configuration has diverged from your declared Terraform state configuration! Select "Trigger Deployment" to remediate.
                  </div>
                )}

                <div className="space-y-3 pt-3 border-t border-zinc-900 font-mono text-xs">
                  {Object.entries(selectedResource.details).map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <span className="text-zinc-600 text-[9px] uppercase tracking-wider block">{key}:</span>
                      {Array.isArray(val) ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {val.map((v, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400">
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-300 font-bold block break-all">{String(val)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Memory mapping logs indicator */}
              <div className="mt-5 pt-3 border-t border-zinc-900 space-y-2.5">
                <span className="text-[9px] font-mono uppercase text-zinc-500 block">AI Memory Correlator:</span>
                <p className="text-[10px] font-sans text-zinc-400 leading-normal">
                  Discovered configurations are loaded securely in the background and continuously synchronized with active SRE Memory blocks.
                </p>
                <div className="flex gap-2">
                  <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/20 border border-indigo-500/10 px-2 py-1 rounded">
                    Type: {selectedResource.category.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-2.5 py-1 rounded">
                    Active Sync: OK
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-zinc-900 bg-zinc-950/40 flex flex-col items-center justify-center text-center h-full min-h-[420px]">
              <Compass className="w-10 h-10 text-zinc-600 stroke-[1.5] mb-2 animate-pulse" />
              <p className="text-xs font-mono text-zinc-400">SELECT A RESOURCE FOR SPEC INSPECTION</p>
              <p className="text-[10px] text-zinc-600 font-sans max-w-[200px] mt-1.5">
                Inspect active VPC CIDR ranges, Kubernetes services, VM sizes, container profiles, database logs, or repositories.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Connection Wizard Modal */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-950 text-left space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsWizardOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                  <Key className="w-4.5 h-4.5 text-indigo-400" />
                  Provider Connection Wizard
                </h3>
                <p className="text-xs text-zinc-400">Securely hook up your enterprise platform cloud credential API keys or SSH configuration.</p>
              </div>

              <form onSubmit={handleSaveConnection} className="space-y-4 pt-2">
                {wizardStep === 1 ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 block">Select Infrastructure Provider</label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {['AWS', 'Azure', 'Google Cloud', 'Oracle Cloud', 'DigitalOcean', 'VMware', 'Linux SSH', 'Docker', 'Kubernetes', 'Terraform', 'GitHub', 'GitLab', 'Jira', 'Slack', 'Teams'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedWizardProvider(p)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                            selectedWizardProvider === p 
                              ? 'border-indigo-500 bg-indigo-950/20 text-white font-bold' 
                              : 'border-zinc-900 bg-zinc-950 hover:border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {getProviderIcon(p)}
                          <span className="text-[9px] font-mono leading-tight truncate w-full">{p}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase font-mono tracking-wider text-center cursor-pointer transition-all"
                      >
                        Configure Credentials &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Connection Friendly Name</label>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. AIME Prod ${selectedWizardProvider}`}
                        value={wizardName}
                        onChange={(e) => setWizardName(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    </div>

                    {selectedWizardProvider === 'Linux SSH' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-500">Host IP / Domain</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 10.0.1.12"
                            value={wizardDetails.host || ''}
                            onChange={(e) => setWizardDetails({...wizardDetails, host: e.target.value})}
                            className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-500">Port</label>
                          <input
                            type="text"
                            defaultValue="22"
                            className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-zinc-500">API Endpoint / Host URI</label>
                        <input
                          type="text"
                          required
                          placeholder={selectedWizardProvider === 'AWS' ? 'arn:aws:iam::755409278011:root' : 'api.sre.aime.internal'}
                          value={wizardDetails.endpoint || ''}
                          onChange={(e) => setWizardDetails({...wizardDetails, endpoint: e.target.value})}
                          className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">
                        {selectedWizardProvider === 'Linux SSH' ? 'SSH Private Key' : 'API Key / Bearer Access Token'}
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder={selectedWizardProvider === 'Linux SSH' ? '-----BEGIN OPENSSH PRIVATE KEY-----' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
                        className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 focus:outline-none focus:border-indigo-500 font-mono text-[10px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="py-2 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs font-mono uppercase text-center cursor-pointer"
                      >
                        &larr; Back
                      </button>
                      <button
                        type="submit"
                        className="py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase font-mono tracking-wider text-center cursor-pointer transition-all"
                      >
                        Securely Save
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Agent Security credentials */}
      <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Enterprise Security Shield</span>
            <span className="text-[11px] text-zinc-400 font-sans block mt-0.5">
              Secure discovery queries are executed over HTTPS/gRPC. Authentication tokens are encrypted at rest using AES-256 GCM.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">Enterprise Protocol: SEC-v2</span>
      </div>
    </div>
  );
}
