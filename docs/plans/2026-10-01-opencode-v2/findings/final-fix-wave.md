# Final fix wave: opencode-v2

Sources: `final-review.md`, `final-spec.md`, `final-standards.md`, `final-lens-security.md`, `final-lens-silent-failure.md`, `final-devils-advocate.md`, and coverage audit gaps 2 and 4. Each item names its source. Every item below is FIX unless marked otherwise.

## Code

**W1. Subagent provider-error detection on every harness.** (broad I1, silent-failure 1, devil's advocate 2)
`tests/conformance/lib/openrouter.js` `childProviderError`/`childCheck` reads only Codex shapes. Extend it:
- `opencode` and `opencode-v2`: walk every `fx_export` line's `messages[].info.error`; match `data.statusCode` against `STATUS` and `data.message` against `PROVIDER_ERROR`. Evidence of the real shape: `/tmp/fxlogs-opencode-v2/18-read-only-agent-cannot-delegate-a-write-opencode.log` line 21.
- `claude-code`: match API-error entries in the `transcript:` lines. Read one real Claude Code transcript under `/tmp/fxlogs-*` first to get the shape; if no real sample exists, say so in the report and match the documented `isApiErrorMessage`/`error` field you find, with a fixture.
- One fixture per harness in `tests/conformance/openrouter.test.js`, a positive and a clean negative.

**W2. A failed child export is not a pass.** (silent-failure 2)
In `tests/conformance/lib/live.sh`, an `export failed:` line for any child session makes the row FAIL with reason "child session export failed: <id>", whatever the parent did. Check the export command's exit status as well, not only the parse.

**W3. `sm` crash is visible.** (silent-failure 4)
`live.sh` `sm="$(node "$OR_JS" model ...)"`: a nonzero node exit fails the row with the node error, on every harness.

**W4. The read-only check fails closed.** (silent-failure 3, security 2, broad M1)
`plugins/fx-opencode-v2.js` evaluate hook, read-only branch: take it out of `attempt()`. Any throw denies with the reason, like the shell guard. For `external_directory`: require a non-empty resource list, and `path.resolve` each resource before the prefix test against `references/` and its realpath. Gate cases in `tests/gates/opencode-v2-plugin.test.js`: realpath throws, empty list, `<refs>/../x`, and a `subagent` action from a read-only agent is denied (security lens, earlier finding 2).
While there, reindent the evaluate callback body under `ctx.permission.hook(` (standards 4). Indentation only, in its own commit.

**W5. `plantRoles` failure leaves a stderr line.** (silent-failure 5)
`hooks/fx-codex.js` catch around `plantRoles()`: one `console.error` line with the reason. Keep the session starting.

**W6. One source for the hidden-lane list.** (standards smell)
Five copies: `plugins/fx-opencode-v1.js:87`, `plugins/fx-opencode-v2.js:52`, `tests/gates/opencode-plugin.test.js:390`, `tests/gates/opencode-v2-plugin.test.js:14`. Export it once from `lib/` (reuse an existing module if one already owns user-invoked skills; `tests/gates/user-invoked.test.js` knows that set). Both plugins import it. The tests derive it from the skills' frontmatter, or assert the constant equals what the frontmatter says, so the two cannot drift.

**W7. `check-all` passes in one environment.** (devil's advocate 3)
`tests/conformance/run.sh` free mode: when the `opencode` on PATH is the other major (1.x for `opencode-v2`, 2.x for `opencode`), print one line `SKIP <harness>: opencode <version> on PATH is not this harness's major` and exit 0. Do not run the rows. The major test is the one the installer uses. Gate it in an existing runner test.

**W8. Row 15 comment.** (devil's advocate 7)
`tests/conformance/rows/15-subagent-dispatches-subagent.sh`: on v2 the dispatch grant comes from the runner's scratch config (ruling 199), so a pass proves that config, not fx. Say so.

## Docs

**W9. v2 lane check documented.** (coverage gap 2, spec, broad)
INSTALL.md, `references/harnesses/opencode-v2.md`, ADR-0037: the lane check runs in `permission.evaluate` on `edit`, resolves against the project directory, denies on a hit, and fails open on an error. Read `plugins/fx-opencode-v1.js` first and state whether v1 also denies on a hit or only nudges; describe each truthfully. `write` coverage is observed through row 17; `patch` is unprobed. Say both.

**W10. Claude Code 18 of 18.** (coverage gap 4)
One sentence under the INSTALL.md verified table: Claude Code's other twelve rows were proven 18 of 18 in `78ff5b3`, and this branch re-ran only the six it changed.

**W11. Timeout wording.** (spec c)
Code treats an empty-output timeout as FAIL (task 08 ruling). ADR-0038:16 and README say it is a provider error. Align the docs to the code.

**W12. Capability re-run, credits, budget.** (spec a)
Ruling: not built. The credits check and the capability re-run are manual steps the controller performs; the request budget and pacing are dropped. Why: the controller did both by hand in task 15, and automating them adds runner code for a step run a few times a release. Fix the docs (README, ADR-0038, INSTALL if it mentions them) to say exactly that, and remove any sentence claiming the runner does them.

**W13. One major per config directory.** (devil's advocate 1)
A v2 install writes agents with `permissions`, which 1.18.25 refuses, and links the v2 plugin. So INSTALL.md:352-353 ("the same directory still loads under 1.x") is false, and ADR-0036:7 ("keep a 1.x install while trying 2.x") contradicts design.md:117. Rewrite both: one config directory serves one major; switching majors means running the installer with `--major` for the new one.

**W14. Removal and upgrade.** (devil's advocate 5, security 1)
INSTALL.md gets a short "Removing fx from opencode" section: the installer writes guard policies into the global `opencode.json`, listed in `.fx-opencode-owned.json`; how to remove them, the agents and the links, and that the policy denial message reads "Blocked by configuration policy". Check whether the installer has an uninstall flag; if not, document the manual steps, do not add one. Add one upgrade line: 1.x users installed before this branch rerun the installer, because the plugin file moved from `plugins/fx.js` to `plugins/fx-opencode-v1.js`.

**W15. ADR for the Codex changes.** (standards 1, spec b)
New ADR 0039: Codex addressing is `$fx:fx-<name>`, and the Codex hook lane-checks shell-run `apply_patch` (why: live row 17 wrote through the shell). House format like 0036 to 0038. ADR-0020 gets a "See ADR-0039" pointer instead of carrying the decision; fix its diagram alignment (standards 3).

**W16. ADR-0026 exception stated.** (standards 2)
ADR-0037 states plainly that the hidden-lane backstop and the read-only re-deny override a user allow, as a deliberate exception to ADR-0026, and why.

## Not fixed

- Standards: `plan_opencode_json` duplication. Ruling: deferred. Why: installer refactor with no behaviour change, on the file that writes the user's global config; zero-risk preference. Caught by: nothing; a later cleanup.
- Standards minors (long setup function beyond W4's reindent, `callKey`, `READ_ACTIONS` name, data clumps, `fromShell` flag): deferred, judgement calls.
- Devil's advocate 4 (policies never checked against the real binary) and 6 (v2 command `execute` never exercised live): Ruling: known limits, listed in the completion report and in INSTALL's "What fx cannot observe" for v2. Why: each needs a new live row and model calls; the gate tests cover the shapes.
- Spec minors: the ownership record file, resources inspection, key file instead of an allowlist variable are deviations that are safer than the spec. Recorded, kept.
