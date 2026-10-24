# fx sources are TypeScript; the generated JavaScript is committed

## Context

fx's runtime code (hooks, `lib/`, the opencode plugins, the package entry, the node scripts) was hand-written JavaScript, so the shape of a hook payload or a `.fx.json` value was checked only by the tests that happened to exercise it. TypeScript makes every input from outside the process enter as `unknown` and pass a parse function before code reads a field. fx's users install it into Claude Code, Codex and opencode, which run JavaScript with Node and nothing else, so whatever fx is written in, what ships must stay plain JavaScript with no runtime dependencies.

## Decision

Sources are TypeScript under `src/`, mirroring the paths they build to. `scripts/build` compiles them with esbuild and the generated JavaScript is committed at today's paths, so every harness, manifest and installer keeps loading the same files and users still need Node only. Each generated file carries `// generated from src/<path> by scripts/build: edit there, not here` on its first line, or its second after a shebang.

The build compiles file by file, one esbuild call per file, and never bundles: the plugins, the hooks and the opencode installer's `node -e` bootstrap require `lib/` modules by literal `.js` path, and one call per file lets each header name its own source. Each file keeps its module format, and a guarded load (a `require` inside `try`, so a plugin survives a missing module) stays a `require`.

`package.json` gains `devDependencies` (esbuild, typescript, @types/node at exact versions) and a committed `package-lock.json`, and no `dependencies`. `scripts/check-all` gains a type check (`scripts/check-types`), a gate on `any`, TypeScript suppressions and bare `JSON.parse` (`scripts/check-ts-escapes`), and a second `scripts/check-generated` block that rebuilds into a scratch directory and compares contents and executable bits with what is committed.

Eval fixtures (review-bench cases and their `good/` tree, fixture-build traps and seed, the lens-pipeline worker) and the vendored Mermaid stay JavaScript: they are inputs to measurements, not fx's code. The Python and bash tooling (check gates, generators, the opencode installer, `scripts/build` itself) moves in a later sub-project, sub-project 4.

## Consequences

Contributors run `npm ci` once, edit `src/`, run `scripts/build` and commit both. A hand edit to generated JavaScript fails `check-generated`. Migration runs one module group per commit, tests last, with `check-all` green after each. This is the sibling of ADR 0028's Codex build step: both commit generated output and gate it against a fresh build.

Status: migration complete, 2026-10-22. `scripts/check-handwritten-js` now fails any tracked JavaScript that is neither generated nor on `scripts/handwritten-js-allowlist.txt`.
