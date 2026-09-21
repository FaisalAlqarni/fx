# Task 04 review findings

**Spec compliance: PASS** (11/11 criteria met, criterion 1 judged as amended)
**Task quality: PASS**
**No Critical, Important or Minor findings.**

Written by the controller from the reviewer's returned text.

## Verification the reviewer performed, all first-hand

- Ran Codex's validator: fails only on `skill \`fx-audit\` frontmatter field
  \`disable-model-invocation\` must be false`. Then took a `git archive` of HEAD,
  deleted only `skills/fx-audit`, re-ran, and got `Plugin validation passed`.
  Independently reproduces the controller's finding that the sole blocker is a
  pre-existing line belonging to task 07.
- `.codex-plugin/plugin.json`: no `hooks` key, and `skills` is the string
  `./skills/`.
- Root `hooks.json`: events nest under `hooks`, and
  `Object.keys(...hooks)` is exactly `['SessionStart', 'SubagentStart']`.
  `grep -c PreToolUse hooks.json` is 0, so task 05's scope was not pre-empted.
- Piped real `SessionStart` and `SubagentStart` payloads into
  `hooks/fx-codex.js`: `$fx-tdd` present on both, `{{` absent on both,
  `fx:fx-tdd` absent on both.
- **Forced the failure path** by moving `PREAMBLE.md` aside, and got back the
  fallback text byte-identical to `hooks/fx-context.js`'s. Restored the file.
- Diffed `hooks/fx-codex.js` against `hooks/fx-context.js`: three differences
  only, all intended. No second preamble-assembly site, which is ADR 0020's
  concern.
- Diffed the two `hooks.json` context blocks with the script name normalised:
  structurally identical.
- **Ran its own live install** into a throwaway `CODEX_HOME`: `codex plugin list`
  shows `fx@fx installed, enabled, 0.1.7`, 13 skills in the cache, zero
  symlinks, `hooks.json` at plugin root, and piping a `SubagentStart` payload
  into the *installed copy* returned a genuine rendered Codex preamble.
  Cleaned up afterwards.
- The symlink check asks `git ls-files -s`, not `find`, so gitignored worktrees
  cannot cause a false failure.
- Versions identical across both manifests and the marketplace entry.
- `lib/git-guard.js` and `PREAMBLE.md` not modified. No attribution trailer. All
  new files mode `100644`. `scripts/check-all` -> `ALL GREEN`.

## The two judgement calls, both upheld

- **The validator amendment**: independently reproduced both halves. This task's
  own artifacts are clean.
- **The undocumented marketplace `version` field**: the reviewer read Codex's own
  `plugin-json-spec.md` and confirmed the documented entry fields are `name`,
  `source`, `policy` and `category` only. It also confirmed `validate_plugin.py`
  never reads `marketplace.json` at all, so the field cannot trip it. The task's
  own test requires the versions to match, so adding it was not optional.
  Assessed the right call.

## Cannot verify

Nothing.
