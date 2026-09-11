# Final fix wave: scoped re-review

**Seat:** the one scoped re-review after the final review's fix wave. Read-only on
the worktree, index and HEAD.
**Range:** fix base `c48dc50`, head `85de0ee`. HEAD is `0da96cd`, which adds only
plan documents on top (`git diff --stat 85de0ee 0da96cd`: nine files under
`docs/plans/`).
**Read once:** the review package `c48dc50..85de0ee.diff`, Ruling AJ in
`state.md`, the seven final findings files, the fix wave report, and
`skills/fx-audit/SKILL.md` whole.
**Ran:** every check below in scratch directories under
`/home/faisal/.claude/jobs/6d844eaa/tmp/rr/`, removed afterwards. Every companion
server started was stopped; `pgrep` afterwards matched no process from the scratch
directory. The companion never ran inside this worktree. At the end, worktree
status, index and HEAD were identical to their state before the checks, and the
list of `/tmp/fx-fixture-*` directories was unchanged at 66.
**Not done:** no nested session, no audit run, no subagent, no lens dispatch. The
smoke run was scored from the report's verbatim output, not rerun.

**Result:** all 23 items addressed. No new Critical or Important breakage. One new
Minor in the diff, and three Minor residuals on items 1, 5 and 19, parked for the
user below.

---

## Item verdicts

| # | Verdict | Where | Read or ran |
|---|---|---|---|
| 1 | ADDRESSED, Minor residual R1 | `skills/fx-audit/SKILL.md:47-51`, `:233-236`, `:243-248`, `:257-262`, `:271-282`, `:308-315`; `references/audit-template.md:149-157`, `:194-205` | Read, walked below |
| 2 | ADDRESSED | `agents/fx-lens-pipeline.md:37-40`, `:134-135` | Ran: diff, section hashes, fixture and key hashes; smoke output scored |
| 3 | ADDRESSED | `SKILL.md:86-90`, `:136-137`, `:165-173`, `:210-216`, `:243`, `:257-259`, `:283`, `:293-302` | Read; GREEN log shows the draft write and the move |
| 4 | ADDRESSED | `SKILL.md:312-315`, against `skills/fx-plan/SKILL.md:15-17` | Read |
| 5 | ADDRESSED, Minor residual R2 | `SKILL.md:196-207`, gate `:218-219` | Ran, check 7 |
| 6 | ADDRESSED | `SKILL.md:184-195`, `:206-207` | Ran, check 6 |
| 7 | ADDRESSED | template `:30-32`, `:179-205`; `SKILL.md:31-32`, `:165-166`, `:245-246` | Read |
| 8 | ADDRESSED | template `:54-55`, `:232-233` | Read; GREEN's `01-current.md` held the field at line 56 |
| 9 | ADDRESSED | template `:101`, `:130-134` | Read |
| 10 | ADDRESSED | template `:3` | Read |
| 11 | ADDRESSED | `SKILL.md:64-67`, `:132-135`, `:229`, `:264-267` | Ran the naming command; read the rest |
| 12 | ADDRESSED | `skills/fx-brainstorm/scripts/start-server.sh:284-293` | Ran, check 4a and 4d |
| 13 | ADDRESSED | `start-server.sh:216-224` | Ran, check 4b |
| 14 | ADDRESSED | `start-server.sh:166-209`, `:238-282`, `:295-302` | Ran, check 4c, 4e and the extra cases |
| 15 | ADDRESSED | `start-server.sh:264-267`; `grep -n fx-implement` exit 1 | Read |
| 16 | ADDRESSED | `skills/fx-brainstorm/SKILL.md:183-184`; `visual-companion.md:60` | Read |
| 17 | ADDRESSED | `scripts/check-prose:24-26` | Ran, check 1 |
| 18 | ADDRESSED | `scripts/check-all:40`; `.fx.json:3`, `:6` | Ran, check 2 |
| 19 | ADDRESSED, Minor residual R3 | `skills/fx-review/reviewer-prompt.md:56-67` | Ran, check 5 |
| 20 | ADDRESSED | `scripts/check-artifacts:39-45` | Ran, check 3 |
| 21 | ADDRESSED | `docs/adr/0015-artifacts-live-in-the-repository.md:6-10` | Read against `scripts/check-artifacts` |
| 22 | ADDRESSED | `docs/adr/0013-descriptions-name-categories-not-stacks.md:28-30`; the four rows at `skills/fx-review/SKILL.md:91-94` | Read |
| 23 | ADDRESSED | `INSTALL.md:105` reads `/fx:fx-setup` | Read |

### Item 1, walked as an agent would carry it out

- **The lens dispatch fails** (not resolved, errored, nothing returned). Phase 3
  step 4 records it as exactly that (`:246-248`). Done when needs both dispatches
  recorded (`:257-258`). The gate names the dispatch that did not run (`:261-262`).
  Phase 4's second check fails (`:275-276`), so no sound verdict is written.
  `design.md` is written, and the gate opens by saying this is why the system was
  not judged sound (`:308-309`). Resume rule 1 cannot fire, because there is no
  sound section. Closed.
- **It returns an `Unread:` line naming a file in the set.** Step 4 records it
  (`:247-248`), the gate names it as not covering the file set, and check 2 fails.
  Closed. Comparing the lens's paths (the smoke run wrote absolute paths) with
  `git ls-files` output (repository-relative) is left to the agent. The report's
  concern 2 says the same, and nothing has observed it.
- **It returns `Unread: none`.** Check 2 holds on that line, and the sound section
  quotes it (template `:202`). Closed.
- **It returns findings with no `Unread:` line at all.** This is R1, below.

---

## Checks 1 to 10

### Check 1, item 17: PASS (ran)

A scratch copy made with `git archive 85de0ee`, with `.worktrees/wip/docs/wip.md`
and `.claude/worktrees/wip/docs/wip.md`, each holding one em dash.

```
python3 scripts/check-prose            -> OK: no dashes, no stock vocabulary, parentheses balanced   exit=0
dash added as README.md:1              -> FAIL ... README.md:1  dash                                  exit=1
dash in a new docs/real/note.md:3      -> FAIL ... docs/real/note.md:3  dash                          exit=1
```

My first attempt appended the dash at the end of `README.md`, and that passed with
exit 0. That matches the parked fence-pairing blind spot (the broad review's M5).
It is not caused by this change and I did not examine it further. The dash at line 1
was caught.

The same scratch copy also shows the new Minor, N1 below: a file named explicitly
by a relative path containing `.worktrees/` is skipped.

### Check 2, item 18: PASS (ran)

In this worktree, each exit code read directly:

```
before=66
scripts/check-all > log; echo $?          -> check-all exit=0, ALL GREEN
after check-all=66
test_one, {file}=lib/heredoc.test.js      -> exit=0, 13 passed, 0 failed
after test_one=66
test_one, {file}=lib/does-not-exist.test.js -> exit=1
after failing test_one=66
setup                                     -> exit=0
after setup=66
sorted fixture list before vs after       -> diff exit=0
worktree status before vs after           -> diff exit=0
```

### Check 3, item 20: PASS (ran)

A scratch tree holding `scripts/check-artifacts` from `85de0ee`, a PNG header at
`skills/x/logo.png`, and a text `skills/x/SKILL.md`:

```
binary only                -> skipped, not text: skills/x/logo.png ... OK   exit=0
binary plus "/tmp" line    -> skipped, not text: skills/x/logo.png ... FAIL: 1 line(s) ... skills/x/SKILL.md:2   exit=1
c48dc50's script, binary   -> UnicodeDecodeError: 'utf-8' codec can't decode byte 0x89 in position 0   exit=1
```

No traceback. The skip is printed, and a real hit beside the binary still fails.

### Check 4, items 12 to 14, the companion: PASS (ran)

A scratch copy of `skills/fx-brainstorm/` from `85de0ee`, against scratch
projects, `--slug 2026-09-12-demo`, no `--open`.

- **(a) No `.git`.** Start exit 0, stop `{"status": "stopped"}`. `.fx/.gitignore`
  holds `*`. Then `git init && git add -A`: staged under `.fx`: 0.
  `git status --ignored` lists `.fx/.gitignore`, `.last-port`, `.last-token` and
  `server-stopped` as ignored.
- **(b) A committed `.fx` symlink** to a directory outside the project. Exit 1:
  `.../rb/.fx is a symbolic link, so the session key and state would be written
  wherever it points. Remove the link and start again.` The target stayed empty,
  the exclude file was unchanged (`cmp`), and no `docs/` was created. The same
  refusal, with an empty target, for a committed `.fx/<slug>` link, a
  `.fx/<slug>/companion` link, and a `.fx/.gitignore` link to an outside file,
  whose content stayed `keep`.
- **(c) git missing from `PATH`,** a real repository, with a shim holding every
  `/usr/bin` tool except git, plus node. Exit 1: `.../rc/.git exists but git is not
  on PATH, so nothing can confirm the session key stays out of a commit. Fix that
  and start again.` No `.fx` was created.
- **(d) A normal repository.** Start exit 0, with stderr `fx companion: added .fx/
  to .../rd/.git/info/exclude so the session key is never committed.`
  `git status --porcelain -uall` while running: empty. Stop, start again:
  `port1 key1: 49798 948f6502...8a18` and `port2 key2: 49798 948f6502...8a18`, the
  same port and key. `.fx/.gitignore` still one line. `git add -A --dry-run` under
  `.fx`: 0.
- **(e) An exclude file that cannot be written** (`.git/info` mode 555, `exclude`
  mode 444), no ignore rule. Exit 1, valid JSON: `could not write the local exclude
  file .../re/.git/info/exclude (... line 235: ... Permission denied), and
  .fx/2026-09-12-demo/companion/.last-token is not git-ignored (last matching rule:
  none). Fix that and start again.` No session file, no `.fx/.gitignore`, nothing
  stageable under `.fx`.
  **Against Ruling AK:** fails closed and names its cause. Nothing worse was found.
  In ordinary repositories: (e2) the same unwritable exclude with `.fx/` already in
  `.gitignore`, as `/fx:fx-setup` writes it, starts; (e3) `git init --template=`,
  with no `.git/info`, starts; (e4) a linked worktree starts and writes the common
  exclude file.
- **Extra, item 14.** `GIT_TRACE=1` on a healthy repository: start exit 0. A
  committed `.last-token`: exit 1, `.fx/2026-09-12-demo/companion/.last-token is
  tracked by git, and no ignore rule applies to a tracked file, so the session key
  would be committable.` The planted token was not overwritten.

Every refusal line parsed as JSON.

### Check 5, item 19: PASS, residual R3 (read and ran)

Read as a reviewer carries it out: the ignore check is step 1 (`:60-65`),
`git worktree add` is step 2 (`:66`), and removal is step 3, when the review is done
(`:67`). Run in a scratch repository with `.worktrees/` not ignored and no
`.worktrees` directory:

```
from the root:        check-ignore exit=1; appended to .../repo/.git/info/exclude; check-ignore exit=0
                      worktree add exit=0; status lines: 0; worktree remove exit=0; worktrees listed: 1
from a subdirectory:  root resolves to the repository root; check-ignore 0; add 0; status 0 lines; remove 0
from a build worktree: root is the build worktree; check-ignore 0 (the shared exclude file); add 0; remove 0; listed: 2 (main and build)
```

R3 is what happens when the reviewer leaves files behind (below).

### Check 6, item 6: PASS (ran)

In a scratch repository with branch `feat` and tag `v1`, the command exactly as
`SKILL.md:194` prints it, with the value inside the single quotes:

```
'feat^{commit}'             exit=0 46a25e73...
'v1^{commit}'               exit=0 46a25e73...
'$(touch pwned)^{commit}'   exit=1, no output
'`touch pwned2`^{commit}'   exit=1
'--all^{commit}'            exit=1
'--output=x^{commit}'       exit=1
ls pwned pwned2 x           -> No such file or directory, each
ls -d '$(touch pwned3)'     -> No such file; pwned3 not created
counterfactual, c48dc50's double quotes: "$(touch pwned-old)^{commit}" -> exit=1, and pwned-old WAS created
```

Neither runs nor resolves, and a normal branch and tag resolve. Git 2.43.0 only.

### Check 7, item 5: PASS, residual R2 (ran)

`.worktrees/` excluded first, as the skill's ignore check would do.
`git worktree add --detach .worktrees/audit-repo-reference C1` exit 0.

- **Registered at that commit.** Porcelain: `worktree .../audit-repo-reference`,
  `HEAD 331992d...`, `detached`. The skill reuses it. A second add, which reuse
  avoids: `fatal: ... already exists`, exit 128.
- **Registered, another commit requested (C2).** `git worktree remove --force`
  exit 0, then add at C2 exit 0, and porcelain shows `HEAD 77cebb0...`. With a stray
  untracked file, plain `remove` fails (exit 128) and `--force` succeeds (exit 0),
  so `--force` is needed.
- **A plain directory, not registered.** Porcelain prints nothing for the path. The
  skill stops and names it. Add would give `already exists`, exit 128, and
  `remove --force` would give `is not a working tree`, exit 128. Stopping is the
  only safe action.
- **Registered but deleted by hand.** Porcelain: `HEAD 331992d...` (the same
  commit), `detached`, `prunable gitdir file points to non-existent location`. Add
  without prune: `is a missing but already registered worktree`, exit 128.
  `git worktree prune` then add: exit 0.

### Check 8, item 2, the lens: PASS (ran and scored)

- `git diff --quiet d496d1e -- tests/lens-pipeline/fixture`: exit 0, against the
  worktree and against HEAD. `diff -r` of the smoke subject against the fixture:
  exit 0.
- `^| ` rows of `KEY.md`: 7 at `d496d1e` and 7 now (header plus six rows).
  Combined sha256 `76ff72b9...9206f` on both sides, and all seven per-row hashes
  equal.
- `git diff -U0 c48dc50 0da96cd -- agents/fx-lens-pipeline.md` has two hunks:
  Input (`@@ -37,2 +37,4`) and one added paragraph after Output (`@@ -131,0 +134,3`).
  Section hashes, old and new: Scope `eb37354d` both, Hunt list `4cacba74` both,
  Ceding rules `18d42552` both, Method `f8b600d0` both. The severity paragraph diff
  exits 0. The diff-mode sentence is unchanged at `:34`. The frontmatter, lines
  1 to 13, diff exits 0.
- The lens file the smoke run read (`fw-lens-smoke.sha256`, `f7dfbceb...`) equals
  the file at `85de0ee`, at HEAD and in the worktree.
- The smoke brief (`.fx/2026-09-11-fx-audit/briefs/lens.md`) points at the lens file
  and the subject directory, and names no defect or row.

**My scoring of the report's verbatim output:**

- **Row 6: found.** Finding 1 cites `worker.js:28`, inside `:28-35`: the
  scheduled run, nothing on its path reading depth. It separates the status flip,
  which bounds duplicates, from depth.
- **Rows 1 to 5: none reported as findings.** Finding 2 (`worker.js:23`) names a
  second producer onto the same queue with no depth check. That is the lens's own
  hunt item ("every other producer onto the same queue"), not row 1's mechanism of
  a shared first-in-first-out queue with no priority or separate lane. Its
  consequence sentence (receipts arriving late behind campaign messages) describes
  row 1's outcome, but it blames depth, not ordering. A stricter reader could call
  that a partial row 1. I score it as the report did. Finding 1 mentions the retry
  loop (`:39-44`) only as why consumers slow down, which is not row 5 or row 3.
- **`schema.sql`:** opened, nothing said. Pass.
- **Paths:** the brief, the lens file, the subject listing, `worker.js`,
  `schema.sql`. Clean.
- **`Unread:` line:** present. It names modules and code outside the set, and no
  file in the set.

### Check 9, the probes: PASS on every point that can be checked; one point unverifiable (read)

- **GREEN stopped at the Phase 1 gate.** `fw-green1-check.txt` final result: 5
  lines, "Phase 1 done: `docs/plans/2026-09-12-audit-fx-audit-probe/01-current.md`
  ...", ending with the stated-targets question.
- **Only `01-current.md` in the slug directory.** The probe's `find docs .fx -type
  f` after GREEN lists `docs/plans/2026-09-12-audit-fx-audit-probe/01-current.md`
  (6568 bytes) as the only file under `docs/`, plus three files under `explore/`.
- **Draft directory empty.** `fw-resume1-summary.txt` lists
  `.fx/2026-09-12-audit-fx-audit-probe/draft/` before resume with only `.` and
  `..`.
- **Draft then move.** The GREEN stream holds, verbatim: `mv
  .fx/2026-09-12-audit-fx-audit-probe/draft/01-current.md
  docs/plans/2026-09-12-audit-fx-audit-probe/01-current.md`, and the draft path
  appears twice (write, move).
- **Resume did not ask the Phase 3 gate question.** The final result opens
  `Resumed at Phase 3 in ...` and asks for stated targets. Phrase check on the
  result text: "candidate" False, "architecture report" False, "Phase 4 should take
  up" False. 0 subagents, 2 tool calls.
- **Checksums.** `fw-01-current.sha256.before` and `.after` are identical: sha256
  `1b6d4b69...79ab6` with the same mtime and size, and `cmp` exit 0.
- **No filesystem search.** I extracted every tool call from both streams myself.
  The only search-like calls are `find . -path ./.git -prune ...` and
  `find docs .fx -type f` inside the scratch project, `git ls-files` there, and a
  `cat` of the template at its known plugin path. No `find /`, no Glob or Grep, no
  Read of any settings or plugin registry. The checker's six pattern counts are 0 in
  both runs.
- **Skill hash.** `fw-skill.sha256`, taken by `fw-probe.sh` before GREEN, equals
  `85de0ee`, HEAD and the worktree for `SKILL.md` (`7a1b519b...`),
  `audit-template.md` (`3aad9168...`) and `fx-lens-pipeline.md` (`f7dfbceb...`).
  Both runs' tool results contain the template text byte for byte as at `85de0ee`.
  **Unverifiable:** the loaded `SKILL.md` body appears in neither stream nor either
  debug log (0 hits for three distinct new sentences), and no hash was taken before
  the resume run (00:29; commit at 00:30:00). The resume run's skill text therefore
  rests on the GREEN-time hash plus behaviour consistent with the committed text.

### Check 10, items 1, 3, 4, 7 to 11 and 21 to 23: PASS (read)

Verdicts are in the table. Notes:

- **Item 3.** Every phase document and the Phase 4 report go through
  `.fx/<slug>/draft/`. See observation O1 for the Phase 3 architecture report.
- **Item 7.** The `03-gaps.md` section still holds exactly three fences
  (`:110`, `:163`, `:173`), so "the first markdown fence is the skeleton"
  (`SKILL.md:243-245`) still holds. The appended sections sit under their own
  heading (fences `:188`, `:198`).
- **Item 11.** `basename "$(dirname "$(git rev-parse --path-format=absolute
  --git-common-dir)")"` gave `shop` from the main checkout, from a linked worktree
  and from a subdirectory. Ran. See O2.
- **Item 21.** The ADR's wording matches `check-artifacts`: any line, whatever it
  does, unless marked. A binary file has no lines, so the new skip does not
  contradict it.

---

## New breakage in the fix diff

### N1. Minor: `check-prose` now passes a file named explicitly by a relative path containing `.worktrees/`

- **Where:** `scripts/check-prose:26`, through `files()`, where `rel` falls back to
  the path as typed when it is not lexically under `ROOT`.
- **What:** a relative argument is never relative to the absolute `ROOT`, so `rel`
  keeps its `.worktrees/` prefix and matches the new exemption. The gate prints
  `OK` and names no skipped file.
- **Ran:** a scratch main checkout with a copy of `scripts/` inside
  `.worktrees/wt/`, and `.worktrees/wt/docs/x.md` holding a dash:

  ```
  from the main checkout: python3 .worktrees/wt/scripts/check-prose .worktrees/wt/docs/x.md  -> OK      exit=0
  same, absolute path                                                                  -> FAIL    exit=1
  from inside the worktree: python3 scripts/check-prose docs/x.md                      -> FAIL    exit=1
  c48dc50's script, the relative form from the main checkout                           -> FAIL    exit=1
  ```

- **Consequence:** a controller in the main checkout that checks a build worktree's
  prose by path gets a green result on a file it never read. It has the same shape
  as the existing `.fx/` exemption. The no-path run, which item 17 is about, is
  correct.

No other breakage found.

## Residuals on addressed items, parked for the user

### R1. Minor, item 1: a lens output with no `Unread:` line is not stated to fail the soundness check

`SKILL.md:275-276` requires "the lens's `Unread:` line names no file in the file
set". Step 4 (`:246-248`) records a dispatch that could not run, returned nothing
usable, or whose line names a file in the set. None of these clauses names a
returned output with no line. Read literally, check 2 then holds vacuously. What
stands against that reading: the template asks for the line "quoted as it wrote it,
or why it did not" (`:151-152`), and the sound section's example quotes the line
(`:202`), which an absent line cannot supply. A lens that ran out of context
partway through is the likely producer of such an output. That is the case items 1
and 2 exist for. One clause closes it: "no `Unread:` line counts as a file set not
covered".

### R2. Minor, item 5: a registered worktree deleted by hand matches "reuse" first; the gate's plain remove fails on a stray file

- `SKILL.md:199` "Listed at that commit: reuse it" comes before `:200` "or as
  missing". Porcelain for a worktree deleted by hand prints `HEAD <the same
  commit>` plus `prunable ...` (ran), so the first bullet matches literally and
  Phase 2 maps a directory that does not exist. The phrase "or as missing" in the
  second bullet suggests the intent.
- `SKILL.md:218` removes the worktree at the gate with plain `git worktree remove`.
  With any untracked file inside, as the fix itself measured for `--force`, it
  exits 128 and the worktree stays (ran, case E).

### R3. Minor, item 19: plain `git worktree remove` fails when the reviewer left untracked files, and the prompt gives no next step

`reviewer-prompt.md:67`. Ran: an untracked file in the review worktree gives
`fatal: ... contains modified or untracked files, use --force to delete it`, exit
128, and the worktree stays listed. Ignored output only (a `.gitignore`d `out/`)
gives exit 0. A reviewer who needed another revision's working copy is the one
likely to run something in it. Before the wave, nothing removed it at all, so this
is not a regression.

---

## Out-of-scope observations

- **O1.** Phase 3's `fx-architecture` report still goes straight into the slug
  directory (`SKILL.md:239-240`), before `03-gaps.md` is finished. An interrupted
  Phase 3 leaves a finished report with no gap report, and a rerun adds a second
  `report-<timestamp>.html`. That is not a half-written document, but it is one
  more file for the "found by elimination" Phase 4 report rule (correctness M11,
  not in Ruling AJ).
- **O2.** For a repository created with `--separate-git-dir` (and, by the same
  rule, a submodule), the repository's name is the directory holding the git
  directory: `store`, not the work tree's `sep` (ran). Stable across linked
  worktrees as the ruling asked, but not the checkout's name.
- **O3.** `start-server.sh:3`, `:9` and `:156` still describe `--slug` as
  `<plan-slug>`, "the slug this brainstorm writes its design under". The
  agent-facing text in `SKILL.md:183-184` and `visual-companion.md:60` is fixed.
- **O4.** In `SKILL.md`, "draft" now means both `.fx/<slug>/draft/` and
  `design.md`'s Status `draft, not approved` (resume rules 2 and 3, `:128-131`).
  The lead-in at `:123` scopes the rules to the slug directory, so a careful
  reading lands correctly.
- **O5.** `git rev-parse --end-of-options` ran on git 2.43.0 only. An older git
  was not tested. If one lacks it, every reference fails to resolve, and the skill
  stops and asks, which fails closed.
- **O6.** Ruling AK holds as ruled. Case (e) is the only refusal found, and it
  needs both no ignore rule and an unwritable exclude file.
