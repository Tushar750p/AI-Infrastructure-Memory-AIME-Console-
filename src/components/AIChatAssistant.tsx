import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Terminal, HelpCircle, Loader2, Sparkles, Brain, Code, Maximize2, Minimize2, MoveVertical, MoveHorizontal, PanelLeftClose, PanelLeftOpen, Columns } from 'lucide-react';
import { ChatMessage, LinuxServer, MemoryEvent } from '../types';

interface AIChatAssistantProps {
  servers: LinuxServer[];
  events: MemoryEvent[];
  selectedIncident?: MemoryEvent | null;
  onClearSelectedIncident?: () => void;
}

const PRE_CONFIGURED_PROMPTS = [
  'Why did srv-nginx-prod experience connection issues on July 11?',
  'What is causing the Redis container to restart?',
  'Show similar incidents related to memory leaks or OOM kills.',
  'What is the recommended fix to prevent future nginx gateway timeouts?',
  'Show all terminal commands run by devops_alex on srv-docker-host.',
  'Generate an executive incident summary report for the team.'
];

export default function AIChatAssistant({
  servers,
  events,
  selectedIncident,
  onClearSelectedIncident
}: AIChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello SRE on-call! I am **AIME** (AI Infrastructure Memory Engine). I have indexed the entire operational history of your Linux servers, Docker deployments, and Kubernetes namespaces.\n\nAsk me anything! For example:\n* *\"Why did the Nginx load-balancer crash yesterday?\"*\n* *\"Is there an OOM trigger affecting Docker containers?\"*\n* *\"Show similar incidents and their previous commands.\"*",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelMode, setModelMode] = useState<'standard' | 'thinking' | 'low-latency'>('standard');
  const [chatHeight, setChatHeight] = useState<'compact' | 'medium' | 'tall' | 'full'>('medium');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [widthMode, setWidthMode] = useState<'default' | 'half' | 'wide' | 'fluid'>('default');
  const [sidebarWidthPercent, setSidebarWidthPercent] = useState<number>(25); // 25% default width for prompt sidebar
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const heightClassMap = {
    compact: 'h-[500px]',
    medium: 'h-[720px]',
    tall: 'h-[880px]',
    full: 'h-[calc(100vh-140px)] min-h-[600px]'
  };

  const widthClassMap = {
    default: 'max-w-7xl mx-auto',
    half: 'max-w-3xl mx-auto',
    wide: 'max-w-[1600px] mx-auto',
    fluid: 'w-full px-0'
  };

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle selected incident trigger
  useEffect(() => {
    if (selectedIncident) {
      const prompt = `Why did the server ${selectedIncident.serverName} experience the incident: "${selectedIncident.message}"? Inspect its timeline memory and recommend a fix.`;
      sendChatMessage(prompt);
      if (onClearSelectedIncident) onClearSelectedIncident();
    }
  }, [selectedIncident]);

  const sendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.slice(-5), userMsg], // Pass last 5 messages for short memory window
          context: {
            servers,
            events
          },
          thinkingMode: modelMode === 'thinking',
          lowLatency: modelMode === 'low-latency'
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: data.text || "I was unable to analyze your query. Please check SRE logs.",
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **AIME Error Connection**: Unable to process request. This could be due to a missing/unconfigured \`GEMINI_API_KEY\` secret or backend service timeout.\n\n*Please ensure your Gemini key is loaded in your workspace Secrets configuration panel.*`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage(inputText);
  };

  return (
    <div className={`${widthClassMap[widthMode]} transition-all duration-300 w-full`}>
      <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 ${heightClassMap[chatHeight]} transition-all duration-300`}>
        {/* Left panel: Quick SRE Prompts */}
        {isSidebarOpen && (
          <div className="lg:col-span-3 rounded-xl border border-slate-900 bg-slate-950 p-4 flex flex-col gap-3 overflow-y-auto transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <HelpCircle className="w-3.5 h-3.5" /> Quick SRE Prompts
              </h3>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-900 transition-all cursor-pointer"
                title="Collapse Prompts Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 flex-1">
              {PRE_CONFIGURED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`chat-prompt-${idx}`}
                  onClick={() => sendChatMessage(prompt)}
                  className="w-full text-left p-3 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-white transition-all hover:bg-slate-900/50 cursor-pointer flex gap-2"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right panel: Active Chat UI */}
        <div className={`${isSidebarOpen ? 'lg:col-span-9' : 'lg:col-span-12'} rounded-xl border border-slate-900 bg-slate-950 flex flex-col overflow-hidden h-full transition-all duration-300`}>
          {/* Chat window Header */}
          <div className="px-5 py-3 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3 bg-slate-950">
            <div className="flex items-center gap-2.5">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-mono"
                  title="Show SRE Prompts Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Prompts</span>
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">AIME Memory Core</h2>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">GEARBOX SRE DIALOG ENGINE</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Width Controls */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                <span className="text-slate-500 px-1.5 flex items-center gap-1"><MoveHorizontal className="w-3 h-3" /> Width:</span>
                <button
                  type="button"
                  onClick={() => setWidthMode('default')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    widthMode === 'default' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Standard Boxed Width"
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setWidthMode('half')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    widthMode === 'half' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="50% Width View"
                >
                  50% Half
                </button>
                <button
                  type="button"
                  onClick={() => setWidthMode('wide')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    widthMode === 'wide' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Wide Width (1600px)"
                >
                  Wide
                </button>
                <button
                  type="button"
                  onClick={() => setWidthMode('fluid')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    widthMode === 'fluid' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Full Dashboard Width"
                >
                  Fluid
                </button>
              </div>

              {/* Height Resize Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                <span className="text-slate-500 px-1.5 flex items-center gap-1"><MoveVertical className="w-3 h-3" /> Height:</span>
                <button
                  type="button"
                  onClick={() => setChatHeight('compact')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    chatHeight === 'compact' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Compact Height (500px)"
                >
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => setChatHeight('medium')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    chatHeight === 'medium' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Standard Height (720px)"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setChatHeight('tall')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    chatHeight === 'tall' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Large Height (880px)"
                >
                  Large
                </button>
                <button
                  type="button"
                  onClick={() => setChatHeight(chatHeight === 'full' ? 'medium' : 'full')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                    chatHeight === 'full' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Expand Window"
                >
                  {chatHeight === 'full' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {chatHeight === 'full' ? 'Collapse' : 'Full'}
                </button>
              </div>

              <span className={`text-[10px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase transition-all ${
                modelMode === 'thinking'
                  ? 'text-purple-400 bg-purple-950/40 border-purple-500/20 animate-pulse'
                  : modelMode === 'low-latency'
                    ? 'text-amber-400 bg-amber-950/40 border-amber-500/20'
                    : 'text-cyan-400 bg-cyan-950/40 border-cyan-500/10 animate-pulse'
              }`}>
                {modelMode === 'thinking' && <Brain className="w-3 h-3 text-purple-400" />}
                {modelMode === 'low-latency' && <span className="text-[9px]">⚡</span>}
                {modelMode === 'standard' && <Sparkles className="w-3 h-3" />}
                {modelMode === 'thinking' ? '3.1-PRO (THINKING: HIGH)' : modelMode === 'low-latency' ? '3.1-FLASH-LITE (LOW LATENCY)' : 'GEMINI-3.5-FLASH'}
              </span>
            </div>
          </div>

        {/* Model Mode Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Reasoning & Speed Control:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="mode-standard"
              type="button"
              onClick={() => setModelMode('standard')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-center font-mono text-[10px] transition-all cursor-pointer ${
                modelMode === 'standard'
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold'
                  : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard (3.5 Flash)
            </button>
            <button
              id="mode-low-latency"
              type="button"
              onClick={() => setModelMode('low-latency')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-center font-mono text-[10px] transition-all cursor-pointer ${
                modelMode === 'low-latency'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                  : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Lite (Fast)
            </button>
            <button
              id="mode-thinking"
              type="button"
              onClick={() => setModelMode('thinking')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-center font-mono text-[10px] transition-all cursor-pointer ${
                modelMode === 'thinking'
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 font-bold'
                  : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              🧠 High Thinking
            </button>
          </div>
        </div>

        {/* Messaging Logs */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/40">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div 
                key={m.id} 
                className={`flex gap-3.5 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Profile Circle */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border text-xs ${
                  isUser 
                    ? 'bg-cyan-500 border-cyan-400/30 text-slate-950 font-bold' 
                    : 'bg-slate-900 border-slate-800 text-cyan-400 font-mono'
                }`}>
                  {isUser ? 'SRE' : 'AI'}
                </div>

                {/* Message Speech bubble */}
                <div className={`p-4 rounded-xl border leading-relaxed text-sm text-left ${
                  isUser 
                    ? 'bg-cyan-500/5 border-cyan-500/20 text-slate-100 rounded-tr-none' 
                    : 'bg-slate-950 border-slate-900 text-slate-200 rounded-tl-none space-y-2'
                }`}>
                  <div className="whitespace-pre-wrap font-sans text-slate-200">
                    {m.text}
                  </div>
                  <span className="block text-[9px] font-mono text-slate-500 mt-2 text-right">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3 max-w-4xl mr-auto">
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center font-mono text-xs">
                AI
              </div>
              <div className="p-4 rounded-xl border bg-slate-950 border-slate-900 text-slate-400 rounded-tl-none flex items-center gap-2 font-mono text-xs">
                <Loader2 className={`w-4 h-4 animate-spin ${
                  modelMode === 'thinking' 
                    ? 'text-purple-400' 
                    : modelMode === 'low-latency' 
                      ? 'text-amber-400' 
                      : 'text-cyan-400'
                }`} />
                {modelMode === 'thinking' 
                  ? 'AIME is executing deep thinking search (3.1-Pro reasoning engine)...' 
                  : modelMode === 'low-latency' 
                    ? 'AIME is retrieving ultra-fast low-latency response...' 
                    : 'AIME is analyzing server memories...'}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input prompt bar */}
        <div className="p-4 border-t border-slate-900 bg-slate-950">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AIME about server memory, logs, OOM events, commands..."
              className="flex-1 px-4 py-3 rounded-lg bg-slate-950 border border-slate-900 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:hover:bg-cyan-500 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
);
}
