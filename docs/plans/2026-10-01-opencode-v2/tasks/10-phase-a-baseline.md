# 10: Phase A baseline

**Status:** ready-for-agent
**Blocked by:** 08
**Phase:** Baseline

**What to build:** one honest measurement of where fx stands on every harness: the full live matrix on Codex 0.155.1, OpenCode 1.18.25 and OpenCode 2.0.18, and Claude Code 2.1.286's rows 01, 02, 06, 07, 08, 16, all through OpenRouter. Every FAIL and GAP is written down with its log excerpt and the model it ran on. Nothing is fixed here.

**Files:**
- Create: `docs/plans/2026-10-01-opencode-v2/baseline.md`

**Interfaces:**
- Consumes: `FX_LIVE_PROVIDER=openrouter` (task 08); `OPENROUTER_API_KEY` exported by the controller; the 1.18.25 standalone binary (build it as task 10 of the lean-review plan did: `npm install --prefix` into a scratch dir, copy the `opencode-linux-*` binary into its own directory) and the installed 2.0.18.
- Produces: `baseline.md` with, at its top, the baseline commit (`git rev-parse HEAD` at the start of the runs; tasks 11 to 15 diff against it to decide which harnesses changed), the credits check result (purchased credits present, yes or no, never the key or the balance request headers), and the OpenRouter limits in force that day; then one table per harness: row, verdict (PASS, FAIL, GAP), model as the session reported it, attempts, and for each non-PASS a log excerpt (redacted) and the log path; and per harness the request count observed against its budget. Tasks 11 to 14 read it.

**Seam:** `tests/conformance/run.sh <harness>` with the live rows.

**Risks:**
- **Precondition, checked first:** the account has purchased credits. A key without them gets 50 free-model requests a day at 20 a minute, and 18 rows x 3 harnesses x 10 to 50 requests exceeds that. Check with `curl -sf -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/credits | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data; process.exit(d && d.total_credits > 0 ? 0 : 1)'`, printing only the exit status. Exit 1 or a failed request stops the task: report it to the controller, run nothing. Read the current free-model limits for accounts with purchased credits from OpenRouter's limits documentation and record them in `baseline.md`.
- **Request budget and pacing:** per harness, budget 18 rows x 50 requests = 900 requests at most (Claude Code: 6 rows x 50 = 300, billed, not free-model). If the day's free-model limit is below the sum of the harnesses planned that day, run the remaining harnesses on the next UTC day. Pace to the per-minute limit: run one row at a time, each through its own `FX_CONFORMANCE_ROWS` directory, with 60 seconds between rows; a 429 inside a row is a provider error and takes the fallback (task 08). Count requests from each row log's model-call events and record the total per harness.
- Runs are long: launch each harness's run as a tracked background command and wait on it; run harnesses one after another (OpenRouter rate limits are per key). Put the 1.18.25 binary first on `PATH` for the `opencode` run and the installed 2.0.18 for `opencode-v2`; `live.sh` fails a row whose `opencode --version` major does not match the harness (task 06). Claude Code runs only the six rows, through a rows directory holding copies of them. A row that hits a provider error on both models is a GAP with that reason, not a FAIL.
- The runner output each step tees to a file is scanned for `sk-or-` before it is kept or quoted; a hit means the file is deleted and the leak is reported to the controller, never quoted.

**Idempotency:** scratch homes per run; `baseline.md` rewritten whole.

**Testing:** the runs themselves.

## Acceptance criteria
- [ ] `baseline.md` records the baseline commit, a passed credits check, the limits read that day, and the request count per harness against its budget.
- [ ] `baseline.md` has four tables covering every row run, with verdict, model as reported by the session, and attempts.
- [ ] Every non-PASS has a redacted log excerpt and a log path.
- [ ] `grep -c 'sk-or-'` prints `0` for `docs/plans/2026-10-01-opencode-v2/baseline.md` and for every teed runner output and kept log.

## Steps

- [ ] **1. Precondition:** run the credits check in **Risks**; stop on failure. Record `git rev-parse HEAD` as the baseline commit.
- [ ] **2.** Build the 1.18.25 standalone binary; confirm `--version` for both majors.
- [ ] **3.** Codex: `FX_LIVE_PROVIDER=openrouter HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_CONFORMANCE_LOGS="$LOGS" bash tests/conformance/run.sh codex > "$LOGS/codex-run.txt" 2>&1`, tracked in the background, paced per **Risks**. Then `grep -c 'sk-or-' "$LOGS/codex-run.txt" "$LOGS"/*.log` prints `0` for each file.
- [ ] **4.** OpenCode v1 (1.18.25 first on `PATH`), then OpenCode v2, the same way, each scanned the same way.
- [ ] **5.** Claude Code: the six rows only, through `FX_CONFORMANCE_ROWS`, scanned the same way.
- [ ] **6.** Write `baseline.md`; check it for key text.
- [ ] **7. Commit**

```
git add docs/plans/2026-10-01-opencode-v2/baseline.md
git commit -m "docs(opencode-v2): phase A baseline on four harnesses"
```
