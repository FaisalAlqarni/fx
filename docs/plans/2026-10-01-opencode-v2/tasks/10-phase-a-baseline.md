# 10: Phase A baseline

**Status:** ready-for-agent
**Blocked by:** 08
**Phase:** Baseline

**What to build:** one honest measurement of where fx stands on every harness: the full live matrix on Codex 0.155.1, OpenCode 1.18.25 and OpenCode 2.0.18, and Claude Code 2.1.286's rows 01, 02, 06, 07, 08, 16, all through OpenRouter. Every FAIL and GAP is written down with its log excerpt and the model it ran on. Nothing is fixed here.

**Files:**
- Create: `docs/plans/2026-10-01-opencode-v2/baseline.md`

**Interfaces:**
- Consumes: `FX_LIVE_PROVIDER=openrouter` (task 08); `OPENROUTER_API_KEY` exported by the controller; the 1.18.25 standalone binary (build it as task 10 of the lean-review plan did: `npm install --prefix` into a scratch dir, copy the `opencode-linux-*` binary into its own directory) and the installed 2.0.18.
- Produces: `baseline.md` with one table per harness: row, verdict (PASS, FAIL, GAP), model, attempts, and for each non-PASS a log excerpt (redacted) and the log path. Tasks 11 to 13 read it.

**Seam:** `tests/conformance/run.sh <harness>` with the live rows.

**Risks:** runs are long: launch each harness's run as a tracked background command and wait on it; run harnesses one after another (OpenRouter rate limits are per key). Put the 1.18.25 binary first on `PATH` for the `opencode` run and the installed 2.0.18 for `opencode-v2`, and confirm from the logs which version ran. Claude Code runs only the six rows, through a rows directory holding copies of them. A row that hits a provider error on both models is a GAP with that reason, not a FAIL.

**Idempotency:** scratch homes per run; `baseline.md` rewritten whole.

**Testing:** the runs themselves.

## Acceptance criteria
- [ ] `baseline.md` has four tables covering every row run, with verdict, model and attempts.
- [ ] Every non-PASS has a redacted log excerpt and a log path.
- [ ] `grep -c 'sk-or-' docs/plans/2026-10-01-opencode-v2/baseline.md` prints `0`.

## Steps

- [ ] **1.** Build the 1.18.25 standalone binary; confirm `--version` for both majors.
- [ ] **2.** Codex: `FX_LIVE_PROVIDER=openrouter HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_CONFORMANCE_LOGS="$(mktemp -d)" bash tests/conformance/run.sh codex`, tracked in the background, output teed to a file.
- [ ] **3.** OpenCode v1 (1.18.25 first on `PATH`), then OpenCode v2, the same way.
- [ ] **4.** Claude Code: the six rows only, through `FX_CONFORMANCE_ROWS`.
- [ ] **5.** Write `baseline.md`; check it for key text.
- [ ] **6. Commit**

```
git add docs/plans/2026-10-01-opencode-v2/baseline.md
git commit -m "docs(opencode-v2): phase A baseline on four harnesses"
```
