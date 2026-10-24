# Final review: scoped re-review of the fix wave

### Finding verdicts

1. **U1 no-secrets: ADDRESSED.** `src/lib/edit-rules.ts:28-31` refuses only on `PRIVATE_KEY_BLOCK` or `VENDOR_KEY` (`src/lib/redact.ts:85-86`, one copy shared with `RULES`). All six must-not-refuse lines and both must-refuse cases are in `src/lib/edit-rules.test.ts`. `String.search` ignores the `/g` lastIndex, so sharing the regex is safe. One false positive was already there in the vendor regex and still is: a SpinKit class like `sk-folding-cube` or a JWT spec fixture (`eyJ...`) still refuses.
2. **U6 no-dashes: ADDRESSED.** `builtinBreach` compares dash counts between added and removed text (`edit-rules.ts:28-30`). `removed` comes through to Write, Edit and MultiEdit (`:186-187`), to patches (`extractPatchAdditions` `-` lines) and to opencode. The gate test (case 2b) covers both directions.
3. **U2 LCS: ADDRESSED.** `lineDiff` is at `edit-rules.ts:45-79`. The deviation is right: the fixer's test fails under the old multiset (it drops an equal line elsewhere), while the literal test from the item would have passed without the fix. The CRLF asserts are kept.
4. **U3 order and advice: ADDRESSED.** The sort is at `edit-rules.ts:330`, the unchecked marker at `:360-367` and the advice at `:392-393`. The deviation is right: rules skipped by the request cap were also allowed silently, so giving them advice serves the item's goal ("not silently allowed"). Judge-down and judge-error answers still allow with no advice, which is outside the item.
5. **U4 judge-review: ADDRESSED.** Tripwires filter lockfiles and marker files at `src/lib/judge-review.ts:208`, search does it at `:257,264`, and the cap is at `:184` (`REVIEW_MAX_JOBS = 60`). Jobs past the cap count as `unsure`, so they show up unchecked in each subcommand's own shape (`:218`, `:239`, `:291`).
6. **B2 one predicate: ADDRESSED.** `secretFile` is at `src/lib/shell-rules.ts:611-620` and is used at `edit-rules.ts:337` and `judge-review.ts:208,223,231,233,259`. It covers every listed kind, including `.git/`. Tests were added for `id_ecdsa` and `.p12`.
7. **B3 unhandledRejection: ADDRESSED.** The listener is added at `src/hooks/fx-codex.ts:267-268` and removed with `uncaughtException` at both removal sites (`:350-351` apply_patch, `:381-382` shellGuard). The comment is fixed (`:331-332`). There is a process test under `--unhandled-rejections=warn`.
8. **B4 XDG: ADDRESSED.** The two lines are at `tests/lane-triggering/run-test.sh:83-84`. The deviation is right: row 01 sets no HOME of its own and inherits it from `tests/conformance/run.sh`, so fixing the export there covers every row. Inside the jail, `jail.sh:98-100` clears the environment and does not forward `XDG_STATE_HOME`, so state falls back to the scratch HOME anyway. The new line is harmless.
9. **B1 opencode 2.x judge docs: ADDRESSED.** The sentence is in `INSTALL.md:243,411`, `README.md:243`, ADR 0048:71 and `references/harnesses/opencode-v2.md:46`. The judge-off row matches `src/plugins/fx-opencode-v2.ts:346-349`, and `judge-adr.test.ts` pins both the sentence and the removed phrases. One stale sentence is left (Minor 1).
10. **U5 / B minor 3 notice: ADDRESSED.** opencode 1.x now writes the notice to stderr (`src/plugins/fx-opencode-v1.ts:500`), and the Codex not-measured sentence is at `README.md:205` and ADR 0048:93. Documenting instead of measuring is right: it matches the ledger ruling at `docs/plans/2026-10-24-judge-across-fx/state.md:294`.
11. **U7 STOP_SENTENCE: ADDRESSED.** The one definition is in `src/lib/stop-sentence.ts:5`, which has no imports. `stop-check.ts:40` re-exports it, and all three users import `stop-sentence`. Process tests load a broken `stop-check` on both harnesses.
12. **U8 shell writes: ADDRESSED.** The sentence is at ADR 0048:91 and the test asserts it. Its RED run was not captured on its own; the `git show` count of 0 the fixer gives instead is enough evidence.
13. **U9 READ label: ADDRESSED.** The label is at `references/harnesses/codex.md:50`, the ADR heading is at :65, and `harness-facts.test.ts` pins it.

### New breakage in the fix diff

The three things you asked me to check all hold:

- **The unhandledRejection listener cannot deny an allowed call.** Every path that allows the call removes `crashed` from both events before any allow output. The removals are at `fx-codex.ts:350-351` and `:381-382`, before `emit(...,0)` or `guardShell`. The other exits are synchronous `process.exit(0)` (`:316`, `:364`) or denies. While the Bash edit check is pending, a stray rejection now denies under `warn` too. In Node's default mode that same rejection already became an `uncaughtException` and denied, so only `warn` behaves differently, which is the intended fail-closed. Node emits the event in `none` mode as well.
- **The shell guard's hard rules are unchanged.** `SECRETS` and `readOnly` (`shell-rules.ts:607-608`, `:633`) are untouched; `secretFile` is only added.
- **The LCS diff is bounded in time.** It runs on at most 4,000,000 cells after trimming the shared prefix and suffix (`edit-rules.ts:56`), in a 16 MB `Uint32Array`. One edge case: thousands of equal-length long lines that differ only near the end cost about cells × line length in string compares. That is seconds at worst, not a hang.

The Minors:

1. **Minor: stale ADR line.** ADR 0048:72 still says "If a later opencode stops awaiting it, the plugin falls back to advice only". That reads as automatic. The reworded opencode-v2.md says it only happens if someone sets the `V2_AWAITS_BEFORE` constant to false by hand.
2. **Minor: large-file Write.** When the changed middle of a Write exceeds 4,000,000 cells (about 2,000 lines on each side, for example a Write that touches the first and last line of a 2,001-line file), the whole middle counts as added (`edit-rules.ts:56`). The built-in `no-secrets` and `no-conflict-markers` rules then refuse because of content already on disk. That breaks the gate's case 2 rule ("old breaches on disk never block a clean addition") for large files. The fixer's concern 1 names the fallback but not this refusal.
3. **Minor: broader secret list loses tripwire coverage.** `secretFile` now matches `credentials.*` (for example a code module `credentials.ts` or a view `credentials.html.erb`), `*.env`, and anything under `.ssh/` or `.aws/`. In tripwires, one such file marks every lens unchecked for the whole package (`judge-review.ts:223-224`). The fixer's concern 3 says the broader match "only withholds more from the judge" and misses this.
4. **Minor: new load coupling.** `edit-rules` now statically imports `shell-rules`. If `shell-rules` fails to load, the edit rules fail open and the built-in rules go off with them. On Claude Code, Write and Edit then run with no built-in checks, where before the two modules failed separately.
5. **Minor: silent skips in review.** Tripwires and search drop lockfiles and files with a generated marker, and neither output lists them as unchecked (`judge-review.ts:208,257,264`). A hand-written `DO NOT EDIT` or `@generated` header drops a file from the lens hints with no trace. The fix list did ask for a plain skip.
6. **Minor: more advisory lines.** Every edit whose matching rules go past the request cap (`EDIT_RULE_MAX_REQUESTS` is 3 pairs) now gets an advisory line in both modes. This is the disclosed deviation on item 4.

### Ledger lines

Final review: fix wave (13 addressed, 0 open; commits c363933..e028c3f)
Final review: minor (deferred): ADR 0048:72 says the 2.x plugin "falls back to advice only" by itself; V2_AWAITS_BEFORE is a constant someone must set to false
Final review: minor (deferred): lineDiff past 4,000,000 cells counts the whole middle as added, so no-secrets and no-conflict-markers refuse on content already on disk in a large-file Write (edit-rules.ts:56)
Final review: minor (deferred): secretFile matches credentials.* and *.env code files, and one such file marks every tripwire lens unchecked (judge-review.ts:223)
Final review: minor (deferred): edit-rules now imports shell-rules, so a shell-rules load failure turns off the built-in edit rules
Final review: minor (deferred): tripwires and search skip lockfiles and marker files without listing them unchecked; a hand-written DO NOT EDIT header hides a file from the lens hints
Final review: minor (deferred): rules skipped by the request cap now add an advisory line on every such edit (noise)
