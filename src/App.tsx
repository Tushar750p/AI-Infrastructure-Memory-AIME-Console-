import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Server, Clock, MessageSquare, Terminal, Layers, FileText, Menu, X, Brain, AlertTriangle, ChevronRight, Cpu, Slack, Network, ShieldCheck, Shield, Compass, Bell, Search, CreditCard, DollarSign, Sparkles, Activity, RefreshCw } from 'lucide-react';

import { LinuxServer, MemoryEvent, DockerContainer } from './types';
import { INITIAL_SERVERS, INITIAL_MEMORY_EVENTS, INITIAL_CONTAINERS } from './data/mockData';

// Component imports
import LandingPage from './components/LandingPage';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './components/DashboardOverview';
import ServerManager from './components/ServerManager';
import MemoryTimeline from './components/MemoryTimeline';
import AIChatAssistant from './components/AIChatAssistant';
import LogAnalyzer from './components/LogAnalyzer';
import DockerMonitoring from './components/DockerMonitoring';
import K8sMonitoring from './components/K8sMonitoring';
import ReportsGenerator from './components/ReportsGenerator';
import InfrastructureTimeMachine from './components/InfrastructureTimeMachine';
import InfrastructureKnowledgeGraph from './components/InfrastructureKnowledgeGraph';
import RollbackIntelligence from './components/RollbackIntelligence';
import EnterpriseIntegrations from './components/EnterpriseIntegrations';
import SecurityCompliance from './components/SecurityCompliance';
import InfrastructureDiscovery from './components/InfrastructureDiscovery';
import SystemDemo from './components/SystemDemo';
import AlertCenter from './components/AlertCenter';
import GlobalSearch from './components/GlobalSearch';
import SaaSBillingPlans from './components/SaaSBillingPlans';
import SaaSAdminDashboard from './components/SaaSAdminDashboard';

interface AIClusterAnalysis {
  overallClusterRisk: number;
  patternSummary: string;
  flaggedIncidents: Array<{
    eventId: string;
    isIncident: boolean;
    riskScore: number;
    patternCategory: string;
    reasoning: string;
    recommendedAction: string;
  }>;
}

// Background custom hook using Gemini API to analyze incoming events for patterns and automatically flag incidents with risk scores
function useGeminiEventPatternAnalyzer(
  events: MemoryEvent[],
  setEvents: React.Dispatch<React.SetStateAction<MemoryEvent[]>>,
  triggerToast: (msg: string, type: string, severity: 'healthy' | 'warning' | 'critical', serverName?: string) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIClusterAnalysis | null>(null);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);
  const notifiedHighRiskIdsRef = useRef<Set<string>>(new Set());

  const eventsRef = useRef(events);
  eventsRef.current = events;

  const runPatternAnalysis = useCallback(async (customEvents?: MemoryEvent[]) => {
    const listToAnalyze = customEvents || eventsRef.current;
    if (!listToAnalyze || listToAnalyze.length === 0) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/analyze-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: listToAnalyze.slice(0, 15) })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.analysis) {
          setAiAnalysis(data.analysis);
          setLastAnalyzedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

          if (Array.isArray(data.events)) {
            setEvents(data.events);
          }

          // Automatically trigger toasts for newly flagged incidents with riskScore >= 65
          if (Array.isArray(data.analysis.flaggedIncidents)) {
            data.analysis.flaggedIncidents.forEach((inc: any) => {
              if (inc.isIncident && inc.riskScore >= 65 && !notifiedHighRiskIdsRef.current.has(inc.eventId)) {
                notifiedHighRiskIdsRef.current.add(inc.eventId);
                const matchedEvt = listToAnalyze.find(e => e.id === inc.eventId);
                const serverName = matchedEvt ? matchedEvt.serverName : 'Cluster';
                const evtMsg = matchedEvt ? matchedEvt.message : 'Pattern Anomaly Detected';
                
                triggerToast(
                  `[Gemini AI] Risk Score ${inc.riskScore}/100 (${inc.patternCategory}): ${evtMsg}`,
                  'incident',
                  inc.riskScore >= 75 ? 'critical' : 'warning',
                  serverName
                );
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('Background Gemini event pattern analyzer hook encounter error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [setEvents, triggerToast]);

  // Run background loop periodically (every 3 minutes) to strictly respect API quotas
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        runPatternAnalysis();
      }
    }, 3000);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        runPatternAnalysis();
      }
    }, 180000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [runPatternAnalysis]);

  return {
    isAnalyzing,
    aiAnalysis,
    lastAnalyzedTime,
    triggerManualAnalysis: () => runPatternAnalysis(events)
  };
}

export default function App() {
  const [isAppLaunched, setIsAppLaunched] = useState<boolean>(() => {
    return localStorage.getItem('aime_launched') === 'true';
  });

  const [isDemoLaunched, setIsDemoLaunched] = useState<boolean>(() => {
    return localStorage.getItem('aime_demo_launched') === 'true';
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    return localStorage.getItem('aime_current_tab') || 'dashboard';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Operator Identification state
  const [loggedInUser, setLoggedInUser] = useState<{ username: string; role: string; badgeId: string } | null>(() => {
    const saved = localStorage.getItem('aime_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Core global SRE databases with localStorage hydration
  const [servers, setServers] = useState<LinuxServer[]>(() => {
    const saved = localStorage.getItem('aime_servers');
    return saved ? JSON.parse(saved) : INITIAL_SERVERS;
  });

  const [events, setEvents] = useState<MemoryEvent[]>(() => {
    const saved = localStorage.getItem('aime_events');
    return saved ? JSON.parse(saved) : INITIAL_MEMORY_EVENTS;
  });

  const [containers, setContainers] = useState<DockerContainer[]>(() => {
    const saved = localStorage.getItem('aime_containers');
    return saved ? JSON.parse(saved) : INITIAL_CONTAINERS;
  });

  const [discoveryResources, setDiscoveryResources] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(3);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [activeAlertsList, setActiveAlertsList] = useState<any[]>([]);

  // Periodically fetch active alerts for the quick notification popup menu
  useEffect(() => {
    const fetchAlertsList = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const activeOnly = data.filter((a: any) => a.status === 'active');
            setActiveAlertsList(activeOnly);
            setActiveAlertsCount(activeOnly.length);
          }
        }
      } catch (err) {
        console.warn('Failed to load active alerts popover list:', err);
      }
    };
    fetchAlertsList();
    const interval = setInterval(fetchAlertsList, 5000);
    return () => clearInterval(interval);
  }, []);

  // Operators live toasts and automatic polling state synchronization
  interface ToastNotification {
    id: string;
    timestamp: string;
    message: string;
    type: string;
    severity: 'healthy' | 'warning' | 'critical';
    serverName?: string;
  }

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const triggerToast = (msg: string, type: string, severity: 'healthy' | 'warning' | 'critical', serverName?: string) => {
    const newId = `toast-${Date.now()}-${Math.random()}`;
    const nextToast: ToastNotification = { id: newId, timestamp: new Date().toLocaleTimeString(), message: msg, type, severity, serverName };
    setToasts((prev) => [nextToast, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 6000);
  };

  // Call background Gemini API hook to analyze incoming event patterns and assign risk scores
  const {
    isAnalyzing: isAiAnalyzingEvents,
    aiAnalysis: geminiClusterAnalysis,
    lastAnalyzedTime: geminiLastAnalyzedTime,
    triggerManualAnalysis: triggerGeminiEventAnalysis
  } = useGeminiEventPatternAnalyzer(events, setEvents, triggerToast);

  // Load events and enable real-time continuous background sync polling
  useEffect(() => {
    let isMounted = true;
    const knownEventIds = new Set<string>();

    const fetchInitialState = async () => {
      try {
        const response = await fetch('/api/state');
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          const state = await response.json();
          if (state) {
            if (isMounted) {
              if (Array.isArray(state.servers)) setServers(state.servers);
              if (Array.isArray(state.containers)) setContainers(state.containers);
              if (Array.isArray(state.discovery)) setDiscoveryResources(state.discovery);
              if (Array.isArray(state.integrations)) setIntegrations(state.integrations);
              if (Array.isArray(state.alerts)) {
                setActiveAlertsCount(state.alerts.filter((a: any) => a.status === 'active').length);
              }
              if (Array.isArray(state.events)) {
                setEvents(state.events);
                state.events.forEach((e: any) => knownEventIds.add(e.id));
              }
            }
          }
        }
      } catch (err) {
        console.warn('SRE State is temporarily loading or server is restarting...', err);
      }
    };

    fetchInitialState();

    // 3 seconds real-time polling to retrieve continuously generated background metrics and incidents
    const statePollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/state');
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && contentType.includes('application/json')) {
          const state = await response.json();
          if (state && isMounted) {
            if (Array.isArray(state.servers)) setServers(state.servers);
            if (Array.isArray(state.containers)) setContainers(state.containers);
            if (Array.isArray(state.discovery)) setDiscoveryResources(state.discovery);
            if (Array.isArray(state.integrations)) setIntegrations(state.integrations);
            if (Array.isArray(state.alerts)) {
              setActiveAlertsCount(state.alerts.filter((a: any) => a.status === 'active').length);
            }
            
            if (Array.isArray(state.events)) {
              // Compare and look for new events to trigger notifications
              const newEvents = state.events.filter((e: any) => !knownEventIds.has(e.id));
              if (newEvents.length > 0) {
                // Add to list and trigger toasts
                newEvents.reverse().forEach((e: any) => {
                  triggerToast(
                    e.message,
                    e.type,
                    e.severity as any,
                    e.serverName
                  );
                  knownEventIds.add(e.id);
                });
              }
              setEvents(state.events);
            }
          }
        }
      } catch (err) {
        console.warn('SRE State background sync is retrying (server may be restarting)...');
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(statePollInterval);
    };
  }, []);

  // Communication bridge for "Ask AI Fix" trigger
  const [selectedIncident, setSelectedIncident] = useState<MemoryEvent | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('aime_launched', String(isAppLaunched));
  }, [isAppLaunched]);

  useEffect(() => {
    localStorage.setItem('aime_demo_launched', String(isDemoLaunched));
  }, [isDemoLaunched]);

  useEffect(() => {
    localStorage.setItem('aime_current_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    localStorage.setItem('aime_servers', JSON.stringify(servers));
  }, [servers]);

  useEffect(() => {
    localStorage.setItem('aime_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('aime_containers', JSON.stringify(containers));
  }, [containers]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('aime_user', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('aime_user');
    }
  }, [loggedInUser]);

  // SRE central audit logger proxy
  const createAuditLog = async (action: string, result: string, auditEntry: string, category: string = 'INFRA', severity: string = 'INFO') => {
    try {
      const user = loggedInUser || { username: 'sysadmin_clara', role: 'Lead SRE Engineer' };
      await fetch('/api/alerts/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user.username,
          role: user.role,
          action,
          result,
          auditEntry,
          ip: '127.0.0.1',
          severity,
          category
        })
      });
    } catch (err) {
      console.error('Failed to create global audit log:', err);
    }
  };

  const handleLaunchApp = () => {
    setIsAppLaunched(true);
    setCurrentTab('dashboard');
    
    // Log login to persistent audit trail
    const user = loggedInUser || { username: 'sysadmin_clara', role: 'Lead SRE Engineer' };
    createAuditLog(
      'Operator login authenticated',
      'SRE operator session started successfully via dashboard authorization.',
      `Operator @${user.username} successfully authorized access credentials and launched SRE terminal dashboard.`,
      'AUTH',
      'INFO'
    );
  };

  const handleReturnToLanding = () => {
    setIsAppLaunched(false);
  };

  // State Mutators
  const handleAddServer = (newServer: LinuxServer) => {
    setServers((prev) => [newServer, ...prev]);
    createAuditLog(
      'Register Linux Server Node',
      `Registered server ${newServer.name} (${newServer.ip}) to central SRE cluster registry.`,
      `New Linux host server metadata entered for ${newServer.name} (${newServer.os}) located in region ${newServer.region}.`,
      'INFRA',
      'INFO'
    );
  };

  const handleRemoveServer = (id: string) => {
    const serverToRemove = servers.find(s => s.id === id);
    setServers((prev) => prev.filter(s => s.id !== id));
    if (serverToRemove) {
      createAuditLog(
        'Deregister Linux Server Node',
        `Deregistered server ${serverToRemove.name} (${serverToRemove.ip}) from central SRE cluster registry.`,
        `Host server node ${serverToRemove.name} (IP: ${serverToRemove.ip}) and active SSH connections removed from live inventory.`,
        'INFRA',
        'WARNING'
      );
    }
  };

  const handleToggleIntegration = async (id: string) => {
    try {
      const response = await fetch('/api/integrations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.integrations)) {
          setIntegrations(data.integrations);
          const toggledInt = data.integrations.find((i: any) => i.id === id);
          if (toggledInt) {
            const statusLabel = toggledInt.status === 'connected' ? 'Established connection' : 'Revoked access credentials';
            createAuditLog(
              `Modify Infrastructure Integration: ${toggledInt.name}`,
              `${statusLabel} for integration module.`,
              `Infrastructure Integration for provider ${toggledInt.name} status updated to ${toggledInt.status}.`,
              'COMPLIANCE',
              'WARNING'
            );
          }
        }
        if (Array.isArray(data.events)) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Failed to toggle integration:', err);
    }
  };

  const handleAddMemoryEvent = async (newEvent: MemoryEvent) => {
    // Optimistic UI update
    setEvents((prev) => [newEvent, ...prev]);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (response.ok) {
        const updatedEvents = await response.json();
        if (Array.isArray(updatedEvents)) {
          setEvents(updatedEvents);
        }
      }
    } catch (err) {
      console.error('Failed to sync new event to SRE server DB:', err);
    }
  };

  const handleUpdateMemoryEvent = async (id: string, updatedFields: Partial<MemoryEvent>) => {
    // Optimistic UI update
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, ...updatedFields } : e));

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        const updatedEvents = await response.json();
        if (Array.isArray(updatedEvents)) {
          setEvents(updatedEvents);
        }
      }
    } catch (err) {
      console.error('Failed to sync updated event to SRE server DB:', err);
    }
  };

  const handleClearAllEvents = async () => {
    try {
      const response = await fetch('/api/events', { method: 'DELETE' });
      if (response.ok) {
        const resetEvents = await response.json();
        setEvents(resetEvents);
      } else {
        setEvents(INITIAL_MEMORY_EVENTS);
      }
    } catch (err) {
      console.error('Failed to wipe SRE server DB:', err);
      setEvents(INITIAL_MEMORY_EVENTS);
    }
  };

  const handleUpdateContainerStatus = (
    id: string, 
    status: 'running' | 'exited' | 'restarting', 
    restartsIncrement = 0
  ) => {
    setContainers((prev) => prev.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          status,
          restarts: c.restarts + restartsIncrement
        };
      }
      return c;
    }));
  };

  const handleSelectEventForAnalysis = (event: MemoryEvent) => {
    setSelectedIncident(event);
    setCurrentTab('chat');
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Overview', icon: Database },
    { id: 'alerts', label: 'Alert Center', icon: Bell },
    { id: 'discovery', label: 'Infra Discovery', icon: Compass },
    { id: 'servers', label: 'Linux Servers', icon: Server },
    { id: 'memory', label: 'Memory Timeline', icon: Clock },
    { id: 'timemachine', label: 'Time Machine & Diff', icon: Clock },
    { id: 'knowledge', label: 'Knowledge Graph', icon: Network },
    { id: 'rollbacks', label: 'Rollbacks & Golden', icon: ShieldCheck },
    { id: 'chat', label: 'AIME SRE Chat', icon: Brain },
    { id: 'integrations', label: 'Slack & Teams', icon: Slack },
    { id: 'logs', label: 'Log Analyzer', icon: Terminal },
    { id: 'docker', label: 'Docker Engines', icon: Layers },
    { id: 'kubernetes', label: 'Kubernetes Nodes', icon: Cpu },
    { id: 'reports', label: 'Compliance Reports', icon: FileText },
    { id: 'security', label: 'Security & Trust', icon: Shield },
    { id: 'billing', label: 'SaaS Plans & Billing', icon: CreditCard },
    { id: 'admin', label: 'SaaS Owner Metrics', icon: DollarSign }
  ];

  if (isDemoLaunched) {
    return (
      <SystemDemo 
        onExitDemo={() => setIsDemoLaunched(false)} 
        onLaunchApp={() => {
          setIsDemoLaunched(false);
          handleLaunchApp();
        }}
      />
    );
  }

  if (!isAppLaunched) {
    return <LandingPage onLaunchApp={handleLaunchApp} onLaunchDemo={() => setIsDemoLaunched(true)} loggedInOperator={loggedInUser?.username} />;
  }

  if (!loggedInUser) {
    return (
      <LoginScreen 
        onLoginSuccess={(operator) => setLoggedInUser(operator)} 
        onBackToLanding={handleReturnToLanding} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col md:flex-row selection:bg-indigo-500 selection:text-white">
      {/* Sidebar - Desktop Layout (hidden on print) */}
      <aside className="hidden md:flex flex-col w-60 border-r border-zinc-800 bg-zinc-950 flex-shrink-0 print:hidden">
        {/* Sidebar Brand Header */}
        <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
              <Database className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-sans font-bold text-xs tracking-tight text-white block">AIME Console</span>
              <span className="text-[8px] font-mono tracking-wider uppercase text-indigo-400 block">SRE MEMORY ENGINE</span>
            </div>
          </div>
          <button
            id="sidebar-notification-bell"
            onClick={() => {
              setCurrentTab('alerts');
              setIsNotificationPopoverOpen(!isNotificationPopoverOpen);
            }}
            className="relative p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 text-zinc-400 hover:text-white transition-all cursor-pointer group"
            title="Active System Notifications & Alerts"
          >
            <Bell className="w-4 h-4 text-zinc-300 group-hover:text-amber-400 transition-colors" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono animate-pulse shadow-md shadow-red-500/50">
                {activeAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Trigger */}
        <div className="px-2.5 pt-3">
          <button
            id="sidebar-search-trigger"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-500 bg-zinc-900 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
              <span className="group-hover:text-zinc-400">Search system...</span>
            </div>
            <kbd className="font-mono text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700/50">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium tracking-wide transition-all text-left cursor-pointer group ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10 font-semibold' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span>{item.label}</span>
                {item.id === 'alerts' && activeAlertsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                    {activeAlertsCount}
                  </span>
                )}
                {isSelected && item.id !== 'alerts' && <ChevronRight className="w-3 h-3 ml-auto text-white" />}
              </button>
            );
          })}
        </nav>

        {/* SRE Operator Badge */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-inner flex-shrink-0">
              {loggedInUser?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-zinc-200 truncate">@{loggedInUser?.username}</div>
              <div className="text-[9px] text-zinc-500 truncate font-mono">{loggedInUser?.role}</div>
            </div>
          </div>
          <button
            onClick={() => {
              setLoggedInUser(null);
              localStorage.removeItem('aime_user');
            }}
            className="w-full py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-red-500/30 hover:text-red-400 text-[9px] font-mono text-zinc-400 transition-all cursor-pointer text-center uppercase tracking-wider"
          >
            Revoke Access Badge
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/80">
          <button
            onClick={handleReturnToLanding}
            className="w-full py-1.5 rounded border border-zinc-800 text-[9px] font-mono text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 uppercase tracking-widest transition-all cursor-pointer"
          >
            ← Product Page
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Bar (hidden on print) */}
      <header className="md:hidden h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </div>
          <span className="font-sans font-bold text-xs tracking-tight text-white">AIME</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Bell Notification Trigger Button */}
          <button
            id="mobile-notification-bell-btn"
            onClick={() => {
              setCurrentTab('alerts');
              setIsNotificationPopoverOpen(!isNotificationPopoverOpen);
            }}
            className="relative p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Alert Notifications"
            title="Click to view Active System Notifications & Alerts"
          >
            <Bell className="w-4 h-4 text-zinc-300" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono animate-pulse shadow-md shadow-red-500/50">
                {activeAlertsCount}
              </span>
            )}
          </button>

          <button
            id="mobile-search-trigger"
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay Drawer (hidden on print) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed top-14 left-0 right-0 bg-zinc-950 border-b border-zinc-800 z-30 p-3 space-y-1 shadow-2xl print:hidden"
          >
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isSelected = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded text-xs font-medium tracking-wide transition-all text-left ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-semibold' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'alerts' && activeAlertsCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                      {activeAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/20 mt-2 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {loggedInUser?.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-200">@{loggedInUser?.username}</div>
                  <div className="text-[9px] text-zinc-500 font-mono">{loggedInUser?.role}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setLoggedInUser(null);
                  localStorage.removeItem('aime_user');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-mono text-red-400 uppercase tracking-wider"
              >
                Log Out
              </button>
            </div>
            <div className="pt-2 border-t border-zinc-800 mt-2">
              <button
                onClick={() => {
                  handleReturnToLanding();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 rounded bg-zinc-900 text-[9px] font-mono text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-all"
              >
                ← Return to Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Workspace viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Control Bar for Desktop */}
        <header className="hidden md:flex h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-6 items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              VIEW: <span className="text-indigo-400">{currentTab.toUpperCase()}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Gemini AI Event Pattern Monitor Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs font-mono shadow-sm">
              <Sparkles className={`w-3.5 h-3.5 ${isAiAnalyzingEvents ? 'text-amber-400 animate-spin' : 'text-indigo-400'}`} />
              <span className="text-zinc-400">AI Risk Score:</span>
              <span className={`font-bold ${
                (Number(geminiClusterAnalysis?.overallClusterRisk) || 0) >= 70
                  ? 'text-red-400 animate-pulse'
                  : (Number(geminiClusterAnalysis?.overallClusterRisk) || 0) >= 40
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}>
                {geminiClusterAnalysis && !isNaN(Number(geminiClusterAnalysis.overallClusterRisk)) ? `${Number(geminiClusterAnalysis.overallClusterRisk)}/100` : 'Analyzing...'}
              </span>
              <button
                onClick={triggerGeminiEventAnalysis}
                disabled={isAiAnalyzingEvents}
                title="Re-run Gemini AI Event Pattern Analysis"
                className="ml-1 p-1 rounded hover:bg-indigo-900/50 text-indigo-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isAiAnalyzingEvents ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Global Search Quick Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search System...</span>
              <kbd className="text-[9px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">⌘K</kbd>
            </button>

            {/* Main Desktop Notification Bell Button */}
            <div className="relative">
              <button
                id="main-desktop-notification-bell"
                onClick={() => {
                  setCurrentTab('alerts');
                  setIsNotificationPopoverOpen(!isNotificationPopoverOpen);
                }}
                className={`relative px-3.5 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === 'alerts' || isNotificationPopoverOpen
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-600/10 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                }`}
                aria-label="Notifications & Alerts"
                title="Click to view Active System Notifications & Alerts"
              >
                <Bell className={`w-4 h-4 ${activeAlertsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-zinc-400'}`} />
                <span>Alerts</span>
                {activeAlertsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                    {activeAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {currentTab === 'dashboard' && (
              <DashboardOverview
                servers={servers}
                events={events}
                containers={containers}
                onNavigate={setCurrentTab}
                onSelectEventForAnalysis={handleSelectEventForAnalysis}
              />
            )}

            {currentTab === 'alerts' && (
              <AlertCenter onAddMemoryEvent={handleAddMemoryEvent} />
            )}

            {currentTab === 'discovery' && (
              <InfrastructureDiscovery
                discoveryResources={discoveryResources}
                integrations={integrations}
                onToggleIntegration={handleToggleIntegration}
              />
            )}

            {currentTab === 'servers' && (
              <ServerManager
                servers={servers}
                onAddServer={handleAddServer}
                onRemoveServer={handleRemoveServer}
                onAddMemoryEvent={handleAddMemoryEvent}
                operatorUsername={loggedInUser?.username}
              />
            )}

            {currentTab === 'memory' && (
              <MemoryTimeline
                events={events}
                servers={servers}
                onSelectEventForAnalysis={handleSelectEventForAnalysis}
                onAddMemoryEvent={handleAddMemoryEvent}
                onUpdateMemoryEvent={handleUpdateMemoryEvent}
                operatorUsername={loggedInUser?.username}
                onClearAllEvents={handleClearAllEvents}
              />
            )}

            {currentTab === 'timemachine' && (
              <InfrastructureTimeMachine />
            )}

            {currentTab === 'knowledge' && (
              <InfrastructureKnowledgeGraph />
            )}

            {currentTab === 'rollbacks' && (
              <RollbackIntelligence />
            )}

            {currentTab === 'chat' && (
              <AIChatAssistant
                servers={servers}
                events={events}
                selectedIncident={selectedIncident}
                onClearSelectedIncident={() => setSelectedIncident(null)}
              />
            )}

            {currentTab === 'integrations' && (
              <EnterpriseIntegrations />
            )}

            {currentTab === 'logs' && (
              <LogAnalyzer
                onAddMemoryEvent={handleAddMemoryEvent}
              />
            )}

            {currentTab === 'docker' && (
              <DockerMonitoring
                containers={containers}
                onUpdateContainerStatus={handleUpdateContainerStatus}
                onAddMemoryEvent={handleAddMemoryEvent}
                operatorUsername={loggedInUser?.username}
              />
            )}

            {currentTab === 'kubernetes' && (
              <K8sMonitoring
                onAddMemoryEvent={handleAddMemoryEvent}
                operatorUsername={loggedInUser?.username}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsGenerator
                servers={servers}
                events={events}
              />
            )}

            {currentTab === 'security' && (
              <SecurityCompliance
                servers={servers}
                events={events}
                operatorUsername={loggedInUser?.username}
                operatorRole={loggedInUser?.role}
              />
            )}

            {currentTab === 'billing' && (
              <SaaSBillingPlans />
            )}

            {currentTab === 'admin' && (
              <SaaSAdminDashboard />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Interactive Notification Popover Modal */}
      <AnimatePresence>
        {isNotificationPopoverOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-16 right-4 sm:right-8 z-50 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-4 text-zinc-100 divide-y divide-zinc-800/60"
          >
            <div className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white font-sans">Active Notifications</h3>
                  <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                    {activeAlertsCount} Active System Alert{activeAlertsCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNotificationPopoverOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-72 overflow-y-auto">
              {activeAlertsList.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 font-mono text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  All system metrics & services are operating within baseline parameters. No active alerts.
                </div>
              ) : (
                activeAlertsList.slice(0, 5).map((alert: any) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setCurrentTab('alerts');
                      setIsNotificationPopoverOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        alert.severity === 'Critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : alert.severity === 'High'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">{alert.timestamp}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
                      {alert.title}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {alert.resourceName} ({alert.environment})
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3">
              <button
                onClick={() => {
                  setCurrentTab('alerts');
                  setIsNotificationPopoverOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <span>View All Alerts in Alert Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications Panel */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg p-3.5 shadow-2xl flex gap-3 cursor-pointer select-none group"
              onClick={() => {
                setCurrentTab('memory');
                setToasts((prev) => prev.filter((toast) => toast.id !== t.id));
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {t.severity === 'critical' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                ) : t.severity === 'warning' ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${
                    t.severity === 'critical' ? 'text-red-400' : t.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {t.type} Detected
                  </span>
                  <span className="text-[8px] text-zinc-500 font-mono">{t.timestamp}</span>
                </div>
                <p className="text-[11px] font-medium text-zinc-100 leading-snug truncate group-hover:text-indigo-400 transition-colors">
                  {t.message}
                </p>
                {t.serverName && (
                  <span className="text-[8px] font-mono text-zinc-500 mt-1 block">
                    Resource: {t.serverName}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <GlobalSearch
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            servers={servers}
            containers={containers}
            events={events}
            onNavigate={(tabId) => {
              setCurrentTab(tabId);
              setIsSearchOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
