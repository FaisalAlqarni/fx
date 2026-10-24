### Finding verdicts

All 13 items are ADDRESSED and none are open. Line references are to HEAD. Some shifted when wave 2 committed on top; I cite the current lines.

1. **Codex judge deny and stamp (ruling 453): ADDRESSED.** `src/lib/shell-guard.ts:102` sets `noAsk` for Codex.
   - Low-confidence deny on Codex: at :155 a deny choice is a deny whatever its confidence. That includes a deny that also escalates, which is the stricter reading of the ruling. :162 journals it as deny, and :123 then loop-guards it.
   - Stamp over a confident deny on Codex: the honoured stamp skips the loop guard at :123 and the judge is asked again. If it answers deny, :164 does not soften it and :173 does not touch a deny, so the result is a deny. A stamped ask still softens to warn at :165-170.
   - Claude Code's path is unchanged at :155 and :164.
2. **opencode harness gate and file-tool refusal (ruling 454): ADDRESSED.**
   - Stamp and prompt on opencode: `src/lib/shell-guard.ts:120-121` honours no stamp unless the harness is claude-code or codex, and :133 sends no `user_request` on opencode.
   - Writes into the state and config directories: `src/plugins/fx-opencode-v1.ts:550-556` refuses edit, write and apply_patch there, and refuses every write if the rules fail to load. `src/plugins/fx-opencode-v2.ts:342-350` does the same for the edit permission. See new breakage 2 for a fail-open corner in v2.
3. **Config directory and mock gate (ruling 455): ADDRESSED.**
   - `src/lib/shell-rules.ts:496-500`: `namesFxState` now covers `configDir` and its spelled forms. Claude Code's Write and Codex's apply_patch inherit the check through `namesFxState`.
   - `src/lib/judge-input.ts:64`: the mock backend needs `FX_TEST`, which the helpers set in `src/tests/helpers/hook-env.ts`.
4. **Codex over-long command (ruling 455): ADDRESSED.** Traced with a padded command on Codex: `src/lib/shell-guard.ts:136-141` denies with "The user can run it themselves." and journals deny before any stamp logic, so a stamp cannot get past it. On Claude Code it stays ask and is now also journaled as ask. The ruling did not require that, but it does no harm (see Tests evidence).
5. **Claude Code non-string command (ruling 455): ADDRESSED.** Traced with a numeric command on Claude Code: `src/hooks/fx-pretooluse.ts:179` denies it with the same text as Codex and opencode. The golden `pretooluse-command-number.meta.json` now expects exit 2 and that text.
6. **Codex Stop continuation (ruling 455): ADDRESSED.** Traced with a Codex prompt that carries the sentence: `src/hooks/fx-codex.ts:356` ignores it anywhere in the text. The pattern matches both texts in `src/lib/stop-check.ts:50-51`. `references/harnesses/codex.md:108` states the assumption. The same match was also added to `src/hooks/fx-turn.ts:104` for Claude Code, which the ruling did not ask for (new breakage 4).
7. **Placeholder fills (ruling 455): ADDRESSED for the traced cases.** `src/lib/shell-guard.ts:34,41` rejects `..`, a leading slash, backslash or tilde, a drive letter and a dollar sign. Traced with an absolute test-one argument: `scripts/test-one:10` exits 2 with the usage line. A quoted or backslash-escaped fill still gets through the guard (new breakage 1).
8. **.fx.json trace (ruling 456): ADDRESSED.** `src/lib/shell-guard.ts:89` and :112 now log a repo-command allow. The switched-off allow was already logged at :128.
9. **Codex write_stdin (ruling 457): ADDRESSED.** It is documented at `references/harnesses/codex.md:20-26`, with no code change, as ruled.
10. **Preamble bullet (ruling 458): ADDRESSED.** `PREAMBLE.md:52` carries all three of the ruling's clauses: no rm inside a bash -c string, leave scratch files for a later cleanup, and fx's own commands carry their cleanup in script files. The old "put the cleanup in a script file" advice to agents is gone. The bullet is about 30 characters shorter than before, so the preamble stays inside the 3,400 budget, and the pinned copy in `src/tests/gates/no-rm-in-shell-c.test.ts:16` matches it.
11. **Task 13 assert: ADDRESSED.** `src/tests/gates/shell-guard-claude.test.ts:172`.
12. **Codex loop-guard text: ADDRESSED.** `src/lib/shell-guard.ts:126` now names the stamp. It interacts badly with item 4 (new breakage 3).
13. **ADR, README and INSTALL: ADDRESSED.** `docs/adr/0047-the-judge-is-optional-and-fails-open.md` covers the config directory, the opencode file tools, the mock gate, the Codex deny policy, the over-long deny, the repo-command and switched-off traces with the open owner decision, and the new consequences. README and INSTALL say the stamp softens an ask on Codex, never a judge deny.

### New breakage in the fix diff

1. **Minor: a quoted or escaped fill gets past the placeholder check.**
   - `src/lib/shell-guard.ts:34,41` tests the raw text of the fill, before the shell removes quotes. A fill wrapped in single or double quotes therefore does not start with a slash, a tilde or a drive letter. A fill like `src/\.\./\.\./x` has no two dots next to each other.
   - The shell then passes an absolute or parent path to a repo-command allow, with no judge involved. The same hole already let a quoted option through the option check.
   - fx's own `scripts/test-one` still rejects the path after the shell unquotes it. Other repositories' templates, such as `node {file}`, are not covered.
   - This is low impact, because a file written inside the repository is allowed anyway.
2. **Minor: the opencode 2.x fx-state check can fail open.**
   - `src/plugins/fx-opencode-v2.ts:345-349` swallows every throw in its loop, including one from `namesFxState` itself. On the paths covered by ruling 454 (fail closed), an error lets the edit through.
   - It also iterates a bare-string `resources` value as single characters, so a path given that way is never checked. Using `list()` instead of `iterate()` would check it as one path.
   - The fixer built the swallow to keep the existing pin `object resources` in `src/lib/opencode-malformed.test.ts:87` green, without a ruling on that change.
   - The opencode runtime builds `resources`, not the agent, so this is hard to exploit.
3. **Minor: the Codex loop-guard text now promises a stamp that can never work after an over-long deny.**
   - After an over-long deny (item 4), :126 tells the agent to add a `# fx-ok:` stamp and retry. The over-long check at :136 runs before any stamp handling, so the retry is always denied again.
   - This is the same kind of problem as the judge-deny text that ruling 462 sent to wave 2. The loop-guard text was not sent with it.
4. **Minor: Claude Code now drops a real user prompt that quotes the Stop sentence.**
   - `src/hooks/fx-turn.ts:104` was changed although ruling 455 names only Codex.
   - On Claude Code the Stop reason never arrives as a UserPromptSubmit, so the match has only a cost there. A user who pastes fx's message gets no new turn, no prompt for a stamp to count, and no user request for the judge.

### Tests evidence

I had no shell, so I ran nothing. Everything below comes from reading the diff, and the fixer's RED and GREEN lines are unverified.

- **Claude Code behaviour.** It changed in these places:
  - Item 3: the fx-state refusal text.
  - Item 5: the non-string deny.
  - Item 8: the repo-command log line.
  - Item 10: the preamble.
  - Outside any item: the over-long ask is now journaled. This is harmless, because the over-long return comes before any stamp logic.
  - Outside any item: the Stop-sentence match (new breakage 4).
- **Goldens.** The 13 hook-golden `expected.txt` files and 8 plan-state files differ only in the preamble bullet line. The one `meta.json` change is item 5's.
- **Tests that failed in runs 1 and 2.**
  - Run 1, `shell-guard-claude.test.ts` case 5: the old empty log became one repo-command allow line. Ruling 456 requires that, and the case still checks for no output and no judge request, so it is stricter, not weaker.
  - Run 2, `opencode-malformed.test.ts` (`object resources`): the test was not changed. The code was shaped to keep it passing (new breakage 2). The state.md line saying "both updated" is wrong for this one.
- **Codex gate test.** The test that pinned a warned run after a stamped deny was split in two:
  - a stamped ask gives a warn;
  - a stamped deny exits 2 with the judge-deny text.

  That follows ruling 453 and is stricter.
- **New tests.** The negative repo-command cases are real tests, not vacuous ones: the positive case at the same config proves `.fx.json` is read. The opencode no-prompt test does not assert that the decision request was made; its RED output shows it was.

## Ledger lines

Final fix wave 1 re-review (13 addressed, 0 open: all 13 guard and trust items addressed; commits aaeaabc..beaab4c)
Final: minor (deferred): a quoted or backslash-escaped placeholder fill gets past the out-of-repo check (shell-guard.ts:34,41), so another repo's template can run an absolute or parent path as a repo-command.
Final: minor (deferred): the opencode 2.x fx-state check swallows every throw, including from namesFxState, and splits a bare-string resources value into characters, so those edits stay open; it was shaped to keep opencode-malformed's object resources pin green without a ruling.
Final: minor (deferred): the Codex loop-guard text offers a stamp after an over-long deny, where no stamp can get past the over-long check; pair it with wave 2's judge-deny text item.
Final: minor (deferred): fx-turn.ts:104 drops a Claude Code user prompt that quotes the Stop sentence; ruling 455 named Codex only.
Final: minor (deferred): out of scope, older than this wave: redaction shortens a long single token, so the over-long rule never fires and the judge reads the placeholder while the shell runs the full token (the fixer's own item 4 RED shows it).

I did not run any test or trace anything live. The fixer's RED and GREEN results and the ALL GREEN check-all run are taken from the report without checking them. Wave 2 commits may have moved the HEAD line numbers again after I read them.
