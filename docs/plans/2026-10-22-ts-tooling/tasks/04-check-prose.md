# 04: check-prose on Node

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** `node scripts/check-prose [path ...]` reports exactly what the Python version reports: dash lines, stock vocabulary, hedges, closing fences with a language, unbalanced parentheses, the `prose-gate: quoting` exemption count, the 40-line report cap, the exemption list, and an explicitly named file under an exempt path still being read. Its explicit-path test moves to TypeScript. fx skills and agents that call it name `node`.

**Design:** Implementation Decisions > 2; Implementation Decisions > 5; Global Constraints

**Files:**
- Create: `src/scripts/check-prose.ts` (built over `scripts/check-prose`)
- Create: `src/tests/gates/check-prose-explicit-path.test.ts` (built to `tests/gates/check-prose-explicit-path.test.js`)
- Delete: `tests/gates/check-prose-explicit-path.sh`
- Create: `tests/equivalence/check-prose.json` and its golden
- Modify: `src/scripts/check-all.ts` (row `check-prose` runs `node scripts/check-prose`; row `check-prose-explicit-path.sh` keeps its name and runs `node tests/gates/check-prose-explicit-path.test.js`)
- Modify: any skill, reference or prompt under `skills/`, `references/`, `agents/`, `commands/` that invokes `python3 scripts/check-prose` (search with `git grep -n "python3 .*check-prose"`; none found on 2026-10-22, so expect none)

**Interfaces:**
- Consumes: `toPosixRel` (task 01).

**Seam:** `equiv check` and `check-all`.

**Tests:**
- Equivalence cases, each recorded from the Python script, every em or en dash in an input written as a JSON unicode escape (U+2014, U+2013) so the cases file stays dash-free: `clean` (prints the exemption count line and `OK: no dashes, no stock vocabulary, parentheses balanced`, exit 0); `em-dash` and `en-dash` (one line each: `  <rel>:<n>  dash`); `stock-word` per entry class: `delve`, `leveraging`, `testament to`, `it is important to note`; `noun-leverage-allowed` (`leverage` as a noun: no finding); `word-boundary` (`delved` inside an identifier: as recorded); `hedge` (`isn't just`); `fence-language-on-close`; `unclosed-paren`; `quoting-marker` (a block with `prose-gate: quoting` and a dash: exempted, count line `1 block(s) exempted by ...`); `exempt-path-walk` (a dash under `skills/fx-humanize/`: no finding on a walk); `exempt-path-named` (same file named as an argument: finding, exit 1); `report-cap` (45 dash lines: 40 report lines then `  ... and 5 more`); `non-ascii-word` (a stock word directly followed by U+00E9, which Python's Unicode `\b` and JavaScript's ASCII `\b` treat differently); `two-path-args`.
- `check-prose-explicit-path.test`: under `.worktrees/check-prose-test-<pid>/note.md` holding an em dash: `node scripts/check-prose <that file>` exits 1, and a whole-repo `node scripts/check-prose` exits 0; prints `check-prose explicit path: all passed`; the directory is removed afterwards.
- Live compare on the whole repo: identical, in the ledger.

**Risks:** the source must not contain a literal em or en dash (Global Constraints); write the characters as unicode escapes in a regular expression, never literally. The `non-ascii-word` case decides whether the port needs a Unicode-aware boundary such as `(?<![\p{L}\p{N}_])` with the `u` flag; match whatever the golden says.

**Testing:** recorded equivalence; gate test; `check-all`.

## Acceptance criteria
- [ ] `check-prose` cases check identical; live compare identical.
- [ ] `tests/gates/check-prose-explicit-path.sh` is deleted and its replacement passes in `check-all`.
- [ ] `git grep -nE "(python3?|bash|sh) [^ ]*scripts/check-prose"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the cases; record the golden**
- [ ] **3. Write the explicit-path test**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence/check-prose.json; node tests/gates/check-prose-explicit-path.test.js`
- [ ] **5. Port check-prose**
- [ ] **6. Verify GREEN**: same commands, then the live compare
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/gates/check-prose-explicit-path.sh
git add src/scripts/check-prose.ts scripts/check-prose src/tests/gates/check-prose-explicit-path.test.ts tests/gates/check-prose-explicit-path.test.js tests/equivalence/check-prose.json tests/equivalence/check-prose.golden.json src/scripts/check-all.ts scripts/check-all
git commit -m "build: check-prose on Node"
```
