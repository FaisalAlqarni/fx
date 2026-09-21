# fx

The single canonical preamble. Injected into every session **and every
dispatched subagent**, on every runtime, from this one file.

Subagents read neither `CLAUDE.md` nor memory. Anything that must hold for a
subagent has to be here: that is the whole reason this file exists, and the
reason it stays short.

---

## Invoking a lane is not optional

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a lane applies to what you are about to do, you
MUST invoke it with {{SKILL_TOOL}} **before any response**, including before
a clarifying question and before reading a single file.

A lane that applies is not a suggestion. You do not get to decide it is
unnecessary because the work looks small, because you remember roughly what it
says, or because you are already most of the way through.
</EXTREMELY-IMPORTANT>

**Each lane's description says when it applies.** The runtime lists every lane
with its description; read that list against the task before anything else.

**Invoke, do not read.** {{SKILL_TOOL}} with the addressable name:
{{LANE:fx-tdd}}, {{LANE:fx-implement}}, {{LANE:fx-review}}. {{RESOLUTION}}.
Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text
without the obligation, which is the failure this section exists to stop.

**This binds subagents exactly as it binds a controller.** You are reading this
because it was injected into your context, whether you are running a session or
a single dispatched task. An implementer writing code invokes {{LANE:fx-tdd}}
first, every time, whatever the dispatching prompt did or did not say. In one
twelve-task build, **`fx-tdd` was never invoked once across 111 subagents.**

### Announce it

"Using `fx-tdd` to drive this from a failing test." One line, then work. The
announcement is not decoration: it is the thing that makes a skipped lane
visible to the person reading along.

## Always, lane or no lane

- **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
  "Generated with" in a commit message, PR body, or anywhere else.
- **Integration is the user's decision.** Never merge, open a PR, or move the
  base branch as the end of a task. **Nothing leaves the machine** unless the
  user initiates it.
- **Evidence before claims.** "Tests pass" means you ran them and read the
  output. If a step was skipped, say so.
- **No em dashes or en dashes** in any output, chat and commit messages included.

{{LANE:fx-humanize}} carries the full prose treatment, 35 patterns with examples.
