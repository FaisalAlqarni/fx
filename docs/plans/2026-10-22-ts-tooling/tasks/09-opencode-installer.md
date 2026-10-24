# 09: opencode installer on Node

**Status:** ready-for-agent
**Blocked by:** 08
**Phase:** Core

**What to build:** an opencode user installs fx with `node scripts/fx-opencode-install [--dry-run] [--dest <dir>] [--major 1|2]` and gets exactly what the Python installer gives today: the same linked skills, references and plugin, the same generated agents and commands with the same headers, the same `opencode.json` bytes and ownership record, the same dry-run lines, the same refusals before the first write, and the same exit codes. No Python is needed. The `node -e` bootstraps disappear: the installer requires the agent converter and command generator directly. On Windows directory links are junctions, and a file link that needs Developer Mode stops the install before it writes anything.

**Design:** Implementation Decisions > 4; Implementation Decisions > 9; Implementation Decisions > 10; Global Constraints

**Files:**
- Create: `src/scripts/fx-opencode-install.ts` (built over `scripts/fx-opencode-install`), `src/scripts/fx-opencode-install.test.ts`
- Create: `tests/equivalence/fx-opencode-install.json` and its golden
- Modify: `tests/install/run.sh` (every `python3 "$FX/scripts/fx-opencode-install"` and `python3 "$INST"` becomes `node ...`; the `python3 -c "import json..."` reads become `node -e` reads of the same key; the `runpy` read of `GENERATED` becomes `node -e "process.stdout.write(require(process.argv[1]).GENERATED)" "$INST"`)
- Modify: `src/tests/gates/opencode-plugin.test.ts` (its `execFileSync('python3', ...)` call becomes `runNode`)
- Modify: `INSTALL.md`, `README.md` (opencode install line: `node scripts/fx-opencode-install`; Python no longer a prerequisite)
- Modify: the four bash callers that run the installer with `python3` (`tests/conformance/lib/opencode-v2.sh`, `tests/conformance/lib/live.sh`, `tests/conformance/rows/09-every-skill-discovered.sh`, `tests/conformance/rows/14-audit-lane-user-invocable.sh`): `python3 "...scripts/fx-opencode-install"` becomes `node "...scripts/fx-opencode-install"`; nothing else in them changes
- Modify: `src/scripts/check-all.ts` (add row `fx-opencode-install.test.js`)
- Modify: `.github/workflows/conformance-nightly.yml` (the comment saying the free rows call python3: drop `scripts/fx-opencode-install` from it)

**Interfaces:**
- Produces: `scripts/fx-opencode-install` exports `GENERATED` (the header string, unchanged) and runs `main()` only when it is the entry module.
- Consumes: `READ_ONLY_AGENTS` from `lib/plant-roles`, `toOpencodeAgent` and `toOpencodeV2Agent` from `lib/agent-dialects`, the command generator from `lib/opencode-commands`, `GUARD_POLICIES` from `lib/opencode-v2-policies` (sub-project 1 modules, same names as the Python bootstrap uses); `run`, `stringifyAscii` (task 01).
- Produces: link creation: `fs.symlinkSync(target, path, type)` with type `'junction'` for a directory on win32 and `'dir'` or `'file'` elsewhere. A file link failing with `EPERM` on win32 is detected in the pre-write check phase by creating and removing a probe link inside `--dest`, and exits 1 with `fx-opencode-install: creating a file symlink needs Windows Developer Mode`.

**Seam:** `equiv check` with installed trees (the `equivalence` row picks the new cases file up; this task adds the `fx-opencode-install.test.js` row); `tests/install/run.sh` for opencode and opencode-v2; `node scripts/check-all`.

**Tests:**
- Equivalence cases, all with `tree: "dest"`, `env: { HOME: "{root}/home", OPENCODE_CONFIG_DIR: "{root}/dest" }`, copying the files the installer reads from `old.rev` (`skills/**`, `references/**`, `agents/**`, `commands/**`, `plugins/**`, `lib/**`), and on the new side `tool: ["scripts/fx-opencode-install", "lib/proc.js", "lib/json.js"]` plus any other built `lib/` file it requires: `fresh-v1` (`--major 1`); `fresh-v2` (`--major 2`); `dry-run-v1` (dry-run lines, tree empty); `reinstall-v1` (an earlier install's tree written in first: tree unchanged); `switch-1-to-2` and `switch-2-to-1`; `user-opencode-json-kept` (an existing `opencode.json` with `"theme": "mine"` and a key `note` whose value ends in U+00E9, stored on disk as the six-character JSON escape: bytes identical, the escape kept); `owned-record-removed-on-clean`; one refusal case each: foreign link at `skills`, foreign link at `references`, foreign link at `plugins/fx.js`, a real directory where a skill link belongs, a link at an agent path, a command file without the generated header, a malformed `opencode.json`, `opencode.json` holding a JSON array; `default-dest` (no `--dest`; `OPENCODE_CONFIG_DIR` in the case env points it at the scratch root); `bad-major` (`--major 3`: argparse's usage and error lines and exit 2, reproduced verbatim); `no-references` (fx tree without `references/`: message as recorded); `already-in-agents-skills` (the duplicate-pool warning); `dry-run-lines` (`--dry-run` over an existing install: the exact lines the Python installer prints, including its blank line and its final `dry run: nothing written` line). Accepted-difference cases (design decision 9), recorded from the old script, then re-recorded from the new one with `equiv record --from-new` under a ledger Ruling naming each: `float-value` (`opencode.json` holding `"x": 1.0` and `"y": 1e3`), `integer-like-keys` (an object with keys `"b"`, `"2"`, `"a"`), `big-integer` (`"n": 9007199254740993`), `malformed-json-text` (the error message for an unterminated object); the ledger holds the old and new output of each.
- `fx-opencode-install.test`: `platform: 'win32'` injected into the link helper with a fake `symlinkSync` throwing `EPERM` for `'file'`: exit 1, stdout or stderr `fx-opencode-install: creating a file symlink needs Windows Developer Mode`, and `--dest` holds no new entry.
- `fx-opencode-install.test`: on win32 a directory link is requested with type `'junction'`.
- `bash tests/install/run.sh opencode` and `bash tests/install/run.sh opencode-v2` pass with no `python3` left in the file (`grep -c python3 tests/install/run.sh` prints `0`).
- Live compare on the whole repo for `fresh-v1` and `fresh-v2`, each with `--dest {root}/dest`, `--major <n>` and `HOME={root}/home`: identical, in the ledger.
- Free conformance runs on all four harnesses pass after the four bash callers are edited.

**Risks:** argparse's usage and error text, `json.dumps` escaping and `sorted` order must be reproduced; the cases pin all three. Python's `os.replace` is atomic on the same filesystem, as is `fs.renameSync`. `opencode --version` detection goes through `run` (on Windows `opencode` is a `.cmd` shim).

**Idempotency:** the installer's own contract: reinstalling replaces only what fx wrote (the `reinstall-v1` case proves it). Tests write only under scratch directories.

**Testing:** recorded equivalence with trees; unit tests for the Windows branch; install runs; `check-all`.

## Acceptance criteria
- [ ] Cases check identical, every refusal included; live compares identical.
- [ ] `tests/install/run.sh` and `opencode-plugin.test` call no Python.
- [ ] INSTALL.md tells an opencode user to run `node scripts/fx-opencode-install` and lists no Python prerequisite.
- [ ] `git grep -nE "python3?.*(fx-opencode-install|INST)"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write the cases; record the golden**
- [ ] **3. Write `fx-opencode-install.test`**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence/fx-opencode-install.json; node scripts/fx-opencode-install.test.js`
- [ ] **5. Port the installer**
- [ ] **6. Verify GREEN**: same commands, then the live compares
- [ ] **7. Update the install suite, the plugin test and the docs**
- [ ] **8. Run the scope**

Run: `bash tests/install/run.sh opencode && bash tests/install/run.sh opencode-v2 && node scripts/check-all` (tracked background command)

- [ ] **9. Commit by path**

```
git add src/scripts/fx-opencode-install.ts src/scripts/fx-opencode-install.test.ts scripts/fx-opencode-install scripts/fx-opencode-install.test.js tests/equivalence/fx-opencode-install.json tests/equivalence/fx-opencode-install.golden.json tests/install/run.sh src/tests/gates/opencode-plugin.test.ts tests/gates/opencode-plugin.test.js INSTALL.md README.md .github/workflows/conformance-nightly.yml tests/conformance/lib/opencode-v2.sh tests/conformance/lib/live.sh tests/conformance/rows/09-every-skill-discovered.sh tests/conformance/rows/14-audit-lane-user-invocable.sh src/scripts/check-all.ts scripts/check-all
git commit -m "build: opencode installer on Node"
```
