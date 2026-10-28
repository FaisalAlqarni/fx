# 18b: Coverage audit fixes before the proof runs

**Status:** ready-for-agent
**Blocked by:** 18a
**Phase:** Hardening

**What to build:** the code, test and text changes the controller's coverage-audit ruling assigns to 18b, from docs/plans/2026-10-28-system-flow/findings/coverage-audit.md rows G1, G3, G4, G11, G13, R2, R3, and the design.md amendments for G7, G10, R1, R4 to R10 and the schema location. Each code-side row gets a test that names the design passage it proves; where the test shows the behaviour is missing, implement it in the module that owns it.

**Design:** Renderers; Layout; Error handling; Output location; Fragments and merge

## Acceptance criteria
- [ ] G1: the page's NAV holds the numbered chapter list and the deep diagram list with working relative links; each generated Markdown doc links its figure in the site; asserted.
- [ ] G3: dropped arrows are named under the figure and in the step captions; asserted on a figure with a dropped arrow.
- [ ] G4: Open questions, Corrections, Coverage and the store tables are asserted by content, not only by element id.
- [ ] G11: archify output pages hold no src or href outside the site, asserted with the fake archify output and a check the build runs.
- [ ] G13: a section with a folder gets an index.md in that folder listing its chapters and linking the site; asserted.
- [ ] R2 and R3: fragment-guide.md and planning.md state one id rule that admits l0-<area id> level-0 nodes, and that an edge links nodes of its own diagram; sidecar text tests assert both.
- [ ] design.md amended for G7, G10, R1, R4 to R10 and the schema location, each a short sentence where the design states the old rule.
- [ ] scripts/check-all stays green; every SKILL.md under 20,000 bytes.
