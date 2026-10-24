# superpowers releases after 6.3.0

Source: git clone of github.com/obra/superpowers, HEAD = main = 2ce8aa1 (v7.0.1). Base v6.3.0 = b36e082 (2026-08-12, tag v6.3.0, package.json 6.3.0, RELEASE-NOTES.md line 158).
Versions are marked three ways: git tags `vX.Y.Z`, a `version` field bumped in package.json and each harness manifest (list in `.version-bump.json`), and a section per version in `RELEASE-NOTES.md`. Each release is one squashed "Release vX" commit.
Releases after 6.3.0: 6.4.1, 6.4.2, 7.0.0, 7.0.1. There is no 6.4.0 (RELEASE-NOTES.md: "v6.4.0 was never shipped").
Non-release commit: b739a8a (2026-10-20) "Templates: require a human-written summary" lands between 7.0.0 and 7.0.1 and is folded into the 7.0.1 notes.
Every bullet below was checked against `git diff vA vB` for the paths named, unless marked "notes only".

## v6.4.1, 2026-09-18, commit 5bf4e78 (diff v6.3.0..v6.4.1)
- New skill `skills/diagnosing-superpowers/` (SKILL.md + prompts/, references/, templates/): reads session transcripts on disk, reports findings with path:line evidence, can build a scrubbed bundle or draft a GitHub issue. Also `.github/ISSUE_TEMPLATE/diagnosis_report.md` (removed in 7.0.1).
- `skills/executing-plans/SKILL.md` rebuilt from a stub into "Native" inline execution (+391/-). New helpers `scripts/task-start`, `scripts/task-done`. Text confirms: no pausing between tasks, "Rulings, not stalls" (decisions logged in the ledger as `Ruling: ...`), four stop conditions (destructive op, security action, outside-worktree side effect, plan so broken every path is a guess), one fresh whole-branch review at the end. Description now "your human partner chose inline execution, or no subagent tool is available".
- `skills/writing-plans/SKILL.md`: new "Review Focus" section (up to five input classes/failure modes the spec implies but no task tests, each pinned by a test in the owning task) and self-review item 4. The plan must be reviewed by the human before execution. Handoff offers two options, Subagent-driven and Native, with a stated cost for each and a reasoned recommendation; an already-chosen method is kept.
- `skills/brainstorming/SKILL.md` (+59): new "Establish Shared Understanding" (discover intent, write it back, carry it into the design). The old blanket "no implementation until approved" gate is replaced by per-path prerequisites (Spike / Bounded / Architectural); "approval of an idea does not approve artifacts that do not exist yet". `visual-companion.md` small edits.
- `skills/requesting-code-review/code-reviewer.md`: new "The spec is a vision document" (silence in the spec is not permission; judge by what a reasonable user expects) and "Declined to judge" list that the executor must rule on. `SKILL.md`: multi-commit BASE_SHA alternative becomes `git merge-base origin/main HEAD`.
- `skills/test-driven-development/SKILL.md` (+10): "'Other tests' means the project's suite, not just your file": run the project test command and name every failure, including ones you did not cause.
- `skills/subagent-driven-development/`: SKILL.md flowchart changes the executing-plans branch to "Partner chose inline, or no subagent tool?"; "vs. Executing Plans (inline)" comparison rewritten (both run in-session, share workspace and ledger, never pause). All script calls become `bash scripts/...`. `scripts/sdd-workspace` (+46): per-plan workspace now records its owning plan so same-basename plans do not collide. `scripts/review-package` rejects empty or non-descendant BASE..HEAD (exit 3). `scripts/task-brief` and the two reviewer prompts only change to `bash scripts/...`.
- Nested-controller option (notes: ~half cost) lives in the NEW file `skills/using-superpowers/references/claude-code-tools.md`: one mid-tier orchestrator subagent runs the whole SDD loop, opt-in, whole plan only, must relay the "Rulings I made" list verbatim. It is not in SDD SKILL.md.
- `skills/using-superpowers/SKILL.md` (+2 lines): harness list adds `references/claude-code-tools.md` and `references/muse-tools.md`. New `references/muse-tools.md`. No change to the rule text itself.
- `skills/systematic-debugging/root-cause-tracing.md` and `skills/writing-skills/SKILL.md`: scripts invoked through their interpreter (`bash ./find-polluter.sh`, `node ./render-graphs.js`); writing-skills adds a rule never to invoke bundled scripts by bare path, because packagers strip executable bits (the Codex marketplace and MiniMax Code repackage did).
- `hooks/session-start`: Muse support. `MUSE_PLUGIN_ROOT` is detected and gets Claude-style `hookSpecificOutput.additionalContext`; the Claude branch now excludes Muse.
- Harness support: OpenCode 2.0.4+ alongside V1 (`.opencode/plugins/superpowers.js` +362, dual V1/V2, bootstrap kept across continuation/restart/fork/compaction, child sessions do not get the bootstrap; `.opencode/INSTALL.md`); Muse (`.muse-plugin/plugin.json`, `marketplace.json`); Qwen Code install line in README (notes only, README diff not read line by line).
- Docs: `AGENTS.md` becomes canonical contributor guide, `CLAUDE.md` shrinks to a pointer (it used to be the file, AGENTS.md a symlink); `CODE_OF_CONDUCT.md` replaced; README "When Something Goes Wrong". Notes say `proving-it-works-with-a-movie` was held back: confirmed absent from `skills/` at every tag.

## v6.4.2, 2026-09-25, commit 8ca22db (diff v6.4.1..v6.4.2)
- `skills/writing-plans/SKILL.md` (-52/+, net leaner): "What a Step Contains" (line 140) replaces "No Placeholders"; steps record decisions (signatures, test assertions, spec values), not code bodies; step = "one action with a checkable result" (line 45), not "2-5 minutes"; reader described as a capable engineer; self-review item 5 "Proportion" compares plan length to spec length (a plan several times longer is "a transcript"). Why (notes): frontier models such as Opus 5.5 overreached and tried to implement the project while planning; plans took a quarter of the time, a third of the tokens.
- `skills/writing-plans/plan-document-reviewer-prompt.md` deleted (unreferenced).
- `CLAUDE.md` deleted (3 lines) because Claude Code reads AGENTS.md only when no CLAUDE.md exists.
- Version bumps only elsewhere. No hook changes.

## v7.0.0, 2026-10-09, commit bb92a77 (diff v6.4.2..v7.0.0)
- `skills/brainstorming/SKILL.md` rewritten (466 lines changed). New shape: "First: what do you actually know?" (a fully specified request is done directly), first message = one offer to skip questions + one open question about a real moment, Socratic one-question-per-message, "How it gets made" (platform/language/medium ownership, defaults stated aloud), "Ground to cover" (goals, non-goals, anti-goals, prior art), "Play it back" every 200-300 words with guesses marked, "Size the Work" table (quick task / small change in chat / project with written design), spike allowed, Red Flags table. `<HARD-GATE>`: nothing built until the human approves the design; opted-out sessions and approved spikes exempt; after approval invoke writing-plans and no other skill. Description widened to non-software work (a talk, a business, a renovation).
- `skills/brainstorming/spec-document-reviewer-prompt.md` deleted; replaced by `builder-check-prompt.md`: a fresh subagent reads the design as the builder and lists only the questions it still needs answered; the controller sorts them into answered / minor (own call, marked) / theirs, and brings one round of questions.
- Visual companion offered just-in-time, token-cost warning dropped. `skills/brainstorming/scripts/server.cjs`: content inserted literally, fixing `$'`, `$&` corruption.
- `hooks/session-start`: no longer calls `dirname`/`cat`/`bash` via PATH (reads using-superpowers with `$(<file)`, splits `$0` in shell; falls back to bare printf when cat is missing), `emit_json` helper. Why: a broken startup PATH (anthropics/claude-code#43127) dropped the bootstrap. Injected content is unchanged: still the full `using-superpowers/SKILL.md`.
- `hooks/run-hook.cmd` (Windows): finds per-user Git for Windows (`%LOCALAPPDATA%\Programs\Git`), skips WSL `bash.exe` launchers, ignores `bash`/`where` in the current directory (a repo could plant `bash.cmd`), now passes exit codes through. `scripts/bump-version.sh` touched.
- Antigravity: `.antigravity-plugin/plugin.json` + logo; bootstraps through skill-description discovery (no session hook exists there), notes say verified on agy 1.3.1.
- Hermes: `.hermes-plugin/__init__.py` passes each skill's frontmatter description to `register_skill`.
- Small fixes: `skills/systematic-debugging/SKILL.md` multi-layer example no longer prints the IDENTITY secret (now only reports set/unset, uses `printenv`); `skills/requesting-code-review/SKILL.md` base-SHA example uses `cut -d' ' -f1` because Claude Code substitutes `$1` in skill bodies; `skills/subagent-driven-development/scripts/sdd-workspace` leaves a repo's own `.superpowers/sdd/.gitignore` alone and keeps plan markers repo-relative on Git Bash; `skills/executing-plans/scripts/task-done` records `(no output)` for silently passing commands.

## v7.0.1, 2026-10-21, commit 2ce8aa1 (diff v7.0.0..v7.0.1; includes b739a8a)
- `skills/brainstorming/SKILL.md` (+153): "Look Before You Ask" (read the project, spec, plan, files before the first message); first message echoes the request back with findings and asks the one open question, or, with no request detail, one question with its reason; the "just dive in" offer appears only when the user did not ask for brainstorming; new "Lay out the approaches" (two or three, recommended, human picks, in a message of its own); a design doc is written for every size (short for a small change, full for a project; builder check only for a project); ordered list: approaches, doc, approval, writing-plans. Why (notes): v7.0.0 questions felt formulaic; test scenario skipped the doc 24/24 before and 3/24 after.
- `skills/subagent-driven-development/SKILL.md` 32,577 to 19,506 bytes; fix loop, final review, report handling, resuming, preflight, batching, cannot-verify moved to `references/*.md`, read at the step that needs them. Fix-loop rules are intact in `references/fix-loop.md` (five rounds max; rounds 1-3 resume the implementer, 4-5 fresh implementer on a more capable model). Why: Claude Code re-attaches skills cut at 20,000 characters after compaction; one session lost the five-round limit and ran 18 rounds.
- `skills/writing-skills/SKILL.md`: supporting docs moved under `references/` (bulletproofing, discovery, flowcharts, anthropic-best-practices, persuasion-principles, graphviz-conventions, testing-skills-with-subagents, CLAUDE_MD_TESTING).
- `skills/executing-plans/SKILL.md`: Example Workflow removed (-52).
- `tests/skill-size/test-skill-size.sh` new: fails if any SKILL.md reaches 20,000 bytes.
- Contributing: issue/PR templates require filer identity, partner's request, and a human-written summary under 200 words; no agent-written PRs for others' issues (AGENTS.md, README, PR template); `diagnosing-superpowers` adds the same to drafted issues; Session Diagnosis template removed.

## Skills not changed since 6.3.0 (git diff --stat v6.3.0 v7.0.1 empty)
using-git-worktrees, receiving-code-review, verification-before-completion, dispatching-parallel-agents, finishing-a-development-branch.

## Changes to the flagged skills
| Skill | Versions | One-line summary |
|---|---|---|
| brainstorming | 6.4.1, 7.0.0, 7.0.1 | Intent write-back and per-path gates (6.4.1); full rewrite with builder-check, size table, hard gate, any-domain (7.0.0); context-first, approaches step, design doc always (7.0.1). Largest drift. |
| systematic-debugging | 6.4.1, 7.0.0 | Only `bash ./find-polluter.sh`; the IDENTITY example no longer leaks the secret. No method change. |
| test-driven-development | 6.4.1 | New paragraph: green means the project's whole suite; report all failures by name. |
| subagent-driven-development | 6.4.1, 7.0.0, 7.0.1 | Inline hand-off wording, `bash scripts/`, per-plan workspace, `review-package` range check; `.gitignore` respected; SKILL.md split into `references/` (7.0.1). Rules kept. Nested-controller option is in `using-superpowers/references/claude-code-tools.md`. |
| verification-before-completion | none | Unchanged. |
| using-git-worktrees | none | Unchanged. |
| requesting-code-review | 6.4.1, 7.0.0 | Reviewer judges unspecified behavior by reasonable expectation plus "Declined to judge" list; merge-base BASE_SHA; `$1`-safe example. |
| receiving-code-review | none | Unchanged. |
| writing-skills | 6.4.1, 7.0.1 | Interpreter-prefixed script rule; supporting docs moved to `references/`. |
| writing-plans | 6.4.1, 6.4.2 | Review Focus section and human plan review; Subagent-driven/Native handoff; then leaner "decisions not code" steps, proportion check, reviewer prompt deleted. |
| session-start / bootstrap hook | 6.4.1, 7.0.0 | Muse branch; PATH-independent script, `emit_json`, Windows `run-hook.cmd` hardening. Injected text is still the whole using-superpowers SKILL.md. |
| using-superpowers text | 6.4.1 | Only two lines added to the harness reference list; two new reference files. Rule text unchanged through 7.0.1. |

## New, removed, harness
- New skills: diagnosing-superpowers (6.4.1). Rebuilt: executing-plans (6.4.1, "Native"). Removed skills: none. Removed files: `plan-document-reviewer-prompt.md` (6.4.2), `spec-document-reviewer-prompt.md` (7.0.0).
- New hooks: none added; `hooks/session-start` and `run-hook.cmd` modified.
- Harnesses added: OpenCode 2.0 (6.4.1), Muse (6.4.1), Qwen Code docs (6.4.1), Antigravity (7.0.0); Hermes fix (7.0.0).
- Model/dispatch: Native execution on a mid-tier session model with one final review on the most capable model; optional mid-tier orchestrator subagent for SDD on Claude Code; fix-loop rounds 4-5 on a more capable model (references/fix-loop.md); writing-plans change aimed at frontier-model over-planning.

## Not verified
- 6.4.1 README (Qwen Code) and docs/ changes: from notes only. Full text of `diagnosing-superpowers` prompts/templates and `executing-plans` body past line 60 were not read in full. Test files not read. No web checks were made; everything is from the clone.
