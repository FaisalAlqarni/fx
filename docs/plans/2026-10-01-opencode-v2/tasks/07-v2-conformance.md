# 07: v2 conformance plumbing and rows

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** Harness

**What to build:** the conformance matrix runs against `opencode-v2` the way it runs against the other three: the runner accepts it, the jail binds its binary, live sessions install fx through the v2 route, the event parser reads v2's run output, and every row that branches on the harness has a v2 case. The free rows pass on 2.0.18.

**Files:**
- Modify: `tests/conformance/run.sh`, `tests/conformance/lib/live.sh`, `tests/conformance/lib/events.js`, `tests/conformance/lib/jail.sh`, `tests/conformance/expected-gaps`, `tests/conformance/README.md`
- Modify: rows `03`, `05`, `09`, `11`, `12`, `13`, `14`, `15`, `18` under `tests/conformance/rows/`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the installer's `--major 2` route (task 06); `probe-findings.md` questions 7, 9, 10 (skill listing, depth, run output shape).
- Produces: `bash tests/conformance/run.sh opencode-v2 [--free]`; `events.js` gains an `opencode-v2` parser returning the same event kinds the other parsers return (`skills`, `skill_attempts`, tool calls, subagent dispatches, final text, as the existing kinds are named in that file).

**Seam:** the runner itself: free rows run without a model call.

**Risks:** OpenCode v1 and v2 share a config directory and binary name: the v2 live install step runs `fx-opencode-install --major 2` into the scratch config, never the real one. `opencode debug agents` needs the managed service and is slow: give it the timeout the probe measured. Row 15's depth check uses `experimental.subagent_depth` and the `subagent` tool on v2. Row 09 on v2 uses `opencode api --standalone skill.list` (probe 7) and the agent registry. `FX_OPENCODE_ROUTE=plugin` on v2 adds `file://$FX/plugins/fx-opencode-v2.js` to the scratch config's `plugins` and `"$FX/skills"` to its `skills`, and nothing else: no `permissions` key and no command files. That `skills` entry lists all of fx's skills, the five user-invoked lanes included, so on this route the lanes are hidden only by the skill-deny rules the plugin adds to every agent in `agent.transform` (task 04; v2 filters the listed skills only by static rules, `core/src/skill.ts:33-34`), and the user reaches them only through the commands the plugin registers with `command.transform`. If task 04 reports that commands could not be registered, row 14 on the v2 plugin route is a GAP with that reason in `expected-gaps`; if probe question 11 shows a user-defined agent misses the rules, row 13's v2 case says which agents it checked. The installer route (`--major 2`) needs no hiding of its own: `load_skills` never links the five lanes.

**Idempotency:** runner and row edits; scratch homes per run.

**Testing:** `run.sh opencode-v2 --free` green; `run.sh opencode --free` unchanged.

## Acceptance criteria
- [ ] `bash tests/conformance/run.sh opencode-v2 --free` passes every free row with 0 fail and no gap not listed in `expected-gaps`.
- [ ] `bash tests/conformance/run.sh opencode --free` gives the same result as before this task.
- [ ] Each branching row has an `opencode-v2` case that asserts the same guarantee as its `opencode` case, in v2's terms.
- [ ] Rows 13 and 14's `opencode-v2` cases run on both routes: on `FX_OPENCODE_ROUTE=plugin`, row 13 finds none of the five lanes in the skill list the built-in `build` agent sees, and row 14 reaches `fx-audit` through the plugin's registered command (or the listed GAP, per Risks).
- [ ] `tests/conformance/README.md` names the new harness and its route knobs.

## Steps

- [ ] **1. RED:** `bash tests/conformance/run.sh opencode-v2 --free` fails with `unknown harness`.
- [ ] **2. Runner and jail:** accept `opencode-v2` in `run.sh`'s case and usage; bind the v2 binary in `jail.sh` the way `opencode` is bound.
- [ ] **3. Rows, free first:** add the `opencode-v2` cases to rows 03, 09, 11, 13 and 14, each mirroring its `opencode` case with v2's names and commands. Run `bash tests/conformance/run.sh opencode-v2 --free` after each row.
- [ ] **4. Live plumbing:** in `live.sh`, an `opencode-v2` case for install (`--major 2`, or the plugin route), run (`opencode run --format json`, the probe's flags), and log harvest (probe 10); the `opencode-v2` parser in `events.js`; the `opencode-v2` cases in rows 05, 12, 15 and 18. These are exercised in task 10; here, check each with `bash -n` and one `--describe` pass.
- [ ] **5. GREEN:** both free runs from the acceptance criteria, and `FX_OPENCODE_ROUTE=plugin bash tests/conformance/run.sh opencode-v2 --free` for the plugin route's rows 13 and 14.
- [ ] **6. check-all:** add `run conformance-free-opencode-v2 bash tests/conformance/run.sh opencode-v2 --free` after `conformance-free-opencode`.
- [ ] **7. Commit** every edited path, listed explicitly:

```
git add tests/conformance/run.sh tests/conformance/lib/live.sh tests/conformance/lib/events.js tests/conformance/lib/jail.sh tests/conformance/expected-gaps tests/conformance/README.md tests/conformance/rows/03-no-placeholder-survives.sh tests/conformance/rows/05-explicit-invocation.sh tests/conformance/rows/09-every-skill-discovered.sh tests/conformance/rows/11-read-only-roles-registered.sh tests/conformance/rows/12-read-only-agent-cannot-edit.sh tests/conformance/rows/13-audit-lane-not-model-facing.sh tests/conformance/rows/14-audit-lane-user-invocable.sh tests/conformance/rows/15-subagent-dispatches-subagent.sh tests/conformance/rows/18-read-only-agent-cannot-delegate-a-write.sh scripts/check-all
git commit -m "test(opencode-v2): conformance runner, events and rows"
```
