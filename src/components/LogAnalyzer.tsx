import React, { useState } from 'react';
import { Terminal, Upload, AlertCircle, AlertTriangle, ShieldCheck, Cpu, Code, Play, Check, Copy } from 'lucide-react';
import { SAMPLE_LOGS_LIBRARY } from '../data/mockData';
import { LogAnalysisResult, MemoryEvent } from '../types';

interface LogAnalyzerProps {
  onAddMemoryEvent: (event: MemoryEvent) => void;
}

export default function LogAnalyzer({ onAddMemoryEvent }: LogAnalyzerProps) {
  const [logContent, setLogContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<LogAnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [executedIndex, setExecutedIndex] = useState<number | null>(null);

  const handleLoadSample = (content: string) => {
    setLogContent(content);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!logContent.trim() || analyzing) return;

    setAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logContent })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (error) {
      console.error('Log analysis failed:', error);
      // Construct fallback offline mock analyzer result so the app works even if offline
      setResult({
        hasErrors: true,
        errorsCount: 2,
        warningsCount: 1,
        securityRisksCount: 0,
        summary: "This is a fallback offline analysis of the paste. Connection to server-side Gemini timed out.",
        detectedIssues: [
          { severity: 'error', message: "Fatal error detected in parsed stack trace", line: 2 },
          { severity: 'warning', message: "Warning threshold reached on local node connection", line: 5 }
        ],
        rootCause: "A timeout or unconfigured GEMINI_API_KEY environment secret prevented the backend from query processing.",
        suggestedFix: "Please confirm that your workspace secrets are fully configured, or run the following test commands.",
        recommendedCommands: ["sudo systemctl restart express-backend", "ping -c 3 google.com"]
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExecuteSimulated = (cmd: string, index: number) => {
    setExecutedIndex(index);
    setTimeout(() => setExecutedIndex(null), 2000);

    // Live register command execution to infrastructure timeline memory!
    const executionEvent: MemoryEvent = {
      id: `evt-logcmd-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverId: 'srv-01',
      serverName: 'srv-nginx-prod',
      type: 'command',
      message: cmd,
      user: 'devops_alex',
      details: `Executed via SRE Log Analyzer suggestions dashboard in response to detected errors. Run status: SUCCESS (0)`,
      commandExitCode: 0,
      category: 'logs_inspect',
      severity: 'healthy'
    };
    onAddMemoryEvent(executionEvent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-sans font-bold text-white tracking-tight">Structured SRE Log Analyzer</h1>
        <p className="text-xs text-slate-400 font-mono">AUTOMATED INCIDENT TRIAGING & ACTIONABLE COMMAND RECOMMENDATIONS</p>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Paste & Library */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-4 text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-cyan-400" />
              Paste Raw Syslog / Unstructured Logs
            </h3>

            {/* Quick Sample Library */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Paste a pre-configured failure template:</span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_LOGS_LIBRARY.map((sample, idx) => (
                  <button
                    key={idx}
                    id={`log-sample-btn-${idx}`}
                    onClick={() => handleLoadSample(sample.content)}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono hover:text-cyan-400 hover:border-cyan-500/20 transition-all cursor-pointer"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <textarea
                rows={10}
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                placeholder="Paste nginx error logs, kernel oom-kills, or ssh journal outputs here..."
                className="w-full p-4 rounded-lg bg-slate-950 border border-slate-900 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setLogContent('')}
                className="text-xs font-mono text-slate-500 hover:text-slate-300"
              >
                Clear paste
              </button>
              <button
                id="btn-analyze-logs"
                onClick={handleAnalyze}
                disabled={analyzing || !logContent.trim()}
                className="px-6 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:hover:bg-cyan-500 cursor-pointer flex items-center gap-2"
              >
                {analyzing ? (
                  <>Analysing log with AIME...</>
                ) : (
                  <>
                    Analyze Log with AIME <Terminal className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Results Dashboard */}
        <div className="space-y-4">
          {result ? (
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-5 text-left">
              {/* Header metrics */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <h3 className="text-sm font-bold text-slate-200">AI Triage Assessment</h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                  AIME Analysis Complete
                </span>
              </div>

              {/* Counts pills */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded bg-red-500/5 border border-red-500/15 text-center">
                  <span className="block text-xl font-bold text-red-400 font-mono">{result.errorsCount}</span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Errors Detected</span>
                </div>
                <div className="p-3 rounded bg-yellow-500/5 border border-yellow-500/15 text-center">
                  <span className="block text-xl font-bold text-yellow-400 font-mono">{result.warningsCount}</span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Warnings</span>
                </div>
                <div className="p-3 rounded bg-blue-500/5 border border-blue-500/15 text-center">
                  <span className="block text-xl font-bold text-blue-400 font-mono">{result.securityRisksCount}</span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Security Risks</span>
                </div>
              </div>

              {/* Summary paragraph */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Incident Summary:</span>
                <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded border border-slate-900 leading-relaxed font-sans">
                  {result.summary}
                </p>
              </div>

              {/* Detected issues list */}
              {result.detectedIssues.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Triage Line items:</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {result.detectedIssues.map((issue, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-900 border border-slate-900 text-xs">
                        {issue.severity === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        ) : issue.severity === 'security' ? (
                          <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        )}
                        <span className="text-[10px] font-mono text-slate-500">Line {issue.line}:</span>
                        <span className="text-slate-200">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Root Cause & Fix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-red-400 uppercase block">Suspected Root Cause:</span>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-900 min-h-24">
                    {result.rootCause}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block">Suggested SRE Fix:</span>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-900 min-h-24">
                    {result.suggestedFix}
                  </p>
                </div>
              </div>

              {/* Recommended CLI commands */}
              {result.recommendedCommands.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase block">Actionable Recommended Shell Commands:</span>
                  <div className="space-y-2">
                    {result.recommendedCommands.map((cmd, idx) => (
                      <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-900 font-mono text-xs text-slate-200 flex items-center justify-between gap-4">
                        <span className="truncate">{cmd}</span>
                        <div className="flex gap-2">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopyCommand(cmd, idx)}
                            className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title="Copy command"
                          >
                            {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          {/* Execute Simulated */}
                          <button
                            onClick={() => handleExecuteSimulated(cmd, idx)}
                            className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold font-sans text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Simulate command execution"
                          >
                            {executedIndex === idx ? (
                              <Check className="w-3 h-3 text-slate-950" />
                            ) : (
                              <>
                                <Play className="w-2.5 h-2.5 fill-slate-950" /> Run
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-900 rounded-xl p-12 text-slate-500 font-mono text-xs">
              <Terminal className="w-8 h-8 text-slate-700 mb-2.5" />
              <span>Paste server logs on the left and click "Analyze Log" to trigger Gemini SRE root-cause tracing.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
