# 02: lib leaves in TypeScript

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Core

**What to build:** the five `lib/` modules that require no fx module other than each other (dispatch route, agent dialects, opencode commands, opencode v2 policies, lane check) are written in TypeScript and generated, with every consumer (hooks, opencode plugins, the opencode installer's `node -e` bootstrap, gates) working unchanged.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/lib/dispatch-route.ts`, `src/lib/agent-dialects.ts`, `src/lib/opencode-commands.ts`, `src/lib/opencode-v2-policies.ts`, `src/lib/lane-check.ts`
- Modify: `src/lib/types.ts` (add the shared types this task needs: lane name union, dispatch route result), `lib/types.js` (generated)
- Modify: `lib/dispatch-route.js`, `lib/agent-dialects.js`, `lib/opencode-commands.js`, `lib/opencode-v2-policies.js`, `lib/lane-check.js` (now generated)

**Interfaces:**
- Produces (same names and runtime shapes as today's `module.exports`, as named ES exports):
  - `dispatch-route`: `route`
  - `agent-dialects`: `toOpencodeAgent`, `toOpencodeV2Agent`, `splitFrontmatter`, `field`
  - `opencode-commands`: `opencodeCommands` (imports `splitFrontmatter`, `field` from `./agent-dialects.js`)
  - `opencode-v2-policies`: `GUARD_POLICIES`
  - `lane-check`: `laneCheck`
- Produces in `src/lib/types.ts`: `type LaneName` (the fx lane names `lane-check` reads) and the return type of `route`, exported for tasks 06 and 07.

**Seam:** the existing JavaScript tests and gates, unchanged, plus `scripts/check-all`.

**Tests:** no new test. These existing commands must pass unchanged:
- `node tests/gates/dispatch-route.test.js`: exit 0.
- `node tests/gates/opencode-v2-policies.test.js`: exit 0.
- `node tests/gates/opencode-plugin.test.js` and `node tests/gates/opencode-v2-plugin.test.js`: exit 0 (they load the plugins, which require these modules).
- `bash tests/install/run.sh opencode` and `bash tests/install/run.sh opencode-v2`: exit 0 (the installer's `node -e` bootstrap requires agent dialects, opencode commands, opencode v2 policies by `.js` path).

**Risks:** opencode commands imports from agent dialects by the literal `./agent-dialects.js` specifier; keep it so the generated `require` matches today's. Any value typed as `unknown` that today is read loosely must keep today's fallback behaviour.

**Testing:** existing unit and gate tests, install runs, `scripts/check-all`.

## Acceptance criteria
- [ ] Each of the five generated files carries the generated header and is reproduced by `scripts/build`.
- [ ] `scripts/check-types` and `scripts/check-ts-escapes` pass.
- [ ] Every command in the Tests field passes without any test file changed.

## Steps

- [ ] **1. Invoke `fx-tdd`** (the oracle is the existing suite; RED is a deliberately wrong export name in one source, seen failing, then corrected)
- [ ] **2. Write the five sources and the shared types**
- [ ] **3. Build and run the Tests field commands**

Run: `scripts/build && node tests/gates/dispatch-route.test.js && node tests/gates/opencode-v2-policies.test.js && node tests/gates/opencode-plugin.test.js && node tests/gates/opencode-v2-plugin.test.js`
Expected: PASS.

- [ ] **4. Run the scope**

Run: `scripts/check-all` (tracked background command; these modules are loaded by hooks, both plugins and the installer, which a scoped run does not all reach)

- [ ] **5. Commit by path**

```
git add src/lib/types.ts lib/types.js src/lib/dispatch-route.ts src/lib/agent-dialects.ts src/lib/opencode-commands.ts src/lib/opencode-v2-policies.ts src/lib/lane-check.ts lib/dispatch-route.js lib/agent-dialects.js lib/opencode-commands.js lib/opencode-v2-policies.js lib/lane-check.js
git commit -m "refactor(lib): leaf modules in TypeScript"
```
