# Task 07 review findings

**Spec compliance: PASS** (9/10; criterion 10 deliberately unmet per adjudication)
**Task quality: PASS**
One Important defect found by the controller after the review passed, fixed in
round 1. No Critical findings.

## The investigation that changed the task

The task suspected Codex's own command-to-skill migration might make the
generator redundant. It does not. Measured: `fx-handoff` migrated 3 times out of
3 from the real repository, while controlled probes on near-identical content
gave 2 of 2 and then 0 of 4. And when it fires, the output is **unhidden**, in
the wrong location, under the wrong name. The generator stays.

## The Important defect the review did not catch

The reviewer marked the live model-visible check CANNOT-VERIFY and did not run
it. It is local and free. The controller ran it:

```
fx-audit     hidden        fx-tdd         visible   <- control
fx-critique  hidden        fx-brainstorm  visible   <- control
fx-grill     hidden        fx-review      visible   <- control
fx-handoff   VISIBLE       (as fx:source-command-fx-handoff)
fx-setup     hidden
```

`fx-handoff` was hidden under its own name and exposed under Codex's generated
one. This is the exact failure shape the task exists to prevent, arriving
through the mechanism the implementer had investigated and correctly described.
The review's enumeration checked `skills/*/SKILL.md` and `commands/*.md`, which
is the right source of truth for what fx ships; Codex's generated copy is in
neither.

## Fix round 1, and the trigger

**Codex's migrator parses each command's frontmatter as strict YAML and silently
skips any command whose frontmatter fails to parse.** Three of fx's four
commands were already failing that parse by accident, an unquoted colon in the
description. `fx-handoff`'s parsed cleanly, so only it migrated. Isolated by a
dozen live installs varying one factor at a time.

The fix gives `fx-handoff` a description that also contains an unquoted colon,
plus a regression test pinning the property for all four.

Re-review verified: all four frontmatters fail strict parse with `mapping values
are not allowed here`; the regression test discriminates (quoting the
description made it fail, restoring made it pass); regenerating produces no
diff; `scripts/check-all` -> `ALL GREEN`; scope is four files. The test's own
comments name the limitation for the next reader.

Controller verified independently: all five hidden, three controls visible, no
`migrated-command-skills` directory created. Sidecar filenames confirmed as
`openai.yaml`, matching OpenAI's own bundled `review-agent`.

## The residual risk, recorded rather than smoothed over

The defence is a YAML parse failure in **undocumented behaviour, not a
contract**. The unit test pins our descriptions, not Codex's parser. If a future
release tolerates that YAML, the test keeps passing and every hidden lane
silently reappears.

The alternative, not shipping `commands/` to Codex at all, was considered and
rejected: Codex copies the plugin tree wholesale and no ignore mechanism was
found. Task 12's conformance row 13 was strengthened to be the real gate, and
task 13 documents the fragility.

## Other verification

Mutation-tested the body-equality assertion by de-deepening a citation: it
failed with the exact drift, then passed on restore. Generator determinism
checked by sha256 before and after. `scripts/check-paths` -> 63 citations, all
resolvable. The out-of-scope guard in `scripts/fx-opencode-install` is two lines
plus a docstring and touches nothing else.
