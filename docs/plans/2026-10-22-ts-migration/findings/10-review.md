# Task 10 review: brainstorm companion in TypeScript

I read the diff package (2507 lines) in passes: first the file list and stats, then the gate source in full, then `diff -w` of the old `server.cjs` (from `134edbe`) against `server.cts`, then the same for `helper.js` against `helper.ts`. I read the generated outputs by header, module shape and `require` lines only. I did not re-run the suite.

Focused checks I ran, from `git archive` copies in my scratchpad:

- The gate at `004b469` (old hand-written server) passed: 5 ok lines and `brainstorm-server: OK`, exit 0.
- The gate at `43b92d4` (ported server) passed the same way. `git diff 004b469 43b92d4 -- src/tests tests/gates/brainstorm-server.test.js` is empty, so the gate is unchanged. The only `scripts/check-all` difference in that range is task 09's line.
- No `fx-brainstorm-gate-*` directory was left in `/tmp` after either run.
- I ran a differential probe with `BRAINSTORM_HOST` unset (default bind) and `BRAINSTORM_OPEN_CMD=true`, against both trees. The listen address (127.0.0.1), the token file mode (600), the headers on the keyed 200 response (`Set-Cookie: brainstorm-key-<port>=<token>; HttpOnly; SameSite=Strict; Path=/` and the five security headers), the 403 headers and body hash, a bad key (403), an encoded `../` under `/files/` (404), a WebSocket upgrade with a foreign Origin (socket destroyed in both) and the stdout lines were identical. Only the random port and the scratch path differed.

### Spec Compliance

Spec: ✅ with one ⚠️.

- Environment contract: `diff -w` shows every `process.env.BRAINSTORM_*` read unchanged in logic. That covers `_DIR`, `_STATE_DIR`, `_HOST`, `_URL_HOST`, `_OWNER_PID`, `_PORT`, `_PORT_FILE`, `_TOKEN`, `_TOKEN_FILE`, `_OPEN`, `_OPEN_CMD`, `_IDLE_TIMEOUT_MS` and `_LIFECYCLE_CHECK_MS`, plus the `--brainstorm-server-id` argument and the `require.main === module` guard. The changes in the diff are type annotations, `catch (e)` to `catch`, `require('os')` and `require('child_process')` moved to top-level imports, and the narrowings listed under Strengths.
- Gate cases: keyed bootstrap page byte for byte (`src/tests/gates/brainstorm-server.test.ts:106-108`), cookie route containing `helper.js` (`:111-114`), refusal 403 (`:117-118`), `screen-added` (`:121-124`), and `server-stopped` with exit within 2 s of SIGKILL to the owner (`:126-130`). Cleanup runs on settle, on `exit`, and on SIGINT and SIGTERM. Present, with one gap that I list as Important 1: the "page that sets the cookie" half.
- Gate green on the old server first, own commit (`004b469`), unchanged after the port: confirmed by running it, see above.
- `server.cjs` is CommonJS with the generated header, `"use strict"`, plain `require` calls and `module.exports` holding the same six names. `helper.js` is an IIFE with the generated header. `helper.ts` carries `/// <reference lib="dom" />` (`helper.ts:1`), and the old top-level `return` is now `if (typeof window !== 'undefined') runCompanion();` (`helper.ts:24`).
- `bash tests/companion/ignore-guarantees.sh` before and after: the report says both passed. ⚠️ I did not re-run it (the brief says do not re-run the suite). The probe above covers the server half of what it exercises.
- Report concerns, judged against today's behaviour:
  1. `BRAINSTORM_OPEN=0` enabling the opener is today's behaviour (`server.cts:525`, same line in the old file). The only setter, `start-server.sh:58`, writes `1`. Keeping it is correct for a port. The brief's `=0` assumed otherwise, and the gate's `BRAINSTORM_OPEN_CMD=true` (`brainstorm-server.test.ts:87-88`) is the right guard. This is not a task finding. It needs an owner ruling if `0` should mean off.
  2. Tombstone text (`helper.ts:83`): a visible change of one dash to a full stop, forced by the global no-dash constraint. No test, doc or script greps the string (I checked the whole repo outside the plan folder). Accepted.
  3. Dropped `module.exports` in the helper: no caller anywhere in the repo requires `helper.js`. `nextReconnectDelay` and `TOMBSTONE_AFTER_MS` have no hits outside the helper itself. Under an IIFE the export could never reach a caller. Accepted.

### Strengths

- The port stays very close to the original. `diff -w` against the old file is almost entirely annotations, and every behavioural edit is local and justified: `buffer[n]` becomes `buffer.readUInt8(n)` only after the `totalLen` check (`server.cts:76-83`), so it cannot throw where the old code read `undefined`; `errorCode()` replaces `e.code`; `Object(event)` keeps spread semantics for primitives and `__proto__`.
- Security logic is untouched. The default host is `127.0.0.1` (`server.cts:105`). `timingSafeEqualStr` with the length check before `crypto.timingSafeEqual` (`:308-313`), `isAuthorized` (`:328-341`), the Origin check (`:365-371`), the `/files/` basename, dotfile and realpath containment, the frame mask and size limits, and the `chmod 600` on the token file are all the same logic. The probe confirms it from the outside.
- `readSuperpowersVersion` narrows `unknown` instead of casting, and skips exactly the inputs the old code skipped through its `catch`.
- `helper.ts` captures `socket` in `connect()`. Reconnection only starts from `onclose`, so `ws === socket` inside `onopen`, as before. The `typeof data === 'object'` guard removes an old uncaught `TypeError` on a `null` message without changing the `reload` path.
- The gate runs the server with only `PATH` and its own variables, asserts empty stderr, and kills the server on every exit path. The implementer found and fixed a hang in their own gate (stdout pipe after a failed assertion) by running mutations, and recorded four real REDs.
- No `as` casts on input. `as const` is the only `as` in the helper (`helper.ts:65`).

### Issues

#### Critical

None.

#### Important

1. `src/tests/gates/brainstorm-server.test.ts:106-111` · the gate never checks that the keyed response sets the cookie. It builds `brainstorm-key-${port}=${token}` itself and never reads `Set-Cookie`. The brief's first case is "the bootstrap page that sets the cookie", and on this server the cookie comes only from the `Set-Cookie` header at `server.cts:386-387` (the page body sets `sessionStorage`). A later edit could drop that header, or its `HttpOnly` or `SameSite=Strict` attribute, and the gate would stay green. Those attributes are what keep the session key away from page scripts and cross-site requests. This is the security tripwire the brief names ("keep the token checks exactly"). Today's value is unchanged (my probe), so the port can be trusted, but the gate does not yet pin the case it says it pins, and step 8 relies on it as the oracle. · Fix: two lines after `:108`: `assert.strictEqual(res.headers['set-cookie']?.[0], \`brainstorm-key-${port}=${token}; HttpOnly; SameSite=Strict; Path=/\`)`, with `get()` returning `res.headers`. Record the value from the old server, which my probe shows is identical.

#### Minor

1. `src/tests/gates/brainstorm-server.test.ts:83` · the gate always sets `BRAINSTORM_HOST=127.0.0.1`, so nothing pins the default bind when the variable is unset. That default is the property that keeps the companion off the network. I checked it by probe and source (`server.cts:105`), but no test holds it. · Fix: a later task can add one run with `BRAINSTORM_HOST` unset that asserts the `server-started` line reports `"host":"127.0.0.1"`.
2. `src/skills/fx-brainstorm/scripts/server.cts:218-219` and `src/skills/fx-brainstorm/scripts/helper.ts:110` · `JSON.parse` stays raw with `ts-gate-ok`, not through `parseJson`. The reasons hold up: the helper runs in a browser, and the server runs in place from the skill folder, where `readSuperpowersVersion` already handles a missing `package.json`. Both results enter as `unknown` and are narrowed. · Fix: none needed. Note the exception in the task ledger so the design's "one parse function" rule has a recorded carve-out.
3. `skills/fx-brainstorm/COVERAGE.md:58` · row 122 still says `server.cjs` and `helper.js` are "copied verbatim". They are now generated from TypeScript sources. · Fix: amend the row to say both are generated from `src/skills/fx-brainstorm/scripts/` and that the other three files are still verbatim. The docs task can do this.

### Assessment

The port is faithful. Source diff, gate runs at both commits and an old-versus-new probe agree that binding, token handling, cookie attributes, security headers, file confinement, WebSocket framing and the event lines are unchanged. The one gap is in the gate. It does not pin the `Set-Cookie` header, which the brief's first case asks for, so the oracle that later tasks rely on misses a security attribute. That is a small test-only fix. The `BRAINSTORM_OPEN=0` concern is pre-existing behaviour, correctly kept; it needs an owner ruling, not a code change in this task.

Ready with fixes: add the `Set-Cookie` assertion (Important 1), then the task can close.

## Ledger lines

Task 10: minor (deferred): gate never runs with BRAINSTORM_HOST unset, so the 127.0.0.1 default bind is unpinned
Task 10: minor (deferred): server.cts and helper.ts keep raw JSON.parse with ts-gate-ok (standalone and browser); record as a parseJson carve-out
Task 10: minor (deferred): skills/fx-brainstorm/COVERAGE.md row 122 still calls server.cjs and helper.js copied verbatim
