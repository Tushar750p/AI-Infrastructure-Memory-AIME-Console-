import React, { useState } from 'react';
import { Layers, Activity, AlertTriangle, ShieldCheck, Server, RefreshCw, Trash2, Cpu } from 'lucide-react';
import { K8S_CLUSTER, K8S_NODES, K8S_PODS, K8S_DEPLOYMENTS, K8S_SERVICES } from '../data/mockData';
import { KubernetesPod, MemoryEvent } from '../types';

interface K8sMonitoringProps {
  onAddMemoryEvent: (event: MemoryEvent) => void;
  operatorUsername?: string;
}

export default function K8sMonitoring({ onAddMemoryEvent, operatorUsername }: K8sMonitoringProps) {
  const [activeNamespace, setActiveNamespace] = useState('all');
  const [pods, setPods] = useState<KubernetesPod[]>(K8S_PODS);
  const [subTab, setSubTab] = useState<'pods' | 'nodes' | 'deployments' | 'services'>('pods');

  const namespaces = ['all', 'core', 'default', 'logging', 'monitoring'];

  // Filter pods
  const filteredPods = pods.filter(p => activeNamespace === 'all' || p.namespace === activeNamespace);

  // Simulate pod restart/deletion
  const handleDeletePod = (podName: string, namespace: string) => {
    // SRE trigger pod deletion. Kubernetes replica controller re-spawns pod immediately
    const shortRandomId = Math.random().toString(36).substring(2, 7);
    const splitName = podName.split('-');
    const baseName = splitName.slice(0, -1).join('-');
    const newPodName = `${baseName}-${shortRandomId}`;

    // Log command and Kubernetes activity to global memory logs
    const k8sEvent: MemoryEvent = {
      id: `evt-k8s-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverId: 'srv-04',
      serverName: 'srv-k8s-node-01',
      type: 'command',
      message: `kubectl delete pod ${podName} -n ${namespace}`,
      user: operatorUsername || 'devops_alex',
      details: `Deleted pod ${podName} in namespace ${namespace}. Kubernetes replicaset controller re-scheduled a replacement pod named ${newPodName} on node k8s-node-02.`,
      category: 'docker',
      severity: 'warning'
    };
    onAddMemoryEvent(k8sEvent);

    // Update state - filter out the deleted pod and add a new running pod
    setPods(prev => {
      const updated = prev.filter(p => p.name !== podName);
      const newPod: KubernetesPod = {
        name: newPodName,
        namespace: namespace,
        status: 'Running',
        restarts: 0,
        age: '1s',
        node: 'k8s-node-02',
        cpu: '15m',
        ram: '64Mi'
      };
      return [...updated, newPod];
    });
  };

  return (
    <div className="space-y-6">
      {/* Cluster Banner */}
      <div className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-950 to-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Kubernetes Master Node Connected</span>
          <h2 className="text-lg font-bold text-white mt-1">Cluster: {K8S_CLUSTER.name}</h2>
          <p className="text-xs text-slate-400 font-mono">Status: ACTIVE • Version: {K8S_CLUSTER.version} • Location: {K8S_CLUSTER.region}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 flex items-center gap-1.5 uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Control plane stable
          </span>
        </div>
      </div>

      {/* Explorer Tabs & Namespace selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        {/* sub tabs */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-900 text-xs font-mono">
          <button
            onClick={() => setSubTab('pods')}
            className={`px-4 py-2 rounded-md transition-all ${subTab === 'pods' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            PODS
          </button>
          <button
            onClick={() => setSubTab('nodes')}
            className={`px-4 py-2 rounded-md transition-all ${subTab === 'nodes' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            NODES
          </button>
          <button
            onClick={() => setSubTab('deployments')}
            className={`px-4 py-2 rounded-md transition-all ${subTab === 'deployments' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            DEPLOYMENTS
          </button>
          <button
            onClick={() => setSubTab('services')}
            className={`px-4 py-2 rounded-md transition-all ${subTab === 'services' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            SERVICES
          </button>
        </div>

        {/* Namespace filter (only showing for pods, deployments, services) */}
        {subTab !== 'nodes' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-500 uppercase">Namespace:</label>
            <div className="flex gap-1 flex-wrap">
              {namespaces.map((ns) => (
                <button
                  key={ns}
                  id={`k8s-ns-btn-${ns}`}
                  onClick={() => setActiveNamespace(ns)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                    activeNamespace === ns 
                      ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400 font-bold' 
                      : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ns.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected explorer detail */}
      <div className="rounded-xl border border-slate-900 bg-slate-950 overflow-hidden">
        {/* PODS tab */}
        {subTab === 'pods' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase bg-slate-950">
                  <th className="p-4">Pod Name</th>
                  <th className="p-4">Namespace</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Restarts</th>
                  <th className="p-4">Node Scheduler</th>
                  <th className="p-4 text-right">CPU</th>
                  <th className="p-4 text-right">RAM</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPods.map((pod) => {
                  let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (pod.status === 'Failed' || pod.status === 'CrashLoopBackOff') {
                    statusBadge = 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse';
                  } else if (pod.status === 'Pending') {
                    statusBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  }

                  return (
                    <tr key={pod.name} className="border-b border-slate-900/50 hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-200">{pod.name}</td>
                      <td className="p-4 font-mono text-slate-400">{pod.namespace}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${statusBadge}`}>
                          {pod.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-300">{pod.restarts}</td>
                      <td className="p-4 font-mono text-slate-400">{pod.node}</td>
                      <td className="p-4 text-right font-mono text-slate-300">{pod.cpu}</td>
                      <td className="p-4 text-right font-mono text-slate-300">{pod.ram}</td>
                      <td className="p-4 text-right">
                        <button
                          id={`btn-delete-pod-${pod.name}`}
                          onClick={() => handleDeletePod(pod.name, pod.namespace)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
                          title="Simulate container kill (Kubernetes re-schedules immediately)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* NODES tab */}
        {subTab === 'nodes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase bg-slate-950">
                  <th className="p-4">Node Node-Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Node Roles</th>
                  <th className="p-4">Cpu Capacity</th>
                  <th className="p-4 text-right">RAM Allocatable</th>
                </tr>
              </thead>
              <tbody>
                {K8S_NODES.map((node) => (
                  <tr key={node.name} className="border-b border-slate-900/50 hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-200 flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      {node.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {node.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{node.role}</td>
                    <td className="p-4 font-mono text-slate-300">{node.cpuAllocatable}</td>
                    <td className="p-4 text-right font-mono text-slate-300">{node.ramAllocatable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DEDEPLOYMENTS tab */}
        {subTab === 'deployments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase bg-slate-950">
                  <th className="p-4">Deployment Name</th>
                  <th className="p-4">Namespace</th>
                  <th className="p-4">Replicas status</th>
                  <th className="p-4">Status condition</th>
                </tr>
              </thead>
              <tbody>
                {K8S_DEPLOYMENTS.filter(d => activeNamespace === 'all' || d.namespace === activeNamespace).map((dep) => {
                  let badge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (dep.status === 'Degraded') badge = 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse';

                  return (
                    <tr key={dep.name} className="border-b border-slate-900/50 hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-200">{dep.name}</td>
                      <td className="p-4 font-mono text-slate-400">{dep.namespace}</td>
                      <td className="p-4 font-mono text-slate-300">{dep.replicasAvailable}/{dep.replicasDesired} Ready</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${badge}`}>
                          {dep.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SERVICES tab */}
        {subTab === 'services' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-mono uppercase bg-slate-950">
                  <th className="p-4">Service</th>
                  <th className="p-4">Namespace</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Cluster IP</th>
                  <th className="p-4">External IP</th>
                  <th className="p-4 text-right">Target Ports</th>
                </tr>
              </thead>
              <tbody>
                {K8S_SERVICES.filter(s => activeNamespace === 'all' || s.namespace === activeNamespace).map((svc) => (
                  <tr key={svc.name} className="border-b border-slate-900/50 hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-200">{svc.name}</td>
                    <td className="p-4 font-mono text-slate-400">{svc.namespace}</td>
                    <td className="p-4 font-mono text-slate-300">{svc.type}</td>
                    <td className="p-4 font-mono text-slate-400">{svc.clusterIp}</td>
                    <td className="p-4 font-mono text-slate-300">{svc.externalIp}</td>
                    <td className="p-4 text-right font-mono text-slate-300">{svc.ports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation logic note block */}
      <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-left">
        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block mb-1">💡 SRE Interactive TIP:</span>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Kubernetes guarantees high availability via continuous loops. Try clicking the <Trash2 className="w-3 h-3 inline text-red-400" /> delete icon next to any running pod (e.g., in the <code>logging</code> namespace). The replacement pod is instantiated on a separate node automatically, and the incident history is permanently cataloged in the timeline!
        </p>
      </div>
    </div>
  );
}
