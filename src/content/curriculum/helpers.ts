import type { Module, Resource, ResourceKind, Topic } from '../types';

/** Topic with its study time given in hours. */
export function topic(
  id: string,
  title: string,
  hours: number,
  summary: string,
  goals: string[],
  resources: Resource[],
  extra: Pick<Topic, 'labs' | 'ctf'> = {},
): Topic {
  return { id, title, minutes: Math.round(hours * 60), summary, goals, resources, ...extra };
}

export function mod(id: string, title: string, topics: Topic[]): Module {
  return { id, title, topics };
}

function make(kind: ResourceKind) {
  return (title: string, url: string, note?: string): Resource => ({ kind, title, url, lang: 'en', note });
}

/** Resource shorthands. Everything listed is free unless the note says otherwise. */
export const r = {
  video: make('video'),
  course: make('course'),
  article: make('article'),
  docs: make('docs'),
  lab: make('lab'),
  book: make('book'),
  tool: make('tool'),
  /** TryHackMe room or module: found by name on the site. */
  thm: (name: string): Resource => ({
    kind: 'lab',
    title: `TryHackMe — ${name}`,
    url: 'https://tryhackme.com/',
    lang: 'en',
    note: "Saytda shu nom bilan qidiring. Ko'p xonalar bepul.",
  }),
  /** Hack The Box Academy module. */
  htb: (name: string): Resource => ({
    kind: 'course',
    title: `HTB Academy — ${name}`,
    url: 'https://academy.hackthebox.com/',
    lang: 'en',
    note: "Modul nomi bo'yicha qidiring. Boshlang'ich modullar bepul.",
  }),
  /** PortSwigger Web Security Academy topic. */
  ps: (name: string, slug: string): Resource => ({
    kind: 'lab',
    title: `PortSwigger Academy — ${name}`,
    url: `https://portswigger.net/web-security/${slug}`,
    lang: 'en',
    note: 'Bepul nazariya va interaktiv lablar.',
  }),
  /** HackNow — O'zbekistondagi mahalliy CTF va amaliyot platformasi (izolyatsiyalangan lablar). */
  hacknow: (name: string): Resource => ({
    kind: 'lab',
    title: `HackNow — ${name}`,
    url: 'https://platform.hacknow.uz/',
    lang: 'uz',
    note: "O'zbekcha platforma: izolyatsiyalangan labda CTF va HTB/THM uslubidagi xonalar. Kuniga 4 ta lab bepul.",
  }),
};
