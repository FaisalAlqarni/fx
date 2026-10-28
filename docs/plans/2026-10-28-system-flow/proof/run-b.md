# Proof run (b): controller commands

Run folder: /tmp/claude-1000/sf-build/proof-b-20261028-1
Clones (`git clone -q --no-hardlinks`): `advantage-backend` (the host), `advantage-guide`, `android`, `advantage-store`, side by side in the run folder.
Step-1 snapshots: `status-before-<repo>.txt` in the run folder, one per real repo (`git -C <real repo> status --porcelain`).

Run in order from the controller session, each in the background, each JSON result saved in the run folder as `step<n>.json`. Keep `session_id` from the first. The prompts below are the ones the transcript records.

1. `env -C /tmp/claude-1000/sf-build/proof-b-20261028-1/advantage-backend HOME=/tmp/claude-1000/sf-build/proof-b-20261028-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf-build/proof-b-20261028-1/home/.claude TMPDIR=/tmp/claude-1000/sf-build/proof-b-20261028-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json "/fx:fx-system-flow --repo ../advantage-guide --repo ../android --repo ../advantage-store"`
2. The same command with `--resume <session_id> "Approve the plan as proposed."`
3. The build stopped on two layout decisions, so one more resume ran before the interview: `--resume <session_id> "1a and 2b: split platform-l2-routing, and split the six worst figures, then continue."`
4. `--resume <session_id> "Take the recommended answer for every question."`

After the results step, delete the credential copy: `find /tmp/claude-1000/sf-build/proof-b-20261028-1/home/.claude/.credentials.json -delete`
