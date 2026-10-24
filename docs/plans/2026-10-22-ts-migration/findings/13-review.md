# Task 13 review

### Spec Compliance

Verified at source and by running the code at 0624601.

- Gate (`scripts/check-handwritten-js`): scans `git ls-files -z` for `.js`, `.cjs`, `.mjs` and extensionless files whose first line is `#!/usr/bin/env node`. Accepts the header on line 1 or line 2 after a shebang. Prints the exact OK and FAIL strings from the brief. On this repo it prints `check-handwritten-js: OK (115 files)`, which is 112 `.js` files plus the three extensionless scripts, so it does not pass by scanning nothing. The zero-scan case fails with `FAIL: no JavaScript file scanned`.
- Stale-output ruling: a headed file whose named `src/` source is missing fails, and the gate test has the case.
- Allowlist: exactly the nine entries in the brief, no `tests/fixture-build/repo/**`. A gate test asserts that path is caught. `git ls-files` shows no JavaScript under that path anyway.
- Gate test covers every case in the brief, plus `.cjs`, `.mjs`, shebang header, bash script not reported, and stale source. It passes (exit 0).
- `scripts/check-all` runs the gate and its test.
- Six ports: compared each with `git show ab2afb3:` using `diff -w`. Every difference is typing, imports, or one of the deviations the report names. No assert dropped or weakened. The `SENTINEL_${k}_VALUE` change in score.test.ts is equivalent to the old `values[k]` (same sentinel string).
- ADR 0046 gains a final line marking the migration complete with the date.
- Not re-run: the clean clone, `scripts/check-all`, and the six mutation checks. Taken from the report. ⚠️

### Strengths

- The gate test drives the real script and the real allowlist in scratch git repos, so an allowlist that grew or broke would show up.
- The glob match uses `[[ $f == $p ]]` on a repo-relative path, so `**` and `*` entries match as the allowlist reads. A path with a space is handled (`-z`, quoted). An allowlist ending in a comment line does not trip `set -e`; I ran that case.
- Ports keep the assert text and expected values byte for byte; typed consts replace `as` casts, and each `JSON.parse` carries `ts-gate-ok`.

### Issues

#### Critical

None.

#### Important

None.

#### Minor

- scripts/check-handwritten-js:4-5 · the header comment ends with a dangling fragment, `docs/adr/0046-fx-sources-are-typescript.md.`, with no verb · reads as a broken sentence · write "See docs/adr/0046-fx-sources-are-typescript.md."
- docs/adr/0046-fx-sources-are-typescript.md:21 · the status line sits after the Consequences paragraph; ADR 0033 carries `Status:` at line 3 · a reader or a tool looking at the top of the ADR misses the status · move it under the title or note why the end is intended.
- tests/gates/check-handwritten-js.test.sh:44 · `grep -q 'tool' <<<"$out"` is a loose substring check that would also fire on any message containing "tool" · fragile if message text changes · use `grep -qF 'FAIL: tool '`.
- tests/gates/check-handwritten-js.test.sh:20-24 · the vendored-glob entries (`mermaid-*.min.js`, `tailwindcss-play-*.js`) have no case; only the `good/**` entry is exercised · a typo in a vendor entry passes the test and fails only on the repo run · add one case with a `references/vendor/tailwindcss-play-x.js` file.
- src/tests/review-bench/build-case.test.ts:71 · the new up-front throw changes failure mode (old code failed inside the test callbacks) · harmless, the report names it · none needed.

### Assessment

Spec met. The ports are faithful, the gate is real (scans 115 files, catches the extensionless, stale and non-fixture cases), and the allowlist matches the brief. Only polish items remain. Ready to proceed.

## Ledger lines

Task 13: minor (deferred): check-handwritten-js header comment ends in a dangling ADR path fragment.
Task 13: minor (deferred): ADR 0046 status line is at the end, ADR 0033 puts it at line 3.
Task 13: minor (deferred): gate test greps the loose substring 'tool' to prove a bash script is not reported.
Task 13: minor (deferred): gate test has no case for the vendored Mermaid or Tailwind allowlist globs.
Task 13: minor (deferred): build-case.test.ts adds an up-front throw that changes the failure mode on a missing test file.
