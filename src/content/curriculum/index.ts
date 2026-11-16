import type { SpecialityId, Stage, Topic, Track, TrackId } from '../types';
import type { TopicRef } from '../../engine/progress';
import { APPSEC } from './appsec';
import { CAREER } from './career';
import { CLOUD } from './cloud';
import { FOUNDATION } from './foundation';
import { PENTEST } from './pentest';
import { SOC } from './soc';

export const TRACKS: Track[] = [
  {
    id: 'foundation',
    title: 'Poydevor',
    short: 'Poydevor',
    summary: "Hamma yo'nalish uchun majburiy asos: kompyuter, tarmoq, Linux, dasturlash va xavfsizlik tushunchalari.",
    jobs: [],
    stages: FOUNDATION,
  },
  {
    id: 'pentest',
    title: 'Pentest / Red Team',
    short: 'Pentest',
    summary: "Hujumchi kabi o'ylab, tizimlardagi zaifliklarni egasidan oldin topish.",
    jobs: ['Junior Penetration Tester', 'Vulnerability Analyst', 'Bug Bounty Hunter'],
    stages: PENTEST,
  },
  {
    id: 'soc',
    title: 'SOC / Blue Team',
    short: 'SOC',
    summary: "Hujumlarni kuzatish, aniqlash, to'xtatish va tergov qilish.",
    jobs: ['SOC Analyst (L1)', 'Incident Responder', 'Threat Hunter'],
    stages: SOC,
  },
  {
    id: 'appsec',
    title: 'AppSec',
    short: 'AppSec',
    summary: "Dasturlarni boshidanoq xavfsiz qilish: kod, arxitektura va ishlab chiqish jarayoni.",
    jobs: ['Application Security Engineer', 'Security Code Reviewer', 'DevSecOps Engineer'],
    stages: APPSEC,
  },
  {
    id: 'cloud',
    title: 'Cloud va infratuzilma',
    short: 'Cloud',
    summary: "Bulut, server va konteyner infratuzilmasini qurish va himoyalash.",
    jobs: ['Cloud Security Engineer', 'Security Engineer', 'DevSecOps Engineer'],
    stages: CLOUD,
  },
  {
    id: 'career',
    title: 'Karyera',
    short: 'Karyera',
    summary: "Bilimni ishga aylantirish: portfolio, rezyume, intervyu.",
    jobs: [],
    stages: CAREER,
  },
];

export const SPECIALITIES: SpecialityId[] = ['pentest', 'soc', 'appsec', 'cloud'];

export function getTrack(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id)!;
}

export const ALL_STAGES: Stage[] = TRACKS.flatMap((t) => t.stages);

const stageIndex = new Map(ALL_STAGES.map((s) => [s.id, s]));
const topicIndex = new Map<string, TopicRef>();
for (const stage of ALL_STAGES) {
  for (const module of stage.modules) {
    for (const topic of module.topics) topicIndex.set(topic.id, { stage, module, topic });
  }
}

export function getStage(id: string): Stage | null {
  return stageIndex.get(id) ?? null;
}

export function getTopicRef(id: string): TopicRef | null {
  return topicIndex.get(id) ?? null;
}

export function allTopics(): Topic[] {
  return [...topicIndex.values()].map((r) => r.topic);
}

/** Number of a stage inside its track, starting at 0 for the foundation ("0-bosqich"). */
export function stageNumber(stage: Stage): number {
  const track = getTrack(stage.track);
  const index = track.stages.indexOf(stage);
  return stage.track === 'foundation' ? index : index + 1;
}

/** The topics before and after `topicId` in its track, crossing stage borders. */
export function neighbours(topicId: string): { prev: TopicRef | null; next: TopicRef | null } {
  const ref = topicIndex.get(topicId);
  if (!ref) return { prev: null, next: null };
  const refs = getTrack(ref.stage.track).stages.flatMap((stage) =>
    stage.modules.flatMap((module) => module.topics.map((topic) => ({ stage, module, topic }))),
  );
  const i = refs.findIndex((r) => r.topic.id === topicId);
  return { prev: refs[i - 1] ?? null, next: refs[i + 1] ?? null };
}
