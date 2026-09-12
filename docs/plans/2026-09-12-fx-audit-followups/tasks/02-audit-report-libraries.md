# 02: The audit's Phase 4 report uses the offline libraries

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Core

**What to build:** the audit's own Phase 4 report looks like the architecture
report, with Tailwind styling and real Mermaid diagrams, and still makes no
request to any host. The audit skill follows the shared reference task 01
created instead of its own inline-styles-and-text-diagrams rule, and its
boundary stops saying the two reports differ in what they fetch.

**Files:**
- Modify: `skills/fx-audit/SKILL.md`

**Interfaces:**
- Consumes: `../../references/report-assets.md` (from task 01): its copy rule, missing-file rule, mismatch rule and the three `<script>` tags.
- Produces: nothing another task consumes. Task 09 exercises it live.

**Seam:** `scripts/check-all` for the citation; task 09's live run for the report itself (design seams 1 and 5).

**Risks:**
- The Phase 4 report is drafted under `.fx/<slug>/draft/` and moved into the slug directory before it is opened. The relative `../_assets/` path is wrong while the file sits in the draft directory and right once it is moved. The step must say the report is opened only after the move, which the skill already requires.
- The skill must still never publish the report and still name no temp directory.

**Idempotency:** a text edit to one file. Re-running finds the citation present and changes nothing.

**Testing:** search checks on the skill's text, the citation gate, and task 09's live run.

## Acceptance criteria

- [ ] `skills/fx-audit/SKILL.md` cites `../../references/report-assets.md` in Phase 4's report step.
- [ ] Phase 4's report step copies the libraries as that reference says, loads them with its tags, and states that opening the report fetches nothing from any host.
- [ ] No sentence in the skill still asks for inline styles only or diagrams as preformatted text or inline SVG.
- [ ] The Boundary no longer says the two HTML reports differ in what they fetch; it says both load the libraries from `docs/plans/_assets/` and make no request to any host.
- [ ] `python3 scripts/check-paths` passes and reports one more citation than before this task.
- [ ] `python3 scripts/check-artifacts` and `python3 scripts/check-prose skills/fx-audit/SKILL.md` pass.
- [ ] The skill body stays under 500 lines.

## Steps

- [ ] **1. Write the failing check**

```bash
grep -c 'report-assets.md' skills/fx-audit/SKILL.md
grep -c 'preformatted text or inline SVG' skills/fx-audit/SKILL.md
grep -c 'differ in what they fetch' skills/fx-audit/SKILL.md
```

- [ ] **2. Run it: verify RED**

Run the three commands above.
Expected: `0`, then `1`, then `1`.

- [ ] **3. Implement the minimum that passes**

Invoke `fx:fx-authoring` before editing, since the skill is instructions an agent follows. Change Phase 4's report step to follow `../../references/report-assets.md`; change the Boundary bullet about the two reports. Leave every other rule in the skill as it is.

- [ ] **4. Run it: verify GREEN**

Run the three commands from step 1.
Expected: at least `1`, then `0`, then `0`.

- [ ] **5. Run the gates**

Run: `python3 scripts/check-paths && python3 scripts/check-artifacts && python3 scripts/check-prose skills/fx-audit/SKILL.md && wc -l skills/fx-audit/SKILL.md`
Expected: every gate passes, `check-paths` reports one more citation, the line count is under 500.

- [ ] **6. Run the combined gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`, exit 0.

- [ ] **7. Commit**

```
git add skills/fx-audit/SKILL.md
git commit -m "feat(audit): render the Phase 4 report with the offline libraries"
```

No attribution trailers. Then continue to the next task: never stop and wait.
