# fx sources move to TypeScript

**Date:** 2026-10-22
**Status:** ready-for-agent
**Approved:** 2026-10-22
**Glossary:** none (fx has no `CONTEXT.md`); no terms added

## Problem Statement

fx's runtime code is about 11,000 lines of hand-written JavaScript across 118 tracked files: the Claude Code and Codex hooks, the two opencode plugins, `lib/`, scripts, tests and gates. Nothing checks the shape of what flows through it. Hook payloads, `.fx.json`, plan-state files and opencode events are read by field name, so a renamed or missing field silently changes behaviour; in a guard, that can mean a command is allowed that should not be. The owner also plans three more sub-projects (a judge client with three new hooks, a browser agent, then the Python and bash tooling) and wants all of them written in one typed language from the start.

This is sub-project 1 of 4. It adds no features.

## Solution

Every fx JavaScript file gets a TypeScript source under `src/`, at the same relative path. A build step compiles each source back to the exact path, module format and file name the harnesses load today, and the generated JavaScript is committed. Users install nothing new and still need only Node; harness manifests, the opencode installer, `.fx.json` consumers and every path a skill names stay unchanged. Strict type checking, typed parsers at every trust boundary, and drift and no-`any` gates keep it that way.

## User Stories

1. As the fx author, I want every fx runtime file written in TypeScript with `strict` on, so that a wrong field name in a hook payload or config fails the build instead of changing a decision.
2. As the fx author, I want external input (hook stdin, opencode events, `.fx.json`, plan-state files, environment) parsed from `unknown` by one small function each, so that a malformed payload is handled exactly as today and never cast into a type it does not have.
3. As an fx user on Claude Code, Codex, opencode 1.x or 2.x, I want fx to install and behave exactly as before, so that the migration costs me nothing.
4. As an fx user, I want no new runtime dependency and no build step on my machine, so that a clone or plugin install keeps working with Node alone.
5. As the fx author, I want one command that builds every generated file, so that editing a source and rebuilding is the whole loop.
6. As the fx author, I want `check-all` to fail when a generated file drifts from its source, so that a hand edit or a forgotten rebuild cannot ship.
7. As the fx author, I want `check-all` to fail on `any`, `as any`, `@ts-ignore` and `@ts-expect-error` in sources unless the line carries a `ts-gate-ok: <reason>` comment, so that strictness cannot erode quietly.
8. As the fx author, I want `check-all` to fail on any hand-written JavaScript outside an explicit allowlist, so that the migration stays complete.
9. As the fx author, I want the three hooks to produce byte-identical output for a recorded set of payloads before and after migration, so that harness-visible behaviour is proven unchanged beyond what the gates cover.
10. As the fx author running fx-implement on fx itself, I want `test_one` and `test_scope` to accept a changed `src/**/*.ts` path and run the right built test, so that fx's own loop keeps working.
11. As the fx author, I want the brainstorm companion server proven to start and answer after migration, so that a break in a file no gate exercises today is caught.
12. As the fx author, I want the eval fixtures left as JavaScript, so that review-bench and fixture-build scores stay comparable with past runs.
13. As a contributor, I want a short note saying where sources live, how to build, and that generated files are never edited, so that I do not edit the wrong file.

## Implementation Decisions

**Sources and output.** Sources live under `src/`, mirroring the repo. The build writes to today's paths:
- hooks, `lib/`, tests, gates and script helpers compile to `.js` as CommonJS, as today;
- the two opencode plugins and the package entry compile to `.js` as ESM, as today;
- the three extensionless node scripts (build cost, test scope, compile brief) compile to extensionless files with the executable bit kept;
- the brainstorm server compiles to `.cjs`; the brainstorm browser helper compiles to a browser IIFE.

**Build.** One bash command, `scripts/build` (bash so no hand-written JavaScript remains; sub-project 4 moves it to TypeScript). It runs esbuild once per format group, **file by file, never bundling**, because the plugins, hooks and the opencode installer's `node -e` bootstrap require `lib/` modules by literal `.js` path. Target `node20` (the lowest Node in use). Shebangs kept. Every generated file starts with `// generated from src/<path> by scripts/build: edit there, not here`.

**Type checking.** `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true` and `noEmit`, over `src/`. `@types/node` for builtins. `tsc --noEmit` is a new `check-all` gate.

**Trust boundaries.** Every input from outside the process enters as `unknown` and passes through one parse function that checks only the fields fx reads and returns a typed value or a typed failure. Planned parsers: Claude Code hook input, Codex hook input, opencode plugin events, `.fx.json`, plan state, and the environment. No `as` casts at these boundaries and no validation library (it would become a runtime dependency). On malformed input each parser reproduces today's behaviour.

**Internal types.** Shared types (hook decisions, lane names, plan state, Codex role definitions) live in one module. Each harness's output format is its own type, so an adapter cannot return another harness's shape. Harness types are hand-written and cover only fields fx reads and writes; no harness SDK type packages, so a harness release is not a typing chore. The free conformance runs catch real field renames.

**Dependencies.** `package.json` gains `devDependencies` (esbuild, typescript, @types/node; exact versions) and a committed `package-lock.json`. No `dependencies`. `node_modules/` is already ignored. opencode's git-spec install (Bun) installs `dependencies` only, so it is unaffected.

**Gates added or extended.**
- Type check: `tsc --noEmit`.
- No-escape gate: fails on `any`, `as any`, `@ts-ignore`, `@ts-expect-error` in `src/` unless the line carries `ts-gate-ok: <reason>`.
- `check-generated` gains a second block: build into a temporary directory and diff against the committed output, as it already does for `codex/agents`.
- Hand-written JavaScript gate: every tracked `.js`, `.cjs` or extensionless node script either carries the generated header or is on an explicit allowlist (the eval fixtures and vendored Mermaid).

**Migration order.** Tests are the oracle, so they move last. Each step is its own commit and ends with `check-all` green:
1. Toolchain end to end (build, tsconfig, devDependencies and lockfile, the new gates, the drift block) proven on the smallest module, the user-invoked lanes list.
2. `lib/` leaves: modules that require no other fx module (dispatch route, agent dialects, opencode commands, opencode v2 policies, lane check).
3. `lib/` core: git guard, then plan state, preamble, plant roles.
4. Hooks: context, pretooluse, Codex. Hook payload parsers are defined here. Before this step, record each hook's output for a payload set (SessionStart, PreToolUse allow and deny, Codex events, malformed payloads); after it, outputs must be identical.
5. The two opencode plugins and the package entry.
6. Scripts: build cost, test scope, compile brief; the conformance helpers (events, openrouter, MCP probe server, opencode provider merge); review-bench tooling (build case, fill template, score); lane-triggering verdict; fixture-build implementer heads.
7. Brainstorm companion server and browser helper, plus a new start-and-request check, because nothing exercises the server today.
8. Tests: the `lib/` tests, the 29 gate tests and the remaining tests, in batches, each green before and after.

**fx's own loop.** `.fx.json` `test_one` and `test_scope` gain the build step. The test-scope script maps a changed `src/**/*.ts` path to its built file; its own test covers the mapping (in JavaScript first, migrated in step 8).

**Documentation.** A new ADR records that fx sources are TypeScript with committed generated JavaScript, why (types at trust boundaries, users still need only Node), the file-by-file rule, the fixture exclusion and sub-project 4. ADR 0028 is amended: its Codex build step now has a sibling. A short contributor note (edit `src/`, run `scripts/build`, never edit generated files). The package entry's "CommonJS on purpose" comment moves to its source and still holds.

**Failure handling.** One commit per step; a failure stops at the step that broke and reverting that commit restores the last green state. No step deletes a test or weakens a gate: if a gate fails because of the migration, the code is fixed.

## Testing Decisions

- **Confirmed seam:** the existing one. `scripts/check-all` before and after each step, which already runs every test as `node <file>`, the install runs and the free conformance runs on all four harnesses. No new test seams.
- **Added checks at that seam:** the type check, the no-escape gate, the generated drift block, the hand-written JavaScript gate, the recorded hook-output comparison (step 4), the brainstorm server start check (step 7), and a clean-clone `npm ci && scripts/build` reproducing the committed output byte for byte.
- **Good test here:** observable behaviour only: what a hook prints for a payload, what a gate reports, what the installer writes. Not the shape of the generated JavaScript, which will differ from the hand-written files.
- **Prior art:** `check-generated` already diffs a fresh generation of `codex/agents` against the committed tree; `tests/gates/codex-hook-output.test.js` already asserts hook output.

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

## Out of Scope

- Python and bash tooling (check gates, generators, opencode installer): sub-project 4.
- The judge client and the guard, Stop evidence and stuck-loop hooks: sub-project 2.
- The browser agent: sub-project 3.
- TypeScript variants of the eval fixtures: a later sub-project with its own baseline.
- Version bump, release and merge: the owner's decisions.
- Switching CommonJS modules to ESM.

## Open Questions

None.

## Further Notes

- Sub-project order: 1 TypeScript migration (this), 2 judge client plus guard, Stop evidence check and stuck-loop tracker, 3 browser agent (jev-ultrafast's loop, reusing an installed Playwright or puppeteer library, falling back to fx's own Chrome DevTools protocol driver), 4 Python and bash tooling to TypeScript. v1 ships when 1 to 3 are done.
- Research behind sub-projects 2 and 3: `/development/promots/jev-research.md` and `/development/promots/jev-adapt-for-fx.md`.
- The inventory behind this design (118 files, their invokers and references) was taken on 2026-10-22 against the fx main checkout.
