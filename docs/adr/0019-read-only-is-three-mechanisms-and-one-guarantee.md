# Read-only is three mechanisms and one guarantee

`SURFACE.md` states the lens guarantee plainly: tool restriction is enforced by
the harness, so a lens physically cannot write to the repo. That sentence is
true on Claude Code because `tools:` is a hard allowlist. It is true on a third
runtime only if something enforces it there, and the mechanism is different on
each.

| Runtime | Mechanism | What is missing or refused | Strength |
|---|---|---|---|
| Claude Code | `tools: Read, Grep, Glob` | no write tool and no shell | hard; the harness offers the agent no tool that writes |
| opencode | `permission: { edit: deny, bash: deny, "*_*": deny }` | no write tool (`write` and `patch` collapse onto `edit`), no shell, and no MCP tool, see below | hard |
| Codex | `sandbox_mode` in the role file (intent only) **and** a `PreToolUse` deny keyed on the identity SubagentStart recorded | the shell is kept, because Codex has no read tool; for a read-only or unrecorded agent id the hook refuses any shell call the classifier in `lib/plant-roles.js` does not clear, `apply_patch`, `spawn_agent`, every `mcp__*` tool, and every other tool | **strictly weaker: a heuristic gate in fx's own hook, not a harness-enforced boundary. See "Codex is not equivalent" below.** |

Until task 17 (amendment A5) the Claude Code row read `tools: Read, Grep,
Glob, Bash` and claimed the agent "cannot even express a write", and opencode
read `bash: allow`. Both were false: a lens with a shell can write through it,
and in the first live run of conformance row 12 a lens on each runtime said so
unprompted. The shell is now gone on both, the agents read the packaged diff
file they are handed instead of running git, and row 12 probes a shell write
as well as an editing-tool write.

**opencode MCP tools are denied by one wildcard rule.** In opencode 1.18.31
(and byte-identical in the installed 1.18.25) an MCP tool's id is always
`<server>_<tool>`, both parts sanitized to `[a-zA-Z0-9_-]`
(`packages/opencode/src/mcp/catalog.ts`, lines 117 to 119).
`Permission.disabled()` matches each tool id against every rule's key as a
wildcard and hides the tool when the last match is a deny
(`packages/opencode/src/permission/index.ts`, lines 204 to 214), and the model
is offered only the tools that survive it (`session/llm/request.ts`, lines 208
to 214; code mode's MCP catalog, `tool/registry.ts` line 286). So `"*_*": deny`
hides every MCP tool. No built-in tool a read-only agent uses has an
underscore in its id. The rule also matches the `external_directory` and
`doom_loop` permissions, turning their asks into denies, which a read-only
agent can live with. Measured from source, not from a live session: task 21
runs row 12 on opencode.

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

A shell-parsing gate cannot be made complete, and each level closed makes the
guarantee look stronger without making it complete. `lib/plant-roles.js` carries
the full reasoning as a standing comment at the top of its write-detection
section, including the explicit statement that its threat model is a
well-behaved lens writing because nothing told it not to, an **accident**,
not an adversary. A prompt-injected instruction arriving through a reviewed
diff, deliberately shaped to evade this pattern-matcher, is out of scope.

## The Codex classifier as task 14 round 5 left it

Task 14 went past round 3 by the coordinator's ruling, and rounds 4 and 5
changed the classifier's shape rather than adding one more level:

- **The shell syntax is an allowlist.** A command is words joined by `|`,
  `&&` or `||`. A word is unquoted characters from a fixed set, a
  single-quoted literal, or a double-quoted string with no `$`, backtick,
  backslash or `!`. Anything else is refused before a flag is read, so no
  expansion happens: process substitution, brace expansion, globs, `;`,
  redirection. `~` and `^` may not start a word, and neither may `=`,
  because zsh expands `=name` to the path of `name` on `$PATH` (task 17).
- **The binaries are an allowlist**, and each one has **its own flag
  allowlist**. A flag not on its binary's list is refused, abbreviations
  included. `find` and `sed` have their own gates.
- **git is not available to read-only agents at all.** Every path left to it
  ran a command from repository configuration the review does not control:
  `diff.external`, textconv, `core.fsmonitor`, and a nested repository's
  config. A read-only agent reviews from the diff file it is handed. The
  controller and the writers keep git, through the git guard.

Three limits remain, named here so nothing reads as covered that is not:

1. **The hook cannot see the shell tool's `shell`, `tty` and `workdir`
   arguments.** It classifies the command text alone, so a call that picks a
   different shell or a different working directory is classified as if it
   had not.
2. **A relative entry in the user's `PATH`** (`.`, `bin`) could resolve an
   allowed binary name such as `cat` to a file in the reviewed tree. The
   classifier refuses `./cat` and `bin/cat`, but it cannot see what a bare
   name resolves to.
3. **Whether `write_stdin` gets a `PreToolUse` call is unverified.** If it
   does, the hook refuses it like any tool that is not Bash. If it does not,
   input to a running process goes unchecked. Task 22 measures it.

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
