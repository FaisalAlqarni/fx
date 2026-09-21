# Read-only is three mechanisms and one guarantee

`SURFACE.md` states the lens guarantee plainly: tool restriction is enforced by
the harness, so a lens physically cannot write to the repo. That sentence is
true on Claude Code because `tools:` is a hard allowlist. It is true on a third
runtime only if something enforces it there, and the mechanism is different on
each.

| Runtime | Mechanism | Strength |
|---|---|---|
| Claude Code | `tools: Read, Grep, Glob, Bash` | hard; `disallowedTools` applies first; the agent cannot even express a write |
| opencode | `permission: { edit: deny, bash: allow }` | hard; `write` and `patch` collapse onto `edit`; same strength as Claude Code |
| Codex | `sandbox_mode` in the role file (intent only) **and** a `PreToolUse` deny keyed on identity, gating shell text with `lib/plant-roles.js` | **strictly weaker: a heuristic gate in fx's own hook, not a harness-enforced boundary. See "Codex is not equivalent" below.** |

Codex needs both halves. Its documentation says a role file may set
`sandbox_mode = "read-only"`, and its own worked examples do. But it also says
the parent turn's live runtime overrides are reapplied when a child is spawned,
even if the role file sets different defaults. A role file is therefore a
default, not a boundary. The docs say as much about the other half too: treat
tool hooks as a useful guardrail, not a complete enforcement boundary.

Corroboration that neither half is sufficient alone: OpenAI's own read-only
reviewer ships as a **skill** whose read-only property is prose, and the
built-in `explorer` role is a zero-byte TOML file.

## What made the hook half possible

Measured 2026-09-21, Codex 0.155.1, `codex exec` spawning a subagent:

```
PreToolUse   tool='collaborationspawn_agent'  agent_id=None  agent_type=None
SubagentStart                                 agent_id='01a0…'  agent_type='default'
PreToolUse   tool='Bash'                      agent_id='01a0…'  agent_type='default'
```

A subagent's tool calls carry `agent_id` and `agent_type`; the controller's do
not. That is the discriminator a hook needs, and it is undocumented: the
published field table lists those two fields only for the subagent lifecycle
events.

The same probe settled something worth more than the lens question: Codex
serialises a shell call as `tool_name: "Bash"` with the command at
`tool_input.command`, which is Claude Code's shape exactly. `lib/git-guard.js`
stays one implementation across both.

## Codex is not equivalent (added 2026-09-21, task 06 fix rounds 1-3)

The table above used to read as though the three mechanisms were peers: a
harness-enforced allowlist on two runtimes, "belt and braces" on the third.
They are not peers, and presenting them as equivalent is itself the mistake
ADR 0018 exists to correct: a claim recording a guarantee stronger than
what was actually verified.

Claude Code and opencode enforce at the harness: the agent process cannot
even construct a tool call outside the allowed set. `tools:` and
`permission:` are boundaries the runtime itself refuses to cross.

Codex has no such boundary. `sandbox_mode = "read-only"` in a role file is
**intent, not enforcement**, measured directly (above): a spawned subagent
with that setting still wrote a file when told to. The only thing standing
between a Codex lens and a write is `lib/plant-roles.js`'s write-detector,
called from the `PreToolUse` hook: a heuristic pattern-matcher over shell
text, running in fx's own code, not the runtime's.

That gate was wrong three times before it held, at three different
granularities, each one the identical argument one level deeper:

1. **Binaries** (task 06, fix round 1). The gate denied shell text that
   *looked like* a write. `bash -c`, `sh -c`, `python3 -c`, `node -e`: any
   interpreter wrote a file with nothing on the denylist naming it.
   Fixed by allowlisting which binaries may run at all.
2. **Subcommands/actions** (fix round 2). `git` and `find`, now allowed
   binaries, still gated their OWN surface with a denylist. `git config`,
   `git clone`, `git archive --output=`, `git worktree add`, `find
   -fprint`, `find -fls` all wrote, none of them on any list of subcommands
   to refuse. Fixed by allowlisting which subcommand/action each may use.
3. **Flags** (fix round 3). `git diff`/`log`/`show`, now allowed
   subcommands, still let `--output=<path>` write their output to a file
   instead of stdout. Fixed by allowlisting which flags an allowed
   subcommand may carry.

A fourth round would find the same flaw at argument values, and a fifth
somewhere past that: a shell-parsing gate cannot be made complete. Round 3
is the last one this module chases for that reason: closing one more level
makes the guarantee look stronger without making it complete, which is a
worse position than an honestly-stated limit. `lib/plant-roles.js` carries
the full reasoning as a standing comment at the top of its write-detection
section, including the explicit statement that its threat model is a
well-behaved lens writing because nothing told it not to, an **accident**,
not an adversary. A prompt-injected instruction arriving through a reviewed
diff, deliberately shaped to evade this pattern-matcher, is out of scope.

## Consequences

- **The guarantee is stated per runtime, never once.** A claim that a lens
  cannot write is a claim about a mechanism; naming the mechanism is what keeps
  it honest when a fourth runtime arrives.
- **Prose is the floor, not the mechanism.** A lens still says it must not write.
  That covers the gap the docs admit to, and it is the only protection on a
  runtime fx has not yet measured.
- An undocumented field that a guarantee rests on gets a test, because the next
  release may remove it and nothing will announce that.
- **A table that presents unequal mechanisms as peers is a false record.**
  "Strength" is not a free-text label to fill in per row; it has to say
  which side of "the runtime enforces this" a mechanism sits on. Codex's row
  says so explicitly now, and points at the section that leaked three times
  before saying it.
