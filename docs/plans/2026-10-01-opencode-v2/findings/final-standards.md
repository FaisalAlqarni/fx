Review of `2c0e8d2..0208fad`, Standards axis. Hard violations come first. I read the ADR/lib/plugin/hook/installer/test hunks and skimmed the conformance shell and rows.

**Hard violations**

1. [Important] Decisions made in the diff have no ADR (repo rule "ADR per feature"; ADR house format).
   - `lib/preamble.js` and `hooks/fx-codex.js` change Codex addressing from `$fx-tdd` to `$fx:fx-tdd`.
   - The same hook adds shell-borne `apply_patch` lane-checking (`SHELL_APPLY_PATCH`, `checkPatchPaths`).
   - Neither is `opencode-v2` work, and both are recorded only as in-place edits to ADR 0020 (and in 0026/0028/0032, which only had the `plugins/fx.js` rename applied).
   - ADR 0036 says "Supersedes: Nothing", yet this reverses what 0020 said about Codex.
   - Fix: add a Codex ADR, or move these hunks out of the branch.

2. [Important] The v2 evaluate hook breaks ADR-0026 (user's answer wins) in two places.
   - `plugins/fx-opencode-v2.js` denies a hidden-lane `skill` call even when the user wrote an explicit skill allow. The gate test asserts this ("does not survive the backstop").
   - The read-only agents' deny likewise overrides the incoming `allow`.
   - ADR 0037 documents both. The hide step respects a user rule but the backstop discards it, so the two are inconsistent. Treat this as a judgement call on ADR-0026's intent; it is not a clean breach.

3. [Minor] ADR 0020's diagram column alignment broke after the rename. The `plugins/fx-opencode-v1.js` arrow no longer lines up with its siblings.

4. [Minor] The `evaluate` callback body in `plugins/fx-opencode-v2.js` is not indented under `ctx.permission.hook(`. This departs from the indentation in `plugins/*.js` and `hooks/*.js`.

5. [Minor] ADRs 0036 and 0037 hold harness facts: `Wildcard.match` turning `*` into `.*`, the 2.0.18 source paths, and the `permission.evaluate` shape. ADR 0016 puts these in `references/harnesses/opencode-v2.md`. The ADRs should cite that file rather than restate the facts, but this is a judgement call. The reference file itself conforms: `# opencode-v2`, an ADR 0016 header, a "What fx cannot observe" section (0024).

**Baseline smells (always judgement calls)**

- [Important] Duplicated Code: the hidden-lane list appears in three places.
  - `const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];` in `plugins/fx-opencode-v2.js`.
  - `HIDDEN_SKILLS` in `plugins/fx-opencode-v1.js`.
  - `HIDDEN` in `tests/gates/opencode-v2-plugin.test.js`.
  - `tests/gates/user-invoked.test.js` already knows the user-invoked set. Derive the list from one source.
- [Important] Duplicated Code: `plan_opencode_json` in `scripts/fx-opencode-install`. The top-level depth and `experimental.subagent_depth` handling are near copies of each other:
  ```
  if isinstance(current, int) and not isinstance(current, bool) and current >= 2:
  ```
  The function is also about 90 lines with parallel 1.x/2.x branches.
- [Minor] Long Function: the `setup` body in `plugins/fx-opencode-v2.js`. It nests `attempt` inside `try` inside `hook` in a single async closure, and the evaluate hook is about 70 lines mixing read-only, shell, edit and skill concerns. Extract each concern.
- [Minor] Primitive Obsession: `callKey` joins three strings with `\u0000` and returns `undefined` as the miss signal. A tuple-keyed map or a small key type would be clearer.
- [Minor] Mysterious Name: `READ_ACTIONS` is commented "The four-line read-only set". `attempt` returns either a result or `undefined` on failure, so callers cannot tell a failure from a falsy result.
- [Minor] Data Clumps: `(dest, args, major)` travels together through the installer helpers.
- [Minor] Speculative Generality: `fromShell` is a boolean flag parameter on `checkPatchPaths` in `hooks/fx-codex.js`. The `SHELL_APPLY_PATCH` regex covers `time`, `xargs`, `nohup`, `sudo` and similar wrappers beyond what the live case needed.
- [Minor] `tests/gates/opencode-v2-plugin.test.js` is one 300-line async IIFE. Existing gates do the same, so the repo endorses it and the smell is suppressed.

**Conforming**

- ADR 0027: `plantRoles` is not called from the v2 plugin or installer. Only `READ_ONLY_AGENTS` is imported.
- ADR 0028: one converter per dialect, `toOpencodeV2Agent`, used by both the plugin and the installer.
- ADR 0020: `render()` handles the `opencode-v2` harness.
- ADR 0024: failed registrations show up in the preamble and in denial messages.
