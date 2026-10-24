# 07: Generators and check-generated on Node

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** Core

**What to build:** `node scripts/gen-codex-agents [output-dir]` and `node scripts/gen-command-skills` write byte-identical files to what the Python versions write, with the same `wrote ...` lines and the same refusals. `node scripts/check-generated` regenerates both into a scratch directory and fails on drift in either, beside sub-project 1's build drift and mode check. ADR 0028 says the generators are TypeScript and both trees are drift-checked.

**Design:** Implementation Decisions > 5; Implementation Decisions > 8; Testing Decisions

**Files:**
- Create: `src/scripts/gen-codex-agents.ts`, `src/scripts/gen-command-skills.ts`, `src/scripts/check-generated.ts` (built over the files at those paths)
- Create: `src/tests/gates/check-generated.test.ts` (built to `tests/gates/check-generated.test.js`)
- Create: `tests/equivalence/gen-codex-agents.json`, `tests/equivalence/gen-command-skills.json`, `tests/equivalence/check-generated.json` and their goldens
- Modify: `src/scripts/check-all.ts` (row `check-generated` runs `node scripts/check-generated`, name unchanged; add row `check-generated.test.js`)
- Modify: `docs/adr/0028-codex-agents-are-generated-to-disk-opencode-agents-are-converted-at-runtime.md` (amendment line dated the commit day)
- Modify: `SURFACE.md` only where it names an interpreter for these scripts

**Interfaces:**
- Produces: `scripts/gen-command-skills [output-root]`: new optional argument, default the repo root; writes `<output-root>/skills/<name>/SKILL.md` and `<output-root>/skills/<name>/agents/openai.yaml`; `wrote` lines print the path relative to the repo root when the output root is the repo root, else relative to the output root.
- Produces: `scripts/check-generated` checks, in order, each with its own message: codex agents (`FAIL: codex/agents has drifted from a fresh generation of agents/*.md`, then the differing paths, then `Run scripts/gen-codex-agents and commit the result.`), command skills (`FAIL: skills generated from commands/ have drifted from a fresh generation`, the differing paths, `Run node scripts/gen-command-skills and commit the result.`), then sub-project 1's build block unchanged. Success prints `check-generated: OK`.
- Produces: `scripts/check-generated --compare <expected-dir> <actual-dir>`: sub-project 1's comparison mode, kept with the argument order, messages and exit codes sub-project 1 gave it (`FAIL: generated JavaScript has drifted from src/`, `FAIL: <path> should be executable`), which `ts-toolchain.test` calls.
- Consumes: `runNode`, `toPosixRel` (task 01).

**Seam:** `equiv check` with tree snapshots; `check-generated.test`; `check-all`.

**Tests:**
- gen-codex-agents cases, `tree: "out"`, args `["{root}/out"]`: `repo-agents` (`agents/*.md` copied from `old.rev`: tree and `wrote <ROOT>/out/<name>.toml` lines equal); `one-write-tool-excluded` (an agent with `tools: Read, Edit` is not generated); `triple-quote-refused` (a body with `"""`: stderr and exit 1 as recorded); `no-frontmatter`; `too-few` (one agent only: the `expected at least the lenses and the devil's advocate; got 1` message); `default-dir` (no argument: tree `codex/agents`).
- gen-command-skills cases, `tree: "skills"`: `repo-commands` (`commands/` and `skills/fx-audit/SKILL.md` copied from `old.rev`: tree and `wrote` lines equal); `folded-description`; `argument-hint`; `no-frontmatter` (`no frontmatter found`, exit 1); `already-generated` (the generated skills at `old.rev` copied in as well: tree unchanged, which is the idempotency the script's docstring promises).
- check-generated cases: `clean` (`check-generated: OK`), `codex-drift` (one TOML edited), `skills-drift` (one generated `SKILL.md` edited: the new message; this case is recorded from the new script because the old one cannot report it, and is the only case in this plan so recorded; it lives in `check-generated.test`, not in the cases file).
- `check-generated.test`: the `skills-drift` case above: exit 1 and the three lines named in Interfaces, with the edited path.
- check-generated `--compare` cases, recorded from the bash script on two written directories: `compare-clean` (exit 0), `compare-drift` (one file differs: `FAIL: generated JavaScript has drifted from src/`), `compare-lost-exec` (expected `100755`, actual `100644`: `FAIL: <path> should be executable`), `compare-gained-exec` (expected `100644`, actual `100755`: output and exit as recorded).
- Live compare: both generators write identical trees from the repo's sources; in the ledger.

**Risks:** inside a check-generated case the old check-generated calls whatever `scripts/gen-codex-agents` the scratch copy holds, which is the new one once ported; that is intended, since the generators' own cases prove them. The codex TOML escapes (`toml_escape`, `toml_body`) and Python's `str.strip`, `splitlines` and `re.S` must be reproduced exactly; `splitlines` also splits on `\v`, `\f`, `\x1c` to `\x1e`, `\x85`, ` `, ` `, which JavaScript's `split('\n')` does not. Add a case with a ` ` in a description if the code uses `splitlines`.

**Testing:** recorded equivalence with trees; gate test; `check-all`.

## Acceptance criteria
- [ ] All three cases files check identical; live compares identical.
- [ ] `node scripts/check-generated` catches an edited generated `SKILL.md`.
- [ ] ADR 0028 carries the amendment.
- [ ] `git grep -nE "(python3?|bash|sh) [^ ]*scripts/(gen-codex-agents|gen-command-skills|check-generated)"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the cases; record goldens**
- [ ] **3. Write `check-generated.test`**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence; node tests/gates/check-generated.test.js`
- [ ] **5. Port both generators, then check-generated with the new block**
- [ ] **6. Verify GREEN**: same commands, then the live compares
- [ ] **7. Amend ADR 0028**
- [ ] **8. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **9. Commit by path**

```
git add src/scripts/gen-codex-agents.ts src/scripts/gen-command-skills.ts src/scripts/check-generated.ts scripts/gen-codex-agents scripts/gen-command-skills scripts/check-generated src/tests/gates/check-generated.test.ts tests/gates/check-generated.test.js tests/equivalence/gen-codex-agents.json tests/equivalence/gen-codex-agents.golden.json tests/equivalence/gen-command-skills.json tests/equivalence/gen-command-skills.golden.json tests/equivalence/check-generated.json tests/equivalence/check-generated.golden.json src/scripts/check-all.ts scripts/check-all docs/adr/0028-codex-agents-are-generated-to-disk-opencode-agents-are-converted-at-runtime.md SURFACE.md
git commit -m "build: generators and check-generated on Node; command skills drift-checked"
```
