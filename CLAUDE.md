# KiberAkademiya — working notes for Claude

A local-first learning app that takes a complete beginner to a first cybersecurity job.
Specification: `docs/TZ.md`. Architecture: `docs/ARCHITECTURE.md`. Read both before large changes.

## Talking to the user

- Reply in **Uzbek (Latin script)**. Lesson content is Uzbek; code, comments and commit messages are English.
- The user is the product owner and currently the only learner; not a professional developer. Explain decisions plainly.
- For big features, ask several rounds of questions first, then build in phases without stopping.
- In November 2026 the user asked that finished work be committed and pushed to `origin main`
  (`github.com/Azizovh/kiber-academy`) as it lands. End commit messages with the `Co-Authored-By` line your session specifies.

## State (v1.18.0)

Done: the whole platform, the full roadmap (foundation + 4 specialities + career), **full lessons for all six
foundation stages** (`s0`–`s5`, 52 topics), **the whole SOC / Blue Team track** (`b1`–`b4`, 33 topics:
logs, SIEM and detection, IR and forensics, hunting, automation, cloud logs, purple team, portfolio,
certification), **the Career stage** (`k1-karyera`, 8 topics, written for all tracks), **the whole AppSec
track** (`a1`–`a4`, 28 topics) and **the whole Cloud track** (`c1`–`c4`, 24 topics: servers and networks, AWS,
IAM, cloud network and data protection, monitoring, misconfigurations, CSPM, secrets, Docker, Kubernetes,
Terraform, IaC scanning, cloud IR, zero trust, compliance, portfolio, certification). **Pentest is partial by
decision** (17 topics: all of `p1` and `p4`, plus three `p2` topics — see "Content boundaries"). 36 labs (10–29 tasks each, last one a `challenge`; three are PowerShell on Windows, three traffic
analysis, three Docker/Kubernetes, three Git/code security, two SIEM labs, three detection labs: Sigma with terminal + SIEM tabs, Zeek/Suricata, YARA, two SQL labs and four Python labs with terminal + code editor), 61 CTF challenges (Linux admin, Windows, traffic,
containers, git, SOC logs, SIEM, SQL, Python, AppSec, Cloud included), glossary, interview bank (68 questions: general 12, Pentest 15, SOC 15, AppSec 14, Cloud 12).

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

### How lessons reach the app

Each lesson is its own lazily loaded chunk (`src/content/lessons.ts`, `useLesson`, `loadCards`). Pages that only need
"has a lesson / quiz count / reading time" use `lessonMeta`/`lessonInfo`, which come from `virtual:lesson-meta`, built
from the Markdown by `scripts/lessonMetaPlugin.ts`. A test checks the metadata matches the parsed lessons. Only tests may
import `lessonsEager.ts` — anywhere else it pulls every lesson back into the main bundle.

The share image and home-screen icons in `public/` are rendered by `npx electron scripts/make-og.cjs`.

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
- **`String.replace(a, b)` treats `$` in `b` as a pattern** (`` $` `` inserts everything before the match). Inserting text
  that contains `$` this way once duplicated half of this file. Use a function replacement or slice and concatenate.
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

## Accounts and cloud sync (v1.8.0)

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

## Terminal simulator

`src/engine/terminal/`: `shell.ts` (tokenizer, pipes, redirects, && and ;, NAME=value, scripts via `bash f` or `./f`
with $1..$9), `commands.ts` (file and text basics), `system.ts` (processes, systemd services, sockets: ps, pgrep, kill,
systemctl, journalctl, ss — a lab describes them in `ShellInit.system`), `text.ts` (awk, sed, jq, sha256sum subsets).
Single quotes keep `$` literal, as in bash. Labs may add their own commands (`Lab.commands`, e.g. curl, nmap). Every
lab and terminal CTF has a scripted solution that the content tests run.
Also `files.ts` (ls/grep/find/cp/... with most real flags), `users.ts` (users, cron, apt, env, date, uname), `net.ts`
(ip, ping, dig, nc, curl, wget on simulated hosts) and `docs.ts`: one entry per command with flag rows and examples,
used by `help`, `man`, the /buyruqlar page and lab teaching notes. A lab task's `teach: ["cmd", "cmd FLAG"]` shows that
flag's row before the task (TeachPanel); a content test fails if the doc or flag row is missing — add the row to
`docs.ts` first. `challenge: true` marks the final task, which has a vaguer hint on purpose. Lab checks compare with
values computed from the lab's own data, never hand-typed counts.

**PowerShell** (`src/engine/pwsh/`): a lab whose `shell()` returns `windows: WinSpec` gets a PowerShell 7 terminal
(`ShellState.win`; `execLine`, `promptPath` and `complete` dispatch on it). `fs` is the C:\ drive (`Users/talaba` =
`C:\Users\talaba`; names match case-insensitively). `parse.ts` (argument vs expression mode, script blocks, hashtables,
`[Type]::Member`), `eval.ts` (object pipeline, parameter binding with prefixes, aliases, PS7 concise errors),
`format.ts` (table for ≤4 properties or a `view`, list otherwise; `group`/`header` for directory and event listings),
`cmdlets/` (files and registry, processes/services/tasks/users/CIM, network and firewall, Get-WinEvent and Defender),
`docs.ts` (`PS_DOCS`, category `powershell`, merged into `ALL_DOCS`). Lab checks read `state.win` (services, tasks,
registry map keyed by lower-cased `HKLM:\...` path, firewall, defender). Doc names must not clash with Linux docs —
native tools are `whoami.exe`, `hostname.exe`, `ping.exe`. Shell heredocs mangle backslashes: write Windows content
with the Write tool and `String.raw` (`W`) in lab files.

**Traffic captures** (`pcap.ts`, `pcaptools.ts`, `pcapBuild.ts` in `src/engine/terminal/`): a capture file is the pcap
magic bytes plus Base64 JSON of `Pkt` records (addresses, ports, TCP flags, text payload, DNS/ICMP/ARP/TLS details), so
`file` recognises it and `cat` shows noise. `dissect()` turns packets into frames with Wireshark field names
(`ip.addr`, `tcp.stream`, `http.request.uri`, `dns.qry.name`, `ftp.request.arg`, `tls.handshake.extensions_server_name`...).
`tcpdump -r` (BPF subset, `-n/-nn`, `-A`, `-X`, `-e`, `-w`), `tshark -r` (display filters, `-T fields -e`, `-z conv|
endpoints|io,phs|io,stat|follow`) and `capinfos` print like the real tools. Labs build captures with `Capture`
(`dns`, `tcp` sessions with exchanges, `tls`, `probe`, `ping`, `arp`) and compute expected answers with `dissect`.

**Containers** (`docker.ts`, `kube.ts`, `yaml.ts`, `templates.ts` in `src/engine/terminal/`): `ShellInit.docker`
(images with layers, vulns, secrets, fs; containers with config, logs, procs, diff, fs) drives `docker` (ps/images/
inspect -f/history/logs/exec/run with hardening flags/stop/rm/rmi/top/stats/port/diff), `trivy image` and `hadolint`
(real DL rule codes). `ShellInit.k8s` (namespaces, nodes, pods, deployments, services, secrets, RBAC, network
policies, events) drives `kubectl` (get with -n/-A/-o wide|yaml|json|jsonpath/-l, describe, logs, exec, top,
auth can-i with --as, delete, scale, apply -f, cordon). `docker exec`/`kubectl exec` run in a per-container
`ShellState` built from the container's fs and env. Go templates and JSONPath live in `templates.ts`; YAML subset
in `yaml.ts`. Vulnerability data in labs uses real CVEs with their real affected/fixed versions only. When array
literals of lab objects mix different keys (secrets data, pods with/without logs), TypeScript widens them — add a
type assertion (`<KPod[]>`, `<K8sSpec['secrets']>`).

**Git and code security** (`git.ts`, `codesec.ts`): `ShellInit.git` describes repositories commit by commit
(`changes` per commit, `branch`/`from`/`merge`, `orphan` for reset-away commits, explicit `reflog`, `stash`,
`worktree` edits); the working tree is written into `fs`, ids are computed (labs get them with `idOf`, which runs
`createRepos` on a throwaway root). `git` covers status/log (-S, --author, --grep, --stat, -p, --format, --diff-filter,
A..B, -- path)/show (REV:path)/diff/blame/grep/branch/switch/checkout/add/rm --cached/commit/restore/reflog/stash/
check-ignore/filter-repo (--path --invert-paths, --replace-text; needs --force; drops remotes, reflog, stash).
`gitleaks git|dir|detect` uses gitleaks' rule IDs and scans refs + stash (not orphans); `npm audit|audit fix|ls`
reads package-lock.json against `ShellInit.npm.advisories` (real GHSA ids only); `semgrep --config` runs the lab's
pattern-regex rules. `sed` uses basic regex like GNU sed (`-E`/`-r` for extended). **Fake secrets in source files
are assembled from parts** (`fake('sk_', 'live_', ...)`): GitHub push protection rejected a commit with a literal
fake Slack webhook URL.

**SIEM** (`src/engine/siem/`): `ShellInit.siem` (`indexes` of `SiemEvent`s for Splunk, `tables` of rows for Sentinel,
`lookups`, a fixed `now`; times are Unix seconds UTC) gives a lab or CTF the SIEM pane (`panes: ['siem']`, or
`['terminal', 'siem']` for tabs over one shared machine). `spl.ts`: implicit `search` (whole-token term matching,
OR binds tighter than AND, `!=` vs `NOT`, earliest/latest) plus where, eval (`expr.ts`, Splunk eval semantics:
bare words are fields, `where` is case-sensitive), stats, eventstats, timechart, chart, bin, table, fields, rename,
sort, head, tail, reverse, dedup, top, rare, rex, lookup, inputlookup, fillnull, mvexpand, makeresults; no
subsearch, it says so. `kusto.ts`: where, project(-away/-rename), extend, summarize (count_/dcount_X names,
arg_max, expressions over aggregates), sort/order (desc by default), take, top, count, distinct, join
(inner/innerunique/leftouter/leftanti/leftsemi), getschema, render; unknown columns are errors. Errors use the real
products' wording. Lab solutions write SIEM searches as `spl('...')` / `kql('...')` (`labs/run.ts`, lines
"spl> q"); a check gets `ctx.siem = { lang, query, result }`, and helpers `colIs`, `oneNumber`, `rowWhere` in
`labs/siem.ts`. Lab data is generated with the seeded `prng`, and expected answers are computed from it. The
reference docs are `siem/docs.ts` (names `spl:stats`, `kql:summarize`, shown by `title`); teach entries use those
names. The SOC incident data (`labs/siemIncident.ts`) follows the timeline in `b3-ir-forensics/ir-hisobot.md`;
`buildIncident(extend)` adds lab-specific events before the Defender tables are derived.

**Detection tools** (`sigma.ts`, `suricata.ts`, `zeek.ts`, `yara.ts`, shared file helpers in `toolio.ts`, docs in
`detectDocs.ts`, category `aniqlash`): `sigma check|convert -t splunk -p sysmon|-t kusto -p microsoft_xdr` (modifiers
contains/startswith/endswith/all; no re/cidr; adds EventID per logsource category — SIEM data for Sigma labs carries
`EventID` as well as `EventCode`); `suricata -r pcap -S rules -l dir [-T]` writes fast.log and eve.json (sticky
buffers http.*/dns.query/tls.sni, flow, flags, threshold, detection_filter; HOME_NET from
/etc/suricata/suricata.yaml; per-packet matching); `zeek -r pcap` writes conn/dns/http/ssl.log in the cwd and
`zeek-cut` reads stdin (`cat conn.log | zeek-cut ...`, the shell has no `<`); `yara` (text/wide/nocase/fullword, hex
with wildcards and jumps, regex, uint16(0), filesize, N of them; unreferenced strings are errors, no modules); `strings
-n/-e l/-t`. Lab files hold binary samples as one character per byte (`pe()`, `wide()` in `labs/yaraLab.ts`). Checks
that need to run a tool use a `quiet` helper that removes the call from the learner's history. `sed` replacement
follows GNU sed (`\` is one backslash, `&` the match, `$` literal).

**SQL and the code editor** (v1.17): `engine/runtime/` holds WebAssembly runtimes loaded on demand — `sql.ts`
(sql.js; `loadSql()` is async, everything after it is sync). A lab or CTF lists them in `runtimes: ['sql']`; the lab
page shows a loading card until they are ready (`useRuntimes`), and `content.test.ts` awaits `loadSql()` at the top.
`ShellInit.sqlite` maps absolute paths to SQL scripts that become real database files (bytes stored one character per
byte; `file` says "SQLite 3.x database"). `sqlite3` (`terminal/sqlite.ts`) is one-shot only: `sqlite3 [-box|-column|
-csv|-json|-line|-header] DB "SQL"` or `".tables" ".schema" ".indexes" ".read file.sql"`; it writes changes back and
records `state.sqliteLast` (result sets), which checks read through `labs/sqlHelpers.ts` (`lastResult`, `column`,
`sameSet`, `hasRows`, `expectRows`/`queryDb` against the lab's own database — expected answers are always computed).
The `editor` pane (`components/CodeEditor.tsx`, CodeMirror, lazily loaded) lists text files under `Lab.editor.root`,
autosaves into the shared shell's fs and re-reads files when its tab is shown. Docs: `terminal/sqlDocs.ts`
(`sqlite3` plus `sql:select`, `sql:join` ... shown by title, category `sql`). Electron loads WASM from `file://`
without problems (fetch works there; checked). **Bash heredocs in this environment can halve backslashes** — write
scripts that contain regexes or `\n` with the Write tool, not `cat <<EOF`.

**Python** (v1.18): `runtime/python.ts` loads Pyodide (CPython 3.14 in WebAssembly, ~13 MB). In the browser it is
served from `public/pyodide`, which `scripts/copy-runtimes.mjs` fills from `node_modules/pyodide` before
`npm run dev` / `npm run build` (gitignored; Vercel runs the prebuild hook too); in tests `loadPyodide()` reads the
package directly. `runPython` mirrors the lab's file system into Pyodide's (every top-level dir except Pyodide's own;
under `/home` each user dir), runs `_ka_run` (runpy, fresh user modules each run, argv, cwd, tracebacks without
runtime frames, a `sys.settrace` deadline of 5 s against endless loops, output capped) and copies created, changed
and deleted files back. `python3 FILE|-c CODE|--version`; `python` and `pip` only explain themselves. Python's own
`sqlite3` works on the lab's database files. Hidden tests: `labs/pyHelpers.ts` `pyCases(file, func, [[args, expected]])`
spreads `check` + `feedback` into a task — it imports the learner's file (main block not run), calls the function
(expected values are Python literals computed from lab data in TS; `'raises ValueError'` expects an exception) and the
lab page prints the first failing case in amber (`LabTask.feedback`, `CommandMessage { warn }`). Sample solutions write
files the way the editor would: `edit(path, content)` and `editFn(path, func, body)` lines in `labs/run.ts`.

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

- Python in the browser has no network (socket, requests): those lesson parts are still practised on the learner's
  own machine. Pyodide runs on the main thread; the trace deadline stops loops, but a single very slow C call cannot be
  interrupted (a Web Worker would fix that).
- Script support is linear on purpose: no if/for/while/functions/$(...); the shell says so when it meets them.
- The OWASP lesson follows the 2021 list and only summarises the newer edition — verify against owasp.org.
- No subject-matter expert has reviewed the lessons; the tests check structure, not facts.
- Links were last checked at v1.16 (`node scripts/check-links.mjs`, which now also reads lesson Markdown and skips
  example/simulated addresses): every real link answers or is behind a bot check (Cloudflare "Just a moment" on
  rhinosecuritylabs.com and abuseipdb.com; cloudflare.com/learning and securityheaders.com open in a browser).
  `git-scm.com`, `catb.org` and `neverssl.com` cannot be reached from this network at all and were not verified.
- Lessons must not use real domains as examples: the v1.16 check found `bank.uz`, `shop.uz`, `tolov.com`,
  `gooogle.com`/`paypa1.com` and others; they now use `mybank.uz`, `rnybank.uz`/`mybamk.uz` for look-alikes, and
  `*.example` / `*.example.com` for attacker and placeholder sites.
- Main JS is ~630 kB (~190 kB gzip): lessons and secondary pages are separate chunks. The remaining weight is the
  glossary, curriculum, terminal engine and Supabase client.
- v2 (see TZ): AI tutor, Russian/English interface, code signing for a real `.exe`.
