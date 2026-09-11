# Final review: standards pass

**Range:** `8309b63..a19e515`, shipped paths only. Line numbers are at HEAD
`c48dc50`, which has no diff against `a19e515` on any shipped path.
**Excluded:** `tests/lens-pipeline/fixture/` (Ruling B); everything the gates
already enforce; every item in `final-review-carried.md`.

**Counts:** 4 hard violations, 18 judgement calls.

Standards read: `PREAMBLE.md`, `skills/fx-authoring/SKILL.md`, `docs/adr/0001`
to `0015`, the plan's global constraints (`plan.md:46-72`),
`references/vocab/fowler-smells.md`, and `references/vocab/domain-modeling.md`
for ADR format.

---

## Hard violations

### H1. `references/audit-template.md:3` names a command that does not resolve

"Written by `/fx:audit`". This branch's README states the typed form at
`README.md:188`: "Every command is typed with the plugin prefix and its `fx-`
name: `/fx:fx-<name>`", and the skill titles itself `/fx:fx-audit` at
`skills/fx-audit/SKILL.md:8`. Standard: PREAMBLE Prose, "Use one term for one
thing and keep using it", and fx-authoring's "Inconsistent terminology"
anti-pattern. The line was added by this branch.

### H2. `skills/fx-brainstorm/visual-companion.md:60` uses the old command name in a line this branch added

"which `/fx:setup` git-ignores". Same standard and same README rule as H1. The
README and SURFACE rename every command to `/fx:fx-<name>` in this diff, and this
line, written in the same diff, uses the other form. Ruling AD (parked) may
decide which form is right; either way the branch now writes both forms in lines
it added. Older `/fx:setup` occurrences outside the diff (`commands/*.md`,
`skills/fx-review/SKILL.md:112`) are not counted here.

### H3. `skills/fx-brainstorm/scripts/start-server.sh:209-210` claims parity with a skill that does something else

"add .fx/ to the local exclude file, never the project's .gitignore, as
fx-implement does." `skills/fx-implement/SKILL.md:243-251` adds `.fx/` and
`.worktrees/` to the ignore file, and uses `.git/info/exclude` only "On a repo
with no application yet". Standard: PREAMBLE Prose, "never claim more than the
thing claims", which names "a comment above a guard" as covered. The check it
proposes fails here: nothing in fx-implement would have to break for the comment
to be false, because it already is.

### H4. `docs/adr/0015-artifacts-live-in-the-repository.md:6-8` describes a narrower gate than the one that ships

The ADR says `scripts/check-artifacts` "fails when a skill, agent or command
names `/tmp` ... as a write target". `scripts/check-artifacts:37-44` fails on any
line containing a pattern, whatever the line does. The branch's own diff shows
it: `skills/fx-architecture/COVERAGE.md:32` and `:124`, `skills/fx-review/COVERAGE.md:75`
(the Read-Only Review row) and
`skills/fx-brainstorm/scripts/stop-server.sh:7` all needed `artifact-gate: ok`,
and none of them is a write target. Standard: PREAMBLE Prose, "Precision is not
accuracy": the ADR reads as a gate that tells a mention from a write, and the
next reader stops looking for false positives.

---

## Judgement calls

### J1. `agents/fx-lens-pipeline.md:3-9`: no stakes clause, and one sentence the body already carries

The plan constraint reads "A description carries triggers and stakes". This
description has triggers and no stakes clause. ADR 0004 scopes the rule to "A
skill description", and no existing agent carries stakes either, so repository
practice reads the constraint as skill-only; not in the carried file, which
records the tension only for commands and user-invoked skills. Separately, the
closing sentence ("A finding here is a producer or a scheduled run that keeps
adding work ...") restates the Critical definition at `:116-124`. fx-authoring
`:99-101`: cut identity the body carries from an always-loaded pointer, since it
costs every turn.

### J2. `agents/fx-lens-pipeline.md:74-87`: the ceding list names, one by one, the defects the lens must not report

The fixture's regression signal (`tests/lens-pipeline/README.md:50-54`) fails the
lens if it reports rows 1 to 5. The Ceding rules spell out exactly those five
(head-of-line blocking, missing idempotency, requeue with no dead letter, a
lease shorter than the work, retry with no jitter) plus eight more. fx-authoring
`:185-194`, Negation: steering by prohibition makes the named behaviour more
available; prompt the positive. Scope at `:40-45` already states the positive
form ("Only the hunt group below"). Possible form mismatch; the narrowed lens
has no measured run to settle it either way.

### J3. `skills/fx-review/SKILL.md:91-94`: rewritten lines name stacks in a skill body

ADR 0013 at `:8` binds "The `description` and the body of every agent and every
skill". Its exception at `:17-24` names the four lens files' descriptions. The
fx-review table, whose rows this diff rewrote to add the Mode column, names
Devise, Pundit, JWT, `.erb`, Compose `.kt`, SwiftUI `.swift`, Sidekiq,
ClickHouse and EF in fx-review's body. It mirrors the excepted triggers, so the
reasonable fix is one sentence in ADR 0013 extending the exception to the
mirror, not a rewrite.

### J4. Possible Duplicated Code: the same text in three or four places

- The pipeline lens trigger phrase, verbatim, at
  `agents/fx-lens-pipeline.md:4-6`, `README.md:74` and
  `skills/fx-review/SKILL.md:95`, and in paraphrase at `SURFACE.md:79`.
- The measurement summary and the "keep is provisional" paragraph, at
  `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md:30-52`,
  `tests/lens-pipeline/README.md:26-46` and `tests/lens-pipeline/KEY.md:9-20`.
  ADR 0014 is 82 lines in six sections; `references/vocab/domain-modeling.md:141-150`
  says an ADR can be one to three sentences, with sections only when they add
  value (`:148-151`). ADR 0007 shows the repository tolerates long ADRs.

fx-authoring Pruning 1: one source of truth per meaning. The lens-row
duplication predates the branch; the branch extends it.

### J5. Possible Shotgun Surgery, and one rule stated three different ways

- The report path rule sits in `skills/fx-architecture/SKILL.md:77-81`,
  `skills/fx-architecture/HTML-REPORT.md:24-25`,
  `skills/fx-architecture/COVERAGE.md:34`, ADR 0015 and `skills/fx-audit/SKILL.md`.
  Moving it again means editing all five.
- The ignore check then exclude rule is written three times and does not agree:
  `skills/fx-audit/SKILL.md:80-86` (always the local exclude file, never
  `.gitignore`), `skills/fx-brainstorm/scripts/start-server.sh:209-229` (the same,
  in shell), and `skills/fx-implement/SKILL.md:243-251` (the ignore file, with the
  exclude file only for a new repository). H3 is where the divergence surfaces.

### J6. Possible Mysterious Name: `SESSION_DIR` means different directories in three files

`start-server.sh:159` sets it to the mockup parent under `docs/plans/`.
`server.cjs:106` reads it from `BRAINSTORM_DIR`, the same mockup parent.
`stop-server.sh:10` takes it as its argument and means the state parent under
`.fx/` (its header at `:5-6` says so), which `visual-companion.md:294` supplies
as `$(dirname "$STATE_DIR")`. One name, two directories, across a script pair
that hands paths to each other. Distinct from the carried item about the stop
script and the old single-directory path, though the same confusion invites it.

### J7. Possible Speculative Generality: a delete branch its own header says cannot run

`skills/fx-brainstorm/scripts/stop-server.sh:117-120` keeps
`if [[ "$SESSION_DIR" == /tmp/* ]]; then rm -rf`, while `:5-8` says
start-server.sh no longer uses `/tmp`. The branch exists only to be exempted
twice with `artifact-gate: ok`. Deleting it deletes both markers.

### J8. `scripts/check-artifacts` and `scripts/check-prose`: a redundant pattern and a stretched citation

- `scripts/check-artifacts:19`: `tmpdir` already matches every line `os.tmpdir`
  matches, so that entry adds nothing.
- `scripts/check-artifacts:10-11` and `scripts/check-prose:47-51` cite ADR 0011
  as the reason fx keeps no allowlists. ADR 0011 argues against an inclusion
  list and endorses excluding "what is known not to qualify". An exemption list
  is that exclusion. And `scripts/check-prose:22` keeps a path `EXEMPT` tuple,
  which this branch extends with `.fx/`. The citation claims more than the ADR
  says (PREAMBLE Prose).

### J9. The gate's escape hatch now sits in the always-loaded channel

`PREAMBLE.md:176` carries the exemption token, and `scripts/check-prose:218`
tells whoever reads a failure to add it "anywhere in that paragraph". Every
session and subagent now reads the token next to the rule it exempts, and the
failure message teaches it. The marker is self-declared, which
`scripts/check-prose:42-51` chooses on purpose. Consequence to weigh: an agent
clearing a red prose gate has a one-token route that no reviewer sees unless
they grep for it.

### J10. `skills/fx-brainstorm/scripts/server.cjs:230`: a page-wide claim above a function that controls one element

"Text only: the page renders nothing that makes the browser contact another
host." The comment sits above `brandMarkup`, and holds for the brand markup. The
page also serves agent-written full documents as-is, and the server sends no
content security policy (carried). PREAMBLE Prose, "never claim more than the
thing claims"; narrowing it to "the brand markup is text only" makes it true.

### J11. `skills/fx-architecture/HTML-REPORT.md:16`: "a throwaway local report"

The branch moved this report into `docs/plans/<slug>/` and ADR 0015 at `:36-43`
classes such reports as artifacts a user returns to and commits. The plan
constraint reserves "throwaway" for worktrees and "regenerable" for the
workspace. The sentence sits in a file this diff edited and now contradicts the
record. fx-authoring Pruning 3, sediment.

### J12. `skills/fx-architecture/COVERAGE.md:31-34`: two verdicts per claim, summary not re-tallied

The three restored rows keep K/H, and a new fourth row marks the same three S.
The Summary at `:111-117` still reads "Superseded by an explicit decision | 4"
and "Unaccounted | 0". Low.

### J13. `SURFACE.md:86-88`: "on the same argument", followed by a different argument

The paragraph's argument for `security` and `database` at top tier (`:82-86`)
is cost: they fire rarely, so the extra spend lands only on migrations and auth
changes. The added sentence says `pipeline` is top tier "on the same argument"
and then gives difficulty: "its findings are reasoning problems where a cheap
miss is an incident". It may well be a sound reason; it is not the same one.
PREAMBLE Prose.

### J14. `skills/fx-audit/SKILL.md:137-147`: the explorer brief has no Policy facet

fx-authoring `:313-324`: rules, prohibitions and standards form their own facet,
placed last for recency. The explorer is deliberately given a write tool
(`:134-137`), and its only write limit ("That file is its only write") is
embedded mid-Instruction, with nothing stating it edits no code, which the
Boundary at `:37-40` promises.

### J15. `skills/fx-audit/SKILL.md:201`: a required skill invocation against ADR 0006's consequence

ADR 0006: "Cross-references between skills are pointers, never invocations."
Phase 3 requires a subagent to invoke `fx:fx-architecture`. The design approved
it (`design.md:189`) and fx-audit is user-invoked rather than a lane, so the ADR
arguably does not reach it. One line in ADR 0006 or 0014 saying so would stop a
later reviewer re-litigating it.

### J16. Possible Mysterious Name: ledger-local identifiers and authoring history in shipped files

- "Ruling U" at `tests/lens-pipeline/KEY.md:9` and `tests/lens-pipeline/README.md:4`;
  "Ruling B" at `KEY.md:5` and `README.md:11`; "the round 2 ruling" at
  `README.md:21`; "plan.md's scoping rule" at `scripts/check-artifacts:8`, which
  names no plan. Each needs `docs/plans/2026-09-11-fx-audit/state.md` or
  `plan.md` to decode; `scripts/check-all:5-6` shows the better form by giving
  the path.
- `KEY.md:22-26`, `:57-66` and `:85-100` narrate earlier drafts that were wrong
  and then fixed. fx-authoring `:368` (narrative example) and Pruning 3
  (sediment); the commit log already holds that history.

### J17. The "not X, it was Y" reframe, which no gate checks

PREAMBLE `:173` bans "it's not X, it's Y". Literal instances:
`docs/adr/0015-artifacts-live-in-the-repository.md:22-23` ("temp was not a
choice among several, it was the only place that was not the root"), `:32` ("It
is not: a plan directory and the repository root carry different
expectations"), and `:41` ("This is intentional, not an oversight to clean
up"). PREAMBLE itself uses plain "X, not Y" contrasts ("This is a workflow, not
a wall"), so only the reframing form is counted.

### J18. `references/audit-template.md:199`: a mandatory section named for one kind of extension point

"Add-a-new-provider walkthrough" is required in every audit's `design.md`
(`skills/fx-audit/SKILL.md:254`, "every section of both templates"). A system
with no providers still has to fill it. ADR 0011 and ADR 0013 favour naming the
category ("extension point") over one member. The user asked for it in design
story 14 (`design.md:100`), so the approved design may intend the word; flagged
only so the choice is deliberate.

---

## Checked and not reported

- `agents/fx-lens-pipeline.md:11-12`: read-only tools and a pinned model, both
  as the constraints require.
- `skills/fx-audit/SKILL.md` is 274 lines; `disable-model-invocation: true`
  matches fx-authoring's user-invoked row. Its description is the parked tension.
- `references/audit-template.md` is over 100 lines and has a table of contents;
  its links stay inside the file.
- No manifest change in the diff.
- Inventory counts in `README.md:106-108` and `SURFACE.md:190` match the disk:
  13 skills, 4 commands, 6 agents, 9 lane prompts, 22 reference files.
- Items already in `final-review-carried.md` (temp fixtures, review worktree
  hygiene, CDN assets, the footer string, the performance paragraph, the Mode
  column in fx-implement, the ADR 0008 blank line, the SURFACE Lines column,
  Ruling AA) were seen and not repeated.
