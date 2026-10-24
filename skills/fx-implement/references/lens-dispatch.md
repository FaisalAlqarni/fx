**Lens dispatch.** Read the `Tripwires:` line of the implementer's report
(`grep -n '^Tripwires:' <report>`), not the diff, and match it against the
"Per task (tripwire)" column of the lens table in `../../fx-review/SKILL.md` (§2).
Dispatch each lens it names (`fx-lens-security`, `-database`,
`-silent-failure`) alongside the task reviewer, same diff file, with the brief
line `mode: task` and the text of that lens's tripwire cell. The task reviewer
flags a tripwire the report missed; dispatch that lens then.
A lens whose column says `no`, and any lens whose tripwire does not match,
waits for the branch pass, which runs it only under the limited rule in Final review.
Reference the table, don't copy it. A lens's `[Critical]` and `[Important]`
findings enter the fix loop below like any other; its `[Minor]` findings
never do (see below).

**A lens has no Write tool and replies with its full findings**, not a
five-line contract. Save that reply verbatim with
your Write tool to `docs/plans/<slug>/findings/<NN>-lens-<name>.md`, the
reply text as the file content, without reasoning over it. The Write tool
takes the text as it is, so no line inside the reply can end the file early
or run as a command.

That path is what the fix loop and the final review read for this lens.
Never paste the reply itself into the ledger or a later dispatch.

**Route the lens's own findings by the severity it already tagged them
with**: `[Critical]` and `[Important]` are open, same as a reviewer's. A
lens reply has no `## Ledger lines` section for the fix loop to grep, so you
ledger its `[Minor]` lines yourself, right here, one line each:
`Task <NN>: minor (deferred): <one-liner>`. "A lens has no severity split"
is false: every lens tags each finding, and you already hold the full reply
in context from dispatching it, so this costs no extra read.
