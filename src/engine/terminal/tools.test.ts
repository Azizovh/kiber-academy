import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { file } from './fs';
import { createShell, execLine, type ShellInit } from './shell';
import { sha256Hex } from './text';

const ACCESS_LOG = [
  '203.0.113.9 - - [18/Nov/2026:10:00:01 +0000] "GET / HTTP/1.1" 200 512 "-" "Mozilla/5.0"',
  '198.51.100.7 - - [18/Nov/2026:10:00:02 +0000] "GET /admin HTTP/1.1" 404 120 "-" "Nikto/2.5.0"',
  '198.51.100.7 - - [18/Nov/2026:10:00:03 +0000] "GET /.git/HEAD HTTP/1.1" 200 23 "-" "Nikto/2.5.0"',
  '203.0.113.9 - - [18/Nov/2026:10:00:04 +0000] "POST /login HTTP/1.1" 302 0 "-" "Mozilla/5.0"',
].join('\n') + '\n';

const EVENTS = [
  '{"EventID":4625,"TargetUserName":"admin","IpAddress":"198.51.100.23","LogonType":10}',
  '{"EventID":4625,"TargetUserName":"admin","IpAddress":"198.51.100.23","LogonType":10}',
  '{"EventID":4624,"TargetUserName":"svc_backup","IpAddress":"198.51.100.23","LogonType":10}',
  '{"EventID":4624,"TargetUserName":"d.karimova","IpAddress":"10.10.20.31","LogonType":2}',
].join('\n') + '\n';

function shell(extra: Partial<ShellInit> = {}) {
  return createShell({
    fs: {
      home: { talaba: { 'access.log': ACCESS_LOG, 'events.json': EVENTS } },
      etc: { 'passwd': 'root:x:0:0:root:/root:/bin/bash\ntalaba:x:1000:1000::/home/talaba:/bin/bash\nbackdoor:x:0:0::/tmp:/bin/bash\n' },
      usr: { bin: { passwd: file('ELF', 0o4755), ls: file('ELF', 0o755) }, local: { bin: { helper: file('ELF', 0o4755) } } },
      tmp: {},
    },
    ...extra,
  });
}

const run = (s: ReturnType<typeof shell>, line: string) => execLine(s, line).output;

describe('awk', () => {
  it('prints columns and filters by condition', () => {
    const s = shell();
    expect(run(s, "awk '{print $1}' access.log | sort | uniq -c")).toContain('2 198.51.100.7');
    expect(run(s, "awk '$9 == 404 {print $1, $7}' access.log")).toBe('198.51.100.7 /admin');
    expect(run(s, "awk -F: '$3 == 0 {print $1}' /etc/passwd")).toBe('root\nbackdoor');
    expect(run(s, "awk '$7 ~ /git/' access.log")).toContain('/.git/HEAD');
    expect(run(s, "awk 'NR > 3 {print NR}' access.log")).toBe('4');
  });

  it('keeps $ literal inside single quotes but expands it in double quotes', () => {
    const s = shell();
    expect(run(s, "echo 'cost $5'")).toBe('cost $5');
    expect(run(s, 'echo "home $HOME"')).toBe('home /home/talaba');
  });
});

describe('sed', () => {
  it('substitutes, deletes and edits in place', () => {
    const s = shell();
    run(s, 'echo "PermitRootLogin yes" > /tmp/sshd');
    expect(run(s, "sed 's/yes/no/' /tmp/sshd")).toBe('PermitRootLogin no');
    expect(run(s, 'cat /tmp/sshd')).toBe('PermitRootLogin yes');
    run(s, "sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /tmp/sshd");
    expect(run(s, 'cat /tmp/sshd')).toBe('PermitRootLogin no');
    expect(run(s, "sed '/Nikto/d' access.log | wc -l").trim()).toBe('2');
    expect(run(s, "sed -n '/POST/p' access.log")).toContain('POST /login');
  });

  it('refuses to edit a file the user cannot write', () => {
    const s = shell();
    expect(run(s, "sed -i 's/root/x/' /etc/passwd")).toContain('Permission denied');
    expect(execLine(s, "sudo sed -i 's/backdoor/removed/' /etc/passwd").code).toBe(0);
    expect(run(s, 'cat /etc/passwd')).toContain('removed:x:0:0');
  });
});

describe('jq', () => {
  it('reads JSON lines with select, projections and @tsv', () => {
    const s = shell();
    expect(run(s, "jq -r 'select(.EventID == 4625) | .TargetUserName' events.json")).toBe('admin\nadmin');
    expect(run(s, "jq -r 'select(.EventID == 4624 and .LogonType == 10) | [.TargetUserName, .IpAddress] | @tsv' events.json")).toBe(
      'svc_backup\t198.51.100.23',
    );
    expect(run(s, "jq -c '{TargetUserName, EventID}' events.json | head -n 1")).toBe('{"TargetUserName":"admin","EventID":4625}');
    expect(run(s, "jq -s 'length' events.json")).toBe('4');
    expect(run(s, `echo '{"Records":[{"a":1},{"a":2}]}' | jq '.Records[].a'`)).toBe('1\n2');
    expect(run(s, "jq -r 'select(.TargetUserName | startswith(\"svc\")) | .IpAddress' events.json")).toBe('198.51.100.23');
  });

  it('reports errors instead of crashing', () => {
    const s = shell();
    expect(run(s, "jq '.foo(' events.json")).toMatch(/^jq: error/);
    expect(run(s, "echo 'not json' | jq .")).toMatch(/Invalid JSON/);
  });
});

describe('sha256sum', () => {
  it('matches node:crypto, including non-ASCII text', () => {
    for (const text of ['', 'abc', "salom o'zbek ў\n", 'x'.repeat(1000)]) {
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  it('verifies a checksum list', () => {
    const s = shell();
    run(s, 'echo good > /tmp/a');
    run(s, 'echo bad > /tmp/b');
    const a = sha256Hex('good\n');
    run(s, `echo "${a}  /tmp/a" > /tmp/list`);
    run(s, `echo "${a}  /tmp/b" >> /tmp/list`);
    const res = execLine(s, 'sha256sum -c /tmp/list');
    expect(res.output).toContain('/tmp/a: OK');
    expect(res.output).toContain('/tmp/b: FAILED');
    expect(res.code).toBe(1);
  });
});

describe('find -perm and setuid', () => {
  it('finds SUID files and chmod u-s removes the bit', () => {
    const s = shell();
    expect(run(s, 'find / -perm -4000 -type f')).toBe('/usr/bin/passwd\n/usr/local/bin/helper');
    expect(run(s, 'ls -l /usr/local/bin/helper')).toMatch(/^-rwsr-xr-x/);
    run(s, 'sudo chmod u-s /usr/local/bin/helper');
    expect(run(s, 'find / -perm -4000 -type f')).toBe('/usr/bin/passwd');
  });
});

describe('scripts', () => {
  it('runs with bash, needs +x for ./, and passes arguments', () => {
    const s = shell();
    run(s, 'echo "#!/bin/bash" > b.sh');
    run(s, 'echo "DEST=/tmp/zaxira" >> b.sh');
    run(s, 'echo "mkdir -p \\$DEST" >> b.sh');
    // Escaped \$ keeps the variable for the script itself.
    run(s, 'echo "cp \\$1 \\$DEST/ && echo nusxa: \\$1" >> b.sh');
    expect(run(s, './b.sh access.log')).toContain('Permission denied');
    expect(run(s, 'bash b.sh access.log')).toBe('nusxa: access.log');
    run(s, 'chmod +x b.sh');
    expect(run(s, './b.sh events.json')).toBe('nusxa: events.json');
    expect(run(s, 'ls /tmp/zaxira')).toContain('events.json');
  });

  it('says plainly that loops are not simulated', () => {
    const s = shell();
    run(s, 'echo "for f in *; do echo $f; done" > l.sh');
    expect(run(s, 'bash l.sh')).toContain("bu simulyatorda if, for");
  });
});

describe('processes and services', () => {
  const system: ShellInit['system'] = {
    procs: [
      { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init' },
      { pid: 812, ppid: 1, user: 'root', cmd: 'nginx: master process /usr/sbin/nginx' },
      { pid: 2231, ppid: 1, user: 'www-data', cmd: '/tmp/.x/kworkerds -o pool.example.net:3333', cpu: 98.7 },
    ],
    services: [
      { name: 'nginx', description: 'A high performance web server', active: 'active', enabled: true, pid: 812, exec: '/usr/sbin/nginx' },
      {
        name: 'update-checker',
        description: 'System update checker',
        active: 'active',
        enabled: true,
        pid: 2231,
        exec: '/tmp/.x/kworkerds',
        user: 'www-data',
      },
    ],
    sockets: [
      { proto: 'tcp', local: '0.0.0.0:80', pid: 812 },
      { proto: 'tcp', local: '0.0.0.0:4444', pid: 2231 },
    ],
  };

  it('lists processes and sockets, kills only with permission', () => {
    const s = shell({ system });
    expect(run(s, 'ps aux')).toContain('/tmp/.x/kworkerds');
    expect(run(s, 'ps aux | sort -k3 -rn | head -n 1')).toBeDefined();
    expect(run(s, 'pgrep -l kworker')).toBe('2231 kworkerds');
    expect(run(s, 'ss -tulpn')).toContain('0.0.0.0:4444');
    expect(run(s, 'sudo ss -tulpn')).toContain('users:(("kworkerds",pid=2231');
    expect(run(s, 'kill 2231')).toContain('Operation not permitted');
    expect(execLine(s, 'sudo kill -9 2231').code).toBe(0);
    expect(run(s, 'ps aux')).not.toContain('kworkerds');
    expect(run(s, 'ss -tln')).not.toContain('4444');
    expect(run(s, 'systemctl is-active update-checker')).toBe('failed');
  });

  it('controls services with systemctl and shows their journal', () => {
    const s = shell({ system });
    expect(run(s, 'systemctl status nginx')).toContain('active (running)');
    expect(run(s, 'systemctl stop update-checker')).toContain('Access denied');
    run(s, 'sudo systemctl disable --now update-checker');
    expect(run(s, 'systemctl is-enabled update-checker')).toBe('disabled');
    expect(run(s, 'systemctl is-active update-checker')).toBe('inactive');
    expect(run(s, 'ps aux')).not.toContain('kworkerds');
    run(s, 'sudo systemctl restart nginx');
    expect(run(s, 'systemctl is-active nginx')).toBe('active');
    expect(run(s, 'journalctl -u nginx')).toContain('Started A high performance web server');
    expect(run(s, 'systemctl list-units --type=service --state=running')).toContain('nginx.service');
  });
});
