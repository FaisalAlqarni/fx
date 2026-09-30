# 10: OpenCode measured on 1.18.25 and 2.0.18

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Verify

**What to build:** fx's OpenCode support is proven on both the version it was built against (1.18.25) and the one installed on this machine (2.0.18), with this plan's preamble and plan-state changes in place. `INSTALL.md` states both as measured, with the results.

**Files:**
- Modify: `INSTALL.md`

**Interfaces:**
- Consumes: `lib/preamble.js` and `lib/plan-state.js` as tasks 04 and 05 left them (the opencode plugin renders through `render()`).
- Produces: two result lines in `INSTALL.md` "What is verified".

**Seam:** the live conformance matrix, `tests/conformance/run.sh opencode`, run against each binary.

**Risks:**
- The live rows need the local llama-server on `127.0.0.1:8899` and free memory. If `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8899/v1/models` does not print `200` or `401`, stop and report BLOCKED with that output. Do not start the server yourself and do not substitute another model.
- The server has one slot: run the two versions one after the other, never together.
- A 27B model may fail row 04 or row 12 for capability. Re-run a suspected flake once and record both results, never the better one alone (`tests/conformance/README.md`).
- Nothing is installed globally: 1.18.25 goes into a scratch prefix and reaches the run only through `PATH`.

**Idempotency:** the scratch install is reused if `"$OC118/node_modules/.bin/opencode" --version` already prints `1.18.25`. Conformance runs use a fresh temp `HOME` each time. The `INSTALL.md` edit replaces the same lines on a re-run.

**Testing:** the live conformance rows themselves; the free rows for both versions as a smoke check first.

## Acceptance criteria
- [ ] `tests/conformance/run.sh opencode --free` passes with each binary first on `PATH`.
- [ ] The live opencode matrix ran once per version, one at a time, with pass, fail and GAP counts and the log path recorded.
- [ ] `INSTALL.md` line 5 names `opencode 1.18.25 and 2.0.18`, and "What is verified" has one row per opencode version with this run's date and counts.
- [ ] Any FAIL is reported with its row number and the log excerpt, not fixed in this task.

## Steps

- [ ] **1. Install 1.18.25 into a scratch prefix**

Run:
```
OC118="$(mktemp -d)/oc118"; mkdir -p "$OC118"
npm install --prefix "$OC118" opencode-ai@1.18.25
"$OC118/node_modules/.bin/opencode" --version
```
Expected: `1.18.25` (possibly prefixed `opencode v`).

- [ ] **2. Confirm the installed version**

Run: `opencode --version`
Expected: `opencode v2.0.18`. Note its directory: `dirname "$(command -v opencode)"`.

- [ ] **3. Free rows on both**

Run:
```
PATH="$OC118/node_modules/.bin:$PATH" bash tests/conformance/run.sh opencode --free
bash tests/conformance/run.sh opencode --free
```
Expected: both pass.

- [ ] **4. Check the local model server**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8899/v1/models`
Expected: `200` or `401`. Anything else: stop, report BLOCKED with the output.

- [ ] **5. Live rows on 1.18.25**

Run:
```
LOGS118="$(mktemp -d)"
HOME="$(mktemp -d)" FX_REAL_HOME="/home/faisal" FX_CONFORMANCE_LOGS="$LOGS118" \
  PATH="$OC118/node_modules/.bin:$PATH" \
  bash tests/conformance/run.sh opencode 2>&1 | tee "$LOGS118/matrix.out"
```
Expected: a pass, fail and GAP count at the end. Record them.

- [ ] **6. Live rows on 2.0.18** (only after step 5 has finished)

Run:
```
LOGS2="$(mktemp -d)"
HOME="$(mktemp -d)" FX_REAL_HOME="/home/faisal" FX_CONFORMANCE_LOGS="$LOGS2" \
  bash tests/conformance/run.sh opencode 2>&1 | tee "$LOGS2/matrix.out"
```
Expected: counts at the end. Record them.

- [ ] **7. Update `INSTALL.md`.** Line 5: `against Claude Code 2.1.278, Codex CLI 0.155.1 and opencode 1.18.25.` becomes `against Claude Code 2.1.278, Codex CLI 0.155.1 and opencode 1.18.25 and 2.0.18.` In "What is verified", replace the single opencode row with two:

```markdown
| opencode 1.18.25 | Lean-review task 10, <date>: <P> pass, <F> fail, <G> GAP (`<LOGS118>/matrix.out`). |
| opencode 2.0.18 | Lean-review task 10, <date>: <P> pass, <F> fail, <G> GAP (`<LOGS2>/matrix.out`). |
```

with the real date, counts and paths from steps 5 and 6. If a row failed, add one sentence under the table naming the row and whether its re-run passed.

- [ ] **8. Run the touched gate**

Run: `scripts/check-prose INSTALL.md && node tests/gates/ci-pins.test.js`
Expected: both pass. (`ci-pins` keeps `1.18.25` as the floor; this task does not change the CI matrix, whose `@latest` entry already covers newer versions.)

- [ ] **9. Commit**

```
git add INSTALL.md
git commit -m "docs(install): opencode measured on 1.18.25 and 2.0.18"
```
