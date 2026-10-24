### Spec Compliance

- ✅ Spec compliant. File by file: skills/fx-implement/SKILL.md (Lens dispatch paragraph) and skills/fx-review/SKILL.md (§2 Lenses item) carry the exact command lines, the four shared sentences verbatim, and the fx-review-only sentence verbatim; src/tests/gates/tripwire-table.test.ts pins them; tests/gates/tripwire-table.test.js is the build of it. review-content test correctly untouched. The lens table rows are unchanged.
- C15 counts hold: four shared sentences in each skill (fx-implement diff lines 35-37 plus the paste sentence at 34; fx-review lines 68-71), one extra sentence in fx-review only (line 65). The test loop asserts all four in both files.
- Checked against src/lib/judge-review.ts: flags match (`--package`, `--root`, `--report`, `--lens`, `--harness`, lines 3 and 47-51). `tripwires` takes `--report` and no `--lens` (parseArgs line 53 makes `--lens` mandatory only for `search`); `authored` takes neither; the skill lines match. Output fields `add`, `unchecked`, `brief` exist (lines 226, 254, 314). `named` lenses are excluded from the questions (line 205) and `add` never drops a named one, so "dispatch the line's lenses plus `add`" is exactly what the code supports. Lens names `fx-lens-*` are the table keys (judge-questions.ts:118), which is what `--lens <lens>` expects.
- Named lenses always run: fx-implement keeps its existing "Dispatch each lens it names" sentence and adds the pinned sentence; the code cannot remove a lens. Holds.
- Failure fallback: bad flag, unreadable file, unknown lens or invalid `--harness` exit 2 (lines 150-160, 169), which the fourth sentence covers as "the command fails".
- ⚠️ Cannot verify from diff: the controller's expectation "unchecked lenses are dispatched rather than skipped". The pinned sentence says "neither added nor dropped", which is what C15/the brief mandate. For a lens the report did not name and `tripwires` lists in `unchecked`, the text leaves today's behaviour (not dispatched). Decide whether that is intended; a change needs the pinned sentence changed in the brief first.

### Strengths

- Added text is only command lines and the pinned sentences; no story. Gate test checks every sentence in both files, not just the first.
- The command lines are exactly the brief's, with `--report <report file>` only on `tripwires`.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- skills/fx-review/SKILL.md (new line 70 in the diff): "A lens in `unchecked`" has no referent in fx-review. Only `tripwires` returns a lens-level `unchecked` (judge-review.ts:226); `authored` returns unchecked files (line 254) and `search` returns unchecked functions per lens (line 314). The sentence is pinned verbatim, so fix by wording in a later change to the brief, not here.
- Both skills: `--harness <this harness>` never says which names are valid. An unknown value is a usage error (judge-review.ts:51), so the judge silently turns off for that harness. Name the accepted values once.
- skills/fx-implement/SKILL.md: `search` takes at least one `--lens` (judge-review.ts:53), and an empty dispatch set exits 2. Harmless because of the fallback sentence, but the text does not say to skip the call when no lens is dispatched. Also a lens the task reviewer later asks for ("dispatch that lens then") has no instruction to run `search` for it.
- skills/fx-review/SKILL.md (diff line 66): "Then, for the lenses you dispatch, run search" sits in the same bullet as "in the branch pass, and in a review with no ledger", so a reader can take search as branch-only. Lens dispatch in a per-task review through fx-review is not covered by `authored`, and the text is ambiguous there.

## Ledger lines

Task 12: minor (deferred): fx-review sentence "A lens in `unchecked`" has no lens-level referent in authored or search output; pinned verbatim, reword with the brief.
Task 12: minor (deferred): `--harness <this harness>` does not list the valid harness names; an unknown name turns the judge off silently.
Task 12: minor (deferred): fx-implement does not say to skip `search` when no lens is dispatched (exit 2) or to run it for a lens the task reviewer adds later.
Task 12: minor (deferred): fx-review search sentence shares a bullet with the branch-pass-only authored step, so its scope is ambiguous.
