Lens: security, 2 findings (both Minor). The diff has no Critical or Important issue.

1. **[Minor]** /development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v2.js:33-39, 55, 100-108: **if registration fails, the lanes are silently exposed.** Each registration is wrapped in `attempt`, which only writes to `console.error`. Two failures are possible:
   - The `permission.hook('evaluate')` registration at line 100 fails. Then agents defined in `opencode.json` (probe Q11, probe-findings.md:385-395) can load any hidden lane, and nothing tells the user.
   - The transform at line 55 fails. Then every built-in agent lists and loads the hidden lanes.

   Only a preamble failure is reported in the session (line 50). The impact is limited: the model can run a user-only lane unprompted, but it gains no new privilege.

2. **[Minor]** /development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v2.js:31: **hiding a lane only stops the skill tool.** The model can still `read` the lane's `SKILL.md` directly. Default agents allow `external_directory` for the opencode config directory without asking (probe-findings.md:213), and the probe put the skills there (probe-findings.md:241). I have not checked whether a real install puts the skills there too. The impact is the same as finding 1: the text is exposed, but no privilege is gained. Treat the deny rules and the hook as a way to steer the model, not a security boundary.

**Can the model reach a hidden lane through the skill tool?** No.
- The skill tool always calls `permission.assert` with `resources: [skill.id]`, where the id is the directory name (oc/packages/core/src/tool/plugin/skill.ts:51-58, config/plugin/skill-file.ts:41-48).
- `evaluateInput` runs the plugin hook after the agent, session and saved "always" rules, and the hook's effect is final (oc/packages/core/src/permission.ts:173-188). So a saved approval, a session-level allow or an agent from `opencode.json` still hits the fx deny at plugin lines 102-105.
- Subagents go through the same `assert`.
- The only skill path that skips the check is a user's own `@skill` mention in the prompt (session/session.ts:229). The user controls that, not the model.

**Can a command's `execute` be driven by untrusted input?** No.
- The only callers of `Command.Service.execute` are the server handler and `SessionCommand` (server/src/handlers/command.ts, core/src/session/command.ts). No model tool reaches it.
- `input.prompt.text` is whatever the user typed, and it goes into their own session (line 92).
- `$ARGUMENTS` appears only in the trailer that lib/opencode-commands.js:38 adds, never inside a command or skill body. So the arguments cannot be spliced into a shell snippet the template tells the model to run.
- `split/join` does not interpret `$&`-style replacement patterns.
- `files`, `agents` and `skills` from the invocation are dropped, not forwarded.

**Can the added rules widen a built-in agent's permissions?** No.
- Line 74 only ever pushes `deny`, appended last. `Permission.evaluate` uses `findLast` (permission.ts:87-96), so a deny can only narrow.
- Lines 64-66 replace an fx agent's defaults with `* * deny` plus specific allows (lib/agent-dialects.js:88-95). That also narrows.

Two notes for other lenses, not security issues:
- **Contradiction:** the test at tests/gates/opencode-v2-plugin.test.js:314 says "a user's explicit skill rule wins". In practice the evaluate hook at plugin lines 100-107 denies unconditionally, so a user's `skill fx-audit allow` is still refused at call time. It is only listed to the model. This narrows access, so it is not a security issue, but the ADR or the code should settle which behaviour is intended.
- **Test gap:** the stub in the test runs the `permission.evaluate` hooks by hand. It does not model core's order (static deny, then saved rules, then hook), so it would not catch a change in that order.
