import type { CtfChallenge } from './types';
import type { K8sSpec } from '../engine/terminal/kube';

/*
 * Container challenges: a Docker host, a Kubernetes cluster and one Dockerfile to read. Flags are stored as hashes;
 * plain answers and scripted solutions live in content.test.ts.
 */

const NOW = Date.UTC(2026, 10, 18, 9, 0, 0);
const ago = (h: number) => NOW - h * 3600_000;
const id = (s: string) => Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(s.charCodeAt(i % s.length) * (i + 5)) % 16]).join('');

export const CTF_CONTAINERS: CtfChallenge[] = [
  {
    id: 'docker-history',
    title: 'Qatlamlar unutmaydi',
    category: 'linux',
    level: 1,
    description:
      "`billing:3.1` image'ini qurgan dasturchi \"keyingi qatlamda o'chirib tashladim\" deydi. Lekin image qatlamlari hech narsani unutmaydi. Flag image tarixida.",
    hints: ['`docker history billing:3.1` — har qator Dockerfile\'dagi bitta buyruq.', "Uzun qatorlar qisqartiriladi (…). To'liq ko'rish: `--no-trunc`.", "Topgan qiymatingiz Base64 bo'lsa: `echo QIYMAT | base64 -d`"],
    flagHash: '1360bf7f3704a9',
    shell: () => ({
      host: 'build-01',
      fs: { home: { talaba: {} }, tmp: {} },
      docker: {
        images: [
          {
            repo: 'billing', tag: '3.1', id: id('billing31'), created: ago(30), size: '264MB', user: 'app',
            layers: [
              { by: 'FROM python:3.12-slim', size: '0B' },
              { by: 'WORKDIR /srv', size: '0B' },
              { by: 'RUN /bin/sh -c pip install --no-cache-dir flask==3.0.3 gunicorn==23.0.0 # buildkit', size: '18.4MB' },
              { by: 'RUN /bin/sh -c echo ZmxhZ3txYXRsYW1sYXJfdW51dG1heWRpfQ== | base64 -d > /srv/.token # buildkit', size: '64B' },
              { by: 'RUN /bin/sh -c rm /srv/.token # buildkit', size: '0B' },
              { by: 'COPY app/ /srv/ # buildkit', size: '1.2MB' },
              { by: 'USER app', size: '0B' },
              { by: 'CMD ["gunicorn" "-b" "0.0.0.0:8000" "app:app"]', size: '0B' },
            ],
          },
        ],
        containers: [],
      },
    }),
  },
  {
    id: 'docker-diff',
    title: "Kimdir nimadir qo'shdi",
    category: 'linux',
    level: 2,
    description:
      "`shop` konteyneri ishlab turibdi, lekin xavfsizlik jamoasi unda image'da bo'lmagan fayl paydo bo'lganini aytmoqda. O'sha faylni toping va o'qing.",
    hints: ["`docker diff shop` — A: image'ga nisbatan qo'shilgan fayllar.", "Konteyner ichidagi faylni o'qish: `docker exec shop cat YO'L`", 'Ichidagi satr kodlangan bo\'lishi mumkin.'],
    flagHash: '02e30d6bf0e73b',
    shell: () => ({
      host: 'docker-03',
      fs: { home: { talaba: {} }, tmp: {} },
      docker: {
        images: [{ repo: 'shop', tag: '1.9', id: id('shop19'), created: ago(200), size: '188MB', layers: [{ by: 'FROM nginx:1.27', size: '0B' }, { by: 'COPY site/ /usr/share/nginx/html/ # buildkit', size: '3.4MB' }] }],
        containers: [
          {
            id: id('shopc'), name: 'shop', image: 'shop:1.9', status: 'running', created: ago(72), started: ago(72), command: 'nginx -g daemon off;', ports: [{ hostPort: 80, port: 80 }],
            diff: ['C /etc', 'C /etc/cron.d', 'A /etc/cron.d/sync', 'C /var/cache/nginx', 'A /var/cache/nginx/client_temp', 'C /run', 'A /run/nginx.pid'],
            fs: {
              etc: { 'cron.d': { sync: '*/15 * * * * root echo ZmxhZ3tkaWZmX2hhbW1hc2luaV9heXRhZGl9 | base64 -d > /dev/null\n' }, nginx: { 'nginx.conf': 'user nginx;\n' } },
              usr: { share: { nginx: { html: { 'index.html': '<h1>Shop</h1>\n' } } } },
              var: { cache: { nginx: { client_temp: {} } } },
              run: { 'nginx.pid': '1\n' },
              root: {},
              tmp: {},
            },
          },
        ],
      },
    }),
  },
  {
    id: 'k8s-secret',
    title: 'Staging sirlari',
    category: 'cloud',
    level: 1,
    description: "`staging` namespace'idagi Secret'lardan birida flag saqlangan. Kubernetes Secret'i shifrlanmaydi — uni toping va oching.",
    hints: ["`kubectl get secrets -n staging`", "Ichini ko'rish: `kubectl get secret NOM -n staging -o yaml`", "Bitta kalitni olish va ochish: `-o jsonpath='{.data.KALIT}' | base64 -d`"],
    flagHash: '15c4764d512852',
    shell: () => ({
      host: 'admin-ws',
      fs: { home: { talaba: {} }, tmp: {} },
      k8s: {
        namespaces: ['default', 'staging'],
        nodes: [{ name: 'node-1', roles: 'control-plane', version: 'v1.31.1', created: ago(2000) }],
        pods: [],
        secrets: <K8sSpec['secrets']>[
          { name: 'registry-pull', ns: 'staging', type: 'kubernetes.io/dockerconfigjson', data: { '.dockerconfigjson': '{"auths":{}}' }, created: ago(400) },
          { name: 'app-config', ns: 'staging', data: { LOG_LEVEL: 'debug', FEATURE_X: 'on' }, created: ago(300) },
          { name: 'ctf-vault', ns: 'staging', data: { note: 'flag kaliti alohida', flag: atob('ZmxhZ3tzZWNyZXRfYnVfYmFzZTY0fQ==') }, created: ago(20) },
        ],
      },
    }),
  },
  {
    id: 'k8s-rbac',
    title: "Kim podlarni o'chira oladi?",
    category: 'cloud',
    level: 2,
    description:
      "`prod` namespace'ida uchta ServiceAccount bor: `monitor`, `deploy-bot`, `backup`. Ulardan faqat bittasi podlarni o'chira (delete) oladi. Qaysi biri?\n\nFlag formati: `flag{serviceaccount-nomi}`",
    hints: [
      "`kubectl auth can-i delete pods -n prod --as=system:serviceaccount:prod:NOM`",
      "Yoki bog'lanishlarni o'qing: `kubectl get rolebindings -n prod -o wide`, keyin `kubectl describe role NOM -n prod`",
    ],
    flagHash: '180906b1948495',
    shell: () => ({
      host: 'admin-ws',
      fs: { home: { talaba: {} }, tmp: {} },
      k8s: {
        namespaces: ['default', 'prod'],
        nodes: [{ name: 'node-1', roles: 'control-plane', version: 'v1.31.1', created: ago(2000) }],
        pods: [],
        serviceAccounts: [{ name: 'monitor', ns: 'prod', created: ago(300) }, { name: 'deploy-bot', ns: 'prod', created: ago(300) }, { name: 'backup', ns: 'prod', created: ago(300) }],
        roles: [
          { name: 'pod-reader', ns: 'prod', rules: [{ apiGroups: [''], resources: ['pods', 'pods/log'], verbs: ['get', 'list', 'watch'] }], created: ago(300) },
          { name: 'rollout', ns: 'prod', rules: [{ apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'update', 'patch'] }, { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'delete'] }], created: ago(300) },
          { name: 'snapshot', ns: 'prod', rules: [{ apiGroups: [''], resources: ['persistentvolumeclaims', 'secrets'], verbs: ['get', 'list'] }], created: ago(300) },
        ],
        roleBindings: [
          { name: 'monitor-read', ns: 'prod', roleRef: { kind: 'Role', name: 'pod-reader' }, subjects: [{ kind: 'ServiceAccount', name: 'monitor', namespace: 'prod' }], created: ago(300) },
          { name: 'deploy-rollout', ns: 'prod', roleRef: { kind: 'Role', name: 'rollout' }, subjects: [{ kind: 'ServiceAccount', name: 'deploy-bot', namespace: 'prod' }], created: ago(300) },
          { name: 'backup-snap', ns: 'prod', roleRef: { kind: 'Role', name: 'snapshot' }, subjects: [{ kind: 'ServiceAccount', name: 'backup', namespace: 'prod' }], created: ago(300) },
        ],
      },
    }),
  },
  {
    id: 'dockerfile-arg',
    title: 'Build token qayerda qoldi?',
    category: 'linux',
    level: 1,
    description:
      "Quyidagi Dockerfile `docker build --build-arg NPM_TOKEN=... .` bilan qurilgan. Dasturchi tokenni ARG qilib berdi va \"ENV emas, demak image'da qolmaydi\" deb o'yladi. Qaysi qatorning qatlami `docker history` da tokenni ochiq ko'rsatib qo'yadi?\n\nFlag formati: `flag{qator_raqami}`",
    data: ['1  FROM node:20.18-bookworm-slim', '2  ARG NPM_TOKEN', '3  WORKDIR /app', '4  COPY package.json package-lock.json ./', '5  ENV NODE_ENV=production', '6  RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && npm ci && rm .npmrc', '7  COPY . .', '8  USER node', '9  CMD ["node", "server.js"]'].join('\n'),
    hints: [
      "ARG qiymati o'zi qatlam yaratmaydi, lekin uni ishlatgan RUN qatlamining tarixida `|1 NPM_TOKEN=...` ko'rinishida yoziladi.",
      "`rm .npmrc` fayldan xalos qiladi, ammo history yozuvidan emas. To'g'ri yo'l: BuildKit secret (`RUN --mount=type=secret`).",
    ],
    flagHash: '08991fadbf3e7a',
  },
];
