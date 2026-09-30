# 10: OpenCode measured on 1.18.25 and 2.0.18

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Verify

**What to build:** fx's OpenCode support is checked on both the version it was built against (1.18.25) and the one installed on this machine (2.0.18), with this plan's preamble and plan-state changes in place, and `INSTALL.md` says exactly what was measured on each. Nothing else in this plan waits on this task.

**Files:**
- Modify: `INSTALL.md`

**Interfaces:**
- Consumes: `lib/preamble.js` and `lib/plan-state.js` as tasks 04 and 05 left them (the opencode plugin renders through `render()`).
- Produces: `INSTALL.md` rows per opencode version.

**Seam:** `tests/install/run.sh opencode`, `tests/conformance/run.sh opencode --free`, and the live matrix `tests/conformance/run.sh opencode`, each pointed at one binary through `PATH`.

**What each check can tell apart.** The install test runs `scripts/fx-opencode-install` and the free rows make no CLI call, so neither exercises the opencode binary: they run once and cover both versions equally. Only the live rows run the binary, so they are the version measurement. They need the local llama-server on `127.0.0.1:8899`; when it is down the live rows are recorded as pending, not guessed, and the task still completes.

**Risks:**
- The conformance jail (`tests/conformance/lib/jail.sh`) hides `/tmp`, the real home and other top-level directories, then binds back only the command's own package directory. The npm `opencode-ai` package is a wrapper whose real binary sits in a sibling platform package, which the jail would hide. So step 1 copies the platform binary into a directory of its own, which the jail binds whole.
- The server has one slot: run the two versions one after the other, never together.
- A 27B model may fail row 04 or row 12 for capability. Re-run a suspected flake once and record both results (`tests/conformance/README.md`).
- Nothing is installed globally; the 2.0.18 install at `~/.opencode/bin` is not touched.

**Idempotency:** step 1 reuses `$OC118BIN/opencode` if it already reports 1.18.25. Each run uses a fresh temp `HOME`. The `INSTALL.md` edit replaces the same lines on a re-run.

**Testing:** the checks themselves.

## Acceptance criteria
- [ ] `tests/install/run.sh opencode` and `tests/conformance/run.sh opencode --free` pass (once: neither runs the binary).
- [ ] The live matrix ran on 1.18.25 and on 2.0.18, one at a time, and each run's log shows the version it ran; or the server was down and both are recorded as pending with the reason.
- [ ] `INSTALL.md` line 5 names opencode 1.18.25 and 2.0.18 only if both live runs happened; otherwise it keeps 1.18.25 and a sentence says 2.0.18 passes the install and free rows with live rows pending.
- [ ] "What is verified" has one row per opencode version with this run's date and counts, or "pending" and why.
- [ ] Any FAIL is reported with its row number and log excerpt, not fixed here.

## Steps

- [ ] **1. Get a standalone 1.18.25 binary**

Run:
```
OC118="$(mktemp -d)"; npm install --prefix "$OC118" opencode-ai@1.18.25
BIN="$(find "$OC118/node_modules" -path '*opencode-linux*' -name opencode -type f | head -1)"
OC118BIN="$(mktemp -d)"; cp "$BIN" "$OC118BIN/opencode"; chmod +x "$OC118BIN/opencode"
"$OC118BIN/opencode" --version
```
Expected: `1.18.25` (possibly `opencode v1.18.25`). If `find` prints nothing, list `"$OC118/node_modules"` and pick the platform package for this machine; report what you chose.

- [ ] **2. Confirm the installed version**

Run: `opencode --version`
Expected: `opencode v2.0.18`.

- [ ] **3. Install test and free rows (version-independent, once)**

Run: `bash tests/install/run.sh opencode && bash tests/conformance/run.sh opencode --free`
Expected: both pass.

- [ ] **4. Check the local model server**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8899/v1/models`
Expected: `200` or `401`. Anything else: skip steps 5 and 6, record both versions' live rows as pending with this output, go to step 7.

- [ ] **5. Live rows on 1.18.25**

Run:
```
LOGS118="$(mktemp -d)"
HOME="$(mktemp -d)" FX_REAL_HOME="/home/faisal" FX_CONFORMANCE_LOGS="$LOGS118" \
  PATH="$OC118BIN:$PATH" bash tests/conformance/run.sh opencode 2>&1 | tee "$LOGS118/matrix.out"
grep -rho 'v1\.18\.25\|1\.18\.25' "$LOGS118" | head -1
```
Expected: pass, fail and GAP counts at the end, and the grep prints the version. If the logs show another version or none, record the run as not measured on 1.18.25 and say why.

- [ ] **6. Live rows on 2.0.18** (only after step 5 has finished)

Run:
```
LOGS2="$(mktemp -d)"
HOME="$(mktemp -d)" FX_REAL_HOME="/home/faisal" FX_CONFORMANCE_LOGS="$LOGS2" \
  bash tests/conformance/run.sh opencode 2>&1 | tee "$LOGS2/matrix.out"
```
Expected: counts at the end.

- [ ] **7. Update `INSTALL.md`** per the acceptance criteria. Line 5 today: `against Claude Code 2.1.278, Codex CLI 0.155.1 and opencode 1.18.25.` In "What is verified", replace the single opencode row with one row per version, for example:

```markdown
| opencode 1.18.25 | Lean-review task 10, <date>: <P> pass, <F> fail, <G> GAP (`<LOGS118>/matrix.out`). |
| opencode 2.0.18 | Lean-review task 10, <date>: <P> pass, <F> fail, <G> GAP (`<LOGS2>/matrix.out`). |
```

with the real values, or `pending: <reason>` in place of the counts.

- [ ] **8. Run the touched gates**

Run: `scripts/check-prose INSTALL.md && node tests/gates/ci-pins.test.js`
Expected: both pass. `ci-pins` keeps 1.18.25 as the floor; the CI matrix's `@latest` entry already covers newer versions.

- [ ] **9. Commit**

```
git add INSTALL.md
git commit -m "docs(install): opencode checked on 1.18.25 and 2.0.18"
```
