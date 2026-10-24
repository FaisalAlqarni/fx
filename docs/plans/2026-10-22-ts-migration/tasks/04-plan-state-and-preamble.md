# 04: Plan state and preamble in TypeScript

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** the preamble every session and subagent receives, and the plan-state scan it embeds, are written in TypeScript. The two inputs they read from disk get parsers: plan-state files and `.fx.json`. The rendered preamble is identical for every harness.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/lib/plan-state.ts`, `src/lib/preamble.ts`
- Create: `src/lib/fx-json.ts` (`parseFxJson`)
- Create: `src/lib/fx-json.test.ts` (new test, TypeScript from the start)
- Modify: `lib/plan-state.js`, `lib/preamble.js` (now generated); `lib/fx-json.js`, `lib/fx-json.test.js` (generated)
- Modify: `src/lib/types.ts` (plan-state shape, harness names), `lib/types.js` (generated)
- Create: `tests/gates/fixtures/plan-state/` (scratch-free fixture directories for the plan-state cases and the preamble renders)
- Modify: `scripts/check-all` (run `node lib/fx-json.test.js`)

**Interfaces:**
- Produces: `plan-state`: `describePlans`, `scan`, `standingRulings`, `rulingsFor` (same shapes as today). Its file reads go through a parser returning the typed plan state or the same fallback today's code takes on an unreadable or malformed file.
- Produces: `preamble`: `render({ harness, cwd, subagent }) -> string`, `HARNESSES`.
- Produces: `parseFxJson(raw: unknown) -> { ok: false, reason: string } | { ok: true, value: Partial<FxJson>, problems: { key: string, reason: string }[] }`. `FxJson` holds the keys fx reads: `stacks`, `test_one`, `test_scope`, `test_all`, `setup`, `lint`, `coverage`, `coverage_floor`, `companions`. Each key is validated on its own: a bad key is left out of `value` and listed in `problems`, so it fails only that key's consumer. `ok: false` only when the input is not an object. The preamble reads `companions` through it; compile brief keeps its own read (task 08).

**Seam:** the existing preamble and plan-state tests, unchanged, plus the new parser test.

**Tests:**
- Existing, unchanged: `node lib/plan-state.test.js` exit 0; `node lib/preamble.test.js` exit 0; `node tests/gates/codex-hook-output.test.js` exit 0.
- New `parseFxJson`:
  - input `{"stacks":["rails"],"test_one":"x {file}","test_all":"make test"}`: `{ ok: true }` with `value.stacks` equal to `["rails"]` and `value.test_all` equal to `"make test"`.
  - input `{"stacks":"rails","companions":"X"}`: `{ ok: true }`, `value.companions` equal to `"X"`, `value.stacks` equal to `undefined`, `problems` equal to `[{ key: "stacks", reason: "stacks must be an array of strings" }]`.
  - input `null`: `{ ok: false, reason: ".fx.json is not an object" }`.
  - input `{"lint":null}`: `{ ok: true }` with `value.lint` equal to `null` and `problems` empty.
- Plan-state parser: for each fixture directory, `describePlans` output after the port equals the output recorded from the current JavaScript before it: (a) one plan with a well-formed `state.md`; (b) a `state.md` whose status line is malformed; (c) a plan directory with no `state.md`; (d) a `state.md` that cannot be read (mode `000`, skipped where the test runs as root).
- Preamble equivalence: for each harness in `HARNESSES` and `subagent` true and false, `render` with `cwd` set to fixture (a) returns the same string before and after (record the eight strings from the current JavaScript first). A fixed fixture, not this repo, because this build changes the repo's own plan state.

**Risks:** preamble requires plan state by the extensionless specifier `./plan-state`; keep it. The preamble is injected into every subagent; one changed character changes every session, which is why the equivalence check exists. For every `.fx.json` today's code renders from, the parser must lead to the same rendered output.

**Testing:** unit (parser), equivalence (render), existing tests, `scripts/check-all`.

## Acceptance criteria
- [ ] The eight recorded preamble renders are identical after migration.
- [ ] Existing tests pass with no test file changed.
- [ ] `node lib/fx-json.test.js` runs in `scripts/check-all`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Create the plan-state fixtures and record the eight preamble renders and the four `describePlans` outputs from the current JavaScript**
- [ ] **3. Write the `parseFxJson` tests**
- [ ] **4. Run them: verify RED**

Run: `scripts/build && node lib/fx-json.test.js`
Expected: fails because `parseFxJson` does not exist.

- [ ] **5. Implement the parser, then port plan state and preamble**
- [ ] **6. Run them: verify GREEN, then compare the eight renders**

Run: `scripts/build && node lib/fx-json.test.js && node lib/plan-state.test.js && node lib/preamble.test.js`
Expected: PASS; renders identical.

- [ ] **7. Run the scope**

Run: `scripts/check-all` (tracked background command; the preamble reaches every hook and plugin)

- [ ] **8. Commit by path**

```
git add src/lib/plan-state.ts src/lib/preamble.ts src/lib/fx-json.ts src/lib/fx-json.test.ts src/lib/types.ts lib/types.js tests/gates/fixtures/plan-state lib/plan-state.js lib/preamble.js lib/fx-json.js lib/fx-json.test.js scripts/check-all
git commit -m "refactor(lib): plan state and preamble in TypeScript, .fx.json parser"
```
