# Final whole-branch review: multi-harness (f92c970..ef7c998)

The controller saved this file, because the reviewer's harness refused the
write. The review ran in `fx:fx-review` branch mode over the product diff
(docs/plans excluded): 127 files, +9,309 and -834 lines.

Passes and models:
- correctness, standards and spec: sonnet;
- broad reviewer: opus (the final review);
- `fx-devils-advocate` unprimed: opus;
- security lens: opus;
- silent-failure lens: sonnet.

The database, a11y and pipeline lenses did not fire.

**Gate at HEAD:** `scripts/check-all` ALL GREEN. The free rows: claude-code
4 pass / 2 gap, opencode 6 pass, codex 4 pass / 2 gap.

**Verdict:** ready to merge with fixes. 0 Critical, 9 Important, 16 Minor.
The controller re-checked I1, I2, I3, I4, I5 and I9 against the code.

## Important

- **I1.** The Codex bootstrap forbids the only way Codex loads a skill.
  - Where: `lib/preamble.js:41-47`, and the "Invoke, do not read" sentence in
    `PREAMBLE.md`.
  - Problem: the Codex render says to invoke with `$name` (that is user syntax)
    and "Never Read a SKILL.md". Codex has no Skill tool, so its model loads a
    lane by reading `SKILL.md` through the shell.
  - Fix: give Codex its own wording, and gate the never-read sentence per
    harness with a test.
- **I2.** The Codex identity store is scoped by `process.ppid`.
  - Where: `lib/plant-roles.js:187-189`.
  - Problem: under `dash -lc`, or a profile that has an EXIT trap, the ppid
    changes between hook calls, and every subagent comes out unrecorded. That
    breaks fx-implement on Codex.
  - Fix: key the store on `agent_id` in a per-user directory, and reopen the
    task 06 ruling (state.md:648).
- **I3.** The Codex read-only check fails open when `lib/plant-roles` fails to
  load.
  - Where: `hooks/fx-codex.js:32-42` and :113.
  - Problem: a failed load silently skips the read-only block.
  - Fix: when `agentId` is present and the module did not load, refuse writes
    and say why on stderr. opencode has the same shape at
    `plugins/fx.js:49-54`: move those requires into `config()`, behind a
    catch that reports the failure.
- **I4.** `scripts/check-interpreters` scans zero files when it is called with
  no arguments.
  - Where: line 13 and line 35. `"${@:-a b c}"` is one element, and the error
    output goes to `2>/dev/null`.
  - Fix: build the array correctly, stop swallowing errors, teach it the
    inline "Run x" form, fix `skills/fx-review/SKILL.md:55`, and add a test
    that fails when the gate scans nothing.
- **I5.** Claude Code registers the four user-invoked lanes twice, and the
  command copies can be invoked by the model.
  - Where: `.claude-plugin/plugin.json`. Since e195021 both `commands/` and
    the generated skills are discovered: `plugin details` lists 21 skills.
  - Fix: set `disable-model-invocation: true` on the commands, stop the double
    registration, and make row 09 fail on a duplicate.
- **I6.** INSTALL and SURFACE overstate the opencode script route.
  - Where: INSTALL.md:171-175.
  - Problem: with plugins off there is no bootstrap, no guard, no lane check
    and no task grant.
  - Fix: say so, and name AGENTS.md as the only bootstrap fallback.
- **I7.** The live-row bwrap jail leaves host sockets and the environment open.
  - Where: `tests/conformance/lib/live.sh:63,78-79`.
  - Problem: D-Bus and docker.sock are reachable, and parent environment
    tokens leak into the jail.
  - Fix: add `--tmpfs /run`, `--unshare-ipc`, and `--clearenv` with an
    allowlist, and correct the comment at :52-53.
- **I8.** The Codex hook timeout is 5s, and it pays for a login shell plus a
  cold node start.
  - Where: `hooks.json:11,24,38`.
  - Problem: if a timeout counts as a failed run, the guard is silently
    skipped.
  - Fix: check the Codex source for what a timeout does, then raise the
    timeout or document the behaviour.
- **I9.** A private home path in a shipped file.
  - Where: `plugins/fx.js:3`.
  - Fix: use `~/.opencode/bin/opencode`. Optionally have `check-artifacts`
    catch home paths.

## Minor

1. **Heredoc wrappers.** `lib/git-guard.js` misses these forms: `command bash`,
   `eval`, `source /dev/stdin`, `nice`, `fish`. It also has a
   `bash script.sh <<EOF` false positive.
2. **`write_stdin` and the guard.** `hooks/fx-codex.js:140` checks only
   `tool_name === 'Bash'`. Whether `write_stdin` reaches PreToolUse is not
   verified.
3. **`plantRoles` overwrites.** `lib/plant-roles.js:74-82` overwrites
   same-named files without the generated header, and follows symlinks.
4. **The opencode `general` grant.** `plugins/fx.js:146-151` may override a
   global `permission.task: deny`, depending on merge order. Not verified.
5. **Silent command drops.** `lib/opencode-commands.js:42-43,58,68` silently
   drops commands with malformed frontmatter.
6. **Lost exit code.** `live.sh:201,245` `live_run` discards the CLI exit
   code.
7. **GAP regressions pass.** `run.sh:96`: a row that drops from PASS to GAP
   keeps the gate green.
8. **Relative citations.** `agents/fx-devils-advocate.md:134` and its Codex
   role cite `../references/...`, which does not resolve on Codex or
   opencode.
9. **Unused read.** `lib/plant-roles.js:143-149`: `hooksTrusted` reads a file
   and discards the result.
10. **Non-string fails open.** `lib/plant-roles.js:502` treats a non-string
    command as not writing.
11. **Silent deny accepted.** `tests/gates/codex-hook-output.test.js:37`
    `denied()` accepts exit 2 with empty stderr.
12. **Unrendered lane name.** `lib/plan-state.js:78` names a bare
    `fx-implement` without rendering it per harness.
13. **Stale text:**
    - `hooks.json:2`
    - `references/harnesses/codex.md:35`
    - `commands/fx-setup.md:180-185`
    - `lib/git-guard.js:2-12`
    - `skills/fx-plan/SKILL.md:232`
    - `skills/fx-review/COVERAGE.md:82`
14. **Pending placeholder.** Resolved 2026-09-22: the ADR 0019, INSTALL.md
    (x2) and SURFACE.md task21-opencode placeholders are filled from the
    final frozen matrix (`/tmp/tmp.wiU1YAo8Ky/logs/final-oc-matrix.out`,
    `final-oc-plug.out`).
15. **Test hygiene:**
    - `tests/gates/codex-manifest.test.js:15` sets no TMPDIR;
    - `tests/gates/release-version.test.js:46` throws uncaught when there is
      no manifest.
16. **Two commented duplications.** `extractPatchPaths`, and the second
    command splitter. Fine as is.

## Deferred-item triage

Fix before merge:
- the Codex `{{SKILL_TOOL}}` wording (I1);
- the `hooksTrusted` dead read (Minor 9);
- the duplicate command listing (I5);
- the TMPDIR gap in codex-manifest.test.js (Minor 15);
- `denied()` accepting empty stderr (Minor 11);
- "most models" in `references/harnesses/codex.md`;
- the fx-setup caveat that names task 12;
- the plugin throwing on a missing references dir (I3);
- fx-plan:232 "routing table";
- COVERAGE.md:82;
- lens briefs citing the source file and line at HEAD, not the diff's line
  numbers.

Follow-up:
- runtime detection on the other runtimes;
- the findings-11 and findings-12 harness minors;
- the GNU `timeout` dependency on macOS;
- the XDG exports in the install test;
- the release-gate throw when the merge-base has no manifest;
- the rest of the per-task minors.

Fine as is: every other deferred line, each ruled with its reason in the
reviewer's reply of 2026-09-22.

## Strengths

- One renderer, and one guard, across all three runtimes.
- The Codex Bash classifier is an allowlist. It held against three bypass
  passes.
- opencode lenses start from deny-all.
- CI actions are pinned by SHA, with read-only permissions.
- The conformance runner is honest: a GAP must carry a reason, and every row
  runs in a scratch home.
