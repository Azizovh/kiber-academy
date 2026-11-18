import { describe, expect, it } from 'vitest';
import { BASE_TIME, file } from './fs';
import { createShell, execLine } from './shell';

const DAY = 86_400_000;

function shell() {
  return createShell({
    fs: {
      home: {
        talaba: {
          'a.txt': 'olma\nbanan\nolma\nolcha\n',
          'b.txt': 'olma\nbanan\nanor\n',
          'katta.log': file('x'.repeat(5000) + '\n', 0o644, undefined, BASE_TIME - 10 * DAY),
          '.yashirin': 'sir\n',
          loyiha: { 'main.py': 'print(1)\n', 'README.md': '# Loyiha\n', docs: { 'reja.txt': 'reja\n' } },
          'skript.sh': file('#!/bin/bash\necho salom\n', 0o755),
        },
      },
      etc: {
        passwd: 'root:x:0:0:root:/root:/bin/bash\ntalaba:x:1000:1000:Talaba:/home/talaba:/bin/bash\n',
        group: 'root:x:0:\nsudo:x:27:talaba\ntalaba:x:1000:\ndevelopers:x:1500:\n',
      },
      var: { log: { 'auth.log': 'Failed password for root\nAccepted password for talaba\nFailed password for admin\n' } },
      tmp: {},
    },
  });
}
const run = (s: ReturnType<typeof shell>, l: string) => execLine(s, l).output;

describe('ls flags', () => {
  it('-a, -A, -1, -F, -h, -t, -S, -r, -R, -d', () => {
    const s = shell();
    expect(run(s, 'ls -a').split('  ')).toContain('./');
    expect(run(s, 'ls -A')).toContain('.yashirin');
    expect(run(s, 'ls -A')).not.toMatch(/(^|\s)\.\.(\s|$)/);
    expect(run(s, 'ls -1').split('\n')).toContain('a.txt');
    expect(run(s, 'ls -F')).toContain('skript.sh*');
    expect(run(s, 'ls -lh katta.log')).toMatch(/4\.9K/);
    expect(run(s, 'ls -t').split('  ').pop()).toBe('katta.log');
    expect(run(s, 'ls -S').split('  ')[0]).toBe('katta.log');
    expect(run(s, 'ls -Sr').split('  ').pop()).toBe('katta.log');
    expect(run(s, 'ls -R loyiha')).toContain('loyiha/docs:\nreja.txt');
    expect(run(s, 'ls -ld loyiha')).toMatch(/^drwx/);
  });
});

describe('text flags', () => {
  it('cat -n, nl, head -c, tail -n +N, wc on several files', () => {
    const s = shell();
    expect(run(s, 'cat -n b.txt')).toBe('     1\tolma\n     2\tbanan\n     3\tanor');
    expect(run(s, 'nl b.txt').split('\n')[2]).toBe('     3\tanor');
    expect(run(s, 'head -c 4 a.txt')).toBe('olma');
    expect(run(s, 'tail -n +3 a.txt')).toBe('olma\nolcha');
    expect(run(s, 'wc -l a.txt b.txt')).toContain('7 total');
  });

  it('grep -o -w -x -F -A -B -C -l -L -q -m -e -H', () => {
    const s = shell();
    expect(run(s, 'grep -o "ol[a-z]" a.txt')).toBe('olm\nolm\nolc');
    expect(run(s, 'grep -c -w olma a.txt')).toBe('2');
    expect(run(s, 'grep -x anor b.txt')).toBe('anor');
    expect(run(s, 'grep -F "." a.txt')).toBe('');
    expect(run(s, 'grep -A 1 banan a.txt')).toBe('banan\nolma');
    expect(run(s, 'grep -B 1 banan a.txt')).toBe('olma\nbanan');
    expect(run(s, 'grep -n -C 1 banan a.txt')).toBe('1-olma\n2:banan\n3-olma');
    expect(run(s, 'grep -l anor a.txt b.txt')).toBe('b.txt');
    expect(run(s, 'grep -L anor a.txt b.txt')).toBe('a.txt');
    expect(execLine(s, 'grep -q anor b.txt').code).toBe(0);
    expect(run(s, 'grep -m 1 olma a.txt')).toBe('olma');
    expect(run(s, 'grep -e Failed /var/log/auth.log | wc -l')).toBe('2');
    expect(run(s, 'grep -H anor b.txt')).toBe('b.txt:anor');
  });

  it('uniq -d -u -i, cut open ranges, sort -f', () => {
    const s = shell();
    expect(run(s, 'sort a.txt | uniq -d')).toBe('olma');
    expect(run(s, 'sort a.txt | uniq -u')).toBe('banan\nolcha');
    expect(run(s, 'echo "a:b:c:d" | cut -d: -f2-')).toBe('b:c:d');
    expect(run(s, 'echo "a:b:c:d" | cut -d: -f-2')).toBe('a:b');
    expect(run(s, 'echo -e "b\\nA\\nc" | sort -f')).toBe('A\nb\nc');
  });
});

describe('file commands', () => {
  it('mkdir -v -m, touch -d, rm -v, cp -v -p, mv -v, ln -s, readlink', () => {
    const s = shell();
    expect(run(s, 'mkdir -pv a/b')).toContain("created directory '/home/talaba/a/b'");
    run(s, 'mkdir -m 700 maxfiy');
    expect(run(s, 'ls -ld maxfiy')).toMatch(/^drwx------/);
    run(s, 'touch -d "2026-01-05 10:00" eski.txt');
    expect(run(s, 'ls -l eski.txt')).toContain('Jan  5 10:00');
    expect(run(s, 'cp -v a.txt nusxa.txt')).toBe("'a.txt' -> 'nusxa.txt'");
    expect(run(s, 'cp -p katta.log k2.log && ls -l k2.log')).toContain('Nov  6');
    expect(run(s, 'mv -v nusxa.txt a')).toBe("renamed 'nusxa.txt' -> 'a/nusxa.txt'");
    expect(run(s, 'rm -v a/nusxa.txt')).toBe("removed 'a/nusxa.txt'");
    run(s, 'ln -s /var/log/auth.log jurnal');
    expect(run(s, 'ls -l jurnal')).toMatch(/^lrwxrwxrwx .* jurnal -> \/var\/log\/auth.log$/);
    expect(run(s, 'cat jurnal | wc -l')).toBe('3');
    expect(run(s, 'readlink jurnal')).toBe('/var/log/auth.log');
  });

  it('find -size -mtime -newer -empty -maxdepth -exec -delete -type l', () => {
    const s = shell();
    expect(run(s, 'find . -size +4k')).toBe('./katta.log');
    expect(run(s, 'find . -type f -mtime +7')).toBe('./katta.log');
    run(s, 'touch yangi.txt');
    expect(run(s, 'find . -newer a.txt -type f')).toBe('./yangi.txt');
    expect(run(s, 'find . -empty -type f')).toBe('./yangi.txt');
    expect(run(s, 'find . -maxdepth 1 -name "*.md"')).toBe('');
    expect(run(s, 'find loyiha -name "*.txt" -exec cat {} \\;')).toBe('reja');
    run(s, 'find . -name yangi.txt -delete');
    expect(run(s, 'ls')).not.toContain('yangi.txt');
    run(s, 'ln -s a.txt havola');
    expect(run(s, 'find . -type l')).toBe('./havola');
  });

  it('tree, stat, du, df, diff, tee, xargs, basename, dirname', () => {
    const s = shell();
    expect(run(s, 'tree loyiha')).toContain('└── reja.txt');
    expect(run(s, 'tree -L 1 loyiha')).not.toContain('reja.txt');
    expect(run(s, 'stat b.txt')).toContain('Size: 16');
    expect(run(s, 'stat b.txt')).toContain('(0644/-rw-r--r--)');
    expect(run(s, 'du -sh loyiha')).toBe('23\tloyiha');
    expect(run(s, 'df -h')).toContain('Mounted on');
    expect(run(s, 'diff a.txt b.txt')).toContain('> anor');
    expect(run(s, 'diff -q a.txt b.txt')).toBe('Files a.txt and b.txt differ');
    expect(run(s, 'diff -u a.txt b.txt')).toContain('+anor');
    expect(run(s, 'echo salom | tee x.txt')).toBe('salom');
    expect(run(s, 'echo dunyo | tee -a x.txt > /dev/null; cat x.txt')).toContain('salom\ndunyo');
    expect(run(s, 'echo a.txt b.txt | xargs wc -l')).toContain('7 total');
    expect(run(s, 'ls loyiha | xargs -I {} echo fayl: {}')).toContain('fayl: main.py');
    expect(run(s, 'basename /var/log/auth.log .log')).toBe('auth');
    expect(run(s, 'dirname /var/log/auth.log')).toBe('/var/log');
  });
});

describe('users and system', () => {
  it('useradd, usermod, groups, id, userdel need root and change /etc files', () => {
    const s = shell();
    expect(run(s, 'useradd ali')).toContain('Permission denied');
    run(s, 'sudo useradd -m -s /bin/bash ali');
    expect(run(s, 'grep ali /etc/passwd')).toBe('ali:x:1001:1001::/home/ali:/bin/bash');
    expect(run(s, 'ls /home')).toContain('ali');
    run(s, 'sudo usermod -aG developers ali');
    expect(run(s, 'groups ali')).toBe('ali : ali developers');
    expect(run(s, 'id ali')).toBe('uid=1001(ali) gid=1001(ali) groups=1001(ali),1500(developers)');
    expect(run(s, 'id')).toContain('27(sudo)');
    run(s, 'sudo userdel -r ali');
    expect(run(s, 'grep -c ali /etc/passwd')).toBe('0');
  });

  it('who, w, last, uptime, free, uname, date, export', () => {
    const s = shell();
    expect(run(s, 'who')).toContain('talaba');
    expect(run(s, 'w')).toContain('load average');
    expect(run(s, 'last -n 1')).toContain('still logged in');
    expect(run(s, 'uptime')).toMatch(/up 2 days/);
    expect(run(s, 'free -h')).toMatch(/^ +total/);
    expect(run(s, 'uname -r')).toBe('6.8.11-amd64');
    expect(run(s, 'date +%F')).toBe('2026-11-18');
    run(s, 'export LOYIHA=qaydnoma');
    expect(run(s, 'echo $LOYIHA')).toBe('qaydnoma');
    expect(run(s, 'env | grep LOYIHA')).toBe('LOYIHA=qaydnoma');
  });

  it('crontab and apt', () => {
    const s = shell();
    expect(run(s, 'crontab -l')).toBe('no crontab for talaba');
    run(s, "echo '0 3 * * * /home/talaba/skript.sh' > mycron");
    run(s, 'crontab mycron');
    expect(run(s, 'crontab -l')).toBe('0 3 * * * /home/talaba/skript.sh');
    expect(run(s, 'apt install tree')).toContain('are you root?');
    run(s, 'sudo apt install tree');
    expect(run(s, 'apt list --installed | grep tree')).toContain('tree/stable');
    expect(run(s, 'apt show nmap')).toContain('Status: not installed');
  });
});

describe('network', () => {
  it('ip, ping, dig, nslookup, host, nc, curl, wget, traceroute', () => {
    const s = shell();
    expect(run(s, 'ip a')).toContain('inet 10.10.10.2/24');
    expect(run(s, 'ip r')).toContain('default via 10.10.10.1');
    expect(run(s, 'ping -c 2 srv.lab')).toContain('2 packets transmitted, 2 received');
    expect(run(s, 'ping -c 1 db.lab')).toContain('100% packet loss');
    expect(run(s, 'ping nowhere.lab')).toContain('Name or service not known');
    expect(run(s, 'dig +short srv.lab')).toBe('10.10.10.20');
    expect(run(s, 'dig +short example.com MX')).toBe('10 mail.example.com.');
    expect(run(s, 'dig -x 10.10.10.20 +short')).toBe('srv.lab.');
    expect(run(s, 'nslookup example.com')).toContain('Address: 203.0.113.80');
    expect(run(s, 'host srv.lab')).toBe('srv.lab has address 10.10.10.20');
    expect(run(s, 'nc -zv srv.lab 20-25')).toContain('22 port [tcp/*] succeeded');
    expect(run(s, 'nc srv.lab 22')).toBe('SSH-2.0-OpenSSH_9.6p1_Debian');
    expect(run(s, 'curl -I http://srv.lab/')).toContain('HTTP/1.1 200 OK');
    expect(run(s, 'curl http://srv.lab/robots.txt')).toContain('Disallow: /admin/');
    expect(run(s, 'curl -i http://srv.lab/admin/')).toContain('401');
    expect(run(s, 'curl -sL http://srv.lab/old')).toContain('<h1>srv.lab</h1>');
    expect(run(s, 'curl http://srv.lab/api/status | jq -r .version')).toBe('2.3.1');
    run(s, 'wget -q http://srv.lab/robots.txt');
    expect(run(s, 'cat robots.txt')).toContain('Disallow');
    expect(run(s, 'traceroute example.com')).toContain('203.0.113.80');
  });
});
