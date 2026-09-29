import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, ShieldCheck, Key, User, Lock, ArrowRight, ShieldAlert, Fingerprint, RefreshCw, Cpu, Check } from 'lucide-react';

interface Operator {
  username: string;
  role: string;
  badgeId: string;
  pin: string;
  status: string;
}

interface LoginScreenProps {
  onLoginSuccess: (operator: Operator) => void;
  onBackToLanding: () => void;
}

const PRESET_OPERATORS: Operator[] = [
  {
    username: 'sre_sarah',
    role: 'Senior SRE Engineer',
    badgeId: 'OP-4491-SRH',
    pin: '4491',
    status: 'ACTIVE - MASTER SECTOR'
  },
  {
    username: 'devops_alex',
    role: 'DevOps & Cluster Architect',
    badgeId: 'OP-1288-ALX',
    pin: '1288',
    status: 'ACTIVE - CLUSTER ENG'
  },
  {
    username: 'sysadmin_clara',
    role: 'Lead Systems Administrator',
    badgeId: 'OP-0941-CLR',
    pin: '0941',
    status: 'ACTIVE - CORE PLATFORM'
  }
];

export default function LoginScreen({ onLoginSuccess, onBackToLanding }: LoginScreenProps) {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  
  // Registration form state
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState('Lead SRE Operator');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  
  // Verification progress sequence state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const runVerificationPipeline = (operator: Operator) => {
    setIsVerifying(true);
    setErrorMsg('');
    setVerificationSteps([]);

    const steps = [
      'Establishing SSH cryptographic handshake...',
      `Authenticating operator badge ${operator.badgeId}...`,
      'Validating HMAC access credentials...',
      'Verifying SRE Memory local keys...',
      'Telemetry channels synchronized. Gateway unlocked!'
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setVerificationSteps(prev => [...prev, step]);
        if (idx === steps.length - 1) {
          setTimeout(() => {
            onLoginSuccess(operator);
            setIsVerifying(false);
          }, 600);
        }
      }, (idx + 1) * 450);
    });
  };

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = PRESET_OPERATORS[index];
    setUsernameInput(preset.username);
    setPinInput(preset.pin);
    setErrorMsg('');
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!usernameInput.trim()) {
      setErrorMsg('Operator Username or Email is required.');
      return;
    }
    if (!pinInput.trim()) {
      setErrorMsg('Access PIN/Password code is required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usernameInput, password: pinInput })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        return;
      }

      if (data.accessToken) {
        localStorage.setItem('aime_access_token', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('aime_refresh_token', data.refreshToken);
      }

      const foundPreset = PRESET_OPERATORS.find(
        op => op.username.toLowerCase() === usernameInput.toLowerCase().trim()
      );

      const opToPass: Operator = foundPreset || {
        username: data.user?.username || usernameInput,
        role: data.user?.role || 'SRE Operator',
        badgeId: `OP-${Math.floor(1000 + Math.random() * 9000)}-${(data.user?.username || usernameInput).slice(0,3).toUpperCase()}`,
        pin: pinInput,
        status: 'ACTIVE - AUTHENTICATED'
      };

      runVerificationPipeline(opToPass);
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg('Network or server connection failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regUsername.trim()) {
      setErrorMsg('Please specify an Operator Name.');
      return;
    }
    if (regUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (!regPin.trim() || regPin.length < 4) {
      setErrorMsg('Pin code must be at least 4 characters/digits.');
      return;
    }
    if (regPin !== regPinConfirm) {
      setErrorMsg('PIN codes do not match.');
      return;
    }

    const formatName = regUsername.toLowerCase().trim().replace(/\s+/g, '_');
    const userEmail = `${formatName}@aime.internal`;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: regPin,
          confirmPassword: regPinConfirm,
          fullName: regUsername,
          organizationName: `${regUsername} Operations`
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        return;
      }

      if (data.accessToken) {
        localStorage.setItem('aime_access_token', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('aime_refresh_token', data.refreshToken);
      }

      const badgeSuffix = Math.floor(1000 + Math.random() * 9000);
      const newOp: Operator = {
        username: formatName,
        role: regRole,
        badgeId: `OP-${badgeSuffix}-${formatName.slice(0,3).toUpperCase()}`,
        pin: regPin,
        status: 'ACTIVE - REGISTERED'
      };

      runVerificationPipeline(newOp);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg('Server connection failed during registration.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 mb-8 text-center max-w-sm">
        <div className="w-12 h-12 rounded bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/10">
          <Database className="w-6 h-6 text-white stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-sans font-extrabold text-lg tracking-tight text-white block">AIME Operational Portal</h1>
          <p className="text-[10px] font-mono tracking-wider uppercase text-indigo-400 block mt-1">SRE MULTI-NODE CORE ENGINE</p>
        </div>
      </div>

      {/* Main Authentication container card */}
      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        {/* Verification Loading Overlay Screen */}
        <AnimatePresence>
          {isVerifying && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/95 z-50 p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-zinc-800 pb-3">
                  <Fingerprint className="w-5 h-5 animate-pulse" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest">Authentication Pipeline Initiated</span>
                </div>

                {/* Animated status check */}
                <div className="space-y-2.5 font-mono text-[11px] text-zinc-400">
                  <AnimatePresence>
                    {verificationSteps.map((step, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        {idx === verificationSteps.length - 1 && idx < 4 ? (
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                        ) : (
                          <span className="text-indigo-500">✓</span>
                        )}
                        <span>{step}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress Loading Bar */}
              <div className="space-y-2">
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                  <span>SSL HANDSHAKE PIN 443</span>
                  <span className="animate-pulse">DECRYPTING MEMORY KEY...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 mb-5 text-xs font-mono">
          <button
            onClick={() => { setActiveMode('login'); setErrorMsg(''); }}
            className={`flex-1 pb-2.5 border-b-2 text-center transition-colors cursor-pointer ${
              activeMode === 'login' 
                ? 'border-indigo-500 text-white font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            [ LOG IN OPERATOR ]
          </button>
          <button
            onClick={() => { setActiveMode('register'); setErrorMsg(''); }}
            className={`flex-1 pb-2.5 border-b-2 text-center transition-colors cursor-pointer ${
              activeMode === 'register' 
                ? 'border-indigo-500 text-white font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            [ REGISTER OPERATOR ]
          </button>
        </div>

        {/* Display Errors if any */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 text-xs text-red-400"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* LOG IN CONTENT MODE */}
        {activeMode === 'login' ? (
          <div className="space-y-5">
            {/* Operator Badges Selection Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider flex justify-between">
                <span>Select Verified Operator Badge</span>
                <span className="text-indigo-400">Quick Access</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_OPERATORS.map((op, idx) => (
                  <button
                    key={op.username}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`flex items-center justify-between p-2.5 rounded text-left border transition-all cursor-pointer ${
                      selectedPresetIndex === idx
                        ? 'bg-indigo-500/10 border-indigo-500/60 shadow-inner'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        selectedPresetIndex === idx ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {op.username.slice(4, 6).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-100">@{op.username}</div>
                        <div className="text-[9px] font-mono text-zinc-500">{op.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-indigo-400">{op.badgeId}</div>
                      <div className="text-[8px] font-mono text-zinc-500">PIN: {op.pin}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual login Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Operator Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => { setUsernameInput(e.target.value); setSelectedPresetIndex(null); }}
                    placeholder="e.g. sre_sarah or custom_id"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Security Access PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    maxLength={10}
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value); setSelectedPresetIndex(null); }}
                    placeholder="Enter operator badge security PIN"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-md hover:shadow-indigo-600/10"
              >
                <span>Authorize SRE Gateway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          /* REGISTRATION MODE */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Requested Operator ID</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. admin_david (No spaces)"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[9px] font-mono text-zinc-500">Will be reformatted as lowercase with underscores.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Operational SRE Role</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors text-zinc-200"
              >
                <option value="Lead SRE Operator">Lead SRE Operator</option>
                <option value="Cloud Systems Engineer">Cloud Systems Engineer</option>
                <option value="SecOps Incident Handler">SecOps Incident Handler</option>
                <option value="DevOps Deploy Specialist">DevOps Deploy Specialist</option>
                <option value="Infrastructure Site Architect">Infrastructure Site Architect</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Create Access PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="4-6 digit PIN"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">Confirm Access PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={regPinConfirm}
                    onChange={(e) => setRegPinConfirm(e.target.value)}
                    placeholder="Confirm PIN"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2 hover:shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Provision Operator Identity</span>
            </button>
          </form>
        )}
      </div>

      {/* Back button */}
      <button
        onClick={onBackToLanding}
        className="mt-6 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest cursor-pointer"
      >
        ← Back to Product Page
      </button>
    </div>
  );
}
