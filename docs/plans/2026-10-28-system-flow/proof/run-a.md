# Proof run (a): controller commands

Run folder: /tmp/claude-1000/sf-build/proof-a-20261028-1
Scratch copy: /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend (one commit)
Stamp file: /tmp/claude-1000/sf-build/proof-a-20261028-1.stamp (made before the copy)

Run in order from the controller session, each in the background, each JSON result saved in the scratchpad. Keep `session_id` from the first.

1. `env -C /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend HOME=/tmp/claude-1000/sf-build/proof-a-20261028-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/home/.claude TMPDIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json "/fx:fx-system-flow"`
2. `env -C /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend HOME=/tmp/claude-1000/sf-build/proof-a-20261028-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/home/.claude TMPDIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Approve the plan as proposed, and yes to the MkDocs nav and exclude_docs changes."`
3. `env -C /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend HOME=/tmp/claude-1000/sf-build/proof-a-20261028-1/home CLAUDE_CONFIG_DIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/home/.claude TMPDIR=/tmp/claude-1000/sf-build/proof-a-20261028-1/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Take the recommended answer for every question."`

After the results step, delete the credential copy: `find /tmp/claude-1000/sf-build/proof-a-20261028-1/home/.claude/.credentials.json -delete`
