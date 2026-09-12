# Final review: fx-audit follow-ups

**Range:** `be4cf7f..b0ad55b`. HEAD at review time was `925d09d`, one ledger commit
past the range that touches only `state.md`.
**Verdict:** With fixes. Critical 1, Important 5, Minor 11.

**How this was reviewed.** One reviewer, no subagents. The diff package was read in
passes: the code and document hunks from the package, and the design, plan, ledger
and task files from disk. The three files several tasks edited were read whole as
they stand. The vendored files were checked by checksum only. `scripts/check-all`
ran once and printed ALL GREEN. Every experiment below ran in a scratch directory
under the job directory, against `git archive` exports of HEAD and of `be4cf7f`, and
that directory was removed afterwards. `git status` on this checkout was empty before
this file was written.

## Strengths

- **Vendored libraries verified.** `sha256sum references/vendor/*.js` gives
  `176e8946...0d15` for Tailwind and `581ed7d7...8eb8` for Mermaid, matching
  `references/report-assets.md:16-17`. In the Mermaid bundle, all 28 `fetch`
  calls are the math parser's token reader, not network calls. The Tailwind
  bundle has none. Task 01's report records a render with the browser's network set
  to Offline where every request was `file://`.
- **The installer checks before it writes.** `main` in
  `scripts/fx-opencode-install:246-267` runs every skill and command refusal before
  the first write, and a dry run refuses exactly as a real install does. Cases 8 and
  9 in `tests/opencode-install/run.sh:93-106` prove the order, not just the refusal.
  `points_into_fx_skills` reads the recorded link target without resolving it, so a
  dangling stale link is still recognised as fx's.
- **Upgrading an old install works.** In scratch, the base installer ran, then the
  HEAD installer over the result: exit 0 for both the dry run and the install, the
  whole-folder link became 12 per-skill links, and no command kept a `template:`
  field. The old generated header sits indented inside `template: |`, and
  `refuse_if_foreign_command` still finds it as a substring, so old generated
  commands are not refused.
- **The remote gate is careful where it matters.** Scanning the whole text with a
  line map catches a split tag (`scripts/check-artifacts:97-110`), a missing root now
  fails, and the vendor skip is printed rather than silent.
- **The lens change is contained.** Diff-mode text in `agents/fx-lens-pipeline.md`
  changes only by `Given a diff,` qualifiers. File-set mode gets its own severity
  scale and a red flag so the five groups are not deleted as ceded. `KEY.md` rows
  are untouched, and the ceding rules live in the lens alone.
- **The companion start is coherent.** The exclude-file block is gone, the start
  order matches the design, and the probe compares the exclude file byte for byte.
- **Names and counts match the disk.** No short-form command name remains outside
  `docs/plans/`, apart from `tasks/todo.md` (excluded by task 06) and the names of
  commands `SURFACE.md` records as cut or never added. A scratch install printed
  `skills: 12  agents: 6  commands: 5`, as `INSTALL.md:67` says. `references/` holds
  27 files, as `SURFACE.md:190` says, and the version is 0.1.7.

## Issues

### Critical (Must Fix)

**C1. The installer deletes a symbolic link it did not create at `skills` and
`references`.**
`scripts/fx-opencode-install:188-189`, `:214-215`, `:285-289`.

- **What is wrong.** `check_skills_conflicts` returns early for any symbolic link at
  `<dest>/skills`. `link_skills` then unlinks that link whatever it points at. The
  `references` and `plugins/fx.js` step also unlinks any symbolic link at those paths
  without reading its target.
- **Reproduced in scratch.** `<dest>/skills` pointed at a folder of another tool's
  skills. The dry run printed only `would ensure .../skills is a real directory` and
  exited 0. The real install exited 0, removed the link, and left `skills` as a real
  directory holding only fx's 12 links. A `<dest>/references` link pointing at a
  different folder was replaced silently, also with exit 0.
- **Why it matters.** This breaks the global constraint "never touches an entry it
  did not create" and `design.md:158-160`, which limits replacement to "an old
  whole-folder link from an earlier install". A dotfiles-managed `skills` link is a
  common layout. After an install, opencode loses every other tool's skills, and the
  dry run gave no warning. The folder the link pointed at survives, but the link does
  not. The behaviour predates this branch: the base installer unlinked any symbolic
  link at all three paths. But the new docstring at `:182-187` now calls "anything
  else" safe, and the plan names this exact risk HIGH.
- **How to fix.** In the check phase, accept a symbolic link at `skills` only when its
  recorded target normalises to `FX_SKILLS_DIR`. Accept one at `references` only for
  `FX/references`, and at `plugins/fx.js` only for `FX/plugins/fx.js`. Anything else,
  including a real entry at `references` or `plugins/fx.js`, exits naming it before
  the first write. Add four cases to `tests/opencode-install/run.sh`: a foreign
  whole-folder `skills` link and a foreign `references` link, each refused and left
  unchanged, once as a real install and once as a dry run. This also closes the
  carried task 05 minor about the `references` refusal.

### Important (Should Fix)

**I1. No document shows the opencode command form (carried coverage Gap 1).**
`INSTALL.md:120-124`, `README.md:143`, `README.md:152`, `README.md:171`.

- **What is wrong.** Design stories 12 and 14 (`design.md:65-70`) say an opencode
  user sees `/fx-<name>`. `INSTALL.md`'s "Per repository: either runtime" shows only
  `/fx:fx-setup`. `README.md:143` says every command is typed `/fx:fx-<name>`, and
  `README.md:152` and `:171` show only the Claude Code forms.
- **Why it matters.** On opencode the documented name does not resolve, and no task
  owned this.
- **Smallest fix.** `INSTALL.md:123`: `/fx:fx-setup` (Claude Code) or `/fx-setup`
  (opencode). `README.md:143`: add "or `/fx-<name>` on opencode". `README.md:152`:
  note that opencode types `/fx-audit`.
- **Optional, same wave.** The generated opencode audit command still opens with
  `# /fx:fx-audit` and a `/fx:fx-audit [<scope>]` usage line, taken from
  `skills/fx-audit/SKILL.md:8-11`.

**I2. The report-assets path rule contradicts where the audit drafts its Phase 4
report.**
`skills/fx-audit/SKILL.md:296-302`, `references/report-assets.md:54-66`.

- **What is wrong.** Step 4 writes the report under `.fx/<slug>/draft/` and moves it
  only after **Done when**, which includes "the report renders it". The reference
  says `../_assets/` holds only for a report directly inside a directory under
  `docs/plans/`, and that "a report written anywhere else needs its own relative path
  worked out from first principles".
- **Why it matters.** An agent following the reference literally computes a path from
  the draft location, such as `../../../docs/plans/_assets/`, and that path breaks
  once the report moves into the slug directory. An agent that follows the three tags
  as given, then checks rendering before the move, sees no styles and raw diagram
  text. Phase 4 has never run live, and task 09 was dropped, so nothing exercised
  this.
- **How to fix.** Add one sentence to step 4: the tags are written for the report's
  final place, `docs/plans/<slug>/`, exactly as the reference gives them, and the
  report is opened to check rendering only after the move. Alternatively, add the
  same rule to the reference's "The relative path" section.

**I3. `references/report-assets.md` names the vendor directory by a bare path.**
`references/report-assets.md:5`, `:26-27`, `:33-34`.

- **What is wrong.** The copy rule says to copy "from `references/vendor/`". The copy
  runs with the user's project as the working directory, where no such directory
  exists.
- **Why it matters.** An agent that resolves the path against the working directory
  finds nothing, and the missing-file rule then stops the report step. That is the
  headline feature failing on a wording slip. fx forbids bare reference paths, but
  `scripts/check-paths:17-24` enforces that only over `skills/`, `agents/` and
  `commands/`, so this file is outside its reach. On opencode the generated audit
  command cites the reference by absolute path, but the vendor path inside the
  reference is still bare.
- **How to fix.** In all three places, name the directory by where it sits: "the
  `vendor/` directory beside this file".

**I4. `check-artifacts` passes four remote-load forms.**
`scripts/check-artifacts:39-44`.

- **What is wrong.** Each of these, alone in a scratch root, exited 0:
  - an unquoted `<script src=https://cdn.tailwindcss.com></script>`
  - a side-effect import, `import "https://cdn.example.com/a.js";`
  - a dynamic import, `await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")`
  - a stylesheet import, `@import url("https://fonts.googleapis.com/css2?family=Inter");`
- **Why Important and not Critical.** No shipped file uses any of these forms today (a
  search of `skills/`, `agents/`, `commands/` and `references/` found none), and the
  forms fx actually shipped are caught. But the gate is a drift guard, and a dynamic
  import or a font import is the likeliest way a report drifts back online.
- **How to fix.** Extend the patterns as below, and add one `expect 1` line per form
  to `tests/gates/check-artifacts-remote.sh`.

```
<script\b[^>]*\bsrc\s*=\s*["']?URL          quote optional
<link\b[^>]*\bhref\s*=\s*["']?URL           quote optional
\bimport\s*\(\s*["']URL                     dynamic import
\bimport\s+["']URL                          side-effect import
@import\s+(?:url\(\s*)?["']?URL             stylesheet import
```

**I5. The installer test's prompt check for ordinary commands proves nothing.**
`tests/opencode-install/run.sh:42-43`.

- **What is wrong.** "carries its prompt in the body" greps for
  `Arguments, if any: $ARGUMENTS`, which `render_command` appends whether or not a
  body is present.
- **Mutation run in scratch.** With `render_command` changed to emit no body, the
  suite failed only on "fx-audit command names the audit template". All four ordinary
  commands' checks passed. A change that drops the body inside `convert_command`
  alone would pass the whole suite.
- **Why it matters.** An empty opencode prompt is the defect story 13 exists for, and
  this is the line that claims to guard it.
- **How to fix.** Assert that a line from each command's source body is present, for
  example its first heading. The source is `commands/<name>` when that file exists,
  and otherwise the skill's `SKILL.md`:

```
src="$FX/commands/$n"; [ -f "$src" ] || src="$FX/skills/${n%.md}/SKILL.md"
check "$n carries its source body" 'grep -qF "$(grep -m1 "^# " "$src")" "$f"'
```

### Minor (Nice to Have)

**M1. A dangling symbolic link at a command path is written through.**
`scripts/fx-opencode-install:121`, `:311`.

- **What is wrong.** `path.exists()` follows the link, so a dangling link passes the
  refusal, and `write_text` creates the link's target outside the destination.
  Reproduced with exit 0. Nothing is lost, since the target did not exist.
- **How to fix.** Treat any symbolic link at a command or agent path as foreign.

**M2. The installer's final check cannot catch the sibling rule it names.**
`scripts/fx-opencode-install:318-322`.

- **What is wrong.** The operating system follows `skills/fx-tdd` first, so the probe
  lands in fx's own `references/`. With the destination's `references` link removed,
  `exists()` still returned True. `INSTALL.md:62-63` says the installer fails loudly
  if the path does not resolve.
- **Why Minor.** The suite still covers the rule through the absolute paths in the
  audit command (`run.sh:49-51`).
- **How to fix.** Also probe `<dest>/references/vocab/good-tests.md`.

**M3. The skill counts include other tools' entries.** `INSTALL.md:73` and
`scripts/fx-opencode-install:323` count every entry in `skills/`, not only fx's.
Per-skill linking exists so other tools' skills can sit alongside fx's, and then the
printed number is not 12. Say "12 fx entries alongside any others", or count only
links into fx.

**M4. The generated opencode audit command has two stale phrases.**

- **"Resolves from the base directory."** It says every path starting with
  `<dest>` "resolves from the base directory this skill is given when it is invoked".
  The rewrite of the bare backticked `../../` (`scripts/fx-opencode-install:56`
  applied to `skills/fx-audit/SKILL.md:25-27`) produces it. A command has no base
  directory. The absolute paths work regardless, so the sentence is wrong but
  harmless.
- **Dispatch names.** It dispatches `fx:fx-lens-pipeline` and invokes
  `fx:fx-architecture` (`SKILL.md:47`, `:50`, `:235`, `:238`). On opencode these are
  registered as `fx-lens-pipeline` and `fx-architecture`. The absolute agent path
  beside the first gives a way through, and `PREAMBLE.md:24-25` uses the `fx:` names
  on both runtimes already, so this predates the branch.
- **How to fix.** Replace the bare-prefix rewrite with a sentence meant for commands,
  and map `fx:fx-` to `fx-` in the generated text.

**M5. Plan gap: the audit does not say what to do when a forced removal fails.**
`design.md:189-190` says the audit's and the review prompt's forced removal "says
what to do if it still fails". Only `skills/fx-review/reviewer-prompt.md:67-68` does;
`skills/fx-audit/SKILL.md:202` and `:219-220` do not. Task 07 carried only the review
prompt half, so this is a gap in the plan, not an implementer slip. Append "If that
still fails, say what is left at the path and stop" to both lines.

**M6. Plan-level: `git worktree prune` runs across the whole repository.**
`skills/fx-audit/SKILL.md:199`.

- **What is wrong.** The command prunes every prunable worktree entry in the user's
  repository, including an unlocked worktree on a drive that is not mounted. The
  Boundary list at `:38-41` does not name that write.
- **Why plan-level.** The design (`design.md:187-188`) asked for the prune.
- **How to fix.** Prune only when `git worktree list --porcelain` marks this audit's
  path as prunable, and name the write in the Boundary.

**M7. `check-artifacts` accepts a root that cannot hold what it checks.** A file given
as the root, or a directory one level too deep (`scripts/check-artifacts skills`),
exits 0 with both OK lines. The only check is `root.exists()` at `:133`. Require
`root.is_dir()` and at least one of the scanned areas to exist.

**M8. `check-prose` still skips a directory named explicitly.** A directory under
`.worktrees/` given on the command line is walked with the exemptions applied, and it
exited 0 on a dash (`scripts/check-prose:69-72`). Story 27 says "a file", so this
matches the design. Noted only.

**M9. The vendor skip in `remote_hits` does not work on Windows.**
`scripts/check-artifacts:90-91`.

- **What is wrong.** `str(path.relative_to(root))` carries backslashes on Windows, and
  `PurePosixPath(rel).as_posix()` does not convert them, so the `references/vendor/`
  prefix never matches there. The carried "redundant `as_posix()`" minor is really
  this.
- **How to fix.** Use `path.relative_to(root).as_posix()`.
- **Noted, acceptable.** Every file under `references/vendor/` is skipped, a markdown
  file included (reproduced). ADR 0015:59 documents the exception.

**M10. `INSTALL.md:143` keeps an em dash.** The dash sits inside the bash fence, in the
comment about opencode's pools. It predates the branch, and the prose gate skips code
fences, but the global constraint says "anywhere" and this change set edited the file.
Replace it with a colon.

**M11. Plan gap: the companion probe is missing two of the design's cases.**
`design.md:225-227` lists "git missing" and "a normal restart" among the companion
cases. `tests/companion/ignore-guarantees.sh` has neither, and matches task 04's text,
so the gap is in the task.

## Cross-task consistency

- **`skills/fx-audit/SKILL.md`**, 327 lines, reads as one file.
  - The six-group Boundary bullet agrees with Phase 3 step 4 and with Phase 4's
    soundness checks.
  - The offline-reports Boundary bullet agrees with Phase 4 step 4.
  - Phase 2's prune, then reuse, remove or add, then forced removal at the gate, is
    consistent.
  - Open issues here: I2, M5 and M6.
- **`skills/fx-brainstorm/scripts/start-server.sh`** is coherent.
  - The usage line, the `--slug` description and the no-slug message all name the
    dated slug.
  - Nothing mentions the exclude file.
  - `append_line` now serves only `.fx/.gitignore`.
  - The only git commands are read-only: `rev-parse`, `check-ignore` and
    `ls-files --error-unmatch`.
- **`scripts/check-all`** is coherent: each of the three tasks added one run line.
  Its own fixture still goes to `/tmp` at `:39`. That predates the branch and fits
  the plan's scoping rule.

## The generated opencode audit command

Installed into a scratch destination and read.

- **Paths.** It names four absolute paths, and all exist: `agents/fx-lens-pipeline.md`,
  `references/audit-template.md`, `references/design-template.md` and
  `references/report-assets.md`. No `../../` remains.
- **Arguments.** `$ARGUMENTS` comes last.
- **Placeholders.** No generated command contains a positional placeholder, a shell
  injection or a file include.
- **As a prompt for an agent with no plugin root,** it works apart from the stale
  phrasing in M4, the Claude Code usage line in I1, and the bare vendor path in I3,
  which the absolute citation does not reach.

## INSTALL.md, run top to bottom

**Ran**, in printed order, with the destination in a scratch directory:

- **`./scripts/fx-opencode-install --dry-run` (lines 10 and 13).** Exit 0, and the
  destination did not exist afterwards.
- **`./scripts/fx-opencode-install` (line 10).** Exit 0. It printed
  `reference resolution through the symlinked tree: OK` and
  `skills: 12  agents: 6  commands: 5`, matching lines 66-67.
- **`ls <dest>/skills` (line 73).** 12 entries.
- **`ls ~/.agents/skills ~/.claude/skills` (line 144).** A read-only listing: 30 and
  12 entries.

**Could not run:**

- **`git clone` (line 8):** it needs the network.
- **`cd ~/src/fx` (line 9):** no clone there. I ran from this worktree instead.
- **`git branch -D fx-guard-probe` (line 76):** it belongs inside an opencode
  session, and the opencode binary is off limits.
- **`/plugin` commands (lines 104-105 and 111-112), `/fx:fx-setup` (line 123) and
  `/plugin uninstall` (line 141):** these are Claude Code session commands, not
  shell commands. The uninstall also acts outside scratch.

## Carried findings triage

| Finding | Decision | Reason |
|---|---|---|
| T01 table rows per library | Confirmed deferred | Cosmetic; every file on disk is still named |
| T01 redundant `as_posix()` | Confirmed deferred, reworded | It does not work on Windows rather than being redundant; see M9 |
| T03 report scoring collapsed | Confirmed deferred | A report file, not a deliverable |
| T03 ADR 0014 wording | Confirmed deferred | Readable as is |
| T05 `agents/` overwrite | Confirmed deferred | fx agents are all `fx-` named; cheap to fold into the C1 check phase with the header test commands use |
| T05 bare `../../` rewrite | Confirmed deferred | It causes the harmless wording in M4, no wrong path |
| T05 `references` and `plugins/fx.js` refusal in the write loop | Must fix before merge | Part of C1: the same code path also deletes a foreign link |
| T07 `check-prose` in its own `EXEMPT` | Confirmed deferred | No caller names the script |

## Rulings naming this review

| Ruling | Decision | Reason |
|---|---|---|
| `mktemp -d` in the OS temp directory for the tests of tasks 01, 04 and 05 | Confirmed | `plan.md:64-66` scopes the temp-directory rule to `skills/`, `agents/` and `commands/` and allows test fixtures removed on exit; each test's `trap` removes its directory. The plan's reading of "nothing fx creates" is the authority here |
| No lens for any task | Risk realised once | C1 is the installer risk the ruling named, though it predates the branch; the companion guarantees held |
| Task 06 reviewed on the cheapest tier | Confirmed | All 16 replacements read correctly in context, and the search shows none left |
| Task 08 dispatched before task 05's review closed | Confirmed | `README.md:219-226` names all four test scripts, which exist; `check-all` runs three of them |
| Coverage audit before tasks 07 and 08 finished | Confirmed, with M5 and M11 | No later ruling opened a gap; M5 and M11 are gaps between design and task text that the audit did not list |
| Gap 5: the companion starts when `.git` cannot be written | Confirmed by probe | A scratch repository with `chmod -R a-w .git` started with exit 0 and stopped cleanly, every file under `.git` was byte-identical afterwards, and no server was left running |

## Recommendations

1. **One fix wave** covering C1 and I1 to I5. Each is small:
   - C1: a target check for three paths, plus four test cases.
   - I1: three document lines.
   - I2: one sentence.
   - I3: three phrases.
   - I4: five patterns and five test lines.
   - I5: one check.
2. **Fold in M1 and M5** if convenient: a one-line guard and two one-line additions.
3. **Scoped re-review of C1:** run the foreign whole-folder `skills` link case both as
   a dry run and as a real install.
4. **In the completion report,** state that the report steps of Phase 4 and of
   `fx-architecture` are still unexercised live. I2 and I3 are the kind of defect a
   live run would have shown.

## Assessment

**Ready to merge?** With fixes.

**Reasoning:** The implementation matches the design and every gate is green. But the
installer still deletes a `skills` or `references` link it did not create, against the
branch's own constraint. And two wording defects in the report-asset rules would stop
or break the offline report this change set exists to deliver.
