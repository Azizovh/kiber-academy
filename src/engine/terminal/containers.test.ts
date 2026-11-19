import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import { createShell, execLine, type ShellState } from './shell';
import { lintDockerfile } from './docker';
import { parseYamlDocs, toYaml } from './yaml';
import { goTemplate, jsonPath } from './templates';

const H = (h: number) => Date.UTC(2026, 10, 18, 9 - h, 0, 0);

function shell(): ShellState {
  return createShell({
    fs: {
      home: {
        talaba: {
          Dockerfile: 'FROM node:latest\nADD . /app\nRUN apt-get update && apt-get install -y curl\nUSER root\nCMD node server.js\n',
          'deny.yaml': 'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: deny-egress\n  namespace: prod\nspec:\n  podSelector: {}\n  policyTypes:\n  - Egress\n',
        },
      },
      tmp: {},
    },
    docker: {
      images: [
        {
          repo: 'app', tag: '1.4', id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90', created: H(50), size: '312MB', os: 'debian 12.5', user: '',
          env: ['PATH=/usr/local/bin:/usr/bin', 'NODE_ENV=production'], exposed: ['3000/tcp'],
          layers: [{ by: 'FROM node:20-bookworm', size: '0B' }, { by: 'ENV DB_PASSWORD=Prod#2026secret', size: '0B' }, { by: 'COPY . /app # buildkit', size: '24.1MB' }],
          vulns: [{ lib: 'openssl', id: 'CVE-2022-0778', severity: 'HIGH', installed: '1.1.1d-0+deb10u7', fixed: '1.1.1n-0+deb10u1', title: 'openssl: Infinite loop in BN_mod_sqrt() reachable when parsing certificates' }],
          secrets: [{ file: '/app/.env', line: 2, rule: 'aws-access-key-id', title: 'AWS Access Key ID', severity: 'CRITICAL', text: 'AWS_ACCESS_KEY_ID=AKIAEXAMPLE0000LAB', layer: 'COPY . /app # buildkit' }],
          fs: { app: { 'server.js': 'console.log(1)\n' }, etc: { passwd: 'root:x:0:0:root:/root:/bin/bash\nnode:x:1000:1000::/home/node:/bin/sh\n' }, root: {}, tmp: {} },
        },
      ],
      containers: [
        {
          id: 'f00dbabe1234567890abcdef', name: 'web', image: 'app:1.4', status: 'running', created: H(5), started: H(5), command: 'node server.js',
          ports: [{ hostPort: 8080, port: 3000 }], privileged: true, mounts: [{ type: 'bind', source: '/var/run/docker.sock', destination: '/var/run/docker.sock' }],
          logs: 'listening on 3000\nGET /health 200\nGET /admin 401\n', procs: [{ pid: 1, user: 'root', cmd: 'node server.js', cpu: 2 }, { pid: 31, user: 'root', cmd: '/tmp/.x/xmrig -o pool.example.net:443', cpu: 97 }],
          diff: ['C /tmp', 'A /tmp/.x', 'A /tmp/.x/xmrig'], cpu: 99.1, memUsage: 410,
        },
        { id: 'deadbeef00112233', name: 'old-job', image: 'app:1.4', status: 'exited', exitCode: 137, created: H(30), finished: H(28), command: 'node job.js' },
      ],
    },
    k8s: {
      namespaces: ['default', 'kube-system', 'prod'],
      nodes: [{ name: 'worker-1', roles: '<none>', version: 'v1.31.1', created: H(2000) }],
      pods: [
        { name: 'web-6d9f7c-abcde', ns: 'prod', labels: { app: 'web' }, owner: { kind: 'ReplicaSet', name: 'web-6d9f7c' }, node: 'worker-1', ip: '10.244.1.12', status: 'Running', created: H(26), serviceAccount: 'web', cpu: 12, mem: 96,
          containers: [{ name: 'web', image: 'registry.lab/web:2.1', env: [{ name: 'DB_HOST', value: 'db' }, { name: 'DB_PASSWORD', secret: { name: 'db-cred', key: 'password' } }], securityContext: { runAsNonRoot: true, runAsUser: 1000 } }],
          logs: { web: 'started\nGET / 200\n' } },
        { name: 'miner-77b-xyz', ns: 'prod', labels: { app: 'cache' }, node: 'worker-1', ip: '10.244.1.40', status: 'Running', created: H(3), serviceAccount: 'ci-bot', cpu: 1960, mem: 210,
          containers: [{ name: 'cache', image: 'docker.io/xmrig/xmrig:latest', securityContext: { privileged: true } }], volumes: [{ name: 'host', hostPath: '/' }] },
      ],
      deployments: [{ name: 'web', ns: 'prod', replicas: 1, created: H(26), image: 'registry.lab/web:2.1', labels: { app: 'web' } }],
      secrets: [{ name: 'db-cred', ns: 'prod', data: { username: 'qaydnoma', password: 'S3cret!Db' }, created: H(500) }],
      serviceAccounts: [{ name: 'ci-bot', ns: 'prod', created: H(100) }, { name: 'web', ns: 'prod', created: H(100) }],
      clusterRoles: [{ name: 'cluster-admin', rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }], created: H(2000) }],
      roles: [{ name: 'read-pods', ns: 'prod', rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }], created: H(100) }],
      roleBindings: [{ name: 'web-read', ns: 'prod', roleRef: { kind: 'Role', name: 'read-pods' }, subjects: [{ kind: 'ServiceAccount', name: 'web', namespace: 'prod' }], created: H(100) }],
      clusterRoleBindings: [{ name: 'ci-bot-admin', roleRef: { kind: 'ClusterRole', name: 'cluster-admin' }, subjects: [{ kind: 'ServiceAccount', name: 'ci-bot', namespace: 'prod' }], created: H(4) }],
      events: [{ ns: 'prod', type: 'Normal', reason: 'Created', object: 'pod/miner-77b-xyz', message: 'Created container cache', time: H(3) }],
    },
  });
}

const run = (s: ShellState, l: string) => execLine(s, l).output;

describe('templates and yaml', () => {
  it('go templates and jsonpath', () => {
    expect(goTemplate('{{.A.B}} {{json .L}} {{range .L}}<{{.}}>{{end}}', { A: { B: 'x' }, L: [1, 2] })).toBe('x [1,2] <1><2>');
    expect(jsonPath('{range .items[*]}{.metadata.name}{"\\t"}{.spec.n}{"\\n"}{end}', { items: [{ metadata: { name: 'a' }, spec: { n: 1 } }, { metadata: { name: 'b' }, spec: { n: 2 } }] })).toBe('a\t1\nb\t2\n');
    expect(jsonPath('{.items[?(@.k=="y")].v}', { items: [{ k: 'x', v: 1 }, { k: 'y', v: 2 }] })).toBe('2');
  });
  it('parses and prints YAML manifests', () => {
    const [doc] = parseYamlDocs('kind: Pod\nmetadata:\n  name: a\n  labels: {app: web}\nspec:\n  containers:\n  - name: c\n    image: "nginx:1.27"\n    ports:\n    - containerPort: 80\n');
    expect(doc).toEqual({ kind: 'Pod', metadata: { name: 'a', labels: { app: 'web' } }, spec: { containers: [{ name: 'c', image: 'nginx:1.27', ports: [{ containerPort: 80 }] }] } });
    expect(parseYamlDocs(toYaml(doc!))[0]).toEqual(doc);
  });
});

describe('docker', () => {
  it('lists, inspects and reads containers', () => {
    const s = shell();
    const ps = run(s, 'docker ps');
    expect(ps).toMatch(/^CONTAINER ID +IMAGE +COMMAND +CREATED +STATUS +PORTS +NAMES/);
    expect(ps).toContain('0.0.0.0:8080->3000/tcp');
    expect(ps).not.toContain('old-job');
    expect(run(s, 'docker ps -a')).toContain('Exited (137) 28 hours ago');
    expect(run(s, "docker ps --format '{{.Names}}\\t{{.Image}}'")).toBe('web\tapp:1.4');
    expect(run(s, "docker inspect -f '{{.HostConfig.Privileged}}' web")).toBe('true');
    expect(run(s, "docker inspect -f '{{range .Mounts}}{{.Source}}{{end}}' web")).toBe('/var/run/docker.sock');
    expect(run(s, "docker inspect -f '{{json .Config.Env}}' web")).toContain('NODE_ENV=production');
    expect(run(s, 'docker logs --tail 1 web')).toBe('GET /admin 401');
    expect(run(s, 'docker top web')).toContain('xmrig');
    expect(run(s, 'docker diff web')).toContain('A /tmp/.x/xmrig');
    expect(run(s, 'docker stats --no-stream')).toMatch(/web +99\.10%/);
    expect(run(s, 'docker history app:1.4')).toContain('ENV DB_PASSWORD=Prod#2026secret');
    expect(run(s, 'docker exec web cat /etc/passwd')).toContain('node:x:1000');
    expect(run(s, 'docker exec web env')).toContain('NODE_ENV=production');
    expect(run(s, 'docker exec old-job ls')).toContain('is not running');
  });

  it('runs a hardened container and removes the old one', () => {
    const s = shell();
    expect(run(s, 'docker rm web')).toContain('container is running');
    run(s, 'docker stop web');
    run(s, 'docker rm web');
    expect(run(s, 'docker ps -a')).not.toContain(' web');
    run(s, 'docker run -d --name web2 --user 1000:1000 --read-only --cap-drop ALL --memory 256m -p 127.0.0.1:8080:3000 app:1.4');
    expect(run(s, "docker inspect -f '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.Memory}}' web2")).toBe('1000:1000 true [ALL] 268435456');
    expect(run(s, 'docker port web2')).toBe('3000/tcp -> 127.0.0.1:8080');
  });

  it('trivy and hadolint', () => {
    const s = shell();
    const t = run(s, 'trivy image app:1.4');
    expect(t).toContain('Total: 1 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 1, CRITICAL: 0)');
    expect(t).toContain('CVE-2022-0778');
    expect(t).toContain('AWS_ACCESS_KEY_ID=******************');
    expect(run(s, 'trivy image --severity CRITICAL --scanners vuln app:1.4')).toContain('Total: 0');
    expect(lintDockerfile('FROM node:latest\nADD . /app\nUSER root\nCMD node server.js\n', 'Dockerfile').map((l) => l.split(' ')[1])).toEqual(['DL3007', 'DL3020', 'DL3002', 'DL3025']);
    expect(run(s, 'hadolint Dockerfile')).toContain('Dockerfile:3 DL3008 warning');
  });
});

describe('kubectl', () => {
  it('gets, describes and reads pods', () => {
    const s = shell();
    expect(run(s, 'kubectl get pods')).toBe('No resources found in default namespace.');
    const pods = run(s, 'kubectl get pods -n prod');
    expect(pods).toMatch(/^NAME +READY +STATUS +RESTARTS +AGE/);
    expect(pods).toMatch(/miner-77b-xyz +1\/1 +Running +0 +3h/);
    expect(run(s, 'kubectl get pods -A -o wide')).toMatch(/prod +web-6d9f7c-abcde .* 10\.244\.1\.12 +worker-1/);
    expect(run(s, "kubectl get pods -n prod -o jsonpath='{.items[*].spec.containers[*].image}'")).toBe('registry.lab/web:2.1 docker.io/xmrig/xmrig:latest');
    expect(run(s, 'kubectl top pods -n prod --sort-by=cpu').split('\n')[1]).toMatch(/^miner-77b-xyz +1960m/);
    const desc = run(s, 'kubectl describe pod miner-77b-xyz -n prod');
    expect(desc).toContain('Service Account:  ci-bot');
    expect(desc).toContain('privileged:  true');
    expect(desc).toContain('Path:          /');
    expect(run(s, 'kubectl describe pod web-6d9f7c-abcde -n prod')).toContain("DB_PASSWORD:  <set to the key 'password' in secret 'db-cred'>");
    expect(run(s, 'kubectl logs web-6d9f7c-abcde -n prod --tail 1')).toBe('GET / 200');
    expect(run(s, 'kubectl exec web-6d9f7c-abcde -n prod -- env')).toContain('DB_PASSWORD=S3cret!Db');
    expect(run(s, "kubectl get secret db-cred -n prod -o jsonpath='{.data.password}' | base64 -d")).toBe('S3cret!Db');
    expect(run(s, 'kubectl get pod web-6d9f7c-abcde -n prod -o yaml')).toContain('serviceAccountName: web');
  });

  it('checks RBAC and remediates', () => {
    const s = shell();
    expect(run(s, 'kubectl auth can-i delete nodes --as=system:serviceaccount:prod:ci-bot')).toBe('yes');
    expect(run(s, 'kubectl auth can-i delete pods -n prod --as=system:serviceaccount:prod:web')).toBe('no');
    expect(run(s, 'kubectl auth can-i list pods -n prod --as=system:serviceaccount:prod:web')).toBe('yes');
    expect(run(s, 'kubectl get clusterrolebindings -o wide')).toMatch(/ci-bot-admin +ClusterRole\/cluster-admin +4h +prod\/ci-bot/);
    expect(run(s, 'kubectl delete clusterrolebinding ci-bot-admin')).toBe('clusterrolebinding.rbac.authorization.k8s.io "ci-bot-admin" deleted');
    expect(run(s, 'kubectl auth can-i delete nodes --as=system:serviceaccount:prod:ci-bot')).toBe('no');
    expect(run(s, 'kubectl delete pod miner-77b-xyz -n prod')).toBe('pod "miner-77b-xyz" deleted');
    expect(run(s, 'kubectl apply -f deny.yaml')).toBe('networkpolicy.networking.k8s.io/deny-egress created');
    expect(run(s, 'kubectl get netpol -n prod')).toMatch(/deny-egress +<none>/);
    expect(run(s, 'kubectl scale deployment/web --replicas=0 -n prod')).toBe('deployment.apps/web scaled');
    expect(run(s, 'kubectl get deploy -n prod')).toMatch(/web +0\/0/);
    expect(run(s, 'kubectl get events -n prod')).toContain('Created container cache');
  });

  it('prints a sample for review', () => {
    const s = shell();
    const out = ['docker ps -a', 'docker history app:1.4', 'docker stats --no-stream', 'trivy image app:1.4', 'kubectl get pods -A', 'kubectl describe pod miner-77b-xyz -n prod', 'kubectl get secret db-cred -n prod -o yaml', 'kubectl get rolebindings -n prod -o wide', 'kubectl auth can-i --list --as=system:serviceaccount:prod:web -n prod']
      .map((l) => `$ ${l}\n${run(s, l)}\n`)
      .join('\n');
    if (process.env.OUT) writeFileSync(process.env.OUT, out);
  });
});
