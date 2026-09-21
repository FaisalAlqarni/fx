# 23: opencode's plugin-only route works

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** A user who installs fx on opencode with only one `plugin`
entry in their config, and never runs the installer, gets the same fx as the
installer route. That means:
- the read-only agents with their permissions;
- `general` able to dispatch;
- the preamble;
- every lane invocable by the user, including the five hidden ones such as
  `/fx-audit`.

The design makes this the default opencode route (story 4). Task 21 measured
two defects on it:

- **PD1.** The plugin's `config` hook changes do not reliably reach real
  sessions. The `general` child was denied the `task` tool in 2 of 2 runs, and
  the fx agents were missing once. Yet `opencode agent list` on the same scratch
  config shows both set. Root cause unknown.
- **PD2.** `/fx-audit` cannot be invoked, because `plugins/fx.js` registers no
  commands. The installer route works only because the installer writes command
  files.

Evidence is in task 21's report,
`.fx/2026-09-21-multi-harness/reports/21-live-matrix-claude-code-and-opencode-report.md`.
Read it first.

**Prior art:** caveman's opencode plugin registers commands through
`config.command`, and hooks the `event` dispatcher for `session.created`. Its
comments explain that opencode silently ignores some named hook keys, and that
`require()` of on-disk files fails inside opencode's compiled Bun binary
(issues 418 and 421). The details are in
`research/prior-art-multi-harness.md`, caveman sections 2 and 5. Read that
plugin's source: clone github.com/JuliusBrussee/caveman into a `mktemp -d`,
and look at `src/plugins/opencode/plugin.js`. Copy its registration approach.
The Bun `require()` finding is a strong candidate for PD1, because
`plugins/fx.js` requires lib modules.

**Files:**
- Modify: `plugins/fx.js`
- Modify: `tests/gates/opencode-plugin.test.js`
- Modify: any lib module the plugin must stop `require()`-ing from disk, only if
  the root cause says so
- Modify: `tests/conformance/lib/live.sh`, only if the plugin-only knob needs a
  change to reproduce

**Interfaces:**
- Consumes: `toOpencodeAgent`, from `lib/agent-dialects.js`, unchanged
- Consumes: the task 21 live knob for the plugin-only route in
  `tests/conformance/lib/live.sh`
- Produces: `plugins/fx.js` registers one opencode command per user-invoked
  lane in its `config` hook. That includes the five hidden lanes, whose skill
  permission stays `deny` so the model cannot select them. The body of each
  command is the same text the installer writes today.

**Seam:** the plugin's `config` hook, called directly in the existing gate test,
plus the live plugin-only route from task 21.

**Risks:**
- HIGH: fixing the symptom without the cause. Invoke `fx:fx-debug` first. State
  the root cause with evidence before changing code: a log line, a loaded or not
  loaded module, or a measured difference between `opencode agent list` and a
  live session.
- MEDIUM: commands registered twice, once by the plugin and once by installer
  files. Registration must be idempotent, and must not duplicate a command that
  already exists in `config.command`.

**Idempotency:** the config hook may run more than once. Registration checks
for existing entries.

**Testing:** a gate test on the config hook, then the live plugin-only route.
That route runs rows 01, 12 and 15, the task 21 plugin-only probe, and the
hidden-lane user route probe, on opencode against the local Qwen.

## Acceptance criteria
- [ ] The report states PD1's root cause with evidence, cited from a log, the source, or a measurement
- [ ] On the plugin-only route, rows 01, 12 and 15 PASS on opencode in two consecutive runs
- [ ] On the plugin-only route, a user invocation of `/fx-audit` loads the lane, and the report cites the transcript
- [ ] The five hidden lanes stay denied to the model, which row 13 on opencode shows
- [ ] `tests/gates/opencode-plugin.test.js` asserts that the config hook registers a command for every user-invoked lane, and that a second run adds none
- [ ] The installer route still passes its opencode rows, which proves no regression
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps

- [ ] **1. Root-cause PD1 with `fx:fx-debug`**

Reproduce with the task 21 plugin-only knob, under a scratch HOME, on the local
Qwen. Compare what `opencode agent list` reports against what a live session's
child actually gets. Read caveman's plugin comments about Bun `require()`. Record
the root cause in the report before step 2.

- [ ] **2. Write the failing tests**

In `tests/gates/opencode-plugin.test.js`, assert command registration and
idempotency. Watch the test fail.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it.

- [ ] **4. Verify live**

Run the plugin-only route twice for rows 01, 12 and 15, and run the
hidden-lane probe. Then run the installer route's opencode rows once.

- [ ] **5. Run the full gate, then commit**

```
git add plugins/fx.js tests/gates/opencode-plugin.test.js
git commit -m "fix(opencode): make the plugin-only route register commands and reach sessions"
```

Stage any other file you changed by its path. No attribution trailers. Then
continue to the next task: never stop and wait.
