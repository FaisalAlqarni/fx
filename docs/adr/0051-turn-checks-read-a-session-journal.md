# Turn checks read a session journal

Status: accepted, 2026-10-24.

## Context

ADR 0047 added two checks on the shape of a turn: a Stop check that catches a turn ending on edits nobody verified, and a stuck-loop tracker that notices an agent retrying, reading in circles, or piling up edits. Both need to know what happened earlier in the turn, and a hook process lives for one event, so ADR 0047 gave them a session journal. ADR 0048 let the judge read it too. ADR 0049 removed the judge, superseded both ADRs, and kept the journal, the Stop check and the nudges in one line of its "What stays" list. This ADR records how they work in fx 0.5.0. The code is `src/lib/journal.ts`, `src/lib/stop-check.ts`, `src/lib/loop-tracker.ts` and `src/lib/evidence.ts`; every number below lives in `src/lib/thresholds.ts`.

## Decision

**The journal.** One append-only file per session at `<state dir>/sessions/<key>.jsonl`, where the state directory is `$XDG_STATE_HOME/fx` (default `~/.local/state/fx`) or `%LOCALAPPDATA%\fx` on Windows. The key is the harness session id, with `__<agent_id>` added for a subagent's own events; a payload with no session id gets no journal and no turn checks. The directory is created mode 0700 and the file 0600 on POSIX. Each line is one event:

- `prompt`: a turn start. On Claude Code and Codex it carries the user's text, redacted and capped at 1,500 characters. A subagent's turn start and every opencode turn start carry no text, and fx's own Stop continuation is not recorded as a prompt. A subagent's first prompt carries its agent type.
- `tool`: the kind (edit, read, shell, other), the outcome, the command normalized, redacted and capped at 500 characters, and whether the call verified the work.
- `edit`: one per edited file, its path relative to the repository, or absolute when outside it.
- `nudge` and `stop-block`: what the checks already said this turn.
- `fx-json-hooks`: the SHA-256 of the top-level `.fx.json` `hooks` value as this session last saw it, the baseline for the change notice (ADR 0052).

A line is at most 2,048 bytes; free text is cut until it fits. When a file passes 256 KiB it is cut to its newest half, keeping its first prompt, its last prompt and its newest `fx-json-hooks` line, written aside and renamed in. Readers read at most the last 256 KiB and skip a torn line. Journals not modified for seven days are deleted at session start on Claude Code and Codex, and when the plugin loads on opencode. The journal never leaves the machine. A write failure is one stderr line and never a throw; a prompt that cannot be written is retried with no text, and if that fails too the file is emptied or removed, so the turn boundary is not lost.

**What verifies.** A shell call verifies when it succeeded and either runs one of the repository's `test_one`, `test_scope`, `test_all` or `lint` commands with nothing piped or chained after it, or its last 4 KB of output holds a pass summary (`ALL GREEN`, `N passed` with no failures, `0 failures`, `test result: ok.` and similar) and it was not run by a program that can quote one, such as `echo`, `cat` or `grep`. An interrupted call and a failed call never verify.

**The Stop check.** A turn is blocked once when it has an edit to a file inside the repository that is not documentation (`.md`, `.mdx`, `.txt`, `.rst`, `.adoc`) and no verifying call after the last such edit. The block tells the agent to run `test_scope` (or `test_all`, or "the project's tests" when neither is set) and report the result, or say plainly that it cannot. On Claude Code and Codex it runs at Stop and, with the subagent's own journal, at SubagentStop. It blocks at most once per turn: a `stop-block` event is written first, and a block that cannot be journaled is allowed instead and logged with source `journal-error`. A Stop that the harness marks as already continuing from a Stop hook is never blocked. opencode cannot hold a turn open, so on both majors the check runs for the turn that just ended when the next user message arrives, and its text is queued and pushed once into the system text of that session's next request. On opencode 2.x the reminder is skipped for a turn with a completed shell call that carried no exit status and no output, since fx could not tell whether it passed.

**The loop nudges.** Every tool call is recorded after it runs. Past a threshold the tracker returns one advisory line pointing at fx-debug, as `additionalContext` on Claude Code and Codex and through the same queue on opencode. Each signal fires at most once per turn, checked in this order:

1. `repeat-failure`: the same normalized command failed 3 times in the turn with no edit between. A shell loop that repeats one command counts once per iteration, up to 3.
2. `unverified-writes`: 10 edit events since the last verifying call.
3. `passive-stall`: 12 tool calls in a row that are reads (read tools and read-only shell commands, ADR 0050) with no edit. A subagent's own journal skips this signal.

A subagent whose type is one of fx's read-only review agents gets no nudges.

**Switches.** In the top-level `.fx.json` (never one below it), `hooks.stop_check: false` turns the Stop check off and `hooks.loop_nudge: false` turns the nudges off. Both default to on, and a value that is not a boolean is ignored. Recording continues with either switch off, so turning one back on mid-session sees the whole turn.

**Failure.** Both checks fail open. A load failure, a crash or an unreadable journal ends the turn normally or prints no nudge, writes one stderr line starting `[fx]`, and leaves a decision-log line with source `stop-error` or `tracker-error`. A UserPromptSubmit hook never exits 2, so a broken journal never blocks the user's prompt.

## Consequences

- A turn that edits code and ends without a passing check is stopped once on Claude Code and Codex. The agent can still end the turn on its second try; the check asks for evidence and does not demand it.
- An edit outside the repository, such as a scratch script, and an edit to documentation need no check. A test run that passes but prints no recognised summary and is not one of the `.fx.json` commands does not verify.
- On opencode the check is a reminder one request late, and the queue lives in the plugin's memory: at most 5 lines per session and 50 sessions, lost on a restart.
- The journal keeps the user's prompt text, redacted. Since ADR 0049 no shipped code reads it (`lastUserPrompt` in `src/lib/journal.ts` has no caller outside its tests); it stays because a turn start must still be recorded, and dropping the text is a separate decision.
- opencode gives fx no way to tell a child session from the root, so on both majors a subagent's turn is checked as a root turn and `passive-stall` applies to it. On opencode 2.x the read-only agent exemption also does not apply, because the 2.1.4 prompt event carries no agent name.
- Recalibrating a threshold edits `src/lib/thresholds.ts` and nothing else.
