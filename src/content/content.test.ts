import { describe, expect, it } from 'vitest';
import { checkFlag } from '../engine/hash';
import { createShell, execLine, execLineAsync } from '../engine/terminal/shell';
import type { LabCheckCtx } from './types';
import { runLabLine } from './labs/run';
import { runSiem } from '../engine/siem';
import { CTF } from './ctf';
import { ALL_STAGES, TRACKS, allTopics, getTopicRef } from './curriculum';
import { GLOSSARY, getTerm } from './glossary';
import { INTERVIEW } from './interview';
import { LABS, getLab } from './labs';
import { glossaryRefs } from './lessonParser';
import { LESSON_SOURCES, getLesson, lessonIds } from './lessonsEager';
import META from 'virtual:lesson-meta';
import { loadSql } from '../engine/runtime/sql';
import { loadPython } from '../engine/runtime/python';
import { EXAMS } from './exams';
import { drawAttempt, EXAM_RULES } from '../engine/exam';

// Labs with SQLite databases or Python need their WebAssembly runtimes before their shells are created.
await Promise.all([loadSql(), loadPython()]);

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

  it.each(LABS.map((lab) => [lab.id, lab] as const))('%s is solvable with its sample solution', async (_id, lab) => {
    const state = createShell(lab.shell());
    const lines: string[] = [];
    expect(duplicates(lab.tasks.map((t) => t.id))).toEqual([]);

    for (const [i, task] of lab.tasks.entries()) {
      let ctx: LabCheckCtx = { state, line: '', output: '', lines };
      // A task must not be already solved before its own commands run.
      if (i > 0) expect(await safe(() => task.check(ctx)), `${task.id}: solved too early`).toBe(false);
      for (const line of task.solution) {
        ctx = await runLabLine(state, line, lines, lab.commands);
        expect(ctx.siem?.result.error, `${task.id}: ${line}`).toBeUndefined();
      }
      expect(await task.check(ctx), `${task.id}: "${task.solution.join(' ; ')}"`).toBe(true);
    }
  });
});

describe('exams', () => {
  it('have valid topics and enough well-formed questions', () => {
    const ids: string[] = [];
    for (const exam of EXAMS) {
      expect(TRACKS.some((t) => t.id === exam.id), exam.id).toBe(true);
      for (const t of exam.topics) {
        for (const s of t.stages) expect(ALL_STAGES.some((x) => x.id === s), `${exam.id}/${t.id}: stage ${s}`).toBe(true);
        expect(exam.questions.filter((q) => q.topic === t.id).length, `${exam.id}/${t.id}: questions`).toBeGreaterThanOrEqual(8);
      }
      for (const q of exam.questions) {
        ids.push(q.id);
        expect(exam.topics.some((t) => t.id === q.topic), `${q.id}: topic`).toBe(true);
        expect(q.options.length, `${q.id}: options`).toBeGreaterThanOrEqual(3);
        expect(q.options.some((o) => o.correct), `${q.id}: right option`).toBe(true);
        expect(q.options.some((o) => !o.correct), `${q.id}: wrong option`).toBe(true);
        expect(duplicates(q.options.map((o) => o.text)), `${q.id}: duplicate options`).toEqual([]);
        expect(q.explanation.length, `${q.id}: explanation`).toBeGreaterThan(10);
        expect(q.text, `${q.id}: placeholder left`).not.toContain('§');
      }
      expect(exam.questions.length).toBeGreaterThanOrEqual(EXAM_RULES.theoryCount);
      expect(new Set(exam.practicals.map((p) => p.topic)).size, `${exam.id}: practical topics`).toBeGreaterThanOrEqual(2);
      const draw = drawAttempt(exam, 7);
      expect(draw.questions).toHaveLength(EXAM_RULES.theoryCount);
      expect(draw.practicals).toHaveLength(EXAM_RULES.practicalCount);
    }
    expect(duplicates(ids)).toEqual([]);
  });

  // Neither "pick the longest" nor "pick the shortest" option may pass an exam: right answers stay about as long as
  // the wrong ones, explanations carry the reasons.
  it.each(EXAMS.map((e) => [e.id, e] as const))('%s does not give answers away by their length', (_n, exam) => {
    const single = exam.questions.filter((q) => q.options.filter((o) => o.correct).length === 1);
    let longest = 0;
    let shortest = 0;
    for (const q of single) {
      const right = q.options.find((o) => o.correct)!.text.length;
      const wrong = q.options.filter((o) => !o.correct).map((o) => o.text.length);
      const max = Math.max(...wrong);
      if (right > max) longest++;
      if (right < Math.min(...wrong)) shortest++;
      expect.soft(right, `${q.id}: right option much longer than the others`).toBeLessThanOrEqual(Math.ceil(max * 1.25));
    }
    expect(longest / single.length, 'share of questions where the right option is the longest').toBeLessThanOrEqual(0.4);
    expect(shortest / single.length, 'share of questions where the right option is the shortest').toBeLessThanOrEqual(0.4);
  });

  it.each(EXAMS.flatMap((e) => e.practicals.map((p) => [`${e.id}/${p.id}`, e, p] as const)))('%s is solvable', async (_n, exam, p) => {
    expect(exam.topics.some((t) => t.id === p.topic)).toBe(true);
    expect(p.tasks.length).toBeGreaterThanOrEqual(3);
    const state = createShell(p.shell());
    const lines: string[] = [];
    // Exam tasks may be solved in any order: none is solved before its own commands.
    for (const task of p.tasks) expect(await safe(() => task.check({ state, line: '', output: '', lines })), `${task.id}: solved too early`).toBe(false);
    for (const task of p.tasks) {
      let ctx: LabCheckCtx = { state, line: '', output: '', lines };
      for (const line of task.solution) ctx = await runLabLine(state, line, lines, p.commands);
      expect(await task.check(ctx), `${task.id}: "${task.solution.join(' ; ')}"`).toBe(true);
    }
  });
});

describe('hidden Python tests', () => {
  it('explain which case failed while a function is still a stub', async () => {
    const lab = getLab('python-asoslari')!;
    const state = createShell(lab.shell());
    const ctx = await runLabLine(state, 'python3 funksiyalar.py', []);
    const task = lab.tasks.find((t) => t.id === 'if')!;
    expect(await task.check(ctx)).toBe(false);
    const note = (await task.feedback!(ctx))!;
    expect(note).toContain("0/8 o'tdi");
    expect(note).toContain('baho(100)');
    expect(note).toContain(`kutilgan: "a'lo"`);
    expect(note).toContain('sizniki:  None');
    // Other commands stay quiet.
    expect(await task.feedback!(await runLabLine(state, 'ls', []))).toBeNull();
  });
});

async function safe(fn: () => boolean | Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
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
    'docker-history': 'flag{qatlamlar_unutmaydi}',
    'docker-diff': 'flag{diff_hammasini_aytadi}',
    'k8s-secret': 'flag{secret_bu_base64}',
    'k8s-rbac': 'flag{deploy-bot}',
    'dockerfile-arg': 'flag{6}',
    'git-deleted': 'flag{ochirilgan_fayl_tarixda}',
    'git-stash': 'flag{stash_ham_saqlaydi}',
    'git-reflog': 'flag{reflog_hech_narsani_unutmaydi}',
    'git-blame': 'flag{nodir@contractor.example}',
    'npm-prod': 'flag{lodash}',
    'siem-rare': 'flag{rundl132.exe}',
    'siem-beacon': 'flag{198.51.100.77_300}',
    'siem-spray': 'flag{t.jurayeva}',
    'siem-travel': 'flag{b.ergashev}',
    'det-sigma': 'flag{ws-hr-005}',
    'det-webshell': 'flag{/uploads/avatar_5512.php}',
    'det-yara-hex': 'flag{report_q3.bin}',
    'sql-hidden-admin': 'flag{helpdesk2}',
    'sql-foreign-notes': 'flag{sardor_37}',
    'py-config-decode': 'flag{xor_kaliti_bir_bayt}',
    'py-ua-rotation': 'flag{198.51.100.199}',
    'py-code-review': 'flag{qayd_eksport}',
  };

  it('has an answer for every challenge and nothing extra', () => {
    expect(CTF.map((c) => c.id).sort()).toEqual(Object.keys(answers).sort());
  });

  it.each(CTF.map((c) => [c.id, c] as const))('%s accepts its flag and has hints', (id, challenge) => {
    expect(checkFlag(answers[id]!, challenge.flagHash)).toBe(true);
    expect(checkFlag('flag{notogri}', challenge.flagHash)).toBe(false);
    expect(challenge.hints.length).toBeGreaterThanOrEqual(2);
  });

  it('the SIEM challenges are solved by the searches their hints point to', () => {
    const search = (id: string, lang: 'spl' | 'kql', q: string) => {
      const st = createShell(CTF.find((c) => c.id === id)!.shell!());
      const r = runSiem(st.siem!, lang, q);
      expect(r.error, q).toBeUndefined();
      return r;
    };
    const rare = search('siem-rare', 'spl', 'index=sysmon | rare limit=1 Image');
    expect(`flag{${String(rare.rows[0]!.Image).split('\\').pop()}}`).toBe(answers['siem-rare']);

    const b = search('siem-beacon', 'spl', 'index=firewall | stats count, range(_time) as davr by src_ip, dest_ip | where count > 20 | eval oraliq=round(davr/(count-1)/10)*10');
    expect(b.rows).toHaveLength(1);
    expect(`flag{${b.rows[0]!.dest_ip}_${b.rows[0]!.oraliq}}`).toBe(answers['siem-beacon']);

    const sp = search('siem-spray', 'spl', 'index=wineventlog EventCode=4625 | stats count, dc(Account_Name) as hisoblar by Source_Network_Address | where hisoblar > 10');
    expect(sp.rows).toHaveLength(1);
    const won = search('siem-spray', 'spl', `index=wineventlog EventCode=4624 Source_Network_Address=${sp.rows[0]!.Source_Network_Address}`);
    expect(`flag{${won.rows[0]!.Account_Name}}`).toBe(answers['siem-spray']);

    const tr = search('siem-travel', 'kql', 'SigninLogs | where ResultType == "0" and Location != "UZ" | project UserPrincipalName, Chet = TimeGenerated, Location | join kind=inner (SigninLogs | where ResultType == "0" and Location == "UZ" | project UserPrincipalName, Uy = TimeGenerated) on UserPrincipalName | extend Farq = abs(Chet - Uy) | where Farq < 1h | distinct UserPrincipalName');
    expect(tr.rows).toHaveLength(1);
    expect(`flag{${String(tr.rows[0]!.UserPrincipalName).split('@')[0]}}`).toBe(answers['siem-travel']);
  });

  it('the SQL challenges are solved by the queries their hints describe', () => {
    const sql = (id: string, db: string, q: string) => execLine(createShell(CTF.find((c) => c.id === id)!.shell!()), `sqlite3 ${db} "${q}"`).output;
    const admins = sql('sql-hidden-admin', 'dokon.db', "SELECT username FROM users WHERE role = 'admin' AND email NOT LIKE '%@dokon.example.com' AND strftime('%H', created) < '06';");
    expect(`flag{${admins}}`).toBe(answers['sql-hidden-admin']);
    const q = 'SELECT a.user, COUNT(DISTINCT a.note_id) AS n FROM access_log a JOIN notes n ON n.id = a.note_id LEFT JOIN shares s ON s.note_id = a.note_id AND s.shared_with = a.user WHERE a.user != n.owner AND s.note_id IS NULL GROUP BY a.user ORDER BY n DESC;';
    const rows = sql('sql-foreign-notes', 'qaydlar.db', q).split('\n');
    expect(rows).toHaveLength(1);
    expect(`flag{${rows[0]!.replace('|', '_')}}`).toBe(answers['sql-foreign-notes']);
    // Without the shares check, the team lead who reads notes shared with her would look worse.
    const naive = sql('sql-foreign-notes', 'qaydlar.db', 'SELECT a.user FROM access_log a JOIN notes n ON n.id = a.note_id WHERE a.user != n.owner GROUP BY a.user ORDER BY COUNT(DISTINCT a.note_id) DESC LIMIT 1;');
    expect(naive).toBe('malika');
  });

  it('the Python challenges are solved by the scripts their hints describe', async () => {
    const py = async (id: string, code: string) => (await execLineAsync(createShell(CTF.find((c) => c.id === id)!.shell!()), `python3 -c "${code}"`)).output.trim();
    expect(await py('py-config-decode', "import base64, json; d = base64.b64decode(open('config.txt').read()); print('flag' + json.loads(bytes(b ^ 0x5A for b in d).decode())['id'][4:])")).toBe(answers['py-config-decode']);
    const ua = await py('py-ua-rotation', "u = {}\nfor q in open('access.log'): u.setdefault(q.split()[0], set()).add(q.split(chr(34))[-2])\nprint(max(u, key=lambda ip: len(u[ip])))");
    expect(`flag{${ua}}`).toBe(answers['py-ua-rotation']);
    const busiest = await py('py-ua-rotation', "from collections import Counter; print(Counter(q.split()[0] for q in open('access.log')).most_common(1)[0][0])");
    expect(`flag{${busiest}}`).not.toBe(answers['py-ua-rotation']);
    // Exactly one function builds its SQL from input.
    const review = CTF.find((c) => c.id === 'py-code-review')!;
    const src = (review.shell!().fs.home as { talaba: { ctf: Record<string, string> } }).talaba.ctf['baza.py']!;
    const risky = src.split('\n\n\n').filter((f) => /% \(|f"SELECT|" \+ [a-z_]+\)|' \+ /.test(f) && !f.includes('ruxsat[ustun]'));
    expect(risky.map((f) => /def (\w+)/.exec(f)![1])).toEqual(['qayd_eksport']);
  });

  it('the detection challenges are solved with the tools their hints name', () => {
    const shellOf = (id: string) => createShell(CTF.find((c) => c.id === id)!.shell!());
    const sg = shellOf('det-sigma');
    execLine(sg, "sed -i 's/CommandLine|contains:/CommandLine|contains|all:/' rules/certutil_download.yml");
    const q = execLine(sg, 'sigma convert -t splunk -p sysmon rules/certutil_download.yml').output;
    const loose = runSiem(sg.siem!, 'spl', execLine(createShell(CTF.find((c) => c.id === 'det-sigma')!.shell!()), 'sigma convert -t splunk -p sysmon rules/certutil_download.yml').output);
    expect(new Set(loose.rows.map((r) => r.host)).size).toBeGreaterThan(1);
    const hits = runSiem(sg.siem!, 'spl', q);
    expect(new Set(hits.rows.map((r) => String(r.host).toLowerCase()))).toEqual(new Set(['ws-hr-005']));
    expect(`flag{${String(hits.rows[0]!.host).toLowerCase()}}`).toBe(answers['det-sigma']);

    const ws = shellOf('det-webshell');
    execLine(ws, 'zeek -r dmz.pcap');
    const php = execLine(ws, 'cat http.log | zeek-cut uri | grep php | cut -d? -f1 | sort -u').output.trim();
    expect(`flag{${php}}`).toBe(answers['det-webshell']);
    execLine(ws, `echo 'alert http any any -> any any (msg:"web shell"; http.uri; content:"/uploads/"; content:".php"; sid:1000100;)' >> rules/local.rules`);
    execLine(ws, 'suricata -r dmz.pcap -S rules/local.rules -l out');
    expect(execLine(ws, 'cat out/fast.log').output).toContain('198.51.100.140');

    const yr = shellOf('det-yara-hex');
    execLine(yr, "echo 'rule Cfg37 { strings: $c = { 43 46 47 21 07 03 00 00 } condition: uint16(0) == 0x5A4D and $c }' > v.yar");
    const found = execLine(yr, 'yara v.yar /srv/samples').output.trim();
    expect(found.split('\n')).toHaveLength(1);
    expect(`flag{${found.split('/').pop()}}`).toBe(answers['det-yara-hex']);
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

  it('the git challenges can be solved with git', () => {
    const solve = (id: string, cwd: string, ...lines: string[]) => {
      const s = createShell(CTF.find((c) => c.id === id)!.shell!());
      execLine(s, `cd ${cwd}`);
      return lines.map((l) => execLine(s, l).output).pop()!.trim();
    };
    const deleted = solve('git-deleted', 'landing', 'git log --diff-filter=D --name-only --oneline');
    expect(deleted).toContain('config/analytics.json');
    const id = deleted.split(' ')[0]!;
    expect(solve('git-deleted', 'landing', `git show ${id}~1:config/analytics.json`)).toContain(answers['git-deleted']);
    expect(solve('git-stash', 'api', 'git log --all -p')).not.toContain('flag{');
    expect(solve('git-stash', 'api', 'git stash show -p stash@{0}')).toContain(answers['git-stash']);
    expect(solve('git-reflog', 'infra', 'git log --all -p')).not.toContain('flag{');
    expect(solve('git-reflog', 'infra', 'git reflog')).toContain('HEAD@{2}: commit: temp: debug values');
    expect(solve('git-reflog', 'infra', 'git show HEAD@{2}')).toContain(answers['git-reflog']);
    const line = solve('git-blame', 'billing', 'grep -n eval src/report.js').split(':')[0];
    const blamed = solve('git-blame', 'billing', `git blame -L ${line},${line} src/report.js`).split(' ')[0]!;
    expect(`flag{${solve('git-blame', 'billing', `git log -n 1 --format='%ae' ${blamed}`)}}`).toBe(answers['git-blame']);
  });

  it('the container challenges can be solved with docker and kubectl', () => {
    const solve = (id: string, ...lines: string[]) => {
      const s = createShell(CTF.find((c) => c.id === id)!.shell!());
      return lines.map((l) => execLine(s, l).output).pop()!.trim();
    };
    const hist = solve('docker-history', 'docker history --no-trunc billing:3.1');
    const b64 = /echo (\S+) \| base64 -d/.exec(hist)![1]!;
    expect(solve('docker-history', `echo ${b64} | base64 -d`)).toBe(answers['docker-history']);
    expect(solve('docker-history', 'docker history billing:3.1')).not.toContain(b64);
    expect(solve('docker-diff', 'docker diff shop')).toContain('A /etc/cron.d/sync');
    const cron = solve('docker-diff', 'docker exec shop cat /etc/cron.d/sync');
    expect(solve('docker-diff', `echo ${/echo (\S+) \|/.exec(cron)![1]} | base64 -d`)).toBe(answers['docker-diff']);
    expect(solve('k8s-secret', "kubectl get secret ctf-vault -n staging -o jsonpath='{.data.flag}' | base64 -d")).toBe(answers['k8s-secret']);
    const who = ['monitor', 'deploy-bot', 'backup'].filter((sa) => solve('k8s-rbac', `kubectl auth can-i delete pods -n prod --as=system:serviceaccount:prod:${sa}`) === 'yes');
    expect(`flag{${who.join('')}}`).toBe(answers['k8s-rbac']);
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
