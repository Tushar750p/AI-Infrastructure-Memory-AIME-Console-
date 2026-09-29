import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Shield, Zap, Terminal, Brain, Cpu, MessageSquare, ArrowRight, Play, CheckCircle2, Server, HelpCircle, Mail, Phone, MapPin, Github, Linkedin, ExternalLink, Heart } from 'lucide-react';
import { FAQ_ITEMS } from '../data/mockData';

interface LandingPageProps {
  onLaunchApp: () => void;
  onLaunchDemo: () => void;
  loggedInOperator?: string | null;
}

export default function LandingPage({ onLaunchApp, onLaunchDemo, loggedInOperator }: LandingPageProps) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactSubject, setContactSubject] = useState('Feature Request');
  const [contactMessage, setContactMessage] = useState('');
  const [submittedContact, setSubmittedContact] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactEmail.trim() && contactName.trim()) {
      setSubmittedContact(true);
      setTimeout(() => setSubmittedContact(false), 6000);
      setContactName('');
      setContactEmail('');
      setContactCompany('');
      setContactRole('');
      setContactSubject('Feature Request');
      setContactMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Database className="w-5.5 h-5.5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-sans font-bold tracking-tight text-lg text-white">AI Infrastructure Memory</span>
              <span className="block text-[10px] font-mono tracking-wider uppercase text-cyan-400">AIME SRE ENGINE</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <button onClick={onLaunchDemo} className="hover:text-white transition-colors cursor-pointer bg-transparent border-none text-sm font-medium">Interactive Demo</button>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <button 
              id="header-launch-btn"
              onClick={onLaunchApp}
              className="relative group overflow-hidden px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-1.5 font-bold">
                {loggedInOperator ? `Resume: @${loggedInOperator}` : 'Launch Console'} <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-mono mb-8"
          >
            <Brain className="w-3.5 h-3.5 animate-pulse" />
            <span>UNBROKEN SRE BRAIN FOR MODERN DEVOPS</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-sans font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6"
          >
            SaaS Memory That <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500">Remembers Everything</span> Your Server Experienced.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            An AI-powered SRE system that acts as a continuous memory vault for Linux servers, Docker environments, and Kubernetes. Diagnose incidents instantly, analyze error logs, and get precise historical fixes.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button 
              id="hero-get-started"
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-cyan-500 text-slate-950 font-bold text-base hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              {loggedInOperator ? `Enter Console (@${loggedInOperator})` : 'Get Started Free'} <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-300 font-medium text-base hover:border-slate-700 hover:text-white hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/30"
            >
              <Play className="w-4.5 h-4.5 text-cyan-400 fill-cyan-400/20" /> See System Demo
            </button>
          </motion.div>

          {/* SRE Terminal Sandbox mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-4xl mx-auto rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 shadow-2xl backdrop-blur-sm group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-xl pointer-events-none" />
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60 rounded-t-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
                <span className="text-xs font-mono text-slate-500 ml-2">aime-cli --monitor srv-nginx-prod</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">SSH 10.0.1.12</span>
            </div>
            <div className="bg-slate-950 p-6 rounded-b-lg font-mono text-xs sm:text-sm text-left text-cyan-400 space-y-3 overflow-x-auto min-h-[220px]">
              <p className="text-slate-500"># AIME Memory Engine initialized. Analysing active SRE history...</p>
              <p className="text-slate-300">$ aime memory query --server srv-nginx-prod --incident "HTTP 504"</p>
              <div className="border-l-2 border-cyan-500/50 pl-4 py-1 text-slate-400 space-y-1 bg-cyan-950/10">
                <p className="text-cyan-300 font-bold">🎯 Found Incident Match: [2026-07-11 16:40:00]</p>
                <p>• Root Cause: Connection pool exhaustion. Nginx maxed out at 768 worker_connections.</p>
                <p>• Previous Fix: Sarah modified <span className="text-emerald-400">/etc/nginx/nginx.conf</span> events.worker_connections to 4096.</p>
                <p>• Action: Run "sudo systemctl reload nginx" to sync changes.</p>
              </div>
              <p className="text-emerald-400 flex items-center gap-1">
                <span>✓</span> AI SRE Recommendation ready. Active incident resolved in 15 seconds.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-900 bg-slate-950 py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <span className="block text-3xl sm:text-4xl font-extrabold text-white">99.99%</span>
            <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider font-mono">Mean Time To Detection</span>
          </div>
          <div>
            <span className="block text-3xl sm:text-4xl font-extrabold text-cyan-400">&lt; 30s</span>
            <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider font-mono">Incident Triaging</span>
          </div>
          <div>
            <span className="block text-3xl sm:text-4xl font-extrabold text-white">100%</span>
            <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider font-mono">Terminal Memory Retention</span>
          </div>
          <div>
            <span className="block text-3xl sm:text-4xl font-extrabold text-cyan-400">1.2M+</span>
            <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider font-mono">Commands Registered</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">COMPLETE CAPABILITIES</h2>
          <p className="text-3xl sm:text-5xl font-sans font-extrabold tracking-tight text-white mb-4">
            An Unbroken Memory Layer For SRE Teams.
          </p>
          <p className="text-slate-400 text-base">
            Why start from scratch every time a server breaks? Our platform preserves all previous fixes, errors, commands, and deployments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Infrastructure Memory</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Stores every terminal command, configuration rewrite, and kernel update. Provides AI-powered SRE memory retrieval for rapid root cause analysis.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Terminal SSH Simulator</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connect securely via standard tunneling. Logs administrative action lines directly into the memory log to build complete trace logs of human updates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Log Analyzer</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Paste logs or load files. Gemini parses errors, evaluates risks, summarizes structural root causes, and generates the exact diagnostic commands to run.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Docker & Kubernetes Integration</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Monitor active pods, namespaces, service load-balancers, deployments, container stats, and track OOM restarts automatically.
            </p>
          </div>

          {/* Card 5 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Security Risk Detection</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Identifies SSH brute-force traffic, privilege escalation errors, and vulnerable container ports to warn you before they become critical.
            </p>
          </div>

          {/* Card 6 */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-8 hover:border-cyan-500/30 transition-all hover:bg-slate-900/40 group">
            <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gemini-Powered Chat</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ask questions on servers, incidents, or containers. Gemini inspects the entire memory log and answers instantly with custom suggestions.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive System Demo section */}
      <section id="demo" className="py-20 bg-slate-900/20 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono uppercase text-cyan-400 block mb-2">EXPERIENCE THE FLOW</span>
              <h2 className="text-3xl sm:text-4xl font-sans font-extrabold text-white tracking-tight mb-6">
                From Raw Logs To Resolved Incidents In One Click.
              </h2>
              <div className="space-y-6 text-slate-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-cyan-400">1</div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Upload Or Paste Unstructured Log Rows</h4>
                    <p className="text-sm text-slate-400">Paste your raw stack traces, journalctl dumps, or syslogs into our SRE interface.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-cyan-400">2</div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">AIME Core Correlates historical Actions</h4>
                    <p className="text-sm text-slate-400">Gemini inspects previous server records, matching your new warning against all past resolved cases.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-cyan-400">3</div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Copy and Run Resolved Commands</h4>
                    <p className="text-sm text-slate-400">Copy the precise suggested terminal CLI lines, test inside our built-in simulator, and catalog the resolved state.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <button 
                  onClick={onLaunchApp}
                  className="px-6 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all cursor-pointer flex items-center gap-2 text-sm"
                >
                  Launch Live Sandbox Applet <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl blur-xl" />
              <div className="border border-slate-800 rounded-2xl bg-slate-950 p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-slate-300">INCIDENT ARCHIVE TIMELINE</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">WARNING DETECTED</span>
                </div>
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex gap-3 text-slate-500">
                    <span>16:40:00</span>
                    <span className="text-red-400 font-bold">[CRITICAL]</span>
                    <span className="text-slate-300">srv-nginx-prod connection pool exhausted</span>
                  </div>
                  <div className="flex gap-3 text-slate-500">
                    <span>16:55:00</span>
                    <span className="text-cyan-400 font-bold">[COMMAND]</span>
                    <span className="text-slate-300">sarah_sre ran: "sudo tail -n 100 /var/log/nginx/error.log"</span>
                  </div>
                  <div className="flex gap-3 text-slate-500">
                    <span>17:10:00</span>
                    <span className="text-yellow-400 font-bold">[CONFIG]</span>
                    <span className="text-slate-300">Edited events.worker_connections -&gt; 4096 in nginx.conf</span>
                  </div>
                  <div className="flex gap-3 text-slate-500">
                    <span>17:15:00</span>
                    <span className="text-emerald-400 font-bold">[FIXED]</span>
                    <span className="text-emerald-300 font-bold">Reloaded nginx. Connections resolved instantly.</span>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest block mb-1">AIME RETROSPECTIVE PREDICTION:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    "If srv-nginx-prod experiences OOM or 504 again, verify socket file limits ('worker_rlimit_nofile') to avoid host level packet drops."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">SAAS PRICING PLANS</h2>
          <p className="text-3xl sm:text-5xl font-sans font-extrabold tracking-tight text-white mb-4">
            Affordable Plans For Every SRE Team.
          </p>
          <p className="text-slate-400 text-base">
            No credit card required. Launch the sandbox model for free today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-8 flex flex-col justify-between hover:border-slate-800 transition-all">
            <div>
              <h3 className="text-lg font-bold text-white">Free Sandbox</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">FOR EVALUATION</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-slate-500 text-xs font-mono"> / forever</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Perfect for SRE students, test engineers, or DevOps exploration on local networks.
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Up to 3 Linux Servers</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Local SRE Memory timeline</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Basic AI Chat Assistance</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Log Analyzer paster</li>
              </ul>
            </div>
            <button 
              onClick={onLaunchApp}
              className="mt-8 w-full py-3 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-300 font-bold text-sm hover:bg-slate-950 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-cyan-500 bg-slate-900/30 p-8 flex flex-col justify-between shadow-xl relative transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold tracking-wider uppercase font-mono shadow-md">
              MOST POPULAR
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pro SRE</h3>
              <p className="text-xs text-cyan-400 font-mono mt-1">FOR GROWING TEAMS</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">$49</span>
                <span className="text-slate-500 text-xs font-mono"> / month</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Excellent for production deployment diagnostics, persistent incident traces, and enterprise teams.
              </p>
              <ul className="space-y-3.5 text-sm text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Unlimited Linux Servers</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Up to 50 Containers & Pods</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Full Gemini Pro AI SRE engine</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Complete SSH Connection terminal log</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> PDF SRE Report Compilation</li>
              </ul>
            </div>
            <button 
              onClick={onLaunchApp}
              className="mt-8 w-full py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
            >
              Get Started Now
            </button>
          </div>

          {/* Enterprise */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-8 flex flex-col justify-between hover:border-slate-800 transition-all">
            <div>
              <h3 className="text-lg font-bold text-white">Enterprise Memory</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">FOR ENTERPRISES</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">$199</span>
                <span className="text-slate-500 text-xs font-mono"> / month</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Engineered for massive cloud server footprints, relational data archives, and continuous on-call support.
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Unlimited Cloud Footprints</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Custom Dedicated SRE rules</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> High Priority Gemini reasoning</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> SLA Response Support (99.9%)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Dedicated SRE Expert integration</li>
              </ul>
            </div>
            <button 
              onClick={onLaunchApp}
              className="mt-8 w-full py-3 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-300 font-bold text-sm hover:bg-slate-950 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-28 bg-slate-950 border-t border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">HAVE QUESTIONS?</h2>
            <p className="text-3xl sm:text-4xl font-sans font-extrabold tracking-tight text-white mb-4">
              Frequently Asked Questions.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div 
                key={index} 
                className="rounded-xl border border-slate-900 bg-slate-900/10 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 text-white hover:bg-slate-900/20 transition-all cursor-pointer"
                >
                  <span className="font-bold text-sm sm:text-base flex items-center gap-2.5">
                    <HelpCircle className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                    {item.q}
                  </span>
                  <span className="text-lg text-slate-500 font-bold">{activeFaq === index ? '−' : '+'}</span>
                </button>
                {activeFaq === index && (
                  <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-950/50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-950 border-t border-slate-900 relative">
        <div className="absolute top-0 right-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Content Column */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> CONTACT US
              </span>
              
              <h2 className="text-3xl sm:text-4xl font-sans font-extrabold text-white tracking-tight leading-tight">
                Get in Touch
              </h2>
              
              <p className="text-slate-300 text-base leading-relaxed font-medium">
                Have questions, feedback, feature requests, or partnership ideas? We'd love to hear from you. Help us improve AI Infrastructure Memory by sharing your thoughts.
              </p>
              
              <p className="text-slate-400 text-sm leading-relaxed">
                Whether you're a DevOps Engineer, SRE, Cloud Engineer, Platform Engineer, or IT Administrator, your feedback helps us build a better AI Infrastructure Memory platform.
              </p>
              
              <div className="pt-4 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-900/80 hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/15 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Email</span>
                    <a href="mailto:tp991425@gmail.com" className="text-sm font-semibold text-slate-200 hover:text-cyan-400 transition-colors">
                      tp991425@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-900/80 hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/15 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Location</span>
                    <span className="text-sm font-semibold text-slate-200">
                      Maharashtra, India
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-900/80 hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/15 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Product</span>
                    <span className="text-sm font-semibold text-slate-200">
                      AI Infrastructure Memory
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <form onSubmit={handleContactSubmit} className="space-y-5 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                      <input 
                        type="text" 
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        placeholder="Your Name"
                        className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                      <input 
                        type="email" 
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                        placeholder="Your Email Address"
                        className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Company</label>
                      <input 
                        type="text" 
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        placeholder="Company (Optional)"
                        className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
                      <select 
                        value={contactRole}
                        onChange={(e) => setContactRole(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-300 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                      >
                        <option value="" disabled>Select Role</option>
                        <option value="DevOps Engineer">DevOps Engineer</option>
                        <option value="SRE">SRE</option>
                        <option value="Cloud Engineer">Cloud Engineer</option>
                        <option value="Platform Engineer">Platform Engineer</option>
                        <option value="Linux Administrator">Linux Administrator</option>
                        <option value="IT Administrator">IT Administrator</option>
                        <option value="Developer">Developer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Subject</label>
                    <select 
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-300 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                    >
                      <option value="Feature Request">Feature Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Partnership">Partnership</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Message</label>
                    <textarea 
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                      placeholder="Tell us about your question, feedback, or feature request..."
                      className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-850 text-slate-200 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 active:scale-[0.99]"
                  >
                    Send Message <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {submittedContact && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono text-center flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Message sent successfully! We actively build AI Infrastructure Memory based on your valuable feedback.</span>
                    </motion.div>
                  )}
                </form>

                <div className="mt-6 pt-5 border-t border-slate-900 text-center text-[11px] text-slate-500 leading-relaxed italic relative z-10">
                  "We actively build AI Infrastructure Memory based on community feedback. Every suggestion helps improve the product."
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 pt-16 pb-8 text-slate-400 text-xs relative overflow-hidden">
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-900">
            
            {/* Branding Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                  <Database className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="font-sans font-extrabold text-white text-base tracking-tight">
                  AI Infrastructure Memory
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                AI-powered Infrastructure Memory platform that helps DevOps, SRE, Cloud, and Platform teams remember infrastructure history, incidents, deployments, cloud resources, and operational knowledge.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
                  title="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a 
                  href="https://producthunt.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
                  title="Product Hunt"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Quick Links</span>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Home</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Features</a>
                </li>
                <li>
                  <a href="#about" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">About</a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Contact</a>
                </li>
                <li>
                  <a 
                    href="https://producthunt.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline inline-flex items-center gap-1"
                  >
                    Product Hunt <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Resources</span>
              <ul className="space-y-2.5">
                <li>
                  <a href="#docs" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Documentation</a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Privacy Policy</a>
                </li>
                <li>
                  <a href="#terms" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">Terms of Service</a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-cyan-400 transition-colors text-slate-400 hover:underline">FAQ</a>
                </li>
              </ul>
            </div>

            {/* Contact Details Column */}
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Contact</span>
              <div className="space-y-3 font-medium">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none mb-0.5">Email</span>
                    <a href="mailto:tp991425@gmail.com" className="hover:text-cyan-400 transition-colors text-slate-200 font-semibold break-all">
                      tp991425@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none mb-0.5">Location</span>
                    <span className="text-slate-200 font-semibold">Maharashtra, India</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div className="flex items-center gap-1">
              <span>© 2026 AI Infrastructure Memory. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-1 text-center md:text-right">
              <span>Built with</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse mx-0.5 inline" />
              <span>to simplify DevOps operations through AI-powered Infrastructure Memory.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
