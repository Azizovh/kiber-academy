/*
 * kubectl for the terminal: a small cluster (namespaces, nodes, pods, deployments, services, secrets, config maps,
 * service accounts, RBAC, network policies, events) that labs describe, with the output formats people use:
 * tables, -o wide, -o yaml/json, -o jsonpath, describe, logs, exec, top, auth can-i, apply -f, delete, scale.
 */
import { getNode, resolvePath, type FsSpec } from './fs';
import { createShell, execLine, fail, ok, type CmdResult, type Command, type ShellState } from './shell';
import { jsonPath, TemplateError } from './templates';
import { parseYamlDocs, toYaml, YamlError, type YamlValue } from './yaml';

export interface KContainer {
  name: string;
  image: string;
  command?: string[];
  ports?: number[];
  env?: { name: string; value?: string; secret?: { name: string; key: string } }[];
  securityContext?: { privileged?: boolean; runAsUser?: number; runAsNonRoot?: boolean; allowPrivilegeEscalation?: boolean; readOnlyRootFilesystem?: boolean; capabilities?: { add?: string[]; drop?: string[] } };
  resources?: { limits?: { cpu?: string; memory?: string }; requests?: { cpu?: string; memory?: string } };
  volumeMounts?: { name: string; mountPath: string; readOnly?: boolean }[];
}

export interface KPod {
  name: string;
  ns: string;
  labels?: Record<string, string>;
  owner?: { kind: 'ReplicaSet' | 'DaemonSet' | 'Job' | 'StatefulSet'; name: string };
  node: string;
  ip: string;
  status: 'Running' | 'Pending' | 'CrashLoopBackOff' | 'Completed' | 'Error' | 'ImagePullBackOff';
  restarts?: number;
  created: number;
  serviceAccount?: string;
  containers: KContainer[];
  volumes?: { name: string; hostPath?: string; secret?: string; configMap?: string; emptyDir?: boolean }[];
  hostNetwork?: boolean;
  hostPID?: boolean;
  logs?: Record<string, string>;
  /** kubectl top: millicores and MiB. */
  cpu?: number;
  mem?: number;
  fs?: FsSpec;
  procs?: { pid: number; user: string; cmd: string; cpu?: number }[];
}

export interface KDeployment {
  name: string;
  ns: string;
  replicas: number;
  labels?: Record<string, string>;
  created: number;
  image: string;
}

export interface KService {
  name: string;
  ns: string;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  clusterIP: string;
  externalIP?: string;
  ports: string;
  selector?: Record<string, string>;
  created: number;
}

export interface KRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface KSubject {
  kind: 'ServiceAccount' | 'User' | 'Group';
  name: string;
  namespace?: string;
}

export interface K8sSpec {
  now?: number;
  context?: string;
  user?: string;
  namespaces: string[];
  nodes: { name: string; roles: string; version: string; cpu?: number; mem?: number; unschedulable?: boolean; created: number }[];
  pods: KPod[];
  deployments?: KDeployment[];
  services?: KService[];
  secrets?: { name: string; ns: string; type?: string; data: Record<string, string>; created: number }[];
  configmaps?: { name: string; ns: string; data: Record<string, string>; created: number }[];
  serviceAccounts?: { name: string; ns: string; created: number }[];
  roles?: { name: string; ns: string; rules: KRule[]; created: number }[];
  clusterRoles?: { name: string; rules: KRule[]; created: number }[];
  roleBindings?: { name: string; ns: string; roleRef: { kind: 'Role' | 'ClusterRole'; name: string }; subjects: KSubject[]; created: number }[];
  clusterRoleBindings?: { name: string; roleRef: { kind: 'ClusterRole'; name: string }; subjects: KSubject[]; created: number }[];
  networkPolicies?: { name: string; ns: string; podSelector: Record<string, string>; policyTypes: string[]; created: number; spec?: YamlValue }[];
  events?: { ns: string; type: 'Normal' | 'Warning'; reason: string; object: string; message: string; time: number }[];
}

export type K8sState = Required<K8sSpec> & { shells: Map<string, ShellState> };

export const K8S_NOW = Date.UTC(2026, 10, 18, 9, 0, 0);

export function createK8s(spec: K8sSpec): K8sState {
  const c = JSON.parse(JSON.stringify(spec)) as K8sSpec;
  return {
    now: c.now ?? K8S_NOW,
    context: c.context ?? 'kubernetes-admin@prod',
    user: c.user ?? 'kubernetes-admin',
    namespaces: c.namespaces,
    nodes: c.nodes,
    pods: c.pods,
    deployments: c.deployments ?? [],
    services: c.services ?? [],
    secrets: c.secrets ?? [],
    configmaps: c.configmaps ?? [],
    serviceAccounts: c.serviceAccounts ?? [],
    roles: c.roles ?? [],
    clusterRoles: c.clusterRoles ?? [],
    roleBindings: c.roleBindings ?? [],
    clusterRoleBindings: c.clusterRoleBindings ?? [],
    networkPolicies: c.networkPolicies ?? [],
    events: c.events ?? [],
    shells: new Map(),
  };
}

/* ── helpers ── */

function age(now: number, t: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 120) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 && h < 10 ? `${h}h${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return d < 8 && h % 24 ? `${d}d${h % 24}h` : `${d}d`;
}

function table(rows: string[][]): string {
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
  return rows.map((r) => r.map((cell, i) => (i === r.length - 1 ? cell : cell.padEnd(widths[i]! + 3))).join('').trimEnd()).join('\n');
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

const ALIASES: Record<string, string> = {
  po: 'pods', pod: 'pods', pods: 'pods',
  deploy: 'deployments', deployment: 'deployments', deployments: 'deployments',
  svc: 'services', service: 'services', services: 'services',
  secret: 'secrets', secrets: 'secrets',
  cm: 'configmaps', configmap: 'configmaps', configmaps: 'configmaps',
  sa: 'serviceaccounts', serviceaccount: 'serviceaccounts', serviceaccounts: 'serviceaccounts',
  ns: 'namespaces', namespace: 'namespaces', namespaces: 'namespaces',
  no: 'nodes', node: 'nodes', nodes: 'nodes',
  role: 'roles', roles: 'roles',
  clusterrole: 'clusterroles', clusterroles: 'clusterroles',
  rolebinding: 'rolebindings', rolebindings: 'rolebindings',
  clusterrolebinding: 'clusterrolebindings', clusterrolebindings: 'clusterrolebindings',
  netpol: 'networkpolicies', networkpolicy: 'networkpolicies', networkpolicies: 'networkpolicies',
  ev: 'events', event: 'events', events: 'events',
};

const KIND: Record<string, string> = {
  pods: 'Pod', deployments: 'Deployment', services: 'Service', secrets: 'Secret', configmaps: 'ConfigMap', serviceaccounts: 'ServiceAccount',
  namespaces: 'Namespace', nodes: 'Node', roles: 'Role', clusterroles: 'ClusterRole', rolebindings: 'RoleBinding', clusterrolebindings: 'ClusterRoleBinding',
  networkpolicies: 'NetworkPolicy', events: 'Event',
};

const GROUP: Record<string, string> = { deployments: 'apps', roles: 'rbac.authorization.k8s.io', clusterroles: 'rbac.authorization.k8s.io', rolebindings: 'rbac.authorization.k8s.io', clusterrolebindings: 'rbac.authorization.k8s.io', networkpolicies: 'networking.k8s.io' };

const CLUSTER_SCOPED = new Set(['namespaces', 'nodes', 'clusterroles', 'clusterrolebindings']);

function parseArgs(args: string[]) {
  const opts: Record<string, string> = {};
  const flags = new Set<string>();
  const rest: string[] = [];
  let dashdash: string[] | null = null;
  const valueOpts = ['-n', '--namespace', '-o', '--output', '-l', '--selector', '-c', '--container', '--tail', '--as', '--replicas', '-f', '--filename', '--sort-by', '--field-selector'];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') {
      dashdash = args.slice(i + 1);
      break;
    }
    const eq = /^(--?[\w-]+)=(.*)$/.exec(a);
    if (eq) opts[eq[1]!] = eq[2]!;
    else if (valueOpts.includes(a)) opts[a] = args[++i] ?? '';
    else if (a.startsWith('-')) flags.add(a);
    else rest.push(a);
  }
  const ns = opts['-n'] ?? opts['--namespace'] ?? 'default';
  return { opts, flags, rest, dashdash, ns, all: flags.has('-A') || flags.has('--all-namespaces'), output: opts['-o'] ?? opts['--output'], selector: opts['-l'] ?? opts['--selector'] };
}

function matchSelector(labels: Record<string, string> | undefined, selector: string | undefined): boolean {
  if (!selector) return true;
  return selector.split(',').every((term) => {
    const m = /^([\w./-]+)\s*(!=|==|=)\s*([\w./-]*)$/.exec(term.trim());
    if (!m) return !!labels && term.trim() in labels;
    const v = labels?.[m[1]!];
    return m[2] === '!=' ? v !== m[3] : v === m[3];
  });
}

const podReady = (p: KPod) => `${p.status === 'Running' ? p.containers.length : 0}/${p.containers.length}`;

/* ── object documents (for -o yaml/json/jsonpath) ── */

function meta(name: string, ns: string | null, created: number, labels?: Record<string, string>): Record<string, YamlValue> {
  return { name, ...(ns ? { namespace: ns } : {}), creationTimestamp: new Date(created).toISOString().replace('.000', ''), ...(labels && Object.keys(labels).length ? { labels } : {}) };
}

function podDoc(k: K8sState, p: KPod): Record<string, YamlValue> {
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { ...meta(p.name, p.ns, p.created, p.labels), ...(p.owner ? { ownerReferences: [{ kind: p.owner.kind, name: p.owner.name }] } : {}) },
    spec: ({
      serviceAccountName: p.serviceAccount ?? 'default',
      nodeName: p.node,
      ...(p.hostNetwork ? { hostNetwork: true } : {}),
      ...(p.hostPID ? { hostPID: true } : {}),
      containers: p.containers.map((c) => ({
        name: c.name,
        image: c.image,
        ...(c.command ? { command: c.command } : {}),
        ...(c.ports ? { ports: c.ports.map((n) => ({ containerPort: n })) } : {}),
        ...(c.env ? { env: c.env.map((e) => (e.secret ? { name: e.name, valueFrom: { secretKeyRef: { name: e.secret.name, key: e.secret.key } } } : { name: e.name, value: e.value ?? '' })) } : {}),
        ...(c.resources ? { resources: c.resources as YamlValue } : {}),
        ...(c.securityContext ? { securityContext: c.securityContext as YamlValue } : {}),
        ...(c.volumeMounts ? { volumeMounts: c.volumeMounts as unknown as YamlValue } : {}),
      })),
      ...(p.volumes ? { volumes: p.volumes.map((v) => ({ name: v.name, ...(v.hostPath ? { hostPath: { path: v.hostPath } } : {}), ...(v.secret ? { secret: { secretName: v.secret } } : {}), ...(v.configMap ? { configMap: { name: v.configMap } } : {}), ...(v.emptyDir ? { emptyDir: {} } : {}) })) } : {}),
    } as unknown as YamlValue),
    status: { phase: p.status === 'CrashLoopBackOff' || p.status === 'Error' || p.status === 'ImagePullBackOff' ? 'Running' : p.status === 'Completed' ? 'Succeeded' : p.status, podIP: p.ip, hostIP: k.nodes.find((n) => n.name === p.node) ? `10.0.1.${10 + k.nodes.findIndex((n) => n.name === p.node)}` : '', containerStatuses: p.containers.map((c) => ({ name: c.name, image: c.image, ready: p.status === 'Running', restartCount: p.restarts ?? 0 })) },
  };
}

function docsFor(k: K8sState, res: string, ns: string, all: boolean): { name: string; ns: string | null; doc: Record<string, YamlValue>; labels?: Record<string, string> }[] {
  const inNs = (x: { ns: string }) => all || x.ns === ns;
  const apiVersion = (r: string) => (GROUP[r] ? `${GROUP[r]}/v1` : 'v1');
  switch (res) {
    case 'pods':
      return k.pods.filter(inNs).map((p) => ({ name: p.name, ns: p.ns, labels: p.labels, doc: podDoc(k, p) }));
    case 'deployments':
      return k.deployments.filter(inNs).map((d) => ({ name: d.name, ns: d.ns, labels: d.labels, doc: { apiVersion: 'apps/v1', kind: 'Deployment', metadata: meta(d.name, d.ns, d.created, d.labels), spec: { replicas: d.replicas, template: { spec: { containers: [{ name: d.name, image: d.image }] } } } } }));
    case 'services':
      return k.services.filter(inNs).map((s) => ({ name: s.name, ns: s.ns, doc: { apiVersion: 'v1', kind: 'Service', metadata: meta(s.name, s.ns, s.created), spec: { type: s.type, clusterIP: s.clusterIP, ...(s.selector ? { selector: s.selector } : {}), ports: s.ports } } }));
    case 'secrets':
      return k.secrets.filter(inNs).map((s) => ({ name: s.name, ns: s.ns, doc: { apiVersion: 'v1', kind: 'Secret', metadata: meta(s.name, s.ns, s.created), type: s.type ?? 'Opaque', data: Object.fromEntries(Object.entries(s.data).map(([key, v]) => [key, b64(v)])) } }));
    case 'configmaps':
      return k.configmaps.filter(inNs).map((c) => ({ name: c.name, ns: c.ns, doc: { apiVersion: 'v1', kind: 'ConfigMap', metadata: meta(c.name, c.ns, c.created), data: c.data } }));
    case 'serviceaccounts':
      return k.serviceAccounts.filter(inNs).map((s) => ({ name: s.name, ns: s.ns, doc: { apiVersion: 'v1', kind: 'ServiceAccount', metadata: meta(s.name, s.ns, s.created) } }));
    case 'namespaces':
      return k.namespaces.map((n) => ({ name: n, ns: null, doc: { apiVersion: 'v1', kind: 'Namespace', metadata: meta(n, null, Date.UTC(2026, 0, 12)), status: { phase: 'Active' } } }));
    case 'nodes':
      return k.nodes.map((n) => ({ name: n.name, ns: null, doc: { apiVersion: 'v1', kind: 'Node', metadata: meta(n.name, null, n.created), spec: (n.unschedulable ? { unschedulable: true } : {}) as YamlValue, status: { nodeInfo: { kubeletVersion: n.version } } } }));
    case 'roles':
      return k.roles.filter(inNs).map((r) => ({ name: r.name, ns: r.ns, doc: { apiVersion: apiVersion(res), kind: 'Role', metadata: meta(r.name, r.ns, r.created), rules: r.rules as unknown as YamlValue } }));
    case 'clusterroles':
      return k.clusterRoles.map((r) => ({ name: r.name, ns: null, doc: { apiVersion: apiVersion(res), kind: 'ClusterRole', metadata: meta(r.name, null, r.created), rules: r.rules as unknown as YamlValue } }));
    case 'rolebindings':
      return k.roleBindings.filter(inNs).map((b) => ({ name: b.name, ns: b.ns, doc: { apiVersion: apiVersion(res), kind: 'RoleBinding', metadata: meta(b.name, b.ns, b.created), roleRef: { apiGroup: 'rbac.authorization.k8s.io', ...b.roleRef }, subjects: b.subjects as unknown as YamlValue } }));
    case 'clusterrolebindings':
      return k.clusterRoleBindings.map((b) => ({ name: b.name, ns: null, doc: { apiVersion: apiVersion(res), kind: 'ClusterRoleBinding', metadata: meta(b.name, null, b.created), roleRef: { apiGroup: 'rbac.authorization.k8s.io', ...b.roleRef }, subjects: b.subjects as unknown as YamlValue } }));
    case 'networkpolicies':
      return k.networkPolicies.filter(inNs).map((p) => ({ name: p.name, ns: p.ns, doc: { apiVersion: apiVersion(res), kind: 'NetworkPolicy', metadata: meta(p.name, p.ns, p.created), spec: p.spec ?? { podSelector: { matchLabels: p.podSelector }, policyTypes: p.policyTypes } } }));
    case 'events':
      return k.events.filter(inNs).map((e, i) => ({ name: `${e.object.split('/')[1] ?? e.object}.${(i + 1).toString(16)}`, ns: e.ns, doc: { apiVersion: 'v1', kind: 'Event', metadata: meta(`${e.object}.${i}`, e.ns, e.time), type: e.type, reason: e.reason, message: e.message, involvedObject: { kind: e.object.split('/')[0]!, name: e.object.split('/')[1] ?? '' } } }));
  }
  return [];
}

/* ── tables ── */

function tableFor(k: K8sState, res: string, ns: string, all: boolean, wide: boolean, selector: string | undefined, names: string[], showLabels: boolean): string[][] | null {
  const pick = <T extends { name: string }>(list: T[]) => (names.length ? list.filter((x) => names.includes(x.name)) : list);
  const nsCol = (x: { ns: string }) => (all ? [x.ns] : []);
  const head = (cols: string[]) => [...(all && !CLUSTER_SCOPED.has(res) ? ['NAMESPACE'] : []), ...cols, ...(showLabels ? ['LABELS'] : [])];
  const labelsCol = (l?: Record<string, string>) => (showLabels ? [l && Object.keys(l).length ? Object.entries(l).map(([a, b]) => `${a}=${b}`).join(',') : '<none>'] : []);
  const inNs = <T extends { ns: string }>(list: T[]) => list.filter((x) => all || x.ns === ns);
  switch (res) {
    case 'pods': {
      const list = pick(inNs(k.pods)).filter((p) => matchSelector(p.labels, selector));
      return [
        head(['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE', ...(wide ? ['IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : [])]),
        ...list.map((p) => [...nsCol(p), p.name, podReady(p), p.status, String(p.restarts ?? 0), age(k.now, p.created), ...(wide ? [p.ip, p.node, '<none>', '<none>'] : []), ...labelsCol(p.labels)]),
      ];
    }
    case 'deployments': {
      const list = pick(inNs(k.deployments)).filter((d) => matchSelector(d.labels, selector));
      return [
        head(['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE', ...(wide ? ['CONTAINERS', 'IMAGES'] : [])]),
        ...list.map((d) => {
          const running = k.pods.filter((p) => p.ns === d.ns && p.owner?.name.startsWith(d.name + '-') && p.status === 'Running').length;
          return [...nsCol(d), d.name, `${running}/${d.replicas}`, String(d.replicas), String(running), age(k.now, d.created), ...(wide ? [d.name, d.image] : []), ...labelsCol(d.labels)];
        }),
      ];
    }
    case 'services': {
      const list = pick(inNs(k.services));
      return [head(['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE', ...(wide ? ['SELECTOR'] : [])]), ...list.map((s) => [...nsCol(s), s.name, s.type, s.clusterIP, s.externalIP ?? '<none>', s.ports, age(k.now, s.created), ...(wide ? [s.selector ? Object.entries(s.selector).map(([a, b]) => `${a}=${b}`).join(',') : '<none>'] : [])])];
    }
    case 'secrets':
      return [head(['NAME', 'TYPE', 'DATA', 'AGE']), ...pick(inNs(k.secrets)).map((s) => [...nsCol(s), s.name, s.type ?? 'Opaque', String(Object.keys(s.data).length), age(k.now, s.created)])];
    case 'configmaps':
      return [head(['NAME', 'DATA', 'AGE']), ...pick(inNs(k.configmaps)).map((c) => [...nsCol(c), c.name, String(Object.keys(c.data).length), age(k.now, c.created)])];
    case 'serviceaccounts':
      return [head(['NAME', 'SECRETS', 'AGE']), ...pick(inNs(k.serviceAccounts)).map((s) => [...nsCol(s), s.name, '0', age(k.now, s.created)])];
    case 'namespaces':
      return [['NAME', 'STATUS', 'AGE'], ...k.namespaces.filter((n) => !names.length || names.includes(n)).map((n) => [n, 'Active', age(k.now, Date.UTC(2026, 0, 12))])];
    case 'nodes':
      return [
        ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION', ...(wide ? ['INTERNAL-IP'] : [])],
        ...pick(k.nodes).map((n, i) => [n.name, n.unschedulable ? 'Ready,SchedulingDisabled' : 'Ready', n.roles, age(k.now, n.created), n.version, ...(wide ? [`10.0.1.${10 + i}`] : [])]),
      ];
    case 'roles':
      return [head(['NAME', 'CREATED AT']), ...pick(inNs(k.roles)).map((r) => [...nsCol(r), r.name, new Date(r.created).toISOString().replace('.000', '')])];
    case 'clusterroles':
      return [['NAME', 'CREATED AT'], ...pick(k.clusterRoles).map((r) => [r.name, new Date(r.created).toISOString().replace('.000', '')])];
    case 'rolebindings':
    case 'clusterrolebindings': {
      const list = res === 'rolebindings' ? pick(inNs(k.roleBindings)) : pick(k.clusterRoleBindings as (typeof k.clusterRoleBindings[number] & { ns?: string })[]);
      const subj = (b: { subjects: KSubject[] }, kind: string) => b.subjects.filter((s) => s.kind === kind).map((s) => (s.namespace ? `${s.namespace}/${s.name}` : s.name)).join(', ');
      return [
        head(['NAME', 'ROLE', 'AGE', ...(wide ? ['USERS', 'GROUPS', 'SERVICEACCOUNTS'] : [])]),
        ...list.map((b) => [...(res === 'rolebindings' ? nsCol(b as { ns: string }) : []), b.name, `${b.roleRef.kind}/${b.roleRef.name}`, age(k.now, b.created), ...(wide ? [subj(b, 'User'), subj(b, 'Group'), subj(b, 'ServiceAccount')] : [])]),
      ];
    }
    case 'networkpolicies':
      return [head(['NAME', 'POD-SELECTOR', 'AGE']), ...pick(inNs(k.networkPolicies)).map((p) => [...nsCol(p), p.name, Object.entries(p.podSelector).map(([a, b]) => `${a}=${b}`).join(',') || '<none>', age(k.now, p.created)])];
    case 'events': {
      const list = inNs(k.events).sort((a, b) => a.time - b.time);
      return [head(['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']), ...list.map((e) => [...nsCol(e), age(k.now, e.time), e.type, e.reason, e.object, e.message])];
    }
  }
  return null;
}

/* ── RBAC ── */

function rulesFor(k: K8sState, subject: { kind: string; name: string; namespace?: string }, ns: string): KRule[] {
  const matches = (s: KSubject) => s.kind === subject.kind && s.name === subject.name && (s.kind !== 'ServiceAccount' || s.namespace === subject.namespace);
  const out: KRule[] = [];
  const roleRules = (kind: string, name: string, roleNs?: string) =>
    kind === 'ClusterRole' ? k.clusterRoles.find((r) => r.name === name)?.rules ?? [] : k.roles.find((r) => r.name === name && r.ns === roleNs)?.rules ?? [];
  for (const b of k.clusterRoleBindings) if (b.subjects.some(matches)) out.push(...roleRules(b.roleRef.kind, b.roleRef.name));
  for (const b of k.roleBindings) if (b.ns === ns && b.subjects.some(matches)) out.push(...roleRules(b.roleRef.kind, b.roleRef.name, b.ns));
  return out;
}

function can(rules: KRule[], verb: string, resource: string, sub?: string): boolean {
  const res = sub ? `${resource}/${sub}` : resource;
  return rules.some((r) => (r.verbs.includes('*') || r.verbs.includes(verb)) && (r.resources.includes('*') || r.resources.includes(res)));
}

function subjectOf(k: K8sState, as: string | undefined): { kind: string; name: string; namespace?: string } {
  const who = as ?? k.user;
  const sa = /^system:serviceaccount:([^:]+):(.+)$/.exec(who);
  return sa ? { kind: 'ServiceAccount', name: sa[2]!, namespace: sa[1]! } : { kind: 'User', name: who };
}

/* ── pod shells for exec ── */

function podShell(k: K8sState, p: KPod): ShellState {
  const key = `${p.ns}/${p.name}`;
  let s = k.shells.get(key);
  if (!s) {
    const c = p.containers[0]!;
    const user = c.securityContext?.runAsUser && c.securityContext.runAsUser !== 0 ? `uid${c.securityContext.runAsUser}` : 'root';
    s = createShell({
      fs: p.fs ?? { etc: { hostname: p.name + '\n' }, tmp: {} },
      user,
      host: p.name,
      cwd: '/',
      system: { procs: (p.procs ?? [{ pid: 1, user, cmd: (c.command ?? [c.image]).join(' ') }]).map((x) => ({ pid: x.pid, ppid: x.pid === 1 ? 0 : 1, user: x.user, cmd: x.cmd, cpu: x.cpu })) },
    });
    for (const e of c.env ?? []) {
      const val = e.secret ? k.secrets.find((sec) => sec.name === e.secret!.name && sec.ns === p.ns)?.data[e.secret.key] : e.value;
      if (val !== undefined) s.vars[e.name] = val;
    }
    s.vars.KUBERNETES_SERVICE_HOST = '10.96.0.1';
    k.shells.set(key, s);
  }
  return s;
}

/* ── describe ── */

function describePod(k: K8sState, p: KPod): string {
  const pad = (label: string, v: string, ind = 0) => `${' '.repeat(ind)}${(label + ':').padEnd(Math.max(18 - ind, label.length + 2))}${v}`;
  const lines = [
    pad('Name', p.name),
    pad('Namespace', p.ns),
    pad('Service Account', p.serviceAccount ?? 'default'),
    pad('Node', `${p.node}/10.0.1.${10 + Math.max(0, k.nodes.findIndex((n) => n.name === p.node))}`),
    pad('Start Time', new Date(p.created).toUTCString().replace('GMT', '+0000')),
    pad('Labels', p.labels ? Object.entries(p.labels).map(([a, b]) => `${a}=${b}`).join('\n' + ' '.repeat(18)) : '<none>'),
    pad('Status', p.status === 'Completed' ? 'Succeeded' : p.status === 'Pending' ? 'Pending' : 'Running'),
    pad('IP', p.ip),
    ...(p.owner ? [pad('Controlled By', `${p.owner.kind}/${p.owner.name}`)] : []),
    ...(p.hostNetwork ? [pad('Host Network', 'true')] : []),
    'Containers:',
  ];
  for (const c of p.containers) {
    lines.push(`  ${c.name}:`);
    lines.push(pad('Image', c.image, 4));
    if (c.ports?.length) lines.push(pad('Port', c.ports.map((n) => `${n}/TCP`).join(', '), 4));
    if (c.command) lines.push(pad('Command', '', 4), ...c.command.map((x) => `      ${x}`));
    lines.push(pad('State', p.status === 'CrashLoopBackOff' ? 'Waiting' : p.status === 'Running' ? 'Running' : 'Terminated', 4));
    if (p.status === 'CrashLoopBackOff') lines.push(pad('Reason', 'CrashLoopBackOff', 6));
    lines.push(pad('Restart Count', String(p.restarts ?? 0), 4));
    if (c.resources?.limits) lines.push('    Limits:', ...Object.entries(c.resources.limits).map(([a, b]) => `      ${a}:  ${b}`));
    if (c.securityContext) {
      lines.push('    Security Context:');
      for (const [a, b] of Object.entries(c.securityContext)) lines.push(`      ${a}:  ${typeof b === 'object' ? JSON.stringify(b) : String(b)}`);
    }
    lines.push('    Environment:' + (c.env?.length ? '' : '  <none>'));
    for (const e of c.env ?? []) lines.push(`      ${e.name}:  ${e.secret ? `<set to the key '${e.secret.key}' in secret '${e.secret.name}'>  Optional: false` : e.value ?? ''}`);
    lines.push('    Mounts:' + (c.volumeMounts?.length ? '' : '  <none>'));
    for (const m of c.volumeMounts ?? []) lines.push(`      ${m.mountPath} from ${m.name} (${m.readOnly ? 'ro' : 'rw'})`);
  }
  if (p.volumes?.length) {
    lines.push('Volumes:');
    for (const v of p.volumes) {
      lines.push(`  ${v.name}:`);
      if (v.hostPath) lines.push(`    Type:          HostPath (bare host directory volume)`, `    Path:          ${v.hostPath}`);
      if (v.secret) lines.push(`    Type:        Secret (a volume populated by a Secret)`, `    SecretName:  ${v.secret}`);
      if (v.configMap) lines.push(`    Type:      ConfigMap (a volume populated by a ConfigMap)`, `    Name:      ${v.configMap}`);
      if (v.emptyDir) lines.push('    Type:       EmptyDir (a temporary directory that shares a pod\'s lifetime)');
    }
  }
  const ev = k.events.filter((e) => e.ns === p.ns && e.object === `pod/${p.name}`);
  lines.push('Events:' + (ev.length ? '' : '  <none>'));
  if (ev.length) lines.push(table([['  Type', 'Reason', 'Age', 'From', 'Message'], ...ev.map((e) => [`  ${e.type}`, e.reason, age(k.now, e.time), e.reason === 'Scheduled' ? 'default-scheduler' : 'kubelet', e.message])]));
  return lines.join('\n');
}

function describeGeneric(k: K8sState, res: string, d: { name: string; ns: string | null; doc: Record<string, YamlValue> }): string {
  if (res === 'secrets') {
    const s = k.secrets.find((x) => x.name === d.name && x.ns === d.ns)!;
    return [`Name:         ${s.name}`, `Namespace:    ${s.ns}`, 'Labels:       <none>', 'Annotations:  <none>', '', `Type:  ${s.type ?? 'Opaque'}`, '', 'Data', '====', ...Object.entries(s.data).map(([key, v]) => `${key}:  ${new TextEncoder().encode(v).length} bytes`)].join('\n');
  }
  if (res === 'rolebindings' || res === 'clusterrolebindings') {
    const b = (res === 'rolebindings' ? k.roleBindings.find((x) => x.name === d.name && x.ns === d.ns) : k.clusterRoleBindings.find((x) => x.name === d.name))!;
    return [`Name:         ${b.name}`, 'Labels:       <none>', 'Annotations:  <none>', 'Role:', `  Kind:  ${b.roleRef.kind}`, `  Name:  ${b.roleRef.name}`, 'Subjects:', table([['  Kind', 'Name', 'Namespace'], ['  ----', '----', '---------'], ...b.subjects.map((s) => [`  ${s.kind}`, s.name, s.namespace ?? ''])])].join('\n');
  }
  if (res === 'roles' || res === 'clusterroles') {
    const r = (res === 'roles' ? k.roles.find((x) => x.name === d.name && x.ns === d.ns) : k.clusterRoles.find((x) => x.name === d.name))!;
    return [`Name:         ${r.name}`, 'Labels:       <none>', 'PolicyRule:', table([['  Resources', 'Non-Resource URLs', 'Resource Names', 'Verbs'], ['  ---------', '-----------------', '--------------', '-----'], ...r.rules.map((x) => [`  ${x.resources.join(',')}`, '[]', '[]', `[${x.verbs.join(' ')}]`])])].join('\n');
  }
  return toYaml(d.doc);
}

/* ── apply ── */

function applyDoc(k: K8sState, doc: YamlValue, defaultNs: string): string {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new YamlError('error: unable to decode: object expected');
  const kind = String(doc.kind ?? '');
  const md = (doc.metadata ?? {}) as Record<string, YamlValue>;
  const name = String(md.name ?? '');
  const ns = String(md.namespace ?? defaultNs);
  if (!kind || !name) throw new YamlError('error: error validating data: [apiVersion not set, kind not set] or metadata.name missing');
  const now = k.now;
  const spec = (doc.spec ?? {}) as Record<string, YamlValue>;
  const upsert = <T extends { name: string; ns?: string }>(list: T[], item: T, label: string): string => {
    const i = list.findIndex((x) => x.name === item.name && (x.ns === undefined || x.ns === item.ns));
    if (i >= 0) {
      list[i] = item;
      return `${label}/${name} configured`;
    }
    list.push(item);
    return `${label}/${name} created`;
  };
  switch (kind) {
    case 'NetworkPolicy': {
      const sel = ((spec.podSelector as Record<string, YamlValue> | null)?.matchLabels ?? {}) as Record<string, string>;
      const types = (spec.policyTypes as string[] | undefined) ?? ['Ingress'];
      return upsert(k.networkPolicies, { name, ns, podSelector: sel, policyTypes: types, created: now, spec }, 'networkpolicy.networking.k8s.io');
    }
    case 'Namespace':
      if (!k.namespaces.includes(name)) k.namespaces.push(name);
      return `namespace/${name} created`;
    case 'ServiceAccount':
      return upsert(k.serviceAccounts, { name, ns, created: now }, 'serviceaccount');
    case 'Role':
      return upsert(k.roles, { name, ns, rules: (doc.rules ?? []) as unknown as KRule[], created: now }, 'role.rbac.authorization.k8s.io');
    case 'RoleBinding': {
      const ref = doc.roleRef as { kind: 'Role' | 'ClusterRole'; name: string };
      return upsert(k.roleBindings, { name, ns, roleRef: { kind: ref.kind, name: ref.name }, subjects: (doc.subjects ?? []) as unknown as KSubject[], created: now }, 'rolebinding.rbac.authorization.k8s.io');
    }
    case 'Secret': {
      const data = Object.fromEntries(Object.entries((doc.stringData ?? {}) as Record<string, string>).map(([a, b]) => [a, String(b)]));
      for (const [a, b] of Object.entries((doc.data ?? {}) as Record<string, string>)) data[a] = atob(String(b));
      return upsert(k.secrets, { name, ns, type: String(doc.type ?? 'Opaque'), data, created: now }, 'secret');
    }
    case 'Pod':
    case 'Deployment': {
      const tpl = kind === 'Pod' ? spec : (((spec.template as Record<string, YamlValue>) ?? {}).spec as Record<string, YamlValue>) ?? {};
      const containers = ((tpl.containers ?? []) as Record<string, YamlValue>[]).map((c) => ({
        name: String(c.name),
        image: String(c.image),
        ...(c.securityContext ? { securityContext: c.securityContext as KContainer['securityContext'] } : {}),
        ...(c.resources ? { resources: c.resources as KContainer['resources'] } : {}),
      }));
      if (!containers.length) throw new YamlError(`error: ${kind} "${name}" is invalid: spec.containers: Required value`);
      const labels = (md.labels ?? {}) as Record<string, string>;
      if (kind === 'Deployment') {
        const replicas = Number(spec.replicas ?? 1);
        const existing = k.deployments.find((d) => d.name === name && d.ns === ns);
        const res = upsert(k.deployments, { name, ns, replicas, labels, created: existing?.created ?? now, image: containers[0]!.image }, 'deployment.apps');
        k.pods = k.pods.filter((p) => !(p.ns === ns && p.owner?.name.startsWith(name + '-')));
        for (let i = 0; i < replicas; i++) {
          k.pods.push({ name: `${name}-7c9f8d6b5-${['x2kqp', 'm8zvd', 'r4tnw', 'b6hsl'][i % 4]}`, ns, labels: { ...labels, 'pod-template-hash': '7c9f8d6b5' }, owner: { kind: 'ReplicaSet', name: `${name}-7c9f8d6b5` }, node: k.nodes[i % k.nodes.length]!.name, ip: `10.244.1.${200 + i}`, status: 'Running', created: now, serviceAccount: String(tpl.serviceAccountName ?? 'default'), containers, cpu: 5, mem: 24 });
        }
        return res;
      }
      return upsert(k.pods, { name, ns, labels, node: k.nodes[0]!.name, ip: '10.244.1.250', status: 'Running', created: now, serviceAccount: String(tpl.serviceAccountName ?? 'default'), containers, cpu: 2, mem: 16 } as KPod, 'pod');
    }
  }
  throw new YamlError(`error: resource mapping not found for name: "${name}" namespace: "${ns}" from "-": no matches for kind "${kind}" (simulyatorda: NetworkPolicy, Role, RoleBinding, ServiceAccount, Secret, Pod, Deployment, Namespace)`);
}

/* ── kubectl ── */

export const kubectl: Command = (args, ctx) => {
  const k = ctx.state.k8s;
  if (!k) return fail('E1118 09:00:00.000000   12345 memcache.go:265] couldn\'t get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused\nThe connection to the server localhost:8080 was refused - did you specify the right host or port?');
  const [verb, ...rest] = args;
  const a = parseArgs(rest);
  const notFound = (res: string, name: string) => `Error from server (NotFound): ${res}${GROUP[res] ? '.' + GROUP[res] : ''} "${name}" not found`;
  const resolveRes = (r: string | undefined): [string, string | undefined] | null => {
    if (!r) return null;
    const [type, name] = r.includes('/') ? r.split('/') : [r, undefined];
    const res = ALIASES[type!.toLowerCase()];
    return res ? [res, name] : null;
  };
  try {
    switch (verb) {
      case 'get': {
        const first = a.rest[0];
        if (!first) return fail('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.');
        if (first === 'all') {
          const parts = ['pods', 'services', 'deployments'].map((res) => {
            const rows = tableFor(k, res, a.ns, a.all, false, a.selector, [], false)!;
            if (rows.length < 2) return '';
            return table(rows.map((r, i) => (i === 0 ? r : r.map((c, j) => (j === (a.all ? 1 : 0) ? `${res === 'pods' ? 'pod' : res === 'services' ? 'service' : 'deployment.apps'}/${c}` : c)))));
          });
          return ok(parts.filter(Boolean).join('\n\n') || `No resources found in ${a.ns} namespace.`);
        }
        const r = resolveRes(first);
        if (!r) return fail(`error: the server doesn't have a resource type "${first}"`);
        const [res, slashName] = r;
        const names = [...(slashName ? [slashName] : []), ...a.rest.slice(1)];
        const out = a.output;
        if (out) {
          let docs = docsFor(k, res, a.ns, a.all).filter((d) => !names.length || names.includes(d.name)).filter((d) => matchSelector(d.labels, a.selector));
          if (names.length && !docs.length) return fail(notFound(res, names[0]!));
          if (out === 'name') return ok(docs.map((d) => `${KIND[res]!.toLowerCase()}/${d.name}`).join('\n'));
          const single = names.length === 1;
          const value: YamlValue = single ? docs[0]!.doc : { apiVersion: 'v1', kind: 'List', items: docs.map((d) => d.doc) };
          if (out === 'yaml') return ok(toYaml(value));
          if (out === 'json') return ok(JSON.stringify(value, null, 4));
          const jp = /^jsonpath=(.*)$/s.exec(out);
          if (jp) return ok(jsonPath(jp[1]!.replace(/^'(.*)'$/s, '$1'), value));
          if (out === 'wide') docs = [];
          else return fail(`error: unable to match a printer suitable for the output format "${out}", allowed formats are: json,jsonpath,name,wide,yaml`);
        }
        const rows = tableFor(k, res, a.ns, a.all, out === 'wide', a.selector, names, a.flags.has('--show-labels'));
        if (!rows) return fail(`error: the server doesn't have a resource type "${first}"`);
        if (names.length && rows.length < 2) return fail(notFound(res, names[0]!));
        if (rows.length < 2) return ok(a.all || CLUSTER_SCOPED.has(res) ? 'No resources found' : `No resources found in ${a.ns} namespace.`);
        if (a.opts['--sort-by'] && res === 'events') return ok(table(rows));
        return ok(table(rows));
      }
      case 'describe': {
        const r = resolveRes(a.rest[0]);
        if (!r) return fail(`error: the server doesn't have a resource type "${a.rest[0] ?? ''}"`);
        const [res, slashName] = r;
        const name = slashName ?? a.rest[1];
        if (res === 'pods') {
          const list = k.pods.filter((p) => (a.all || p.ns === a.ns) && (!name || p.name === name || p.name.startsWith(name)));
          if (!list.length) return fail(notFound(res, name ?? ''));
          return ok(list.map((p) => describePod(k, p)).join('\n\n\n'));
        }
        const docs = docsFor(k, res, a.ns, a.all).filter((d) => !name || d.name === name);
        if (!docs.length) return fail(notFound(res, name ?? ''));
        return ok(docs.map((d) => describeGeneric(k, res, d)).join('\n\n\n'));
      }
      case 'logs': {
        let target = a.rest[0];
        if (!target) return fail('error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.');
        let pod: KPod | undefined;
        if (target.startsWith('deploy/') || target.startsWith('deployment/')) {
          const dn = target.split('/')[1]!;
          pod = k.pods.find((p) => p.ns === a.ns && p.owner?.name.startsWith(dn + '-'));
          if (!pod) return fail(notFound('deployments', dn));
        } else {
          target = target.replace(/^pods?\//, '');
          pod = k.pods.find((p) => p.ns === a.ns && p.name === target);
          if (!pod) return fail(`Error from server (NotFound): pods "${target}" not found`);
        }
        const cname = a.opts['-c'] ?? a.opts['--container'] ?? pod.containers[0]!.name;
        if (!pod.containers.some((c) => c.name === cname)) return fail(`error: container ${cname} is not valid for pod ${pod.name}`);
        if (pod.containers.length > 1 && !a.opts['-c'] && !a.opts['--container']) {
          // Real kubectl picks the default container and says so.
        }
        let lines = (pod.logs?.[cname] ?? '').replace(/\n$/, '').split('\n');
        const tail = a.opts['--tail'];
        if (tail && tail !== '-1') lines = lines.slice(Math.max(0, lines.length - Number(tail)));
        return ok(lines.join('\n'));
      }
      case 'exec': {
        const target = a.rest[0]?.replace(/^pods?\//, '');
        const pod = k.pods.find((p) => p.ns === a.ns && p.name === target);
        if (!pod) return fail(`Error from server (NotFound): pods "${target ?? ''}" not found`);
        if (pod.status !== 'Running') return fail(`error: cannot exec into a container in a completed pod; current phase is ${pod.status}`);
        const cmd = a.dashdash ?? a.rest.slice(1);
        if (!cmd.length) return fail('error: you must specify at least one command for the container');
        if (cmd.length === 1 && ['sh', 'bash', '/bin/sh', '/bin/bash'].includes(cmd[0]!)) {
          return fail("Bu simulyatorda pod ichida interaktiv qobiq ochilmaydi. Buyruqni to'g'ridan-to'g'ri bering:\n  kubectl exec POD -- env\n  kubectl exec POD -- cat /etc/os-release");
        }
        const s = podShell(k, pod);
        const line = ['sh', 'bash', '/bin/sh', '/bin/bash'].includes(cmd[0]!) && cmd[1] === '-c' ? cmd.slice(2).join(' ') : cmd.map((x) => (/[\s|;&]/.test(x) ? `'${x}'` : x)).join(' ');
        const res = execLine(s, line);
        return { out: res.output, code: res.code };
      }
      case 'top': {
        const what = a.rest[0];
        if (what === 'nodes' || what === 'node' || what === 'no') {
          return ok(table([['NAME', 'CPU(cores)', 'CPU%', 'MEMORY(bytes)', 'MEMORY%'], ...k.nodes.map((n) => [n.name, `${n.cpu ?? 250}m`, `${Math.round(((n.cpu ?? 250) / 4000) * 100)}%`, `${n.mem ?? 2100}Mi`, `${Math.round(((n.mem ?? 2100) / 15900) * 100)}%`])]));
        }
        if (what !== 'pods' && what !== 'pod' && what !== 'po') return fail('error: unknown resource type for top (simulyatorda: kubectl top pods | kubectl top nodes)');
        let list = k.pods.filter((p) => (a.all || p.ns === a.ns) && p.status === 'Running');
        const sort = a.opts['--sort-by'];
        if (sort === 'cpu') list = [...list].sort((x, y) => (y.cpu ?? 0) - (x.cpu ?? 0));
        if (sort === 'memory') list = [...list].sort((x, y) => (y.mem ?? 0) - (x.mem ?? 0));
        return ok(table([[...(a.all ? ['NAMESPACE'] : []), 'NAME', 'CPU(cores)', 'MEMORY(bytes)'], ...list.map((p) => [...(a.all ? [p.ns] : []), p.name, `${p.cpu ?? 1}m`, `${p.mem ?? 10}Mi`])]));
      }
      case 'auth': {
        if (a.rest[0] !== 'can-i') return fail('Ishlatilishi: kubectl auth can-i VERB RESURS [--as=...] [-n NS] | kubectl auth can-i --list');
        const subj = subjectOf(k, a.opts['--as']);
        const isAdmin = subj.kind === 'User' && subj.name === 'kubernetes-admin';
        const rules = isAdmin ? [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }] : rulesFor(k, subj, a.ns);
        if (a.flags.has('--list')) {
          return ok(table([['Resources', 'Non-Resource URLs', 'Resource Names', 'Verbs'], ...rules.map((r) => [r.resources.join(','), '[]', '[]', `[${r.verbs.join(' ')}]`])]));
        }
        const [, v, resRaw] = a.rest;
        if (!v || !resRaw) return fail('error: you must specify two arguments: verb resource or a non-resource URL');
        const [resName, sub] = resRaw.split('/');
        const res = ALIASES[resName!] ?? resName!;
        return { out: can(rules, v, res, sub) ? 'yes' : 'no', code: can(rules, v, res, sub) ? 0 : 1 };
      }
      case 'delete': {
        if (a.opts['-f'] || a.opts['--filename']) return fail('Bu simulyatorda delete -f yo\'q: kubectl delete TUR NOM');
        const r = resolveRes(a.rest[0]);
        if (!r) return fail(`error: the server doesn't have a resource type "${a.rest[0] ?? ''}"`);
        const [res, slashName] = r;
        const names = [...(slashName ? [slashName] : []), ...a.rest.slice(1)];
        if (!names.length) return fail('error: resource(s) were provided, but no name was specified');
        const out: string[] = [];
        for (const name of names) {
          const label = `${KIND[res]!.toLowerCase()}${GROUP[res] ? '.' + GROUP[res] : ''}`;
          const before = JSON.stringify(k);
          switch (res) {
            case 'pods':
              k.pods = k.pods.filter((p) => !(p.ns === a.ns && p.name === name));
              break;
            case 'deployments':
              k.deployments = k.deployments.filter((d) => !(d.ns === a.ns && d.name === name));
              k.pods = k.pods.filter((p) => !(p.ns === a.ns && p.owner?.name.startsWith(name + '-')));
              break;
            case 'services':
              k.services = k.services.filter((s) => !(s.ns === a.ns && s.name === name));
              break;
            case 'secrets':
              k.secrets = k.secrets.filter((s) => !(s.ns === a.ns && s.name === name));
              break;
            case 'serviceaccounts':
              k.serviceAccounts = k.serviceAccounts.filter((s) => !(s.ns === a.ns && s.name === name));
              break;
            case 'roles':
              k.roles = k.roles.filter((x) => !(x.ns === a.ns && x.name === name));
              break;
            case 'rolebindings':
              k.roleBindings = k.roleBindings.filter((x) => !(x.ns === a.ns && x.name === name));
              break;
            case 'clusterrolebindings':
              k.clusterRoleBindings = k.clusterRoleBindings.filter((x) => x.name !== name);
              break;
            case 'clusterroles':
              k.clusterRoles = k.clusterRoles.filter((x) => x.name !== name);
              break;
            case 'networkpolicies':
              k.networkPolicies = k.networkPolicies.filter((x) => !(x.ns === a.ns && x.name === name));
              break;
            case 'configmaps':
              k.configmaps = k.configmaps.filter((x) => !(x.ns === a.ns && x.name === name));
              break;
            default:
              return fail(`Bu simulyatorda ${res} o'chirilmaydi`);
          }
          if (JSON.stringify(k) === before) return { out: out.join('\n'), err: notFound(res, name), code: 1 };
          out.push(`${label} "${name}" deleted`);
        }
        return ok(out.join('\n'));
      }
      case 'scale': {
        const r = resolveRes(a.rest[0]);
        const replicas = a.opts['--replicas'];
        if (!r || r[0] !== 'deployments' || replicas === undefined) return fail('Ishlatilishi: kubectl scale deployment/NOM --replicas=N [-n NS]');
        const name = r[1] ?? a.rest[1];
        const d = k.deployments.find((x) => x.ns === a.ns && x.name === name);
        if (!d) return fail(notFound('deployments', name ?? ''));
        const n = Number(replicas);
        d.replicas = n;
        const pods = k.pods.filter((p) => p.ns === a.ns && p.owner?.name.startsWith(d.name + '-'));
        const drop = new Set(pods.slice(n));
        k.pods = k.pods.filter((p) => !drop.has(p));
        return ok(`deployment.apps/${d.name} scaled`);
      }
      case 'apply': {
        const file = a.opts['-f'] ?? a.opts['--filename'];
        if (!file) return fail('error: must specify one of -f and -k');
        const node = getNode(ctx.state.root, resolvePath(ctx.state.cwd, file, ctx.state.home));
        if (!node || node.type !== 'file') return fail(`error: the path "${file}" does not exist`);
        const docs = parseYamlDocs(node.content);
        return ok(docs.map((doc) => applyDoc(k, doc, a.ns)).join('\n'));
      }
      case 'cordon':
      case 'uncordon': {
        const n = k.nodes.find((x) => x.name === a.rest[0]);
        if (!n) return fail(`Error from server (NotFound): nodes "${a.rest[0] ?? ''}" not found`);
        n.unschedulable = verb === 'cordon';
        return ok(`node/${n.name} ${verb}ed`);
      }
      case 'config':
        if (a.rest[0] === 'current-context') return ok(k.context);
        if (a.rest[0] === 'get-contexts') return ok(table([['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'], ['*', k.context, k.context.split('@')[1] ?? 'kubernetes', k.user, '']]));
        return fail('Ishlatilishi: kubectl config current-context | get-contexts');
      case 'version':
        return ok('Client Version: v1.31.2\nKustomize Version: v5.4.2\nServer Version: v1.31.1');
      case 'api-resources':
        return ok(table([['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], ...Object.entries(KIND).map(([res, kind]) => [res, Object.entries(ALIASES).filter(([al, r]) => r === res && al.length <= 6 && al !== res && !al.endsWith('s') && al !== kind.toLowerCase()).map(([al]) => al).join(','), GROUP[res] ? `${GROUP[res]}/v1` : 'v1', String(!CLUSTER_SCOPED.has(res)), kind])]));
      case undefined:
      case 'help':
      case '--help':
        return ok('kubectl controls the Kubernetes cluster manager.\n\nSimulyatordagi buyruqlar: get, describe, logs, exec, top, auth can-i, delete, scale, apply -f, cordon, uncordon, config, version, api-resources\nBatafsil: man kubectl');
      default:
        return fail(`error: unknown command "${verb}" for "kubectl"\nRun 'kubectl --help' for usage.`);
    }
  } catch (e) {
    if (e instanceof TemplateError || e instanceof YamlError) return fail(e.message);
    throw e;
  }
};

export type { CmdResult };
