# Harness facts are a fourth layer

`0003` split every fact fx carries into ecosystem, project and machine. Adding a
third runtime showed the split has no home for a fourth kind: facts that are
true of **the runtime executing the session**, in any repo, on any stack.

"Codex has no `Read`, `Grep` or `Glob` tool; it reads files through
`exec_command`" is not true of a stack, not true of one repository, and not a
command in `.fx.json`. Under the old split it had nowhere to go, so it would
have been written into the skills, which is the one place it must never be,
because a skill body is read by all three runtimes.

| Layer | Content | Home |
|---|---|---|
| Ecosystem | true in any repo using that stack | `references/stacks/<name>.md` |
| **Harness** | **true of the runtime, in any repo** | **`references/harnesses/<name>.md`** |
| Project | true of this repo only | `repo.md` |
| Machine | commands, paths, coverage | `.fx.json` |

## Skills name actions, never tools

A lane says "search the repository", never "use Grep". The tool vocabulary lives
in the harness file and nowhere else. This is not a style preference: it is what
makes one skill body correct on three runtimes, and it is the rule that the only
project shipping to eighteen harnesses enforces on contributors.

A harness file carries tool vocabulary, subagent dispatch, sandbox behaviour and
invocation syntax. It carries **nothing load-bearing**: see `0020`.

## Consequences

- **A missing harness file degrades, it does not fail.** Same rule as a stack
  named in `.fx.json` with no profile written yet.
- **Adding a harness is adding a file, plus a delivery.** If supporting a new
  runtime requires editing a skill, the fact was written in the wrong layer and
  the edit is the symptom.
- A harness fact discovered mid-task gets written down immediately, the way
  `CONTEXT.md` is updated inline. Batching them is how they get lost.
