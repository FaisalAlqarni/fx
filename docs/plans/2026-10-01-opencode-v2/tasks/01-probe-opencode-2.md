# 01: Probe OpenCode 2.0.18

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Probe

**What to build:** a written record, from the real 2.0.18 binary, of every behaviour the design marks **probe**, so no later task builds on a guess. No production code. A throwaway probe plugin lives only in a scratch directory.

**Files:**
- Create: `docs/plans/2026-10-01-opencode-v2/probe-findings.md`

**Interfaces:**
- Consumes: the design's §1 to §4 **probe** items; `OPENROUTER_API_KEY` in the environment (the controller supplies it; never print it).
- Produces: `probe-findings.md` with one section per question below, each ending in a verdict line `Verdict: <proven|disproven|unclear>: <one sentence>` and the evidence (command, redacted output excerpt). Tasks 04 to 08 read it.

**Seam:** the installed `opencode` 2.0.18 binary, in a scratch `HOME` and `XDG_CONFIG_HOME`, with a scratch plugin file at `$XDG_CONFIG_HOME/opencode/plugins/probe.js` and a scratch `opencode.json` using OpenRouter.

**Risks:** the probe spends model calls: use `openrouter/qwen/qwen3.8-27b:free`, fall back to `openrouter/deepseek/deepseek-v4-flash` only on a 429 or provider error, and keep each `opencode run` to a one-line prompt. `opencode debug agents` needs the managed service and may take over a minute: time it. Never write the key into a file under the repo; the scratch `opencode.json` reads it from the environment (v2 providers docs: `OPENROUTER_API_KEY`).

**Idempotency:** everything lives in `mktemp -d` directories; re-running recreates them. The findings file is rewritten whole.

**Testing:** the probes are the test; each verdict cites its command and output.

## Acceptance criteria
- [ ] Each of the ten questions below has a section with evidence and a verdict.
- [ ] No key text appears in `probe-findings.md` (grep for `sk-or-` returns nothing).
- [ ] The scratch directories are outside the repo and removed at the end.

## Questions
1. **Module shape.** Does `export default { id: 'fx-probe', setup(ctx) {} }` load (log line `loading plugin` with no `failed to load plugin`)? Does a default export carrying extra keys (`server`) also load?
2. **Preamble.** In `setup`, `ctx.session.hook('context', ev => ev.system.push({ type: 'text', text: 'PROBE-PREAMBLE-7c1' }))`. In an `opencode run --format json` session asking "What is the marker text in your instructions? Answer with it only.", does the reply carry `PROBE-PREAMBLE-7c1`? In a session that dispatches a subagent through the `subagent` tool with the same question, does the subagent's answer carry it?
3. **Guard layer 1.** Register `ctx.permission.hook('evaluate', ev => { if (ev.action === 'shell') { record(ev.resources); if (ev.resources.some(r => r.includes('probe-deny'))) { ev.effect = 'deny'; ev.message = 'probe refused'; } } })` writing each `ev.resources` to a scratch log. Ask the model to run `echo probe-deny` and `bash -c "git status"`. Does `ev.resources` hold the full command text (including the inner command of `bash -c`)? Is the call refused, does the turn continue, and does the model see "probe refused"?
4. **Guard layer 3.** Register `ctx.tool.hook('execute.before', ev => { if (ev.tool === 'shell' && String(ev.input && ev.input.command).includes('probe-throw')) throw new Error('probe threw'); })`. Ask the model to run `echo probe-throw`. Is the call refused cleanly with the turn continuing and the reason visible, or does the turn fail?
5. **Policies.** Put `experimental.policies: [{ action: 'permission', resource: 'shell:git push *', effect: 'deny' }]` in the scratch `opencode.json`, inside a scratch git repo with a bogus remote. Ask the model to run `git push origin HEAD`. Is it blocked with "Blocked by configuration policy"? Does the same hold inside a subagent?
6. **Agents.** `ctx.agent.transform(ed => ed.update('fx-probe-agent', a => { a.mode = 'subagent'; a.description = 'probe'; a.system = 'Answer PROBE-AGENT'; a.permissions = [{ action: '*', resource: '*', effect: 'deny' }, { action: 'read', resource: '*', effect: 'allow' }]; }))`. Does `update` create a missing id? Does `opencode debug agents` list it with those permissions?
7. **Skills.** With fx's `skills/` linked into `$XDG_CONFIG_HOME/opencode/skills/` and a global `permissions` rule `{ action: 'skill', resource: 'fx-audit', effect: 'deny' }` in `opencode.json`, does `opencode api --standalone skill.list` list the fx skills, and is `fx-audit` hidden or marked denied? Record the output shape.
8. **Commands.** Does a Markdown file in `$XDG_CONFIG_HOME/opencode/commands/fx-probe.md` with `description:` frontmatter and a template body appear as a command? Can `ctx.command.transform(ed => ed.add({ name, description, execute }))` return a prompt template, or only run code?
9. **Depth.** Does `experimental.subagent_depth: 2` let a subagent dispatch a subagent? Does top-level `subagent_depth` still get dropped?
10. **Run output.** Record the shape of `opencode run --format json` lines (event types, where tool calls, tool results, subagent dispatch and the final text appear) and whether `opencode export <session>` still exists, so task 07 can write the v2 event parser.

## Steps

- [ ] **1. Set up the scratch home** (`H=$(mktemp -d)`, `HOME`, `XDG_CONFIG_HOME`, `TMPDIR` under it) and a scratch `opencode.json` with the OpenRouter provider and model per the v2 providers docs, key from the environment.
- [ ] **2. Write the scratch probe plugin** covering questions 1 to 6, 8 in one file, each hook writing what it sees to `$H/probe.log`.
- [ ] **3. Run each question's session or command**, one at a time, capturing output to files under `$H`.
- [ ] **4. Write `probe-findings.md`**: per question, the command, a redacted excerpt, and the verdict line.
- [ ] **5. Check for the key**: `grep -c 'sk-or-' docs/plans/2026-10-01-opencode-v2/probe-findings.md` prints `0`.
- [ ] **6. Commit**

```
git add docs/plans/2026-10-01-opencode-v2/probe-findings.md
git commit -m "docs(opencode-v2): probe findings on 2.0.18"
```
