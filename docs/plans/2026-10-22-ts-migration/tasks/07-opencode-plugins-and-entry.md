# 07: opencode plugins and package entry in TypeScript

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** Core

**What to build:** the opencode 1.x and 2.x plugins and the package entry that picks between them are written in TypeScript and generated as ESM at today's paths. Events the plugins receive from opencode are parsed from `unknown`. Installs by symlink (`scripts/fx-opencode-install`) and by git spec (`index.js` as `main`) keep working.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/plugins/fx-opencode-v1.ts`, `src/plugins/fx-opencode-v2.ts`, `src/index.ts`
- Create: `src/lib/opencode-input.ts` (`parseOpencodeToolEvent`), `src/lib/opencode-input.test.ts`
- Modify: `plugins/fx-opencode-v1.js`, `plugins/fx-opencode-v2.js`, `index.js` (now generated, ESM)
- Modify: `src/lib/types.ts` (opencode output and event types), `lib/types.js` (generated)
- Modify: `scripts/check-all` (run `node lib/opencode-input.test.js`)

**Interfaces:**
- Consumes: lib exports from tasks 02 to 05, loaded the way today's plugins do (`createRequire(import.meta.url)` and `require('../lib/<name>.js')` by literal path), so the symlinked `fx.js` still resolves `../lib/` against the repo. Each `require` is typed as `typeof import('../lib/<name>.js')`; loads inside a `try` today stay inside it (plan.md ruling).
- Produces: `parseOpencodeToolEvent(raw: unknown) -> { ok: true, value: OpencodeToolEvent } | { ok: false, reason: string }` holding the fields the plugins read for `tool.execute.before` (v1) and `ctx.tool.hook("execute.before")` (v2).
- Produces: `src/index.ts` stays self-contained (no import from `lib/`) and keeps its selection rule: `FX_OPENCODE_MAJOR`, else `opencode --version`. The header comment explaining why `package.json` has no `type` field moves into `src/index.ts`; esbuild drops ordinary comments, so the generated `index.js` carries only the generated header.

**Seam:** the existing plugin gates and opencode install runs, unchanged, plus free conformance on both opencode majors.

**Tests:**
- Existing, unchanged: `node tests/gates/opencode-plugin.test.js`, `node tests/gates/opencode-v2-plugin.test.js`, `node tests/gates/user-invoked.test.js`, `node tests/gates/opencode-v2-agent.test.js`: exit 0. `bash tests/install/run.sh opencode` and `bash tests/install/run.sh opencode-v2`: exit 0. `bash tests/conformance/run.sh opencode --free` and `bash tests/conformance/run.sh opencode-v2 --free`: exit 0.
- `parseOpencodeToolEvent`: input `{"tool":"bash","args":{"command":"ls"}}` (use the exact field names the v1 plugin reads today) returns `ok: true` with the tool name `"bash"`; input `42` returns `{ ok: false, reason: "opencode event is not an object" }`.
- v1 failed load: from a scratch copy of `plugins/` and `lib/` with `lib/git-guard.js` replaced by `throw new Error('load')`, the v1 plugin's `tool.execute.before` on a `git push --force origin main` call behaves exactly as recorded from the current v1 plugin under the same copy (today it rejects; record the rejection message).
- Entry selection, recorded from the current `index.js` first and asserted after: with `FX_OPENCODE_MAJOR=2`, `const m = await import('./index.js')` gives a `m.default` that is an object with an `id` field and a `setup` function (the v2 shape); with `FX_OPENCODE_MAJOR=1`, `m.default` is a function (the v1 shape). Run under the local Node (20.20 or later); the check fails on a Node that cannot detect `index.js` as ESM.

**Risks:** ESM output from esbuild for files that call `createRequire` must keep `import.meta.url`; target `node20` with format `esm` does. `index.js`'s top-level `await import` must survive. Node prints a warning reparsing `index.js` as ESM today; that warning is expected and unchanged.

**Testing:** unit parser, existing gates, install runs, free conformance on opencode 1.x and 2.x, `scripts/check-all`.

## Acceptance criteria
- [ ] Both plugins and `index.js` are generated ESM with the generated header.
- [ ] Every command in the Tests field passes with no test file changed.
- [ ] A symlink install into a scratch opencode config loads the generated plugin (covered by the install runs).

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the parser tests**
- [ ] **3. Run them: verify RED**

Run: `scripts/build && node lib/opencode-input.test.js`
Expected: fails because the parser does not exist.

- [ ] **4. Implement the parser, then port both plugins and the entry**
- [ ] **5. Run: verify GREEN**

Run: `scripts/build && node lib/opencode-input.test.js && node tests/gates/opencode-plugin.test.js && node tests/gates/opencode-v2-plugin.test.js && bash tests/install/run.sh opencode && bash tests/install/run.sh opencode-v2`
Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/check-all` (tracked background command; it runs both opencode install runs and both `--free` conformance runs)

- [ ] **7. Commit by path**

```
git add src/plugins/fx-opencode-v1.ts src/plugins/fx-opencode-v2.ts src/index.ts src/lib/opencode-input.ts src/lib/opencode-input.test.ts src/lib/types.ts lib/types.js plugins/fx-opencode-v1.js plugins/fx-opencode-v2.js index.js lib/opencode-input.js lib/opencode-input.test.js scripts/check-all
git commit -m "refactor(opencode): plugins and entry in TypeScript"
```
