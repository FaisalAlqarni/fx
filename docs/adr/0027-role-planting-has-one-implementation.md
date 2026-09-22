# Role planting has one implementation, and exactly two callers today

`plantRoles` is defined once, in `lib/plant-roles.js:62`. Its only real
callers, found by grepping every call site in the repository, are
`hooks/fx-codex.js:223` (`SessionStart`, planting or repairing roles on
every session) and `commands/fx-setup.md:221` (the setup lane's own reporting
step, mirrored byte for byte into `skills/fx-setup/SKILL.md:224` by
`scripts/gen-command-skills`, which is a generated copy of the same call
site, not a third one).

`scripts/fx-opencode-install` requires `lib/plant-roles.js` too, but only for
its `READ_ONLY_AGENTS` export, used to generate opencode agent files through
`toOpencodeAgent`. It never calls `plantRoles()`, because opencode never
consumes the Codex `.toml` files that function plants; ADR 0028 is why. This
corrects a claim made earlier in this branch's own history:
`docs/plans/2026-09-21-multi-harness/state.md` records task 10's completion as
making "all three callers" (`hooks/fx-codex.js`, `scripts/fx-opencode-install`,
`commands/fx-setup.md`) "route through `lib/plant-roles.js`," and
`tests/install/run.sh:67` to `68` still asserts exactly that: it greps each of
the three files for the literal string `"plant-roles"`, which a bare
`require()` for an unrelated export satisfies as easily as a call to
`plantRoles()` does. The assertion is true of the module; it has never been
true of the function.

The count that matters is the one enforced at `lib/plant-roles.js`'s own
level: `tests/install/run.sh:65` to `66` asserts `^function plantRoles` occurs
in exactly one file across `lib`, `hooks` and `scripts`. That is what closes
the door a fourth provisioning path would open: nothing states this count is
closed against a future path that copies `codex/agents/*.toml` straight into
`$CODEX_HOME` without going through `plantRoles`, bypassing its
skip/stale/kept classification and the ownership check that leaves a user's
own file untouched.

## Consequences

- `tests/install/run.sh:67` to `68` should read as "every file that reaches
  role provisioning imports this module," not "three callers invoke this
  function." The stronger, accurate claim is the one implementation
  assertion at line 65 to 66.
- A future caller of `plantRoles()` is fine; a second definition of it, or a
  path that reimplements planting by copying `.toml` files directly, is the
  drift this ADR exists to name before it happens.
- `scripts/fx-opencode-install` staying a `READ_ONLY_AGENTS`-only consumer of
  `lib/plant-roles.js` is correct and deliberate: opencode has no Codex role
  files to plant.
