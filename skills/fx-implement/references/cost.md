**Measure the task before you dispatch the task reviewer.** From the
controller's own directory, run
`node <skill base directory>/../../scripts/build-cost --task <NN> --since <time from the dispatch line>`
(the script is `../../scripts/build-cost` from this skill's base directory) and
read the line it prints. When it shows `fx-tdd 0/<i>` with `i` above 0, no
implementer invoked `fx-tdd`. Pass the line to the task reviewer as
`[COST_LINE]` in every case (pass `unavailable` when it prints no line); the template turns `fx-tdd 0/<i>` into an
Important finding for a report with no captured RED run. The reviewer cannot be
told this later, because the line does not exist until you run the script.

(Write the line without the backticks.) It reads the transcript path the
SessionStart hook recorded in the git common dir (`fx/transcript-path`),
which every worktree of the repo shares. When it cannot find a
transcript it prints `cost unavailable` and the reason: ledger that line as it
is, and do not look for the file yourself. It also prints `cost unavailable`
when the transcript has no `Task <NN>: dispatched` write of its own, which
means the recorded path is another session's. The count is a time window: from
`--since` to the task's `Task <NN>: complete` write, or to the next task's
`dispatched` write if that comes first, or to the transcript's end. Controller
calls and subagents are both cut to that window, and a subagent counts toward a
task by the task number in its dispatch text.
