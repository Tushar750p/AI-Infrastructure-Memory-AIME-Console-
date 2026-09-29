import React, { useState, useEffect } from 'react';
import { 
  Bell, BellRing, AlertTriangle, CheckCircle2, Clock, Sliders, Shield, 
  Activity, User, Check, X, Search, Sparkles, Smartphone, Mail, 
  Slack, MessageSquare, Send, Volume2, VolumeX, Database, Calendar, 
  ArrowRight, Lock, Settings2, Moon, Sun, RefreshCw, FileText, CheckCircle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlertComment {
  id: string;
  user: string;
  role: string;
  timestamp: string;
  text: string;
}

interface AlertTimelineItem {
  time: string;
  event: string;
}

interface AlertItem {
  id: string;
  title: string;
  severity: 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  resourceName: string;
  environment: 'Production' | 'Staging' | 'Development';
  timestamp: string;
  rootCause?: string;
  aiAnalysis?: string;
  recommendedAction?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  snoozedUntil?: string;
  riskLevel?: string;
  impact?: string;
  estimatedResolutionTime?: string;
  previousSimilarIncident?: string;
  commands?: string;
  assignee?: string;
  timeline?: AlertTimelineItem[];
  comments?: AlertComment[];
}

interface AlertsConfig {
  channels: {
    android: boolean;
    ios: boolean;
    inApp: boolean;
    email: boolean;
    telegram: boolean;
    slack: boolean;
    teams: boolean;
    discord: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  alertFrequency: string;
  severityThreshold: string;
  teamNotifications: string;
}

interface AuditLogItem {
  id: string;
  user: string;
  role: string;
  timestamp: string;
  action: string;
  result: string;
  auditEntry: string;
}

interface AlertCenterProps {
  onAddMemoryEvent?: (event: any) => void;
}

export default function AlertCenter({ onAddMemoryEvent }: AlertCenterProps) {
  // Dark/Light Mode state
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'preferences' | 'audit'>('alerts');
  
  // Data States
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [config, setConfig] = useState<AlertsConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [newCommentInput, setNewCommentInput] = useState('');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'acknowledged' | 'resolved' | 'all'>('active');

  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Fetch all alerts, preferences, and audit logs
  const fetchData = async () => {
    try {
      const [alertsRes, configRes, auditRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/alerts/config'),
        fetch('/api/alerts/audit-log')
      ]);

      const alertsType = alertsRes.headers.get('content-type');
      const configType = configRes.headers.get('content-type');
      const auditType = auditRes.headers.get('content-type');

      if (
        alertsRes.ok && alertsType && alertsType.includes('application/json') &&
        configRes.ok && configType && configType.includes('application/json') &&
        auditRes.ok && auditType && auditType.includes('application/json')
      ) {
        const alertsData = await alertsRes.json();
        const configData = await configRes.json();
        const auditData = await auditRes.json();

        setAlerts(alertsData);
        setConfig(configData);
        setAuditLogs(auditData);

        // Keep current selected alert sync or set first active alert if none selected
        if (selectedAlert) {
          const freshSelected = alertsData.find((a: any) => a.id === selectedAlert.id);
          if (freshSelected) {
            setSelectedAlert(freshSelected);
          }
        } else if (alertsData.length > 0) {
          // Select first active alert
          const firstActive = alertsData.find((a: any) => a.status === 'active');
          setSelectedAlert(firstActive || alertsData[0]);
        }
      }
    } catch (err) {
      console.warn('Alerts state is temporarily reloading or server is restarting...', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for real-time updates every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Play alert notification sound simulation
  const triggerNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime); // High pitch notification chime
      gainNode.gain.setValueAtTime(0.08, context.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio feedback blocked by browser settings');
    }
  };

  // Handle Mitigating Actions (Acknowledge, Snooze, Resolve, Approve, Reject)
  const handleAlertAction = async (alertId: string, action: string, extraData?: any) => {
    setActionInProgress(alertId + '-' + action);
    triggerNotificationSound();

    try {
      const loggedUser = JSON.parse(localStorage.getItem('aime_user') || '{"username":"sysadmin_clara","role":"Lead SRE Engineer"}');
      
      const response = await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          action,
          operator: loggedUser.username,
          role: loggedUser.role,
          ...extraData
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlerts(result.alerts);
        setAuditLogs(result.auditLog);
        
        // Update selected alert with refreshed fields
        const refreshedSelected = result.alerts.find((a: any) => a.id === alertId);
        if (refreshedSelected) {
          setSelectedAlert(refreshedSelected);
        }
      }
    } catch (err) {
      console.error('Error triggering alert action mitigation:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Save modified config
  const handleSaveConfig = async (updatedConfig: AlertsConfig) => {
    try {
      const response = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (response.ok) {
        const saved = await response.json();
        setConfig(saved);
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  // Helper styles for severity
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-amber-500';
      case 'Low': return 'text-blue-500';
      default: return 'text-zinc-500';
    }
  };

  // Filter Alerts
  const filteredAlerts = alerts.filter(alert => {
    // 1. Status Filter
    if (statusFilter !== 'all' && alert.status !== statusFilter) {
      return false;
    }

    // 2. Search query
    const matchSearch = 
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    // 3. Severity filter
    if (severityFilter !== 'all' && alert.severity !== severityFilter) {
      return false;
    }

    // 4. Environment filter
    if (envFilter !== 'all' && alert.environment !== envFilter) {
      return false;
    }

    // 5. Time filter
    if (timeFilter !== 'all') {
      const alertTime = new Date(alert.timestamp).getTime();
      const now = Date.now();
      if (timeFilter === '15m' && now - alertTime > 15 * 60 * 1000) return false;
      if (timeFilter === '1h' && now - alertTime > 60 * 60 * 1000) return false;
      if (timeFilter === '24h' && now - alertTime > 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
  const acknowledgedAlertsCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedAlertsCount = alerts.filter(a => a.status === 'resolved').length;

  return (
    <div className={`space-y-6 text-left rounded-2xl p-1 md:p-2 transition-all duration-300 ${
      themeMode === 'light' ? 'bg-zinc-50 text-zinc-900 border border-zinc-200' : 'text-zinc-100'
    }`}>
      
      {/* Top Bar / Theme & Sound Controllers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="relative">
              {activeAlertsCount > 0 ? (
                <BellRing className="w-6 h-6 text-indigo-400 animate-bounce" />
              ) : (
                <Bell className="w-6 h-6 text-zinc-400" />
              )}
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center font-mono animate-pulse">
                  {activeAlertsCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
                Mobile Alerting & Remediation Console
              </h1>
              <p className={`text-xs mt-0.5 ${themeMode === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Deliver real-time push notifications, track auto-diagnosed failures, and authorize instant mitigations.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto font-mono text-xs">
          {/* Light/Dark mode toggle */}
          <button
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded border flex items-center gap-1.5 transition-all cursor-pointer ${
              themeMode === 'light' 
                ? 'bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Light / Dark Mode"
          >
            {themeMode === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-zinc-600" />
                <span>DARK CONSOLE</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>LIGHT CONSOLE</span>
              </>
            )}
          </button>

          {/* Sound simulation toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              triggerNotificationSound();
            }}
            className={`p-2 rounded border flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>AUDIO: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
                <span>AUDIO: MUTED</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900/10 px-2 py-1 rounded border border-zinc-800">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span>REAL-TIME ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Console Tabs */}
      <div className="flex border-b border-zinc-850 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'alerts'
              ? 'border-indigo-500 text-indigo-400 font-extrabold bg-zinc-900/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          ACTIVE ALERT CENTER
          {activeAlertsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-mono leading-none">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('preferences')}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'preferences'
              ? 'border-indigo-500 text-indigo-400 font-extrabold bg-zinc-900/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          NOTIFICATIONS PREFERENCES
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'audit'
              ? 'border-indigo-500 text-indigo-400 font-extrabold bg-zinc-900/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Remediation Audit Trail
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px]">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* LOADING BANNER */}
      {loading && (
        <div className="p-8 text-center bg-zinc-900/10 rounded-xl border border-zinc-800 flex flex-col items-center justify-center font-mono">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
          <span className="text-xs">Synchronizing Alert Registry Database...</span>
        </div>
      )}

      {/* RENDER ACTIVE ALERT CENTER */}
      {activeSubTab === 'alerts' && !loading && (
        <div className="space-y-4">
          
          {/* Quick-Stats Overview Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setStatusFilter('active')}
              className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
                statusFilter === 'active' 
                  ? 'bg-red-500/10 border-red-500/40 text-red-400 ring-1 ring-red-500/20' 
                  : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Active Alert Count</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="text-2xl font-black font-mono mt-1 text-red-500">{activeAlertsCount}</div>
              <p className="text-[9px] text-zinc-500 mt-1">Requiring immediate human / automatic SRE authorization</p>
            </button>

            <button
              onClick={() => setStatusFilter('acknowledged')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'acknowledged' 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 ring-1 ring-amber-500/20' 
                  : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">On-Call Acknowledged</span>
              <div className="text-2xl font-black font-mono mt-1 text-amber-500">{acknowledgedAlertsCount}</div>
              <p className="text-[9px] text-zinc-500 mt-1">Snoozed or actively researched by operations engineers</p>
            </button>

            <button
              onClick={() => setStatusFilter('resolved')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'resolved' 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/20' 
                  : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Healed & Remediation Log</span>
              <div className="text-2xl font-black font-mono mt-1 text-emerald-500">{resolvedAlertsCount}</div>
              <p className="text-[9px] text-zinc-500 mt-1">Auto-mitigations applied, drift synced, or closed manually</p>
            </button>
          </div>

          {/* Filter Bar Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alert title, cluster name, category, host..."
                className="w-full pl-9 pr-3 py-1.5 rounded bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* Severity Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                <Sliders className="w-3.5 h-3.5" />
                <span>FILTERS:</span>
              </div>
              
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 text-xs rounded px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High+</option>
                <option value="Medium">Medium+</option>
                <option value="Low">Low+</option>
                <option value="Info">Info Only</option>
              </select>

              {/* Environment Filter */}
              <select
                value={envFilter}
                onChange={(e) => setEnvFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 text-xs rounded px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">All Environments</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>

              {/* Time Range Filter */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 text-xs rounded px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="all">All Time History</option>
                <option value="15m">Last 15 Minutes</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
              </select>

              {/* Reset Filters */}
              {(severityFilter !== 'all' || envFilter !== 'all' || timeFilter !== 'all' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setSeverityFilter('all');
                    setEnvFilter('all');
                    setTimeFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 bg-zinc-800 text-[10px] text-zinc-400 hover:text-white rounded border border-zinc-700 font-mono transition-all"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* SPLIT SCREEN WORKSPACE LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT COLUMN: ALERT CARDS LIST */}
            <div className="lg:col-span-7 space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => {
                  const isActive = alert.status === 'active';
                  const isAck = alert.status === 'acknowledged';
                  const isSelected = selectedAlert?.id === alert.id;

                  return (
                    <motion.div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-900/10' 
                          : themeMode === 'light'
                            ? 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                            : 'bg-zinc-950/50 border-zinc-900/80 hover:border-zinc-800 hover:bg-zinc-900/10'
                      }`}
                      whileHover={{ scale: 1.005 }}
                    >
                      {/* Alert Card Header info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-extrabold border ${getSeverityBadge(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${
                              alert.environment === 'Production' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : alert.environment === 'Staging'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {alert.environment.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">{alert.category}</span>
                          </div>

                          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>

                        <div>
                          <h3 className={`text-xs font-bold leading-snug flex items-center gap-1.5 ${
                            isActive ? 'text-zinc-100' : 'text-zinc-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              alert.status === 'active' 
                                ? 'bg-red-500 animate-pulse' 
                                : alert.status === 'acknowledged'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`} />
                            <span className={themeMode === 'light' ? 'text-zinc-900' : ''}>{alert.title}</span>
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1 break-all">
                            Resource: <strong className={themeMode === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>{alert.resourceName}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Card Footer status log */}
                      <div className="mt-3 pt-2 border-t border-zinc-900/60 flex items-center justify-between text-[9px] font-mono">
                        <span className="text-zinc-500 uppercase">State Check:</span>
                        <span className={`font-bold uppercase tracking-wider ${
                          alert.status === 'active' 
                            ? 'text-red-400' 
                            : alert.status === 'acknowledged'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}>
                          {alert.status}
                          {alert.snoozedUntil && ' (Snoozed)'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-12 text-center bg-zinc-950/20 border border-zinc-900 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                  <p className="text-xs font-mono text-zinc-400">NO ALERTS FOUND IN THIS CATEGORY</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-sm mx-auto">
                    Try adjusting your filters, searching for another service name, or check the notification threshold in your preferences.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: DETAIL/INSPECTOR DRAWER & REMEDIATION BUTTONS */}
            <div className="lg:col-span-5">
              {selectedAlert ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-5 rounded-xl border flex flex-col justify-between h-full min-h-[580px] text-left transition-all ${
                    themeMode === 'light'
                      ? 'bg-white border-zinc-200 shadow'
                      : 'bg-zinc-950 border-zinc-900'
                  }`}
                >
                  <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">AIME Incident Control</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${getSeverityBadge(selectedAlert.severity)}`}>
                          {selectedAlert.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(selectedAlert.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Alert Title & Host */}
                    <div>
                      <h2 className="text-sm font-extrabold font-mono text-white leading-tight break-words flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${getSeverityIconColor(selectedAlert.severity)}`} />
                        <span className={themeMode === 'light' ? 'text-zinc-900' : ''}>{selectedAlert.title}</span>
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">Resource:</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            {selectedAlert.resourceName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">Env:</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {selectedAlert.environment}
                          </span>
                        </div>
                      </div>

                      {/* TEAM COLLABORATION: INCIDENT ASSIGNMENT */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-900/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500 uppercase tracking-wider">Incident Assignee:</span>
                        <select
                          value={selectedAlert.assignee || ''}
                          onChange={(e) => handleAlertAction(selectedAlert.id, 'assign_alert', { assignee: e.target.value })}
                          className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded px-2.5 py-1 text-[10px] font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">-- Unassigned --</option>
                          <option value="sysadmin_clara">sysadmin_clara (Lead SRE)</option>
                          <option value="sre_sarah">sre_sarah (DevOps Senior)</option>
                          <option value="on_call_steve">on_call_steve (On-Call Specialist)</option>
                        </select>
                      </div>
                    </div>

                    {/* Detailed Root Cause analysis section */}
                    {selectedAlert.rootCause && (
                      <div className="p-3 rounded bg-zinc-900/50 border border-zinc-850 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block">Detected Root Cause:</span>
                        <p className={`text-xs font-sans leading-relaxed ${themeMode === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}>
                          {selectedAlert.rootCause}
                        </p>
                      </div>
                    )}

                    {/* AI Analysis segment */}
                    {selectedAlert.aiAnalysis && (
                      <div className="p-3.5 rounded-lg bg-indigo-950/10 border border-indigo-500/10 space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold tracking-wider">Cognitive AI Impact Analysis:</span>
                        </div>
                        <p className="text-xs font-sans leading-relaxed text-zinc-300">
                          {selectedAlert.aiAnalysis}
                        </p>
                      </div>
                    )}

                    {/* AI INCIDENT INVESTIGATION: EXPANDED DETAILED FIELDS */}
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-900/80 space-y-3 font-mono text-[10px]">
                      <span className="text-[9px] uppercase text-indigo-400 font-bold tracking-wider block border-b border-zinc-900 pb-1.5">SRE Investigation Metrics</span>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <span className="text-zinc-500 block uppercase">Risk Profile:</span>
                          <span className="font-bold text-red-400">{selectedAlert.riskLevel || 'HIGH - Manual Review Required'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase">Est. Heal Time:</span>
                          <span className="font-bold text-emerald-400">{selectedAlert.estimatedResolutionTime || '5 minutes'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 block uppercase">System Performance Impact:</span>
                        <span className="text-zinc-300 leading-normal">{selectedAlert.impact || 'Service latency degradation under active load locks.'}</span>
                      </div>

                      {selectedAlert.previousSimilarIncident && (
                        <div>
                          <span className="text-zinc-500 block uppercase">Previous Similar Outage:</span>
                          <span className="text-indigo-300 underline cursor-pointer hover:text-indigo-200">
                            {selectedAlert.previousSimilarIncident}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* REPOSITIONED REMEDIATION COMMANDS */}
                    {selectedAlert.commands && (
                      <div className="p-3 rounded bg-zinc-950 border border-zinc-900 font-mono text-[10px] space-y-2">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                          <span className="text-[9px] uppercase text-zinc-500 font-bold">Staged Runbook CLI Command</span>
                          <span className="text-[8px] bg-indigo-950 text-indigo-400 px-1 py-0.2 rounded font-bold">AUTOMATION READY</span>
                        </div>
                        <pre className="p-2 rounded bg-black border border-zinc-900 text-zinc-300 overflow-x-auto text-[9.5px] leading-relaxed select-all">
                          <code>{selectedAlert.commands}</code>
                        </pre>
                      </div>
                    )}

                    {/* INTERACTIVE VERTICAL TIMELINE */}
                    {selectedAlert.timeline && selectedAlert.timeline.length > 0 && (
                      <div className="p-3 rounded bg-zinc-900/20 border border-zinc-900/60 space-y-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block tracking-wider font-bold">Incident Telemetry Timeline:</span>
                        <div className="space-y-3.5 pl-1.5 relative border-l border-zinc-850 font-mono text-[10px]">
                          {selectedAlert.timeline.map((t, idx) => (
                            <div key={idx} className="relative pl-3.5">
                              {/* Circle point */}
                              <span className="absolute -left-[10px] top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-zinc-950" />
                              <div className="flex items-baseline gap-2">
                                <span className="text-zinc-500 text-[9px] font-bold shrink-0">{t.time}</span>
                                <span className="text-zinc-300 text-[9.5px] leading-tight">{t.event}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SRE OPERATOR TEAM CHAT FEED */}
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-900 space-y-3">
                      <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider font-mono block">Operator Room Comments ({selectedAlert.comments?.length || 0})</span>
                      
                      <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedAlert.comments && selectedAlert.comments.length > 0 ? (
                          selectedAlert.comments.map((comment) => (
                            <div key={comment.id} className="p-2 rounded bg-zinc-900/50 border border-zinc-850/40 text-[10.5px]">
                              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mb-1">
                                <span className="font-bold text-zinc-300">{comment.user} ({comment.role})</span>
                                <span>{new Date(comment.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-zinc-300 font-sans leading-relaxed text-left">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-600 block text-center py-2">No operator notes left on this incident yet.</span>
                        )}
                      </div>

                      {/* Mention Quick Adders */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                        <span>Mention:</span>
                        {['@sysadmin_clara', '@sre_sarah', '@on_call_steve'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setNewCommentInput(prev => prev + ' ' + m)}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-850 text-indigo-400 hover:text-indigo-300"
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="flex gap-2">
                        <textarea
                          placeholder="Write technical note or tag operators..."
                          value={newCommentInput}
                          onChange={(e) => setNewCommentInput(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newCommentInput.trim()) return;
                            handleAlertAction(selectedAlert.id, 'add_comment', { commentText: newCommentInput });
                            setNewCommentInput('');
                          }}
                          className="px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer self-stretch"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recommended Action segment */}
                    {selectedAlert.recommendedAction && (
                      <div className="p-3 rounded bg-zinc-900/20 border border-zinc-850 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 block">Recommended Action (SRE Playbook):</span>
                        <p className="text-xs font-mono text-indigo-300 break-words leading-normal">
                          💡 {selectedAlert.recommendedAction}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ACTIVE ACTION BUTTONS PANEL */}
                  <div className="mt-6 pt-4 border-t border-zinc-900 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase">
                      <span>Mitigate / Resolve Alert:</span>
                      <span>Status: <strong className="text-indigo-400">{selectedAlert.status}</strong></span>
                    </div>

                    {selectedAlert.status !== 'resolved' ? (
                      <div className="space-y-2">
                        {/* AUTO REMEDIATION GUARDRAIL APPROVAL CHECKBOX */}
                        {(selectedAlert.severity === 'Critical' || selectedAlert.severity === 'High') && (
                          <div className="p-3 rounded-lg bg-amber-950/10 border border-amber-500/20 text-left space-y-2">
                            <span className="text-[9px] font-mono uppercase text-amber-500 font-bold block">🛡️ AI Auto-Remediation Shield Guardrail</span>
                            <p className="text-[10px] text-zinc-400 font-sans leading-normal">
                              Remediation scripts run as root with shell execution privileges. Please verify impact parameters before executing the staged automated command runbook.
                            </p>
                            <label className="flex items-start gap-2 text-[9.5px] font-mono text-zinc-300 cursor-pointer select-none">
                              <input
                                id="guardrail-consent-checkbox"
                                type="checkbox"
                                defaultChecked={false}
                                className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span>I authorize production runbook execution and accept SRE risk level</span>
                            </label>
                          </div>
                        )}

                        {/* Critical / High Auto-remendations */}
                        {(selectedAlert.severity === 'Critical' || selectedAlert.severity === 'High') ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const checkbox = document.getElementById('guardrail-consent-checkbox') as HTMLInputElement;
                                if (checkbox && !checkbox.checked) {
                                  alert('SRE Guardrail block: Please check the consent checkbox to authorize this automated action.');
                                  return;
                                }
                                handleAlertAction(selectedAlert.id, 'approve_action');
                              }}
                              disabled={actionInProgress !== null}
                              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider transition-all cursor-pointer uppercase font-mono flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              APPROVE AUTOMATION
                            </button>
                            <button
                              onClick={() => handleAlertAction(selectedAlert.id, 'reject_action')}
                              disabled={actionInProgress !== null}
                              className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-red-500/40 text-red-400 hover:bg-zinc-850 text-xs tracking-wider transition-all cursor-pointer uppercase font-mono flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              REJECT ACTION
                            </button>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleAlertAction(selectedAlert.id, 'acknowledge')}
                            disabled={selectedAlert.status === 'acknowledged' || actionInProgress !== null}
                            className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-850 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30"
                          >
                            ACKNOWLEDGE
                          </button>
                          <button
                            onClick={() => handleAlertAction(selectedAlert.id, 'snooze')}
                            disabled={actionInProgress !== null}
                            className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:bg-zinc-850 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            title="Snooze and silence notifications for 30 minutes"
                          >
                            SNOOZE 30M
                          </button>
                          <button
                            onClick={() => handleAlertAction(selectedAlert.id, 'resolve')}
                            disabled={actionInProgress !== null}
                            className="px-2 py-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                          >
                            RESOLVE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-500/10 flex items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">REMEDIATED & RESOLVED</span>
                            <span className="text-[10px] font-mono text-zinc-500">Baseline sync successfully validated.</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Healed</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="p-8 rounded-xl border border-zinc-900 bg-zinc-950/40 flex flex-col items-center justify-center text-center h-full min-h-[480px]">
                  <Bell className="w-10 h-10 text-zinc-600 mb-2 animate-pulse" />
                  <p className="text-xs font-mono text-zinc-400">SELECT AN ALERT FOR REMEDIATION INSPECTION</p>
                  <p className="text-[10px] text-zinc-600 font-sans max-w-[200px] mt-1.5">
                    Click any alert card on the left to inspect AI-powered root cause analysis and execute instant on-call actions.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* RENDER NOTIFICATION PREFERENCES */}
      {activeSubTab === 'preferences' && config && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950 text-left space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Enterprise Notification Delivery Preferences
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Configure quiet hours, filter thresholds, and turn on/off delivery channels for real-time mobile push and group notifications.
              </p>
            </div>

            {/* Channels grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Active Communication Channels
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. In App */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">In-App Console Toast</span>
                      <span className="text-[10px] text-zinc-500">Flashes alerts in active console</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.inApp}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, inApp: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 2. Email */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Operator Email Group</span>
                      <span className="text-[10px] text-zinc-500">Sends full markdown summary reports</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.email}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, email: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 3. Android Push */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Android Push Notifications</span>
                      <span className="text-[10px] text-zinc-500">Google FCM instant mobile delivery</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.android}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, android: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 4. iOS Push */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Apple iOS Push (APNS)</span>
                      <span className="text-[10px] text-zinc-500">Instant APNS background waking</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.ios}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, ios: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 5. Slack */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <Slack className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Slack Webhook Delivery</span>
                      <span className="text-[10px] text-zinc-500">Delivers rich cards to Slack channel</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.slack}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, slack: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 6. Discord */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-indigo-950 text-indigo-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Discord Developer Bot</span>
                      <span className="text-[10px] text-zinc-500">JSON payload integrations to webhook</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.discord}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, discord: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 7. Teams */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-zinc-900 text-zinc-500">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Microsoft Teams</span>
                      <span className="text-[10px] text-zinc-500">Office 365 Connector endpoints</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.teams}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, teams: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 8. Telegram */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-zinc-900 text-zinc-500">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Telegram Alert Bot</span>
                      <span className="text-[10px] text-zinc-500">Pushes formatted messages via API</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.telegram}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, telegram: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 9. SMS (Optional) */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-zinc-900 text-zinc-500">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Twilio SMS gateway</span>
                      <span className="text-[10px] text-zinc-500">Sends legacy text notifications</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.sms}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, sms: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 10. WhatsApp (Optional) */}
                <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-zinc-900 text-zinc-500">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">WhatsApp Business API</span>
                      <span className="text-[10px] text-zinc-500">Direct sandbox text messages</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.channels.whatsapp}
                    onChange={(e) => handleSaveConfig({
                      ...config,
                      channels: { ...config.channels, whatsapp: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quiet hours & logic settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-zinc-900">
              {/* Quiet hours container */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Quiet Hours Scheduling
                </h3>
                
                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Enable Silence Schedule</span>
                      <span className="text-[10px] text-zinc-500">Only critical alerts bypass silence</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.quietHoursEnabled}
                      onChange={(e) => handleSaveConfig({
                        ...config,
                        quietHoursEnabled: e.target.checked
                      })}
                      className="w-4 h-4 text-indigo-600 bg-zinc-950 border-zinc-800 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase block mb-1">Start Time:</label>
                      <input
                        type="text"
                        value={config.quietHoursStart}
                        onChange={(e) => handleSaveConfig({
                          ...config,
                          quietHoursStart: e.target.value
                        })}
                        placeholder="22:00"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                        disabled={!config.quietHoursEnabled}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase block mb-1">End Time:</label>
                      <input
                        type="text"
                        value={config.quietHoursEnd}
                        onChange={(e) => handleSaveConfig({
                          ...config,
                          quietHoursEnd: e.target.value
                        })}
                        placeholder="08:00"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                        disabled={!config.quietHoursEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Thresholds & team alerts routing */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Alert Severity Boundaries
                </h3>

                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block mb-1.5">Notification Frequency Rule:</label>
                    <select
                      value={config.alertFrequency}
                      onChange={(e) => handleSaveConfig({
                        ...config,
                        alertFrequency: e.target.value
                      })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Instant">Instant Delivery (Recommended)</option>
                      <option value="Digest Hourly">Hourly Digest Bundle</option>
                      <option value="Digest Daily">Daily SRE Operations Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block mb-1.5">Minimum Severity Threshold:</label>
                    <select
                      value={config.severityThreshold}
                      onChange={(e) => handleSaveConfig({
                        ...config,
                        severityThreshold: e.target.value
                      })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Info">Info and above (Verbose)</option>
                      <option value="Low">Low and above</option>
                      <option value="Medium">Medium and above</option>
                      <option value="High">High and above</option>
                      <option value="Critical">Critical alerts only (Minimalist)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block mb-1.5">Team Notification Mailing Group:</label>
                    <input
                      type="text"
                      value={config.teamNotifications}
                      onChange={(e) => handleSaveConfig({
                        ...config,
                        teamNotifications: e.target.value
                      })}
                      placeholder="sre-alerts@aime-enterprise.io"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* RENDER REMEDIATION AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Audit trail overview text */}
          <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Enterprise SOC-2 / ISO-27001 Compliance Trail</span>
                <span className="text-[11px] text-zinc-400 font-sans block mt-0.5">
                  All automated mitigation script approvals, alert acknowledgements, and manual overrides are logged irreversibly with on-call credentials.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-600">Enterprise Protocol: SOC2-SEC-v3</span>
          </div>

          {/* Audit list logs */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 uppercase bg-zinc-950/40">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Operator (Role)</th>
                    <th className="p-3.5">Action Taken</th>
                    <th className="p-3.5">Remediation Result</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-zinc-900/40 hover:bg-zinc-900/20 transition-all">
                        <td className="p-3.5 text-zinc-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-200">@{log.user}</span>
                            <span className="text-[9px] text-zinc-500 block">{log.role}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] border ${
                            log.action.includes('Approve') 
                              ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20 font-bold' 
                              : log.action.includes('Reject')
                                ? 'bg-red-950/20 text-red-400 border-red-500/20'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1 max-w-sm">
                            <p className="text-zinc-300 font-sans leading-normal text-xs">{log.result}</p>
                            <span className="text-[9px] text-zinc-500 block font-mono italic">Log: {log.auditEntry}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-600">
                        Audit trail ledger is empty. Activating mitigations records compliance logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
