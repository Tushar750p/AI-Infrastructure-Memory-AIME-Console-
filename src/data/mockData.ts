import { LinuxServer, MemoryEvent, DockerContainer, KubernetesCluster, KubernetesNode, KubernetesPod, KubernetesDeployment, KubernetesService } from '../types';

export const INITIAL_SERVERS: LinuxServer[] = [
  {
    id: 'srv-01',
    name: 'srv-nginx-prod',
    ip: '10.0.1.12',
    os: 'Ubuntu 22.04 LTS (Kernel 5.15)',
    status: 'healthy',
    uptime: '14d 6h 12m',
    cpu: 28,
    ram: 44,
    disk: 58,
    provider: 'AWS EC2',
    region: 'us-east-1a',
    sshPort: 22,
    sshUser: 'ubuntu'
  },
  {
    id: 'srv-02',
    name: 'srv-docker-host',
    ip: '10.0.1.45',
    os: 'Debian 12 Bookworm',
    status: 'warning',
    uptime: '8d 14h 3m',
    cpu: 65,
    ram: 78,
    disk: 72,
    provider: 'DigitalOcean Droplet',
    region: 'nyc3',
    sshPort: 2222,
    sshUser: 'admin'
  },
  {
    id: 'srv-03',
    name: 'srv-db-primary',
    ip: '10.0.2.10',
    os: 'RHEL 9.2 (Red Hat Enterprise)',
    status: 'critical',
    uptime: '45d 1h 40m',
    cpu: 91,
    ram: 94,
    disk: 92,
    provider: 'AWS EC2',
    region: 'us-east-1b',
    sshPort: 22,
    sshUser: 'ec2-user'
  },
  {
    id: 'srv-04',
    name: 'srv-k8s-node-01',
    ip: '10.0.3.101',
    os: 'Ubuntu 22.04 LTS (Kernel 5.15)',
    status: 'healthy',
    uptime: '11d 9h 33m',
    cpu: 45,
    ram: 60,
    disk: 41,
    provider: 'Google Cloud Engine',
    region: 'us-central1-b',
    sshPort: 22,
    sshUser: 'gcp-user'
  },
  {
    id: 'srv-05',
    name: 'srv-k8s-node-02',
    ip: '10.0.3.102',
    os: 'Ubuntu 22.04 LTS (Kernel 5.15)',
    status: 'healthy',
    uptime: '11d 9h 28m',
    cpu: 39,
    ram: 54,
    disk: 38,
    provider: 'Google Cloud Engine',
    region: 'us-central1-b',
    sshPort: 22,
    sshUser: 'gcp-user'
  }
];

export const INITIAL_MEMORY_EVENTS: MemoryEvent[] = [
  {
    id: 'evt-00-rds-update',
    timestamp: '2026-03-17T10:00:00Z', // 4 months ago relative to July 2026
    serverId: 'srv-03',
    serverName: 'srv-db-primary',
    type: 'config',
    message: 'Terraform Update applied - RDS postgres storage expanded',
    user: 'Tushar Patil',
    team: 'Database Platform',
    changeReason: 'Increase RDS storage due to disk usage.',
    commitId: 'db-alloc-6e7a1',
    terraformApplyId: 'tf-apply-rds-245',
    gitBranch: 'main',
    pullRequest: '#245',
    jiraTicket: 'INC-4521',
    environment: 'Production',
    details: 'Changed storage allocation from 100GB to 500GB. Storage expanded successfully, but trigger reboot condition was set to true on the db instance module configuration.',
    category: 'mysql',
    severity: 'warning',
    editableNote: 'Autoscaling parameters were not fully in sync; manually expanded storage to prevent out-of-space crash.'
  },
  {
    id: 'evt-01',
    timestamp: '2026-07-05T08:00:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'deployment',
    message: 'Server provisioned and SSH keys loaded',
    user: 'sysadmin_clara',
    team: 'Core Infra',
    changeReason: 'Initial baseline bootstrap',
    commitId: 'nginx-init-4f2a1',
    terraformApplyId: 'tf-apply-nginx-01',
    gitBranch: 'main',
    pullRequest: '#1',
    jiraTicket: 'INFRA-1001',
    environment: 'Production',
    details: 'Provisioned using Terraform v1.5.0 and AWS provider v5.0.0. Instantiated security groups allowing ports 22, 80, and 443.',
    category: 'provisioning',
    severity: 'healthy',
    editableNote: 'Initial setup of nginx server.'
  },
  {
    id: 'evt-02',
    timestamp: '2026-07-05T08:30:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'command',
    message: 'sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx',
    user: 'sysadmin_clara',
    team: 'Core Infra',
    changeReason: 'Install reverse proxy software',
    commitId: 'nginx-pkgs-7a2e2',
    gitBranch: 'main',
    environment: 'Production',
    details: 'Exit code: 0. Installed nginx package (v1.24.0) and certbot certificates tool.',
    commandExitCode: 0,
    category: 'software_install',
    severity: 'healthy'
  },
  {
    id: 'evt-03',
    timestamp: '2026-07-06T14:15:00Z',
    serverId: 'srv-02',
    serverName: 'srv-docker-host',
    type: 'config',
    message: 'Updated Docker daemon.json config and security policies',
    user: 'devops_alex',
    team: 'App SRE',
    changeReason: 'Setup system storage threshold limits and logging caps',
    commitId: 'docker-conf-810a2',
    gitBranch: 'main',
    environment: 'Production',
    details: 'Added live-restore: true, log-driver: json-file, log-opts: {max-size: 10m, max-file: 3}. Re-configured storage path to external mount.',
    category: 'docker',
    severity: 'healthy',
    editableNote: 'Prevent disk filling with runaway container stdout logs.'
  },
  {
    id: 'evt-04',
    timestamp: '2026-07-07T11:02:00Z',
    serverId: 'srv-03',
    serverName: 'srv-db-primary',
    type: 'deployment',
    message: 'Upgraded Linux Kernel to stable release 6.2.0-37-generic',
    user: 'sysadmin_clara',
    team: 'Core Infra',
    changeReason: 'SRE critical security patch update',
    commitId: 'kernel-patch-9a1b2',
    pullRequest: '#240',
    jiraTicket: 'SEC-9182',
    environment: 'Production',
    details: 'Kernel update executed via yum update. Re-compiled proprietary block storage drivers. System reboot scheduled.',
    category: 'kernel',
    severity: 'healthy',
    editableNote: 'Resolved multiple memory leaks in disk I/O buffers.'
  },
  {
    id: 'evt-05',
    timestamp: '2026-07-11T16:40:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'incident',
    message: 'Nginx connection pool exhaustion - HTTP 504 Gateway Timeout',
    user: 'monitoring_bot',
    team: 'N/A',
    environment: 'Production',
    details: 'Critical: Nginx worker connections threshold reached (768/768). Heavy traffic spike causing packet drop in upstream application servers.',
    category: 'nginx',
    severity: 'critical'
  },
  {
    id: 'evt-06',
    timestamp: '2026-07-11T16:55:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'command',
    message: 'sudo tail -n 100 /var/log/nginx/error.log',
    user: 'sre_sarah',
    team: 'On-Call Operations',
    environment: 'Production',
    details: 'Output: "768 worker_connections are not enough while connecting to upstream, client: 203.0.113.42, server: app.aimemory.internal"',
    commandExitCode: 0,
    category: 'logs_inspect',
    severity: 'warning'
  },
  {
    id: 'evt-07',
    timestamp: '2026-07-11T17:10:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'config',
    message: 'Modified /etc/nginx/nginx.conf worker_connections to 4096',
    user: 'sre_sarah',
    team: 'On-Call Operations',
    changeReason: 'Expand socket limit to support user rush',
    commitId: 'nginx-prod-9a18d12',
    gitBranch: 'main',
    pullRequest: '#248',
    jiraTicket: 'OPS-2101',
    environment: 'Production',
    details: 'Expanded worker_connections under events block. Set worker_rlimit_nofile 8192 in global configuration to support high socket file descriptors.',
    category: 'nginx',
    severity: 'warning'
  },
  {
    id: 'evt-08',
    timestamp: '2026-07-11T17:15:00Z',
    serverId: 'srv-01',
    serverName: 'srv-nginx-prod',
    type: 'fix',
    message: 'Nginx service reloaded - HTTP 504 resolved',
    user: 'sre_sarah',
    team: 'On-Call Operations',
    environment: 'Production',
    details: 'Ran: "sudo nginx -t && sudo systemctl reload nginx". Connections dropped to 240, active response time returned to normal (42ms). SRE incident marked resolved.',
    category: 'nginx',
    severity: 'healthy'
  },
  {
    id: 'evt-09',
    timestamp: '2026-07-12T04:22:00Z',
    serverId: 'srv-02',
    serverName: 'srv-docker-host',
    type: 'incident',
    message: 'Redis caching container crashed with OOM',
    user: 'monitoring_bot',
    team: 'N/A',
    environment: 'Production',
    details: 'Redis container (redis-cache) exited with code 137. Docker restart policy (always) trigger active. Container has restarted 14 times.',
    category: 'docker',
    severity: 'critical'
  },
  {
    id: 'evt-10',
    timestamp: '2026-07-12T05:00:00Z',
    serverId: 'srv-02',
    serverName: 'srv-docker-host',
    type: 'command',
    message: 'docker inspect redis-cache | grep OOMKilled',
    user: 'devops_alex',
    team: 'App SRE',
    environment: 'Production',
    details: 'Output: "OOMKilled": true. Confirmed system kernel killed Redis due to host memory constraints.',
    commandExitCode: 0,
    category: 'docker',
    severity: 'warning'
  },
  {
    id: 'evt-11',
    timestamp: '2026-07-12T05:15:00Z',
    serverId: 'srv-02',
    serverName: 'srv-docker-host',
    type: 'fix',
    message: 'Set memory limits on Redis cache and configured maxmemory policy',
    user: 'devops_alex',
    team: 'App SRE',
    changeReason: 'Enforce memory protection and eviction rules',
    commitId: 'redis-oom-281b1',
    gitBranch: 'main',
    pullRequest: '#242',
    environment: 'Production',
    details: 'Ran: "docker update --memory 1g --memory-swap 1g redis-cache". Modified redis.conf to set "maxmemory 800mb" and "maxmemory-policy allkeys-lru" to evict old records gracefully.',
    category: 'docker',
    severity: 'healthy'
  },
  {
    id: 'evt-12',
    timestamp: '2026-07-12T18:00:00Z',
    serverId: 'srv-03',
    serverName: 'srv-db-primary',
    type: 'incident',
    message: 'Postgres transactional log directory high disk usage warning',
    user: 'monitoring_bot',
    team: 'N/A',
    environment: 'Production',
    details: 'Alert: Disk usage at 92% on /var/lib/postgresql/data/pg_wal. Log replication is experiencing latency on secondary replicas.',
    category: 'mysql', // using generic db category
    severity: 'critical'
  }
];

export const INITIAL_CONTAINERS: DockerContainer[] = [
  {
    id: 'c-01',
    name: 'nginx-ingress',
    image: 'nginx:alpine',
    status: 'running',
    restarts: 0,
    created: '2026-07-06T15:00:00Z',
    ports: '80:80, 443:443',
    serverId: 'srv-02',
    cpu: 1.2,
    ram: 24
  },
  {
    id: 'c-02',
    name: 'redis-cache',
    image: 'redis:7.0-alpine',
    status: 'running',
    restarts: 14,
    created: '2026-07-06T15:10:00Z',
    ports: '6379:6379',
    serverId: 'srv-02',
    cpu: 8.5,
    ram: 912
  },
  {
    id: 'c-03',
    name: 'node-api-server',
    image: 'node:18-slim',
    status: 'running',
    restarts: 2,
    created: '2026-07-06T15:20:00Z',
    ports: '8080:8080',
    serverId: 'srv-02',
    cpu: 14.2,
    ram: 180
  },
  {
    id: 'c-04',
    name: 'postgres-replica',
    image: 'postgres:15',
    status: 'running',
    restarts: 0,
    created: '2026-07-06T15:30:00Z',
    ports: '5432:5432',
    serverId: 'srv-02',
    cpu: 4.8,
    ram: 340
  },
  {
    id: 'c-05',
    name: 'prometheus-collector',
    image: 'prom/prometheus:latest',
    status: 'exited',
    restarts: 5,
    created: '2026-07-08T09:00:00Z',
    ports: '9090:9090',
    serverId: 'srv-02',
    cpu: 0,
    ram: 0
  }
];

export const K8S_CLUSTER: KubernetesCluster = {
  id: 'k8s-prod-01',
  name: 'k8s-us-central-prod',
  status: 'active',
  version: 'v1.28.2',
  region: 'us-central1'
};

export const K8S_NODES: KubernetesNode[] = [
  { name: 'k8s-node-01', status: 'Ready', cpuAllocatable: '4.0 vCPU', ramAllocatable: '16.0 GB', role: 'worker,ingress' },
  { name: 'k8s-node-02', status: 'Ready', cpuAllocatable: '4.0 vCPU', ramAllocatable: '16.0 GB', role: 'worker' }
];

export const K8S_PODS: KubernetesPod[] = [
  { name: 'auth-service-6d5dfb88-abc12', namespace: 'core', status: 'Running', restarts: 0, age: '6d 12h', node: 'k8s-node-01', cpu: '85m', ram: '112Mi' },
  { name: 'payment-gateway-7ff54f-xyz98', namespace: 'core', status: 'Running', restarts: 1, age: '6d 12h', node: 'k8s-node-02', cpu: '140m', ram: '240Mi' },
  { name: 'user-profile-v2-54b9d-42jsh', namespace: 'core', status: 'Running', restarts: 0, age: '2d 4h', node: 'k8s-node-02', cpu: '45m', ram: '98Mi' },
  { name: 'frontend-portal-cbb9658-lkjh0', namespace: 'default', status: 'Running', restarts: 0, age: '14h', node: 'k8s-node-01', cpu: '210m', ram: '150Mi' },
  { name: 'elasticsearch-cluster-0', namespace: 'logging', status: 'Running', restarts: 3, age: '11d', node: 'k8s-node-02', cpu: '1200m', ram: '3.4Gi' },
  { name: 'kibana-dashboard-76fb97-mno11', namespace: 'logging', status: 'CrashLoopBackOff', restarts: 24, age: '1d 8h', node: 'k8s-node-01', cpu: '450m', ram: '512Mi' },
  { name: 'metrics-agent-asdf9', namespace: 'monitoring', status: 'Running', restarts: 0, age: '11d', node: 'k8s-node-01', cpu: '22m', ram: '45Mi' },
  { name: 'metrics-agent-qwer2', namespace: 'monitoring', status: 'Running', restarts: 0, age: '11d', node: 'k8s-node-02', cpu: '24m', ram: '48Mi' }
];

export const K8S_DEPLOYMENTS: KubernetesDeployment[] = [
  { name: 'auth-service', namespace: 'core', replicasDesired: 2, replicasAvailable: 2, status: 'Available' },
  { name: 'payment-gateway', namespace: 'core', replicasDesired: 2, replicasAvailable: 2, status: 'Available' },
  { name: 'frontend-portal', namespace: 'default', replicasDesired: 3, replicasAvailable: 3, status: 'Available' },
  { name: 'kibana-dashboard', namespace: 'logging', replicasDesired: 1, replicasAvailable: 0, status: 'Degraded' }
];

export const K8S_SERVICES: KubernetesService[] = [
  { name: 'auth-service-svc', namespace: 'core', type: 'ClusterIP', clusterIp: '10.96.104.22', externalIp: 'None', ports: '8080/TCP' },
  { name: 'payment-gateway-svc', namespace: 'core', type: 'ClusterIP', clusterIp: '10.96.104.91', externalIp: 'None', ports: '8081/TCP' },
  { name: 'frontend-portal-lb', namespace: 'default', type: 'LoadBalancer', clusterIp: '10.96.220.14', externalIp: '34.120.45.19', ports: '80:31080/TCP,443:31443/TCP' }
];

export const FAQ_ITEMS = [
  {
    q: 'How does AI Infrastructure Memory differ from standard monitoring tools?',
    a: 'Traditional monitoring tools (like Datadog, Prometheus, or Zabbix) show real-time metrics and alerts, but discard or silo chronological human and service action details. AI Infrastructure Memory acts as an "unbroken SRE brain". It tracks code deployments, kernel updates, Docker container parameters, terminal command sessions, and historic human edits. When an incident occurs, the AI references this deep history to find exact correlations.'
  },
  {
    q: 'Does it require installing agents on all of my Linux nodes?',
    a: 'No! You can connect servers via standard secure SSH tunneling, use our lightweight memory daemon, or import cluster configurations via your cloud providers. We support AWS EC2, DigitalOcean, GCP, bare metal, and managed Kubernetes.'
  },
  {
    q: 'Can it auto-detect security threats in unstructured application logs?',
    a: 'Absolutely. Using the advanced reasoning of Gemini models, the Log Analyzer acts as an on-call security expert. Just paste or upload your syslog, nginx access log, or docker container output. It identifies brute-force SSH attacks, core memory leaks, unhandled database locks, and lists the precise terminal commands to resolve them.'
  },
  {
    q: 'Are our credentials and server configuration keys safe?',
    a: 'Yes, absolutely. Connection parameters are encrypted in transit and in storage, and your LLM parameters run through safe server-side API proxy connections without exposing secret variables to the client side.'
  }
];

export const SAMPLE_LOGS_LIBRARY = [
  {
    name: 'Nginx connection timeouts',
    content: `2026-07-11 16:40:12 [error] 1422#1422: *23101 worker_connections are not enough while connecting to upstream, client: 198.51.100.72, server: app.aimemory.internal, request: "POST /api/v1/telemetry HTTP/1.1", upstream: "http://127.0.0.1:8080/api/v1/telemetry"
2026-07-11 16:40:14 [error] 1422#1422: *23102 worker_connections are not enough while connecting to upstream, client: 198.51.100.83, server: app.aimemory.internal, request: "GET /dashboard HTTP/1.1", upstream: "http://127.0.0.1:8080/dashboard"
2026-07-11 16:40:15 [warn] 1422#1422: *23105 768 connections reached maximum limit on interface eth0, throttling TCP packets`
  },
  {
    name: 'Docker Redis Container OOM-Killed',
    content: `2026-07-12 04:21:44.201 [SYSTEM] Container redis-cache (id: e31abf904) received SIGKILL
2026-07-12 04:21:44.205 [KERNEL] [184402.120391] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),cpuset=/,mems_allowed=0,oom_memcg=/docker/e31abf904,task_memcg=/docker/e31abf904,task=redis-server,pid=31991,uid=999
2026-07-12 04:21:44.210 [KERNEL] [184402.120443] Memory cgroup out of memory: Killed process 31991 (redis-server) total-vm:1432240kB, anon-rss:985024kB, file-rss:0kB, shmem-rss:0kB
2026-07-12 04:21:45.102 [DOCKER] Container e31abf904 exited with status code 137
2026-07-12 04:21:45.300 [DOCKER] Restarting container redis-cache under policy 'always'`
  },
  {
    name: 'Kubernetes Pod CrashLoopBackOff',
    content: `syslog: 2026-07-12 11:15:02.129 k8s-node-01 kubelet Error: V1.Pod.Spec.Containers{kibana-dashboard} failed liveness probe. HTTP probe to http://10.244.1.45:5601/api/status returned status code 503 Service Unavailable
syslog: 2026-07-12 11:15:10.432 kibana-dashboard FATAL Error: [config validation_exception]: "server.host" of "0.0.0.0" is unreachable. No interfaces configured.
syslog: 2026-07-12 11:15:11.100 k8s-node-01 kubelet Container kibana-dashboard exited with status 1
syslog: 2026-07-12 11:15:26.901 k8s-node-01 kubelet Back-off restarting failed container kibana-dashboard in pod kibana-dashboard-76fb97-mno11_logging(e131d-2101)`
  },
  {
    name: 'SSH Auth Brute-Force Attack',
    content: `Jul 12 14:02:10 srv-db-primary sshd[22912]: Invalid user admin from 185.220.101.42 port 54932 ssh2
Jul 12 14:02:11 srv-db-primary sshd[22912]: Connection closed by authenticating user admin 185.220.101.42 port 54932 [preauth]
Jul 12 14:02:14 srv-db-primary sshd[22915]: Invalid user admin from 185.220.101.42 port 55102 ssh2
Jul 12 14:02:15 srv-db-primary sshd[22915]: PAM 2 more authentication failures; logname= uid=0 euid=0 tty=ssh ruser= rhost=185.220.101.42  user=root
Jul 12 14:02:18 srv-db-primary sshd[22921]: Failed password for root from 185.220.101.42 port 55394 ssh2`
  }
];
