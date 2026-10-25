Red-teaming this plan.

Adversarial review (plan mode) of `/development/fx/docs/plans/2026-10-24-docs-and-adr-lanes/plan.md` and its tasks 01 to 08, checked against `design.md` and the worktree `/development/fx/.worktrees/upstream-update` at 67584d9.

1. **[blocks] The migration cannot run on its one named target (design↔plan: story 13 cannot be delivered).**
   - **Problem:** advantage-backend's `.gitignore:67` ignores `.scratch/`, so its 12 issue files are untracked. Task 03 step 3 refuses when `.scratch/` is not tracked, and `git mv` fails on untracked files anyway.
   - **Fix (`tasks/03`, `commands/fx-setup.md`):** ask the owner how an ignored `.scratch/` should be handled. One option: move it with a filesystem rename, show the `.gitignore` line removal in the dry run, and leave `git add -- docs/issues` to the owner. The other is to drop advantage-backend from the design's scope.

2. **[blocks] The step that moves owner files has no code, no test, no rollback and no partial-failure rule (integrity).**
   - **Problem:** the glossary rename it copies (`commands/fx-setup.md:92-128`) runs a tested `lib/glossary-migrate.js` with a dry run by default and `--apply`. Task 03's migration is five lines of prose the model carries out by hand, with a blanket `.scratch/` to `docs/issues/` text replace.
   - **Fix (`tasks/03`):** add `src/lib/scratch-migrate.ts` on the same shape as `glossary-migrate`:
     - The dry run prints the moves, each pointer-line edit and the rollback commands.
     - `--apply` stops at the first failure and prints the rollback for entries already moved.
     - Tests on a `scripts/make-git-fixture` repo cover: an existing target, a dirty `.scratch`, an untracked `.scratch`, apply, and a second run that lists nothing.
     - Add a rule to `fx-setup.md`: when no human can answer, do nothing and do not write `declined`.

3. **[blocks] Task 01 breaks `user-invoked.test.js` by construction.**
   - **Problem:** `src/tests/gates/user-invoked.test.ts:142,144` asserts that `skills/fx-pr/SKILL.md` contains the four `## What and why` ... `## Merge danger` headings and `` `Not run:` ``. Task 01 moves both into `pr-template.md`, yet its acceptance criteria say the test passes.
   - **Fix (`tasks/01`):** add `user-invoked.test.ts` to Files. Point those assertions at `references/templates/pr-template.md`, and assert that the skill names the template path.

4. **[blocks] The reverse index hands superseded ADR decisions to lanes as if current (integrity).**
   - **Problem:** the supersede rule forbids editing an old ADR beyond its status line, so its `Evidence:` lines stay. `Claim` (task 06) carries no status, so `queryIndex` and the brief return dead decisions. The stale check also reports the same drift twice: once on the old ADR and once on its "Still in force" copy.
   - **Fix (`tasks/06`):** `parseDoc` reads the ADR's status line into `Claim.status`. `queryIndex` drops claims from superseded ADRs. The brief line prints the status for partly superseded ones. Add tests for each.

5. **[blocks] The supersede rule cannot be addressed and does not cover ADRs with no status line.** This re-opens part of a settled call (R4).
   - **Problem:** "Still in force" items are not numbered, so a later ADR cannot name them, and "the newest ADR alone tells the story" breaks after the second supersession. Also, once every surviving decision is restated, "Partly superseded" leaves two live copies of the same decision. Finally, fx ADRs such as 0006 and 0015 have no status line at all, and adding one is an edit the rule forbids.
   - **Fix (`tasks/02` items 3 to 5, `adr-template.md`):**
     - Number the Still in force items as decisions of the new ADR.
     - Have the owner choose: either "Superseded by NNNN (replaced: 2, 4; rest carried forward)", or keep "Partly superseded" and drop the restating.
     - Allow adding one status line under the title as the only edit to an ADR that has none.

6. **[blocks] The plan contradicts two standing ADRs without superseding either (design↔plan drift).**
   - **Problem:** the `completion.md` docs step "invokes `fx-docs`", but ADR 0006 says cross-references are "pointers, never invocations". Task 05 deletes `references/report-assets.md`, which ADR 0015:62 names as "where that copy lives".
   - **Fix:**
     - ADR 0061 (`tasks/05`) carries `Supersedes:` quoting 0015's sentence and sets 0015's status line.
     - ADR 0062 (`tasks/08`) partly supersedes 0006 for the docs step. The alternative is to make the docs step an offer.
     - This is the supersede rule's first real use, so the reviewer should check it.

7. **[blocks] The `visual-kit` host check rejects a faithful port.**
   - **Problem:** system-flow's `model/page-template.html:284` has `const NS = "http://www.w3.org/2000/svg"`, and SVG recipes carry `xmlns`. The rule `names a host: <url>` fails the repository case.
   - **Fix (`tasks/04`):** `kitErrors` exempts the XML namespace URIs (`2000/svg`, `1999/xlink`, `1999/xhtml`). Add a test where an `xmlns` passes.

8. **[blocks] Task 04's diff puts about 1.9 MB of minified JavaScript in front of the task reviewer and the lenses (owner's token budget).**
   - **Problem:** fx-implement and fx-review have no rule that leaves out vendored files, and the worktree has no `.gitattributes`.
   - **Fix (`tasks/04`):** create `.gitattributes` with `references/vendor/** -diff linguist-vendored`, so diffs show "Binary files differ". The SHA-256 gate already covers the bytes.

9. **[blocks] Task 03's acceptance grep fails by construction and rewrites a provenance row.**
   - **Problem:** `grep -rn "\.scratch" skills commands references` matches `references/vendor/mermaid-11.17.2.min.js` (lines 605 and 608), which stays until task 05. Separately, `skills/fx-plan/COVERAGE.md:69` records upstream's `.scratch/<slug>/issues/` path mapping to `docs/plans/<slug>/tasks/`. Rewriting it to `docs/issues/` makes the record false.
   - **Fix (`tasks/03`):** add `--exclude-dir=vendor --exclude=COVERAGE.md` to the grep, and leave `fx-plan/COVERAGE.md` untouched.

10. **[blocks] fx-audit's required Mermaid diagram has nowhere to go (design↔plan gap).**
    - **Problem:** `references/audit-template.md:225-227` requires a Mermaid "Lifecycle diagram". `fx-audit/SKILL.md:306` requires the Phase 4 report to carry every section of `design.md`, but kit pages never load Mermaid. Task 05 does not say how that diagram renders.
    - **Fix (`tasks/05`):** the report renders it with the static SVG recipe while the Markdown keeps Mermaid. Add this to the acceptance criteria.

11. **[advisory] The vendored integrity check only proves the table matches the files, not that the files are upstream's.**
    - **Problem:** the table and the files are written by the same task, and the npm comparison leaves no record. system-flow's names (`react.production.min.js`, `reactflow.min.js`, `elk.bundled.js`) do not match the plan's names or the paths inside the npm packages.
    - **Fix (`tasks/04`):**
      - Name the package path for each file: `react/umd/react.production.min.js`, `react-dom/umd/react-dom.production.min.js`, `reactflow/dist/umd/index.js`, `reactflow/dist/style.css`, `elkjs/lib/elk.bundled.js`.
      - Ledger both SHA-256 values and the tarball `integrity` for each file.

12. **[advisory] Licensing in consumer repos and the notices file.**
    - **Problem:** the copy rule commits the bundles into `docs/*/_assets/` without their licence files, and elkjs is EPL-2.0. `THIRD_PARTY_NOTICES.md:3` says "No code was copied", which becomes false. Task 05 also "drops" Tailwind and Mermaid from that file, which never listed them.
    - **Fix:**
      - `visual-assets.md` also copies the `LICENSE-*` files into `_assets/`.
      - Task 04 adds a "Vendored bundles" section and rewords line 3.
      - Task 05 removes its edit to `THIRD_PARTY_NOTICES.md`.

13. **[advisory] fx's own kit files go stale silently in repos.**
    - **Problem:** `fx-map-1.js` and `fx-tokens-1.css` are copied only when absent. After a rebuild, an old copy fails the checksum, is "left alone", and new pages load the old map.
    - **Fix (`visual-assets.md`):** any byte change bumps the number in the file name.

14. **[advisory] The map, Phase B's riskiest code, has no automated test, and its data can break the page.**
    - **Problem:** `fx-map-1.ts` has no test. A `</script>` inside a label breaks the inline `map-data` block.
    - **Fix (`tasks/04`):**
      - Move map-data validation and level navigation into a module node can test, and test it.
      - The page writer escapes `<` as `\u003c`.
      - Task 05's completion ledgers `Visual check: not run: no browser` unless a browser was actually found.

15. **[advisory] The stale check's semble dependency (`tasks/07` item 6).**
    - **Problem:**
      - Pass two has no verdict for "found nowhere".
      - semble's default repo is the main checkout, so it answers from code before the change.
      - The documented CLI fallback (`uvx --from semble[mcp]`) downloads from PyPI.
    - **Fix:**
      - Pass the worktree as semble's `repo`, and confirm every hit by reading the file at HEAD.
      - Never install a tool; a missing tool means moving to the next one.
      - When nothing finds the claim, list it as `stale: evidence not found`, never drop it.

16. **[advisory] The verified marker dies on a squash or rebase merge.**
    - **Problem:** the SHA is a branch commit. Once it is unreachable, `git diff <sha> HEAD` errors and `stalePassOne` has no verdict for it.
    - **Fix (`tasks/06`):** run `git cat-file -e <sha>^{commit}`; on failure return `recheck`/`unverified`. Test it with a bogus 40-hex marker.

17. **[advisory] The index cache misses deleted docs.**
    - **Problem:** `loadIndex` rebuilds only on a newer mtime, so a deleted doc's claims survive. It also creates `.fx/` in repos that have no `docs/`.
    - **Fix (`tasks/06`):** rebuild whenever the set of docs differs from the `verified` keys (or always rebuild), and skip writing when `docs/` is absent. Add tests.

18. **[advisory] The parser reads fenced code, and the claim text is defined two ways.**
    - **Problem:** ADR 0062 will show `Evidence:` examples inside code fences, which would put fake `engines/shortlink/...` claims into fx's own index. Separately, "nearest non-blank line above" returns the last wrapped line, which contradicts "the decision's first line".
    - **Fix (`tasks/06`):** skip fenced blocks, and define the claim as the paragraph or list item. Add tests with a fence and with a wrapped decision.

19. **[advisory] The docs step's commits are never reviewed.**
    - **Problem:** the docs step runs after the exit gate and the final review (`completion.md`), so its commits, including new docs, see no review and no gate.
    - **Fix (`tasks/07`):** run it before the branch pass, or rerun the exit gate on the docs commit and name it in the report.

20. **[advisory] The reverse lookup costs context in every lane.**
    - **Problem:** six lanes run a node command on every invocation, even in repos with no `docs/`. Only the brief caps the result at 20 claims, and claim text has no length limit against the brief's 12,000-byte cap.
    - **Fix (`tasks/08`):**
      - `docs-lookup.md` skips the lookup when there is no `docs/`.
      - `docs-index query` takes `--limit 20` and prints `+n more`.
      - The brief cuts claim text at about 200 characters.
      - Add a `brief-size` fixture with 20 claims.

21. **[advisory] A `Docs claim wrong:` line goes nowhere outside fx-implement (design gap).**
    - **Problem:** brainstorm, debug and architecture run standalone with no ledger, so the line is lost.
    - **Fix (`references/docs-lookup.md`):** outside a build, tell the owner and point at `fx-docs`.

22. **[advisory] Two global constraints contradict each other, and both go into every brief.**
    - **Problem:** "labels in English" conflicts with "Arabic default locale, RTL throughout ... pages".
    - **Fix (`plan.md`, `design.md`):** limit the Locale line to product UI guidance; pages default to `lang="en" dir="ltr"`.

23. **[advisory] Task 03's 60-row index is underspecified and expensive.**
    - **Problem:**
      - Some ADRs have no status line (0006).
      - Some carry their status in the body (0008:25, 0012:13).
      - Some use "Amended by" (0045), which fits none of the three index statuses.
      - None of the older ones has a date.
    - **Fix:** take the status from the status line, else from later ADRs' `Supersedes` lines. Take the date from `git log --diff-filter=A --format=%as`. Build the rows mechanically, not by reading 58 ADRs.

24. **[advisory] Token budget and blocking edges.**
    - **Fewer tasks:** merge 01 into 02, and 07 into 08. That gives 6 tasks; the three phase gates stay as they are.
    - **Blocking edge:** tasks 04 and 06 both depend only on 01, and both edit `scripts/build` and `scripts/check-all`. Add "Blocked by: 04" to 06, or state that tasks run one at a time.

Not checked: SKILL.md byte sizes (I could only count lines, not bytes, so the plan's size figures are unverified), conformance row 09's internals, and whether this runtime has a browser.

1. Discuss all: walk every finding one by one.
2. Discuss some: you pick which findings to dig into.
3. Continue: proceed as the reviewer sees fit (I'll resolve/fold in the rest).

Which?