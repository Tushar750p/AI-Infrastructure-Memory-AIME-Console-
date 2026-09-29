# AI Infrastructure Management Platform & Memory Engine

A full-stack, enterprise-grade cloud infrastructure monitoring and AI Memory Engine application. Built with React 19, TypeScript, Tailwind CSS, Express, and Firebase / Cloud integrations.

## 🚀 Key Features

- **AI Memory Engine**: Contextual memory capture, incident resolution timeline, semantic retrieval, and runbook suggestions for devops incidents.
- **Server & Node Monitoring**: Real-time telemetry, CPU, Memory, Disk, and Network stats across hybrid infrastructure.
- **Docker & Container Management**: Real-time status, logs, start/stop/restart container controls via Dockerode.
- **Kubernetes (K8s) Cluster Overview**: Pod status, namespace segregation, event logging, and cluster health via `@kubernetes/client-node`.
- **AWS Cloud Integration**: Multi-service monitoring across EC2, RDS, EKS, S3, CloudWatch, and CloudTrail.
- **SSH Terminal & Remote Execution**: Direct interactive terminal emulator and secure SSH connection manager (`ssh2`).
- **Incident Management & Alerts**: Automated threshold alerting, incident lifecycle tracking, and historical audit logs.
- **Enterprise Authentication & RBAC**: JWT and cookie-based authentication with role-based access control (Admin, DevOps, Viewer).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide React, Motion, Recharts
- **Backend**: Node.js, Express, TypeScript (TSX)
- **Database & Storage**: Firebase Firestore / Fallback Local Store
- **Cloud & DevOps SDKs**: AWS SDK v3, Kubernetes Client, Dockerode, SSH2
- **Testing**: Node test suite with TSX (`tests/`)

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js >= 18.x
- npm or bun

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and fill in any required variables:
```bash
cp .env.example .env
```

### 4. Running the Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 5. Running Tests
```bash
npm test
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## 📂 Project Structure

```
├── backend/                  # Server-side business logic and cloud integrations
├── src/                      # React frontend application
│   ├── components/           # UI components, dashboards, modals, terminal
│   ├── db/                   # Firestore and local fallback database layer
│   └── context/              # React context providers
├── tests/                    # Integration and unit tests
├── server.ts                 # Full-stack Express server entry point
├── docker-compose.yml        # Multi-container orchestration config
├── Dockerfile                # Production containerization
└── vite.config.ts            # Vite build configuration
```

---

## 📄 License
MIT License
