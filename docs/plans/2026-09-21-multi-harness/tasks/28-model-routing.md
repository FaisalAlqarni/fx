# 28: Model routing that a controller cannot quietly skip

**Status:** ready-for-agent
**Blocked by:** 27
**Phase:** Amendment 2

**What to build:** fx already tells a controller to pick the least powerful model
that fits (`references/vocab/model-selection.md`). In this build the controller
ignored that guidance and dispatched the most capable model for nearly every
implementer, reviewer and research agent. It also left Opus agents babysitting
live runs, and each of those woke many times with a large context. The user's
usage report showed the cost. Make the guidance concrete and harder to skip.
This applies to Claude Code only for now. Codex and opencode keep the generic
tiers until their model mapping is decided.

1. **Name the tiers for Claude Code.** In `references/harnesses/claude-code.md`,
   map cheapest to Haiku, standard to Sonnet, and most capable to Opus. Name the
   Agent tool's `model` values there. That is the harness layer, so naming
   tools is allowed. Skills and `model-selection.md` stay generic.
2. **Default and justification.** In `model-selection.md`:
   - The default for an implementer, reviewer, lens, research agent or audit is
     the standard tier.
   - The most capable tier needs a one-line reason, written in the dispatch and
     in the ledger.
   - Name what qualifies: security-critical code or review (guards, classifiers,
     permission models), design or spike analysis, the red team, fix rounds 4
     and 5, and the final branch review.
3. **Cheapest-tier safety rule.** Never use the cheapest tier for anything with
   side effects outside the worktree: live runs, credential copies, runs with
   permissions bypassed, deletes, or `git` history changes. Use it only for
   read-only lookups, and for small edits where the task file already carries
   the tests. Reason: agents in this build broke delete and worktree rules
   even on stronger models.
4. **Babysitter rule.** An agent that waits on long-running commands uses the
   standard tier. It launches one tracked command that ends when the whole
   queue ends, so it wakes once, not on every step. Each wake re-reads its
   full context.
5. **Templates.** In `skills/fx-implement/implementer-prompt.md`,
   `task-reviewer-prompt.md`, and any other template that has a `model:`
   placeholder, change the placeholder text to: "default: standard tier; the
   most capable tier only with a stated reason (see model-selection.md)".
   Point the existing `SKILL.md` "Model selection" section at the new default.

**Files:**
- Modify: `references/vocab/model-selection.md`
- Modify: `references/harnesses/claude-code.md`
- Modify: `skills/fx-implement/SKILL.md` (the Model selection section)
- Modify: `skills/fx-implement/implementer-prompt.md` and
  `skills/fx-implement/task-reviewer-prompt.md`
- Modify: any other `model:` placeholder in skills or references, found by grep
- Modify: generated files, regenerated

**Seam:** text plus the existing gates: check-prose, check-tool-names
(`references/harnesses/` is allowed to name tools), and
no-runtime-addressing.

**Idempotency:** file edits.

## Acceptance criteria
- [ ] `references/harnesses/claude-code.md` maps the three tiers to Haiku, Sonnet and Opus by their Agent tool `model` values
- [ ] `model-selection.md` states the standard-tier default, the list of work that qualifies for the most capable tier, the stated-reason rule, the cheapest-tier safety rule and the babysitter rule
- [ ] Every `model:` placeholder in fx templates carries the default and the reason rule
- [ ] No skill body names a model or tool; only the harness reference does. `scripts/check-tool-names` passes
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps
- [ ] **1. Edit per items 1 to 5.**
- [ ] **2. Run the full gate.** Then commit by path, with no attribution trailers.
