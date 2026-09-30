# 11: README, full gate and live routing probe

**Status:** ready-for-agent
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10
**Phase:** Verify

**What to build:** the README describes the pipeline as it now runs and says, with measured numbers and their limits, what a build cost before this change. The full gate runs once on the finished branch. One live probe on Claude Code shows that the routing hook sets the model a subagent actually runs on.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the lens table from task 01, the rules from tasks 02 to 06, the INSTALL results from task 10, and `docs/plans/2026-09-29-lean-review/measure/fx-cost.py`.
- Produces: nothing other tasks read.

**Seam:** the README text; `scripts/check-all`; a subagent transcript's `message.model`.

**Risks:** every number in the README comes from `design.md` §Problem, which cites `fx-cost.py` output and one `/usage` report; copy them, do not recompute or round differently. The probe spends a small amount of model quota: three one-line subagent calls.

**Idempotency:** README edits are replacements of named sections; the probe runs in a fresh temp directory and only reads transcripts.

**Testing:** `scripts/check-all` (the one full run in this build); the live probe.

## Acceptance criteria
- [ ] The pipeline diagram's per-task block shows the task reviewer plus tripwire lenses, the fix loop's controller re-review, and no baseline suite; the final block shows every lens plus devil's advocate and the one `test_all` with failure classification. The fx-brainstorm block names the confidence check.
- [ ] The lens table matches task 01's columns, and the sentence under it says which lenses fire per task and on what.
- [ ] A new section "What a build costs" carries the §Problem table from `design.md` verbatim in its numbers, the method, the caveats, and the sentence that the new defaults have not been measured on a build yet.
- [ ] "Always on" names the routing hook (Claude Code only; Codex and opencode deferred, ADR-0031) and the companions line with its `.fx.json` override.
- [ ] "Install" says opencode is measured on 1.18.25 and 2.0.18.
- [ ] `scripts/check-all` prints `ALL GREEN`.
- [ ] The probe shows: a general dispatch with no model ran on a Sonnet model; an Opus dispatch without the reason line ran on Sonnet; an Opus dispatch with `Capable because:` ran on Opus. The three model ids are recorded in the commit message body.

## Steps

- [ ] **1. Invoke the `fx-humanize` lane** for the README prose.

- [ ] **2. Pipeline diagram** (`## How the pipeline runs`). In the fx-brainstorm block, after `clustered question rounds + open-questions ledger`, add a line `confidence check: what made it 95% sure, 2-line plan, wait for go`. Replace the per-task block (from `+--> per task, serial, fresh subagent each time` through `every round ends in a scoped re-review`) with:

```
        +--> per task, serial, fresh subagent each time
        |      |
        |      +--> fx-tdd .......... Iron Law, RED verified, GREEN, commit
        |      |                      test_scope on the touched paths only
        |      +--> task review ..... spec compliance + code quality
        |      +--> tripwires ....... security, database, silent-failure,
        |      |                      each only when its narrow trigger matches
        |      |
        |      +--> fix loop ........ Important+ only, max 5 rounds; a fix of
        |                             20 production lines or fewer is re-read
        |                             by the controller, larger ones re-reviewed
```

Replace the final block (from `+--> final: fx-review (branch mode)` through `plus fx-devils-advocate (code mode), unprimed, once per branch`) with:

```
        +--> final: fx-review (branch mode)
        |      all axes, every lens on its broad trigger, reviewer-prompt.md
        |      plus fx-devils-advocate (code mode), unprimed, once per branch
        |
        +--> exit gate: test_all once; each failure run alone on the
        |      branch and the merge base: pre-existing, introduced, order-dependent
```

- [ ] **3. Lens section** (`### What the lenses are, and when they fire`). Replace the table and the sentence under it with task 01's three columns (Lens, Per task, Branch pass), using short forms of the tripwires, and: `Per task, only security, database and silent-failure fire, and only on their tripwire. At the branch review every lens fires on its broad trigger, alongside devil's advocate.`

- [ ] **4. Add `## What a build costs`** after the lens section, before `### Always on, underneath all of it`. Content, in this order: one paragraph saying where the numbers come from (the owner's build on advantage-backend, 2026-09-21 to 2026-09-28, 728 subagent transcripts from two sessions, classified by `docs/plans/2026-09-29-lean-review/measure/fx-cost.py`); the table from `design.md` §Problem exactly; the caveats (agent-minutes run first to last timestamp so idle waits count and parallel agents overlap, so they are upper bounds and not wall-clock; roles are classified by dispatch description; one session's `/usage` report showed $383.95 with Opus $374.94 and general-purpose subagents 54% of usage); what changed in response (point at ADRs 0029 to 0032); and the sentence: `These are the numbers before the change. The new defaults have not been measured on a build yet; this section will carry that measurement when it exists.`

- [ ] **5. "Always on"** section: under the guard and lane-check list, add:

```
dispatch routing, Claude Code only:
   hooks/fx-pretooluse.js   Agent calls: no model on a general dispatch -> sonnet;
      + lib/dispatch-route.js   opus without "Capable because:" -> sonnet; never refuses
   Codex and opencode: deferred (docs/adr/0031)
```

and a paragraph after the `PREAMBLE.md` size paragraph: the companions line (what it names, that a missing tool is skipped, `.fx.json` `companions` to replace it or `""` to turn it off, that it sits outside the bootstrap).

- [ ] **6. Install section**: after the opencode install line, add `fx is measured on opencode 1.18.25 and 2.0.18 (\`INSTALL.md\`, "What is verified").`

- [ ] **7. Check the README**

Run: `scripts/check-prose README.md && scripts/check-paths`
Expected: both pass.

- [ ] **8. The full gate, once**

Run: `scripts/check-all`
Expected: `ALL GREEN`. On a failure, report the failing gate and its output; fix only if the cause is in this task's README edit, otherwise report it as a finding against the task that owns the file.

- [ ] **9. Live routing probe.** From the worktree root:

```
FX="$(git rev-parse --show-toplevel)"; P="$(mktemp -d)"; cd "$P"
claude -p --plugin-dir "$FX" --output-format json \
  "Use the Agent tool once: subagent_type general-purpose, description 'probe one', prompt 'Reply with the word OK.' Do not set a model." > one.json
claude -p --plugin-dir "$FX" --output-format json \
  "Use the Agent tool once: subagent_type general-purpose, model opus, description 'probe two', prompt 'Reply with the word OK.'" > two.json
claude -p --plugin-dir "$FX" --output-format json \
  "Use the Agent tool once: subagent_type general-purpose, model opus, description 'probe three', prompt 'Capable because: routing probe\nReply with the word OK.'" > three.json
for f in one two three; do
  sid=$(jq -r .session_id $f.json)
  find ~/.claude/projects -path "*$sid*/subagents/*.jsonl" -exec jq -r 'select(.message.model) | .message.model' {} \; | sort -u | sed "s/^/$f: /"
done
```

Expected: `one:` and `two:` print a `claude-sonnet-*` id; `three:` prints a `claude-opus-*` id. If a transcript is not found under that path, find it with `grep -rl "$sid" ~/.claude/projects --include='*.jsonl'` and read `message.model` from the subagent file. Any other result is a FAIL: report it with the three outputs; do not change the hook in this task.

- [ ] **10. Commit**

```
git add README.md
git commit -m "docs(readme): lean-review pipeline, measured build cost, routing" -m "Routing probe: one=<model id>, two=<model id>, three=<model id>"
```

with the three real model ids.
