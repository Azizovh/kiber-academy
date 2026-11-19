import type { Lab } from '../types';
import type { ContainerSpec, ImageSpec } from '../../engine/terminal/docker';
import type { K8sSpec, KPod } from '../../engine/terminal/kube';
import { fileAt } from './helpers';

/*
 * Container labs: a Docker host (docker, trivy, hadolint) and a Kubernetes cluster (kubectl). Times are relative
 * to the lab's "now", 18 Nov 2026 09:00 UTC.
 */

const HOME = '/home/talaba';
const NOW = Date.UTC(2026, 10, 18, 9, 0, 0);
const ago = (h: number) => NOW - h * 3600_000;
const hex = (seed: string) => Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(seed.charCodeAt(i % seed.length) * (i + 3)) % 16]).join('');

/* ── shared images ── */

const nginx: ImageSpec = {
  repo: 'nginx', tag: '1.27', id: hex('nginx127'), created: ago(24 * 30), size: '192MB', os: 'debian 12.8', exposed: ['80/tcp'],
  cmd: ['nginx', '-g', 'daemon off;'],
  layers: [{ by: 'ADD file:4b1f... in / ', size: '74.8MB' }, { by: 'ENV NGINX_VERSION=1.27.3', size: '0B' }, { by: 'RUN /bin/sh -c set -x && apt-get update && apt-get install -y nginx # buildkit', size: '117MB' }, { by: 'EXPOSE map[80/tcp:{}]', size: '0B' }, { by: 'CMD ["nginx" "-g" "daemon off;"]', size: '0B' }],
  fs: { etc: { nginx: { 'nginx.conf': 'user nginx;\nworker_processes auto;\n' } }, usr: { share: { nginx: { html: { 'index.html': '<h1>Welcome to nginx!</h1>\n' } } } }, var: { cache: { nginx: {} }, log: { nginx: {} } }, root: {}, tmp: {} },
};
const postgres: ImageSpec = {
  repo: 'postgres', tag: '16', id: hex('postgres16'), created: ago(24 * 40), size: '432MB', os: 'debian 12.8', user: '', exposed: ['5432/tcp'], env: ['PGDATA=/var/lib/postgresql/data'],
  layers: [{ by: 'ADD file:7d2a... in / ', size: '74.8MB' }, { by: 'RUN /bin/sh -c apt-get install -y postgresql-16 # buildkit', size: '357MB' }, { by: 'ENV PGDATA=/var/lib/postgresql/data', size: '0B' }, { by: 'USER postgres', size: '0B' }],
  fs: { var: { lib: { postgresql: { data: { PG_VERSION: '16\n' } } } }, root: {}, tmp: {} },
};
const redis: ImageSpec = {
  repo: 'redis', tag: '7.2', id: hex('redis72'), created: ago(24 * 35), size: '117MB', os: 'debian 12.8', exposed: ['6379/tcp'], cmd: ['redis-server'],
  layers: [{ by: 'ADD file:9c1e... in / ', size: '74.8MB' }, { by: 'RUN /bin/sh -c apt-get install -y redis # buildkit', size: '42MB' }, { by: 'CMD ["redis-server"]', size: '0B' }],
  fs: { data: {}, root: {}, tmp: {} },
};

/* ── 1. Docker basics on the Qaydnoma host ─────────────────────────────── */

const api23: ImageSpec = {
  repo: 'qaydnoma-api', tag: '2.3', id: hex('qapi23'), created: ago(50), size: '218MB', os: 'debian 12.8', user: 'node', workdir: '/app', exposed: ['3000/tcp'],
  env: ['PATH=/usr/local/bin:/usr/bin:/bin', 'NODE_ENV=production', 'PORT=3000'], cmd: ['node', 'server.js'],
  layers: [
    { by: 'FROM node:20-bookworm-slim', size: '0B' },
    { by: 'WORKDIR /app', size: '0B' },
    { by: 'COPY package.json package-lock.json ./ # buildkit', size: '412kB' },
    { by: 'RUN /bin/sh -c npm ci --omit=dev # buildkit', size: '38.6MB' },
    { by: 'COPY . . # buildkit', size: '2.1MB' },
    { by: 'USER node', size: '0B' },
    { by: 'EXPOSE map[3000/tcp:{}]', size: '0B' },
    { by: 'CMD ["node" "server.js"]', size: '0B' },
  ],
  fs: { app: { 'server.js': "require('./src/app').listen(3000)\n", 'migrate.js': "require('./src/db').migrate()\n", 'package.json': '{"name":"qaydnoma-api","version":"2.3.0"}\n', src: { 'app.js': '// express app\n', 'db.js': '// pg client\n' }, node_modules: {} }, home: { node: {} }, tmp: {} },
};

const basicsContainers: ContainerSpec[] = [
  { id: hex('web-c'), name: 'web', image: 'nginx:1.27', status: 'running', created: ago(30), started: ago(30), command: 'nginx -g daemon off;', ports: [{ hostPort: 80, port: 80 }], procs: [{ pid: 1, user: 'root', cmd: 'nginx: master process nginx -g daemon off;' }, { pid: 29, user: 'nginx', cmd: 'nginx: worker process' }, { pid: 30, user: 'nginx', cmd: 'nginx: worker process' }], cpu: 0.4, memUsage: 9.8, ip: '172.17.0.2',
    logs: ['10.10.20.31 - - [18/Nov/2026:08:41:02 +0000] "GET / HTTP/1.1" 200 615', '10.10.20.31 - - [18/Nov/2026:08:41:03 +0000] "GET /favicon.ico HTTP/1.1" 404 153', '10.10.20.44 - - [18/Nov/2026:08:52:17 +0000] "GET /api/notes HTTP/1.1" 200 2048', '10.10.20.44 - - [18/Nov/2026:08:52:19 +0000] "POST /api/notes HTTP/1.1" 201 87', '10.10.20.31 - - [18/Nov/2026:08:58:40 +0000] "GET /api/health HTTP/1.1" 200 15'].join('\n') + '\n',
    diff: ['C /var', 'C /var/cache', 'C /var/cache/nginx', 'A /var/cache/nginx/client_temp', 'A /var/cache/nginx/proxy_temp', 'C /run', 'A /run/nginx.pid'] },
  { id: hex('api-c'), name: 'api', image: 'qaydnoma-api:2.3', status: 'running', created: ago(30), started: ago(30), command: 'node server.js', user: 'node', env: ['DATABASE_URL=postgres://qaydnoma@db:5432/qaydnoma', 'REDIS_URL=redis://cache:6379'], ports: [{ host: '127.0.0.1', hostPort: 3000, port: 3000 }], procs: [{ pid: 1, user: 'node', cmd: 'node server.js', cpu: 3.1 }], cpu: 3.12, memUsage: 141.5, ip: '172.17.0.3',
    logs: ['qaydnoma-api 2.3.0 listening on :3000', 'connected to postgres at db:5432', 'connected to redis at cache:6379', 'GET /api/notes 200 18ms', 'POST /api/notes 201 25ms', 'GET /api/health 200 1ms'].join('\n') + '\n' },
  { id: hex('db-c'), name: 'db', image: 'postgres:16', status: 'running', created: ago(30 * 24), started: ago(30), command: 'docker-entrypoint.sh postgres', user: 'postgres', mounts: [{ type: 'volume', source: 'pgdata', destination: '/var/lib/postgresql/data' }], procs: [{ pid: 1, user: 'postgres', cmd: 'postgres' }, { pid: 61, user: 'postgres', cmd: 'postgres: checkpointer' }, { pid: 62, user: 'postgres', cmd: 'postgres: background writer' }, { pid: 64, user: 'postgres', cmd: 'postgres: walwriter' }], cpu: 0.9, memUsage: 86.2, ip: '172.17.0.4',
    logs: '2026-11-18 03:00:01.120 UTC [1] LOG:  database system is ready to accept connections\n2026-11-18 08:30:00.004 UTC [61] LOG:  checkpoint complete\n' },
  { id: hex('cache-c'), name: 'cache', image: 'redis:7.2', status: 'running', created: ago(30 * 24), started: ago(30), command: 'redis-server', procs: [{ pid: 1, user: 'redis', cmd: 'redis-server *:6379' }], cpu: 0.2, memUsage: 4.1, ip: '172.17.0.5', logs: '1:M 18 Nov 2026 03:00:01.004 * Ready to accept connections tcp\n' },
  { id: hex('migrate-c'), name: 'migrate', image: 'qaydnoma-api:2.3', status: 'exited', exitCode: 0, created: ago(30.1), started: ago(30.1), finished: ago(30), command: 'node migrate.js', logs: 'running migrations...\n3 migrations applied\ndone\n' },
  { id: hex('oldapi-c'), name: 'old-api', image: 'qaydnoma-api:2.3', status: 'exited', exitCode: 1, created: ago(52), started: ago(52), finished: ago(51.9), command: 'node server.js', logs: 'qaydnoma-api 2.3.0 starting\nError: connect ECONNREFUSED 172.17.0.4:5432\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)\nprocess exited with code 1\n' },
];

export const dockerBasics: Lab = {
  id: 'docker-asoslari',
  title: 'Docker asoslari: konteynerlar bilan tanishuv',
  summary: "Docker buyruqlari: konteynerlar va image'lar ro'yxati, filtr va format, loglar, inspect va Go shablonlari, portlar, jarayonlar, konteyner ichida buyruq, image tarixi, to'xtatish, o'chirish va ishga tushirish.",
  minutes: 45,
  level: 1,
  intro:
    "`docker-01` serverida Qaydnoma ilovasi konteynerlarda ishlaydi: `web` (nginx), `api` (Node.js), `db` (PostgreSQL), `cache` (Redis). Siz `docker` guruhidasiz — buyruqlarni sudo'siz bera olasiz (bu guruh amalda root huquqiga teng: buni keyingi labda ko'rasiz).\n\n" +
    "Ikki asosiy tushuncha: **image** — tayyor qolip (dastur va uning muhiti, qatlamlar bilan), **konteyner** — image'dan ishga tushirilgan nusxa. Bitta image'dan bir nechta konteyner bo'lishi mumkin.\n\n" +
    "Konteynerga nom yoki ID ning boshi bilan murojaat qilinadi: `docker logs api` yoki `docker logs 3f2a`.",
  shell: () => ({ host: 'docker-01', fs: { home: { talaba: {} }, tmp: {} }, docker: { images: [nginx, api23, postgres, redis], containers: basicsContainers, volumes: ['pgdata'] } }),
  tasks: [
    {
      id: 'version',
      teach: ['docker'],
      text: 'Docker o\'rnatilganmi va qaysi versiya?',
      hint: '`docker version` — Client (siz yozadigan buyruq) va Server (Docker Engine, konteynerlarni ishlatadigan xizmat).',
      solution: ['docker version'],
      check: ({ output }) => output.includes('Server: Docker Engine'),
    },
    {
      id: 'ps',
      teach: ['docker ps'],
      text: 'Qaysi konteynerlar ishlab turibdi?',
      hint: '`docker ps` — CONTAINER ID, IMAGE, STATUS (Up — ishlayapti), PORTS, NAMES.',
      solution: ['docker ps'],
      check: ({ line, output }) => /^docker ps$/.test(line.trim()) && output.includes(' web') && !output.includes('old-api'),
    },
    {
      id: 'ps-a',
      text: "To'xtagan konteynerlar ham bormi? Hammasini ko'rsating.",
      hint: '`docker ps -a` — Exited (0): ishini tugatgan, Exited (1): xato bilan to\'xtagan.',
      solution: ['docker ps -a'],
      check: ({ output }) => output.includes('Exited (0)') && output.includes('Exited (1)'),
    },
    {
      id: 'filter',
      teach: ['docker ps --filter'],
      text: 'Faqat to\'xtagan (exited) konteynerlarni chiqaring.',
      hint: '`docker ps -a --filter status=exited`',
      solution: ['docker ps -a --filter status=exited'],
      check: ({ output }) => output.includes('migrate') && output.includes('old-api') && !output.includes(' web'),
    },
    {
      id: 'format',
      teach: ['docker ps --format'],
      text: 'Ishlayotgan konteynerlarning faqat nomi va image\'ini ikki ustun qilib chiqaring.',
      hint: "`docker ps --format '{{.Names}}\\t{{.Image}}'` — {{.Maydon}}: Go shablon, \\t: Tab.",
      solution: ["docker ps --format '{{.Names}}\\t{{.Image}}'"],
      check: ({ output }) => output.split('\n').includes('api\tqaydnoma-api:2.3') && output.split('\n').length === 4,
    },
    {
      id: 'images',
      teach: ['docker images'],
      text: "Serverda qaysi image'lar bor?",
      hint: '`docker images` — REPOSITORY:TAG — image nomi va versiyasi.',
      solution: ['docker images'],
      check: ({ output }) => output.includes('qaydnoma-api') && output.includes('postgres'),
    },
    {
      id: 'logs',
      teach: ['docker logs'],
      text: '`api` konteynerining loglarini o\'qing.',
      hint: '`docker logs api`',
      solution: ['docker logs api'],
      check: ({ output }) => output.includes('listening on :3000'),
    },
    {
      id: 'tail',
      text: "`web` (nginx) ning oxirgi 2 ta so'rovini ko'ring.",
      hint: '`docker logs --tail 2 web`',
      solution: ['docker logs --tail 2 web'],
      check: ({ line, output }) => /--tail/.test(line) && output.split('\n').length === 2 && output.includes('/api/health'),
    },
    {
      id: 'crash',
      text: '`old-api` nima uchun to\'xtagan? Loglaridan sababini toping.',
      hint: '`docker logs old-api` — ECONNREFUSED: ma\'lumotlar bazasi hali tayyor emas edi.',
      solution: ['docker logs old-api'],
      check: ({ output }) => output.includes('ECONNREFUSED'),
    },
    {
      id: 'inspect',
      teach: ['docker inspect'],
      text: "`db` konteynerining to'liq sozlamasini ko'ring: ma'lumotlar qayerda saqlanadi?",
      hint: '`docker inspect db` — Mounts bo\'limida `pgdata` volume\'i: konteyner o\'chsa ham ma\'lumot qoladi.',
      solution: ['docker inspect db'],
      check: ({ output }) => output.includes('"Mounts"') && output.includes('pgdata'),
    },
    {
      id: 'inspect-f',
      teach: ['docker inspect -f'],
      text: "JSON'dan faqat kerakli maydonni oling: `old-api` ning holati va chiqish kodi.",
      hint: "`docker inspect -f '{{.State.Status}} {{.State.ExitCode}}' old-api`",
      solution: ["docker inspect -f '{{.State.Status}} {{.State.ExitCode}}' old-api"],
      check: ({ output }) => output.trim() === 'exited 1',
    },
    {
      id: 'ip',
      text: '`api` konteynerining ichki IP manzili qanday?',
      hint: "`docker inspect -f '{{.NetworkSettings.IPAddress}}' api`",
      solution: ["docker inspect -f '{{.NetworkSettings.IPAddress}}' api"],
      check: ({ output }) => output.trim() === '172.17.0.3',
    },
    {
      id: 'port',
      teach: ['docker port'],
      text: '`api` qaysi portda va qaysi interfeysda ochilgan?',
      hint: '`docker port api` — 127.0.0.1: faqat serverning o\'zidan kirish mumkin (to\'g\'ri sozlama). `web` esa 0.0.0.0 — hammaga.',
      solution: ['docker port api'],
      check: ({ output }) => output.trim() === '3000/tcp -> 127.0.0.1:3000',
    },
    {
      id: 'top',
      teach: ['docker top'],
      text: '`db` konteyneri ichida qanday jarayonlar ishlayapti?',
      hint: '`docker top db`',
      solution: ['docker top db'],
      check: ({ output }) => output.includes('postgres: checkpointer'),
    },
    {
      id: 'stats',
      teach: ['docker stats --no-stream'],
      text: "Qaysi konteyner eng ko'p xotira ishlatmoqda?",
      hint: '`docker stats --no-stream`',
      solution: ['docker stats --no-stream'],
      check: ({ output }) => output.includes('MEM USAGE / LIMIT') && output.includes('141.50MiB'),
    },
    {
      id: 'exec',
      teach: ['docker exec'],
      text: '`api` konteyneri ichida `/app` papkasida nimalar borligini ko\'ring.',
      hint: '`docker exec api ls /app`',
      solution: ['docker exec api ls /app'],
      check: ({ output }) => output.includes('server.js') && output.includes('package.json'),
    },
    {
      id: 'whoami',
      text: '`api` konteyneri ichida dastur qaysi foydalanuvchi nomidan ishlaydi?',
      hint: '`docker exec api whoami` — node: root emas, bu yaxshi.',
      solution: ['docker exec api whoami'],
      check: ({ output }) => output.trim() === 'node',
    },
    {
      id: 'env',
      text: '`api` konteynerining muhit o\'zgaruvchilarini ko\'ring: u bazaga qanday ulanadi?',
      hint: '`docker exec api env` — DATABASE_URL.',
      solution: ['docker exec api env'],
      check: ({ output }) => output.includes('DATABASE_URL=postgres://qaydnoma@db:5432/qaydnoma'),
    },
    {
      id: 'history',
      teach: ['docker history'],
      text: "`qaydnoma-api:2.3` image'i qanday qurilgan? Qatlamlarini ko'ring.",
      hint: '`docker history qaydnoma-api:2.3` — har qator Dockerfile\'dagi bitta buyruq (eng yangisi tepada).',
      solution: ['docker history qaydnoma-api:2.3'],
      check: ({ output }) => output.includes('USER node') && output.includes('npm ci'),
    },
    {
      id: 'diff',
      teach: ['docker diff'],
      text: "`web` konteynerida image'ga nisbatan qaysi fayllar o'zgargan?",
      hint: "`docker diff web` — A: qo'shilgan, C: o'zgargan. nginx keshi va PID fayli — normal.",
      solution: ['docker diff web'],
      check: ({ output }) => output.includes('A /run/nginx.pid'),
    },
    {
      id: 'stop',
      teach: ['docker stop / start / restart'],
      text: "`cache` konteynerini to'xtating, keyin qayta ishga tushiring.",
      hint: '`docker stop cache`, keyin `docker start cache`',
      solution: ['docker stop cache', 'docker start cache'],
      check: ({ lines, state }) => lines.some((l) => /^docker stop cache/.test(l)) && state.docker!.containers.find((c) => c.name === 'cache')?.status === 'running',
    },
    {
      id: 'rm',
      teach: ['docker rm'],
      text: "Endi kerak bo'lmagan to'xtagan konteynerlarni (`migrate`, `old-api`) o'chiring.",
      hint: '`docker rm migrate old-api`',
      solution: ['docker rm migrate old-api'],
      check: ({ state }) => !state.docker!.containers.some((c) => c.name === 'migrate' || c.name === 'old-api'),
    },
    {
      id: 'run',
      teach: ['docker run'],
      text: "nginx:1.27 dan `web2` nomli yangi konteyner ishga tushiring: fonda, faqat serverning o'zidan 8081-port orqali (konteynerdagi 80-port).",
      hint: '`docker run -d --name web2 -p 127.0.0.1:8081:80 nginx:1.27`',
      solution: ['docker run -d --name web2 -p 127.0.0.1:8081:80 nginx:1.27'],
      check: ({ state }) => {
        const c = state.docker!.containers.find((x) => x.name === 'web2');
        return !!c && c.status === 'running' && c.image === 'nginx:1.27' && c.ports?.[0]?.host === '127.0.0.1' && c.ports[0].hostPort === 8081 && c.ports[0].port === 80;
      },
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: barcha konteynerlarning (to'xtaganlari ham) nomi va holatini `~/holat.txt` ga yozing — har qatorda `NOM HOLAT`.",
      hint: "`docker ps` ning hammani ko'rsatuvchi flagi, Go shablonda ikki maydon va `>` bilan faylga.",
      solution: ["docker ps -a --format '{{.Names}} {{.Status}}' > ~/holat.txt"],
      check: ({ state }) => {
        const t = fileAt(state, `${HOME}/holat.txt`) ?? '';
        return ['web2 Up', 'api Up', 'db Up', 'cache Up', 'web Up'].every((s) => t.split('\n').some((l) => l.startsWith(s)));
      },
    },
  ],
};

/* ── 2. Container security audit ───────────────────────────────────────── */

const NPM_TOKEN = 'npm_LAB0example0token0do0not0use00';
const DOCKERFILE_BAD = [
  'FROM node:latest',
  'ARG NPM_TOKEN',
  'ENV SECRET_KEY=dev-9f3k2-secret DB_PASSWORD=Qaydnoma2026!',
  'ADD . /app',
  'WORKDIR /app',
  'RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && npm install',
  'RUN apt-get update && apt-get install -y curl',
  'USER root',
  'EXPOSE 8080',
  'CMD node server.js',
].join('\n') + '\n';
const DOCKERFILE_GOOD = [
  'FROM node:20.18-bookworm-slim',
  'WORKDIR /app',
  'COPY package.json package-lock.json ./',
  'RUN npm ci --omit=dev',
  'COPY . .',
  'USER node',
  'EXPOSE 8080',
  'CMD ["node", "server.js"]',
].join('\n') + '\n';

const webLatest: ImageSpec = {
  repo: 'qaydnoma-web', tag: 'latest', id: hex('qweblatest'), created: ago(24 * 9), size: '1.12GB', os: 'debian 12.1', user: '', workdir: '/app', exposed: ['8080/tcp'],
  env: ['PATH=/usr/local/bin:/usr/bin:/bin', 'SECRET_KEY=dev-9f3k2-secret', 'DB_PASSWORD=Qaydnoma2026!'], cmd: ['/bin/sh', '-c', 'node server.js'],
  layers: [
    { by: 'FROM node:latest', size: '0B' },
    { by: 'ARG NPM_TOKEN', size: '0B' },
    { by: 'ENV SECRET_KEY=dev-9f3k2-secret DB_PASSWORD=Qaydnoma2026!', size: '0B' },
    { by: 'ADD . /app # buildkit', size: '48.2MB' },
    { by: 'WORKDIR /app', size: '0B' },
    { by: `RUN |1 NPM_TOKEN=${NPM_TOKEN} /bin/sh -c echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc && npm install # buildkit`, size: '212MB' },
    { by: 'RUN /bin/sh -c apt-get update && apt-get install -y curl # buildkit', size: '61.4MB' },
    { by: 'USER root', size: '0B' },
    { by: 'EXPOSE map[8080/tcp:{}]', size: '0B' },
    { by: 'CMD ["/bin/sh" "-c" "node server.js"]', size: '0B' },
  ],
  vulns: [
    { lib: 'libc6', id: 'CVE-2023-4911', severity: 'HIGH', installed: '2.36-9+deb12u1', fixed: '2.36-9+deb12u3', title: 'glibc: buffer overflow in ld.so leading to privilege escalation' },
    { lib: 'libc6', id: 'CVE-2019-1010022', severity: 'LOW', installed: '2.36-9+deb12u1', title: 'glibc: stack guard protection bypass' },
    { lib: 'libnghttp2-14', id: 'CVE-2023-44487', severity: 'HIGH', installed: '1.52.0-1', fixed: '1.52.0-1+deb12u1', title: 'HTTP/2: Multiple HTTP/2 enabled web servers are vulnerable to a DDoS attack (Rapid Reset Attack)' },
    { lib: 'lodash (package.json)', id: 'CVE-2021-23337', severity: 'HIGH', installed: '4.17.20', fixed: '4.17.21', title: 'nodejs-lodash: command injection via template' },
    { lib: 'minimist (package.json)', id: 'CVE-2021-44906', severity: 'CRITICAL', installed: '1.2.5', fixed: '1.2.6', title: 'minimist: prototype pollution' },
  ],
  secrets: [
    { file: '/app/.env', line: 3, rule: 'aws-access-key-id', title: 'AWS Access Key ID', severity: 'CRITICAL', text: 'AWS_ACCESS_KEY_ID=AKIALAB0EXAMPLE00000', layer: 'ADD . /app # buildkit' },
    { file: '/app/.npmrc', line: 1, rule: 'npm-access-token', title: 'NPM access token', severity: 'CRITICAL', text: `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`, layer: 'RUN |1 NPM_TOKEN=... /bin/sh -c echo ... > .npmrc && npm install # buildkit' },
  ],
  fs: { app: { 'server.js': '// qaydnoma web\n', '.env': 'NODE_ENV=production\nSECRET_KEY=dev-9f3k2-secret\nAWS_ACCESS_KEY_ID=AKIALAB0EXAMPLE00000\n', '.npmrc': `//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n` }, var: { run: { 'docker.sock': '' } }, root: {}, tmp: {} },
};

const web20: ImageSpec = {
  repo: 'qaydnoma-web', tag: '2.0', id: hex('qweb20'), created: ago(20), size: '231MB', os: 'debian 12.8', user: 'node', workdir: '/app', exposed: ['8080/tcp'],
  env: ['PATH=/usr/local/bin:/usr/bin:/bin', 'NODE_ENV=production'], cmd: ['node', 'server.js'],
  layers: [{ by: 'FROM node:20.18-bookworm-slim', size: '0B' }, { by: 'WORKDIR /app', size: '0B' }, { by: 'COPY package.json package-lock.json ./ # buildkit', size: '388kB' }, { by: 'RUN /bin/sh -c npm ci --omit=dev # buildkit', size: '31.2MB' }, { by: 'COPY . . # buildkit', size: '1.9MB' }, { by: 'USER node', size: '0B' }, { by: 'EXPOSE map[8080/tcp:{}]', size: '0B' }, { by: 'CMD ["node" "server.js"]', size: '0B' }],
  vulns: [{ lib: 'libc6', id: 'CVE-2019-1010022', severity: 'LOW', installed: '2.36-9+deb12u9', title: 'glibc: stack guard protection bypass' }],
  fs: { app: { 'server.js': '// qaydnoma web\n' }, home: { node: {} }, tmp: {} },
};

const reports: ImageSpec = {
  repo: 'reports-svc', tag: '1.0', id: hex('reports10'), created: ago(24 * 400), size: '486MB', os: 'debian 11.2', user: 'app', exposed: ['8090/tcp'], cmd: ['java', '-jar', '/opt/reports.jar'],
  layers: [{ by: 'FROM eclipse-temurin:11-jre', size: '0B' }, { by: 'COPY reports.jar /opt/reports.jar # buildkit', size: '64.3MB' }, { by: 'USER app', size: '0B' }, { by: 'CMD ["java" "-jar" "/opt/reports.jar"]', size: '0B' }],
  vulns: [
    { lib: 'org.apache.logging.log4j:log4j-core (reports.jar)', id: 'CVE-2021-44228', severity: 'CRITICAL', installed: '2.14.1', fixed: '2.15.0, 2.3.1, 2.12.2', title: 'log4j-core: Remote code execution in Log4j 2.x when logs contain an attacker-controlled string value' },
    { lib: 'org.apache.logging.log4j:log4j-core (reports.jar)', id: 'CVE-2021-45046', severity: 'CRITICAL', installed: '2.14.1', fixed: '2.16.0, 2.12.2', title: 'log4j-core: DoS in log4j 2.x with thread context message pattern and context lookup pattern (incomplete fix for CVE-2021-44228)' },
    { lib: 'org.apache.commons:commons-text (reports.jar)', id: 'CVE-2022-42889', severity: 'CRITICAL', installed: '1.9', fixed: '1.10.0', title: 'apache-commons-text: variable interpolation RCE' },
    { lib: 'openssl', id: 'CVE-2022-0778', severity: 'HIGH', installed: '1.1.1k-1+deb11u1', fixed: '1.1.1n-0+deb11u1', title: 'openssl: Infinite loop in BN_mod_sqrt() reachable when parsing certificates' },
  ],
  fs: { opt: { 'reports.jar': 'PK\n' }, home: { app: {} }, tmp: {} },
};

const exporter: ImageSpec = {
  repo: 'node-exporter', tag: '1.8', id: hex('nodeexp18'), created: ago(24 * 60), size: '23.1MB', os: 'busybox 1.36', user: 'nobody', exposed: ['9100/tcp'], cmd: ['/bin/node_exporter'],
  layers: [{ by: 'FROM quay.io/prometheus/busybox', size: '0B' }, { by: 'COPY node_exporter /bin/node_exporter # buildkit', size: '19.8MB' }, { by: 'USER nobody', size: '0B' }],
  fs: { bin: {}, tmp: {} },
};

const auditContainers: ContainerSpec[] = [
  { id: hex('portal-c'), name: 'portal', image: 'qaydnoma-web:latest', status: 'running', created: ago(24 * 9), started: ago(24 * 2), command: '/bin/sh -c node server.js', privileged: true, ports: [{ hostPort: 8080, port: 8080 }], mounts: [{ type: 'bind', source: '/var/run/docker.sock', destination: '/var/run/docker.sock' }], procs: [{ pid: 1, user: 'root', cmd: '/bin/sh -c node server.js' }, { pid: 7, user: 'root', cmd: 'node server.js', cpu: 4 }], cpu: 4.2, memUsage: 322, logs: 'qaydnoma-web listening on 8080\n' },
  { id: hex('reports-c'), name: 'reports', image: 'reports-svc:1.0', status: 'running', created: ago(24 * 120), started: ago(24 * 2), command: 'java -jar /opt/reports.jar', ports: [{ host: '127.0.0.1', hostPort: 8090, port: 8090 }], memory: 1024 ** 3, pidsLimit: 300, procs: [{ pid: 1, user: 'app', cmd: 'java -jar /opt/reports.jar', cpu: 6 }], cpu: 6.1, memUsage: 612, logs: 'Started ReportsApplication in 6.2 seconds\n' },
  { id: hex('metrics-c'), name: 'metrics', image: 'node-exporter:1.8', status: 'running', created: ago(24 * 60), started: ago(24 * 2), command: '/bin/node_exporter', network: 'host', capAdd: ['SYS_ADMIN', 'NET_ADMIN'], procs: [{ pid: 1, user: 'nobody', cmd: '/bin/node_exporter' }], cpu: 0.8, memUsage: 18, logs: 'Listening on :9100\n' },
  { id: hex('redis-c'), name: 'redis', image: 'redis:7.2', status: 'running', created: ago(24 * 30), started: ago(24 * 2), command: 'redis-server --protected-mode no', ports: [{ hostPort: 6379, port: 6379 }], procs: [{ pid: 1, user: 'redis', cmd: 'redis-server *:6379' }], cpu: 0.3, memUsage: 6, logs: '1:C 16 Nov 2026 09:00:00.001 # WARNING: protected mode is disabled and no password is set. Redis is reachable from any network.\n1:M 16 Nov 2026 09:00:00.003 * Ready to accept connections tcp\n' },
];

export const containerAudit: Lab = {
  id: 'konteyner-auditi',
  title: 'Konteyner xavfsizligi auditi: image, sozlama va tuzatish',
  summary: "Konteynerlarni xavfsizlik bo'yicha tekshirish va tuzatish: root foydalanuvchi, privileged, docker.sock, host tarmog'i va capability'lar, resurs chegaralari, image'dagi sirlar (inspect, history, trivy), zaifliklar, hadolint, xavfsiz qayta ishga tushirish.",
  minutes: 55,
  level: 2,
  intro:
    "`docker-02` — Qaydnoma'ning eski serveri. Unda to'rtta konteyner bor: `portal` (veb-ilova), `reports` (Java hisobot xizmati), `metrics` (node-exporter) va `redis`. Ular kim tomonidan va qanday ishga tushirilgani noma'lum — sizdan audit so'ralgan.\n\n" +
    "Konteyner — izolyatsiya, lekin **qamoq emas**: root foydalanuvchi, `--privileged`, ulangan `docker.sock`, `--network host` yoki ortiqcha capability'lar izolyatsiyani amalda yo'q qiladi. Image ichidagi sirlar esa uni olgan har kimga ko'rinadi.\n\n" +
    "`~/portal/Dockerfile` — `portal` image'ining Dockerfile'i, `~/portal/Dockerfile.yangi` — tuzatilgan varianti; undan qurilgan `qaydnoma-web:2.0` image'i serverda bor.",
  shell: () => ({
    host: 'docker-02',
    fs: { home: { talaba: { portal: { Dockerfile: DOCKERFILE_BAD, 'Dockerfile.yangi': DOCKERFILE_GOOD } } }, tmp: {} },
    docker: { images: [webLatest, web20, reports, exporter, redis], containers: auditContainers },
  }),
  tasks: [
    {
      id: 'ports',
      text: 'Qaysi konteynerlar qaysi portlarni ochgan? Nom va portlarni chiqaring.',
      hint: "`docker ps --format '{{.Names}}\\t{{.Ports}}'` — 0.0.0.0: tarmoqdagi hammaga ochiq, 127.0.0.1: faqat serverning o'ziga.",
      solution: ["docker ps --format '{{.Names}}\\t{{.Ports}}'"],
      check: ({ output }) => output.includes('redis\t0.0.0.0:6379->6379/tcp') && output.includes('reports\t127.0.0.1:8090->8090/tcp'),
    },
    {
      id: 'users',
      text: "Har bir konteyner ichida dastur qaysi foydalanuvchi nomidan ishlaydi va privileged rejimdami? To'rttasini bitta buyruqda tekshiring.",
      hint: "`docker inspect -f '{{.Name}} user={{.Config.User}} privileged={{.HostConfig.Privileged}}' portal reports metrics redis` — bo'sh user = root.",
      solution: ["docker inspect -f '{{.Name}} user={{.Config.User}} privileged={{.HostConfig.Privileged}}' portal reports metrics redis"],
      check: ({ output }) => output.includes('/portal user= privileged=true') && output.includes('/reports user=app privileged=false'),
    },
    {
      id: 'sock',
      text: '`portal` ga xostdan qanday fayl yoki papkalar ulangan?',
      hint: "`docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{end}}' portal` — docker.sock: konteyner Docker'ni boshqara oladi, ya'ni butun xostni.",
      solution: ["docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{end}}' portal"],
      check: ({ output }) => output.trim() === '/var/run/docker.sock -> /var/run/docker.sock',
    },
    {
      id: 'host-net',
      text: '`metrics` qaysi tarmoq rejimida va qanday qo\'shimcha imkoniyatlar (capabilities) bilan ishlaydi?',
      hint: "`docker inspect -f '{{.HostConfig.NetworkMode}} {{.HostConfig.CapAdd}}' metrics` — host: xost tarmog'ining o'zi; SYS_ADMIN — deyarli root.",
      solution: ["docker inspect -f '{{.HostConfig.NetworkMode}} {{.HostConfig.CapAdd}}' metrics"],
      check: ({ output }) => output.trim() === 'host [SYS_ADMIN NET_ADMIN]',
    },
    {
      id: 'limits',
      text: "Resurs chegaralari bormi? Har konteynerning xotira (Memory) va jarayonlar (PidsLimit) chegarasini chiqaring.",
      hint: "`docker inspect -f '{{.Name}} mem={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}}' portal reports metrics redis` — 0 va <nil>: chegarasiz.",
      solution: ["docker inspect -f '{{.Name}} mem={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}}' portal reports metrics redis"],
      check: ({ output }) => output.includes('/portal mem=0 pids=<nil>') && output.includes('/reports mem=1073741824 pids=300'),
    },
    {
      id: 'env',
      text: "`portal` ning muhit o'zgaruvchilarida sirlar bormi?",
      hint: "`docker inspect -f '{{json .Config.Env}}' portal` — SECRET_KEY va DB_PASSWORD: inspect huquqi bor har kim ko'radi.",
      solution: ["docker inspect -f '{{json .Config.Env}}' portal"],
      check: ({ output }) => output.includes('DB_PASSWORD=Qaydnoma2026!'),
    },
    {
      id: 'history',
      teach: ['docker history'],
      text: "Image qatlamlarini to'liq (qisqartirmasdan) ko'ring: build paytidagi token ham iz qoldirganmi?",
      hint: '`docker history --no-trunc qaydnoma-web:latest` — ARG qiymati RUN qatorida ochiq ko\'rinadi (`|1 NPM_TOKEN=...`).',
      solution: ['docker history --no-trunc qaydnoma-web:latest'],
      check: ({ output }) => output.includes(`NPM_TOKEN=${NPM_TOKEN}`),
    },
    {
      id: 'trivy-secret',
      teach: ['trivy', 'trivy --scanners'],
      text: "trivy bilan image fayllari ichidagi sirlarni qidiring.",
      hint: '`trivy image --scanners secret qaydnoma-web:latest` — `.env` dagi AWS kaliti va `.npmrc` dagi token (trivy ularni yulduzcha bilan yashiradi).',
      solution: ['trivy image --scanners secret qaydnoma-web:latest'],
      check: ({ output }) => output.includes('/app/.env (secrets)') && output.includes('npm-access-token'),
    },
    {
      id: 'trivy-crit',
      teach: ['trivy --severity'],
      text: "`reports-svc:1.0` da qanday kritik zaifliklar bor?",
      hint: '`trivy image --severity CRITICAL --scanners vuln reports-svc:1.0` — CVE-2021-44228: mashhur Log4Shell.',
      solution: ['trivy image --severity CRITICAL --scanners vuln reports-svc:1.0'],
      check: ({ output }) => output.includes('CVE-2021-44228') && output.includes('Total: 3') && !output.includes('CVE-2022-0778'),
    },
    {
      id: 'trivy-total',
      text: "`qaydnoma-web:latest` da HIGH va CRITICAL zaifliklar jami nechta? Faqat Total qatorini chiqaring.",
      hint: '`trivy image --severity HIGH,CRITICAL --scanners vuln qaydnoma-web:latest | grep Total`',
      solution: ['trivy image --severity HIGH,CRITICAL --scanners vuln qaydnoma-web:latest | grep Total'],
      check: ({ output }) => output.trim() === 'Total: 4 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 3, CRITICAL: 1)',
    },
    {
      id: 'unfixed',
      teach: ['trivy --ignore-unfixed'],
      text: "Hali tuzatishi chiqmagan zaifliklarni olib tashlab ko'ring — nimani hozir yangilash orqali yopsa bo'ladi?",
      hint: '`trivy image --ignore-unfixed --scanners vuln qaydnoma-web:latest` — Fixed Version ustuni: qaysi versiyaga yangilash kerak.',
      solution: ['trivy image --ignore-unfixed --scanners vuln qaydnoma-web:latest'],
      check: ({ line, output }) => /--ignore-unfixed/.test(line) && output.includes('Total: 4') && !output.includes('CVE-2019-1010022'),
    },
    {
      id: 'hadolint',
      teach: ['hadolint'],
      text: "`portal` ning Dockerfile'ini hadolint bilan tekshiring.",
      hint: '`hadolint portal/Dockerfile` — DL3007 (:latest), DL3020 (ADD), DL3002 (USER root), DL3025 (CMD JSON emas)...',
      solution: ['hadolint portal/Dockerfile'],
      check: ({ output }) => ['DL3007', 'DL3020', 'DL3002', 'DL3025'].every((c) => output.includes(c)),
    },
    {
      id: 'hadolint-new',
      text: "Tuzatilgan `Dockerfile.yangi` ni tekshiring. Sirlar ham endi qayerda?",
      hint: "`hadolint portal/Dockerfile.yangi` — hech narsa chiqmasa: qoidalar bajarilgan. Sirlar Dockerfile'da emas, ishga tushirishda beriladi.",
      solution: ['hadolint portal/Dockerfile.yangi'],
      check: ({ line, output }) => /Dockerfile\.yangi/.test(line) && output.trim() === '',
    },
    {
      id: 'redis-log',
      text: "`redis` loglarida qanday ogohlantirish bor?",
      hint: "`docker logs redis` — parolsiz va himoya rejimisiz, 0.0.0.0 da: tarmoqdagi har kim ma'lumotni o'qiy va o'zgartira oladi.",
      solution: ['docker logs redis'],
      check: ({ output }) => output.includes('protected mode is disabled and no password is set'),
    },
    {
      id: 'whoami',
      text: "`portal` ichida haqiqatan root ekanini va docker.sock borligini tekshiring.",
      hint: '`docker exec portal whoami`, keyin `docker exec portal ls -l /var/run/docker.sock`',
      solution: ['docker exec portal whoami', 'docker exec portal ls -l /var/run/docker.sock'],
      check: ({ lines, output }) => lines.some((l) => l === 'docker exec portal whoami') && output.includes('docker.sock'),
    },
    {
      id: 'redis-fix',
      text: "`redis` ni faqat serverning o'zidan kirish mumkin bo'ladigan qilib qayta yarating: eskisini to'xtatib o'chiring va yangisini 127.0.0.1:6379 da ishga tushiring.",
      hint: '`docker rm -f redis`, keyin `docker run -d --name redis -p 127.0.0.1:6379:6379 redis:7.2`',
      solution: ['docker rm -f redis', 'docker run -d --name redis -p 127.0.0.1:6379:6379 redis:7.2'],
      check: ({ state }) => {
        const c = state.docker!.containers.find((x) => x.name === 'redis');
        return !!c && c.status === 'running' && c.ports?.[0]?.host === '127.0.0.1' && !c.command.includes('protected-mode no');
      },
    },
    {
      id: 'portal-rm',
      text: "Eski `portal` konteynerini to'xtating va o'chiring.",
      hint: '`docker stop portal`, keyin `docker rm portal`',
      solution: ['docker stop portal', 'docker rm portal'],
      check: ({ state }) => !state.docker!.containers.some((c) => c.name === 'portal'),
    },
    {
      id: 'portal-run',
      teach: ['docker run --user', 'docker run --read-only', 'docker run --cap-drop', 'docker run --memory', 'docker run --security-opt'],
      text: "`portal` ni tuzatilgan `qaydnoma-web:2.0` image'idan xavfsiz ishga tushiring: 1000:1000 foydalanuvchi, faqat o'qiladigan fayl tizimi, barcha capability'lar olib tashlangan, no-new-privileges, 512 MB xotira, 200 jarayon, port faqat 127.0.0.1:8080.",
      hint: '`docker run -d --name portal --user 1000:1000 --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --pids-limit 200 -p 127.0.0.1:8080:8080 qaydnoma-web:2.0`',
      solution: ['docker run -d --name portal --user 1000:1000 --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --pids-limit 200 -p 127.0.0.1:8080:8080 qaydnoma-web:2.0'],
      check: ({ state }) => {
        const c = state.docker!.containers.find((x) => x.name === 'portal');
        return !!c && c.image === 'qaydnoma-web:2.0' && c.user === '1000:1000' && !!c.readOnly && !!c.capDrop?.includes('ALL') && !!c.securityOpt?.includes('no-new-privileges') && c.memory === 512 * 1024 ** 2 && c.pidsLimit === 200 && c.ports?.[0]?.host === '127.0.0.1' && !c.privileged && !(c.mounts ?? []).length;
      },
    },
    {
      id: 'verify',
      text: "Yangi `portal` sozlamasini bitta qatorda tekshiring: foydalanuvchi, privileged, faqat o'qish, olib tashlangan capability'lar.",
      hint: "`docker inspect -f '{{.Config.User}} {{.HostConfig.Privileged}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}}' portal`",
      solution: ["docker inspect -f '{{.Config.User}} {{.HostConfig.Privileged}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}}' portal"],
      check: ({ output }) => output.trim() === '1000:1000 false true [ALL]',
    },
    {
      id: 'trivy-new',
      text: "Yangi image'da HIGH yoki CRITICAL zaiflik qoldimi?",
      hint: '`trivy image --severity HIGH,CRITICAL qaydnoma-web:2.0`',
      solution: ['trivy image --severity HIGH,CRITICAL qaydnoma-web:2.0'],
      check: ({ output }) => output.includes('Total: 0') && !output.includes('(secrets)'),
    },
    {
      id: 'rmi',
      teach: ['docker rmi'],
      text: "Sirlar saqlangan eski `qaydnoma-web:latest` image'ini serverdan o'chiring.",
      hint: "`docker rmi qaydnoma-web:latest` — eslatma: image registry'ga yuklangan bo'lsa, u yerdan ham o'chirish va sirlarni almashtirish kerak.",
      solution: ['docker rmi qaydnoma-web:latest'],
      check: ({ state }) => !state.docker!.images.some((i) => i.repo === 'qaydnoma-web' && i.tag === 'latest'),
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: `metrics` ni xavfsiz qayta yarating — host tarmog'isiz, qo'shimcha capability'larsiz (hammasi olib tashlangan), port faqat 127.0.0.1:9100, image o'sha `node-exporter:1.8`.",
      hint: "Eskisini majburan o'chirib, `docker run` ga to'g'ri flaglarni bering.",
      solution: ['docker rm -f metrics', 'docker run -d --name metrics --cap-drop ALL -p 127.0.0.1:9100:9100 node-exporter:1.8'],
      check: ({ state }) => {
        const c = state.docker!.containers.find((x) => x.name === 'metrics');
        return !!c && c.status === 'running' && c.network === 'bridge' && !(c.capAdd ?? []).length && !!c.capDrop?.includes('ALL') && c.ports?.[0]?.host === '127.0.0.1' && c.ports[0].hostPort === 9100;
      },
    },
  ],
};

/* ── 3. Kubernetes incident: a leaked CI token, a miner and too much RBAC ── */

export const K8S_ATTACKER = '203.0.113.140';
const MINER = 'cache-7d9c8f5b6-qw2rt';
const SA = 'system:serviceaccount:prod:ci-bot';

const auditLine = (min: number, verb: string, resource: string, name: string, ns: string | null, code = 201, user = SA, ip = K8S_ATTACKER, ua = 'kubectl/v1.30.0 (linux/amd64)') =>
  JSON.stringify({
    kind: 'Event',
    level: 'Metadata',
    stage: 'ResponseComplete',
    requestReceivedTimestamp: new Date(ago(4) + min * 60_000).toISOString().replace('.000', '.' + String(100 + min).padStart(6, '0')),
    verb,
    user: { username: user, groups: user.startsWith('system:serviceaccount') ? ['system:serviceaccounts', 'system:serviceaccounts:prod', 'system:authenticated'] : ['system:authenticated'] },
    sourceIPs: [ip],
    userAgent: ua,
    objectRef: { resource, ...(ns ? { namespace: ns } : {}), ...(name ? { name } : {}), apiGroup: ['clusterrolebindings', 'roles', 'rolebindings'].includes(resource) ? 'rbac.authorization.k8s.io' : resource === 'deployments' ? 'apps' : '' },
    responseStatus: { code },
  });

const AUDIT_LOG =
  [
    auditLine(-120, 'update', 'deployments', 'web', 'prod', 200, SA, '10.10.30.15', 'argocd/v2.12'),
    auditLine(0, 'list', 'pods', '', 'prod', 200),
    auditLine(1, 'create', 'pods', '', 'kube-system', 403),
    auditLine(2, 'list', 'secrets', '', 'prod', 200),
    auditLine(2.5, 'get', 'secrets', 'db-cred', 'prod', 200),
    auditLine(4, 'create', 'clusterrolebindings', 'ci-bot-admin', null, 201),
    auditLine(6, 'list', 'nodes', '', null, 200),
    auditLine(58, 'create', 'deployments', 'cache', 'prod', 201),
    auditLine(61, 'get', 'pods', MINER, 'prod', 200),
  ].join('\n') + '\n';

const DENY_EGRESS = [
  'apiVersion: networking.k8s.io/v1',
  'kind: NetworkPolicy',
  'metadata:',
  '  name: cache-deny-egress',
  '  namespace: prod',
  'spec:',
  '  podSelector:',
  '    matchLabels:',
  '      app: cache',
  '  policyTypes:',
  '  - Egress',
  '  egress: []',
].join('\n') + '\n';

const NEW_SECRET = [
  'apiVersion: v1',
  'kind: Secret',
  'metadata:',
  '  name: db-cred',
  '  namespace: prod',
  'type: Opaque',
  'stringData:',
  '  username: qaydnoma',
  '  password: "n3w-R0tated-2026-11-18"',
].join('\n') + '\n';

const sysPod = (name: string, node: string, ip: string, image: string, privileged = false): KPod => ({
  name, ns: 'kube-system', labels: { 'k8s-app': name.split('-')[0]! }, node, ip, status: 'Running' as const, created: ago(24 * 60), cpu: 4, mem: 22,
  containers: [{ name: name.split('-')[0]!, image, ...(privileged ? { securityContext: { privileged: true } } : {}) }],
});

export const k8sIncident: Lab = {
  id: 'kubernetes-insident',
  title: "Kubernetes: klasterdagi kriptomayner va ortiqcha huquqlar",
  summary: "kubectl bilan klasterni o'rganish va insidentni tekshirish: get, describe, logs, top, events, -o yaml va jsonpath, auth can-i, RBAC bog'lanishlari, audit log, Secret, NetworkPolicy bilan cheklash, cordon, scale, delete va sirni almashtirish.",
  minutes: 65,
  level: 3,
  intro:
    "Qaydnoma'ning production klasteri (`prod` konteksti). Ertalab monitoring `worker-2` node'ida CPU 100% ekanini ko'rsatdi. Siz klaster administratorisiz: `kubectl` to'liq huquq bilan sozlangan.\n\n" +
    "Kubernetes'da asosiy tushunchalar: **Pod** — bir yoki bir nechta konteyner, **Deployment** — podlarni kerakli sonda ushlab turadi, **Namespace** — ajratilgan bo'lim, **ServiceAccount** — podlar va avtomatlashtirish (CI) uchun akkaunt, **RBAC** — kim nima qila olishi (Role/ClusterRole + Binding).\n\n" +
    "Uy papkangizda: `audit.log` — API server audit jurnali (har qatorda JSON, `jq` bilan o'qing), `cache-deny-egress.yaml` va `db-cred-new.yaml` — tayyorlangan manifestlar.",
  shell: () => ({
    host: 'admin-ws',
    fs: { home: { talaba: { 'audit.log': AUDIT_LOG, 'cache-deny-egress.yaml': DENY_EGRESS, 'db-cred-new.yaml': NEW_SECRET } }, tmp: {} },
    k8s: {
      namespaces: ['default', 'kube-system', 'monitoring', 'prod'],
      nodes: [
        { name: 'cp-1', roles: 'control-plane', version: 'v1.31.1', created: ago(24 * 300), cpu: 310, mem: 2600 },
        { name: 'worker-1', roles: '<none>', version: 'v1.31.1', created: ago(24 * 300), cpu: 640, mem: 5100 },
        { name: 'worker-2', roles: '<none>', version: 'v1.31.1', created: ago(24 * 300), cpu: 3980, mem: 4300 },
      ],
      pods: <KPod[]>[
        sysPod('coredns-6f6b679f8f-7xk2d', 'cp-1', '10.244.0.3', 'registry.k8s.io/coredns/coredns:v1.11.3'),
        sysPod('kube-proxy-8hz4m', 'worker-1', '10.0.1.11', 'registry.k8s.io/kube-proxy:v1.31.1', true),
        sysPod('kube-proxy-r2v9c', 'worker-2', '10.0.1.12', 'registry.k8s.io/kube-proxy:v1.31.1', true),
        { name: 'prometheus-0', ns: 'monitoring', labels: { app: 'prometheus' }, owner: { kind: 'StatefulSet', name: 'prometheus' }, node: 'worker-1', ip: '10.244.1.20', status: 'Running', created: ago(24 * 40), cpu: 120, mem: 890, containers: [{ name: 'prometheus', image: 'quay.io/prometheus/prometheus:v2.54.1', securityContext: { runAsNonRoot: true, runAsUser: 65534 } }] },
        { name: 'web-5c7d8b9f4-h7k2p', ns: 'prod', labels: { app: 'web' }, owner: { kind: 'ReplicaSet', name: 'web-5c7d8b9f4' }, node: 'worker-1', ip: '10.244.1.31', status: 'Running', created: ago(24 * 6), serviceAccount: 'web', cpu: 45, mem: 160,
          containers: [{ name: 'web', image: 'registry.qaydnoma.lab/web:2.4.1', ports: [8080], securityContext: { runAsNonRoot: true, runAsUser: 1000, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true }, resources: { limits: { cpu: '500m', memory: '256Mi' } }, env: [{ name: 'DB_HOST', value: 'db' }, { name: 'DB_PASSWORD', secret: { name: 'db-cred', key: 'password' } }] }],
          logs: { web: 'listening on :8080\nGET /api/notes 200\nGET /api/health 200\n' } },
        { name: 'web-5c7d8b9f4-m3x8z', ns: 'prod', labels: { app: 'web' }, owner: { kind: 'ReplicaSet', name: 'web-5c7d8b9f4' }, node: 'worker-2', ip: '10.244.2.14', status: 'Running', created: ago(24 * 6), serviceAccount: 'web', cpu: 41, mem: 152,
          containers: [{ name: 'web', image: 'registry.qaydnoma.lab/web:2.4.1', ports: [8080], securityContext: { runAsNonRoot: true, runAsUser: 1000, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true }, resources: { limits: { cpu: '500m', memory: '256Mi' } }, env: [{ name: 'DB_HOST', value: 'db' }, { name: 'DB_PASSWORD', secret: { name: 'db-cred', key: 'password' } }] }],
          logs: { web: 'listening on :8080\nGET /api/notes 200\n' } },
        { name: 'db-0', ns: 'prod', labels: { app: 'db' }, owner: { kind: 'StatefulSet', name: 'db' }, node: 'worker-1', ip: '10.244.1.40', status: 'Running', created: ago(24 * 90), cpu: 80, mem: 410, containers: [{ name: 'postgres', image: 'postgres:16.4', env: [{ name: 'POSTGRES_PASSWORD', secret: { name: 'db-cred', key: 'password' } }] }] },
        { name: MINER, ns: 'prod', labels: { app: 'cache' }, owner: { kind: 'ReplicaSet', name: 'cache-7d9c8f5b6' }, node: 'worker-2', ip: '10.244.2.77', status: 'Running', created: ago(3), serviceAccount: 'ci-bot', hostPID: true, cpu: 3870, mem: 240,
          containers: [{ name: 'cache', image: 'docker.io/redis-cache-tools/cache:7', command: ['/bin/sh', '-c', '/opt/kworker -o pool.supportxmr.example:443 --donate-level 0'], securityContext: { privileged: true }, volumeMounts: [{ name: 'host-root', mountPath: '/host' }] }],
          volumes: [{ name: 'host-root', hostPath: '/' }],
          logs: { cache: ['[2026-11-18 06:01:04] use pool pool.supportxmr.example:443', '[2026-11-18 06:01:05] new job from pool.supportxmr.example:443 diff 120001', '[2026-11-18 06:01:40] CPU #0..#3 READY threads 4/4', '[2026-11-18 08:59:12] speed 10s/60s/15m 2841.3 2836.9 2830.2 H/s', '[2026-11-18 08:59:58] accepted (1312/0) diff 120001'].join('\n') + '\n' } },
      ],
      deployments: [
        { name: 'web', ns: 'prod', replicas: 2, labels: { app: 'web' }, created: ago(24 * 90), image: 'registry.qaydnoma.lab/web:2.4.1' },
        { name: 'cache', ns: 'prod', replicas: 1, labels: { app: 'cache' }, created: ago(3), image: 'docker.io/redis-cache-tools/cache:7' },
      ],
      services: [
        { name: 'web', ns: 'prod', type: 'LoadBalancer', clusterIP: '10.96.40.12', externalIP: '203.0.113.20', ports: '80:31080/TCP', selector: { app: 'web' }, created: ago(24 * 90) },
        { name: 'db', ns: 'prod', type: 'ClusterIP', clusterIP: '10.96.40.30', ports: '5432/TCP', selector: { app: 'db' }, created: ago(24 * 90) },
      ],
      secrets: <K8sSpec['secrets']>[{ name: 'db-cred', ns: 'prod', data: { username: 'qaydnoma', password: 'Pg#Qaydnoma2026' }, created: ago(24 * 90) }, { name: 'registry-pull', ns: 'prod', type: 'kubernetes.io/dockerconfigjson', data: { '.dockerconfigjson': '{"auths":{"registry.qaydnoma.lab":{}}}' }, created: ago(24 * 90) }],
      serviceAccounts: [{ name: 'default', ns: 'prod', created: ago(24 * 300) }, { name: 'web', ns: 'prod', created: ago(24 * 90) }, { name: 'ci-bot', ns: 'prod', created: ago(24 * 90) }],
      clusterRoles: [
        { name: 'cluster-admin', rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }], created: ago(24 * 300) },
        { name: 'view', rules: [{ apiGroups: ['', 'apps'], resources: ['pods', 'services', 'deployments', 'configmaps'], verbs: ['get', 'list', 'watch'] }], created: ago(24 * 300) },
      ],
      roles: [
        { name: 'ci-deployer', ns: 'prod', rules: [{ apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'list', 'create', 'update', 'patch'] }, { apiGroups: [''], resources: ['pods', 'secrets'], verbs: ['get', 'list'] }], created: ago(24 * 90) },
        { name: 'web-reader', ns: 'prod', rules: [{ apiGroups: [''], resources: ['configmaps'], verbs: ['get'] }], created: ago(24 * 90) },
      ],
      roleBindings: [
        { name: 'ci-deployer', ns: 'prod', roleRef: { kind: 'Role', name: 'ci-deployer' }, subjects: [{ kind: 'ServiceAccount', name: 'ci-bot', namespace: 'prod' }], created: ago(24 * 90) },
        { name: 'web-reader', ns: 'prod', roleRef: { kind: 'Role', name: 'web-reader' }, subjects: [{ kind: 'ServiceAccount', name: 'web', namespace: 'prod' }], created: ago(24 * 90) },
      ],
      clusterRoleBindings: [
        { name: 'cluster-admin', roleRef: { kind: 'ClusterRole', name: 'cluster-admin' }, subjects: [{ kind: 'Group', name: 'system:masters' }], created: ago(24 * 300) },
        { name: 'ci-bot-admin', roleRef: { kind: 'ClusterRole', name: 'cluster-admin' }, subjects: [{ kind: 'ServiceAccount', name: 'ci-bot', namespace: 'prod' }], created: ago(4) + 4 * 60_000 },
        { name: 'monitoring-view', roleRef: { kind: 'ClusterRole', name: 'view' }, subjects: [{ kind: 'ServiceAccount', name: 'prometheus', namespace: 'monitoring' }], created: ago(24 * 40) },
      ],
      events: [
        { ns: 'prod', type: 'Normal', reason: 'ScalingReplicaSet', object: 'deployment/cache', message: 'Scaled up replica set cache-7d9c8f5b6 to 1', time: ago(3) },
        { ns: 'prod', type: 'Normal', reason: 'Scheduled', object: `pod/${MINER}`, message: `Successfully assigned prod/${MINER} to worker-2`, time: ago(3) },
        { ns: 'prod', type: 'Normal', reason: 'Pulled', object: `pod/${MINER}`, message: 'Successfully pulled image "docker.io/redis-cache-tools/cache:7" in 4.1s', time: ago(3) },
        { ns: 'prod', type: 'Normal', reason: 'Started', object: `pod/${MINER}`, message: 'Started container cache', time: ago(3) },
        { ns: 'prod', type: 'Warning', reason: 'FailedCreate', object: 'pod/debug', message: 'pods "debug" is forbidden: User "system:serviceaccount:prod:ci-bot" cannot create resource "pods" in API group "" in the namespace "kube-system"', time: ago(4) + 60_000 },
      ],
    },
  }),
  tasks: [
    {
      id: 'context',
      teach: ['kubectl', 'kubectl config current-context'],
      text: 'Avval qaysi klaster bilan ishlayotganingizni tekshiring.',
      hint: '`kubectl config current-context` — production\'da noto\'g\'ri klasterda buyruq berish — keng tarqalgan xato.',
      solution: ['kubectl config current-context'],
      check: ({ output }) => output.trim() === 'kubernetes-admin@prod',
    },
    {
      id: 'nodes',
      teach: ['kubectl get'],
      text: "Klasterda qaysi node'lar (serverlar) bor?",
      hint: '`kubectl get nodes`',
      solution: ['kubectl get nodes'],
      check: ({ output }) => output.includes('worker-2') && output.includes('control-plane'),
    },
    {
      id: 'top-nodes',
      teach: ['kubectl top'],
      text: "Qaysi node'ning CPU'si band?",
      hint: '`kubectl top nodes` — worker-2: ~100%.',
      solution: ['kubectl top nodes'],
      check: ({ output }) => /worker-2 +3980m +100%/.test(output),
    },
    {
      id: 'pods',
      teach: ['kubectl -n'],
      text: '`prod` namespace\'idagi podlarni ko\'ring.',
      hint: '`kubectl get pods -n prod` — namespace ko\'rsatilmasa, default\'ga qaraydi.',
      solution: ['kubectl get pods -n prod'],
      check: ({ output }) => output.includes(MINER) && output.includes('db-0'),
    },
    {
      id: 'wide',
      teach: ['kubectl -A', 'kubectl -o wide'],
      text: "Barcha namespace'lardagi podlarni qaysi node'da ishlayotgani bilan ko'ring.",
      hint: '`kubectl get pods -A -o wide`',
      solution: ['kubectl get pods -A -o wide'],
      check: ({ output }) => new RegExp(`prod +${MINER}.*worker-2`).test(output) && output.includes('kube-system'),
    },
    {
      id: 'top-pods',
      text: 'CPU\'ni qaysi pod yemoqda? Butun klaster bo\'yicha tartiblab chiqaring.',
      hint: '`kubectl top pods -A --sort-by=cpu`',
      solution: ['kubectl top pods -A --sort-by=cpu'],
      check: ({ output }) => (output.split('\n')[1] ?? '').includes(MINER),
    },
    {
      id: 'describe',
      teach: ['kubectl describe'],
      text: 'Shubhali podni batafsil ko\'ring: qaysi image, qaysi buyruq, qanday huquqlar va nima ulangan?',
      hint: `\`kubectl describe pod ${MINER} -n prod\` — privileged, xostning butun / papkasi /host ga ulangan, ServiceAccount: ci-bot.`,
      solution: [`kubectl describe pod ${MINER} -n prod`],
      check: ({ output }) => output.includes('privileged:  true') && output.includes('Path:          /') && output.includes('Service Account:  ci-bot'),
    },
    {
      id: 'logs',
      teach: ['kubectl logs'],
      text: 'Pod loglari nima deydi?',
      hint: `\`kubectl logs ${MINER} -n prod --tail 5\` — "pool", "H/s", "accepted": kriptovalyuta qazish.`,
      solution: [`kubectl logs ${MINER} -n prod --tail 5`],
      check: ({ output }) => output.includes('H/s') && output.includes('pool.supportxmr.example'),
    },
    {
      id: 'deploy',
      text: 'Bu podni qaysi Deployment yaratgan va u qachon paydo bo\'lgan?',
      hint: '`kubectl get deploy -n prod` — cache 3 soat oldin yaratilgan, web esa oylardan beri bor.',
      solution: ['kubectl get deploy -n prod'],
      check: ({ output }) => /cache +1\/1 +1 +1 +3h/.test(output),
    },
    {
      id: 'events',
      teach: ['kubectl get events'],
      text: "`prod` dagi hodisalarni ko'ring. Kim kube-system'da pod yaratmoqchi bo'lgan?",
      hint: '`kubectl get events -n prod` — FailedCreate: ci-bot\'ga kube-system\'da ruxsat yo\'q edi... boshida.',
      solution: ['kubectl get events -n prod'],
      check: ({ output }) => output.includes('FailedCreate') && output.includes('Scaled up replica set cache-7d9c8f5b6'),
    },
    {
      id: 'yaml',
      teach: ['kubectl -o yaml'],
      text: "Pod obyektini YAML ko'rinishida oching — manifest qanday yozilganini ko'ring.",
      hint: `\`kubectl get pod ${MINER} -n prod -o yaml\` — hostPID: true, hostPath: /, privileged: true.`,
      solution: [`kubectl get pod ${MINER} -n prod -o yaml`],
      check: ({ output }) => output.includes('hostPID: true') && output.includes('serviceAccountName: ci-bot') && output.includes('path: /'),
    },
    {
      id: 'images',
      teach: ['kubectl -o jsonpath'],
      text: "Klasterdagi barcha podlar va ularning image'larini jadval qiling: namespace, nom, image.",
      hint: "`kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{\"\\t\"}{.metadata.name}{\"\\t\"}{.spec.containers[*].image}{\"\\n\"}{end}'` — faqat bittasi tashqi docker.io dan.",
      solution: ["kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{\"\\t\"}{.metadata.name}{\"\\t\"}{.spec.containers[*].image}{\"\\n\"}{end}'"],
      check: ({ output }) => output.includes(`prod\t${MINER}\tdocker.io/redis-cache-tools/cache:7`) && output.includes('prod\tdb-0\tpostgres:16.4'),
    },
    {
      id: 'privileged',
      text: "Qaysi podlar privileged rejimda? (kube-proxy uchun bu odatiy — u tarmoqni sozlaydi.)",
      hint: "`kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.containers[*].securityContext.privileged}{\"\\n\"}{end}'`",
      solution: ["kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.containers[*].securityContext.privileged}{\"\\n\"}{end}'"],
      check: ({ output }) => output.includes(`${MINER}\ttrue`) && output.includes('kube-proxy-8hz4m\ttrue') && output.includes('web-5c7d8b9f4-h7k2p\t\n'),
    },
    {
      id: 'can-i',
      teach: ['kubectl auth can-i'],
      text: '`ci-bot` ServiceAccount\'i nimalarga qodir? Uning nomidan ruxsatlar ro\'yxatini oling.',
      hint: `\`kubectl auth can-i --list --as=${SA} -n prod\` — [*] [*]: hamma narsa. CI uchun bu juda ko'p.`,
      solution: [`kubectl auth can-i --list --as=${SA} -n prod`],
      check: ({ output }) => /\*\s+\[\]\s+\[\]\s+\[\*\]/.test(output),
    },
    {
      id: 'can-i-crb',
      text: '`ci-bot` klaster bo\'yicha yangi ClusterRoleBinding yarata oladimi?',
      hint: `\`kubectl auth can-i create clusterrolebindings --as=${SA}\``,
      solution: [`kubectl auth can-i create clusterrolebindings --as=${SA}`],
      check: ({ output }) => output.trim() === 'yes',
    },
    {
      id: 'bindings',
      text: "Bu huquq qayerdan kelgan? ClusterRoleBinding'larni subyektlari bilan ko'ring.",
      hint: '`kubectl get clusterrolebindings -o wide` — ci-bot-admin: 4 soat oldin yaratilgan, cluster-admin rolini beradi.',
      solution: ['kubectl get clusterrolebindings -o wide'],
      check: ({ output }) => /ci-bot-admin +ClusterRole\/cluster-admin +\S+ +prod\/ci-bot/.test(output),
    },
    {
      id: 'audit',
      text: "Audit jurnalidan `ci-bot` nomidan bajarilgan amallarni vaqt, amal, resurs, nom va manba IP bilan chiqaring.",
      hint: `\`jq -r 'select(.user.username == "${SA}") | [.requestReceivedTimestamp, .verb, .objectRef.resource, .objectRef.name, .sourceIPs[0], .responseStatus.code] | @tsv' audit.log\` — odatda u ArgoCD'dan (10.10.30.15) keladi, bugun esa tashqi IP dan.`,
      solution: [`jq -r 'select(.user.username == "${SA}") | [.requestReceivedTimestamp, .verb, .objectRef.resource, .objectRef.name, .sourceIPs[0], .responseStatus.code] | @tsv' audit.log`],
      check: ({ output }) => output.includes(`create\tclusterrolebindings\tci-bot-admin\t${K8S_ATTACKER}`) && output.includes('10.10.30.15'),
    },
    {
      id: 'secret',
      text: "Hujumchi `db-cred` Secret'ini o'qigan. Unda nima saqlangan? (Secret — shifrlash emas, Base64.)",
      hint: "`kubectl get secret db-cred -n prod -o jsonpath='{.data.password}' | base64 -d` — bu parolni almashtirish shart.",
      solution: ["kubectl get secret db-cred -n prod -o jsonpath='{.data.password}' | base64 -d"],
      check: ({ output }) => output.trim() === 'Pg#Qaydnoma2026',
    },
    {
      id: 'netpol',
      text: "Klasterda tarmoq siyosatlari (NetworkPolicy) bormi? Pod tashqariga erkin chiqa oladimi?",
      hint: '`kubectl get netpol -A` — yo\'q: har bir pod istalgan joyga ulanishi mumkin.',
      solution: ['kubectl get netpol -A'],
      check: ({ output }) => output.trim() === 'No resources found',
    },
    {
      id: 'apply',
      teach: ['kubectl apply -f'],
      text: "Cheklash: tayyor `cache-deny-egress.yaml` manifesti bilan `app: cache` podlarining tashqariga chiqishini to'xtating.",
      hint: '`cat cache-deny-egress.yaml` bilan ko\'ring, keyin `kubectl apply -f cache-deny-egress.yaml`',
      solution: ['kubectl apply -f cache-deny-egress.yaml'],
      check: ({ state }) => state.k8s!.networkPolicies.some((p) => p.ns === 'prod' && p.podSelector.app === 'cache' && p.policyTypes.includes('Egress')),
    },
    {
      id: 'cordon',
      teach: ['kubectl cordon'],
      text: "`worker-2` ning butun fayl tizimi privileged podga ochiq edi — node'ga ishonib bo'lmaydi. Unga yangi pod joylashtirishni to'xtating.",
      hint: '`kubectl cordon worker-2` — node keyin qayta o\'rnatiladi; hozircha podlar boshqa node\'larga ko\'chiriladi.',
      solution: ['kubectl cordon worker-2'],
      check: ({ state }) => !!state.k8s!.nodes.find((n) => n.name === 'worker-2')?.unschedulable,
    },
    {
      id: 'crb-delete',
      teach: ['kubectl delete'],
      text: "Ortiqcha huquqni olib tashlang: `ci-bot-admin` ClusterRoleBinding'ini o'chiring.",
      hint: '`kubectl delete clusterrolebinding ci-bot-admin`',
      solution: ['kubectl delete clusterrolebinding ci-bot-admin'],
      check: ({ state }) => !state.k8s!.clusterRoleBindings.some((b) => b.name === 'ci-bot-admin'),
    },
    {
      id: 'scale',
      teach: ['kubectl scale'],
      text: "Mayner Deployment'ini nolga tushiring (obyekt dalil sifatida qoladi, pod esa to'xtaydi).",
      hint: '`kubectl scale deployment/cache --replicas=0 -n prod`',
      solution: ['kubectl scale deployment/cache --replicas=0 -n prod'],
      check: ({ state }) => state.k8s!.deployments.find((d) => d.name === 'cache')?.replicas === 0 && !state.k8s!.pods.some((p) => p.name === MINER),
    },
    {
      id: 'top-after',
      text: "CPU yuklamasi tushdimi? Eng ko'p CPU ishlatayotgan podlarni qayta ko'ring.",
      hint: '`kubectl top pods -A --sort-by=cpu`',
      solution: ['kubectl top pods -A --sort-by=cpu'],
      check: ({ output }) => !output.includes(MINER) && output.includes('prometheus-0'),
    },
    {
      id: 'rotate',
      text: "Hujumchi o'qigan parolni almashtiring: tayyor `db-cred-new.yaml` ni qo'llang va yangi qiymatni tekshiring.",
      hint: "`kubectl apply -f db-cred-new.yaml`, keyin `kubectl get secret db-cred -n prod -o jsonpath='{.data.password}' | base64 -d` (bazadagi parol ham shu bilan birga almashtiriladi).",
      solution: ['kubectl apply -f db-cred-new.yaml', "kubectl get secret db-cred -n prod -o jsonpath='{.data.password}' | base64 -d"],
      check: ({ state }) => state.k8s!.secrets.find((s) => s.name === 'db-cred' && s.ns === 'prod')?.data.password === 'n3w-R0tated-2026-11-18',
    },
    {
      id: 'challenge',
      challenge: true,
      text: "Mustaqil vazifa: tozalashdan keyin `ci-bot` ning huquqlarini tekshiring va ikki javobni `~/rbac.txt` ga yozing — avval `prod` da deployment yarata oladimi, keyin `kube-system` da secret'larni o'qiy (get) oladimi.",
      hint: '`kubectl auth can-i` ni `--as` va `-n` bilan ikki marta; birinchisi `>`, ikkinchisi `>>`.',
      solution: [`kubectl auth can-i create deployments -n prod --as=${SA} > ~/rbac.txt`, `kubectl auth can-i get secrets -n kube-system --as=${SA} >> ~/rbac.txt`],
      check: ({ state }) => (fileAt(state, `${HOME}/rbac.txt`) ?? '').trim().split('\n').map((l) => l.trim()).join(',') === 'yes,no',
    },
  ],
};
