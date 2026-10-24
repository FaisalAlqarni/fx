# fx sources move to TypeScript: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** every hand-written fx JavaScript file gets a strict TypeScript source under `src/`, compiled back to the exact path and module format the harnesses load today, with no behaviour change and nothing new for users to install.
**Architecture:** Task 01 first spikes the esbuild and TypeScript behaviours the plan relies on, then lands the toolchain (`scripts/build`, `tsconfig.json`, pinned dev dependencies, type check, no-escape gate, a drift and file-mode block in `check-generated`, `src/` path mapping in `scripts/test-scope` and `test_one`, the one authorized version bump) and proves it on the smallest module. Tasks 02 to 10 migrate runtime code in dependency order (lib leaves, git guard, plan state and preamble, plant roles, hooks with a recorded-output comparison, opencode plugins, scripts, eval tooling, brainstorm companion) while every existing JavaScript test stays untouched as the oracle. Tasks 11 to 13 then migrate the tests and close with a gate that rejects any hand-written JavaScript outside the fixture allowlist.
**Stack:** TypeScript (strict), esbuild (file by file, no bundling), Node 20 target, CommonJS and ESM preserved per file, Bash for `scripts/build` and the gates.
**Complexity:** High
**Risks:**
- HIGH: an export shape changes under esbuild's CommonJS output (every `lib/` module today ends in `module.exports = { ... }`, consumed by `require` and by the opencode plugins through `createRequire`): sources use named ES exports of the same names; the untouched JavaScript tests and the install runs fail on any missing or renamed export.
- HIGH: a guard that fails to load stops guarding: today the hooks and plugins load the git guard, lane check and dispatch route inside `try` blocks (a broken guard denies, broken advice passes through); a hoisted `import` would move the load outside the `try` and turn a load failure into exit 1, which Claude Code treats as allow. Tasks 06 and 07 keep those loads as typed `require` calls inside their `try`, and the golden gate records the failed-load behaviour before the port.
- HIGH: hook output changes in a way no gate checks: task 06 records each hook's output for a payload set on the current JavaScript before migrating, and requires identical output after.
- MEDIUM: a parser at a trust boundary is stricter or looser than today's field reads: each parser's malformed-input cases are part of task 06's recorded payloads and of task 07's plugin tests, and must reproduce today's behaviour.
- MEDIUM: the brainstorm server breaks unseen (no gate exercises it today): task 10 adds a start-and-request check before migrating it.
- MEDIUM: `scripts/test-scope` gets `src/` paths it cannot route: task 01 adds the mapping first, and every `src/` path also runs the type, escape and drift gates. Core tasks run `scripts/check-all` as their scope.
- MEDIUM: esbuild and TypeScript behave differently than the plan assumes (export annotations, `import.meta`, top-level `await`, banners and shebangs): task 01 spikes each before building on it.
**Testing:** Unit: the existing `node` tests beside `lib/`, `scripts/` and `skills/fx-implement/scripts/`, untouched until tasks 11 to 13 · Gates: `tests/gates/*` and the new toolchain gates through `scripts/test-scope` · Integration: `scripts/check-all`, which runs the install runs and the free conformance runs on Claude Code, Codex, opencode 1.x and 2.x · Equivalence: recorded hook outputs (task 06), clean-clone reproducible build (task 13).

## Global Constraints

- Users need Node only; no runtime `dependencies` in `package.json`.
- Generated JavaScript targets `node20`.
- Every path referenced by `hooks.json`, the Codex manifest, the opencode installer, `index.js` consumers, `.fx.json` and skills stays byte-identical.
- Module format per file is unchanged: CommonJS stays CommonJS, ESM stays ESM.
- Compile file by file; never bundle.
- `strict: true` and `noUncheckedIndexedAccess: true`; no `any`, `as any`, `@ts-ignore`, `@ts-expect-error` without `ts-gate-ok: <reason>`.
- External input enters as `unknown` and is parsed; no `as` casts at trust boundaries; no validation library.
- Eval fixtures stay JavaScript: review-bench cases and `good/` tree, fixture-build traps and seed, the lens-pipeline worker. Vendored Mermaid stays as is.
- Tests move only after all code they cover is migrated and green.
- Each migration step is one commit with `check-all` green.
- No em or en dashes in any file, comment or commit message; no attribution trailers.
- Nothing is pushed, merged or released by the agent.

## Standing rulings for this build

- Ruling: the owner authorized one version bump for this build, from the current version to 0.3.0 in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `package.json`, made in task 01 so `tests/gates/release-version.test.js` can pass from then on. Releasing stays the owner's decision.
- Ruling: a load guarded by `try` today stays a runtime `require` inside its `try`, typed as `typeof import('<path>')`. Never convert a guarded load to a hoisted `import`.
- Ruling: ported comments are rewritten where they carry em or en dashes; the no-dash constraint applies to sources.
- Ruling: the design's fixture allowlist names only Mermaid as vendored; the two vendored Tailwind play files (`references/vendor/tailwindcss-play-3.4.17.js`, `docs/plans/_assets/tailwindcss-play-3.4.17.js`) are equally vendored and are allowlisted in task 13. This is a design amendment by red-team finding 11.
- Ruling: tasks that edit the shared files `src/lib/types.ts` and `scripts/check-all` are serialized by their blocking edges (02 to 07, then 10); no two of them run at once.

- Ruling: the design says 29 gate tests; `tests/gates/` holds 26 `.test.js` files (counted 2026-10-22). Task 12 migrates the 26; the design's figure is a counting slip, not missing scope.

- Ruling: a migrated file's generated JavaScript is committed in the same commit as its source; the hand-written `.js` it replaces is overwritten, never kept beside it.
- Ruling: no task edits an existing test's assertions before tasks 11 to 13. If a migration makes an existing test fail, the migrated code is wrong.
- Ruling: `scripts/check-all` runs the free conformance rows, which need the four harness CLIs installed; a task whose scope run reaches `check-all` runs it as one tracked background command.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Toolchain proven on the first module | none | behaviour spike; build, type check, no-escape gate, drift and mode check, `src/` routing, version 0.3.0, ADR; `lib/user-invoked-lanes` in TypeScript | MVP |
| 02 | lib leaves in TypeScript | 01 | dispatch route, agent dialects, opencode commands, opencode v2 policies, lane check | Core |
| 03 | git guard in TypeScript | 02 | `lib/git-guard` | Core |
| 04 | Plan state and preamble in TypeScript | 03 | `lib/plan-state` with its file parser, `lib/preamble` | Core |
| 05 | Plant roles in TypeScript | 04 | `lib/plant-roles` with typed Codex role definitions | Core |
| 06 | Hooks in TypeScript, output proven identical | 02, 03, 04, 05 | recorded hook outputs; three hooks; Claude Code and Codex input parsers; harness output types | Core |
| 07 | opencode plugins and package entry in TypeScript | 06 | both plugins and `index.js` as ESM; opencode event parser | Core |
| 08 | Node scripts in TypeScript | 01 | build cost, test scope, compile brief (extensionless, executable) | Hardening |
| 09 | Eval and conformance tooling in TypeScript | 01 | conformance helpers, review-bench tooling, lane-triggering verdict, fixture-build implementer heads | Hardening |
| 10 | Brainstorm companion in TypeScript | 07 | start-and-request check; server (`.cjs`) and browser helper (IIFE) | Hardening |
| 11 | lib and script tests in TypeScript | 06, 08 | `lib/*.test.js`, build cost, test scope and compile brief tests | Polish |
| 12 | Gate tests in TypeScript | 06, 07, 08, 10 | the 26 `tests/gates/*.test.js` | Polish |
| 13 | Remaining tests and the hand-written JavaScript gate | 09, 11, 12 | conformance, review-bench, lane-triggering and fixture-build tests; allowlist gate; clean-clone reproducibility | Polish |

Phases ship independently: each ends with `scripts/check-all` green and every generated file matching its source. After MVP the toolchain exists with one module migrated; after Core all runtime code a harness loads is TypeScript; after Hardening every script is; after Polish nothing hand-written remains outside the allowlist.
