# KiberAkademiya — working notes for Claude

A local-first learning app that takes a complete beginner to a first cybersecurity job.
Specification: `docs/TZ.md`. Architecture: `docs/ARCHITECTURE.md`. Read both before large changes.

## Talking to the user

- Reply in **Uzbek (Latin script)**. Lesson content is Uzbek; code, comments and commit messages are English.
- The user is the product owner and currently the only learner; not a professional developer. Explain decisions plainly.
- For big features, ask several rounds of questions first, then build in phases without stopping.
- In November 2026 the user asked that finished work be committed and pushed to `origin main`
  (`github.com/Azizovh/kiber-academy`) as it lands. End commit messages with the `Co-Authored-By` line your session specifies.

## State (v1.7.0)

Done: the whole platform, the full roadmap (foundation + 4 specialities + career), **full lessons for all six
foundation stages** (`s0`–`s5`, 52 topics), **the whole SOC / Blue Team track** (`b1`–`b4`, 33 topics:
logs, SIEM and detection, IR and forensics, hunting, automation, cloud logs, purple team, portfolio,
certification), **the Career stage** (`k1-karyera`, 8 topics, written for all tracks), **the whole AppSec
track** (`a1`–`a4`, 28 topics) and **the whole Cloud track** (`c1`–`c4`, 24 topics: servers and networks, AWS,
IAM, cloud network and data protection, monitoring, misconfigurations, CSPM, secrets, Docker, Kubernetes,
Terraform, IaC scanning, cloud IR, zero trust, compliance, portfolio, certification). **Pentest is partial by
decision** (17 topics: all of `p1` and `p4`, plus three `p2` topics — see "Content boundaries"). 6 terminal labs, 11 CTF
challenges, glossary, interview bank (47 questions; SOC 15, Cloud 12, AppSec only 3 — worth extending).

The Cloud lessons take Qaydnoma to AWS (`qaydnoma-web-01`, `qaydnoma.example.com`, 203.0.113.20, VPC 10.10.0.0/16,
account 111122223333, eu-central-1) and reuse the b4 leaked-key story (`ci-deploy`, `backup-svc`, 203.0.113.77,
2026-11-16 UTC) as the c4 incident-response case.

The AppSec lessons share one example app, **Qaydnoma** (a Flask notes app with sharing, an admin panel and a JSON
API): built in a1, its vulnerabilities found and fixed in a2 (with `load_note(id, Action)` as the central
authorization layer and pytest security tests), threat-modelled and scanned in a3, put into CI/CD and containers in
a4, and turned into the portfolio project. Keep using it in later tracks where it fits.

The Pentest lessons follow engagement **PT-2026-07** against Qaydnoma (grey box; tester IP 198.51.100.50; test
accounts tester1, tester2, testadmin; in scope `api.qaydnoma.example.com` and 203.0.113.16/29; `staging` added to
scope by the client, `dev-old` being removed by the client). The p4 report lesson lists its findings F-01…F-06 with
CVSS 3.1 vectors computed by script.

The SOC lessons share one running incident (WS-BUX-014, d.karimova, Word → PowerShell, C2 203.0.113.45,
update-check.example-cdn.net; local time UTC+5, first execution 04:32 UTC). Other tracks may refer back to it.

Not written yet — every topic below has goals and resources only ("map mode"):

| Track | Stage ids | Notes |
|---|---|---|
| Pentest | `p2-web` (8 vulnerability topics), `p3-tizim` (all) | Paused by decision — see "Content boundaries" |

Topic ids, titles, goals and hours live in `src/content/curriculum/*.ts`. Other backlog is at the end of this file.

## Commands

```bash
npm run dev        # http://localhost:5183
npm test           # engine + content-integrity tests — run after every lesson batch
npm run build      # typecheck + build; REQUIRED before the desktop shortcut shows new content
npm run desktop    # open the built app in an Electron window
node scripts/check-links.mjs   # check external resource links
```

## Adding a lesson

1. Create `src/content/lessons/<stage-id>/<topic-id>.md`. The file name must equal the topic id and the folder the
   stage id. No code change is needed: the lesson, its quiz tab and its flashcards appear automatically.
2. When every topic of a stage has a lesson, add the stage id to `FINISHED_STAGES` in `src/content/content.test.ts`.
3. `npm test`, then `npm run build`.
4. For a release: bump `version` in `package.json` **and** `src/version.ts`, tick the row in `docs/TZ.md` §7.

### Format

Plain Markdown plus `:::` blocks (the marker must be alone on its line; a block ends with `:::`):

```
:::key   :::tip   :::info   :::warn   :::try      callouts (Markdown inside)
:::lab terminal-birinchi-qadam                    one line, no closing marker — link card to a terminal lab

:::quiz
? Question text
- wrong option
+ correct option            (several + lines make it multi-select)
! Explanation of the right answer
:::

:::cards
Front :: Back
:::
```

Glossary reference: `[[term-id]]` or `[[term-id|shown text]]`. Ids are in `src/content/glossary.ts`; add the term there
if it is missing.

### What the content test enforces

More than 3 segments (so at least two callouts), ≥ 5 quiz questions and ≥ 5 cards per lesson; every question has ≥ 3
options, at least one right and one wrong, unique option texts and an explanation; every `[[ref]]`, `:::lab` id and
curriculum `labs`/`ctf` id exists; glossary and curriculum ids are unique; every lab is solvable with its `solution`
commands; every CTF flag matches its hash.

### Pitfalls that already bit

- **`|` inside a table cell** must be written `\|` — also inside backticks.
- **Cards split on the first `::`** — never put `::` in card text (IPv6 addresses, Python slices like `[::2]`).
- **Glossary ids must be bare lower-case slugs** (`[a-z0-9-]`). This is deliberate: Bash tests such as
  `[[ -f file ]]` in code samples would otherwise be parsed as glossary links.
- **No labelled glossary refs inside table rows**: `[[id|text]]` has a raw `|` that splits the cell, and `[[id\|text]]`
  no longer matches the glossary pattern. Link the term in prose instead.
- **Do not bulk-rewrite lessons with a regex inside a shell-quoted `node -e`.** Shell quoting turned `\\|` into an
  alternation once and stripped every `]]` from five lessons. Put such scripts in a file, use plain string
  replacement, and check `git diff` before going on.
- In `:::quiz`, every line must start with `?`, `+`, `-` or `!`; a multi-line question is only allowed before its options.
- **No Cyrillic letters.** A Cyrillic "о" slipped into the word `daho` twice. After a batch, search lessons for
  `[а-яА-Я]`. The one deliberate exception is the Unicode example `ў` in `s1-kompyuter/malumot-kodlash.md`.
- **Gate commits on the test exit code**, not on `grep` output: `npx vitest run | grep ... && git commit` commits even
  when tests fail, because grep happily matches the "failed" line. This pushed a broken lesson once.
- Every lesson needs at least two callouts besides the quiz and cards (`:::key`, `:::warn`, `:::tip`, `:::info`,
  `:::try`) — a lesson with only `:::try` fails the segment test.
- Never invent computed values (hashes, Base64, hex, subnets, CVSS scores): compute them with a tool, or leave them out.
- Raw HTML only inside code spans or fences.

### Style of the existing lessons — keep it

- Open with a concrete hook (a scene or a question), not a definition.
- `##` sections, many small tables, ASCII diagrams in code fences, real commands with comments.
- Technical terms stay in English, explained in Uzbek, glossary-linked on first mention.
- Constantly tie back to earlier lessons ("tarmoq bosqichidan eslaysiz…") — the course is cumulative.
- Each lesson states honestly what a tool or control does **not** do.
- End with `:::try` hands-on tasks (with answers), then `## Xulosa` (bullets), then `:::quiz` (8–12 questions) and
  `:::cards` (9–12).
- Use documentation ranges and fictional names: `example.com`, `mybank.uz`, `203.0.113.x`, `198.51.100.x`,
  `10.10.10.x`. No real brands as phishing or attack targets.
- A topic's `minutes` is total study time (lesson + practice), far more than the reading time.

## Content boundaries

Lessons are written from the defender's and the auditor's side: how something works, how it is detected, how it is
fixed. A session that drifted into step-by-step privilege-escalation detail was stopped by the safety filter, and the
lesson was rewritten without it. Practical consequences:

- Explain mechanisms and defences; send learners to legal training platforms (TryHackMe, PortSwigger Academy,
  OverTheWire, Hack The Box) for hands-on exploitation practice. The roadmap already links them per topic.
- Do not write exploit recipes, payload lists, password-cracking or evasion walkthroughs, or malware code.
- The Pentest track therefore concentrates on methodology, scoping and rules of engagement, reconnaissance concepts,
  reading tool output, reporting, and the defensive meaning of each finding.
- Network tools in examples target only the learner's own lab; say so in the lesson.
- In November 2026 a second session was stopped by the safety filter while writing the Pentest lesson on finding
  SQL injection from the tester's side. Do not retry that lesson in any wording. The per-vulnerability Pentest topics
  (p2 vulnerability lessons, p3 privilege escalation and Active Directory attacks) stay in map mode unless the user
  decides otherwise; each vulnerability is already covered defensively in a2. In November 2026 the user chose
  "safe topics only". Written so far: all of p1, all of p4 (report writing, independent boxes, bug bounty,
  red team concepts, how defensive tools detect, certification), and `burp-suite`, `web-razvedka`,
  `pt-web-amaliyot` in p2. `himoyadan-otish` is written strictly as "how AV/EDR detect and what traces a tester
  leaves"; it says outright that evasion is not taught. Keep it that way.

## Accounts and cloud sync (added after v1.7.0)

- Optional sign-in through Supabase (email + password everywhere, Google on the website only; Electron cannot take an
  OAuth redirect to `file://`). Without `VITE_SUPABASE_*` keys the app is local-only, exactly as before — keep that
  path working. Setup guide for the user: `docs/SUPABASE.md`; schema and RLS: `supabase/schema.sql`.
- PKCE flow on purpose: the implicit flow puts tokens in the URL hash, which HashRouter owns.
- `services/sync.ts` stores the whole local state as one JSON row (`user_state.data`) plus `summary` for the admin page.
  Every save is read-merge-write with the pure rules in `engine/merge.ts` ("keep the furthest progress", idempotent).
  Consequence: deletions (a cleared note) can come back from another device; the full reset writes the cloud copy
  directly (`resetEverywhere`). Adding a store means adding it to `SyncData`, `readLocal`, `applyLocal` and the merge.
- Admin = `profiles.is_admin`, set only by SQL in the Supabase dashboard; users cannot update that column.
- Vercel hosts the site (`cbersecurity-learning-platform.vercel.app`) and deploys from GitHub; env vars live there.
  For the desktop shortcut the same keys go into a local `.env` before `npm run build`.

## Code conventions

- React 19 + TypeScript (strict) + Vite, zustand with `persist`, `HashRouter`, hand-written CSS with tokens in
  `src/styles/tokens.css` (dark default, light via `data-theme`). No UI framework, no Tailwind.
- Three layers, kept apart: `content/` is data, `engine/` is pure functions with tests, `store/` holds state.
  Derived values (status, percentages, dates, streak) are computed, never stored.
- UI strings are Uzbek and live in the components (single-language by decision; see TZ §7).
- Comments say why, not what. Match the surrounding style.
- The terminal simulator prints real English error texts on purpose ("Permission denied").

## Environment facts

- Windows 11. An Application Control policy blocks freshly built unsigned executables, so the packaged
  `release/*.exe` does not run on this PC and the NSIS installer cannot be built. Do not try to get around it.
  The desktop app is launched through `KiberAkademiya.lnk`, which starts the stock
  `node_modules\electron\dist\electron.exe` with this folder. It loads `dist/`, hence `npm run build`.
- npm here skips dependency install scripts: after a fresh install run `node node_modules/electron/install.js`.
- Browser and desktop window keep separate localStorage; progress moves between them via Sozlamalar → Ma'lumotlar.

## Backlog beyond lessons

- Labs for the process/service and Bash lessons (the simulator has no `ps`, `systemctl` or script execution);
  Python and SQL exercises currently run on the learner's own machine. More CTF challenges for stages 2–5.
- The OWASP lesson follows the 2021 list and only summarises the newer edition — verify against owasp.org.
- No subject-matter expert has reviewed the lessons; the tests check structure, not facts.
- Links were last checked at v1.0: 11 answered 403 (bot protection) and were not opened in a browser, and
  `git-scm.com` did not resolve from this network. Links added since then have not been checked.
- The JS bundle is ~1.4 MB because lessons are bundled eagerly — fine locally, split by stage before a web launch.
- v2 (see TZ): accounts and Supabase sync, AI tutor, Russian/English interface, code signing for a real `.exe`.
