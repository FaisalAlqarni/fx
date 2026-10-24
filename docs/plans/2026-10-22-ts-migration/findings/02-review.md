# Task 02 review: lib leaves in TypeScript

### Spec Compliance

Compliant. Files list matches: five sources under src/lib/, LaneName and DispatchRoute added to src/lib/types.ts, five generated lib files carry the generated header. lib/types.js is unchanged, which is correct because the new exports are types only and the committed file is the same build output.

- Named exports: route, toOpencodeAgent, toOpencodeV2Agent, splitFrontmatter, field, opencodeCommands, GUARD_POLICIES, laneCheck all exist in the generated CommonJS (lib/agent-dialects.js:60-67 and 174-180, lib/dispatch-route.js:222-226, lib/lane-check.js:304-308, lib/opencode-commands.js:577-581, lib/opencode-v2-policies.js:719-723). I imported all five from an ESM context and every name resolved, so the plugins' ESM named imports work.
- Literal specifier: src/lib/opencode-commands.ts:1090 and lib/opencode-commands.js:584 both use './agent-dialects.js'.
- Loose input: I ran the old and new route over non-object, null, empty, array, object model, non-string prompt, a prompt with a custom toString, fx: types and haiku. Old and new output was identical in every case.
- No casts: route reads unknown through the isRecord guard (src/lib/dispatch-route.ts:926-928). No `as`, `any` or ts-ignore in the five sources.
- Brief rulings: all five are process rulings (serial runs, no commits on main, TS 7.0.2, escape-gate shortcut, check-prose on findings). None is violated by this diff.
- Not verifiable from the diff: the check-all, gate and install-run results. The report states them; I did not re-run.

### Strengths

- Faithful port: comments, regexes, message text and ordering preserved. The lane-check messages were rewritten by esbuild into template literals with real newlines; the strings are identical.
- The flatMap and spread rewrite in opencode-v2-policies keeps the same order as the old concat chains (src/lib/opencode-v2-policies.ts:1193-1217).
- The two noUncheckedIndexedAccess guards are minimal and harmless.
- Shared types are small and name only what tasks 06 and 07 need.
- The report is honest about the check-prose failure in a file outside the task.

### Issues

#### Critical

None.

#### Important

None.

#### Minor

- src/lib/lane-check.ts:983 · laneCheck is typed `file: string | null | undefined, cwd: string`, but the PreToolUse hook feeds it values taken from parsed JSON, so a truthy non-string `file` still throws in path.relative exactly as before (the hook treats the throw as allow). The signature promises more than the runtime checks. · It will mislead task 04, which defines the payload parser. · Fix in task 04: parse `file` to string or null at the hook boundary, or take `unknown` here.
- src/lib/types.ts:1230 and src/lib/dispatch-route.ts:926 · DispatchInput is Record<string, unknown> and the guard accepts arrays and class instances too, so the type is a little wider than its name. · Runtime matches the old `typeof ti === 'object'` check, so no behaviour change. · Fix: none needed now; note for tasks 06 and 07.
- src/lib/opencode-commands.ts:1117 · the catch now reports String(e) for a non-Error throw where the old code printed `undefined` from `e.message`. · Strictly a behaviour change, though only for a throw that is not an Error, which fs and splitFrontmatter never produce. · Fix: none needed.
- src/lib/agent-dialects.ts:857 and :889 · return types of toOpencodeAgent and toOpencodeV2Agent are inferred, so permission is `Record<string, PermissionRule>` and the shapes are not named for the plugins and installer. · The report already notes this. · Fix when the plugins migrate in task 05.

### Assessment

Task quality: Approved

Reasoning: this is a pure port and the evidence supports it. Exports, specifier, loose-input fallbacks and message text match the removed JavaScript, and an old-versus-new differential on route showed no difference. The RED was a deliberately wrong export name, which is what the brief prescribes for a pure port. No security, database or silent-failure tripwire was missed: the lane-check best-effort catches and the route fallbacks are carried over unchanged. Only typing-precision notes remain.

## Ledger lines

Task 02: minor (deferred): laneCheck is typed string-or-null for `file` but still throws on a truthy non-string; parse at the hook boundary in task 04.
Task 02: minor (deferred): DispatchInput is a plain Record, so arrays pass the guard; matches old runtime, note for tasks 06 and 07.
Task 02: minor (deferred): opencode-commands catch prints String(e) for a non-Error throw where the old code printed undefined.
Task 02: minor (deferred): toOpencodeAgent and toOpencodeV2Agent return types are inferred, not named; name them when the plugins migrate.
