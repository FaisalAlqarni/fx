# Task 09 review: eval and conformance tooling in TypeScript

Diff read in passes: the nine new sources in full, the built outputs by header and shape only, the diff file by stat and mode lines (2962 lines).

### Spec Compliance

Spec: ✅ with one ⚠️.

- Nine sources under `src/tests/**` and nine generated files at today's paths, each with the generated header and the shebang kept: present.
- Fixtures untouched: `git diff --stat 779fa33 134edbe -- tests/review-bench/good tests/review-bench/cases tests/fixture-build/hidden/traps.test.js tests/fixture-build/hidden/traps.self-test.js tests/lens-pipeline` prints nothing: confirmed.
- Exports and CLI arguments: export lists in `openrouter.ts:17,128,134,174,203,221,226`, `build-case.ts:16,20,36` and `fill-template.ts:82,94,104` match the report and the old names. The CLI branches (`env|setup|model|error|child|leaks`, exit 2, 3, 10) are the same. I ran old and new `events.js`, `openrouter.js model|child` and `verdict.js` on eight malformed logs (null lines, null `message`, string `messages`, object `messages`, cut final line, array lines): exit codes and stdout match in every case. Only crash text on stderr differs (see Minor 2).
- `openrouter.ts` adds no logging of the key. The only new output is the error message at `:249` and `:255`, which print `e.message`, never the key or file contents.
- Mode change 755 to 644 on `mcp-probe-server.js`, `merge-opencode-provider.js`, `verdict.js`: covered by the recent ruling. Not a finding.
- No `JSON.parse` in the nine sources; every parse goes through `parseJson`. No `as` on boundary data (`as const` only, `build-case.ts:56`). No `any`.
- ⚠️ Paid live rows (`live.sh` at the `mcp-probe-server.js` call, line 230) were not run; unverifiable here.

### Strengths

- Crash-on-malformed behaviour was kept deliberately and checked: my spot checks on null and non-array records match the old exit codes.
- The `child`, `leaks`, `model` CLI exit codes (3 on unreadable log, 10 on leak, fail-closed) survive intact.
- The `Reflect.apply(fs.readFileSync, ...)` fix for the missing-argument case was found by the differential, not guessed.
- Real RED recorded (stub build, 1652 mismatches), and the report names its own gap honestly.

### Issues

#### Critical

None.

#### Important

1. `src/tests/lane-triggering/verdict.ts:100-115`, `src/tests/fixture-build/hidden/implementer-heads.ts:187-204`, `src/tests/conformance/lib/mcp-probe-server.ts:37-59`, `src/tests/conformance/lib/events.ts` (whole) · the committed tests do not pin today's behaviour on malformed input · `verdict.test.js` and `implementer-heads.test.js` contain no malformed case at all (zero hits for malformed, null, bad, invalid), `score.test.js` has one, and the MCP probe server has no unit test. The 1660-case differential is in the scratchpad and will be gone. Brief lesson 2 says to pin any input class touched with a test recorded from the old script. The `get()`/`Reflect.apply`/`Object()` contortions exist only to keep crashes and scalar-rewrites that nothing committed checks, so task 12 (tests move) or any later simplification can drop them and every gate stays green. · Fix: commit one small recorded-output test (a table of input, exit code, stdout from the old scripts, about 20 rows covering null line, non-string `skill`, `HARNESS=constructor`, `null` MCP line, scalar DST, malformed transcript line) run by `node`, or, if the "no new test" line stands, record the decision in the ledger as a known unpinned risk. I recommend the test.

#### Minor

1. `get()` is copied into `openrouter.ts:26`, `events.ts:~51`, `verdict.ts:89`, `implementer-heads.ts:156`, `mcp-probe-server.ts:20` (five copies, one a variant) · drift risk · the report says a shared helper would add a tenth file; a `src/lib` import is still a runtime `require` of an existing module path, so that reason is weak · Fix: if a shared helper is wanted, put it in `src/lib/json.ts`.
2. `openrouter.ts:57`, `events.ts:49`, `verdict.ts:110` · hand-built `TypeError` messages differ from Node's (`object is not iterable` against `object is not iterable (cannot read property Symbol(Symbol.iterator))`; stack header differs) · stderr text only, exit codes equal, and no caller greps `child check failed`; I checked `tests`, `scripts`, `skills` · Fix: none needed, note it.
3. `merge-opencode-provider.ts:84` and `mcp-probe-server.ts:39` · empty `catch {}` and a silent `return` on unparseable input, kept from the old code · merge writes a fresh config over an unreadable DST without a word; a bad request line to the probe server gets no JSON-RPC error · preserved behaviour, so not a regression; worth a one-line `shortcut:` comment so the next reader knows it is deliberate.
4. `mcp-probe-server.ts:57` · the tool writes `probe` to any path the caller names, resolved from the cwd · same as before and scoped to the conformance scratch home by `live.sh`; no tripwire fired, but a header note that the path is not confined would help.

### Assessment

The port matches the old scripts on every input I tried, exports and arguments are identical, fixtures are untouched, and the key is not logged. Quality is good; the one gap is that the proof lives only in the scratchpad. Ready with fixes: commit a compact recorded test (or log the gap in the ledger) before this is relied on.

## Ledger lines

Task 09: minor (deferred): `get()` helper copied into five scripts; move to `src/lib/json.ts` if a shared import is acceptable.
Task 09: minor (deferred): hand-built TypeError messages differ from Node's on stderr for malformed input; exit codes equal.
Task 09: minor (deferred): silent catch in `merge-opencode-provider.ts` and silent return in `mcp-probe-server.ts` kept without a shortcut comment.
Task 09: minor (deferred): `mcp-probe-server.ts` writes to any caller-named path; add a header note that it is not confined.
