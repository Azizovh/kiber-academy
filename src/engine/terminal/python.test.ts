import { beforeAll, describe, expect, it } from 'vitest';
import { evalPython, loadPython } from '../runtime/python';
import { loadSql } from '../runtime/sql';
import { createShell, execLine } from './shell';
import { fileAt } from '../../content/labs/helpers';

beforeAll(async () => {
  await Promise.all([loadPython(), loadSql()]);
}, 60000);

const LOG = 'Nov 18 03:00:02 srv sshd[1]: Failed password for root from 203.0.113.77 port 4242 ssh2\nNov 18 03:00:05 srv sshd[1]: Failed password for admin from 203.0.113.77 port 4243 ssh2\nNov 18 09:05:00 srv sshd[2]: Accepted publickey for deploy from 10.10.0.5 port 50122 ssh2\n';

function sh() {
  const state = createShell({
    fs: {
      home: {
        talaba: {
          'tahlil.py': "import re, sys\nfrom collections import Counter\nips = Counter(re.findall(r'from (\\S+) port', open('auth.log').read()))\nfor ip, n in ips.most_common():\n    print(ip, n)\nprint('argv:', sys.argv[1:])\n",
          'auth.log': LOG,
          'yoz.py': "with open('hisobot.txt', 'w') as f:\n    f.write('salom\\n')\nimport os\nos.remove('ochir.txt')\n",
          'ochir.txt': 'x',
          'xato.py': 'def f(x):\n    return 10 / x\n\nprint(f(0))\n',
          'sintaksis.py': 'print("salom"\n',
          'sikl.py': 'while True:\n    pass\n',
          'modul.py': 'def kvadrat(n):\n    return n * n\n\nif __name__ == "__main__":\n    print("asosiy")\n',
          'baza.py': "import sqlite3\nc = sqlite3.connect('app.db')\nc.execute('INSERT INTO t VALUES (?)', (7,))\nc.commit()\nprint(c.execute('SELECT SUM(x) FROM t').fetchone()[0])\n",
        },
      },
      tmp: {},
    },
    sqlite: { '/home/talaba/app.db': 'CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (5);' },
  });
  return { state, run: (line: string) => execLine(state, line) };
}

describe('python3', () => {
  it('runs a script that reads lab files, with arguments', () => {
    const { run } = sh();
    expect(run('python3 tahlil.py --qisqa').output).toBe("203.0.113.77 2\n10.10.0.5 1\nargv: ['--qisqa']");
    expect(run('python3 -c "print(sum(range(10)))"').output).toBe('45');
    expect(run('python3 --version').output).toMatch(/^Python 3\.\d+\.\d+$/);
  });

  it('copies files the program writes or deletes back to the lab', () => {
    const { state, run } = sh();
    run('python3 yoz.py');
    expect(fileAt(state, '/home/talaba/hisobot.txt')).toBe('salom\n');
    expect(fileAt(state, '/home/talaba/ochir.txt')).toBeNull();
    expect(run('cat hisobot.txt').output).toBe('salom');
  });

  it('prints tracebacks like CPython, without the runtime frames', () => {
    const { run } = sh();
    const r = run('python3 xato.py');
    expect(r.output).toContain('Traceback (most recent call last):');
    expect(r.output).toContain('File "/home/talaba/xato.py", line 4, in <module>');
    expect(r.output).toContain('ZeroDivisionError: division by zero');
    expect(r.output).not.toContain('runpy');
    expect(run('python3 sintaksis.py').output).toMatch(/SyntaxError: '\(' was never closed/);
    expect(run('python3 yoq.py').output).toBe("python3: can't open file '/home/talaba/yoq.py': [Errno 2] No such file or directory");
  });

  it('stops endless loops', () => {
    const { run } = sh();
    const t = Date.now();
    expect(run('python3 sikl.py').output).toContain('TimeoutError');
    expect(Date.now() - t).toBeLessThan(15000);
  }, 20000);

  it('sees changes to imported modules between runs, and works with sqlite3 files', () => {
    const { state, run } = sh();
    expect(run('python3 -c "from modul import kvadrat; print(kvadrat(4))"').output).toBe('16');
    run("sed -i 's/n \\* n/n * n * n/' modul.py");
    expect(run('python3 -c "from modul import kvadrat; print(kvadrat(4))"').output).toBe('64');
    expect(run('python3 baza.py').output).toBe('12');
    expect(run('sqlite3 app.db "SELECT COUNT(*) FROM t"').output).toBe('2');
    expect(evalPython(state, 'from modul import kvadrat\nkvadrat(3)').value).toBe(27);
  });

  it('explains python and pip', () => {
    const { run } = sh();
    expect(run('python x.py').output).toMatch(/Command 'python' not found/);
    expect(run('pip install requests').output).toMatch(/internet yo'q/);
    expect(run('python3').output).toMatch(/interaktiv >>> rejim yo'q/);
  });
});
