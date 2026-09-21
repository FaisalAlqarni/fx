# Task 02 review findings

**Spec compliance: PASS** (9/9 criteria met)
**Task quality: PASS**, with one Important finding

Written by the controller from the reviewer's returned text, per the ruling that
reviewers return findings as text.

## Verification the reviewer performed

Working tree at `58322e9`, all commands run from the worktree.

- `lib/preamble.js:21` -> `const HARNESSES = ['claude-code', 'opencode', 'codex'];`
  and `ls references/harnesses/` returns exactly those three names.
- All three reference files read in full. Every fact the task's content section
  requires is present, and the files on disk match the diff hunks byte for byte.
- Every sentence in the three files is declarative. No imperative directed at the
  agent's next action.
- Gate behaviour checked directly rather than from the report: the phrase form is
  caught, the English verb "Read the plan, once" passes, a fenced occurrence
  passes, and the backtick and open-paren forms both fail with exit 1.
- `scripts/check-all:25` carries `run check-tool-names`, placed with the other
  text gates. Full run -> `ALL GREEN`.
- `scripts/check-paths` -> `OK: 61 reference citations, all anchored and
  resolvable`.
- `git diff 64bc6b2..58322e9 --stat` touches no `skills/*` file. An independent
  grep across every `SKILL.md` and `*-prompt.md` for tool-shaped forms, including
  tools outside the gate's own list, returned zero matches: the empty modify-set
  is real, not an artifact of the gate's blind spot.
- `lib/git-guard.js` untouched. Commit message carries no attribution trailer.

## Findings

**Important.** `scripts/check-tool-names`'s `TOOLS` list omits `Bash`, `Write`
and `Edit`, three of the six tools that `references/harnesses/claude-code.md:10`,
shipped in the same commit, documents as Claude Code's vocabulary. A fixture
using "the Bash tool", `` `Write` `` and `` `Edit` `` produces
`check-tool-names: OK`, exit 0. The reasoning that makes the gate match
tool-shaped forms applies identically to these three.

Confirmed first-hand by the controller before entering the fix loop. It was
inherited verbatim from the task file's own step-1 code block, so it is a plan
defect rather than an implementer deviation. Zero live impact today, because no
skill body uses those forms, but it is a latent hole in the guarantee ADR 0016
assigns this gate.

**Minor.** The implementer's self-review said the specified pattern "was already
correct against this repository", which is true of current content and not of the
vocabulary the harness files themselves document.

**Minor, cannot verify.** The harness files carry version numbers the task did
not request. Reasonable under ADR 0016's measured-facts framing, but the reviewer
had no way to check them from inside the repository.

## Not defects, checked and clean

- README's gate table omission: correctly deferred, task 13 owns the README.
- Placement of the new `run` line in `check-all`: correctly grouped.
