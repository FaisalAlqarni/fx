# Coverage audit: opencode-v2 (2026-10-01, branch opencode-v2 at b5f7630)

Question: does the design commit to any behaviour that no task carries, or that the branch does not deliver? Read-only audit. 4 gaps: 2 Important, 2 Minor.

## Gaps

1. **Important, task 15 (D5). INSTALL.md and baseline.md still say Codex is 16/18; the ledger's final ruling says 18/18.**
   - What: ledger Ruling (after b09e442) records the controller re-run of Codex rows 12 and 17 on `qwen/qwen3.8-27b`: run 1 PASS both, run 2 PASS both, Codex final 18/18. INSTALL.md (committed in b09e442, b5f7630 did not touch it) still says: line 118 "rows 12 and 17 are open there"; table line 550 Codex `16 | 2 (12, 17)`; "Codex rows 12 and 17 are open" bullet (about lines 568-575, "Re-run both on the primary after the free quota resets"); "Stated limitations" first bullet (about line 599). baseline.md "Final" table (lines 133, 140) also shows Codex 16/2 and "Open: re-run on the primary".
   - Why it matters: D5 says "every free row and every live row pass on each". The doc says Codex has two failing rows; the evidence that closes them lives only in state.md and in scratchpad logs (`logs15c`) outside the repo. A reader of INSTALL.md sees a harness that is not fully working.
   - Fix: update INSTALL.md (table row to 18/18 with a note that rows 12 and 17 passed 2 of 2 on `qwen/qwen3.8-27b`, the paid listing, no fallback; remove line 118 and the two "open" bullets) and add a Final addendum to baseline.md with the model, run count and a log path that is kept in the repo or named as outside it, as INSTALL does for `/tmp/fxlogs-opencode-v2-final/`. Also say in INSTALL that the verified Codex rows 12 and 17 were on the paid listing, not the free one.

2. **Important, tasks 05 and 09 (design section 2, section 5). The v2 lane check is delivered but documented nowhere.**
   - What: `plugins/fx-opencode-v2.js:126-137` runs `laneCheck` on `edit` evaluations (project-relative resources resolved, fail open), gate cases cover it (`opencode-v2-plugin.test.js:216-227`) and row 17 passes live on 2.0.18. But the OpenCode 2.x section of INSTALL.md (326-470), `references/harnesses/opencode-v2.md` and ADR-0037 never mention the lane check: what it covers (the `edit` permission action; no probe that `write` and `patch` map to it), that it is advice-class and fails open, or that a first write is refused until a lane marker exists. Design section 2 says "`INSTALL.md` states, per layer, what v2 catches and what it does not" and "If neither layer works, v2 has no lane check and `INSTALL.md` says so"; the reverse (it works) needs stating too. The only "lane check" lines in INSTALL.md are the v1 script route (189) and the Codex limits.
   - Fix: add a short "Lane check on 2.x" paragraph to INSTALL.md, the harness reference and ADR-0037: runs in `permission.evaluate` on `edit`, fails open, resolved against the project directory; state that `write` and `patch` coverage is by the `edit` action and was only exercised by row 17's write.

3. **Minor, task 02 (D6). Two live references to `plugins/fx.js` as a source file.**
   - `AGENTS.md:46` and `.claude/CLAUDE.md:47`: "`plugins/fx.js` - 7 bug fixes ... (bug magnet)". The file no longer exists (`git ls-files plugins` is `fx-opencode-v1.js`, `fx-opencode-v2.js`). D6 asks every doc citing `plugins/fx.js` to be renamed. All other hits are either the installed link name (`INSTALL.md:210,347,380`, `scripts/fx-opencode-install`, ADR-0036, which keep `plugins/fx.js` in the config directory by design) or historical plan docs from earlier builds (leave). `AGENTS.md` carries a check-prose failure that predates this branch, so the edit needs a hand check, not the gate.
   - Fix: point both lines at `plugins/fx-opencode-v1.js` (history carried over by the rename).

4. **Minor, tasks 09 and 15 (D7). INSTALL.md does not say Claude Code is 18/18 from earlier work and only six rows re-ran.**
   - The table line is `Claude Code (rows 01, 02, 06, 07, 08, 16) | 2.1.286 | 6 | 0 | 0`. D7 corrects the stale "2 GAP (13, 14)" (done: no such text remains) but the earlier 18 of 18 (task 21 of the multi-harness plan, rows 13 and 14 closed in `78ff5b3`) is not stated anywhere in INSTALL.md, README or SURFACE, so the six-row line reads as the whole result.
   - Fix: one sentence under the table: the other twelve rows were proven in the earlier build (18 of 18, `78ff5b3`) and their code did not change; these six re-ran because it did.

## Checked and covered

- Dropped v2 `general` subagent grant: consistent in `plugins/fx-opencode-v2.js:199` (comment), `references/harnesses/opencode-v2.md:49-57`, INSTALL.md v2 section ("Nested dispatch on 2.x is yours to allow") and verified notes, ADR-0036 line 26 and 32, runner scratch config (83cb0d7). The remaining "grants `general` `task: allow`" text (INSTALL.md:171, 283-296; SURFACE.md:151) is the 1.x plugin, which still grants; true. No old v2 grant text remains.
- ADR-0037 layers: layer 1 (call-id lookup, every fail-closed path: miss, null source, no session, non-string, throwing or unloadable guard, per-session key, rewritten resources), layer 2 (`opencode-v2-policies.test.js` both directions), layer 3 (failed `evaluate` registration, both-failed preamble line) all have gate cases in `opencode-v2-plugin.test.js`. INSTALL.md section "What the guard catches, per layer" and "does not catch" match ADR-0037, including the `echo | sh` gap and the generic policy text on plain spellings.
- Ruling 11 (user-defined agents see the lanes): stated in INSTALL.md, the reference and ADR-0037; backstop gate case at line 134-140.
- D6: `plugins/fx.js` is gone from the tree; installer, `scripts/test-scope`, `check-all`, ci-pins, README, SURFACE and INSTALL name the scoped files; the installer treats all three names as its own.
- D5 other harnesses: opencode 1.18.25 18/18 (12 on fallback, 2 re-run passes), opencode-v2 2.0.18 18/18, Claude Code 6/6 on Haiku all match INSTALL.md, baseline.md Final and the ledger. `tests/conformance/expected-gaps` holds no live rows (Codex 13 and 14 closed live, 5f12321). Version 0.2.5 in all three manifests.
- D7 scope: rows 01, 02, 06, 07, 08, 16 only, on `anthropic/claude-haiku-4.5`, no fallback; stale "2 GAP" text removed.
- Codex default `max_depth` limit, v2 headless question-tool deny, and plain-spelling policy text are in INSTALL.md.

## Not checked

- No live run. D5's per-harness "install test" result is not in INSTALL.md; it is carried by the `check-all` line in the ledger (all green apart from two pre-existing prose checks and a PATH-order note for `conformance-free-opencode-v2`), which I did not re-run.
- Nothing probes `write` and `patch` under the v2 `edit` action (gap 2).
