### Finding verdicts

- **Critical: `await ctx.command.list()` in setup never resolves on 2.0.18, so commands and later hooks never register**: ADDRESSED. `plugins/fx-opencode-v2.js` no longer references `command.list` (grep of 717b35b: only the comment at ~line 210). Order is now permission.evaluate (l.88), tool.execute.before (l.155), tool.execute.after (l.168), session.context (l.171), agent.transform (l.183), command.transform (l.213).
- **Ruling: guard hooks register first**: ADDRESSED. Nothing is awaited before `ctx.permission.hook('evaluate')` except the `attempt` wrapper; the only await in setup ahead of the guard is the guard's own registration call. before/after follow directly.
- **Ruling: no unbounded await on a runtime list in setup**: ADDRESSED. No list call remains. Remaining awaits are registration calls (`hook`, `transform`) only; the guard ones were proven live on 2.0.18.
- **Ruling: gate cases for never-resolving and throwing command.list**: ADDRESSED. `tests/gates/opencode-v2-plugin.test.js` (new "fix round 2" block) races setup against 1.5 s for both stubs and asserts evaluate/before/after/context hooks, agents and commands present. Note: the gate proves setup never calls list; it would also pass if a hung `ctx.permission.hook`/`session.hook` stalled, since no stub hangs a registration (see Minor below).
- **Ruling: real-binary proof (v2 free rows, live guard refusal)**: ADDRESSED on the report's evidence. Report shows `opencode-v2: 6 pass, 0 fail, 0 gap` and a live `git push --force` shell refusal with the guard message on 2.0.18. Claims unverified by re-run per template; consistent with the diff.

### New breakage in the fix diff

- Minor: a registration call that hangs (not list) would still stall later hooks, sequentially (before/after wait on evaluate's registration; context/agent/command wait on all). No gate covers a never-resolving `permission.hook`. Not a regression: same exposure as before, and the registration was observed to work live. plugins/fx-opencode-v2.js:88-168.
- Minor: fx commands are now always added; a user's same-named file command may be shadowed or may shadow fx's depending on transform order, which the implementer did not probe (report says so). plugins/fx-opencode-v2.js:213-233.
- Earlier fixes kept: failure lines still reach the preamble (`failures` read lazily in the context hook, now registered after the guard: l.171-181); fail-closed guard fallback unchanged (catch at the skill/edit branch, guardError path); read-only enforcement block unchanged at the top of the evaluate hook; call key still `callKey(sessionID, messageID, id)` in before/after/evaluate. The diff body moves code only, plus removing the `held` dedupe. Test edit swapped `command.list` throw to `command.transform` throw to keep the round-1 case meaningful.

### Out-of-scope observations

- None beyond the two Minor items above.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 04: fix round 2/5 (1 addressed, 0 open; commits 5790b9b..717b35b)
Task 04: minor (deferred): no gate for a never-resolving permission.hook/tool.hook registration; later hooks would stall sequentially
Task 04: minor (deferred): fx commands always added; precedence versus a user's same-named file command unprobed
