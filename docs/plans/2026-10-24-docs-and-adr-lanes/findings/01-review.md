### Spec Compliance

- ✅ Spec compliant. Every file in the brief's list has its hunk (checked file by file against the diff). The three implementer concerns are judged below; none is a requirement miss that blocks.
- ⚠️ Cannot verify from diff: the live lane-triggering bench (fx-architecture still wins its own prompts, "record this decision" invokes fx-adr) is on request only and was not run. description-overlap, skill-size and conformance row 09 results are the implementer's reported runs; I did not re-run them.

### Strengths

- Valid runtime RED reported for both new assertions (reference-leaves "0 !== 1", user-invoked "skills/fx-adr/SKILL.md exists"), then GREEN across the named gates.
- scripts/check-reference-leaves:1-27 takes a root, prunes vendor in both the source scan and the target `find`, keeps the output lines unchanged. I ran it on the repository: `OK: no reference links to another reference`. The five scratch-tree tests in src/tests/gates/reference-leaves.test.ts:27-51 match the brief's five cases and assert exit codes and exact output lines.
- Moved text is verbatim: pr-template.md:3-18 equals the removed `## Write` block (including `Not run:` and the "No code, diff or diagram" line); retro-template.md:3-7 equals the removed lessons/retro bullets; "Citation or drop", redaction and the fbrain bullet stayed in the command.
- design-template.md is a 100% rename. `grep -rn "references/design-template.md"` over skills, commands, references, src, scripts, tests, SURFACE.md and README.md prints nothing (only historical docs/plans files hold the old path, outside the acceptance grep scope).
- skills/fx-adr/SKILL.md (3,537 bytes) covers all nine content items in the required order, with the S5 supersede wording exact (status text `Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)`, "Never 'Partly superseded'", one added status line the only edit). Description carries all four triggers and a "Skip it and" stakes line, no `disable-model-invocation`.
- Offer lines are pointers ("offer `fx-adr`"), not invocations (ADR 0006). fx-architecture's description untouched, so no ADR words added to it; the three tests stay stated once in domain-modeling.md. `## ADRs: offer sparingly` kept; `### ADR format` deleted; "Where this is used" names `fx-adr` by lane name.
- No em or en dashes in the added lines (grep of the diff's `+` lines: none). All four manifests read 0.7.0; README and SURFACE rows added; EXPECTED=21.
- Measured sizes (report, bytes): fx-adr 3537, brainstorm 18608, review 15779, architecture 8692, audit 17721, pr 964, retro 2748. I re-measured fx-pr 964 and fx-retro 2748 with `wc -c`. All under 20,000.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. skills/fx-retro/SKILL.md (2,748 bytes) is over the acceptance bound of 2,600 (expected 2,300 plus 300) by 148 bytes. Judgement on concern 1: the expected 2,300 was not reachable by this change. The moved text was about 390 bytes and the pointer replaces most of it; the file fell 2,990 to 2,748 (242 bytes), and further shrinking would cut the command's own rules, which the brief says stay. The 20,000-byte gate has ample room. Controller should ratify the deviation (the estimate was wrong, not the work) rather than send the implementer back.
2. package-lock.json:3 and :9 still read 0.6.0 while package.json reads 0.7.0. Judgement on concern 2: real, small drift. The file is tracked and the 0.6.0 release commit bbd241b bumped it, so the 0.7.0 release should too; it is outside this task's file list and release-version.test.js does not read it. Bump both lines (an npm version-only edit) in the release step or this commit.
3. SURFACE.md:235 heading `## References: 33 files, 29 markdown, ...` is now wrong. Judgement on concern 3: confirmed stale. `find references -type f` gives 37 and `find references -name '*.md'` gives 33 (four new templates; the design template only moved). Change to "37 files, 33 markdown". The line below it ("0 cross-links") still holds.

### Assessment

**Task quality:** Approved
**Reasoning:** The templates, leaf gate, lane, pointers and version match the brief and the S5 ruling, with valid RED/GREEN evidence and a clean repository leaf check. Only three Minor bookkeeping items remain (a size estimate that was unreachable, a lockfile version, a stale file count).

## Ledger lines

Task 01: minor (deferred): fx-retro SKILL.md is 2,748 bytes against the 2,600 acceptance bound; the 2,300 estimate was unreachable, ratify the deviation.
Task 01: minor (deferred): package-lock.json still reads 0.6.0 (lines 3 and 9) while the four manifests and package.json read 0.7.0; bump it with the release.
Task 01: minor (deferred): SURFACE.md:235 References heading says 33 files, 29 markdown; the tree now has 37 files, 33 markdown.
