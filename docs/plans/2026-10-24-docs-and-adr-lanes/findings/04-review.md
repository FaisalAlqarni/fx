### Spec Compliance

- ✅ Spec compliant. Checked file by file against the brief's Files list: HTML-REPORT.md, fx-architecture SKILL.md and COVERAGE.md, fx-audit SKILL.md, the five deletions, the allowlist (two vendor lines dropped, `docs/plans/_assets/` lines kept), SURFACE.md, both test files, ADR 0061, ADR 0015, index.md all have hunks. THIRD_PARTY_NOTICES.md and check-artifacts-remote.sh untouched (diff stat).
- ⚠️ Cannot verify from diff: the HTML-REPORT.md scaffold and the kit template were never opened in a browser (report ledgers "Visual check: not run: no browser"). `scripts/check-all` ALL GREEN is the report's claim; not re-run here per template.
- Standing ruling S3/S5 check of the supersession (read against skills/fx-adr/SKILL.md items 2 and 3):
  - 0061 numbers its decisions: 1 to 3 under `## Decision`, 4 to 8 under `## Still in force`, numbered on (0061 md lines 20 onward).
  - `Supersedes:` line (0061 line 5) names 0015 and quotes the exact sentence from 0015 that names `report-assets.md`.
  - Carry-forward is complete. 0015 holds five rulings besides the replaced one: no OS temp write plus the check-artifacts rule (now 4), the reversal of the inherited rule and its reason (5), reports are committed files (6), `.fx/` stays ignored (7), the offline-render rule (8). Each has a live copy; none dropped.
  - 0015 changed by exactly one status line (git diff --stat: 2 insertions, the line plus its blank separator; no other hunk). Index row 0015 reads `superseded by 0061`; 0061 row `accepted`.
  - Status wording: `Status: Superseded by 0061 (replaced: "A report vendors ... where that copy lives"; the rest carried forward).` It differs from the template form "replaced: decisions N" only because 0015 has no numbered decisions; fx-adr item 2 says an unnumbered ADR is named by quoting the replaced decision's lead phrase. This matches the brief's ADR paragraph and ruling 1. Accepted.

### Strengths

- The supersession is faithful and mechanical: every sentence of 0015 maps to a numbered decision of 0061, with Evidence lines on 1, 2, 3, 4, 8.
- The gate test now guards the retired names across skills, commands, references and agents, which is stronger than the grep in the brief, and the scratch Mermaid case asserts the exact message the brief gives.
- `references/vendor/` holds only the kit's files and licences (listing checked); old `docs/plans/_assets/` lines kept.
- No em or en dashes in any added line (checked).
- HTML-REPORT.md keeps the card elements, Top recommendation section, path and never-publish rule; fx-audit step 4 names page-template.html, visual-assets.md and svg-static.md and leaves gate and resume text alone.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- docs/adr/0061-the-visual-kit-replaces-the-tailwind-and-mermaid-reports.md:20-37 (decision 8) · it restates the replaced sentence ("A report vendors what it needs and never reaches for a CDN at render time") that decisions 1 and 2 also cover, so that rule has two live copies, against S5(b)'s one live copy per decision · trim decision 8 to the check-artifacts rule and leave the vendoring to 1 and 2.
- skills/fx-architecture/SKILL.md:100-101,124 · badge row still says `Strong` (emerald), `Worth exploring` (amber), `Speculative` (slate) and "an amber callout", while HTML-REPORT.md now says accent, alert, muted tokens · the two files name different colours for the same badges; align SKILL.md to the tokens.
- references/visual/visual-assets.md (one sentence) · edit to task 03's file is outside this task's Files list · the reason is sound (the retired-name test would otherwise fail) and the report discloses it; note only.

## Ledger lines

Task 04: minor (deferred): ADR 0061 decision 8 repeats the vendoring rule already in decisions 1 and 2, leaving two live copies.
Task 04: minor (deferred): fx-architecture SKILL.md badge row and ADR callout still name emerald, amber and slate while HTML-REPORT.md uses kit tokens.
Task 04: minor (deferred): visual-assets.md (task 03's file) edited by one sentence outside the Files list; disclosed and justified.

### Assessment

**Task quality:** Approved
**Reasoning:** The supersession of 0015 follows fx-adr and S5: numbered decisions, a quoted Supersedes line, every other 0015 decision carried forward, and 0015 changed by one status line. Only wording-level minors remain.
