import { describe, expect, it } from 'vitest';
import { file } from './fs';
import { complete, createShell, execLine, promptPath, type ShellState } from './shell';

function shell(): ShellState {
  return createShell({
    fs: {
      home: {
        talaba: {
          'a.txt': 'olma\nanor\nbehi\nolma\n',
          'nums.txt': '10\n9\n100\n',
          docs: { 'reja.txt': 'birinchi\n', '.yashirin': 'sir\n' },
        },
      },
      etc: { shadow: file('root:xesh\n', 0o640), hostname: 'kali\n' },
      tmp: {},
    },
  });
}

const run = (s: ShellState, line: string) => execLine(s, line).output;

describe('navigation', () => {
  it('starts in the home directory', () => {
    const s = shell();
    expect(run(s, 'pwd')).toBe('/home/talaba');
    expect(promptPath(s)).toBe('~');
  });

  it('cd handles relative, absolute, .., ~ and -', () => {
    const s = shell();
    run(s, 'cd docs');
    expect(s.cwd).toBe('/home/talaba/docs');
    run(s, 'cd ../..');
    expect(s.cwd).toBe('/home');
    run(s, 'cd /etc');
    expect(run(s, 'cd -')).toBe('/home');
    expect(s.cwd).toBe('/home');
    run(s, 'cd');
    expect(s.cwd).toBe('/home/talaba');
  });

  it('reports missing directories like bash', () => {
    const res = execLine(shell(), 'cd yoq');
    expect(res.output).toContain('No such file or directory');
    expect(res.code).toBe(1);
  });

  it('ls hides dotfiles unless -a and marks directories', () => {
    const s = shell();
    expect(run(s, 'ls')).toBe('a.txt  docs/  nums.txt');
    expect(run(s, 'ls docs')).toBe('reja.txt');
    expect(run(s, 'ls -a docs')).toContain('.yashirin');
    expect(run(s, 'ls -l')).toMatch(/^total \d+\n-rw-r--r-- 1 talaba/);
  });
});

describe('files', () => {
  it('creates, copies, moves and removes', () => {
    const s = shell();
    run(s, 'mkdir -p x/y');
    run(s, 'touch x/y/f.txt');
    run(s, 'cp a.txt x/b.txt');
    run(s, 'mv x/b.txt x/c.txt');
    expect(run(s, 'ls x')).toBe('c.txt  y/');
    expect(execLine(s, 'rm x').output).toContain('Is a directory');
    run(s, 'rm -r x');
    expect(run(s, 'ls')).toBe('a.txt  docs/  nums.txt');
  });

  it('redirects with > and >>', () => {
    const s = shell();
    run(s, 'echo bir > n.txt');
    run(s, 'echo ikki >> n.txt');
    expect(run(s, 'cat n.txt')).toBe('bir\nikki');
    run(s, 'echo uch > n.txt');
    expect(run(s, 'cat n.txt')).toBe('uch');
  });

  it('expands globs and variables', () => {
    const s = shell();
    expect(run(s, 'echo *.txt')).toBe('a.txt nums.txt');
    expect(run(s, 'echo $HOME $USER')).toBe('/home/talaba talaba');
    expect(run(s, "echo '*.txt'")).toBe('*.txt');
  });

  it('find matches names across the tree', () => {
    expect(run(shell(), 'find / -name "*.txt"').split('\n')).toEqual([
      '/home/talaba/a.txt',
      '/home/talaba/docs/reja.txt',
      '/home/talaba/nums.txt',
    ]);
  });
});

describe('text tools and pipes', () => {
  it('grep filters, counts and inverts', () => {
    const s = shell();
    expect(run(s, 'grep olma a.txt')).toBe('olma\nolma');
    expect(run(s, 'grep -c olma a.txt')).toBe('2');
    expect(run(s, 'grep -v olma a.txt')).toBe('anor\nbehi');
    expect(run(s, 'grep -n anor a.txt')).toBe('2:anor');
    expect(execLine(s, 'grep yoq a.txt').code).toBe(1);
  });

  it('chains sort | uniq -c | sort -rn', () => {
    const lines = run(shell(), 'cat a.txt | sort | uniq -c | sort -rn').split('\n');
    expect(lines[0]).toMatch(/^\s+2 olma$/);
    expect(lines).toHaveLength(3);
  });

  it('sorts numerically, cuts fields, counts lines', () => {
    const s = shell();
    expect(run(s, 'sort -n nums.txt')).toBe('9\n10\n100');
    expect(run(s, 'echo a:b:c | cut -d : -f 2')).toBe('b');
    expect(run(s, 'wc -l a.txt')).toBe('4 a.txt');
    expect(run(s, 'head -n 2 a.txt')).toBe('olma\nanor');
    expect(run(s, 'tail -n 1 a.txt')).toBe('olma');
  });

  it('encodes and decodes', () => {
    const s = shell();
    // Like real echo, the newline is part of the input; echo -n leaves it out.
    expect(run(s, 'echo salom | base64')).toBe('c2Fsb20K');
    expect(run(s, 'echo -n salom | base64')).toBe('c2Fsb20=');
    expect(run(s, 'echo c2Fsb20= | base64 -d')).toBe('salom');
    expect(run(s, 'echo -n Kali | xxd -p')).toBe('4b616c69');
    expect(run(s, 'echo 4b616c69 | xxd -r -p')).toBe('Kali');
    expect(run(s, "echo Uryyb | tr 'A-Za-z' 'N-ZA-Mn-za-m'")).toBe('Hello');
  });

  it('&& stops on failure, ; does not', () => {
    const s = shell();
    expect(run(s, 'cd yoq && echo ok')).not.toContain('ok');
    expect(run(s, 'cd yoq ; echo ok')).toContain('ok');
  });
});

describe('permissions', () => {
  it('denies reading a root-only file, sudo allows it', () => {
    const s = shell();
    expect(run(s, 'cat /etc/shadow')).toContain('Permission denied');
    expect(run(s, 'sudo cat /etc/shadow')).toBe('root:xesh');
    expect(run(s, 'whoami')).toBe('talaba');
    expect(run(s, 'sudo whoami')).toBe('root');
  });

  it('chmod accepts octal and symbolic modes', () => {
    const s = shell();
    run(s, 'chmod 600 a.txt');
    expect(run(s, 'ls -l a.txt')).toMatch(/^-rw-------/);
    run(s, 'chmod u+x,o+r a.txt');
    expect(run(s, 'ls -l a.txt')).toMatch(/^-rwx---r--/);
    run(s, 'chmod 000 a.txt');
    expect(run(s, 'cat a.txt')).toContain('Permission denied');
  });

  it("refuses chmod on someone else's file and writes outside home", () => {
    const s = shell();
    expect(run(s, 'chmod 644 /etc/shadow')).toContain('Operation not permitted');
    expect(run(s, 'touch /etc/yangi')).toContain('Permission denied');
    expect(run(s, 'echo x > /etc/hostname')).toContain('Permission denied');
    expect(run(s, 'touch /tmp/ok')).toBe('');
  });
});

describe('shell behaviour', () => {
  it('reports unknown commands and unclosed quotes', () => {
    const s = shell();
    expect(execLine(s, 'nimadir').code).toBe(127);
    expect(execLine(s, 'echo "ochiq').code).toBe(2);
  });

  it('keeps history and clears the screen', () => {
    const s = shell();
    run(s, 'pwd');
    expect(run(s, 'history')).toContain('1  pwd');
    expect(execLine(s, 'clear').clear).toBe(true);
  });

  it('runs lab-specific commands', () => {
    const s = shell();
    const res = execLine(s, 'ping 1.1.1.1 | grep pong', { ping: (args) => `pong ${args[0]}` });
    expect(res.output).toBe('pong 1.1.1.1');
  });

  it('completes commands and paths', () => {
    const s = shell();
    expect(complete(s, 'whoa').line).toBe('whoami ');
    expect(complete(s, 'cat a').line).toBe('cat a.txt ');
    expect(complete(s, 'cd d').line).toBe('cd docs/');
    expect(complete(s, 'cat /etc/').options).toEqual(['hostname', 'shadow']);
  });
});
