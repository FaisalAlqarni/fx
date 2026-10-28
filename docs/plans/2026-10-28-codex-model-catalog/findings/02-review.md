### Spec Compliance

- ✅ Spec compliant. Checked file by file: src/lib/codex-catalog.ts, lib/codex-catalog.js, both test files all have hunks. Every Behaviour line maps to code: codexHome default (ts:602), top-level key read stops at first `[` line (ts:568-572), slug order and dedupe (ts:605), skipped without calling listModels (ts:607-610), `custom` fallback and name regex (ts:611-612), default listModels with the exact execFileSync options and no --profile (ts:577), ownership with lstat and symlink refusal (ts:581-588, 617-621), no write when all refused (ts:626), JSON.stringify(...,null,1)+"\n", two-line profile, mode 0600 (ts:629-633), CLI exits 0/3/1/2 (ts:640-654).
- Every Tests entry has a matching test (ts test file 362-493). Config bytes asserted in the main test only; other tests do not mutate config.toml except the re-run test, which is spec'd.
- Ruling on live-check substitutes: ran both myself under the run2 scratch home. `--profile fx-openrouter debug prompt-input hello` exit 0, output contains "### How to use skills" (count 1). `-c model_catalog_json=<catalog> debug models` lists exactly [('anthropic/claude-haiku-4.5', True, 'freeform')]. Matches the ruling and the report. The brief's own command is rejected by Codex, as the ruling states.
- ⚠️ Release-version gate (plugin.json still 0.7.0) fails; ruled as a later whole-branch bump. Not checked here.

### Strengths

- RED is honest: new test built against HEAD's lib/codex-catalog.js in a copy, fails with `setupCatalog is not a function`. Runtime RED, valid.
- Ownership is conservative: a directory, a symlink, unparseable JSON, or a markerless catalog all land in `kept`, and the check runs before `listModels` so nothing is written in a partial state.
- chmod after write fixes the existing-file-mode trap; mode asserted for first write.
- Reuses parseFxEnv like plantRoles; no new dependencies.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- src/lib/codex-catalog.ts:590-591 · the profile first-line check splits on `\n` only, so a CRLF-saved profile (marker plus `\r`) is treated as foreign and kept forever · trim a trailing `\r` before comparing.
- src/lib/codex-catalog.test.ts:362-373 · the rewrite path (existing fx file mode, chmod, identical content) is not tested; the re-run test at 420-429 checks slugs only, not the 0600 mode or that two runs give the same files (the Idempotency line) · assert mode and bytes after a second run.
- src/lib/codex-catalog.test.ts:355-358, 477 · temp dirs are never removed (existing tests may do the same, and they sit under the scratch TMPDIR) · add fs.rmSync at the end, as other tests do.
- src/lib/codex-catalog.ts:649-650 · `process.exit` right after `stdout.write`; safe for pipes on Linux, can truncate large output on some platforms · set `process.exitCode` instead.

### Assessment

**Task quality:** Approved
**Reasoning:** Behaviour matches the brief line by line, RED and live check are real (I reran the live substitutes), and ownership logic fails closed. Only polish items remain.

## Ledger lines

Task 02: minor (deferred): profile marker check fails on CRLF-saved profile files, which are then kept forever
Task 02: minor (deferred): rewrite path, 0600 mode on rewrite and two-run idempotency are not asserted in tests
Task 02: minor (deferred): new tests leave temp dirs behind
Task 02: minor (deferred): CLI calls process.exit right after stdout.write instead of setting exitCode
