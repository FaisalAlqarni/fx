Adversarial review (code mode), diff `dd99986..cb5c4cb`, read at HEAD in `/development/fx/.worktrees/upstream-update`. I read the code and docs but ran no tests. I treated the S1 to S4 rulings and the ledger's deferred Minors as settled unless noted.

1. **Important: park-and-continue has no way back.**
   - `skills/fx-implement/SKILL.md:111` says a `parked:` task "is never re-dispatched". `references/status.md:19-33` parks irreversible, security and outward steps "until the owner answers".
   - Nothing, in `skills/fx-implement` or `references/completion.md:3-9`, says how the owner's answer runs the parked step. No lane states how a ledger line gets un-parked or how a resumed controller treats it.
   - `references/completion.md:8` writes `Plan complete: ... <K> parked`. `src/lib/plan-state.ts:45` treats any `Plan complete:` line as finished, so later sessions stop surfacing the plan and its parked work is orphaned.
   - Fails integrity: the new feature is write-only.
   - Related: `references/handling-reports.md:21` writes a different shape, `parked: <reason>` with no `needs you`. `completion.md:41` collects only `needs you` lines.

2. **Important: the glossary migration leaves dead references in the files it moves and in files outside `docs/`.**
   - `src/lib/glossary-migrate.ts:43-46` excludes moved files from `edits` (`!from.has(f)`). Candidates are only root `CLAUDE.md`, `AGENTS.md`, `repo.md` and `docs/**`.
   - `applyMigration` (lines 51-60) rewrites only those candidates plus the root `GLOSSARY-MAP.md`. So moved engine glossaries and `engines/*/README.md` keep `CONTEXT.md` and `CONTEXT-MAP.md` text.
   - In `/development/advantage-backend` this hits 7 references in 5 engine `CONTEXT.md` files and 1 in `engines/engagement/README.md`.
   - The ledger's deferred Task 10 Minor ("rewrites mentions of files it does not move") is the opposite case. This one is not recorded.
   - Fails integrity: the tool claims to rename the glossary but leaves links to the old name.

3. **Important: `README.md:54` still describes a four-option completion menu that includes discard.**
   - `references/completion.md:49-57` and `references/finishing.md:54` say discard is not on the menu and happens only on a typed `discard`.
   - The Task 17 Minor ("update to three options") was deferred, and Task 23 edited README without fixing it.
   - Fails integrity: user docs advertise a destructive option the lane forbids.

4. **Minor: `server.cts:402` uses the same string-replace pattern as the fixed bug (still open).**
   - `src/skills/fx-brainstorm/scripts/server.cts:402` is `html.replace('</body>', helperInjection + '\n</body>')`.
   - Task 06 deferred it and the ledger has no later disposition. It is latent today because `helper.js` contains no `$&`, `$'`, `` $` `` or `$$`.
   - The first `</body>` inside user content also wins. This is not new; flagging it as still open only.

5. **Minor: `compile-brief` section matching widened for every caller.**
   - `src/skills/fx-implement/scripts/compile-brief.ts` `section()` now matches any heading of level 2 to 6.
   - `Global Constraints`, `Review Focus` and every `**Design:**` or `**Stack:**` name can now bind to an earlier `###` of the same text in an unrelated section, silently.
   - Only `##` matched before. Equal-name `###` headings under different parents resolve to the first.
   - The fenced-code early cut-off is already ledgered as deferred and I am not re-reporting it.

6. **Minor: the new reachability gate in `scripts/check-paths` is not transitive.**
   - The added link-checking block (the `named` set) counts a link from any file, including an orphan, as naming its target.
   - Two files that link only to each other pass. `skill-size.test.ts` covers a single orphan, never a cycle.
   - The gate claims "every file is named by one".

7. **Minor: stale counts in the conformance rows.**
   - Eight lanes are hidden. `tests/conformance/rows/13-audit-lane-not-model-facing.sh:50,82,84` still say "seven" in comments and in error strings. Row 14 at lines 8 and 37 says "five commands".
   - Wrong error text misleads whoever debugs a red conformance row.
   - Task 19's Minor covers part of this; the fix-up never landed.

8. **Minor: `completion.md:59` puts the `/fx:fx-retro` line after the menu's "Which?".**
   - That sits after "present exactly these, and wait", so it can read as a fourth option or as text past the stop. This is the Task 19 deferred Minor, still unfixed.

9. **Minor: weak spots in the glossary notice.**
   - `src/lib/glossary.ts:21-24` checks the root file only. After a partial migration (root `GLOSSARY.md`, engines still `CONTEXT.md`) no notice fires, though the rerun-finishes-the-job feature depends on a prompt.
   - Declining requires running the whole `fx-setup` lane or hand-editing `.fx.json`. The notice text hard-codes "the fx-setup command", not the per-runtime `lane()` addressing the rest of the preamble uses.
   - The 9,000-character worst-case render test never includes a notice.

Not checked: I did not diff-compare the `fx-implement`, `fx-authoring` and `fx-plan` splits for dropped rules, and I did not read the fx-tdd, fx-debug, fx-review or wayfinder prose.