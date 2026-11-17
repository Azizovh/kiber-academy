import { describe, expect, it } from 'vitest';
import { checkFlag } from '../engine/hash';
import { createShell, execLine } from '../engine/terminal/shell';
import { CTF } from './ctf';
import { ALL_STAGES, TRACKS, allTopics, getTopicRef } from './curriculum';
import { GLOSSARY, getTerm } from './glossary';
import { INTERVIEW } from './interview';
import { LABS, getLab } from './labs';
import { glossaryRefs } from './lessonParser';
import { LESSON_SOURCES, getLesson, lessonIds } from './lessons';

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
const FINISHED_STAGES = ['s0-kirish', 's1-kompyuter', 's2-tarmoq', 's3-linux', 's4-dasturlash', 's5-xavfsizlik', 'b1-soc-asoslari', 'b2-siem', 'b3-ir-forensics', 'b4-hunting', 'k1-karyera', 'a1-web-chuqur', 'a2-zaifliklar', 'a3-ssdlc'];

describe('lessons', () => {
  const ids = lessonIds();

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
});
