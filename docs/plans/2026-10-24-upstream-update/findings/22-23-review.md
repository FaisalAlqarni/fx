### Spec Compliance

Task 22: ADR set. Spec compliant with two factual defects, see Issues.
- ✅ Six ADRs 0053 to 0058 exist (`ls docs/adr`), each line 1 `# <title>`, line 3 `Status: accepted, 2026-10-25.`, headings Context, Decision, Consequences (read in diff). Each names enforcing files; 0057 states the revisit condition (0057:495 of diff, "Revisit when superpowers publishes a quality measurement").
- ✅ ADR 0045 diff is one added status line plus its blank line (`git diff 7acbb63..7b9bd71 -- docs/adr/0045*`): `Status: accepted. Amended by 0058.` Nothing else touched.
- ✅ `check-prose` on README, INSTALL, SURFACE, commands/fx-pr.md, ADRs 0053-0058 and 0045: OK. No U+2013/U+2014 in them (grep).

Task 23: ❌ Issues found
- ❌ Missing: INSTALL.md says nothing about the glossary migration or the `glossary_rename` key (grep "CONTEXT.md|glossary_rename" INSTALL.md: no hits; only INSTALL.md:305 mentions GLOSSARY.md). The brief requires README and INSTALL to "say what happens to an existing CONTEXT.md". INSTALL.md:329-337 is where `.fx.json` keys (`hooks`) are documented, so the key belongs there.
- ✅ README: three commands in table (README.md:117-119 at HEAD region), migration paragraph at README.md:121-125, layout lines 20/7. `.fx.json` `glossary_rename` named. SURFACE: eight/seven counts, three rows, migration paragraph naming the key (SURFACE.md:221), `wayfinder.md` in References.
- ✅ INSTALL pin: `grep -c "#v0.6.0"` 1, `#v0.5.0` 0. Manifests: `"version": "0.6.0"` in .claude-plugin/plugin.json:3, .codex-plugin/plugin.json:3, .agents/plugins/marketplace.json:9, package.json:3.
- ✅ commands/fx-pr.md Evidence ends with an explicit `Not run:` line; skills/fx-pr/SKILL.md carries the same text (diff identical hunks).
- ✅ Counts at HEAD: 20 skills, 7 commands, 6 agents, references 33 files / 29 markdown (find), vocab list of 14 matches the directory.
- ⚠️ Cannot verify from diff: the `scripts/check-all` ALL GREEN claim (not re-run, per rules; report says exit 0, 718 lines). External claims about superpowers 6.4.1 / 7.0.1 (ADR 0053, 0056, 0057) are unverifiable here; 7.0.1 does match skills/fx-authoring/SKILL.md:76.
- ⚠️ Literal string `/fx:fx-pr`, `/fx:fx-retro`, `/fx:fx-what` appears only in SURFACE.md; README and INSTALL name them as `fx-pr` etc. (README table, README.md:104-ish "How you type them" line gives the prefix). Treated as the repo's existing convention, not a defect.

### Strengths
- Shape discipline is exact: every new ADR passes the three-heading/status-line shape, and the 0045 change is one line.
- Most ADR claims hold at HEAD: size numbers (49175/31745/20774 bytes at dd99986), `PENDING` empty (src/tests/gates/skill-size.test.ts:15), check-all runs skill-size, glossary read order (src/lib/glossary.ts:8-9), `git mv`, plan-then-apply, docs/plans and docs/adr skipped (glossary-migrate.ts:19), user-invoked list and sidecar `allow_implicit_invocation: false`, completion.md:59 and fx-debug/SKILL.md:370 naming `/fx:fx-retro`, ledger-line shapes pinned in tests/gates/ledger-lines.test.js:72-78, [blocks]/[advisory] in fx-plan/SKILL.md:236-237, ADR 0058 step 6 at skills/fx-brainstorm/SKILL.md:64.
- SURFACE reference inventory was corrected beyond the ask and now matches the directory.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- INSTALL.md (whole file; add near INSTALL.md:329-337, the `.fx.json` keys section) · no mention of the existing-CONTEXT.md behaviour (read as before, one notice per session, `/fx:fx-setup` renames after asking once) or the `glossary_rename: "declined"` key · the brief and the lead's check require it · add a short paragraph and the key beside the `hooks` switches.
- docs/adr/0053-skill-size-gate.md:"References stay one level deep" · says `scripts/check-reference-leaves` enforces that a skill-local reference does not point to a further reference. The script scans only the top-level `references/` tree (scripts/check-reference-leaves:13-21, `find references`), not `skills/*/` files like skills/fx-implement/references/*.md. No other gate checks it either (check-paths only resolves pointers) · the ADR states an enforcement that does not exist · reword to say the rule is a convention checked only for `references/`, or extend the script.

#### Minor (Nice to Have)
- docs/adr/0056-reviewers-judge-a-vision-and-list-what-they-declined.md:"Ruled items reach the branch pass ... as ADR 0044 provides" · ADR 0044 describes lenses folded in as named checks, not ruled `declined:` items; the mechanism is in skills/fx-implement/references/final-review.md:9-11 · cite that file and say "extends ADR 0044".
- SURFACE.md:252 · "The six are in `references/stacks/`" is stale: the directory has seven profiles (web-polish added), and the same diff lists seven at SURFACE.md:~237 · change to seven.
- docs/adr/0054-the-glossary-is-glossary-md.md:"tested ... for four cases" · src/lib/glossary.test.ts also covers the CONTEXT-MAP/GLOSSARY-MAP pair and the declined key (lines 40-48), so the count is loose · say "covers" without a number.
- docs/adr/0058 and 0045 · ADR 0045 had no status line before, so the added `Status: accepted. Amended by 0058.` is a reasonable reading of the rule, but it has no date unlike every other ADR; controller to confirm that form.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The ADRs and most doc claims match the code, but INSTALL.md omits the required glossary migration text and ADR 0053 claims an enforcement the script does not perform.

## Ledger lines

Task 22: minor (deferred): ADR 0056 cites ADR 0044 for ruled items reaching the branch pass; the mechanism is final-review.md:9-11, not 0044.
Task 22: minor (deferred): ADR 0054 says the glossary is tested for four cases; glossary.test.ts covers more, drop the number.
Task 22: minor (deferred): ADR 0045's new status line carries no date, unlike every other ADR; controller to confirm the form.
Task 23: minor (deferred): SURFACE.md:252 says six stack profiles; references/stacks has seven.
