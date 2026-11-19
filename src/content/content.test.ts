import { describe, expect, it } from 'vitest';
import { checkFlag } from '../engine/hash';
import { createShell, execLine } from '../engine/terminal/shell';
import { CTF } from './ctf';
import { ALL_STAGES, TRACKS, allTopics, getTopicRef } from './curriculum';
import { GLOSSARY, getTerm } from './glossary';
import { INTERVIEW } from './interview';
import { LABS, getLab } from './labs';
import { glossaryRefs } from './lessonParser';
import { LESSON_SOURCES, getLesson, lessonIds } from './lessonsEager';
import META from 'virtual:lesson-meta';

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

describe('curriculum', () => {
  const topics = allTopics();

  it('has unique stage, module and topic ids', () => {
    expect(duplicates(ALL_STAGES.map((s) => s.id))).toEqual([]);
    expect(duplicates(ALL_STAGES.flatMap((s) => s.modules.map((m) => m.id)))).toEqual([]);
    expect(duplicates(ALL_STAGES.flatMap((s) => s.modules.flatMap((m) => m.topics.map((t) => t.id))))).toEqual([]);
  });

  it('gives every topic goals, resources and a sane study time', () => {
    for (const t of topics) {
      expect(t.goals.length, `${t.id}: goals`).toBeGreaterThan(0);
      expect(t.resources.length, `${t.id}: resources`).toBeGreaterThan(0);
      expect(t.minutes, `${t.id}: minutes`).toBeGreaterThanOrEqual(60);
      for (const r of t.resources) expect(r.url, `${t.id}: ${r.title}`).toMatch(/^https?:\/\/\S+$/);
    }
  });

  it('links only to labs and challenges that exist', () => {
    for (const t of topics) {
      for (const id of t.labs ?? []) expect(getLab(id), `${t.id} → lab ${id}`).not.toBeNull();
      for (const id of t.ctf ?? []) expect(CTF.some((c) => c.id === id), `${t.id} → ctf ${id}`).toBe(true);
    }
  });

  it('keeps the promised size of the programme', () => {
    const hours = (trackId: string) =>
      TRACKS.find((t) => t.id === trackId)!
        .stages.flatMap((s) => s.modules.flatMap((m) => m.topics))
        .reduce((sum, t) => sum + t.minutes, 0) / 60;
    expect(hours('foundation')).toBeGreaterThanOrEqual(280);
    expect(hours('foundation')).toBeLessThanOrEqual(320);
    for (const id of ['pentest', 'soc', 'appsec', 'cloud']) {
      expect(hours(id), id).toBeGreaterThanOrEqual(340);
      expect(hours(id), id).toBeLessThanOrEqual(460);
    }
  });
});

/** Stages whose every topic must have a full lesson. */
const FINISHED_STAGES = ['s0-kirish', 's1-kompyuter', 's2-tarmoq', 's3-linux', 's4-dasturlash', 's5-xavfsizlik', 'b1-soc-asoslari', 'b2-siem', 'b3-ir-forensics', 'b4-hunting', 'k1-karyera', 'a1-web-chuqur', 'a2-zaifliklar', 'a3-ssdlc', 'a4-devsecops', 'c1-infratuzilma', 'c2-bulut-xavfsizligi', 'c3-konteyner', 'c4-professional', 'p1-asoslar', 'p4-professional'];

describe('lessons', () => {
  const ids = lessonIds();

  it('match the build-time metadata the app uses before a lesson is loaded', () => {
    expect(Object.keys(META).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const lesson = getLesson(id)!;
      expect(META[id], id).toEqual({ readMinutes: lesson.readMinutes, quiz: lesson.quiz.length, cards: lesson.cards.length });
    }
  });

  it('exist for every topic of the finished stages', () => {
    const expected = ALL_STAGES.filter((s) => FINISHED_STAGES.includes(s.id)).flatMap((s) =>
      s.modules.flatMap((m) => m.topics.map((t) => t.id)),
    );
    expect(expected.filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('belong to a topic and sit in that topic\'s stage folder', () => {
    for (const path of Object.keys(import.meta.glob('./lessons/**/*.md'))) {
      const [, , folder, name] = path.split('/');
      const ref = getTopicRef(name!.replace(/\.md$/, ''));
      expect(ref, path).not.toBeNull();
      expect(ref!.stage.id, path).toBe(folder);
    }
  });

  it.each(ids)('%s parses into a full lesson', (id) => {
    const lesson = getLesson(id)!;
    expect(lesson.segments.length).toBeGreaterThan(3);
    expect(lesson.quiz.length).toBeGreaterThanOrEqual(5);
    expect(lesson.cards.length).toBeGreaterThanOrEqual(5);
    expect(duplicates(lesson.cards.map((c) => c.id))).toEqual([]);

    for (const q of lesson.quiz) {
      expect(q.options.length, q.text).toBeGreaterThanOrEqual(3);
      expect(q.options.some((o) => o.correct), q.text).toBe(true);
      expect(q.options.some((o) => !o.correct), q.text).toBe(true);
      expect(q.explanation, q.text).toBeTruthy();
      expect(duplicates(q.options.map((o) => o.text)), q.text).toEqual([]);
    }
    for (const seg of lesson.segments) {
      if (seg.type === 'lab') expect(getLab(seg.labId), `lab ${seg.labId}`).not.toBeNull();
    }
    for (const ref of glossaryRefs(LESSON_SOURCES[id]!)) expect(getTerm(ref), `[[${ref}]]`).not.toBeNull();
    // An escaped pipe (needed inside tables) stops the glossary pattern from matching; the ref would show raw.
    expect(LESSON_SOURCES[id]!, 'glossary ref with \\| — link the term outside the table').not.toMatch(/\[\[[a-z0-9-]+\\\|/);
    // No block marker may leak into the rendered text.
    for (const seg of lesson.segments) {
      if (seg.type !== 'lab') expect(seg.text).not.toMatch(/^:::/m);
    }
  });
});

describe('glossary and interview bank', () => {
  it('has unique ids and non-empty texts', () => {
    expect(duplicates(GLOSSARY.map((t) => t.id))).toEqual([]);
    for (const t of GLOSSARY) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/);
      expect(t.text.length, t.id).toBeGreaterThan(20);
    }
    expect(duplicates(INTERVIEW.map((q) => q.id))).toEqual([]);
  });
});

describe('terminal labs', () => {
  it('have unique ids', () => {
    expect(duplicates(LABS.map((l) => l.id))).toEqual([]);
  });

  it.each(LABS.map((lab) => [lab.id, lab] as const))('%s is solvable with its sample solution', (_id, lab) => {
    const state = createShell(lab.shell());
    const lines: string[] = [];
    expect(duplicates(lab.tasks.map((t) => t.id))).toEqual([]);

    lab.tasks.forEach((task, i) => {
      let ctx = { state, line: '', output: '', lines };
      // A task must not be already solved before its own commands run.
      if (i > 0) expect(safe(() => task.check(ctx)), `${task.id}: solved too early`).toBe(false);
      for (const line of task.solution) {
        const res = execLine(state, line, lab.commands);
        lines.push(line);
        ctx = { state, line, output: res.output, lines: [...lines] };
      }
      expect(task.check(ctx), `${task.id}: "${task.solution.join(' ; ')}"`).toBe(true);
    });
  });
});

function safe(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}

describe('CTF', () => {
  /** Plain answers live only here. */
  const answers: Record<string, string> = {
    'enc-base64': 'flag{base64_shifr_emas}',
    'enc-hex': 'flag{hex_oson_ekan}',
    'enc-binary': 'flag{0_va_1}',
    'enc-layers': 'flag{uch_qavat_piyoz}',
    'cry-caesar': 'flag{sezar_yetti_qadam}',
    'cry-xor': 'flag{xor_bitta_kalit}',
    'lin-hidden': 'flag{yashirin_fayl_topildi}',
    'log-bruteforce': 'flag{203.0.113.45_deploy}',
    'web-source': 'flag{devtools_dost}',
    'net-subnet': 'flag{192.168.10.64_192.168.10.127}',
    'for-magic': 'flag{png}',
    'lin-cron': 'flag{cron_doim_tekshiriladi}',
    'lin-fake-process': 'flag{3317}',
    'lin-suid': 'flag{netdiag}',
    'for-integrity': 'flag{login}',
    'log-webscan': 'flag{198.51.100.61_sqlmap}',
    'log-useradd': 'flag{support}',
    'log-timeline': 'flag{44}',
    'log-dns': 'flag{example-sync.net}',
    'for-phish': 'flag{mybank-secure.example}',
    'web-jwt': 'flag{aziz_auditor}',
    'web-headers': 'flag{strict-transport-security}',
    'web-code-review': 'flag{14}',
    'web-authz': 'flag{/api/v1/admin/export}',
    'cloud-s3-policy': 'flag{qaydnoma-backups}',
    'cloud-sg': 'flag{5432}',
    'cloud-iam': 'flag{getobject_putobject}',
    'cloud-trail-user': 'flag{ops-temp}',
    'cry-hash-id': 'flag{sha256}',
    'win-hidden': 'flag{hidden_atributi}',
    'win-runkey': 'flag{edgeupd.exe}',
    'win-encoded': 'flag{kodlangan_buyruq_ochildi}',
    'win-new-admin': 'flag{itsupport2}',
    'win-c2': 'flag{9e424bf3}',
    'pcap-ftp': 'flag{tarmoq_eshitadi}',
    'pcap-basic': 'flag{basic_bu_base64}',
    'pcap-dns-exfil': 'flag{dns_tunnel_ushlandi}',
    'pcap-scan': 'flag{22_3306_8080}',
    'pcap-beacon': 'flag{cdn-sync.example_300}',
  };

  it('has an answer for every challenge and nothing extra', () => {
    expect(CTF.map((c) => c.id).sort()).toEqual(Object.keys(answers).sort());
  });

  it.each(CTF.map((c) => [c.id, c] as const))('%s accepts its flag and has hints', (id, challenge) => {
    expect(checkFlag(answers[id]!, challenge.flagHash)).toBe(true);
    expect(checkFlag('flag{notogri}', challenge.flagHash)).toBe(false);
    expect(challenge.hints.length).toBeGreaterThanOrEqual(2);
  });

  it('the data of the encoding challenges really decodes to the flag', () => {
    const data = (id: string) => CTF.find((c) => c.id === id)!.data!;
    const state = createShell({ fs: { home: { talaba: {} } } });
    const run = (line: string) => execLine(state, line).output;

    expect(run(`echo ${data('enc-base64')} | base64 -d`)).toBe(answers['enc-base64']);
    expect(run(`echo "${data('enc-hex')}" | xxd -r -p`)).toBe(answers['enc-hex']);
    expect(run(`echo ${data('enc-layers')} | base64 -d | xxd -r -p | base64 -d`)).toBe(answers['enc-layers']);
    expect(run(`echo "${data('cry-caesar')}" | tr 'a-z' 't-za-s'`)).toBe(answers['cry-caesar']);

    const bits = data('enc-binary').split(' ').map((b) => String.fromCharCode(parseInt(b, 2))).join('');
    expect(bits).toBe(answers['enc-binary']);

    const xored = data('cry-xor').match(/../g)!.map((h) => String.fromCharCode(parseInt(h, 16) ^ 0x2a)).join('');
    expect(xored).toBe(answers['cry-xor']);
  });

  it('the terminal challenges can be solved in their own shell', () => {
    const hidden = CTF.find((c) => c.id === 'lin-hidden')!;
    const s1 = createShell(hidden.shell!());
    const found = execLine(s1, 'find / -name "*flag*"').output;
    expect(execLine(s1, `cat ${found}`).output).toBe(answers['lin-hidden']);

    const log = CTF.find((c) => c.id === 'log-bruteforce')!;
    const s2 = createShell(log.shell!());
    const top = execLine(s2, 'grep "Failed password" /var/log/auth.log | cut -d " " -f 11 | sort | uniq -c | sort -rn | head -n 1').output;
    expect(top.trim().split(/\s+/)[1]).toBe('203.0.113.45');
    expect(execLine(s2, 'grep Accepted /var/log/auth.log | grep 203.0.113.45').output).toContain('for deploy from');
  });

  it('the traffic challenges can be solved with tcpdump and tshark', () => {
    const solve = (id: string, ...lines: string[]) => {
      const s = createShell(CTF.find((c) => c.id === id)!.shell!());
      return lines.map((l) => execLine(s, l).output).pop()!.trim();
    };
    expect(`flag{${solve('pcap-ftp', `tshark -r ftp.pcap -Y 'ftp.request.command == "PASS"' -T fields -e ftp.request.arg`)}}`).toBe(answers['pcap-ftp']);
    expect(execLine(createShell({ fs: {} }), 'echo cm91dGVyOmZsYWd7YmFzaWNfYnVfYmFzZTY0fQ== | base64 -d').output).toBe('router:' + answers['pcap-basic']);
    expect(solve('pcap-dns-exfil', `tshark -r dns.pcap -Y 'dns.qry.name contains "cdn-metrics" && dns.flags.response == 0' -T fields -e dns.qry.name | cut -d. -f1 | tr -d '\n' | xxd -r -p`)).toBe(answers['pcap-dns-exfil']);
    const open = solve('pcap-scan', `tshark -r skan.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 1 && ip.dst == 198.51.100.200' -T fields -e tcp.srcport | sort -n -u`);
    expect(`flag{${open.split('\n').join('_')}}`).toBe(answers['pcap-scan']);
    const top = solve('pcap-beacon', 'tshark -r ofis-http.pcap -Y http.request -T fields -e http.host | sort | uniq -c | sort -rn | head -n 1');
    expect(top).toMatch(/^6 cdn-sync\.example$/);
    const deltas = solve('pcap-beacon', `tshark -r ofis-http.pcap -Y 'http.host == "cdn-sync.example"' -T fields -e frame.time_delta_displayed`);
    expect(deltas.split('\n').slice(1).every((d) => d === '300.000000')).toBe(true);
  });

  it('the Windows challenges can be solved in PowerShell', () => {
    const solve = (id: string, ...lines: string[]) => {
      const s = createShell(CTF.find((c) => c.id === id)!.shell!());
      return lines.map((l) => execLine(s, l).output).pop()!.trim();
    };
    const found = solve('win-hidden', 'Get-ChildItem -Recurse -Hidden -File | Select-Object -ExpandProperty FullName');
    expect(found).toBe(String.raw`C:\Users\talaba\AppData\Roaming\Kesh\eslatma.txt`);
    expect(solve('win-hidden', `Get-Content ${found}`)).toBe(answers['win-hidden']);
    expect(solve('win-runkey', String.raw`Get-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Run`)).toContain(String.raw`Temp\edgeupd.exe`);
    expect(
      solve('win-encoded', "$a = (Get-ScheduledTask -TaskName WindowsTelemetry).Actions.Arguments", "[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String(($a -split ' ')[-1]))"),
    ).toBe("Write-Output '" + answers['win-encoded'] + "'");
    const pid = solve('win-c2', "Get-NetTCPConnection -State Established | Where-Object { $_.RemoteAddress -notlike '10.*' } | Select-Object -ExpandProperty OwningProcess");
    const path = solve('win-c2', `Get-Process -Id ${pid} | Select-Object -ExpandProperty Path`);
    const hash = solve('win-c2', `Get-FileHash ${path} | Select-Object -ExpandProperty Hash`);
    expect(`flag{${hash.slice(0, 8).toLowerCase()}}`).toBe(answers['win-c2']);
  });

  it('the second set can be solved with the tools the course teaches', () => {
    const solve = (id: string, ...lines: string[]) => {
      const s = createShell(CTF.find((c) => c.id === id)!.shell!());
      return lines.map((l) => execLine(s, l).output).pop()!.trim();
    };

    const cronLine = solve('lin-cron', 'cat /etc/cron.d/sysupdate');
    const b64 = /echo (\S+) \|/.exec(cronLine)![1]!;
    expect(solve('lin-cron', `echo ${b64} | base64 -d`)).toBe(answers['lin-cron']);

    expect(solve('lin-fake-process', 'ps aux | grep /dev/shm')).toMatch(/^www-data\s+3317\b/);
    expect(solve('lin-suid', 'find / -perm -4000 -type f')).toContain('/opt/tools/netdiag');
    expect(solve('for-integrity', 'sudo sha256sum -c /root/baseline.sha256')).toContain('/usr/bin/login: FAILED');

    expect(solve('log-webscan', "awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -n 1")).toContain('198.51.100.61');
    expect(solve('log-webscan', `awk -F'"' '{print $6}' access.log | sort | uniq -c`)).toContain('sqlmap/');
    expect(solve('log-useradd', 'grep -i useradd /var/log/auth.log')).toContain('name=support');
    expect(
      solve('log-dns', "cut -d= -f3 /var/log/dns.log | cut -d' ' -f1 | rev | cut -d. -f1,2 | rev | sort | uniq -c | sort -rn | head -n 1"),
    ).toMatch(/^10 example-sync\.net$/);
    expect(solve('cloud-trail-user', `jq -r 'select(.eventName == "CreateUser") | .requestParameters.userName' cloudtrail.json`)).toBe('ops-temp');

    // Data challenges: the JWT payload decodes as stated, and line 14 is the injectable one.
    const jwt = CTF.find((c) => c.id === 'web-jwt')!.data!.split('.')[1]!;
    const s = createShell({ fs: { home: { talaba: {} } } });
    expect(execLine(s, `echo ${jwt} | base64 -d`).output).toContain('"user":"aziz","role":"auditor"');
    const line14 = CTF.find((c) => c.id === 'web-code-review')!.data!.split('\n').find((l) => l.trimStart().startsWith('14 '));
    expect(line14).toContain("LIKE '%{q}%'");
  });
});

describe('lab teaching notes', () => {
  it('only name documented commands and flags', async () => {
    const { getDoc } = await import('../engine/terminal/docs');
    const problems: string[] = [];
    for (const lab of LABS) {
      for (const task of lab.tasks) {
        for (const entry of task.teach ?? []) {
          const [cmd, ...rest] = entry.split(/\s+/);
          const doc = getDoc(cmd!);
          if (!doc) {
            problems.push(`${lab.id}/${task.id}: no doc for ${cmd}`);
            continue;
          }
          const flag = rest.join(' ');
          if (flag && !doc.flags.some(([f]) => f === flag || f.split(/\s*\/\s*|\s+/).includes(flag))) {
            problems.push(`${lab.id}/${task.id}: ${cmd} has no documented flag ${flag}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
