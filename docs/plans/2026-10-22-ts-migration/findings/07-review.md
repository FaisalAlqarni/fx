### Spec Compliance

I read the diff d7ce641..af9e3b6 in passes: the TypeScript sources first (parser, parser test, entry, types, check-all), then each plugin source side by side with `git show d7ce641:plugins/<file>`, then the generated output only to check headers, format and the literal requires. To compare behaviour I extracted both commits with `git archive` into a scratch directory, used a scratch HOME, and drove the old and new plugins with the same payloads through a small harness. I did not rerun the suite.

❌ One requirement from the design is not met.
- Malformed input. The design says "On malformed input each parser reproduces today's behaviour." Three malformed shapes now let a plugin grant or allow what the old plugin refused, and the report covers only one of them, `agent.general`. See Important 1 and Important 2.

✅ Matches the brief, verified:
- Both plugins and `index.js` are generated ESM at the old paths, each starting with the generated header (plugins/fx-opencode-v1.js:1, plugins/fx-opencode-v2.js:1, index.js:1).
- `createRequire(import.meta.url)` is kept. Every lib load uses a literal `'../lib/<name>.js'` path. esbuild renames the binding to `require2`, and the literal paths survive (plugins/fx-opencode-v1.js:11-75, plugins/fx-opencode-v2.js:11-219).
- Plan ruling "guarded loads stay typed require inside try": holds. Every load that sat in a `try` in the old plugins is still an inline `require` in its `try`, typed `typeof import(...)`. No guarded lib is hoisted to an `import` (src/plugins/fx-opencode-v1.ts:58-110, src/plugins/fx-opencode-v2.ts:29-90).
- `src/index.ts` imports only `node:child_process`. The selection rule is unchanged, and the "No type field on purpose" comment now lives in the source (src/index.ts:1-24). The generated `index.js` carries only the generated header.
- `parseOpencodeToolEvent` returns `{ ok: false, reason: 'opencode event is not an object' }` for non-objects (src/lib/opencode-input.ts:19). The test covers the brief's `{"tool":"bash","args":{"command":"ls"}}` and `42` cases (src/lib/opencode-input.test.ts:4-11). `node lib/opencode-input.test.js` prints one line and exits 0.
- RED: the report quotes `Cannot find module './opencode-input.js'`. That is a real RED for a parser that did not exist.
- v1 failed load: I replaced lib/git-guard.js with `throw new Error('load')` in copies of both commits. Old and new both reject `git push --force origin main` with `[fx] git guard failed to load (load). Denying every command until the plugin is repaired.`, which matches the recorded value.
- Entry selection: under Node 20.20 in both commits, `FX_OPENCODE_MAJOR=1` gives a function default and `FX_OPENCODE_MAJOR=2` gives an object with a string `id` and a function `setup`.
- `scripts/check-all` runs the new test (scripts/check-all:102). `git diff d7ce641 af9e3b6 -- tests` is empty, so no test file changed.

⚠️ Not verified by me:
- Install runs and both `--free` conformance runs. I did not rerun them.
- `check-all` after the comment amendment. The implementer ran check-all in the foreground, not as a tracked background command, and edited a comment afterwards without rerunning it. On the current tree I ran `scripts/check-generated`, `scripts/check-types` and `scripts/check-ts-escapes`, and all three print OK. esbuild drops these comments, so the generated files cannot drift from a comment edit. The tree also holds uncommitted task 06 edits, so these results are for the tree, not the commit alone.

The implementer's four listed behaviour changes, judged:
1. A failed parser load is a real change and fails closed. I tested a throwing lib/opencode-input.js and one that exports nothing. v1 refuses every tool call. v2 throws from `execute.before` on every tool event, and evaluate denies shell. This is the shape task 06 got wrong, and here it is right, because the plugins check `!parseCall` and `!parseEvent` at use (src/plugins/fx-opencode-v1.ts:263, src/plugins/fx-opencode-v2.ts:199). No test pins it. Minor 1.
2. A non-string v1 `filePath` changes nothing observable. The old code passed it to `laneCheck`, where `path.relative` throws, and the catch at src/plugins/fx-opencode-v1.ts:307-311 turns that into "no reason". The new code skips it. Both allow the write.
3. A truthy non-object `agent.general` is a real change, and it grants. Important 1.
4. v2 resource coercion is real. For edits the outcome stays "allow", but the failure notice is lost (Minor 2). For skills the same `list()` helper turns a denial into an allow. Important 2.

### Strengths
- The parser checks only the fields the plugins read, and it keeps the old falsy-to-empty semantics. Comments at the top of the parser and in its test name those semantics (src/lib/opencode-input.ts:1-3, src/lib/opencode-input.test.ts:13).
- v1 now checks `!inspect` at use as well as `typeof` at load, so an export-less git guard refuses in both plugins. I verified this with an export-less lib/git-guard.js.
- `messageOf` replaces `e.message` reads that printed `undefined` for a non-Error throw.
- The verbatim header comments survive in the TypeScript sources, and their em dashes were replaced.
- The report records before and after values for both required checks, and they reproduce.

### Issues

#### Critical
None.

#### Important

1. src/plugins/fx-opencode-v1.ts:148-153 and :197 · `applyConfig` now turns malformed config values into `{}` where the old code threw into the reported config error. · I ran old and new `config()` on three objects. With `{ agent: { general: true } }`, `{ permission: 5 }` and `{ permission: { skill: 5 } }`, the old plugin logged "config step failed" and set nothing more. The new plugin logs nothing. It overwrites the user's value, writes `general.permission.task = 'allow'`, raises `subagent_depth` to 2 and registers 5 commands. The task grant and the depth increase are permissions the old plugin never gave on this input. The design requires today's behaviour on malformed input. The report lists only `agent.general` and calls it an edge case. The `permission` and `skill` coercions are not reported, and no test covers any of the three. · Restore the old outcome: for a truthy value that is not an object (and for `permission`, not a string), throw from `applyConfig` so the existing catch reports it. Add a test that runs `config()` on these three objects and asserts that `general` and `subagent_depth` are unchanged and the config error is reported.

2. src/plugins/fx-opencode-v2.ts:181 and :200-201 · Two malformed v2 events are now allowed where the old plugin refused them. · (a) A skill event whose `resources` is a string: the old `(ev.resources || []).find` threw, and the catch at the old line 168 denied the hidden lane outright. The new `list()` wraps the string, and line 183 returns allow when the agent is in `hidden` and the effect is `allow`. Harness: old `deny`, new `allow` for `{ action: 'skill', agent: 'build', resources: '<hidden lane>', effect: 'allow' }`. (b) `execute.before` with a `null` event: the old plugin threw (a refusal), and the new one returns at line 201. For shell, evaluate still denies because nothing is recorded. For any other tool, the call now goes ahead, and if `permission.evaluate` failed to register, the refusal at line 205 never runs. The design requires today's behaviour, the report does not list either change, and no test covers them. · Keep the old shapes. For skills, deny when `resources` is not an array, as the old catch did. In `execute.before`, throw on `!parsed.ok`. Add evaluate and execute.before cases for both inputs to tests/gates/opencode-v2-plugin.test.js once tests migrate, or to a new parser-level test now.

#### Minor

1. src/plugins/fx-opencode-v1.ts:263-265, src/plugins/fx-opencode-v2.ts:199 · The new fail-closed path for a missing parser has no test. · It is correct today: both plugins refuse when the parser throws or loads with no export. Task 06 showed how easily this path flips to fail open, and the brief's failed-load check covers only git-guard. · Add a failed-load case for lib/opencode-input.js, both throwing and export-less, asserting the v1 rejection text and the v2 `execute.before` throw.

2. src/plugins/fx-opencode-v2.ts:170-171, :216-219 · Two failure notices are lost. · An edit resource that is not a string used to throw in `path.resolve`, which recorded "evaluate failed" in `failures`. `String(r)` now resolves `[object Object]` silently. `execute.after` on a `null` event used to record "forget command failed" and now records nothing. Neither changes a decision. · Keep the old notice for edits: record a failure when `r` is not a string, then skip it.

3. src/plugins/fx-opencode-v2.ts:47-48 · The comment is wrong. · It says a missing parser makes "evaluate find no command and deny the shell call". Line 199 throws on every tool event before the tool check, so every tool is refused. The report repeats the comment's claim. · Rewrite the comment to say that every tool call is refused.

4. src/plugins/fx-opencode-v1.ts:264, src/plugins/fx-opencode-v2.ts:147, :199, :225 · An export-less lib produces the message `undefined`. · `throw guardError` and `throw loadError` throw `undefined` when the module loaded without its export, and the parser messages read `(undefined)`. For preamble the old text was "render is not a function", so this message got worse. · At load, set the error when the export is not a function, as v1 already does for the guard at src/plugins/fx-opencode-v1.ts:62.

5. src/plugins/fx-opencode-v2.ts:116 · `attempt` now catches only native `Promise` rejections. · The old code caught any thenable. If a runtime hook returns a thenable that is not a `Promise` and rejects, `await attempt(...)` rejects `setup` and loses the failure record. I did not verify what opencode 2.x returns. · Restore the thenable check with a type guard such as `isThenable(r): r is PromiseLike<unknown>`.

6. src/plugins/fx-opencode-v1.ts:241, src/plugins/fx-opencode-v2.ts:105, src/lib/types.ts:131-145 · The v1 config, the v2 context and the permission events are runtime input typed by annotation, not parsed. · `OpencodeV1Config.skills.paths: string[]` and `subagent_depth: number` are asserted without a check, which works as a hidden cast at a trust boundary. Behaviour matches the old code, and the brief asked only for the tool-event parser. · Type these as `unknown` with field checks when a later task covers the remaining boundaries.

7. Process · check-all ran in the foreground rather than as the tracked background command, and a comment was amended afterwards without a rerun. · The three generation and type gates pass on the current tree (see Spec Compliance), so the risk is low. · Rerun `scripts/check-all` as a tracked command before the fixes for Important 1 and 2 are committed.

### Assessment
The port is faithful to the old plugins on every input opencode actually sends, and the git guard fails closed in both plugins under a throwing or export-less lib. Malformed input does not behave the same: v1 config now grants nested dispatch and depth where it used to report an error, and v2 lets a hidden skill or a null tool event through where it used to refuse. These changes break the design's malformed-input rule, the report does not list most of them, and no test covers them. Both fixes are small. Ready with fixes.

## Ledger lines
Task 07: minor (deferred): no test pins the fail-closed refusal when lib/opencode-input.js throws or loads without exports.
Task 07: minor (deferred): v2 lost the evaluate and forget-command failure notices for non-string edit resources and null after-events.
Task 07: minor (deferred): v2 comment at fx-opencode-v2.ts:47-48 says only shell is denied without the parser; every tool is refused.
Task 07: minor (deferred): an export-less lib makes plugin denial and preamble messages read "undefined".
Task 07: minor (deferred): v2 attempt() catches only native Promise rejections; old code caught any thenable.
Task 07: minor (deferred): v1 config, v2 ctx and permission events are typed by annotation, not parsed from unknown.
Task 07: minor (deferred): check-all ran in the foreground and was not rerun after the comment amendment.
