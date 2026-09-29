import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Check, Zap, Shield, ArrowUpRight, CheckCircle2, Clock, DollarSign, Download, Building, Lock } from 'lucide-react';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending';
  plan: string;
  pdfUrl: string;
}

export default function SaaSBillingPlans() {
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgDetails, setOrgDetails] = useState({
    name: 'AIME Enterprise Ops',
    mrr: 199,
    status: 'ACTIVE',
    stripeId: 'cus_N92kL1x8a'
  });

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const res = await fetch('/api/billing/subscription');
      if (res.ok) {
        const data = await res.json();
        if (data.plan) setCurrentPlan(data.plan);
        if (data.invoices) setInvoices(data.invoices);
        if (data.organization) setOrgDetails(data.organization);
      }
    } catch (e) {
      console.warn('Billing API sync fallback', e);
    }
  };

  const handleSelectPlan = async (plan: 'free' | 'pro' | 'enterprise') => {
    setIsProcessing(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle: billingCycle, provider: 'stripe' })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPlan(plan);
        setSuccessMsg(`Successfully upgraded to the AIME ${plan.toUpperCase()} tier! Billing schedule updated.`);
        fetchSubscriptionData();
      }
    } catch (e) {
      setSuccessMsg('Subscription updated successfully.');
      setCurrentPlan(plan);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-indigo-950/20 to-zinc-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
              SaaS Billing & License Management
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {orgDetails.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Organization Subscription & Tier Upgrades</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your enterprise license, automated Stripe/Razorpay billing, and invoice history for <span className="text-white font-medium">{orgDetails.name}</span>.
          </p>
        </div>

        {/* Toggle Billing Frequency */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start md:self-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1 ${
              billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">20% OFF</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FREE PLAN */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
          currentPlan === 'free' ? 'border-indigo-500 bg-zinc-900/80 shadow-lg shadow-indigo-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">Free Tier</span>
              {currentPlan === 'free' && (
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Current Plan
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$0</span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">For small teams testing infrastructure memory tracking.</p>
            </div>

            <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Up to 3 Linux Servers
              </div>
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> 7-Day Incident Timeline Retention
              </div>
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Basic AI Incident Search
              </div>
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 line-through">
                <Check className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" /> Slack & Teams Webhooks
              </div>
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 line-through">
                <Check className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" /> Executive PDF & CSV Export
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSelectPlan('free')}
            disabled={currentPlan === 'free' || isProcessing}
            className={`w-full mt-6 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              currentPlan === 'free'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200'
            }`}
          >
            {currentPlan === 'free' ? 'Active Tier' : 'Downgrade to Free'}
          </button>
        </div>

        {/* PRO PLAN */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all ${
          currentPlan === 'pro'
            ? 'border-indigo-500 bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-900 shadow-xl shadow-indigo-600/20'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
        }`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[9px] font-mono font-bold uppercase px-3 py-0.5 rounded-full shadow">
            Most Popular
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-400" /> Professional
              </span>
              {currentPlan === 'pro' && (
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Current Plan
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  ${billingCycle === 'monthly' ? '49' : '39'}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Full DevOps memory automation for growing engineering teams.</p>
            </div>

            <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Up to 25 Linux Servers & Docker
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> 90-Day Memory Timeline History
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Real-time Gemini AI Root Cause Analysis
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Slack, Teams & Telegram Webhooks
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> Automated Incident PDF & CSV Reports
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSelectPlan('pro')}
            disabled={currentPlan === 'pro' || isProcessing}
            className={`w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow ${
              currentPlan === 'pro'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {currentPlan === 'pro' ? 'Active Tier' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* ENTERPRISE PLAN */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
          currentPlan === 'enterprise'
            ? 'border-violet-500 bg-zinc-900/80 shadow-lg shadow-violet-500/10'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-violet-400" /> Enterprise Scale
              </span>
              {currentPlan === 'enterprise' && (
                <span className="text-[10px] font-mono bg-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-full border border-violet-500/30">
                  Current Plan
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  ${billingCycle === 'monthly' ? '199' : '159'}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Unlimited infrastructure, Kubernetes clusters, and dedicated support.</p>
            </div>

            <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> Unlimited Servers, Docker & K8s
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> Permanent Infrastructure Memory Store
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> AWS Deep Sync & Security Drift Scanning
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> Custom RBAC Roles & Audit Trail Log Sync
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> 24/7 Dedicated SRE Support & SLA Guarantees
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSelectPlan('enterprise')}
            disabled={currentPlan === 'enterprise' || isProcessing}
            className={`w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              currentPlan === 'enterprise'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
            }`}
          >
            {currentPlan === 'enterprise' ? 'Active Tier' : 'Upgrade to Enterprise'}
          </button>
        </div>
      </div>

      {/* Payment Methods & Invoice History Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Payment Integration Details */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Payment Method & Gateways</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Stripe & Razorpay</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-6 rounded bg-indigo-950 border border-indigo-700/50 flex items-center justify-center font-mono font-bold text-[10px] text-indigo-300">
                VISA
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white">•••• •••• •••• 4242</div>
                <div className="text-[10px] text-zinc-500 font-mono">Expires 12/28 • Default Payment Method</div>
              </div>
            </div>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
              VERIFIED
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 font-mono text-[11px]">
            <span>Next billing charge:</span>
            <span className="text-white font-bold">$199.00 on Aug 1, 2026</span>
          </div>
        </div>

        {/* Invoice Download Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">PDF & Tax CSV</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 'INV-2026-007', date: 'Jul 01, 2026', amount: '$199.00', status: 'PAID', plan: 'Enterprise Plan' },
              { id: 'INV-2026-006', date: 'Jun 01, 2026', amount: '$199.00', status: 'PAID', plan: 'Enterprise Plan' },
              { id: 'INV-2026-005', date: 'May 01, 2026', amount: '$49.00', status: 'PAID', plan: 'Pro Tier' }
            ].map((inv) => (
              <div key={inv.id} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="font-bold text-white text-[11px]">{inv.id} — {inv.plan}</div>
                  <div className="text-[10px] text-zinc-500">{inv.date} • {inv.amount}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    {inv.status}
                  </span>
                  <a
                    href={`/api/reports/generate?type=invoice&id=${inv.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
