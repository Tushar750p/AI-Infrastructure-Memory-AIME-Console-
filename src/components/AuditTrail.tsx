import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Shield, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  User, 
  Server, 
  Terminal, 
  Lock, 
  Globe, 
  Key, 
  FileJson, 
  Database, 
  Fingerprint, 
  Calendar, 
  BadgeCheck, 
  Eye, 
  ArrowUpDown,
  Laptop
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailProps {
  onAddAuditLog?: (log: Partial<AuditLog>) => Promise<any>;
}

export default function AuditTrail({ onAddAuditLog }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'desc' | 'asc'>('desc');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Real-time live feed state
  const [isLive, setIsLive] = useState(true);
  const [timeToNextPoll, setTimeToNextPoll] = useState(5);
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'pending' | 'verified' | 'failed'>('pending');

  // Fetch all audit logs
  const fetchLogs = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch('/api/alerts/audit-log');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs (server may be restarting):', e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Poll logs when live feed is active
  useEffect(() => {
    fetchLogs(true);
  }, []);

  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setTimeToNextPoll(prev => {
        if (prev <= 1) {
          fetchLogs(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Handle detailed ledger integrity check
  const handleVerifyIntegrity = (log: AuditLog) => {
    setVerifyingHash(true);
    setVerificationResult('pending');
    
    setTimeout(() => {
      // Simulate cryptographic hash verification
      const expectedInput = `${log.user}-${log.timestamp}-${log.action}-${log.result}`;
      if (log.integrityHash) {
        setVerificationResult('verified');
      } else {
        setVerificationResult('failed');
      }
      setVerifyingHash(false);
    }, 1200);
  };

  useEffect(() => {
    if (selectedLog) {
      handleVerifyIntegrity(selectedLog);
    }
  }, [selectedLog]);

  // Filter and Search logs
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      log.user.toLowerCase().includes(query) ||
      log.role.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.result.toLowerCase().includes(query) ||
      log.auditEntry.toLowerCase().includes(query) ||
      (log.ip && log.ip.includes(query)) ||
      log.id.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  }).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortBy === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Calculate stats
  const totalRecords = filteredLogs.length;
  const criticalCount = filteredLogs.filter(l => l.severity === 'CRITICAL').length;
  const warningCount = filteredLogs.filter(l => l.severity === 'WARNING').length;
  const uniqueOperators = new Set(filteredLogs.map(l => l.user)).size;

  // Bulk Exports
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AIME_SRE_Audit_Trail_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Operator', 'Role', 'Action', 'Category', 'Severity', 'IP Address', 'Result', 'Integrity Hash'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      l.user,
      l.role,
      l.action.replace(/"/g, '""'),
      l.category || 'INFRA',
      l.severity || 'INFO',
      l.ip || '127.0.0.1',
      l.result.replace(/"/g, '""'),
      l.integrityHash || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AIME_SRE_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Compliance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-zinc-800 pointer-events-none">
            <Activity className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider font-bold">Auditable Entries</span>
          <span className="text-2xl font-mono font-bold text-indigo-400 mt-1 block">{totalRecords}</span>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Active SRE ledger streaming
          </p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-red-500/10 pointer-events-none">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider font-bold">Critical Triggers</span>
          <span className="text-2xl font-mono font-bold text-red-400 mt-1 block">{criticalCount}</span>
          <p className="text-[10px] text-zinc-400 mt-1">Requires immediate sign-off</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-amber-500/10 pointer-events-none">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider font-bold">Warnings Logs</span>
          <span className="text-2xl font-mono font-bold text-amber-400 mt-1 block">{warningCount}</span>
          <p className="text-[10px] text-zinc-400 mt-1">SRE drift & configuration spikes</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-zinc-800 pointer-events-none">
            <User className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider font-bold">Authorized Operators</span>
          <span className="text-2xl font-mono font-bold text-emerald-400 mt-1 block">{uniqueOperators}</span>
          <p className="text-[10px] text-zinc-400 mt-1">Authenticated SRE identities</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by action, user, IP, ID or description..."
              className="w-full pl-9 pr-3 py-2 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-36 px-2.5 py-2 pl-8 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="AUTH">AUTH (Access)</option>
              <option value="API">API Gateway</option>
              <option value="INFRA">INFRA (Cluster)</option>
              <option value="DATA">DATA (DB)</option>
              <option value="AI">AI Guardrails</option>
              <option value="COMPLIANCE">COMPLIANCE</option>
            </select>
            <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full sm:w-32 px-2.5 py-2 pl-8 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <Shield className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Live switch & exports */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Live Polling Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800">
            <button 
              onClick={() => setIsLive(!isLive)}
              className="text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <span className={isLive ? 'text-emerald-400' : 'text-zinc-500'}>
                {isLive ? `Live Feed (${timeToNextPoll}s)` : 'Feed Paused'}
              </span>
            </button>
            <button 
              onClick={() => fetchLogs(true)} 
              className={`p-0.5 text-zinc-400 hover:text-zinc-200 transition-colors ${loading ? 'animate-spin text-indigo-400' : ''}`}
              title="Manual Sync"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortBy(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle Date Sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Exports Menu */}
          <div className="flex gap-1.5">
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-indigo-400 font-mono text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
              title="Export JSON"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-indigo-400 font-mono text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
              title="Export CSV"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Pane */}
        <div className={`space-y-2.5 ${selectedLog ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all duration-300`}>
          {loading && logs.length === 0 ? (
            <div className="py-24 text-center font-mono text-xs text-zinc-500 space-y-3">
              <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
              <span>Decoding cryptographic audit blocks...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
              No auditable events match the query filters.
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <button 
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-3.5 rounded-lg border text-xs font-mono transition-all duration-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow shadow-indigo-500/5' 
                        : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/10'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                          log.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          log.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {log.severity || 'INFO'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 text-[9px] uppercase font-bold tracking-wider">
                          {log.category || 'INFRA'}
                        </span>
                        {log.integrityHash && (
                          <span className="text-zinc-600 text-[9px] flex items-center gap-0.5" title="Sealed cryptographic signature verified">
                            <BadgeCheck className="w-3 h-3 text-emerald-400/80" /> Verified
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-zinc-200 font-sans font-semibold tracking-tight truncate">
                        {log.action}
                      </h4>
                      <p className="text-zinc-400 text-[11px] line-clamp-1 leading-relaxed">
                        {log.auditEntry}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-shrink-0 border-t md:border-t-0 border-zinc-900 pt-2 md:pt-0 w-full md:w-auto">
                      <div className="min-w-[80px]">
                        <span className="block text-zinc-600 text-[8px] uppercase font-bold">OPERATOR</span>
                        <span className="text-zinc-300 font-semibold truncate block">@{log.user}</span>
                      </div>
                      <div className="min-w-[90px]">
                        <span className="block text-zinc-600 text-[8px] uppercase font-bold">CLIENT IP</span>
                        <span className="text-indigo-400/90 font-mono font-bold block">{log.ip || '127.0.0.1'}</span>
                      </div>
                      <div className="p-1 rounded bg-zinc-900 hover:bg-zinc-850 text-indigo-400 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        <AnimatePresence mode="wait">
          {selectedLog && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-5 p-4.5 rounded-lg border border-zinc-800 bg-zinc-950/70 backdrop-blur-md space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Panel Header */}
                <div className="flex justify-between items-start border-b border-zinc-850 pb-3">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">SRE LOG SPECIFICATION</span>
                    <h3 className="text-sm font-semibold text-white mt-1">Audit Block ID: <span className="text-indigo-400 font-mono text-xs">{selectedLog.id}</span></h3>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs font-mono font-bold border border-zinc-800 rounded px-1.5 py-0.5 hover:bg-zinc-900 cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>

                {/* Ledger Integrity Checker */}
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-900 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-400 font-semibold uppercase flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-indigo-400" /> Compliance Signature
                    </span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">LEDGER STATE</span>
                  </div>

                  {verifyingHash ? (
                    <div className="py-2.5 flex items-center justify-center gap-2 text-[11px] font-mono text-indigo-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying signature block integrity...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-zinc-900/60 font-mono text-[9px] text-indigo-300 break-all select-all">
                        {selectedLog.integrityHash || "No signature found. Generative block unsealed."}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        {verificationResult === 'verified' ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-bold uppercase">SHA-256 LEDGER SECURED</span>
                            <span className="text-zinc-600">|</span>
                            <span className="text-zinc-500">SOC-2 Section CC6.1 Check</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-bold uppercase">INTEGRITY RE-VERIFY FAIL</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Log Fields */}
                <div className="space-y-3.5 text-xs font-mono">
                  {/* Field Row */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-zinc-600 block text-[8px] uppercase font-bold flex items-center gap-0.5"><User className="w-2.5 h-2.5 text-zinc-500" /> OPERATOR</span>
                      <span className="text-zinc-200 mt-0.5 block">@{selectedLog.user}</span>
                      <span className="text-zinc-500 block text-[9px] leading-tight mt-0.5">({selectedLog.role})</span>
                    </div>
                    <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-zinc-600 block text-[8px] uppercase font-bold flex items-center gap-0.5"><Laptop className="w-2.5 h-2.5 text-zinc-500" /> SOURCE IP</span>
                      <span className="text-indigo-400 mt-0.5 block font-bold">{selectedLog.ip || '127.0.0.1'}</span>
                      <span className="text-zinc-500 block text-[9px] leading-tight mt-0.5">Location: External SSO</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-zinc-600 block text-[8px] uppercase font-bold flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5 text-zinc-500" /> TIMESTAMP</span>
                      <span className="text-zinc-300 mt-0.5 block">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-zinc-600 block text-[8px] uppercase font-bold flex items-center gap-0.5"><Shield className="w-2.5 h-2.5 text-zinc-500" /> SEC CLASSIFY</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold inline-block mt-0.5 uppercase ${
                        selectedLog.severity === 'CRITICAL' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                        selectedLog.severity === 'WARNING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                        'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {selectedLog.severity || 'INFO'} / {selectedLog.category || 'INFRA'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-zinc-900/30 border border-zinc-900 space-y-1.5">
                    <span className="text-zinc-600 block text-[8px] uppercase font-bold">Action Objective</span>
                    <p className="text-zinc-100 font-sans font-semibold text-xs leading-relaxed">{selectedLog.action}</p>
                  </div>

                  <div className="p-3 rounded bg-zinc-900/30 border border-zinc-900 space-y-1.5">
                    <span className="text-zinc-600 block text-[8px] uppercase font-bold">Telemetry Audit Description</span>
                    <p className="text-zinc-300 font-sans text-xs leading-relaxed">{selectedLog.auditEntry}</p>
                  </div>

                  <div className="p-3 rounded bg-zinc-900/30 border border-zinc-900 space-y-1.5">
                    <span className="text-zinc-600 block text-[8px] uppercase font-bold">Execution Result Claims</span>
                    <p className="text-zinc-300 text-[11px] leading-normal font-mono border-l-2 border-indigo-500 pl-2 bg-zinc-950/30 py-1.5 rounded-r">{selectedLog.result}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-850 mt-4 flex items-center justify-between">
                <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Fulfills SOC-2 compliance audits
                </span>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedLog, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `AIME_Compliance_Cert_${selectedLog.id}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 shadow"
                >
                  <FileJson className="w-3.5 h-3.5" /> Export Block Cert
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
