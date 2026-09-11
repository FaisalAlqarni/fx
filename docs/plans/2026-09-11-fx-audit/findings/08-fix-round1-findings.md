# Task 08 fix round 1 re-review: `89f3e9d..0098ed6`

**Reviewed:** `skills/fx-audit/SKILL.md` at `0098ed6`, read in full, and the
rename diff `.fx/2026-09-11-fx-audit/review/89f3e9d..0098ed6.diff`, read once.
Line numbers are the skill file's unless another file is named. `0098ed6^` is
`89f3e9d` (read in `git log --oneline -4`).

**Gates run by the reviewer:** `python3 scripts/check-manifest` OK, 11 skills
declared, exit 0. `python3 scripts/check-paths` OK, 55 citations, exit 0.
`python3 scripts/check-artifacts` OK, exit 0. `python3 scripts/check-prose
skills/fx-audit/SKILL.md` OK, exit 0. `scripts/check-all` not run, per
instruction.

**Probe evidence read:** the seven `fr1-run-*.json` streams parsed event by
event with a script over every `tool_use` input, subagents included; the
`fr1-*-debug.log` files searched; every `fr1-*sha256*` file read and compared.

## Finding verdicts

- **I1, the documented name does not resolve: ADDRESSED.** Heading and usage
  line read `/fx:fx-audit` at 8 and 11. GREEN 3's init event lists
  `fx:fx-audit`, and the run invoked as `/fx:fx-audit` made 16 tool calls.
- **I2, the agent cannot locate the templates: ADDRESSED under Ruling AF.**
  Frontmatter at 1 to 6 carries `name`, a one-line description and
  `disable-model-invocation: true`. The paragraph at 25 to 31 says `../../`
  resolves from the skill's base directory; the lens citation at 187 follows
  it. `check-paths` resolves all 55. RED ran `ls ~/.claude/plugins` and
  `find / -name "audit-template.md"`; no post-move run searched (named risk 4).
- **I3, explorers that cannot write: ADDRESSED.** 123 to 126 require an agent
  type with a file-writing tool and name a read-only type as unable to finish.
  Read-only failure phrases in GREEN 1, 2 and 3: 0 each (ran `grep -ciE`).
  GREEN 3 dispatched `subagent_type: "claude"` explorers.
- **I4, the sound verdict rests on an unrecorded choice, and a chosen
  candidate never reaches `design.md`: ADDRESSED.** The gate choice is
  appended to `03-gaps.md` at 213 to 215; soundness check three reads it at
  221 to 222; resume state 4 re-asks when it is missing at 109 to 110; the
  write exceptions list it at 114 to 116; a candidate taken up goes under
  Implementation Decisions, the proposed folder tree and the per-module verdict
  at 229 to 231. All three sections exist: `references/design-template.md:38`,
  `references/audit-template.md:173` and `:188`.
- **I5, reference rows cannot be opened after the worktree is removed:
  ADDRESSED.** 200 to 205 open a filesystem reference in place and a ref with
  `git show <the commit read>:<path>`. The commit is recorded by Phase 2 at 170
  to 171 and by the template's **Read at** field, `audit-template.md:78`.
- **M1, "the target" meaning `design.md`: ADDRESSED.** 71 reads "Rendering of
  `design.md`".
- **M2, the queue boundary's lead against Ruling AA: ADDRESSED.** 49 to 52
  lead with "has no dedicated pass", and the examples match ADR 0014:76-77.
- **M3, resume loses `--against` and mentions a skipped Phase 2: ADDRESSED.**
  `**Against:**` recorded at 142 to 143; resume uses the record at 97 to 98;
  Phase 2 keys on the record at 157 to 158; gates speak only of phases this
  audit runs at 258 to 260. Resume 3's message (report lines 365 to 371) has no
  Phase 2 mention. New gap in the mismatch branch: N2.
- **M4, `git ls-files` drops untracked code: ADDRESSED.** 184 to 185 add
  `--cached --others --exclude-standard`. Side effect: N5.
- **M5, stated targets not passed to `fx-architecture`: ADDRESSED.** 190.
- **M6, the Phase 4 gate's file list: ADDRESSED.** 244 to 245 name the slug
  directory's documents only.
- **M7, two resume states with no rule: ADDRESSED.** Approved `design.md` at
  105 to 106; draft with a missing Phase 4 report at 107 to 108. Wording gap in
  state 4: N4.
- **M8, the boundary's "nothing else" omits the exclude file: ADDRESSED.** 39.
- **M9, restated count rules and report distinction: ADDRESSED.** Counts
  deferred to the template at 30 to 31, 208 and 241 to 242. The report
  distinction is now the boundary at 53 to 55 and the table rows at 69 and 71;
  the separate paragraph is gone.
- **M10, slug collision and no way to start over: ADDRESSED.** `<name>` from
  the scope path at 59 to 62; candidates filtered by recorded scope at 83 to 86;
  scope recorded at 140 to 142; start over at 94 to 95. Edge cases the new rule
  opens: N3.

## New breakage in the fix diff

**N1. Important, ruling-mandated. On opencode the audit loses its user-typed
entry and becomes model-invocable.** Before the move, `scripts/fx-opencode-install:127`
ran `convert_command` (`:83`) over `commands/`, so opencode got a generated
`fx-audit` command. After it, the file is only in `skills/`, which the installer
symlinks whole (`:108-111`) and opencode loads (`INSTALL.md:40-44`). The opencode
binary on disk, `/home/faisal/.opencode/bin/opencode`, contains `SKILL.md` 11 times and
`Base directory for this skill` 3 times, but `disable-model-invocation` and
`disableModelInvocation` 0 times (ran `grep -ac`). So on that runtime the skill
likely receives its base directory (I2 holds there too), but nothing on disk
shows the flag is read. That makes the audit a model-selectable skill, the
per-turn cost `design.md:152-168` gives as the reason it is not a lane.
`plugins/fx.js:1-61` handles only the preamble and the bash guard. Not
established: whether opencode offers any user-typed entry for a skill, and
whether it parses unknown frontmatter keys in a way a string search would miss.
fx is not installed for opencode on this machine (`~/.config/opencode/skills` is
a real directory of unrelated skills), so nothing was observed running. The fix
did what Ruling AF said; the remedy is the controller's call.

**N2. Minor. `--against` mismatch asks a question whose one answer the rules
cannot carry out.** 97 to 98 stop and ask "which to use" when this run's
`--against` differs from the record. Choosing the new reference needs
`01-current.md`'s `**Against:**` line changed, but 114 to 117 forbid rewriting it
and list no such exception, and Phase 2 runs only on the record (157). The
likely case is a bare first run followed by a run with `--against`: the choice
offered is unreachable. Say that a different reference means starting over
(94 to 95), or add the header line to the exceptions.

**N3. Minor. The new slug lookup can direct creation onto an existing path, and
two spellings of the root audit apart.** 83 to 88: a directory matching
`*-audit-<name>` that records no scope is not a candidate, and "None" then
creates `docs/plans/<today>-audit-<name>/`. A Phase 1 interrupted the same day
before `01-current.md` was written leaves exactly that directory, so the create
lands on it; before the fix such a run resumed at Phase 1. `a/b` and `a-b` also
map to one `<name>`. And at 59 to 62 an omitted scope names the directory after
the repository, while an explicit `.` names it `audit-.`, though 142 records
both as `.`, so neither run finds the other. Treat a same-name directory with no
`01-current.md` as the candidate, and treat `.` as omitted.

**N4. Minor. Resume state 4 reads as true when `03-gaps.md` does not exist.**
109 to 110: "`03-gaps.md` has no `## Phase 3 gate choice` section" is literally
true of a missing file, which would ask Phase 3's candidate question after
Phase 1 with no report to name. Resume 3, on this text with only
`01-current.md`, read it as intended and resumed at Phase 3, so observed once
correct. "`03-gaps.md` exists and has no" closes it.

**N5. Minor. At repository-root scope, Phase 3's file set now includes the
audit's own documents.** 184 to 185 add untracked, non-ignored files. The slug
directory is never made ignored (only `.fx/` and `.worktrees/`, 73 to 79), so
with the default scope `.` the lens and `fx-architecture` are handed
`docs/plans/<slug>/01-current.md`, `02-reference.md` and any uncommitted earlier
audit, including the code those maps quote. Exclude `docs/plans/` from the set.

## Named risks

1. **M10's way to start over: present.** 94 to 95, "**To start over**, the user
   moves the old slug directory out of `docs/plans/` or deletes it, then runs
   the skill again" (ran `grep -n "start over"`: line 94). A move into a
   subdirectory of `docs/plans/` also works, since the glob at 84 is one level.
2. **M1's remaining "the target": the target architecture.** The only
   occurrence is the heading at 217, "Phase 4: the target architecture", the
   fixed phrase the review accepted; 181's "each target" is a stated target.
   The table row at 70 reads "Target architecture". No second sense remains.
3. **Undeclared in the manifest: an installed copy loading an undeclared skill
   is established for `fx-design`, not observed for `fx-audit`.**
   `scripts/check-manifest:43-49` checks only that declared paths exist and
   hold `SKILL.md`; nothing enumerates `skills/`. ADR 0009 covers `agents` and
   `hooks` only and is silent on skills. The loader in `fr1-green3-debug.log`
   scans the default directory (69, 123: 13 skills) and then the 11 declared
   paths (163 to 173: 0 each, deduplicated). The same log runs that scan for an
   installed cache plugin with declared skills: `mattpocock-skills`,
   `skillsPaths=25` at 80, whose default scan loads 0 (`fr1-green2-debug.log:76`)
   because its `SKILL.md` files sit two levels down. So the default scan is not
   a `--plugin-dir` behaviour. The installed fx, `installed_plugins.json:201-209`,
   is `cache/fx/fx/0.1.6`, whose `skills/fx-design` is absent from its manifest,
   and this reviewing session, which lists no `fx:fx-audit` and so is not on
   the worktree, lists `fx:fx-design`. Not established: an installed build of
   this branch (none exists), and no file under `~/.claude/debug` records an
   installed fx load.
4. **Base directory proof: the evidence shows the agent knew the plugin path
   before any search and from no recorded context, which is consistent with
   the base directory line but does not show it.** "Base directory" occurs 0
   times in all seven streams. In GREEN 3 and resume 3 the worktree path first
   appears in the agent's own first tool call (stream line 12), a direct
   `ls /development/fx/.worktrees/fx-audit/references/`; GREEN 1 and resume 2
   open with a direct `cat` of the template. The three SessionStart
   `hook_response` events carry no `/development` string in GREEN 3 or RED, and
   `hooks/fx-context.js:12-53` emits no path. The only earlier carrier is the
   init event, which is SDK output and is identical in RED, where the agent ran
   `ls ~/.claude/plugins` and `find /`. Over every tool input, subagents
   included, of GREEN 1 to 3 and resume 1 to 3: `find /` 0, `settings.json` 0,
   `installed_plugins` 0, `/proc/` 0, `env`/`printenv`/`CLAUDE_PLUGIN` 0,
   `~/.claude/plugins` 0. Every `find` hit is `find .` or a path inside the
   scratch project, or prose in an explorer brief. The stream never records
   the expanded skill body, so the line itself stays unobserved.
5. **Committed text is what GREEN 3 and resume 3 ran: confirmed.**
   `fr1-round3-skill.sha256` holds `debf4982...0dc5`; the working file and
   `git show 0098ed6:skills/fx-audit/SKILL.md` both hash to it (ran
   `sha256sum`), and `git status --short skills/fx-audit` is empty. The hash
   file's mtime, 23:19:26.193, precedes `fr1-green3-marker` at 23:19:26.209;
   resume 3's stream ends 23:22:07. No skill hash was taken after the runs, so
   identity during them rests on the pre-run hash matching the committed blob.
6. **Resume byte identity: confirmed.** `fr1-green3-01-current.sha256.before`
   and `.after` both read `d2de033e...ae96`, mtime 23:21:39.225149623, 6847
   bytes; `cmp` exits 0. The round 1 and round 2 pairs are also identical.
7. **The second runtime: reachable, very likely given its base directory, and
   no evidence it honours `disable-model-invocation`.** See N1 for the
   evidence and what cannot be established.
8. **Phases 3 and 4 as an agent would run them: nothing unreachable; four Minor
   gaps.** Every input Phase 3 and 4 need is produced earlier: stated targets
   (151 to 153, or re-asked at 180 to 181), the commit read (170 to 171), the
   architecture report path (197), the gate choice (213 to 215), and the
   sections Phase 4 fills (template lines above). The Phase 4 report is
   distinguishable in state 3 because 03-gaps.md names the other one (69, 71).
   The sound verdict is appended after the gate choice, so state 1's "ends
   with" still holds. Gaps found are N2, N3, N4 and N5.

## Out-of-scope observations

- `README.md:153` and `SURFACE.md:61` already describe `skills/fx-audit/` with
  `disable-model-invocation: true`; a writer is editing both, not judged here.
- Phase 4 step 4 (236 to 239) no longer says the report fetches nothing; that
  rule now lives only in the boundary at 54 to 55. An agent reads both, so no
  finding.
- The report's probe checker counted read-only phrases over the whole log; I
  repeated that count and got the same zeros.

## Verdict

**Fix round:** Findings remain open. All fifteen original findings are
ADDRESSED. New in the fix diff: N1 (Important, ruling-mandated, opencode loses
the user entry and very likely treats the skill as model-invocable), and N2,
N3, N4, N5 (Minor).
