# OpenCode 2.x is a separate harness, `opencode-v2`, beside `opencode`

## Context

OpenCode 2.0.18 changed the plugin API. A plugin is a default export `{ id, setup(ctx) }` instead of a function returning hooks. Skills, agents and commands are registered through `ctx` transforms, permissions are rule lists, and the permission check is a hook (`permission.evaluate`). The 1.x plugin cannot run on 2.x, and the 2.x plugin cannot run on 1.x. The probe that established this is `docs/plans/2026-10-01-opencode-v2/probe-findings.md`.

Both majors ship one binary named `opencode` and read one config directory, `~/.config/opencode`. A user can move between them, but one config directory serves one major at a time: a 2.x install writes agents with `permissions`, which 1.x refuses, and links the 2.x plugin. Switching majors means running the installer with `--major` for the new one.

## Decision

fx treats 2.x as a fourth harness, `opencode-v2`. `opencode` keeps meaning 1.x.

- `plugins/fx-opencode-v1.js` is the 1.x plugin (renamed from `plugins/fx.js`). `plugins/fx-opencode-v2.js` is the 2.x plugin. Neither imports the other. Both use `lib/git-guard.js`, `lib/lane-check.js`, `lib/preamble.js` and `lib/agent-dialects.js`, so the guard predicate and the preamble text exist once.
- `lib/preamble.js` has an `opencode-v2` harness with its own addressing, and `lib/agent-dialects.js` has `toOpencodeV2Agent`. `scripts/check-all`, the CI matrix, and `tests/conformance/run.sh` take `opencode-v2` as a harness name.
- `scripts/fx-opencode-install` takes `--major 1|2`. Without it, the installer runs `opencode --version` with a 10 second timeout and accepts only a 1 or a 2. Any other result, a missing number or a hang stops the installer with an error that names `--major`. It never guesses.
- The installer never writes a top-level `permissions` key, because OpenCode 1.x refuses it. On 2.x, permissions live inside the generated agent files, which 1.x also refuses, so a directory installed for 2.x does not load under 1.x until the installer runs again with `--major 1`.
- The installer owns what it writes into `opencode.json` through a record file, `<dest>/.fx-opencode-owned.json`. It lists the guard policies fx inserted and the `experimental.subagent_depth` value fx set. A later run removes or replaces only those entries, and only while the file still holds the recorded value. A policy or a depth the user wrote is never removed, even when it is identical to fx's. With no record file, fx owns nothing.
- Installing 2.x then 1.x into one directory gives the same tree as a fresh 1.x install. The generated command files of a 1.x install are removed on 2.x, because the 2.x plugin registers commands itself.
- Shape errors stop the installer before any write: `experimental` that is not an object, `experimental.policies` that is not a list.
- 1.18.25 accepts `experimental.subagent_depth` in a shared config (`opencode debug config`: exit 0, no `InvalidError` after a 2.x then a 1.x install).

## Consequences

The 2.x plugin route cannot name the plugin as a `file://` entry in `plugin`: 2.0.18 answers "configured plugin path must be a directory". The conformance runner links the plugin into the config's `plugins/` directory instead, and adds fx's `skills` directory to `skills`.

fx does not grant `general` the `subagent` tool on 2.x. User rules reach 2.0.18 from `.jsonc`, ancestor directories, `OPENCODE_CONFIG`, `OPENCODE_CONFIG_CONTENT`, 1.x keys and agent Markdown, all applied after plugins, so the plugin cannot know whether the user already answered, and a grant that overrides that answer breaks ADR-0026. INSTALL.md gives the rule a user adds.

A 2.x install made with the installer owns its entries by record. An install made before the record existed has no record, so its depth and policies are treated as the user's.

## Supersedes

Nothing. ADR-0026 (the user's own permission answer wins over fx's grant) still holds on 1.x. On 2.x fx adds no grant, which is the same rule. The hidden-lane backstop and the read-only re-deny in the evaluate hook are a stated exception (ADR-0037).
