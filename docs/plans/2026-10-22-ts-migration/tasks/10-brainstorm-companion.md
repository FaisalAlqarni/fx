# 10: Brainstorm companion in TypeScript

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** Hardening

**What to build:** the brainstorm visual companion (a local server started by `start-server.sh` in the user's project, and the helper script it serves to the browser) is written in TypeScript. Because no gate exercises the server today, a start-and-request check is added first and must pass on the current JavaScript before the port.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/tests/gates/brainstorm-server.test.ts` (generated to `tests/gates/brainstorm-server.test.js`)
- Create: `src/skills/fx-brainstorm/scripts/server.cts`, `src/skills/fx-brainstorm/scripts/helper.ts`
- Modify: `skills/fx-brainstorm/scripts/server.cjs` (generated, CommonJS), `skills/fx-brainstorm/scripts/helper.js` (generated, browser IIFE)
- Modify: `scripts/check-all` (run the new gate)

**Interfaces:**
- Produces: the server keeps its whole environment contract: `BRAINSTORM_DIR`, `BRAINSTORM_STATE_DIR`, `BRAINSTORM_HOST`, `BRAINSTORM_URL_HOST`, `BRAINSTORM_OWNER_PID`, `BRAINSTORM_PORT`, `BRAINSTORM_PORT_FILE`, `BRAINSTORM_TOKEN`, `BRAINSTORM_TOKEN_FILE`, `BRAINSTORM_OPEN`, `BRAINSTORM_OPEN_CMD`, `BRAINSTORM_IDLE_TIMEOUT_MS`, `BRAINSTORM_LIFECYCLE_CHECK_MS`, and `--brainstorm-server-id=<id>`; its port and token files; its JSON event lines on stdout.
- Produces: the helper stays a self-contained browser script. Its top-level `return` today needs a function wrapper in `helper.ts`; the IIFE output provides the scope. `helper.ts` carries `/// <reference lib="dom" />`.

**Seam:** the new gate (a real server process on a scratch directory, real HTTP requests) and the existing `tests/companion/ignore-guarantees.sh`, which already starts real servers.

**Tests:**
- Gate, written and green against the current `server.cjs` before the port: start `node skills/fx-brainstorm/scripts/server.cjs --brainstorm-server-id=gate` with the environment pointing at scratch directories, `BRAINSTORM_HOST=127.0.0.1`, `BRAINSTORM_OPEN=0` and `BRAINSTORM_LIFECYCLE_CHECK_MS=200`; read the bound port and token from the files the server writes. Then: `GET /?key=<token>` returns `200` and the bootstrap page that sets the cookie (record its body from the current server); `GET /` with the cookie returns `200` and a body containing the helper script; `GET /` with neither returns today's refusal status, recorded from the current server; writing a new screen file to `BRAINSTORM_DIR` makes stdout emit a line with `"type":"screen-added"`; killing the owner process makes the server emit `"type":"server-stopped"` and exit within 2 seconds. The gate kills the server on every exit path.
- `bash tests/companion/ignore-guarantees.sh` passes before and after the port.
- After the port: the same gate passes with no change to it.

**Risks:** the server runs on users' machines in their projects; it binds a port and handles a token. The port must keep the binding host and token checks exactly. File watching differs per OS (`fs.watch` reports `rename` on macOS); keep today's handling.

**Idempotency:** the gate writes only to scratch directories it creates and removes, and always stops the server it started.

**Testing:** the new gate, `scripts/check-all`.

## Acceptance criteria
- [ ] Commit 1 adds the gate, green on the unported server.
- [ ] Commit 2 ports server and helper; the gate passes unchanged.
- [ ] `server.cjs` is CommonJS and `helper.js` is an IIFE, both with the generated header.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the gate against the current server**
- [ ] **3. Run it: verify GREEN on the unported server**

Run: `scripts/build && node tests/gates/brainstorm-server.test.js && bash tests/companion/ignore-guarantees.sh`
Expected: PASS.

- [ ] **4. Commit the gate by path**

```
git add src/tests/gates/brainstorm-server.test.ts tests/gates/brainstorm-server.test.js scripts/check-all
git commit -m "test(brainstorm): start-and-request gate for the companion server"
```

- [ ] **5. Port server and helper**
- [ ] **6. Run: verify GREEN**

Run: `scripts/build && node tests/gates/brainstorm-server.test.js && bash tests/companion/ignore-guarantees.sh`
Expected: PASS.

- [ ] **7. Run the scope**

Run: `scripts/test-scope src/skills/fx-brainstorm/scripts/server.cts src/skills/fx-brainstorm/scripts/helper.ts`

- [ ] **8. Commit by path**

```
git add src/skills/fx-brainstorm/scripts/server.cts src/skills/fx-brainstorm/scripts/helper.ts skills/fx-brainstorm/scripts/server.cjs skills/fx-brainstorm/scripts/helper.js
git commit -m "refactor(brainstorm): companion server and helper in TypeScript"
```
