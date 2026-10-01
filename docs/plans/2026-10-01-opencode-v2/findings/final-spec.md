Findings (diff `2c0e8d2..0208fad`, tree at `0208fad`; I read the diff selectively, not every file).

**(a) Missing or partial**

- [Important] The lane check on v2 is not in INSTALL.md, the v2 reference or ADR-0037. Spec: "`INSTALL.md` states, per layer, what v2 catches and what it does not" and "If neither layer works, v2 has no lane check and `INSTALL.md` says so." The plugin does run a lane check on `edit`, but `grep "lane check"` finds only the v1 text at INSTALL.md:189. The coverage audit already lists this as gap 2, and it was still open at HEAD.
- [Important] No re-run on the same model after a capability failure. Spec: "A capability failure is re-run once on the same model and both results are recorded." `run.sh` re-runs only on exit 75, which means a provider error. The README text says the capability re-run exists, but no code does it.
- [Important] Credits precondition is not enforced. Spec: "checked before any live run with `GET .../api/v1/credits` (`total_credits > 0`)" and "Each harness run states a request budget and paces its rows." Only `baseline.md` records a manual check. `live.sh` and `run.sh` contain no `/credits` call, no budget and no pacing.
- [Minor] INSTALL.md does not say Claude Code's other 12 rows were proven 18/18 in `78ff5b3`. Spec D7: "INSTALL.md's stale '2 GAP (13, 14)' is corrected." The stale text is gone, but the coverage audit lists the 18/18 statement as still open.
- [Minor] Nightly CI for `opencode-v2` pins `2.0.18` and `@latest`, as asked. The v1 entry is `opencode-ai@1`, matching the intent.

**(b) Scope creep**

- [Important] `hooks/fx-codex.js` gained a new lane check for shell-run `apply_patch` (`SHELL_APPLY_PATCH`, an indented-heredoc regex change, and a `checkPatchPaths` refactor). Spec Phase B only allows fixes "to a failure" of that harness. This is a Codex hook change with no ADR, outside the v2 work.
- [Minor] The installer writes `.fx-opencode-owned.json`, an ownership record. Spec: "`--major 1` removes fx's own `experimental.policies` entries (equal to a `GUARD_POLICIES` entry)". The spec asked for equality matching, not a record file. The state.md ruling at line 102 says installs made before the record count as the user's.
- [Minor] The evaluate hook also runs `inspect` on every `ev.resources` piece. The spec guard runs on the full command only. This is harmless and stricter.
- [Minor] The key travels as a 0600 file plus `with-key.sh`, not as a jail allowlist variable. Spec: "the allowlist also carries `OPENROUTER_API_KEY`". This is safer, but it is a deviation with no spec amendment.

**(c) Implemented but looks wrong**

- [Important] Provider-error rule excludes timeouts. Spec: "HTTP 401, 429, 5xx, 'Insufficient credits', or no first token before the timeout." `live.sh` treats an empty-output timeout as a FAIL ("a session that printed nothing ... is a product hang, a FAIL"). That contradicts the spec on purpose. ADR-0038 and the README still say "no output before the timeout" is a provider error (`findings/09-rereview-r1.md` flags this; the 08 lens Critical may be open). Pick one and align the docs.
- [Important] The lane check denies the edit. The v2 `evaluate` sets `effect = 'deny'` on a lane violation. Spec: "advice-class, fail open". It does fail open on throw, but on a hit it hard-blocks. This may mirror v1; confirm.
- [Minor] The model-mismatch check is skipped when the session reports no model, so only the `(config)` label remains. This matches the spec's `(config)` rule.
- [Minor] The Codex addressing change to `$fx:fx-<name>` is ruled. The new `no-runtime-addressing` test pins both Codex forms as offences, so the check is fine.
