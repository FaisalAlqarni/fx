Lens: security, 2 findings

The task-level findings marked fixed are fixed at HEAD, and I have not re-reported them. That covers the call-id map collision, the `--setenv` key exposure, the nested-dispatch grant, the installer's major detection and policy ownership, and the leak-scan fail-open. Items the ledger already defers are also left out: the KEYDIR-under-TMPDIR path, the key in free rows' environment, and `| sh`.

1. [Important] /development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v1.js:1: the 1.x plugin moved from `plugins/fx.js` to this name, and nothing remains at the old path. Two kinds of existing 1.x install still point at `<fx>/plugins/fx.js`:
   - **Plugin route:** the config entry was `file://.../plugins/fx.js`. INSTALL.md:159 now shows `fx-opencode-v1.js`.
   - **Script route:** the `~/.config/opencode/plugins/fx.js` link.

   INSTALL.md:267-270 tells both routes that `git pull` plus a restart is enough to refresh. After that pull, the plugin file is gone. On 1.x there is no policy layer behind the plugin, so the git guard, the lane check and the hidden-lane deny all go with it.
   - **What an attacker gets:** a session or subagent can run `git push --force`, `reset --hard`, `branch -D` and the rest with no fx check.
   - **What fixes it:** running the installer again repairs the script route, because `FX_PLUGIN_SOURCES` (scripts/fx-opencode-install:240) still treats the old link as fx's own. Nothing tells the user to rerun it, and a plugin-route user has to edit `opencode.json` by hand.
   - **Not verified:** whether opencode 1.x reports a missing `file://` plugin at startup or skips it quietly.
   - **Severity:** your notes say fx is pre-production. If no install made before this branch exists, including your own machine's, this drops to Minor.

2. [Minor] /development/fx/.worktrees/opencode-v2/plugins/fx-opencode-v2.js:93-102: the special case that lets a read-only agent reach fx's `references/` fails open in two ways. The evaluate hook exists to re-impose read-only when session rules widen an agent (03-lens-security finding 1), so these are the paths where that guarantee lapses.
   - **A throw skips the check.** If `fs.realpathSync(refs)` throws at line 97 (a missing or broken `references` link), `attempt` swallows the error and returns `undefined`. The `if (...) return;` at line 102 then falls through, and nothing later in the hook handles `external_directory`. A read-only agent's access outside the project is then decided only by agent and session rules, which session rules can widen. The failure does show up in the preamble.
   - **An empty resource list passes.** Line 98 uses `.every(...)` over `ev.resources || []`, and that is true for an empty list. I did not confirm whether v2 ever sends `external_directory` with no resources.

   In both cases the hook allows something it was meant to refuse. It needs a broken install or a session-level grant on top, so it is not exploitable on its own.

Checked and clean across the branch:
- `inspect` ignores `cwd` (lib/git-guard.js:224), so the shell tool's working directory cannot steer the guard.
- In hooks/fx-codex.js, a shell `apply_patch` from a Codex read-only agent is still refused, because `isWritingToolCall` (lib/plant-roles.js:519) only clears allowlisted binaries.
- The nightly workflow takes no secrets (.github/workflows/conformance-nightly.yml:15).
- with-key.sh keeps the key off every command line.

I read and searched only. Nothing was run.
