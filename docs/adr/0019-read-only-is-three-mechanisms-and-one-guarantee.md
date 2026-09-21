# Read-only is three mechanisms and one guarantee

`SURFACE.md` states the lens guarantee plainly: tool restriction is enforced by
the harness, so a lens physically cannot write to the repo. That sentence is
true on Claude Code because `tools:` is a hard allowlist. It is true on a third
runtime only if something enforces it there, and the mechanism is different on
each.

| Runtime | Mechanism | What is missing or refused | Strength |
|---|---|---|---|
| Claude Code | `tools: Read, Grep, Glob` | no write tool and no shell | hard; the harness offers the agent no tool that writes |
| opencode | permission allowlist: `"*": deny` first, then `read`, `grep`, `glob` and `list` allowed, `edit` and `bash` denied, and `external_directory` allowed only under fx's references | only the read tools are left: no write tool (`write` and `patch` collapse onto `edit`), no shell, no `webfetch` or `websearch`, no `task`, no MCP tool, and nothing opencode adds later; see below | hard |
| Codex | `sandbox_mode` in the role file (intent only) **and** a `PreToolUse` deny keyed on the identity SubagentStart recorded | the shell is kept, because Codex has no read tool; for a read-only or unrecorded agent id the hook refuses any shell call the classifier in `lib/plant-roles.js` does not clear, `apply_patch`, `spawn_agent`, every `mcp__*` tool, and every other tool | **strictly weaker: a heuristic gate in fx's own hook, not a harness-enforced boundary. See "Codex is not equivalent" below.** |

Until task 17 (amendment A5) the Claude Code row read `tools: Read, Grep,
Glob, Bash` and claimed the agent "cannot even express a write", and opencode
read `bash: allow`. Both were false: a lens with a shell can write through it,
and in the first live run of conformance row 12 a lens on each runtime said so
unprompted. The shell is now gone on both, the agents read the packaged diff
file they are handed instead of running git, and row 12 probes a shell write
as well as an editing-tool write.

**opencode is a permission allowlist** (task 17 fix round 1). The first
version denied `edit`, `bash` and every MCP tool by name and pattern, and the
security lens found `webfetch` still allowed: outbound HTTP from an agent that
reads untrusted diffs. A denylist misses whatever it does not name, so the
block is now the same fail-closed shape as the Codex hook. Evidence, from
opencode 1.18.31 at the commit `research/opencode-subagents.md` used, each
file byte-identical in the installed 1.18.25:

- The last matching rule wins, in key order: `fromConfig` turns keys into
  rules in order (`packages/opencode/src/permission/index.ts`, lines 186 to
  198), and `evaluate` and `disabled` both take the last rule whose key
  matches as a wildcard (lines 28 to 32 and 204 to 214). The agent's block
  is merged after the defaults (`agent/agent.ts`, line 293). So `"*": deny`
  goes first and the allows follow it.
- A hidden tool is never offered to the model (`session/llm/request.ts`,
  lines 208 to 214), and code mode's MCP catalog is filtered the same way
  (`tool/registry.ts`, line 286).
- The pure reads are `read` (`tool/read.ts`, line 256), `grep`
  (`tool/grep.ts`, line 40) and `glob` (`tool/glob.ts`, line 29). `list` asks
  nothing in 1.18.31, but the config schema still declares it.
- A read outside the project asks `external_directory` with the pattern
  `<parent dir>/*` (`tool/external-directory.ts`, lines 28 to 37), and `*`
  crosses `/` (`packages/core/src/util/wildcard.ts`). So `<references>/*`
  allows every file under fx's references, and every other directory outside
  the project stays denied.

`read: allow` replaces opencode's default ask on `.env` files for these
agents, which matches Claude Code, where `Read` has no such ask. Measured from
source, not from a live session: task 21 runs row 12 on opencode, and adds a
refused `webfetch` and MCP call.

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
