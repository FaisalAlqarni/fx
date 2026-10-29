# Proof run (a): Shamel.Backend, controller commands

Run folder: /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1
Scratch repo (one commit 4cd0689): /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/Shamel.Backend
Stamp: /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1.stamp (the source is read only; `find /mnt/c/Users/Faisal/Downloads/Shamel.Backend -newer /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1.stamp` listed 0 files after the copy)
Date: 2026-10-29. Controller only: a headless session, not a subagent (ADR 0055).

## Setup

```
install -m 600 /home/faisal/.claude/.credentials.json /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude/.credentials.json
cp -rL /home/faisal/.claude/skills/archify /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude/skills/archify
```

## Runs

Each in the background; save the JSON result as step<n>.json in the run folder.

1. Save as /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/step1.json and keep its `session_id`:
```
env -C /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/Shamel.Backend HOME=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude TMPDIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json "/fx:fx-system-flow"
```
2. Save as /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/step2.json:
```
env -C /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/Shamel.Backend HOME=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude TMPDIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Approve the plan as proposed, and yes to the MkDocs nav and exclude_docs changes."
```
3. Save as /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/step3.json:
```
env -C /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/Shamel.Backend HOME=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude TMPDIR=/tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Take the recommended answer for every question."
```

## Teardown

Copy the session transcript to /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/transcript.jsonl, then:
```
find /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/home/.claude/.credentials.json -delete
```

## Step 4 outputs

Site (a) measure JSON: /tmp/claude-1000/sf2-build/proof-a2-2026-10-29-1/measure-a.json, copied to docs/plans/2026-10-29-system-flow-site/proof/measure-a.json (listed in results.md).

## Decisions answered during the run

None beyond the two fixed prompts above: step 2 approved the plan and the MkDocs lines, step 3 took the recommended answer for all 3 questions. No run stopped for a prose floor or a short glossary.
