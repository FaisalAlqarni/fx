# Final branch review: codex-catalog (ce1fb19..94d7869)

Mode: branch, with a ledger. Passes: broad (most capable), unprimed devil's advocate (sonnet), fx-lens-silent-failure (sonnet, never fired on a task), fx-lens-security (sonnet, branch trigger outside task 05). No other lens qualified; none folded.

Settled and not reported: the release-version gate (version bump after this review); Codex 0.164 rejecting `codex --profile <p> debug models`; heredoc writes unseen for Anthropic models on OpenRouter (owner accepted 2026-10-28); G5 and G6 parked.

## Evidence run by the reviewer

Under `scripts/scratch-env` with TMPDIR, HOME and npm cache in `/tmp/claude-1000/fx-codex/tests/`: `lib/codex-catalog.test.js`, `lib/preamble.test.js`, `lib/preamble-equivalence.test.js`, `tests/gates/fx-setup-root-check.test.js`, `tests/conformance/openrouter.test.js`, `tests/gates/shell-guard-codex.test.js`, `tests/gates/harness-facts.test.js`, `tests/gates/skill-size.test.js`, and `scripts/check-generated`, `check-prose`, `check-tool-names`, `check-types`, `check-ts-escapes`: all exit 0. Full `scripts/check-all` and the live conformance rows were not run.

## Strengths

- `setupCatalog` keeps to the constraint that fx never touches `config.toml`: it reads it and writes only `fx-<provider>.config.toml` and `fx-<provider>.catalog.json`, with an `lstat` ownership check that leaves symlinks and unmarked files as `kept` (`src/lib/codex-catalog.ts:142-146`).
- The provider name is checked against `^[A-Za-z0-9_-]+$` before it reaches a file name or the printed command (`src/lib/codex-catalog.ts:137`); slugs stay data in JSON.
- The `{{ORDER}}` slot leaves the Claude Code, opencode and opencode-v2 renders byte-identical; the equivalence fixtures prove it.
- `live.sh:261-267` withholds generator output that holds the key and scrubs the scratch home on the failure path.
- `references/harnesses/codex.md:35` records that `--profile` is rejected for `debug models`, so the ruled substitute is documented.

## Broad pass

### Critical

None.

### Important

1. **[Important] `src/lib/codex-catalog.ts:81`: `readConfig` misreads valid TOML and then reports a false reason.** It accepts only a column-0 `model = "x"` or `model_provider = "x"` with double quotes before the first `[`. A literal string (`model_provider = 'openrouter'`) or an indented key reads as null, and setup returns `skipped: 'no third-party model in config.toml and no slug named'` (`:132`). The user is told there is no third-party model when there is one, and the feature does nothing. Also raised by the silent-failure lens and the devil's advocate. Fix: accept single-quoted values and leading whitespace in the regex, and add a test for each.

### Minor

2. **[Minor] `src/lib/codex-catalog.ts:88`: `codex debug models` runs with no timeout.** It refreshes from the provider; a hung provider hangs fx-setup and the live row setup at `tests/conformance/lib/live.sh:261`, which has no `timeout` wrapper while the session call has `timeout 900`. Add a `timeout` to `execFileSync`.
3. **[Minor] `src/lib/codex-catalog.ts:89`: the `models` field is not checked.** A changed Codex output shape fails at `:31` as "entries is not iterable", with no hint that it came from `codex debug models`.
4. **[Minor] `src/lib/codex-catalog.ts:154-158` with `:117-123`: the rewrite is not atomic, and a torn catalog locks itself out.** A cut-short write leaves invalid JSON; the next run reads it as not fx-owned and lists it in `kept`, naming the user as owner. Write to a temp file in the same directory and rename.
5. **[Minor] `commands/fx-setup.md:290` and `:332-333` (`skills/fx-setup/SKILL.md:293`): an error after a partial write is reported as "nothing written".** The catch turns any throw into `catalog.error`; if the profile write or a chmod fails after the catalog write, the catalog is on disk while the report says nothing was written.
6. **[Minor] `src/lib/codex-catalog.ts:151`: a profile is written when the config model is refused but a named slug builds.** Under that profile the user's own model loses its metadata. The report lists `refused` but the fx-setup report text does not say the configured model is not covered.
7. **[Minor] `src/lib/codex-catalog.ts:133`: `left` is computed only on the skip path.** After a provider change, a successful run writes `fx-<new>` and leaves `fx-<old>.*` unreported, so coverage gap G2 (story 10) is closed only for the skip case.
8. **[Minor] `src/lib/codex-catalog.ts:142-158`: check then write, without `O_NOFOLLOW`.** A symlink swapped in between `lstat` and `writeFileSync`/`chmodSync` would redirect the write. Needs write access to `CODEX_HOME`, which already implies the same user. From the security lens.
9. **[Minor] `src/lib/codex-catalog.ts:153`: `mkdirSync` sets no mode**, so a newly created `CODEX_HOME` is umask default (typically 0755). Hardening only. From the security lens.
10. **[Minor] `commands/fx-setup.md:334` (`skills/fx-setup/SKILL.md:337`): the `FX_CODEX_SLUGS` instruction does not say to single-quote the value.** The agent builds the shell command from user-named text; an unquoted command substitution or `;` runs as shell with the user's own rights. Add "single-quoted". From the security lens.
11. **[Minor] `tests/conformance/lib/live.sh:127`: `key_jail` drops the last `JAIL` element assuming it is `--`.** Two callers now share that assumption; assert it.
12. **[Minor] `src/lib/preamble.ts:31-37`: the per-harness table comment now sits above `ROOT` and `ORDER_DEFAULT`, which it does not describe.** Move the two constants below the comment's subject or above the comment.

Not findings, checked: the live row failing on CLI exit 3 (devil's advocate item 4) cannot happen with a benign cause under the runner, since the runner writes a third-party `config.toml` into a fresh scratch home, so exit 3 there means `kept` or all refused, both real anomalies. The profile name `fx-openrouter` at `live.sh:346` matches `model_provider = "openrouter"` in `tests/conformance/lib/openrouter.js:76`.

## Lens: security

3 findings, all Minor, folded above as items 8, 9 and 10. Generator output in the `live.sh` fail message: closed. The text is withheld when `leaks` finds `sk-or-` or the exact key (`tests/conformance/lib/openrouter.js:228,284`); only a masked or truncated echo would pass, and that is not a usable key. `FX_CODEX_SLUGS` never reaches a shell, a file name or a TOML value inside the command; file modes are 0600 on write and rewrite.

## Lens: silent-failure

5 findings: 3 Important and 2 Minor as the lens graded them. After verification: `readConfig` stays Important (item 1). The catch at `fx-setup.md:290` and the torn-catalog lockout are downgraded to Minor (items 5 and 4): each needs a failed write mid-run, and both still surface a message. The unchecked `models` shape is item 3. The cloned typo slug is a documented design choice, reported as `cloned`, and is not a finding. On the deferred items the lens recommends keeping both deferred (`live.sh:265` scrub status; `process.exit` after `stdout.write`, since Node writes pipes synchronously on Linux).

## Unprimed adversarial pass

10 findings. Verified and folded: items 1 (readConfig), 2 (timeout), 3 (models shape), 4 (non-atomic rewrite), 6 (refused config model), 7 (stale profile only on skip), 11 (key_jail), 12 (stale comment). Not a finding: live row exit 3 (see above). Slug validation: covered by the documented `cloned` report. The Windows path separator note in `preamble.ts:84-86` is dropped: the Codex render runs where the plugin is installed, and no Windows Codex target is in scope.

## Spec compliance

- Plan aligned. Stories 1 to 10 have carriers; Global Constraints hold (no `config.toml` write, other renders byte-identical, nothing above the imperative, no new shell write parsing, key only through `with-key.sh`, no dashes in shipped text per check-prose).
- Partial: story 10 and G2. A rewrite after a model change is implemented but untested (carried Task 02 minor), and a stale profile after a provider change is not named (item 7).
- Cannot verify from the diff: the paid proof protocol (arms A0, A1, A3, R1, R2) has not been run; the design makes it the only seam that shows the behaviour change.

## Carried findings triage

| Ledger line | Ruling | Reason |
|---|---|---|
| Task 01: em and en dash characters in codex-catalog.test.ts:94 | closed | Line 94 now uses `\u` escapes for both characters. |
| Task 01: THIRD_PARTY_NOTICES.md Codex row lacks copyright and licence file | **must fix** | fx ships vendored Apache-2.0 text (`codex/fallback-model-info.json`); Apache-2.0 section 4(a) and (c) require the licence copy and retained notices. Add the OpenAI copyright line and a licence file under `references/vendor/`, as the bundles section does. |
| Task 01: `# Skills` regex misses CRLF or trailing space | defer | Templates come from Codex's own Rust sources with LF; a CRLF template is not observed. |
| Task 03: Codex assertions after the OK log line | defer | Misleading output only; the test still exits non-zero on failure. |
| Task 03: 3,700 cap loosens non-Codex harnesses | defer | Non-Codex renders are pinned byte-identical by the equivalence fixtures, so their growth is caught there. |
| Task 03: RED stopped at the first assertion | defer | Process note; the assertions pass now and are not tautological. |
| Task 03: Codex cap margin for a long install path | defer | Comment only. |
| Task 02: CRLF profile marker | defer | Only fx writes that file; a CRLF-saved copy is reported as `kept`, which is visible. |
| Task 02: rewrite path, 0600 on rewrite and two-run idempotency untested | **must fix** | Story 10 and the ownership constraint's rewrite branch have no test; the first-write test is the only one (`src/lib/codex-catalog.test.ts:111-124`). One test: run twice with a changed model, assert content and 0600. |
| Task 02: tests leave temp dirs | defer | Under the scratch TMPDIR. |
| Task 02: process.exit after stdout.write | defer | Node writes pipes synchronously on Linux (silent-failure lens agrees). |
| Task 04: setupCatalog called with no slugs | closed | Task 07 passes `FX_CODEX_SLUGS` (`commands/fx-setup.md:290`). |
| Task 04: no root-check test for kept or refused output | defer | Report wording is asserted (`src/tests/gates/fx-setup-root-check.test.ts:128`); kept and refused are unit-tested. |
| Task 05: generator output in the fail message (live.sh:261) | closed | The security lens confirmed the `leaks` check withholds text holding the key. |
| Task 05: openrouter.test.ts:34 substring check | defer | Test brittleness only. |
| Task 05: no scrub after a failed catalog setup | closed | `live.sh:265` now scrubs. |
| Task 05: live_workdir replaces the EXIT trap | defer | No leak; fragility only. |
| Task 05: live.sh:265 scrub exit status ignored | defer | The row fails right after and the scratch home is removed. |
| Task 06: index rows "current, amended by 0065" | defer | Wording consistency; no gate. |
| Task 06: codex.md heredoc limit lacks the acceptance date | defer | ADR 0065 carries it and codex.md points there. |
| Task 07: no test for a marker-carrying symlink fx-*.config.toml | defer | `isRegular` excludes symlinks; low risk. |
| Task 03: hook-env.ts rootToToken comment says "swap the real path in" | defer | Wrong comment, trivial; fix with item 12 if convenient. |
| G5 parked | stays parked | Ruled. |
| G6 parked | stays parked | Ruled. |

**Deferred minors that must be fixed before merge: 2.**

1. Task 01: THIRD_PARTY_NOTICES.md Apache-2.0 copyright line and licence file for `codex/fallback-model-info.json`.
2. Task 02: test the rewrite path (owned files rewritten after a model change), 0600 on rewrite, and two-run idempotency.

## Recommendations

- Fix item 1 and the two carried must-fixes in one wave before the version bump; items 2, 4, 7 and 10 are a few lines each and worth taking in the same wave.
- Run the design's proof protocol after the exit gate; nothing in this branch's tests shows the behaviour change.

## Assessment

**Ready to merge?** With fixes.
**Reasoning:** No Critical; one Important (`readConfig` silently disables the feature with a false reason on valid TOML) and two carried minors that must be fixed: an Apache-2.0 attribution gap on shipped vendored text and an untested rewrite path that story 10 depends on.

Totals per pass: broad 1 Important, 11 Minor (includes lens and devil's advocate findings after verification); security lens 3 Minor; silent-failure lens 5 as graded, 1 Important and 3 Minor after verification; devil's advocate 10, 8 kept.

## Ledger lines

Task 02: minor (deferred): codex debug models runs with no timeout (codex-catalog.ts:88)
Task 02: minor (deferred): models field of codex debug models output unchecked (codex-catalog.ts:89)
Task 02: minor (deferred): non-atomic rewrite; a torn catalog is then reported as kept (codex-catalog.ts:154-158, 117-123)
Task 04: minor (deferred): catalog.error after a partial write is reported as nothing written (fx-setup.md:290, 332-333)
Task 07: minor (deferred): profile written when the config model is refused but a named slug builds (codex-catalog.ts:151)
Task 07: minor (deferred): left profiles named only on the skip path, not after a provider change (codex-catalog.ts:133)
Task 02: minor (deferred): check then write without O_NOFOLLOW in CODEX_HOME (codex-catalog.ts:142-158)
Task 02: minor (deferred): mkdirSync of CODEX_HOME sets no mode (codex-catalog.ts:153)
Task 07: minor (deferred): FX_CODEX_SLUGS instruction does not say to single-quote the value (fx-setup.md:334)
Task 05: minor (deferred): key_jail drops the last JAIL element without asserting it is -- (live.sh:127)
Task 03: minor (deferred): preamble.ts per-harness comment now sits above unrelated ROOT and ORDER_DEFAULT (preamble.ts:31-37)
