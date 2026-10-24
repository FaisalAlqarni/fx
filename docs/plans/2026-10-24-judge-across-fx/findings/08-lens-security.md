Lens: security, 3 findings. Nothing is exploitable now. The opencode paths keep the earlier fixes.

**What I checked and found holding**
- **Refusal keying:** a judged refusal needs `refusesRule` (`/development/fx/.worktrees/judge-across-fx/src/lib/judge-features.ts:79-84`). That checks the rule id plus exact measured glob and rule text, with no scope. The shared `judged()` path serves both plugins.
- **Built-ins versus judge failures:** built-ins run in `builtinStep` (`src/lib/edit-rules.ts:222-245`) in their own try. The judge modules load lazily inside `judged()`, so a judge-side failure cannot reach the built-ins.
- **2,000-character cap:** `EDIT_TEXT_CHARS` and `EDIT_FILE_CHARS` are both 2000, applied at `src/lib/judge-questions.ts:138-139`. Secret-named files are never read whole (`src/lib/edit-rules.ts:304`). I did not re-check glob matching; the diff does not change it.
- **Refusal and log content:** the built-in refusal text and the log lines carry only the file path and rule id, never added content.
- **Edit tool coverage:** v1 covers `edit`, `write` and `apply_patch` (`src/plugins/fx-opencode-v1.ts:609-615`). v2 covers `edit`, `write` and `patch` (`src/plugins/fx-opencode-v2.ts:132, 475`), with the 2.x field `path` and tool `patch` mapped at `src/lib/edit-rules.ts:166-169`.
- **v1 order:** the fx-state refusal (`fx-opencode-v1.ts:621-623`) and the lane check (`:624-634`) run before `checkEdit` (`:642`). The bash branch returns earlier, so the git guard cannot be skipped or delayed.
- **v2 order:** the shell branch is untouched, because the edit branch only returns early for edit tools. The fx-state refusal for edits sits in `permission.evaluate` (`fx-opencode-v2.ts:394-402`). That runs after `execute.before`, so the edit check cannot skip it.

**Findings**

1. [Minor] `src/plugins/fx-opencode-v2.ts:475` (and `:394-402`): on 2.x the edit check runs in `execute.before`, ahead of the fx-state refusal in `evaluate`. An edit to an fx-state or config file is therefore sent to the judge, and held for its answer when `execute.before` is awaited, before it is refused. The refusal still happens, so this is not a bypass. The result is judge latency, and that edit text reaching the judge for a call that is refused anyway. v1 does not have this, since it checks fx-state first.

2. [Minor] `src/lib/edit-rules.ts:304-306`: the check that keeps secret files from being read whole tests only the path as written, `SECRET_FILE.test(file.rel)`. The `edit` tool reads the target with `readText` (`:127`), which follows symlinks. A repo symlink with an ordinary name that points at a key or `.env` would have its first 2,000 characters sent to the judge. I did not verify whether the judge call redacts, so treat this as unconfirmed. The same regex also misses `.p12`, `.pfx`, `.netrc`, `.npmrc` and `id_ecdsa`. This is shared code, so it affects all harnesses, not just opencode.

3. [Minor] `src/lib/edit-rules.ts:166-178` and `src/plugins/fx-opencode-v2.ts:132`: an opencode 2.x edit tool outside the three measured names, or a changed field name, gets no check at all and no warning. The v2 doc says this is intended. The no-secrets built-in is silently off for that tool, so a new opencode release can disable it without notice.

I read only the first 870 of the 1,688 diff lines (the library, the plugins and the docs). I did not read the opencode test files, and I read the plugin source at HEAD directly.
