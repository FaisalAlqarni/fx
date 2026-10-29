# Subagent controller wait: micro-test results

## Method

Fresh headless samples, one per call, no nested subagents:
`claude -p --model <sonnet|haiku> --system-prompt <ctx> --tools ""` on Claude
Code 2.1.310, in a scratch HOME and CLAUDE_CONFIG_DIR under
`/tmp/claude-1000/subagent-wait/`.

- System prompt: "You are running the fx-implement skill", then the full
  `skills/fx-implement/SKILL.md`, then `references/waiting.md` (baseline: the
  file at 6e2d88b; edited: the file in this commit).
- User message, subagent scenario: "You are an fx-implement controller
  dispatched as a subagent by the main session (the Agent tool launched you;
  your output goes back to that parent session, not to the user). You just
  dispatched the task 01 implementer with the Agent tool (agent id a5c8, report
  path .fx/x/reports/01-a-report.md). Every other task blocks on 01, the
  frontier is empty, and the ledger is up to date. What is your next action and
  last tool call? Answer with the exact tool call (tool name and arguments), or
  say END TURN if your last action is to end the turn with no further tool
  call."
- Main scenario (control): same, with the role line "running as the user's own
  main session (the user typed /fx-implement into this session; no Agent tool
  launched you)". It must still end the turn on the child's wake.

Pass for the subagent scenario: the last tool call is a tracked background
command that exits when the report file lands. Pass for the main scenario: the
turn ends with no follower. Every answer was read by hand.

## Counts

| Scenario | Model | Baseline pass | Edited pass |
|---|---|---|---|
| subagent | sonnet | 0/6 | 6/6 |
| subagent | haiku | 0/3 | 3/3 |
| main | sonnet | 5/5 | 5/5 |
| main | haiku | 3/3 | 3/3 |

Every baseline subagent answer ended the turn relying on the child's
completion, the failure observed in the real build. Every edited subagent
answer launched `until [ -s .fx/x/reports/01-a-report.md ]; do sleep 30; done;
echo REPORT_LANDED` with `run_in_background: true` as the last call. Every
edited main answer ended the turn and named the child's completion as the wake;
six of the eight stated that the follower is not needed for a main controller.

## Verbatim excerpts

Baseline, subagent, sonnet:

> The harness tracks the Agent dispatch, so its completion wakes me. On waking
> I read the report file and continue to the review package and task reviewer.

Baseline, subagent, haiku:

> The frontier is empty and every remaining task blocks on task 01, which is
> running as a tracked subagent (a5c8). Its completion will wake this
> controller, so ending the turn is safe.

Edited, subagent, sonnet:

> My last tool call is a tracked background Bash command, not END TURN. I'm a
> subagent controller, so the child's completion notice goes to the parent
> session and won't wake me. The report file is my wake.
>
> Bash(command: "until [ -s .fx/x/reports/01-a-report.md ]; do sleep 30; done;
> echo REPORT_LANDED", run_in_background: true, description: "Wait for task 01
> implementer report (agent a5c8)")

Edited, subagent, haiku:

> Last tool call, the report follower, run as a tracked background command:
> "command": "until [ -s .fx/x/reports/01-a-report.md ]; do sleep 30; done;
> echo REPORT_LANDED", "run_in_background": true

Edited, main, sonnet:

> I'm the main controller, so the runtime wakes me when implementer a5c8
> finishes. [...] I don't poll, sleep, or start a background follower. A
> follower is only for subagent controllers.

Edited, main, haiku:

> END TURN
>
> I'm the main controller, so the child's completion wakes this session and I
> don't need a tracked follower.

## Notes

- Samples ran with tools disabled, so two edited haiku answers added that Bash
  was not in their tool list; both still named the follower as the last call.
  This is an artifact of the harness setup, not of the wording.
- No new rationalization appeared in the edited runs, so no refactor round.
- This is a wording micro-test. The live behavior (a subagent controller woken
  by the follower) rests on the second 2026-10-28 controller, which woke on
  tracked background commands every time.
