# 06: check-interpreters on Node with the shebang rule

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Core

**What to build:** `node scripts/check-interpreters [target ...]` keeps today's rule (every script invocation in a skill, reference or command names its interpreter, recognised in fenced blocks, after `Run:`, and in the inline and line-wrapped `Run` forms) with identical output. It gains one rule: when an invocation names an interpreter and the script path resolves to a file in this repo, the interpreter must be the one the file's shebang names. A leftover `bash scripts/review-package` fails the gate once review-package is a Node script (task 10). Its bash test moves to TypeScript.

**Design:** Implementation Decisions > 2; Implementation Decisions > 5; Implementation Decisions > 10

**Files:**
- Create: `src/scripts/check-interpreters.ts` (built over `scripts/check-interpreters`)
- Create: `src/tests/gates/check-interpreters.test.ts` (built to `tests/gates/check-interpreters.test.js`)
- Delete: `tests/gates/check-interpreters.test.sh`
- Create: `tests/equivalence/check-interpreters.json` and its golden
- Modify: `src/scripts/check-all.ts` (row `check-interpreters` runs `node scripts/check-interpreters`; row `check-interpreters.test.sh` keeps its name and runs `node tests/gates/check-interpreters.test.js`)

**Interfaces:**
- Produces: shebang rule. An invocation's first token is an interpreter when it is one of `bash`, `sh`, `node`, `python`, `python3`. Its second token, with a leading `<skill-dir>/` or `<skill base directory>/` replaced by the markdown file's own skill directory, is resolved against the markdown file's directory, then the repo root. When it resolves to a file whose line 1 is `#!/usr/bin/env <x>` or `#!/bin/<x>`, and `<x>` (with `python3` and `python` treated as one) differs from the first token, it is a finding printed as `  <file>: <n>: <cmd> (shebang: <x>)`. Findings end with `FAIL: <k> invocation(s) name a different interpreter than the script's shebang.` and exit 1. An unresolvable path is no finding. These lines print after the existing rule's lines.

**Seam:** `equiv check`, the gate test, `check-all`.

**Tests:**
- Equivalence cases (recorded from the bash script; none contains a shebang mismatch, so the new rule cannot change them; the gate prints findings in `find` order, so every case with findings holds exactly one finding file): `default-targets` (no argument, on written `skills/a/SKILL.md`, `references/r.md`, `commands/c.md`: prints `check-interpreters: OK (3 files)`), `empty-target` (`FAIL: no Markdown file found under ...`, exit 1), `missing-target`, `fenced`, `run-colon`, `inline-run`, `wrapped-run`, `mention-only`, `dollar-prompt` (`$ scripts/x.sh` in a fence), `two-targets`.
- `check-interpreters.test`: every expectation of the bash test with the same input and exit code, and the default run scans at least 50 files.
- `check-interpreters.test`, new rule: a skill `skills/s/SKILL.md` with `Run: bash scripts/t` and `skills/s/scripts/t` starting `#!/usr/bin/env node`: exit 1, output contains `  skills/s/SKILL.md: 1: bash scripts/t (shebang: node)` and `FAIL: 1 invocation(s) name a different interpreter than the script's shebang.`
- New rule: same with `node scripts/t`: exit 0.
- New rule: `bash <skill-dir>/scripts/t` resolves through the skill directory: exit 1.
- New rule: `bash scripts/missing.sh`: exit 0 (unresolvable).
- New rule: `python3 scripts/p` where `p` starts `#!/usr/bin/env python3`: exit 0.
- Live compare on the whole repo, with `sortLines: true`: identical (no mismatch exists today), in the ledger.

**Risks:** the awk program treats a fence toggle, `Run:`, a pending `Run` at line end and repeated inline `Run` matches with exact rules; port it line for line before adding the new rule, and get the equivalence green first.

**Testing:** recorded equivalence; gate test; `check-all`.

## Acceptance criteria
- [ ] Cases check identical; live compare identical.
- [ ] The new-rule tests pass; `node scripts/check-all` is green on the current repo.
- [ ] `tests/gates/check-interpreters.test.sh` is deleted.
- [ ] `git grep -nE "(bash|sh) [^ ]*scripts/check-interpreters"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the cases; record the golden**
- [ ] **3. Write the gate test, old expectations and new-rule cases**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence/check-interpreters.json; node tests/gates/check-interpreters.test.js`
- [ ] **5. Port the gate, get equivalence green, then add the shebang rule**
- [ ] **6. Verify GREEN**: same commands, then the live compare
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/gates/check-interpreters.test.sh
git add src/scripts/check-interpreters.ts scripts/check-interpreters src/tests/gates/check-interpreters.test.ts tests/gates/check-interpreters.test.js tests/equivalence/check-interpreters.json tests/equivalence/check-interpreters.golden.json src/scripts/check-all.ts scripts/check-all
git commit -m "build: check-interpreters on Node, interpreter must match shebang"
```
