# Task 01 review: system-flow CLI, model schema, fragment merge and the fixture

Range 0749988..8b4284f.

### Spec Compliance
- ✅ Spec compliant. Every file, interface, exact message and test case in the brief is present; the error forms (`<file>:<pointer>: <message>`, `system-flow: usage:`, `system-flow: check: ...`) match ruling 8; `git init -b main` (ruling 1) and evidenced test data (ruling 2) are in place; the validator skips the annotation keywords (ruling 13) and throws on others (concern 3 ruling). No new dependency.
- ⚠️ Cannot verify from the diff: `scripts/check-all` has not run green (report says check-prose failed on a task 07 plan file, which ruling "task 01 concern 1" says the controller already reworded). The 54 per-command runs are the report's claim only.

### Strengths
- The RED table shows genuine missing-behavior failures per cycle, and the report discloses the tests written after code.
- Schema is a single copy with `additionalProperties: false` everywhere and the id pattern on every declared id, `folder` and `meta.roots[].id` (skills/fx-system-flow/system-model.schema.json `$defs/id`).
- Tests run the real CLI as a process, assert exact stderr lines, and cover edges beyond the brief (null/array fragment, missing meta.json, default root from a subfolder, store id across tables).
- No handler swallows a failure: invalid JSON becomes a reported problem (src/lib/sf-model.ts:1312 region, `loadFragments` catch), the top-level catch prints and exits 1 (src/scripts/system-flow.ts:1747).
- No duplicate of an existing helper: no other validator exists in src/lib.

### Issues
#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. `additionalProperties: false` is bypassed by inherited property names, and the merge can then pollute `Object.prototype`.
   - src/lib/sf-schema.ts:1454-1457 (`const ps = props[k]; if (ps) ...`) looks up `props[k]` on a plain object. A key such as `constructor`, `toString` or `__proto__` resolves to an inherited, truthy value, so it is walked against a non-schema and passes with no error instead of `property <k> not allowed`. I ran `validate({type:'object',additionalProperties:false,properties:{a:{type:'string'}}}, {constructor:1})` and the same with `JSON.parse('{"__proto__":{"x":1}}')`: both return `[]`.
   - src/lib/sf-model.ts:1334-1341 (`mergeInto`) then reads `into['__proto__']` (Object.prototype, an object) and recurses into it, so a fragment with a top-level `"__proto__": {...}` writes keys onto `Object.prototype` inside the CLI. Same bypass applies to `required` via `k in v` (sf-schema.ts:1452).
   - Why it matters: the brief's acceptance criterion says every keyword is enforced, and fragments are written by agents from repository content.
   - Fix: use `Object.hasOwn(props, k)` for the property lookup, `Object.hasOwn(v, k)` for `required`, and skip or reject `__proto__` in `mergeInto`. Add a test for `{ constructor: 1 }` on a node.

#### Minor (Nice to Have)
1. src/lib/sf-model.ts:1317-1320: the newer-`schemaVersion` check runs only when schema errors are empty. A real version 2 fragment will likely carry keys unknown to version 1, so the user gets `property x not allowed` lines instead of the version message. Check the version first.
2. src/lib/sf-model.ts:1288: `ID_PATTERN` is a second copy of the pattern in the schema, and no test ties them together, against the "one copy of the format" intent. Read it from the schema or assert equality in the test.
3. Formatting: misindented lines in the schema at `rule.adr` (diff line 1139), `bullet.evidence` (1189) and `question.recommended` (1201), and the `isObject` arrow in src/lib/sf-schema.ts:1473.
4. `isObject` is defined twice (src/lib/sf-model.ts:1342 and src/lib/sf-schema.ts:1473); export one.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** The task meets its brief and tests, but the validator's property lookup lets inherited names such as `constructor` and `__proto__` through `additionalProperties: false`, and the merge then writes onto `Object.prototype`; this is a small fix and should land before later tasks build on the validator.

## Ledger lines
Task 01: minor (deferred): newer schemaVersion check runs only after schema errors are empty, so a v2 fragment with new keys reports property errors instead of the version message
Task 01: minor (deferred): ID_PATTERN in sf-model.ts duplicates the schema pattern with no test tying them together
Task 01: minor (deferred): misindented lines in system-model.schema.json (rule.adr, bullet.evidence, question.recommended) and the `isObject` arrow in sf-schema.ts
Task 01: minor (deferred): isObject helper defined twice in sf-model.ts and sf-schema.ts
