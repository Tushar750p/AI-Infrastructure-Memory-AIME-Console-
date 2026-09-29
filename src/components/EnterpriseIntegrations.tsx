import React, { useState } from 'react';
import { 
  Slack, Send, Shield, Radio, Key, Plus, CheckCircle2, Terminal, Info, HelpCircle
} from 'lucide-react';

interface SlackMsg {
  id: string;
  sender: 'User' | 'Slackbot' | 'AIME Bot';
  text: string;
  timestamp: string;
  isSlash?: boolean;
}

const PRE_CONFIGURED_COMMANDS = [
  { cmd: '/infra who changed production', desc: 'Queries SRE Memory to identify recent commits to the srv-nginx-prod node.' },
  { cmd: '/infra latest deployment', desc: 'Returns parameters of the last stable deployment point.' },
  { cmd: '/infra compare yesterday', desc: 'Generates a git-diff summary comparing today’s configurations vs yesterday.' },
  { cmd: '/infra incident summary', desc: 'Aggregates open alarms and predicts root-cause failure vectors.' },
  { cmd: '/infra help', desc: 'Lists full capability directory of the AIME Slack/Teams workspace bot.' }
];

export default function EnterpriseIntegrations() {
  const [integrationPlatform, setIntegrationPlatform] = useState<'slack' | 'teams'>('slack');
  const [inputText, setInputText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [slackLogs, setSlackLogs] = useState<SlackMsg[]>([
    {
      id: 'msg-01',
      sender: 'AIME Bot',
      text: "⚡ **AIME SRE Enterprise daemon initialized.**\n\nConfigure Webhooks in your workspace, then use the `/infra` commands directly within Slack or Teams to query configurations, rollback targets, and active cluster health.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const handleTriggerCommand = (cmd: string) => {
    const userMsg: SlackMsg = {
      id: `slack-usr-${Date.now()}`,
      sender: 'User',
      text: cmd,
      timestamp: new Date().toLocaleTimeString(),
      isSlash: true
    };

    setSlackLogs(prev => [...prev, userMsg]);
    setIsSyncing(true);

    // Simulate different responses based on command input
    setTimeout(() => {
      let botResponse = '';
      if (cmd.includes('who changed')) {
        botResponse = `💬 **[AIME DevOps Intelligence] Production change query:**
        
- **Operator**: \`@sre_sarah\` modified configurations yesterday.
- **Action**: Modified \`/etc/nginx/nginx.conf\` to expand \`worker_connections\` to \`4096\`.
- **Reason**: Heavy traffic spike causing packet drop in upstream application servers.
- **Commit SHA**: \`nginx-prod-9a18d12\``;
      } else if (cmd.includes('latest deployment')) {
        botResponse = `🚀 **[AIME DevOps Intelligence] Latest Active Deployment:**

- **Environment**: \`production-us-east-1\`
- **Release Version**: \`v2.4.0 (Golden baseline)\`
- **Committer**: \`@sysadmin_clara\`
- **Uptime status**: \`14d 6h 12m (Perfect 100% SLA uptime)\`
- **Related events**: 4 active nodes connected and passing load test diagnostics.`;
      } else if (cmd.includes('compare yesterday')) {
        botResponse = `🔍 **[AIME DevOps Intelligence] Configuration Drift Summary:**

Comparing \`Live Active\` with snapshot \`Yesterday (Stable baseline)\`:

- **Terraform**: *No drift detected*
- **Docker Compose**: 
  ⚠️ \`redis-cache\` memory constraints removed (Risk: *High OOM risk*)
- **IAM Policies**:
  🔴 Security warning: port \`5432\` ingress wildcard \`0.0.0.0/0\` opened.
- **Environment variables**:
  ⚠️ Raw sensitive key \`API_SECRET_KEY\` added to current runtime.`;
      } else if (cmd.includes('incident summary')) {
        botResponse = `🚨 **[AIME SRE Alarm Aggregator] active alerts summary:**

- **Critical Alert**: \`srv-db-primary (PostgreSQL)\` shows **92% PG WAL Disk usage** warning. High transactional replication latency.
- **Warning Alarm**: \`kibana-dashboard\` container status **CrashLoopBackOff**. Liveness probes failure on port 5601.
- **Suggested Action**: Run \`sudo du -sh /var/lib/postgresql/*\` or trigger automated Rollback target \`v2.3.9\` immediately.`;
      } else {
        botResponse = `ℹ️ **AIME SRE Command list directory:**
        
Use these commands directly in your Slack/Teams chat channels:
- \`/infra who changed production\` - Identify recent commits to production nodes.
- \`/infra latest deployment\` - View last deployment parameters.
- \`/infra compare yesterday\` - Generate config drift details.
- \`/infra incident summary\` - Aggregate active alarms & root causes.`;
      }

      const botMsg: SlackMsg = {
        id: `slack-bot-${Date.now()}`,
        sender: 'AIME Bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString()
      };

      setSlackLogs(prev => [...prev, botMsg]);
      setIsSyncing(false);
    }, 800);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const command = inputText.trim().startsWith('/') ? inputText.trim() : `/${inputText.trim()}`;
    handleTriggerCommand(command);
    setInputText('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Slack className="w-5.5 h-5.5 text-indigo-400" />
            Enterprise Slack & MS Teams Integration Sandbox
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Query your operational history and trigger SRE memory search results right inside corporate Slack & Microsoft Teams channels using our secure Webhook gateways.
          </p>
        </div>
      </div>

      {/* Main configuration grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left config side - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          {/* SSO and Auth settings */}
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-4">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1 border-b border-zinc-900/60 pb-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Security, SSO & OAuth settings
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded bg-zinc-900/10 border border-zinc-900">
                <div>
                  <span className="font-bold text-zinc-300 block">SAML SSO / Okta Integration</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Enforce SSO login for all on-call operators</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  ENABLED
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded bg-zinc-900/10 border border-zinc-900">
                <div>
                  <span className="font-bold text-zinc-300 block">Role-Based Access Control (RBAC)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Restrict rollback triggers to Administrator roles</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded bg-zinc-900/10 border border-zinc-900">
                <div>
                  <span className="font-bold text-zinc-300 block">Multi-Factor Authentication (MFA)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Require TOTP authentication for console access</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-4">
            <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1 border-b border-zinc-900/60 pb-2">
              <Radio className="w-4 h-4 text-indigo-400" /> Incoming/Outgoing Webhooks
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 block uppercase">Slack Webhook endpoint URL:</span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value="https://hooks.slack.example.com/services/T00000000/B00000000/PLACEHOLDER"
                    readOnly
                    className="flex-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-400 focus:outline-none"
                  />
                  <button onClick={() => alert('Webhook key is cryptographically secured on workspace backend.')} className="px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] hover:text-white cursor-pointer">
                    Reveal
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 block uppercase">MS Teams Connector Webhook:</span>
                <input
                  type="password"
                  value="https://aime.webhook.office.com/webhookb2/241af12d-12af-4f90@f12019"
                  readOnly
                  className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-400 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-zinc-900/10 border border-zinc-900 rounded font-sans text-[11px] text-zinc-500 flex gap-2">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p>Ensure outbound port 443 is whitelisted on your security groups to dispatch Slack event schemas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Chat Simulator - Span 7 */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden h-[530px]">
          
          {/* Header platform selector */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="platform-slack-btn"
                onClick={() => setIntegrationPlatform('slack')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  integrationPlatform === 'slack' 
                    ? 'bg-[#36C5F0]/10 border border-[#36C5F0]/30 text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Slack className="w-3.5 h-3.5 text-[#36C5F0]" />
                Slack Channel Simulator
              </button>
              
              <button
                id="platform-teams-btn"
                onClick={() => setIntegrationPlatform('teams')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  integrationPlatform === 'teams' 
                    ? 'bg-[#5B5FC7]/10 border border-[#5B5FC7]/30 text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#5B5FC7]" />
                MS Teams Chat Sandbox
              </button>
            </div>
            
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Interactive simulation</span>
          </div>

          {/* Quick command buttons layout */}
          <div className="p-3 bg-zinc-900/10 border-b border-zinc-900 space-y-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Click slash command to simulate immediately:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRE_CONFIGURED_COMMANDS.map((item, idx) => (
                <button
                  key={idx}
                  id={`integration-cmd-${idx}`}
                  onClick={() => handleTriggerCommand(item.cmd)}
                  className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 text-[10px] font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {item.cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Messaging scroll area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-950/30">
            {slackLogs.map((msg) => (
              <div key={msg.id} className="flex gap-3 text-xs leading-normal">
                {/* Profile Circle */}
                <div className={`w-7 h-7 rounded flex-shrink-0 flex items-center justify-center font-bold text-[10px] ${
                  msg.sender === 'User' 
                    ? 'bg-zinc-800 text-zinc-200' 
                    : msg.sender === 'AIME Bot' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-[#36C5F0] text-slate-950'
                }`}>
                  {msg.sender === 'User' ? 'USR' : 'AM'}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{msg.sender}</span>
                    <span className="text-[9px] font-mono text-zinc-600">{msg.timestamp}</span>
                  </div>
                  
                  <div className={`p-3 rounded-lg border text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed ${
                    msg.isSlash 
                      ? 'bg-zinc-900/40 border-zinc-900 text-indigo-400 font-mono text-[11px]'
                      : 'bg-zinc-950/90 border-zinc-900 text-zinc-300'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isSyncing && (
              <div className="flex gap-3 text-xs">
                <div className="w-7 h-7 rounded flex-shrink-0 bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  AM
                </div>
                <div className="flex-1 p-3 rounded-lg border bg-zinc-950/90 border-zinc-900 text-zinc-500 font-mono text-[10px] flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  AIME is parsing Slack event stream payload...
                </div>
              </div>
            )}
          </div>

          {/* Input messaging console */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-900">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Type /infra who changed production or other slash commands..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSyncing || !inputText.trim()}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono cursor-pointer transition-all disabled:opacity-40"
              >
                Execute
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
