## Task 18 spec compliance

Spec compliant. Task 20 spec compliant. Verdicts below are per task.

- Task 18: every listed file has its hunk (commands, generator list and docstring, both generated skills with openai.yaml, lane list ts+js, user-invoked test ts+js, rows 09/13/14, finishing.md).
- Task 18: opencode-plugin.test.ts edit (src/tests/gates/opencode-plugin.test.ts:~206, built js alongside) is a correct necessary change, not scope creep. It changes `assert.strictEqual(userInvoked.length, 5, ...)` to 7. That test derives `userInvoked` from the skills' `disable-model-invocation: true` frontmatter and then deepEquals it against the plugin's registered commands, so adding two hidden skills breaks the literal 5 unless it is updated. It is a one-number consequence of the brief's own change, in the same seam as the listed gates, and no new behavior was added. The brief's Risks line named only the conformance rows; the test file was a missed dependency, the same class of risk. Brief file list was incomplete; no objection.
- Task 18: fx-pr never pushes or opens a PR. commands/fx-pr.md states "Never run `git push` or any `gh` command, and never open or edit a pull request"; the only git it reads is `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`; the only write is `docs/plans/<slug>/pr.md` when a plan exists. Verified by reading the diff hunk.
- Task 18: fx-pr drafts the agreed shape. Headings exactly `## What and why` (three lines at most), `## Changes` (one line per area, about seven), `## Evidence` (what ran with result, "End with what did not run"), `## Merge danger` (two lines: one-way or two-way door, blast radius); "No code, diff or diagram unless the owner asks"; chat plus pr.md. No `.github` pull_request_template handling (ledger ruling honored).
- Task 18: fx-what covers asked, done, pending, needs you; leads with the point; uses GLOSSARY.md or older CONTEXT.md; reads ledger tail; "Change nothing".
- Task 18: generator list is seven, docstring "five" to "seven"; frontmatter has `disable-model-invocation: true`, and `argument-hint` on fx-pr.
- Task 20: references/wayfinder.md has Destination, Notes, Decisions so far, Not yet specified, Out of scope; decision fields Question, Type (research, prototype, grilling, task), Blocked by, Status (open, claimed, resolved), `## Answer`; rules: decisions not deliverables, fog-or-ticket, one decision per session except research, owner-only questions never answered by the agent, act by Type line, map is an index; research under research/<slug>.md; exit to one design.md per sub-project. Nothing pushes or opens a PR (wayfinder.md:3-4).
- Task 20: fx-brainstorm section 2 gains one pointer line to `../../references/wayfinder.md` (SKILL.md diff hunk after the "own design, plan, implementation cycle" paragraph); report says 18,463 bytes, under 19,500, so no section move needed.
- Ledger rulings checked: batching, pull_request_template drop, no push. None violated.

Cannot verify from diff (warning): gate results (check-paths, check-reference-leaves, check-prose, skill-size, brainstorm-confidence, test-scope) rest on the report; not re-run per template. Live lane-triggering did not run (disclosed in report; on request only).

## Strengths

- RED for task 18 is valid runtime RED (`seven lanes are user-invoked` assertion against the old five-list), then GREEN across user-invoked, check-manifest, description-overlap, skill-size, check-generated.
- Both commands are short and carry the "Never run git push or gh" rule in the body where the model reads it.
- Implementer found and disclosed the opencode-plugin test dependency and the commit-order slip; the final test-scope covered both tasks' files.
- Wayfinder is tight (59 lines, no TOC needed) and stays a leaf reference.

## Issues

### Critical (Must Fix)
None.

### Important (Should Fix)
None.

### Minor (Nice to Have)
- tests/conformance/rows/14-audit-lane-user-invocable.sh:8 and :37 · comments still say "the five commands" after the list became seven (the diff updated rows 09 and 13 comments and row 14's HIDDEN list but not these two) · stale comment only · change to "seven".
- skills/fx-implement/references/finishing.md:32 (option 2 line) · says "Tell the owner to run `/fx:fx-pr` first" but the next paragraph still says "following the repo's template"; with the ruling to drop template handling in fx-pr this is mildly inconsistent for the pre-existing forge step, not a defect in fx-pr · leave or reword when finishing.md is next touched.
- commands/fx-pr.md Evidence section · agreed shape names a "Not run" ending; the command says "End with what did not run" without the literal label `Not run`, so output labeling will vary between drafts · optionally say "end with a `Not run:` line".

## Assessment

**Task quality:** Approved
**Reasoning:** Both tasks match their briefs file by file; the opencode-plugin.test edit is a necessary one-number consequence of adding two hidden lanes, and fx-pr cannot push or open a PR and drafts the agreed four-section shape. Only stale-comment and wording Minors remain.

## Ledger lines

Task 18: minor (deferred): conformance row 14 comments at lines 8 and 37 still say "five commands", now seven
Task 18: minor (deferred): finishing.md option 2 still says "following the repo's template" beside the new /fx:fx-pr pointer
Task 18: minor (deferred): fx-pr Evidence ending does not name a literal "Not run" label, so drafts may vary
