### Finding verdicts

- **Item 1, readConfig single quotes and indentation (Important)**: ADDRESSED. `src/lib/codex-catalog.ts` now matches `^\s*(model|model_provider)\s*=\s*(?:"..."|'...')` and stops at `^\s*\[`; `lib/codex-catalog.js` carries the same regex. The new test runs a single-quoted config and an indented, tab-indented one and asserts `skipped === null`, provider, slugs and profile. The report shows a RED with the original `no third-party model` message.
- **Carried Task 01, Apache-2.0 copyright and licence file**: ADDRESSED. `THIRD_PARTY_NOTICES.md` Codex row now has "Copyright 2025 OpenAI" and a licence file column pointing at `codex/LICENSE`, which holds the full Apache-2.0 text with the copyright line on top. Location in `codex/` beside the data file satisfies section 4(a) (the copy travels with the shipped data); the notices file explains why `references/vendor/` was not used (visual-kit gate). Accepted. The copyright line matches the upstream NOTICE per the controller.
- **Carried Task 02, rewrite path, 0600 after rewrite, two-run idempotency**: ADDRESSED. `src/lib/codex-catalog.test.ts` block "A rewrite after a model change": modes forced to 0644, model changed, asserts `written`, both modes 0600, new content has the new slug and not the old, a second run is byte-identical with 0600, and the directory holds no stray files. The inode assertion and the 0600 assertion bite against an in-place write (mutation RED `420 !== 384`).
- **Item 2, timeout**: ADDRESSED. `timeout: 120_000` on `execFileSync` in `defaultListModels` (`lib/codex-catalog.js` has `12e4`). No test, disclosed; the constant has no injection point. A timeout makes `execFileSync` throw, which the existing catch in the fx-setup flow reports as `catalog.error`. Accepted as instructed. Note `tests/conformance/lib/live.sh:261` still has no `timeout` wrapper; it was not in the fix scope as worded (the finding named it as context), see out-of-scope.
- **Item 4, atomic write**: ADDRESSED. `writeAtomic` writes a same-directory temp file (`wx`, 0600) then `renameSync`, and removes the temp file and rethrows on error. Both fx files go through it; the `chmodSync` calls are gone. The temp name `fx-*.config.toml.<pid>.tmp` does not match the `leftProfiles` pattern `^fx-.*\.config\.toml$`, so a stranded temp is not mistaken for a profile. A torn catalog can no longer arise from a cut-short write of the final path.
- **Item 7, left on every run**: ADDRESSED. `report.left` is now computed once the profile name is known, before the kept and refused checks, filtered against this run's profile file. The test writes an `fx-old` owned profile and an unmarked `fx-mine`, then asserts `left` equals only the owned one after a successful run, and is empty for a clean home. `commands/fx-setup.md` and `skills/fx-setup/SKILL.md` say `left` is named "on every run"; the root-check test asserts the phrase.
- **Item 10, single-quote FX_CODEX_SLUGS**: ADDRESSED. Both `commands/fx-setup.md` and `skills/fx-setup/SKILL.md` now read "single-quoted and space separated"; the root-check test asserts `FX_CODEX_SLUGS[^.]*single-quoted`.
- **Version bump to 0.8.0**: ADDRESSED. Diff shows `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `package.json` and both `package-lock.json` spots at 0.8.0. The report shows `release-version.test.js: OK` and check-manifest OK.

Judgement of the fix report's five concerns:

1. Licence file in `codex/`, not `references/vendor/`: sound. The gate forbids unlisted files there; the notice names the path.
2. Copyright line: controller verified against upstream NOTICE; accepted.
3. Untested timeout: acceptable for a constant on a stdlib option; not a regression risk.
4. Atomic-write RED by mutation: acceptable. The mutation proves the inode and mode assertions fail without `writeAtomic`; the disclosure is honest.
5. `left` excluding the same-name profile on kept or refused: a real but small gap, ledgered below as Minor.

### New breakage in the fix diff

- **Minor**, `src/lib/codex-catalog.ts` (`report.left = leftProfiles(home).filter((f) => f !== profileFile)`): on a refused-all or kept-catalog run, an fx-owned profile of the same name stays in place with its older catalog and is not reported in `left`, so the stale state is invisible. Report text says `left` is "on every run", which slightly overstates.
- **Minor**, `writeAtomic`: a process killed between the temp write and the rename leaves `<file>.<pid>.tmp` (mode 0600) in `CODEX_HOME`; nothing removes it on a later run. Harmless, no data loss.
- **Minor**, `readConfig`: an indented `model =` inside a multi-line TOML string would now be read as a key. Not observed in Codex configs.

No Critical or Important breakage. Tests were not re-run; the report names covering tests with output (codex-catalog, fx-setup-root-check, skill-size, release-version).

### Out-of-scope observations

- `tests/conformance/lib/live.sh:261` still has no `timeout` wrapper on the catalog setup call, so the 120 s limit in the CLI covers it only when the CLI is what hangs. Non-blocking.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Final review: fix wave (8 addressed, 0 open: none; commits 94d7869..e41cc79)
Final review: minor (deferred): left excludes the same-name profile on kept or refused runs, so a stale fx-owned profile of that name is not reported (codex-catalog.ts, report.left filter)
Final review: minor (deferred): writeAtomic leaves a 0600 .tmp file in CODEX_HOME if the process is killed between write and rename (codex-catalog.ts writeAtomic)
Final review: minor (deferred): readConfig now accepts an indented model key inside a multi-line TOML string (codex-catalog.ts readConfig)
Final review: minor (deferred): live.sh:261 catalog setup call has no timeout wrapper
