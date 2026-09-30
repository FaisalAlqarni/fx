Lens: silent-failure, 6 findings

All six come from one design choice. `attempt()` at `/development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v2.js:33-39` reports a failure only through `console.error` and then returns `undefined`. Nothing in the session shows the failure to the model or the user. V1 at `plugins/fx-opencode-v1.js:211-232` pushed a `configError` notice into the system preamble, and V2 dropped that.

1. [Important] `plugins/fx-opencode-v2.js:55-70`: one `attempt('fx agents')` wraps the agent loop, including the `require` of `plant-roles.js` and `agent-dialects.js` and `fs.realpathSync(refs)`. A missing module or references directory makes all read-only agents and lenses vanish. A bad agent file, caught at line 62, drops only that agent. Either way the only trace is a stderr line. The preamble still renders normally and tells the model it has lanes it does not have. V1 at `plugins/fx-opencode-v1.js:229-232` told the user the plugin was misinstalled. V2 does not.

2. [Important] `plugins/fx-opencode-v2.js:71-77`: a failure in the hide-lanes step leaves `fx-audit`, `fx-critique`, `fx-grill`, `fx-handoff` and `fx-setup` visible and invocable by the model for that agent. Only `console.error` records it. The user relies on these lanes being typed by the user, never picked by the model. The other guard against this is also silent (finding 3), so both can fail together. Because the transform callback is synchronous, an exception escaping `attempt` (for example from `editor.list()`) would become a defect.

3. [Important] `plugins/fx-opencode-v2.js:100-108`: the `permission.evaluate` backstop fails open. If `attempt('evaluate')` throws, the hidden-lane deny silently does not happen. This backstop is the only guard for agents defined in `opencode.json` (header note Q11). The blast radius is that every user-defined agent can call the hidden lanes with no signal. A failure to register the hook at line 100 is also stderr-only.

4. [Important] `plugins/fx-opencode-v2.js:80-98`: a failure of `require('../lib/opencode-commands.js')`, `ctx.command.list()` or `transform` loses every fx command, with only a stderr line. The hidden lanes can only be reached by typing their command, so they become unreachable. The user sees "unknown command" with no reason given.

5. [Important] `plugins/fx-opencode-v2.js:89-94`: the command `execute` swallows a failed `ctx.session.prompt`. The user types `/fx-audit`, the command "succeeds" as far as opencode can tell, and nothing is delivered. No message appears in the session. Nothing separates a delivered command from a dropped one.

6. [Important] `plugins/fx-opencode-v2.js:44`: if `ctx.session.hook('context', ...)` throws or rejects at registration, `attempt` swallows it and no preamble is injected. The in-hook "fx failed to load" message at line 50 does not cover this case. The session runs with no fx bootstrap and no warning, which is exactly the state that message exists to announce.

7. [Minor] `plugins/fx-opencode-v2.js:52`: `ev.system.push` sits outside the inner try, so a bad `ev.system` becomes a hook rejection, which the header at line 14 says to avoid. The message at line 50 also prints `undefined` if the thrown value is not an Error. At line 34, `e && e.message` logs `undefined` for non-Error throws, and the stack is lost.

The `a.system !== def.system` early return at line 65 is a documented, deliberate ADR-0026 choice, so I did not flag it. The load-failure preamble at lines 47-51 is correct and in-session, so I did not flag it either.
