# 09: README and SURFACE: counts, tables, and the ones already wrong

**Status:** ready-for-agent
**Blocked by:** 05, 08
**Phase:** Polish

**What to build:** the two inventory documents match what is on disk. They
already do not, before this plan adds anything, and a reader who finds one
count wrong stops trusting the rest.

**Files:**
- Modify: `README.md`
- Modify: `SURFACE.md`

**Interfaces:**
- Consumes: `agents/fx-lens-pipeline.md` (from task 05) and
  `commands/fx-audit.md` (from task 08). Both must exist before they can be
  counted, which is why this task is last.
- Produces: nothing any other task consumes.

**Seam:** a count taken from the filesystem compared against the count written
in each document. Every number in both files is verified against `ls`, not
against the previous number.

**Risks:** the temptation is to update only the rows this plan touched and
leave the neighbouring numbers alone. Two of those neighbours are already
wrong, and leaving a known-wrong count beside a freshly corrected one is worse
than leaving both, because the corrected one implies the file was checked.

This task only corrects counts and tables. **The wider stale-document sweep is
out of scope**, per the design: the dispatch-guard design that reports itself
implemented when the code was deleted, the surface document's description of
the pre-ADR-0005 guard, and the dead pointers are all a separate change.

**Idempotency:** text edits replacing numbers and adding table rows. Re-running
finds the correct values already present and changes nothing.

**Testing:** counts taken from the filesystem, then the prose gate.

## Acceptance criteria

- [ ] `README.md`'s lens table gains the `fx-lens-pipeline` row with its
      trigger set, and the table states that this lens fires on branch reviews
      only.
- [ ] `README.md`'s commands table gains `/fx:audit` with a one-line
      description.
- [ ] `README.md`'s Layout block reports the real counts. It currently says
      `skills/ 11` against **12** directories on disk and `commands/ 3` against
      **4** before this plan, which becomes **5**.
- [ ] `README.md`'s Layout block reports `agents/` as 5 lenses plus the devil's
      advocate, which is 6 files.
- [ ] `README.md`'s skills table gains no row: no skill was added. Verify this
      rather than assuming it.
- [ ] `SURFACE.md`'s Agents section reports 6 and lists the new lens with its
      model tier and the reason for it.
- [ ] `SURFACE.md`'s Commands section reports 5 and lists `/fx:audit`.
- [ ] `README.md`'s Gates block lists **six** gates: `check-artifacts` is added
      beside the five already there. A gate nobody documents is a gate nobody
      runs.
- [ ] `README.md`'s Tests block names the lens fixture run from task 05, so the
      only behavioural check on the new agent is discoverable.
- [ ] Every count in both files is checked against the filesystem with `ls`,
      and the check is shown in the report. A number carried over from the
      previous version is not a checked number.
- [ ] `python3 scripts/check-prose` passes on both files.
- [ ] `scripts/check-all` exits 0.

## Steps

- [ ] **1. Write the failing test**

The test is a count comparison. Take the real numbers first:

```bash
ls -d skills/*/ | wc -l
ls agents/*.md | wc -l
ls commands/*.md | wc -l
ls references/vocab/*.md references/stacks/*.md references/*.md | wc -l
```

- [ ] **2. Run it: verify RED**

Run the four commands above, then grep the two documents for the numbers they
claim:

```bash
grep -n "skills/ \|agents/ \|commands/ " README.md
grep -n "^## Agents\|^## Commands" SURFACE.md
```

Expected: at least two mismatches before any edit, which are the pre-existing
errors. Paste both the real counts and the claimed ones into the report.

- [ ] **3. Implement the minimum that passes**

Edit the two files. No text here: `fx-tdd` drives it from the mismatch.

- [ ] **4. Run it: verify GREEN**

Re-run the count commands and re-grep both documents.
Expected: every claimed number equals the counted number. Paste the comparison
into the report.

- [ ] **5. Verify no skill was added**

Run: `ls -d skills/*/`
Expected: 12 directories, the same 12 as before this plan. This plan adds an
agent and a command, not a skill, and a README row claiming otherwise would be
a false claim about the plugin's shape.

- [ ] **6. Run the prose gate**

Run: `python3 scripts/check-prose README.md SURFACE.md`
Expected: PASS.

- [ ] **7. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **8. Commit**

```
git add README.md SURFACE.md
git commit -m "docs: match the inventory counts to what is on disk"
```

No attribution trailers. This is the last task: report completion rather than
continuing.
