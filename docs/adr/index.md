# Architecture decision records

| ADR | Title | Date | Status |
|---|---|---|---|
| [0001](0001-instruction-before-enforcement.md) | Instruction before enforcement | 2026-09-05 | current |
| [0002](0002-the-imperative-leads-the-preamble.md) | The imperative leads the preamble | 2026-09-05 | current |
| [0003](0003-three-layers-of-knowledge.md) | Knowledge splits into three layers, by what owns it | 2026-09-05 | current |
| [0004](0004-descriptions-carry-triggers-and-stakes.md) | A skill description carries triggers and stakes, never a workflow summary | 2026-09-05 | current |
| [0005](0005-the-git-guard-has-no-opinion-about-location.md) | The git guard has no opinion about where you are | 2026-09-05 | current |
| [0006](0006-skills-stand-alone.md) | Every skill stands alone; no lane requires another | 2026-09-05 | current |
| [0007](0007-no-over-engineering-lane.md) | fx owns the over-engineering intent; it still does not replace ponytail | 2026-09-05 | current |
| [0008](0008-no-performance-lens.md) | No performance lens; the database lens owns query shape | 2026-09-05 | current |
| [0009](0009-convention-discovered-parts-are-never-declared.md) | Anything discovered by convention is never declared in the manifest | 2026-09-05 | current |
| [0010](0010-behaviour-is-measured-against-the-installed-plugin.md) | Behaviour is measured against the installed plugin, never the working tree | 2026-09-05 | current |
| [0011](0011-describe-the-category-not-its-members.md) | Describe the category; do not enumerate its members | 2026-09-05 | current |
| [0012](0012-what-fx-deliberately-does-not-cover.md) | What fx deliberately does not cover | 2026-09-05 | current |
| [0013](0013-descriptions-name-categories-not-stacks.md) | Agents and skills name categories, not stacks | 2026-09-11 | current |
| [0014](0014-the-app-layer-gap-gets-its-own-lens.md) | The app-layer gap gets its own lens, narrowed to unbounded enqueue | 2026-09-11 | current |
| [0015](0015-artifacts-live-in-the-repository.md) | Artifacts live in the repository, not the OS temp directory | 2026-09-11 | superseded by 0061 |
| [0016](0016-harness-facts-are-a-fourth-layer.md) | Harness facts are a fourth layer | 2026-09-21 | current |
| [0017](0017-a-declared-component-key-replaces-it-does-not-fail.md) | A declared component key replaces the default scan; it does not fail validation | 2026-09-21 | current |
| [0018](0018-matcher-groups-are-not-capped-per-plugin.md) | Matcher groups are not capped per plugin | 2026-09-21 | current |
| [0019](0019-read-only-is-three-mechanisms-and-one-guarantee.md) | Read-only is three mechanisms and one guarantee | 2026-09-21 | current |
| [0020](0020-the-preamble-is-rendered-not-copied.md) | The preamble is rendered, not copied | 2026-09-21 | current |
| [0021](0021-the-bootstrap-invokes-lanes-the-lanes-carry-rules.md) | The bootstrap invokes lanes; the lanes carry the rules | 2026-09-22 | current |
| [0022](0022-codex-declares-what-claude-code-discovers.md) | Codex declares what Claude Code discovers | 2026-09-23 | current |
| [0023](0023-a-codex-hook-prints-only-keys-codex-knows.md) | A Codex hook prints only the keys Codex knows, and anything else fails open | 2026-09-23 | current |
| [0024](0024-what-fx-cannot-observe-about-codex-it-says-so.md) | What fx cannot observe about Codex, it says out loud instead of guessing | 2026-09-23 | current |
| [0025](0025-the-five-user-invoked-lanes-keep-disable-model-invocation.md) | The five user-invoked lanes keep `disable-model-invocation`, and Codex's lint failure over it is cosmetic | 2026-09-23 | current |
| [0026](0026-the-users-own-permission-answer-wins-over-fxs-grant.md) | The user's own permission answer wins over fx's grant | 2026-09-23 | current |
| [0027](0027-role-planting-has-one-implementation.md) | Role planting has one implementation, and exactly two callers today | 2026-09-23 | current |
| [0028](0028-codex-agents-are-generated-to-disk-opencode-agents-are-converted-at-runtime.md) | Codex agents are generated to disk; opencode agents are converted at runtime | 2026-09-23 | current |
| [0029](0029-per-task-review-is-the-reviewer-plus-tripwires.md) | Per-task review is the reviewer plus tripwires; every lens and devil's advocate run at the branch pass | 2026-09-30 | current |
| [0030](0030-small-fixes-are-re-reviewed-by-the-controller.md) | Small fixes are re-reviewed by the controller, and test_all runs once | 2026-09-30 | current |
| [0031](0031-model-routing-is-held-by-a-hook.md) | Model routing is held by a hook, not by prose | 2026-09-30 | current |
| [0032](0032-the-preamble-carries-a-companion-tools-line.md) | The preamble carries a companion tools line | 2026-09-30 | current |
| [0033](0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md) | fx-brainstorm ends its interview with a confidence check | 2026-09-30 | superseded by 0045 |
| [0034](0034-external-review-security-and-design-content-absorbed.md) | External review, security and design content is absorbed as text, never as lanes | 2026-09-30 | current |
| [0035](0035-standing-rulings-live-in-one-repo-file.md) | Standing rulings live in one repo file, read at every session start | 2026-09-30 | current |
| [0036](0036-opencode-v2-is-a-separate-harness.md) | OpenCode 2.x is a separate harness, `opencode-v2`, beside `opencode` | 2026-10-01 | current |
| [0037](0037-the-opencode-v2-guard-in-layers.md) | The OpenCode 2.x git guard has three layers, and says which one is live | 2026-10-01 | current |
| [0038](0038-live-conformance-through-openrouter.md) | Live conformance runs go through OpenRouter, one switch for all four harnesses | 2026-10-01 | current |
| [0039](0039-codex-addressing-and-shell-run-apply-patch.md) | Codex lanes are addressed as `$fx:fx-<name>`, and the hook lane-checks a patch run through the shell | 2026-10-01 | current |
| [0040](0040-every-task-ledgers-its-dispatch-and-cost.md) | Every task ledgers its dispatch and its cost, and the controller caps outstanding reviews and re-dispatches | 2026-10-21 | superseded by 0064 |
| [0041](0041-rules-load-stories-do-not.md) | Loaded lane files carry rules; incident stories live in COVERAGE.md | 2026-10-21 | current |
| [0042](0042-one-compiled-brief-per-implementer.md) | One compiled brief per implementer and per task reviewer | 2026-10-21 | current |
| [0043](0043-plan-tasks-state-behaviour-and-name-tests.md) | Plan tasks state behaviour and specify their tests in prose | 2026-10-21 | current |
| [0044](0044-the-branch-pass-reviews-what-per-task-review-missed.md) | The branch pass reviews what per-task review missed, and the top tier is a written decision | 2026-10-21 | current |
| [0045](0045-one-design-checkpoint.md) | One design checkpoint | 2026-10-21 | accepted |
| [0046](0046-fx-sources-are-typescript.md) | fx sources are TypeScript; the generated JavaScript is committed | 2026-10-22 | migration complete |
| [0047](0047-the-judge-is-optional-and-fails-open.md) | The judge is optional and fails open | 2026-10-24 | superseded by 0049 |
| [0048](0048-the-judge-acts-only-where-measured.md) | The judge acts only where it was measured | 2026-10-24 | superseded by 0049 |
| [0049](0049-fx-has-no-judge.md) | fx has no judge | 2026-10-24 | accepted |
| [0050](0050-the-shell-guard-decides-on-code-alone.md) | The shell guard decides on code alone | 2026-10-24 | accepted |
| [0051](0051-turn-checks-read-a-session-journal.md) | Turn checks read a session journal | 2026-10-24 | accepted |
| [0052](0052-built-in-edit-rules.md) | Built-in edit rules | 2026-10-24 | accepted |
| [0053](0053-skill-size-gate.md) | The skill size gate | 2026-10-25 | accepted |
| [0054](0054-the-glossary-is-glossary-md.md) | The glossary is GLOSSARY.md | 2026-10-25 | accepted |
| [0055](0055-pr-and-retro-are-user-invoked-commands.md) | /fx:fx-pr and /fx:fx-retro are user-invoked commands | 2026-10-25 | accepted |
| [0056](0056-reviewers-judge-a-vision-and-list-what-they-declined.md) | Reviewers judge a vision and list what they declined | 2026-10-25 | accepted |
| [0057](0057-the-nested-controller-is-not-adopted.md) | The nested controller is not adopted | 2026-10-25 | accepted |
| [0058](0058-the-bounded-path-writes-a-short-design-md.md) | The bounded path writes a short design.md | 2026-10-25 | accepted |
| [0059](0059-fx-adr-writes-supersedes-and-indexes-adrs.md) | fx-adr writes, supersedes and indexes ADRs | 2026-10-25 | accepted |
| [0060](0060-templates-live-in-one-folder-and-scratch-is-retired.md) | Templates live in one folder and .scratch is retired | 2026-10-25 | accepted |
| [0061](0061-the-visual-kit-replaces-the-tailwind-and-mermaid-reports.md) | The visual kit replaces the Tailwind and Mermaid reports | 2026-10-25 | accepted |
| [0062](0062-fx-docs-keeps-docs-on-evidence-lines-and-the-docs-step-is-offered.md) | fx-docs keeps docs on evidence lines, and the docs step is offered | 2026-10-25 | superseded by 0066 |
| [0063](0063-a-reverse-index-from-code-path-to-doc-claims-feeds-seven-readers.md) | A reverse index from code path to doc claims feeds seven readers | 2026-10-25 | accepted |
| [0064](0064-the-transcript-path-is-recorded-in-the-git-common-dir.md) | The transcript path is recorded in the git common dir | 2026-10-27 | current |
| [0066](0066-a-system-model-is-the-record-for-the-system-flow-site.md) | A system model is the record for the system-flow site; its Markdown is generated | 2026-10-28 | accepted |
