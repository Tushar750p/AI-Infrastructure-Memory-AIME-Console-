import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Play, Cpu, Server, Layers, FileCode, Clock, Brain, 
  AlertTriangle, CheckCircle2, Search, ArrowRight, Shield, RefreshCw, 
  User, Terminal, Plus, Send, ChevronRight, Filter, Info, ShieldCheck, 
  ExternalLink, ChevronDown, Check, X, AlertOctagon, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

interface SystemDemoProps {
  onExitDemo: () => void;
  onLaunchApp: () => void;
}

// Simulated data for modern Recharts graphs
const CHART_DATA = [
  { time: '00:00', load: 32, incidents: 0, memoryStored: 85 },
  { time: '04:00', load: 28, incidents: 1, memoryStored: 88 },
  { time: '08:00', load: 45, incidents: 0, memoryStored: 92 },
  { time: '12:00', load: 78, incidents: 2, memoryStored: 98 },
  { time: '16:00', load: 52, incidents: 1, memoryStored: 104 },
  { time: '20:00', load: 40, incidents: 0, memoryStored: 110 },
  { time: '24:00', load: 35, incidents: 0, memoryStored: 115 },
];

export default function SystemDemo({ onExitDemo, onLaunchApp }: SystemDemoProps) {
  const [isDemoStarted, setIsDemoStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explorer' | 'chat' | 'incidents' | 'audit'>('dashboard');
  
  // Search & Filter States
  const [explorerSearch, setExplorerSearch] = useState('');
  const [activeExplorerTab, setActiveExplorerTab] = useState<'aws' | 'k8s' | 'docker' | 'linux' | 'terraform'>('aws');
  const [activeExplorerSubCategory, setActiveExplorerSubCategory] = useState<string>('EC2');

  // Audit Logs search & filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEnvFilter, setAuditEnvFilter] = useState('All');

  // Timeline inspect tray
  const [inspectedTimelineItem, setInspectedTimelineItem] = useState<any | null>(null);

  // Chat engine states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; details?: any }>>([
    {
      sender: 'assistant',
      text: "Hello! I am your Enterprise AI SRE Memory Assistant. I have indexed all historical cloud changes, deployments, commits, and incident states. Ask me anything about your infrastructure, or click one of the quick questions below to run a simulation."
    }
  ]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Timeline events array
  const timelineEvents = [
    {
      time: '09:12',
      title: 'Terraform Apply #248',
      type: 'Terraform',
      status: 'Success',
      engineer: 'Tushar Patil (SRE)',
      description: 'Provisioned secondary S3 audit trail container & bucket policies for HIPAA validation.',
      commit: 'git-rev-a77e12',
      ticket: 'JIRA-4921',
      details: {
        'Managed Resource': 'aws_s3_bucket.aime_audit_logs',
        'State serialized': '242',
        'Action': 'Plan: 1 to add, 0 to change, 0 to destroy'
      }
    },
    {
      time: '09:18',
      title: 'Security Group Updated',
      type: 'AWS Network',
      status: 'Warning',
      engineer: 'Alex Rivera (DevOps)',
      description: 'Port 5432 ingress rule enabled to temporarily debug the production Postgres database replica.',
      commit: 'git-rev-c09a82',
      ticket: 'JIRA-8812',
      details: {
        'Security Group ID': 'sg-03ea21 (sg-web-production)',
        'Change': 'Added Port 5432 -> CIDR 198.51.100.42/32',
        'Warning': 'Exposes Postgres to an external address block.'
      }
    },
    {
      time: '09:24',
      title: 'RDS Storage Increased',
      type: 'AWS Storage',
      status: 'Success',
      engineer: 'Tushar Patil (SRE)',
      description: 'Expanded database root storage from 400 GB to 500 GB to resolve disk-full telemetry issues.',
      commit: 'git-rev-e120aa',
      ticket: 'JIRA-4890',
      details: {
        'DB Instance ID': 'db-postgres-prod-primary',
        'Storage Change': '400 GB (GP3) -> 500 GB (GP3)',
        'Storage Headroom': '21% free disk space restored.'
      }
    },
    {
      time: '09:41',
      title: 'Kubernetes Deployment',
      type: 'Kubernetes',
      status: 'Success',
      engineer: 'Sarah Jenkins (Platform)',
      description: 'Rolled out auth-service:v2.4.2 to EKS production cluster namespaces.',
      commit: 'git-rev-f998ba',
      ticket: 'JIRA-5011',
      details: {
        'Namespace': 'core',
        'Deployment': 'auth-service',
        'Replicas': '2 desired / 2 available',
        'Status': 'Healthy rolling update complete'
      }
    },
    {
      time: '10:02',
      title: 'High CPU Alert',
      type: 'Incident',
      status: 'Critical',
      engineer: 'Automated Monitor',
      description: 'Host srv-db-primary load average breached 95% CPU threshold continuously for 5 minutes.',
      commit: 'N/A',
      ticket: 'INC-402',
      details: {
        'Source': 'srv-db-primary (PostgreSQL)',
        'Metric': 'CPU core usage: 98.4%',
        'Alert status': 'Active incident triggered'
      }
    },
    {
      time: '10:06',
      title: 'Auto Remediation Executed',
      type: 'Remediation',
      status: 'Success',
      engineer: 'AIME Auto-Agent',
      description: 'AIME analyzed query performance and identified a slow-running un-indexed analytic scan. Kill-signal sent to PID 8812.',
      commit: 'N/A',
      ticket: 'INC-402',
      details: {
        'Diagnostic Result': 'Identified nested scan query block without index.',
        'Action': 'Terminated connection thread ID: pg_backend_pid(8812)',
        'Remediation': 'CPU load immediately dropped to 14.5%.'
      }
    },
    {
      time: '10:08',
      title: 'Incident Resolved',
      type: 'Resolution',
      status: 'Success',
      engineer: 'Tushar Patil (SRE)',
      description: 'Incident INC-402 marked as resolved. Auto-remediation validated by health checks.',
      commit: 'N/A',
      ticket: 'INC-402',
      details: {
        'Final Resolution': 'Resolved without manual downtime.',
        'SRE Action': 'Scheduled index creation via migrations tomorrow morning.'
      }
    }
  ];

  // Clickable example questions
  const exampleQuestions = [
    {
      q: 'Why did RDS reboot?',
      answer: {
        rootCause: 'RDS database instance was rebooted due to high memory pressure and subsequent automatic failover group testing. The failover succeeded in 12 seconds with minimal replica mismatch lag.',
        engineer: 'AWS System (Auto-Failover)',
        timestamp: 'Today at 09:24 UTC',
        terraform: 'aws_db_instance.db_postgres_primary',
        commit: 'N/A (System level)',
        affectedResources: 'db-postgres-prod-primary (RDS Postgres Cluster)',
        suggestedFix: 'Implement connection pooling via AWS RDS Proxy or PgBouncer to prevent client connection spikes from overwhelming postgres buffers.',
        confidence: '98%'
      }
    },
    {
      q: 'Who changed the Security Group?',
      answer: {
        rootCause: 'A security group ingress exception rule was added. Port 5432 (Postgres Default) was opened directly to developer debugging servers in Maharashtra, India CIDR without tunnel validation.',
        engineer: 'Alex Rivera (DevOps)',
        timestamp: 'Yesterday at 09:18 UTC',
        terraform: 'aws_security_group_rule.postgres_ingress_debug',
        commit: 'git-rev-c09a82 ("add ingress port for emergency db troubleshooting")',
        affectedResources: 'sg-03ea21 (sg-web-production Security Group)',
        suggestedFix: 'Revoke the public rule immediately and route all emergency database access strictly through Session Manager (SSM) or temporary Bastion Host wireguard tunnels.',
        confidence: '100%'
      }
    },
    {
      q: 'Show Terraform changes from yesterday.',
      answer: {
        rootCause: 'Terraform execution initialized S3 audit logs configuration block adjustments to force retention lock rules under strict compliance guidelines.',
        engineer: 'Tushar Patil (SRE)',
        timestamp: 'Yesterday at 09:12 UTC',
        terraform: 'aws_s3_bucket.aime_audit_logs',
        commit: 'git-rev-a77e12 ("feat: enable compliance locks for s3 compliance reports")',
        affectedResources: 'S3 Bucket: aime-sre-audit-logs',
        suggestedFix: 'None required. S3 objects lock has successfully verified legal-hold status of stored SRE compliance snapshots.',
        confidence: '95%'
      }
    },
    {
      q: 'Find Kubernetes deployment failures.',
      answer: {
        rootCause: 'Found 1 previous deployment failure inside Namespace: default for deployment auth-service. Pods were stuck in ImagePullBackOff due to a misspelled registry tag in the manifest file.',
        engineer: 'Sarah Jenkins (Platform)',
        timestamp: '2026-07-15 14:10:00',
        terraform: 'kubernetes_deployment.auth_service',
        commit: 'git-rev-f998ba ("hotfix: fix auth-service registry address typo")',
        affectedResources: 'EKS Pod: auth-service-6d5dfb88-err99',
        suggestedFix: 'Configure strict pre-flight CI/CD pipelines to validate image tag existence prior to executing kubectl apply commands.',
        confidence: '94%'
      }
    },
    {
      q: 'Compare production between yesterday and today.',
      answer: {
        rootCause: 'Identified a drift of exactly 3 resources: 1 Security Group egress block added, 1 EBS Volume upgraded, and 1 new EKS Deployment version bumped.',
        engineer: 'Alex Rivera (DevOps) & Sarah Jenkins',
        timestamp: 'Between July 16 and July 17',
        terraform: 'aws_instance.nginx_prod, sg-web-production',
        commit: 'git-rev-c09a82, git-rev-f998ba',
        affectedResources: 'srv-nginx-prod, k8s-us-central-prod',
        suggestedFix: 'Run terraform apply to reconcile any untracked AWS resources that are drifted outside state declarations.',
        confidence: '96%'
      }
    },
    {
      q: 'Show previous similar incidents.',
      answer: {
        rootCause: 'Found incident mismatch: Incident INC-402 matches a historical SRE incident recorded on 2026-07-11 16:40:00 on the nginx ingress proxy.',
        engineer: 'Sarah Jenkins (Platform)',
        timestamp: '2026-07-11 16:40:00',
        terraform: 'aws_instance.nginx_prod config',
        commit: 'git-rev-x3312e ("fix: increase nginx worker_connections load parameters")',
        affectedResources: 'srv-nginx-prod (systemd)',
        suggestedFix: 'Always review socket maximum file limits (/etc/security/limits.conf) alongside worker connection limits to avoid sudden packet drop states during flash-traffic loads.',
        confidence: '92%'
      }
    }
  ];

  // Explorer Data Map
  const explorerData: Record<string, Record<string, Array<{ label: string; value: string | string[] }>>> = {
    aws: {
      EC2: [
        { label: 'Name', value: 'srv-nginx-prod' },
        { label: 'Instance ID', value: 'i-09f12a3bc' },
        { label: 'Instance Type', value: 't3.medium (4 vCPUs, 8GB RAM)' },
        { label: 'Status', value: 'Running (Healthy)' },
        { label: 'Private IP', value: '10.0.1.12' },
        { label: 'Public IP', value: '34.201.44.89' },
        { label: 'VPC ID', value: 'vpc-01a2b3c4' },
        { label: 'IAM Instance Profile', value: 'role-ec2-web-server' }
      ],
      RDS: [
        { label: 'DB Cluster Name', value: 'db-postgres-prod-primary' },
        { label: 'Engine', value: 'PostgreSQL 15.4' },
        { label: 'DB Instance Class', value: 'db.r6g.xlarge' },
        { label: 'Storage Allocated', value: '500 GB (GP3)' },
        { label: 'Backup Window', value: '03:00-04:00 UTC (Daily)' },
        { label: 'Multi-AZ', value: 'Enabled (us-east-1a / us-east-1b)' },
        { label: 'Endpoint', value: 'db-postgres-prod.aime.internal:5432' }
      ],
      S3: [
        { label: 'Bucket Name', value: 'aime-sre-audit-logs' },
        { label: 'Region', value: 'us-east-1' },
        { label: 'Storage Size', value: '2.1 TB' },
        { label: 'Objects Count', value: '45,212 objects' },
        { label: 'Versioning', value: 'Enabled' },
        { label: 'Object Compliance Lock', value: 'Activated (7 days minimum)' }
      ],
      VPC: [
        { label: 'VPC Name', value: 'Primary Corporate VPC' },
        { label: 'VPC ID', value: 'vpc-01a2b3c4' },
        { label: 'IPv4 CIDR Block', value: '10.0.0.0/16' },
        { label: 'Subnets Map', value: '6 subnets (3 public [10.0.1.0/24], 3 private [10.0.4.0/24])' },
        { label: 'Internet Gateway', value: 'igw-08ba12' },
        { label: 'NAT Gateways', value: 'nat-03aa99 (us-east-1a)' }
      ],
      IAM: [
        { label: 'Role Name', value: 'role-eks-cluster-execution' },
        { label: 'Trust Entities', value: 'eks.amazonaws.com' },
        { label: 'Attached Policies', value: 'AmazonEKSClusterPolicy, AmazonEKSVPCResourceController' },
        { label: 'SRE Access Badges', value: 'Authorized for SRE cluster audit logs' }
      ]
    },
    k8s: {
      Clusters: [
        { label: 'Cluster Name', value: 'eks-us-central-prod' },
        { label: 'Kubernetes Version', value: 'v1.28.2' },
        { label: 'Provider', value: 'AWS EKS Managed' },
        { label: 'API Health', value: 'OK (100% responsive)' },
        { label: 'Namespaces', value: ['core', 'default', 'logging', 'monitoring'] }
      ],
      Nodes: [
        { label: 'Node Name', value: 'k8s-node-01' },
        { label: 'Allocatable CPU', value: '4.0 vCPU' },
        { label: 'Allocatable RAM', value: '16.0 GB' },
        { label: 'Kubelet Version', value: 'v1.28.2' },
        { label: 'Operating System', value: 'Ubuntu 22.04 LTS (Kernel 5.15)' }
      ],
      Pods: [
        { label: 'Pod Name', value: 'auth-service-6d5dfb88-abc12' },
        { label: 'Namespace', value: 'core' },
        { label: 'Status', value: 'Running' },
        { label: 'IP', value: '10.244.0.12' },
        { label: 'Restarts', value: '0 restarts' },
        { label: 'CPU Usage', value: '85m (2.1%)' }
      ],
      Deployments: [
        { label: 'Deployment Name', value: 'auth-service' },
        { label: 'Replicas desired', value: '2 desired / 2 available' },
        { label: 'Strategy', value: 'RollingUpdate (25% max unavailable)' },
        { label: 'Selector', value: 'app=auth-service' }
      ],
      Services: [
        { label: 'Service Name', value: 'auth-service-svc' },
        { label: 'Namespace', value: 'core' },
        { label: 'Type', value: 'ClusterIP' },
        { label: 'Cluster IP', value: '10.96.104.22' },
        { label: 'Port Mapping', value: '8080:8080/TCP' }
      ]
    },
    docker: {
      Containers: [
        { label: 'Container', value: 'nginx-ingress' },
        { label: 'Container ID', value: 'e09a32cf1b42' },
        { label: 'Image used', value: 'nginx:alpine' },
        { label: 'Status', value: 'Running (Up 11 days)' },
        { label: 'Port Bindings', value: '80:80, 443:443' }
      ],
      Images: [
        { label: 'Image', value: 'redis:7.0-alpine' },
        { label: 'Vulnerabilities', value: '0 High / 1 Medium / 4 Low' },
        { label: 'Image size', value: '32.1 MB' },
        { label: 'Layers count', value: '6 layer blocks' }
      ],
      Networks: [
        { label: 'Network', value: 'aime-internal-bridge' },
        { label: 'Driver', value: 'bridge' },
        { label: 'Subnet CIDR', value: '172.20.0.0/16' },
        { label: 'Connected Containers', value: 'nginx-ingress, node-api-server, redis-cache' }
      ]
    },
    linux: {
      Servers: [
        { label: 'Host Server', value: 'srv-nginx-prod' },
        { label: 'Architecture', value: 'x86_64' },
        { label: 'Memory Capacity', value: '16.0 GB' },
        { label: 'Disk space', value: '100 GB (GP3 EBS)' }
      ],
      Services: [
        { label: 'Services active', value: 'nginx.service, docker.service, sshd.service, chrony.service' },
        { label: 'Status manager', value: 'systemd (daemons validated OK)' }
      ],
      Logs: [
        { label: 'Primary logs', value: '/var/log/syslog' },
        { label: 'Active parser', value: 'fluentd logs shipping daemon' }
      ],
      Users: [
        { label: 'Sudoers accounts', value: 'root, ubuntu, sysadmin_clara, sre_sarah, devops_alex' },
        { label: 'Last access', value: 'Yesterday 17:15 UTC via SSH public key (sre_sarah)' }
      ]
    },
    terraform: {
      Modules: [
        { label: 'Modules Declared', value: 'modules/vpc (v1.2.0), modules/eks_cluster (v3.4.1), modules/rds' }
      ],
      Resources: [
        { label: 'Managed resources', value: '34 total cloud database resources tracked in state' }
      ],
      State: [
        { label: 'State file', value: 'terraform.tfstate (Hosted in S3 bucket)' },
        { label: 'Lock type', value: 'DynamoDB table backend state lock configured' }
      ],
      Outputs: [
        { label: 'Outputs declared', value: 'vpc_id, rds_endpoint, eks_cluster_arn' }
      ]
    }
  };

  // Incidents Array
  const incidents = [
    { id: 'INC-402', title: 'High CPU load on db-postgres-prod-primary', severity: 'Critical', status: 'Resolved', duration: '6m', date: 'Today, 10:02', description: 'Automated analytics query scan connection timed out. Auto-remedied.' },
    { id: 'INC-398', title: 'Redis replica lag mismatch cluster secondary', severity: 'Monitoring', status: 'Monitoring', duration: 'Ongoing', date: 'Today, 08:12', description: 'Replication offset mismatch detected on cache cluster node us-east-1b.' },
    { id: 'INC-391', title: 'S3 bucket CORS policy violation warning', severity: 'Investigating', status: 'Investigating', duration: '12m', date: 'Today, 07:44', description: 'Audit trail detected public access rule exception drift.' },
    { id: 'INC-388', title: 'Postgres buffer memory pressure warning threshold', severity: 'Critical', status: 'Resolved', duration: '4h 12m', date: 'Yesterday, 16:40', description: 'Disk expansion and temporary service reload validated successfully.' }
  ];

  // Audit Logs Array
  const auditLogs = [
    { engineer: 'Tushar Patil', time: '10:08', action: 'Resolved INC-402', env: 'Production', reason: 'Auto-remediation verified.' },
    { engineer: 'AIME Auto-Agent', time: '10:06', action: 'Kill Connection PID 8812', env: 'Production', reason: 'High CPU load on db-postgres.' },
    { engineer: 'Tushar Patil', time: '09:24', action: 'Scale RDS Storage to 500GB', env: 'Production', reason: 'Telemetry disk pressure warning.' },
    { engineer: 'Alex Rivera', time: '09:18', action: 'Update Security Group sg-03ea21', env: 'Production', reason: 'Emergency debugging exception.' },
    { engineer: 'Tushar Patil', time: '09:12', action: 'Terraform Apply #248', env: 'Production', reason: 'Compliance log bucket setup.' },
    { engineer: 'Sarah Jenkins', time: 'Yesterday', action: 'Kubectl Deployment rollout', env: 'Production', reason: 'v2.4.2 bug fixes deploy.' },
    { engineer: 'Alex Rivera', time: 'Yesterday', action: 'Add Nginx route redirect', env: 'Staging', reason: 'Internal test traffic routing.' }
  ];

  // AI Answer click simulation
  const handleSelectExampleQuestion = (questionObj: any) => {
    setIsAiThinking(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: questionObj.q }]);
    
    setTimeout(() => {
      setIsAiThinking(false);
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `Here is what AIME remembers regarding "${questionObj.q}":`,
        details: questionObj.answer
      }]);
    }, 1200);
  };

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    const query = customQuestion;
    setCustomQuestion('');
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setIsAiThinking(true);

    setTimeout(() => {
      setIsAiThinking(false);
      // Pick a random example answer or give a general smart response
      const matched = exampleQuestions.find(eq => query.toLowerCase().includes(eq.q.toLowerCase().slice(5, 12)));
      const answerToUse = matched ? matched.answer : {
        rootCause: "Analysing historical metrics... No exact matched incident. Found active running processes 'dockerd' and 'redis-server' are within normal limits. S3 audit storage is fully synchronized.",
        engineer: "Tushar Patil",
        timestamp: "Just now",
        terraform: "aws_vpc.primary_corp_vpc",
        commit: "git-rev-latest",
        affectedResources: "VPC Infrastructure Block",
        suggestedFix: "No abnormal performance drift identified. Run 'aime cli verify' to compare active configurations against state files.",
        confidence: "88%"
      };

      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: `Search complete. Verified against SRE Memory database. Here are the details matching your inquiry:`,
        details: answerToUse
      }]);
    }, 1000);
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = log.engineer.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.reason.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesEnv = auditEnvFilter === 'All' || log.env === auditEnvFilter;
    return matchesSearch && matchesEnv;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 flex flex-col justify-between">
      
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-b border-cyan-500/20 px-4 py-2 text-center text-xs text-cyan-300 font-medium tracking-wide flex items-center justify-center gap-2 relative z-50">
        <Info className="w-4 h-4 flex-shrink-0 animate-pulse text-cyan-400" />
        <span><strong>Enterprise Demo Sandbox:</strong> This demo uses realistic sample infrastructure data only. No real customer environment is exposed.</span>
        <button 
          onClick={onExitDemo}
          className="ml-4 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[10px] text-cyan-300 hover:text-white hover:bg-cyan-900 font-mono transition-all uppercase cursor-pointer"
        >
          Exit Demo
        </button>
      </div>

      {/* Hero Welcome screen */}
      <AnimatePresence>
        {!isDemoStarted ? (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto my-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/10 mb-8 animate-bounce">
              <Database className="w-8 h-8 text-slate-950 stroke-[2.5]" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              SRE Memory Vault Sandbox
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
              AI Infrastructure Memory Demo
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
              Explore how AI remembers your cloud infrastructure, incidents, deployments, and fixes using realistic sample data. See how on-call engineers diagnose complex issues instantly using SRE memory.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => setIsDemoStarted(true)}
                className="px-8 py-4 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2 group text-base uppercase tracking-wider"
              >
                <Play className="w-4.5 h-4.5 fill-slate-950" /> Start Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onExitDemo}
                className="px-6 py-4 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700 transition-all font-medium text-sm"
              >
                Return to Product Page
              </button>
            </div>

            {/* Quick specifications display */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto w-full border-t border-slate-900 mt-16 pt-8 text-left">
              <div>
                <span className="block text-xl font-bold text-white font-mono">100%</span>
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Sample Coverage</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-cyan-400 font-mono">Interactive</span>
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">AI Assistant</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-white font-mono">Real-time</span>
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Mock metrics</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Live SaaS Terminal Demo View */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col md:flex-row bg-[#080b11] border-t border-slate-900 relative"
          >
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-60 border-r border-slate-900 bg-[#06080d] flex-shrink-0 flex flex-col justify-between p-4 space-y-4">
              <div className="space-y-6">
                
                {/* Brand and Selector badge */}
                <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                    <Database className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-extrabold text-white text-sm block tracking-tight">AIME Console</span>
                    <span className="text-[8px] font-mono uppercase tracking-wider text-cyan-400 block">SRE Sandbox Environment</span>
                  </div>
                </div>

                {/* Navigation items */}
                <nav className="space-y-1 text-xs">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${activeTab === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Overview Dashboard</span>
                    {activeTab === 'dashboard' && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('explorer')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${activeTab === 'explorer' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>Resource Explorer</span>
                    {activeTab === 'explorer' && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${activeTab === 'chat' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}`}
                  >
                    <Brain className="w-4 h-4" />
                    <span>AI Assistant Chat</span>
                    {activeTab === 'chat' && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('incidents')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${activeTab === 'incidents' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Incident Board</span>
                    {activeTab === 'incidents' && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${activeTab === 'audit' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'}`}
                  >
                    <Terminal className="w-4 h-4" />
                    <span>SRE Audit Logs</span>
                    {activeTab === 'audit' && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400" />}
                  </button>
                </nav>

              </div>

              {/* Console Info Footer */}
              <div className="space-y-3.5 pt-4 border-t border-slate-900">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-900 space-y-1.5 text-[10px] text-slate-400">
                  <span className="font-mono text-cyan-400 uppercase tracking-widest font-bold block">Status Info</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Sandbox Database active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Mock ingestion: 2,122 events/s</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={onLaunchApp}
                    className="w-full py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Enter Real Console
                  </button>
                  <button
                    onClick={onExitDemo}
                    className="w-full py-1.5 rounded border border-slate-900 hover:border-slate-800 text-[10px] text-slate-500 hover:text-slate-300 font-mono text-center uppercase tracking-wider"
                  >
                    ← Exit Demo
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 overflow-y-auto space-y-6">

              {/* Header metrics bar (always visible in live demo mode) */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-900 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase font-mono tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    AIME Memory Engine Demo Workspace
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Continuous monitoring of active resource configuration states and AI-assisted anomaly identification.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-900">
                  <span>LAST RECONCILED SYNC: JUST NOW</span>
                </div>
              </div>

              {/* Metric stats card grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">AWS Resources</span>
                  <span className="text-lg font-bold text-cyan-400 block mt-0.5">248</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">K8s Clusters</span>
                  <span className="text-lg font-bold text-cyan-400 block mt-0.5">5</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Linux Servers</span>
                  <span className="text-lg font-bold text-cyan-400 block mt-0.5">32</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Docker Containers</span>
                  <span className="text-lg font-bold text-cyan-400 block mt-0.5">146</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Terraform Resources</span>
                  <span className="text-lg font-bold text-cyan-400 block mt-0.5">512</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left">
                  <span className="text-[9px] font-mono text-red-500/80 uppercase block">Active Incidents</span>
                  <span className="text-lg font-bold text-red-400 block mt-0.5">2</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-900 bg-slate-950 text-left col-span-2 lg:col-span-1">
                  <span className="text-[9px] font-mono text-emerald-500/80 uppercase block">Resolved Today</span>
                  <span className="text-lg font-bold text-emerald-400 block mt-0.5">17</span>
                </div>
              </div>

              {/* TABS VIEWPORT */}
              <AnimatePresence mode="wait">
                
                {/* 1. OVERVIEW DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Graph & Timeline Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Recharts graph */}
                      <div className="lg:col-span-7 p-5 rounded-xl border border-slate-900 bg-slate-950 text-left space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest block">TELEMETRY MONITOR</span>
                            <h3 className="text-sm font-bold text-white mt-0.5">Cluster CPU Load vs. Memory Ingested</h3>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/10 text-[9px] font-mono text-cyan-300">
                            LIVE UPDATES ON
                          </span>
                        </div>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={CHART_DATA}>
                              <defs>
                                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                              <XAxis dataKey="time" stroke="#71717a" fontSize={10} fontStyle="italic" />
                              <YAxis stroke="#71717a" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '6px' }} />
                              <Legend />
                              <Area name="CPU load %" type="monotone" dataKey="load" stroke="#06b6d4" fillOpacity={1} fill="url(#colorLoad)" />
                              <Area name="Stored Memories count" type="monotone" dataKey="memoryStored" stroke="#6366f1" fillOpacity={1} fill="url(#colorMemory)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                          *Automatic SRE agent reads continuous system state streams, transforming transient load exceptions into permanent memory blocks.
                        </p>
                      </div>

                      {/* Right: Infrastructure Timeline */}
                      <div className="lg:col-span-5 p-5 rounded-xl border border-slate-900 bg-slate-950 text-left space-y-4">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest block">CHRONOLOGICAL VAULT</span>
                          <h3 className="text-sm font-bold text-white mt-0.5">Infrastructure Timeline</h3>
                        </div>

                        {/* Interactive Timeline list */}
                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                          {timelineEvents.map((ev, index) => (
                            <div 
                              key={index} 
                              onClick={() => setInspectedTimelineItem(ev)}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${inspectedTimelineItem?.title === ev.title ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-[#090b10] border-slate-900 hover:border-slate-800'}`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-cyan-400">{ev.time}</span>
                                  <span className="font-mono font-bold text-xs text-white leading-none">{ev.title}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{ev.description}</p>
                              </div>
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded leading-none ${ev.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'}`}>
                                {ev.status}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 text-center">
                          <span className="text-[9px] font-mono text-slate-500">
                            Click any timeline block to inspect detailed diff & configuration metadata.
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Timeline Inspect Drawer */}
                    {inspectedTimelineItem && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-xl border border-cyan-500/20 bg-cyan-950/5 text-left space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/20">
                              {inspectedTimelineItem.time}
                            </span>
                            <h4 className="text-sm font-bold text-white font-mono">{inspectedTimelineItem.title} Diff Details</h4>
                          </div>
                          <button 
                            onClick={() => setInspectedTimelineItem(null)}
                            className="text-slate-500 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase">Change Type</span>
                            <span className="text-slate-300 font-bold block">{inspectedTimelineItem.type}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase">SRE Operator</span>
                            <span className="text-slate-300 font-bold block">{inspectedTimelineItem.engineer}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase">System Context / Ticket</span>
                            <span className="text-slate-300 font-bold block">{inspectedTimelineItem.ticket} / {inspectedTimelineItem.commit}</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded bg-slate-950 border border-slate-900 font-mono text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                          <span className="text-slate-500 text-[9px] block uppercase">Live State Metadata Captured:</span>
                          {Object.entries(inspectedTimelineItem.details).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-slate-500">{key}:</span>
                              <span className="text-cyan-400 font-bold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Quick Demo Assist Banner */}
                    <div className="p-4.5 rounded-xl border border-slate-900 bg-slate-950/40 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-950/50 border border-cyan-500/10 flex items-center justify-center text-cyan-400">
                          <Brain className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-cyan-400 text-xs block uppercase tracking-wide">Enterprise AI SRE Copilot Simulation Ready</span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Our AI SRE is pre-hydrated with these exact timeline states. You can ask queries instantly to isolate why incidents occur.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="px-4 py-2 rounded bg-cyan-500 text-slate-950 text-xs font-bold uppercase hover:bg-cyan-400 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Ask AI Assistant
                      </button>
                    </div>

                  </motion.div>
                )}

                {/* 2. RESOURCE EXPLORER */}
                {activeTab === 'explorer' && (
                  <motion.div
                    key="explorer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Top filter Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-4">
                      <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-900 font-mono text-xs">
                        <button
                          onClick={() => { setActiveExplorerTab('aws'); setActiveExplorerSubCategory('EC2'); }}
                          className={`px-3 py-1.5 rounded transition-all ${activeExplorerTab === 'aws' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          AWS
                        </button>
                        <button
                          onClick={() => { setActiveExplorerTab('k8s'); setActiveExplorerSubCategory('Clusters'); }}
                          className={`px-3 py-1.5 rounded transition-all ${activeExplorerTab === 'k8s' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          KUBERNETES
                        </button>
                        <button
                          onClick={() => { setActiveExplorerTab('docker'); setActiveExplorerSubCategory('Containers'); }}
                          className={`px-3 py-1.5 rounded transition-all ${activeExplorerTab === 'docker' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          DOCKER
                        </button>
                        <button
                          onClick={() => { setActiveExplorerTab('linux'); setActiveExplorerSubCategory('Servers'); }}
                          className={`px-3 py-1.5 rounded transition-all ${activeExplorerTab === 'linux' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          LINUX
                        </button>
                        <button
                          onClick={() => { setActiveExplorerTab('terraform'); setActiveExplorerSubCategory('Modules'); }}
                          className={`px-3 py-1.5 rounded transition-all ${activeExplorerTab === 'terraform' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          TERRAFORM
                        </button>
                      </div>

                      {/* Search box */}
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Filter resource properties..."
                          value={explorerSearch}
                          onChange={(e) => setExplorerSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-950 border border-slate-900 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-600 font-mono"
                        />
                      </div>
                    </div>

                    {/* Subcategories Selector Row */}
                    <div className="flex flex-wrap gap-2 text-xs font-mono justify-start text-left">
                      {Object.keys(explorerData[activeExplorerTab] || {}).map((subKey) => (
                        <button
                          key={subKey}
                          onClick={() => setActiveExplorerSubCategory(subKey)}
                          className={`px-2.5 py-1 rounded border transition-all ${activeExplorerSubCategory === subKey ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20 font-bold' : 'bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300'}`}
                        >
                          {subKey}
                        </button>
                      ))}
                    </div>

                    {/* Discovered Specs Sheet */}
                    <div className="p-6 rounded-xl border border-slate-900 bg-slate-950 text-left space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">STATE RECONCILIATION EXPORTER</span>
                          <h3 className="text-sm font-bold text-white mt-0.5">{activeExplorerTab.toUpperCase()} • {activeExplorerSubCategory} Discovered Properties</h3>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded leading-none uppercase">
                          State: Synced
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(explorerData[activeExplorerTab]?.[activeExplorerSubCategory] || [])
                          .filter(item => 
                            item.label.toLowerCase().includes(explorerSearch.toLowerCase()) || 
                            String(item.value).toLowerCase().includes(explorerSearch.toLowerCase())
                          )
                          .map((item, idx) => (
                            <div key={idx} className="p-3 rounded bg-[#090c12] border border-slate-900/60 font-mono text-xs flex flex-col justify-between gap-1.5">
                              <span className="text-slate-500 text-[10px] uppercase block">{item.label}</span>
                              {Array.isArray(item.value) ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.value.map((valStr, sIdx) => (
                                    <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 text-[9px] border border-slate-850">
                                      {valStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-200 font-bold break-all">{String(item.value)}</span>
                              )}
                            </div>
                        ))}
                      </div>

                      {/* Warning notice about sandbox mode */}
                      <p className="text-[10px] text-slate-500 font-mono italic text-center pt-2 border-t border-slate-900">
                        *In production, properties are auto-synchronized every 5 seconds. To trace AWS or Kubernetes configuration updates click "SRE Audit Logs" tab.
                      </p>
                    </div>

                  </motion.div>
                )}

                {/* 3. AI CHAT ASSISTANT */}
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    
                    {/* Left Column: Sample Clickable SRE Queries */}
                    <div className="lg:col-span-4 space-y-4 text-left">
                      <div className="p-4 rounded-xl border border-slate-900 bg-slate-950 space-y-3">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                            Select Demo Query
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Click any question below to see how our AI answers instantly using SRE memory logs without hallucination:
                        </p>
                        
                        <div className="space-y-2 pt-1.5">
                          {exampleQuestions.map((qObj, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectExampleQuestion(qObj)}
                              className="w-full text-left p-2.5 rounded-lg bg-[#090b10] border border-slate-900 hover:border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:text-white transition-all cursor-pointer block leading-normal"
                            >
                              "{qObj.q}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Simulated Chat Window */}
                    <div className="lg:col-span-8 p-5 rounded-xl border border-slate-900 bg-slate-950 flex flex-col justify-between min-h-[440px] text-left">
                      
                      {/* Chat Header */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-cyan-400" />
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">AIME AI SRE Memory Copilot</h3>
                            <span className="text-[9px] font-mono text-cyan-500">Continuous Vault Sync: ACTIVE</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                          Strict Compliance reasoning
                        </span>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[300px] pr-1">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div className={`p-3 rounded-lg max-w-[85%] text-xs ${msg.sender === 'user' ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/15' : 'bg-[#090c12] text-slate-300 border border-slate-900'}`}>
                              <p className="font-mono leading-relaxed whitespace-pre-line">{msg.text}</p>
                            </div>

                            {/* Render deep incident details if assistants output details */}
                            {msg.details && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-[90%] p-4 rounded-lg bg-[#040609] border border-cyan-500/20 text-[11px] font-mono space-y-3.5"
                              >
                                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                                  <span className="text-cyan-400 font-bold uppercase text-[9px]">AIME Memory Trace Snapshot:</span>
                                  <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                                    Confidence: {msg.details.confidence}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Root Cause analysis:</span>
                                  <p className="text-slate-300 font-sans leading-relaxed">{msg.details.rootCause}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900/60">
                                  <div>
                                    <span className="text-slate-500 text-[9px] uppercase block">Operator / Agent:</span>
                                    <span className="text-slate-300 font-bold">{msg.details.engineer}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[9px] uppercase block">Git Commit Hash:</span>
                                    <span className="text-slate-300 font-bold">{msg.details.commit}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[9px] uppercase block">Timestamp:</span>
                                    <span className="text-slate-300 font-bold">{msg.details.timestamp}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[9px] uppercase block">Terraform resource:</span>
                                    <span className="text-cyan-300 font-bold">{msg.details.terraform}</span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded bg-red-950/10 border border-red-500/15">
                                  <span className="text-red-400 text-[9px] uppercase font-bold block mb-1">Suggested Outage Remediation:</span>
                                  <p className="text-slate-300 font-sans leading-normal">{msg.details.suggestedFix}</p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        ))}

                        {/* Typing / Thinking effect */}
                        {isAiThinking && (
                          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>AIME is matching SRE graph memories...</span>
                          </div>
                        )}
                      </div>

                      {/* Custom Input form */}
                      <form onSubmit={handleCustomQuestionSubmit} className="pt-3 border-t border-slate-900 flex gap-2">
                        <input
                          type="text"
                          placeholder="Ask AIME a custom SRE question..."
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-lg bg-[#090b10] border border-slate-900 focus:outline-none focus:border-cyan-500 text-xs font-mono text-slate-100"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase cursor-pointer transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>

                    </div>

                  </motion.div>
                )}

                {/* 4. INCIDENT BOARD */}
                {activeTab === 'incidents' && (
                  <motion.div
                    key="incidents"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    
                    {/* Incidents Table list */}
                    <div className="p-5 rounded-xl border border-slate-900 bg-slate-950 text-left space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">TELEMETRY ANOMALY DETECTOR</span>
                          <h3 className="text-sm font-bold text-white mt-0.5">Sample Operational Incidents</h3>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                          Total Outage History
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-500 uppercase text-[10px]">
                              <th className="pb-3 pr-4">Incident ID</th>
                              <th className="pb-3 pr-4">Title / Source</th>
                              <th className="pb-3 pr-4">Status</th>
                              <th className="pb-3 pr-4">Severity</th>
                              <th className="pb-3 pr-4">Duration</th>
                              <th className="pb-3 text-right">Trigger Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incidents.map((inc) => (
                              <tr key={inc.id} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-all">
                                <td className="py-3.5 pr-4 text-cyan-400 font-bold">{inc.id}</td>
                                <td className="py-3.5 pr-4">
                                  <span className="text-slate-200 font-bold block">{inc.title}</span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">{inc.description}</span>
                                </td>
                                <td className="py-3.5 pr-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase border ${
                                    inc.status === 'Resolved'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                                      : inc.status === 'Investigating'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/10 animate-pulse'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                                  }`}>
                                    {inc.status}
                                  </span>
                                </td>
                                <td className="py-3.5 pr-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${inc.severity === 'Critical' ? 'bg-red-950/20 text-red-400' : 'bg-amber-950/20 text-amber-400'}`}>
                                    {inc.severity}
                                  </span>
                                </td>
                                <td className="py-3.5 pr-4 text-slate-400">{inc.duration}</td>
                                <td className="py-3.5 text-right text-slate-500">{inc.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>

                  </motion.div>
                )}

                {/* 5. AUDIT LOGS */}
                {activeTab === 'audit' && (
                  <motion.div
                    key="audit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    
                    {/* Search & filters controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search actions or engineers..."
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#090b10] border border-slate-900 focus:outline-none focus:border-cyan-500 text-xs font-mono text-slate-200 placeholder-slate-600"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 uppercase whitespace-nowrap">Env Filter:</span>
                        <select
                          value={auditEnvFilter}
                          onChange={(e) => setAuditEnvFilter(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-[#090b10] border border-slate-900 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="All">All Environments</option>
                          <option value="Production">Production</option>
                          <option value="Staging">Staging</option>
                        </select>
                      </div>
                    </div>

                    {/* Logs Grid output */}
                    <div className="p-5 rounded-xl border border-slate-900 bg-slate-950 text-left space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">ENTERPRISE AUDIT Trail</span>
                          <h3 className="text-sm font-bold text-white mt-0.5">Continuous Git & Terraform Operations</h3>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                          WORM Compliant storage
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {filteredAuditLogs.length > 0 ? (
                          filteredAuditLogs.map((log, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-[#090c12] border border-slate-900/60 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[9px] font-bold">
                                    {log.time}
                                  </span>
                                  <span className="text-slate-300 font-bold">{log.action}</span>
                                  <span className="text-[10px] text-slate-500">• {log.engineer}</span>
                                </div>
                                <p className="text-[10px] text-slate-500">Reasoning: {log.reason}</p>
                              </div>

                              <div className="flex items-center gap-2 justify-end">
                                <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-500 text-[9px] border border-slate-850 uppercase">
                                  {log.env}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-600 font-mono text-xs">
                            No logs matched your active search or environment filters.
                          </div>
                        )}
                      </div>

                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-slate-600 text-[10px] font-mono relative z-10">
        <span>© 2026 AI Infrastructure Memory. Enterprise Sandbox Suite version 2.4-stable.</span>
      </footer>

    </div>
  );
}
