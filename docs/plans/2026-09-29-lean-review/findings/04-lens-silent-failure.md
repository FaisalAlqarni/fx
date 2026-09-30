Lens: silent-failure, 5 findings

1. [Important] `/development/fx/.worktrees/lean-review/lib/plan-state.js:86`: `.slice(0, MAX_RULINGS)` drops every ruling past the tenth, with no marker in the block, no count and no log.
   - Order is `rulings.md` first, then ledgers, in first-seen order. The 11th ruling silently loses to whichever happened to come earlier. Nothing tells the owner or the agent that a ruling exists but is not in force.
   - The ADR records the cap, but the session cannot see it. The agent believes it has the full set, and "these rulings override its defaults" (line 132) is then false for the dropped ones.
   - The same function cuts a line over 160 characters with a `…` (line 87). That mark is visible, but it can remove the `Why:` or a qualifier, so a ruling can reach the agent in a weaker form.
   - A cheap signal would be "N more not shown, see `docs/plans/rulings.md`".

2. [Important] `/development/fx/.worktrees/lean-review/lib/plan-state.js:65-67`: `readText` returns `''` for every failure (EACCES, EISDIR, a bad encoding, a missing file).
   - Legitimately absent `rulings.md` and an unreadable one look identical. An unreadable file means all standing rulings vanish and the session starts with no hint that they exist.
   - The same applies to each ledger read at line 75. Here `scan` already decided `hasState` is true, so an unreadable ledger is a real fault, not an absence.
   - I do not dispute the no-throw rule. The hole is that nothing distinguishes "no rulings" from "rulings not loaded", for example a one-line note in the block or a stderr line when the error is anything other than ENOENT.

3. [Important] `/development/fx/.worktrees/lean-review/lib/plan-state.js:76` and `:83`: the parser accepts exactly one shape and drops everything else without a trace.
   - Only a heading matching `^## Standing rulings` and only lines that start with `Ruling:` after a trim are carried.
   - A `### Standing rulings` heading, a `- Ruling:` bullet or `**Ruling:**` bold is silently not carried.
   - The `fx-implement` skill text tells an LLM to write the ledger by hand, so format drift is likely. A drifted ruling disappears at the next compaction, which is the failure this feature exists to prevent.
   - Nothing reports "a section was found but yielded zero rulings".

4. [Important] `/development/fx/.worktrees/lean-review/lib/plan-state.js:108`: `standingRulings` runs outside any try/catch, which widens the blast radius of a bug there.
   - `scan` is guarded at line 94, but the new call is not. A throw (for example a `plans` entry of unexpected shape) propagates to `/development/fx/.worktrees/lean-review/lib/preamble.js:86`.
   - That catch is deliberate and commented, so the swallow itself is not the finding. The cost is that it discards the whole unfinished-plans block, including the `fx-implement` routing that DEBT #33 was built to deliver, because of a rulings bug. No log is written.
   - Isolating the rulings call would limit the loss to the rulings.
   - This also contradicts the module's header claim of "never throws" (lines 20-21) in practice.

5. [Minor] `/development/fx/.worktrees/lean-review/lib/plan-state.js:94-95`: rulings only travel when at least one unfinished plan exists.
   - If `scan` returns empty, `describePlans` returns null before `standingRulings` is reached. A repo with `docs/plans/rulings.md` but no unfinished plan silently gets no rulings.
   - This may be intended, but it is undocumented in the ADR.
   - Separately, `/development/fx/.worktrees/lean-review/lib/preamble.js:81` skips the block for subagents, so subagents never see the rulings either. That is a design choice and I am not counting it as a finding.

The `catch { /* unreadable state.md still counts as a ledger */ }` at `plan-state.js:50` is a deliberate, commented swallow, so I am not flagging it.
