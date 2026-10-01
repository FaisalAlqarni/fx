### Spec Compliance

- ❌ Issues found: INSTALL.md and baseline.md Final still show Codex 16/18 with rows 12 and 17 open; the controller's qwen/qwen3.8-27b re-run (4 of 4 PASS, ledger Ruling at state.md last lines, logs15c/summary.txt) is not reflected. Acceptance "every harness ... Final table with 0 FAIL" is not met on paper for Codex.
- ⚠️ Cannot verify: nothing needing live runs (not re-run by instruction).

### Strengths

- Version bump complete: .claude-plugin/plugin.json:3, .codex-plugin/plugin.json:3, .agents/plugins/marketplace.json:9 all 0.2.5; no 0.2.4 left outside docs and review files.
- Changed-file intersections per harness recorded (baseline.md Final section). Fallback and inconclusive handling honest.
- check-all classification spot check: ran scripts/check-prose AGENTS.md on merge base 2c0e8d2 (main checkout): same dash hits at AGENTS.md:56,57. Pre-existing claim holds. check-prose on the two 11-* findings files, INSTALL.md and baseline.md on this branch: OK. 0 dashes in INSTALL.md and baseline.md.
- Key scan: git grep sk-or- hits only ADR/design/findings text describing the scan, no key shape. grep -rl sk-or- over /tmp/fxlogs-opencode-v2-final and logs15c: none.

### Issues

#### Critical (Must Fix)

#### Important (Should Fix)

- INSTALL.md:26, :118, :551, :567-574, :599 and baseline.md:133 and the Codex 12/17 bullet (baseline.md ~line 139): say Codex 16 pass, 2 fail, rows 12 and 17 open, "re-run on the primary after 00:00 UTC". Ledger Ruling (state.md last line) records both rows PASS twice on qwen/qwen3.8-27b, model=qwen/qwen3.8-27b, no inconclusive attempts. Fix: Codex row 18 pass / 0 fail / 0 GAP (16 on the Final run plus 2 rows decided by the paid-listing re-run), say the paid listing (not the free tier) of the same primary model decided 12 and 17, cite logs15c (copy to /tmp/fxlogs-opencode-v2-final/ so the cited log dir holds it), drop the "open" language at INSTALL.md:26 and :118, delete the Stated limitation "Codex rows 12 and 17", update baseline.md rows 12 and 17 Codex cells (FAIL (fb) to PASS (qwen paid, 2 of 2)) and the Codex counts (Pass 18, Fail 0; Passes on the fallback stays 12). Also state the paid listing caveat from the ruling.
- INSTALL.md:551 / baseline.md:133-ish: Codex "Inconclusive attempts 16" and OpenCode 1.18.25 "16" do not reconcile with the logs. Counting *.attempt1.log in /tmp/fxlogs-opencode-v2-final: codex 14 (+2 in rerun1 for 12, 17 = 16, matches), opencode 12 (+2 in rerun1 for 07, 18 = 14, not 16), opencode-v2 12 (matches), claude-code 0 (matches). Fix OpenCode 1.18.25 to 14 or document the two extra attempts that have no log.

#### Minor (Nice to Have)

- INSTALL.md "Passes on the fallback model" for Codex stays 12; once 12 and 17 are decided on qwen, the column header could say which rows ran on a non-fallback primary, so the reader sees 14 model rows = 12 fallback + 2 primary-paid.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Evidence exists for Codex 18/18 but the shipped INSTALL.md and baseline.md still publish 16/18 with open rows; one inconclusive count (OpenCode 1.18.25: 16 vs 14 logs) does not reconcile. Versions, key scan and check-all classification hold.

## Ledger lines

Task 15: minor (deferred): Passes-on-fallback column does not say which Codex rows ran on a non-fallback primary after the qwen re-run.
