# 09: A live four-phase audit run

**Status:** ready-for-agent
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08
**Phase:** Core

**What to build:** the first end-to-end run of `/fx:fx-audit` through all four
phases, on a small scratch project, with the plugin loaded from this worktree.
It proves what no earlier run reached: the lens and `fx-architecture` dispatched
by name, the lens hunting all six groups in a file set, the soundness check, both
reports rendering offline from `docs/plans/_assets/`, and resume after each gate.
The result is recorded in the plan directory.

**Files:**
- Create: `docs/plans/2026-09-12-fx-audit-followups/live-audit-run.md`

**Interfaces:**
- Consumes: `/fx:fx-audit` (`skills/fx-audit/SKILL.md`, with tasks 02, 03 and 07's changes), `fx:fx-lens-pipeline` (task 03), `references/report-assets.md` and the vendored libraries (task 01).
- Produces: `live-audit-run.md`: each run's command, how it was bounded, which fx copy served it, its gate message, the slug directory's contents after it, the evidence for each proof below with the log line it rests on, and every defect found.

**Seam:** nested non-interactive sessions driving the audit, one per phase, with the gate answers in the invocation text (design seam 5).

**Risks:**
- Two fx copies loading. The installed copy is disabled for each session with `--settings '{"enabledPlugins":{"fx@fx":false}}'`, as the fx-audit build's task 08 probes did, and the init event of every run must list exactly one fx plugin, at this worktree's path.
- A nested session writing outside the scratch project. After each run, check `git status --short` in this worktree and search the run's log for paths outside the scratch project. Anything outside stops the task.
- Cost. At most four runs, and at most two attempts at each. Stop and report after a second failure instead of looping.
- Defects are expected on a first live run. This task records them; it does not fix them. The controller decides.

**Idempotency:** the scratch project is rebuilt from nothing at the start and removed at the end. The record file is rewritten whole.

**Testing:** four nested runs, their logs, the scratch project's files, and an offline render of each report.

## Acceptance criteria

- [ ] Every run's init event lists exactly one fx plugin, this worktree, and no run wrote outside the scratch project.
- [ ] Phase 1 wrote `01-current.md` into the slug directory, leaving nothing under the draft directory, and its gate listed the two stated targets.
- [ ] Phase 3 dispatched `fx:fx-lens-pipeline` and invoked `fx:fx-architecture` by those names, both returned, and the lens output ends with an `Unread:` line.
- [ ] The lens reported findings from more than the unbounded-enqueue group on the file set, or the record states that the scratch code held none of the other five.
- [ ] `03-gaps.md` holds the Phase 3 gate choice section after run 3.
- [ ] Phase 4 either appended a sound verdict naming all four checks, or wrote `design.md` as a draft and its report, and the record says which and why.
- [ ] Every HTML report in the slug directory loads its libraries from `../_assets/`, those files exist in `docs/plans/_assets/` with checksums matching `references/report-assets.md`, and each report renders offline with styles applied, its Mermaid diagrams as SVG and no failed request.
- [ ] Runs 2, 3 and 4 each opened with `Resumed at Phase N`, and no run searched the filesystem for a template.
- [ ] `live-audit-run.md` passes `python3 scripts/check-prose` and records every defect found.

## Steps

- [ ] **1. Build the scratch project**

The controller names a scratch directory outside every git repository and never under the OS temp directory. Prove it is outside every repository first:

```bash
PROBE="<scratch directory named by the controller>/audit-probe"
( cd "$(dirname "$PROBE")" && ! git rev-parse --is-inside-work-tree 2>/dev/null ) && echo "outside every repository"
rm -rf "$PROBE" && mkdir -p "$PROBE/src/campaigns" "$PROBE/src/receipts"
cp tests/lens-pipeline/fixture/worker.js "$PROBE/src/campaigns/worker.js"
cat > "$PROBE/src/receipts/mailer.js" <<'JS'
const queue = require('../queue');
async function sendReceipt(orderId, recipientId) {
  await queue.push('sends', { type: 'receipt', orderId, recipientId });
}
module.exports = { sendReceipt };
JS
git -C "$PROBE" init -q
git -C "$PROBE" add src/campaigns/worker.js
git -C "$PROBE" commit -q -m "probe base"
echo "untracked: src/receipts/mailer.js"
```

- [ ] **2. Run Phase 1**

From `$PROBE`, bounded, with this worktree as the plugin and the installed copy disabled:

```bash
WT="$(pwd -P)"   # this worktree's root, taken before leaving it
cd "$PROBE"
claude -p "/fx:fx-audit . Receipts must never wait behind a bulk campaign. Adding a queue consumer touches one module." \
  --plugin-dir "$WT" --settings '{"enabledPlugins":{"fx@fx":false}}' \
  --output-format stream-json --verbose --max-turns 60 < /dev/null > run1.json 2>&1
```

Check: one fx plugin in the init event, `docs/plans/*-audit-*/01-current.md` exists, `.fx/*/draft/` holds nothing, the gate lists two stated targets, containment clean.

- [ ] **3. Run Phase 3**

Run `claude -p "/fx:fx-audit ."` with the same flags into `run2.json`. Check: the message opens `Resumed at Phase 3`; the log shows a dispatch naming `fx:fx-lens-pipeline` and a skill invocation of `fx:fx-architecture`; the lens output ends with `Unread:`; `03-gaps.md` and the architecture report are in the slug directory; containment clean.

- [ ] **4. Answer the Phase 3 gate and run Phase 4**

Run `claude -p "/fx:fx-audit . Take up none of the candidates."` with the same flags into `run3.json`. Check: `03-gaps.md` ends with the Phase 3 gate choice reading `none`; Phase 4 either appended the sound verdict or wrote `design.md` as a draft plus its report; containment clean.

- [ ] **5. Resume at the Phase 4 gate**

Run `claude -p "/fx:fx-audit ."` with the same flags into `run4.json`. Check: the message opens `Resumed at Phase` and reports the same outcome as run 3 without rewriting any document, proven by checksums of every file in the slug directory taken before and after.

- [ ] **6. Check the reports' libraries**

```bash
cd "$PROBE"
grep -ho 'src="[^"]*"' docs/plans/*-audit-*/*.html | sort -u
ls -l docs/plans/_assets/
sha256sum docs/plans/_assets/*
```

Expected: every `src` starts `../_assets/`; every named file exists; each checksum equals `references/report-assets.md`'s table.

- [ ] **7. Render each report offline**

For each HTML file in the slug directory, repeat task 01's step 10 with the browser's network set to offline: styles applied, Mermaid diagrams rendered as SVG where the report has any, only `file://` requests, no console error. If the browser tools are not available to you, say so and leave this step for the controller.

- [ ] **8. Search the logs for filesystem searches**

```bash
for f in run1.json run2.json run3.json run4.json; do
  printf '%s: find / %s, settings.json %s, /proc/ %s\n' "$f" \
    "$(grep -o 'find /' "$f" | wc -l)" "$(grep -o 'settings\.json' "$f" | wc -l)" "$(grep -o '/proc/' "$f" | wc -l)"
done
```

Expected: zero in every column, or each hit explained as harness startup rather than an agent's tool call.

- [ ] **9. Write the record**

Write `docs/plans/2026-09-12-fx-audit-followups/live-audit-run.md` with everything the Interfaces block lists. Copy the four logs into `.fx/2026-09-12-fx-audit-followups/live-audit/` in this worktree, then remove `$PROBE`.

- [ ] **10. Run the gates**

Run: `python3 scripts/check-prose docs/plans/2026-09-12-fx-audit-followups/live-audit-run.md && scripts/check-all`
Expected: both pass.

- [ ] **11. Commit**

```
git add docs/plans/2026-09-12-fx-audit-followups/live-audit-run.md
git commit -m "docs(plan): record the first live four-phase audit run"
```

No attribution trailers. This is the last task: report completion rather than continuing.
