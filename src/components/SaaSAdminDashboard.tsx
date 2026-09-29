import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Users, Server, ShieldAlert, BarChart3, TrendingUp, CreditCard, Activity, Building, Lock, Search, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SaaSAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 14850,
    arr: 178200,
    totalOrganizations: 42,
    activeUsers: 318,
    connectedServers: 1240,
    totalIncidentsManaged: 8912,
    planBreakdown: { free: 15, pro: 20, enterprise: 7 },
    failedPaymentsCount: 1,
    systemStatus: '100% OPERATIONAL'
  });

  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAdminMetrics();
  }, []);

  const fetchAdminMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        if (data.users) setUsers(data.users);
      }
    } catch (e) {
      console.warn('Failed to load admin metrics', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u: any) => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.orgName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* SaaS Owner Header */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-violet-950/20 to-zinc-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/40">
              SaaS Owner & Super Admin Dashboard
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {metrics.systemStatus}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive Platform Metrics & Tenant Revenue</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Global operational overview of AIME active organizations, MRR, user seats, server connections, and system health.
          </p>
        </div>

        <button
          onClick={fetchAdminMetrics}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh SaaS Telemetry
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase">Monthly Revenue (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${(metrics.mrr || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +14.2% from last month
          </div>
        </div>

        {/* ARR */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase">Annual Run Rate (ARR)</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${(metrics.arr || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-400 font-mono">
            Annualized contract value
          </div>
        </div>

        {/* Total Customers */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase">Active Tenants</span>
            <Building className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {metrics.totalOrganizations || 0} Orgs
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {metrics.activeUsers || 0} Active User Seats
          </div>
        </div>

        {/* Servers Monitored */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase">Managed Nodes</span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {metrics.connectedServers || 0} Nodes
          </div>
          <div className="text-[10px] text-sky-400 font-mono">
            {(metrics.totalIncidentsManaged || 0).toLocaleString()} Incidents Processed
          </div>
        </div>
      </div>

      {/* Subscription Tier Distribution & Failed Payments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier Breakdown */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Subscription Tier Breakdown across Organizations
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Free Tier</span>
              <div className="text-xl font-bold text-white font-mono">{metrics.planBreakdown?.free || 0} Orgs</div>
              <p className="text-[10px] text-zinc-500 font-mono">$0 / mo revenue</p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
              <span className="text-[10px] font-mono text-indigo-400 uppercase">Pro Tier</span>
              <div className="text-xl font-bold text-white font-mono">{metrics.planBreakdown?.pro || 0} Orgs</div>
              <p className="text-[10px] text-indigo-300 font-mono">${(metrics.planBreakdown?.pro || 0) * 49} / mo revenue</p>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-1">
              <span className="text-[10px] font-mono text-violet-400 uppercase">Enterprise Tier</span>
              <div className="text-xl font-bold text-white font-mono">{metrics.planBreakdown?.enterprise || 0} Orgs</div>
              <p className="text-[10px] text-violet-300 font-mono">${(metrics.planBreakdown?.enterprise || 0) * 199} / mo revenue</p>
            </div>
          </div>
        </div>

        {/* Failed Payment Alert Box */}
        <div className="rounded-2xl border border-red-950/50 bg-red-950/10 p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ShieldAlert className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Failed Billing Alerts</h3>
            </div>
            <p className="text-xs text-zinc-400">
              There is currently <span className="font-bold text-red-300">{metrics.failedPaymentsCount}</span> payment retry event requiring operator dunning review.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-red-900/30 text-[11px] font-mono text-zinc-300 space-y-1">
            <div className="text-red-400 font-bold">Acme Corp — Pro Plan ($49)</div>
            <div className="text-zinc-500 text-[10px]">Card Decline (Insufficient Funds) • Retry #2</div>
          </div>

          <button
            onClick={() => alert('Dunning notification dispatched to organization admin.')}
            className="w-full py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-mono cursor-pointer transition-all text-center"
          >
            Dispatch Dunning Email
          </button>
        </div>
      </div>

      {/* Users & Tenant Accounts Management */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Platform Accounts & User Directory</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter users or roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                <th className="pb-2">User / Operator</th>
                <th className="pb-2">Organization</th>
                <th className="pb-2">Role & RBAC</th>
                <th className="pb-2">MFA Status</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {[
                { username: 'sre_sarah', org: 'AIME Core Ops', role: 'Owner', mfa: 'ENABLED', status: 'ACTIVE' },
                { username: 'devops_alex', org: 'AIME Core Ops', role: 'Admin', mfa: 'ENABLED', status: 'ACTIVE' },
                { username: 'sysadmin_clara', org: 'AIME Core Ops', role: 'SRE Lead', mfa: 'ENABLED', status: 'ACTIVE' },
                { username: 'm_johnson', org: 'Acme Cloud', role: 'DevOps Engineer', mfa: 'PENDING', status: 'ACTIVE' },
                { username: 'r_patel', org: 'Global Tech Ltd', role: 'Developer', mfa: 'ENABLED', status: 'ACTIVE' }
              ].map((u) => (
                <tr key={u.username} className="text-zinc-300 hover:bg-zinc-900/60">
                  <td className="py-2.5 font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-[10px]">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    @{u.username}
                  </td>
                  <td className="py-2.5 text-zinc-400">{u.org}</td>
                  <td className="py-2.5">
                    <span className="bg-zinc-950 border border-zinc-800 text-indigo-400 px-2 py-0.5 rounded text-[10px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] ${
                      u.mfa === 'ENABLED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {u.mfa}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
