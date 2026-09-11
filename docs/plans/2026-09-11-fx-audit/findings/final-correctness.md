# Final review: correctness pass

**Range:** `8309b63` to `a19e515`, shipped paths. HEAD `c48dc50` has no diff against `a19e515` on those paths (checked with `git diff --stat a19e515 HEAD`).
**Question:** what is broken.
**Method:** the diff read once; gate, shell and git logic reproduced in scratch directories under `/home/faisal/.claude/jobs/6d844eaa/tmp/`, all removed afterwards. The companion was run from a scratch copy of `skills/fx-brainstorm/` against a scratch repository, never inside this worktree, and both servers it started were stopped. Each finding says **ran** or **read**.

Known items from the brief and `final-review-carried.md` are not repeated. Where a finding overlaps one, it says so.

**Counts:** Critical 0, Important 4, Minor 13.

---

## Important

### I1. `check-prose` scans every nested worktree, so `check-all` fails in a checkout that holds one

- **Where:** `scripts/check-prose:22` (EXEMPT) and `:55` (`files()`), reached through `scripts/check-all`.
- **What is wrong:** with no path argument, `files()` runs `rglob('*.md')` from the repository root. EXEMPT gains `.fx/` on this branch but not `.worktrees/` or `.claude/worktrees/`. fx puts every build worktree under `.worktrees/` inside the checkout, and after this branch the review worktrees go there too (`skills/fx-review/reviewer-prompt.md:58`).
- **Trigger:** running `scripts/check-all` or `scripts/check-prose` in any checkout that contains a worktree. The main checkout holds one right now: `/development/fx/.worktrees/fx-audit`.
- **Ran:** a scratch root with one clean `docs/ok.md` and a `.worktrees/wip-branch/docs/wip.md` holding a dash and a stock word. Result: `FAIL`, both hits reported against `.worktrees/wip-branch/docs/wip.md:1`, exit 1.
- **Read, not ran:** `reviewer-prompt.md:58` gives a relative path. A reviewer whose working directory is a build worktree therefore creates `.worktrees/review-<SHA>` nested inside it. Carried item 2 records that nothing removes it, so a leftover review worktree puts a full older copy of the repository under the build worktree's own `test_all` scan.
- **Consequence:** the combined gate goes red on the base branch for prose on other branches, and every file is scanned once per worktree. It also fails something it should pass. A gate that is red for reasons outside the change is the gate people learn to ignore, which is the outcome `check-all`'s own header warns against.

### I2. The pipeline lens is told to read the whole audit file set in full, which no dispatch can do at audit scale

- **Where:** `agents/fx-lens-pipeline.md:35-37`, dispatched by `skills/fx-audit/SKILL.md:195` and `:199`.
- **What is wrong:** given a file set with no diff, the lens must "treat every file in the set as the change under review and read each one in full". Phase 3 hands it the output of `git ls-files --cached --others --exclude-standard <scope>`, which at root scope is every tracked and untracked file in the repository, generated and vendored files included. That list is 189 files for fx itself, and `SURFACE.md` records 1,658 vendored `.ts` files in one of the user's repositories alone. A single subagent's context cannot hold that. The lens's own Method (start from enqueue and publish calls, grep for other producers) is the workable approach, and it contradicts the Input rule.
- **Trigger:** any whole-system audit of an ordinary application, which is the audit's stated use.
- **Read.**
- **Consequence:** the lens reads what fits and reports on it with no statement that coverage was partial. Phase 4's sound check (`SKILL.md:231`) then counts "reported nothing Critical or Important" as a clean pass, so an unread producer can end in a `sound` verdict. Because rule 1 of Resume stops every later run on that verdict, the audit does not revisit it.

### I3. Phase 4's module count has nothing to count

- **Where:** `references/audit-template.md:190`, required by `skills/fx-audit/SKILL.md` Phase 4 "Done when" (every count the audit template states holds).
- **What is wrong:** "Module count: N modules listed in `01-current.md`'s patterns and file structure section." That section's skeleton (`audit-template.md:45-48`) asks for "the structural conventions actually in use: layering, naming, and where a new instance of a recurring shape gets added today". It never asks for a list of modules, and no Phase 1 explorer brief asks for one either. Phase 4 cannot add one, because "an existing phase document is finished work: read it, never rewrite it".
- **Trigger:** every audit that reaches Phase 4 with a `01-current.md` written to the skeleton as given.
- **Read.**
- **Consequence:** the agent has to compose the module count itself, so the "row count must match" check compares the table against a number written for the table. That is the defect commits `323f02e` and `4edc104` fixed for the target count by anchoring it to a field that must exist. The fix was not carried to this count. A module can go unaccounted with the check still reading as satisfied.

### I4. `--slug` is ambiguous between the dated directory and the bare slug, so mockups can land beside the plan instead of in it

- **Where:** `skills/fx-brainstorm/SKILL.md:183` ("`--slug` set to the design's slug"), `skills/fx-brainstorm/visual-companion.md:60`, `skills/fx-brainstorm/scripts/start-server.sh:159`.
- **What is wrong:** the same skill writes its design to `docs/plans/YYYY-MM-DD-<slug>/design.md` (`SKILL.md:289`, `references/design-template.md:3`), where `<slug>` is the undated part. Read literally, "the design's slug" is that undated part. The script, though, puts mockups at `docs/plans/<value>/companion/`. Only the dated directory name puts them inside the plan directory. `fx-implement` uses `docs/plans/<slug>/` to mean the dated name, so the repository uses the word both ways, and the instruction does not say which one it means. The companion is also offered mid-interview, before the design's directory name is fixed.
- **Trigger:** an agent that passes the bare slug, the more literal reading of `SKILL.md:183`.
- **Read.** Ran the script with a dated value, and it behaves as designed for that reading.
- **Consequence:** mockups go to `docs/plans/<slug>/companion/`, a sibling of `docs/plans/YYYY-MM-DD-<slug>/`. They are not "committed with the plan", and they leave a second plan-shaped directory for later tools and readers. The script prints no warning, because a slug was given.

---

## Minor

### M1. Any paragraph that mentions the quoting marker is exempt from the stock-vocabulary check

- **Where:** `scripts/check-prose:180-182`.
- **What is wrong:** exemption is by substring presence anywhere in the block. A paragraph that explains the marker by naming it, as a README or ADR would, is exempted along with every real violation in it. Nothing reports which lines were skipped, only a count.
- **Ran:** a one-paragraph file naming the marker in backticks and containing two stock words. Result: `1 block(s) exempted`, `OK`, exit 0.
- **Consequence:** a real violation passes silently in the paragraphs most likely to discuss the rule. Workaround: keep explanatory mentions in a separate paragraph.

### M2. `check-artifacts` misses the common ways to write to temp

- **Where:** `scripts/check-artifacts:19`.
- **What is wrong:** the patterns are literal and case-sensitive. `mktemp` (which defaults to `/tmp`), `tempfile.mkdtemp()`, `$TMP`, `%TMP%` and `$env:TEMP` all pass. The scan also covers only `skills/`, `agents/` and `commands/`, while `references/`, which lanes load as instructions, is not read.
- **Ran:** a `skills/x/SKILL.md` with those lines. Only the line containing `${TMPDIR` was reported, and the other three passed.
- **Consequence:** the gate passes instructions that put artifacts in the OS temp directory, which ADR 0015 says it catches. Its docstring lists exactly what it matches, so the gap is in the gate's reach, not a mismatch with its text.

### M3. `check-artifacts` crashes on a binary file

- **Where:** `scripts/check-artifacts:39`.
- **What is wrong:** `path.read_text()` on every file under the three areas. A PNG or font added to a skill raises `UnicodeDecodeError`.
- **Ran:** added a four-byte PNG header under `skills/x/`. Result: a Python traceback, exit 1.
- **Consequence:** `check-all` goes red on the first binary asset, with a traceback in place of a finding. Commit `9eea5c1` chose to fail loudly on unreadable files. This is that choice applied to files the gate has no reason to read.

### M4. An interrupted Phase 2 cannot be resumed, because the worktree path already exists

- **Where:** `skills/fx-audit/SKILL.md:174` and `:183`.
- **What is wrong:** the reference worktree is created in step 1 and removed only at the gate. A run that stops between the two (a long explorer dispatch, a closed session) leaves `.worktrees/audit-<name>-reference`. Resume rule 5 routes back to Phase 2, whose step 1 runs `git worktree add` on the same path, and no step handles that.
- **Ran:** `git worktree add --detach <existing path> HEAD` gave `fatal: '<path>' already exists`, exit 128.
- **Consequence:** the resumed phase fails at its first command. Workaround: `git worktree remove` by hand.

### M5. The Phase 3 file set depends on the working directory, and can include a nested worktree

- **Where:** `skills/fx-audit/SKILL.md:195`.
- **What is wrong, part 1:** the pathspecs are relative to the working directory, and the skill never says to run from the repository root. From a subdirectory, the scope pathspec matches nothing: git prints a warning and exits 0 with an empty list.
- **What is wrong, part 2:** at root scope, an unignored `.worktrees/` puts a linked worktree into the set as one directory entry. The ignore check for `.worktrees/` runs only in Phase 2, so it is skipped when no reference was given.
- **Ran:** both cases. From `app/`, `git ls-files ... engines/core` gave `warning: could not open directory 'app/engines/'` and exit 0. At root with `.worktrees/review-x` present and not ignored, the set held `.worktrees/review-x/`.
- **Consequence:** in the first case the lens and `fx-architecture` get an empty set, and nothing fails. In the second they are handed a directory entry for another checkout.

### M6. A dispatch that could not run still counts toward a `sound` verdict

- **Where:** `skills/fx-audit/SKILL.md:231`.
- **What is wrong:** step 4 of Phase 3 anticipates a lens that does not resolve by name and records it. Phase 4's sound check is "`fx-lens-pipeline` reported nothing Critical or Important", which a lens that never ran satisfies. Likewise an `fx-architecture` dispatch that failed offers no candidates, so the gate choice is `none`.
- **Read.**
- **Consequence:** the audit can end `sound` with one or both passes missing, and Resume rule 1 stops every later run on that verdict. The failure is written under Lens findings, so a careful reader sees it. Carried: named dispatch of the lens has never been observed.

### M7. The reference template says six headings and lists seven

- **Where:** `references/audit-template.md:94`.
- **What is wrong:** "Same six headings as `01-current.md`". Both skeletons list seven headings: domain model, end-to-end flow, feature inventory, patterns, does well, does badly, areas not covered. Phase 2's "Done when" requires every heading.
- **Read.**
- **Consequence:** an agent that trusts the number drops one heading, most likely Areas not covered, the one the template says must never be absent.

### M8. The feature count double-counts features present in both systems

- **Where:** `references/audit-template.md:123`.
- **What is wrong:** feature count is the current inventory plus the reference inventory, and the row count must equal feature count plus target count. A feature both systems implement appears in both inventories, so the table must carry two rows for one comparison.
- **Read.**
- **Consequence:** the gap table either carries duplicate rows or fails its own count check when the agent merges them. Reference audits compare like with like, so the overlap is normal, not an edge case.

### M9. The audit's name changes with the checkout it runs in

- **Where:** `skills/fx-audit/SKILL.md:65`.
- **What is wrong:** `<name>` starts with "the repository directory's name". In a linked worktree that is the worktree's directory name. This checkout's top level is `fx-audit`, while the main checkout's is `fx`.
- **Read.**
- **Consequence:** an audit started in one checkout is not found by Resume when run from the other, and a second audit starts at Phase 1.

### M10. The audit says `fx-plan` refuses a draft, and nothing in `fx-plan` checks

- **Where:** `skills/fx-audit/SKILL.md:264`.
- **What is wrong:** `fx-plan` requires "an approved design" in prose (`skills/fx-plan/SKILL.md:15-16`) and never reads the Status line. `grep -i draft` finds only a section heading.
- **Read.**
- **Consequence:** the gate tells the user that refusal is a safeguard, but whether `fx-plan` stops on `draft, not approved` depends on how the agent reads the word "approved". An unapproved target architecture can be planned.

### M11. Resume at the Phase 3 gate cannot advance by re-running, and the Phase 4 report is found only by elimination

- **Where:** `skills/fx-audit/SKILL.md:120`, `:274`, `:118`.
- **What is wrong, the gate:** every gate says the next phase starts when the user "run[s] the skill again". At the Phase 3 gate, rule 4 answers a re-run by asking the question again and stopping, and a choice written in the re-run's brief is not read.
- **What is wrong, the report:** rule 3 writes "the Phase 4 report if it is missing". Both reports are named `report-<timestamp>.html`, so the Phase 4 one is recognised only as a report that `03-gaps.md` does not name. A second `fx-architecture` report left by a re-dispatched Phase 3 reads as the Phase 4 report, and it is never written.
- **Read.**
- **Consequence:** a user following the gate text re-runs and gets the same question. After a re-dispatch, a draft `design.md` has no rendering.

### M12. The companion creates `docs/` and `docs/plans/` owner-only

- **Where:** `skills/fx-brainstorm/scripts/start-server.sh:143` (`umask 077`), in effect at `:232`.
- **What is wrong:** the umask meant for the key files also applies to `mkdir -p "${SESSION_DIR}/content"`, which creates any missing parent in the repository.
- **Ran:** in a fresh repository, `docs`, `docs/plans` and `docs/plans/<slug>` were all mode `700`.
- **Consequence:** another user, or a container running as a different uid over a mounted checkout, cannot read the plan directory. Git does not track directory modes, so nothing surfaces it.

### M13. A restart changes `screen_dir` and `state_dir`, while the instructions imply nothing changes

- **Where:** `skills/fx-brainstorm/visual-companion.md:112`, `start-server.sh:146`.
- **What is wrong:** `SESSION_ID` is new on every start, so a restart with the same `--project-dir` and `--slug` watches a new content directory and writes a new state directory. The line says the tab reconnects and "you don't need to send a new URL", but not that the saved `screen_dir` and `state_dir` are now stale.
- **Ran:** start, stop, start with the same slug. The port was reused (58572 both times). The state directory changed from `.../3087628-1789160267/state` to `.../3087781-1789160269/state`.
- **Consequence:** an agent that keeps writing to the saved `screen_dir` pushes screens the restarted server never serves. The behaviour predates the branch, but this branch rewrote that line.

---

## Checked and sound

- **Ignore checks on paths that do not exist yet: ran.** `git check-ignore -q` matches nonexistent paths under `.fx/` and `.worktrees/` rules, with or without a trailing slash, from `.gitignore` or the exclude file (git 2.43.0). The audit's claim at `SKILL.md` Files holds. The comment at `start-server.sh:198`, that a directory-only rule needs the directory to exist, is inaccurate but causes nothing beyond the carried empty state directory.
- **Companion keeps the key out of git: ran.** In a repository with no rule, it appended `.fx/` to `.git/info/exclude` and said so. `git status --ignored` listed `.last-port`, `.last-token`, `server-info`, `server-instance-id`, `server.log` and `server.pid` as ignored, and nothing was untracked.
- **Stop path and restart: ran.** `stop-server.sh "$(dirname "$STATE_DIR")"` stopped the server and kept the mockup directories. A restart reused the port and the key file.
- **Audit file set exclusion: ran.** `':(exclude)docs/plans/<slug>'` removes the audit's own directory under `--others`. Slugs containing `+` need no pathspec escaping.
- **`check-all`: read.** The shape check on `make-git-fixture`'s output is correct for its single-line output. The `run` wrapper stops at the first failure under `set -e`.
- **`check-prose` block splitting at fences: read.** Blocks are now contiguous, so the marked-line range in `main()` maps onto physical lines correctly.
- **fx-review Mode column: read.** It is consistent with task mode's "lenses off unless" rule. The `fx-implement` name list is carried.
