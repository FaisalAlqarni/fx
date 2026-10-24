# Task 05 review: plant roles in TypeScript

Range fb0eacf..af521fb, one commit.

### Spec Compliance

- src/lib/env.ts: parseFxEnv covers CODEX_HOME only and returns undefined for unset or empty. Matches the brief. No ` as ` in the file (checked).
- src/lib/env.test.ts: the two required cases plus an unset case. Exact.
- src/lib/plant-roles.ts: same 12 export names as the old module.exports block. I loaded the old file from `git show fb0eacf:lib/plant-roles.js` and the new build side by side: export key sets equal, READ_ONLY_AGENTS equal. I planted both into scratch homes under /tmp/rv05 (never ~/.codex): `diff -r` is empty, and a second plant reports everything skipped (idempotent).
- os.tmpdir() is kept in identityDir. Only the CODEX_HOME reads go through parseFxEnv (plantRoles, auditRoles, identityDir).
- src/lib/types.ts: CodexRole, PlantReport and AuditReport added; the five wrong comment paths fixed (the brief named one; fixing all five is in scope for "while you are in the file").
- scripts/check-all runs `node lib/env.test.js`.
- lookupAgentIdentity narrowing: for any record with a string agentType the result is unchanged. A record whose agentType is a truthy non-string used to be returned and now reads as null. The only caller (hooks/fx-codex.js:151) feeds the result to isReadOnlyAgent, which already requires a string, and null refuses the write. So the change fails closed and is safe. Writing side is consistent: recordAgentIdentity stores whatever it is given, lookup rejects non-strings.
- The `export =` ruling from the controller is sound. esbuild turns named exports into getter-only properties, and tests/gates/codex-hook-output.test.js replaces isWritingToolCall on the cached module; with getters that assignment would silently do nothing. `export =` emits a plain `module.exports = {...}` (lib/plant-roles.js tail), the same shape as before. It does not touch the escape gate (no `any`, no cast), and tsc strict still types every member. Consumers in later tasks must use `import x = require(...)`, which is normal for CommonJS.
- Consumer tests: not re-run, per instruction. The report lists them green and the planted output and runtime shapes are identical, so I found no reason to doubt it.
- RED: `Cannot find module './env.js'` is a real failure for a missing module, valid for a first-consumer task. No output noise in the diff.
- ⚠️ Unverified by me: scripts/check-all green and the install and conformance runs (not re-run by instruction).

### Strengths

- Behaviour-preserving port: the allowlist logic, flag specs and parser are line-for-line the same, with `charAt` and `?? ''` replacing indexed access in a way that keeps results identical for in-range indices.
- Fail-closed paths kept: uid() throws the same TypeError the old `process.getuid()` did, inside the same try blocks.
- `isWritingToolCall` and `isWritingBashCommand` take `unknown` and narrow without casts.
- The `export =` reason is written in a comment at the point of use.
- Scratch-plant comparison was done before and after, as the brief asked.

### Issues

#### Critical

None.

#### Important

None.

#### Minor

- src/lib/plant-roles.ts (23 lines) · the ported comments carry em dashes · Global Constraints say no em or en dashes in any file or comment; check-prose does not scan src so no gate fires · replace them with commas or colons when next touching the file (the old lib/plant-roles.js had the same 23, so this is inherited, not new).
- src/lib/plant-roles.ts:1 · header still says "Task 06" and "lib/plant-roles.js" as the tested file · stale text moved verbatim into a new source file · reword to the module's purpose.
- src/lib/types.ts:48 · CodexRole has no user yet and nothing checks that it matches the toml fields gen-codex-agents writes (name, description, sandbox_mode, developer_instructions; I confirmed the four fields at scripts/gen-codex-agents:79-83) · acceptable because task 06 consumes it, but plantRoles itself still copies raw files rather than using typed role definitions · task 06 should use it or drop it.
- src/lib/plant-roles.ts recordAgentIdentity · `agentType?: string | null` while the hook passes untyped `input.agent_type` · the hooks task will need to narrow before calling · note for the hooks migration.

### Assessment

The port is faithful. Old and new builds plant byte-identical files into scratch homes, exports and shapes match, the getter-only export problem is handled correctly and does not weaken types or the escape gate, and the one narrowing in lookupAgentIdentity is stricter in the safe direction. No security or silent-failure tripwire was missed: the symlink and header guards, the 0700 identity directory and the fail-closed lookups are all preserved. Spec met, quality approved.

## Ledger lines

Task 05: minor (deferred): plant-roles.ts keeps 23 em dashes in comments inherited from the JavaScript; no gate scans src.
Task 05: minor (deferred): plant-roles.ts header comment still says Task 06 and names lib/plant-roles.js as the tested file.
Task 05: minor (deferred): CodexRole in types.ts is unused until task 06 and plantRoles does not use typed role definitions.
Task 05: minor (deferred): recordAgentIdentity takes agentType as string or null; the hooks migration must narrow the hook payload before calling.
