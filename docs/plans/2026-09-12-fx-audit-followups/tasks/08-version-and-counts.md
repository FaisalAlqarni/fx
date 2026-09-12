# 08: Version 0.1.7 and the inventory counts

**Status:** ready-for-agent
**Blocked by:** 01, 04, 05, 07
**Phase:** Core

**What to build:** installed fx users pick up this change set, and the inventory
documents stay true. The plugin version becomes 0.1.7. `SURFACE.md`'s references
count and listing include the vendored libraries and the new shared reference.
`README.md`'s tests block names the new test scripts and says which ones
`check-all` runs.

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `SURFACE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `references/report-assets.md` and `references/vendor/` (from task 01); `tests/companion/ignore-guarantees.sh` (from task 04); `tests/opencode-install/run.sh` (from task 05); `tests/gates/check-artifacts-remote.sh` (from task 01) and `tests/gates/check-prose-explicit-path.sh` (from task 07).
- Produces: `"version": "0.1.7"`.

**Seam:** counts taken from the filesystem compared with what the documents state, and `check-manifest` (design seam 7).

**Risks:** carrying a number over instead of counting it. Every number is taken from `ls` or `find` in step 1 and pasted into the report.

**Idempotency:** replacing numbers and adding lines. Re-running finds the correct values present.

**Testing:** filesystem counts before and after, and the manifest gate.

## Acceptance criteria

- [ ] `.claude-plugin/plugin.json` reads `"version": "0.1.7"`, and `python3 scripts/check-manifest` passes.
- [ ] `SURFACE.md`'s References heading states the number of files under `references/` that `find references -type f | wc -l` prints, says what kinds they are, and its listing names `report-assets.md` and `vendor/`.
- [ ] `README.md`'s tests block names the four new test scripts, and says `check-all` runs the installer test and both gate tests while the companion probe is run by hand.
- [ ] Skills, agents and commands counts in both documents still match the filesystem.
- [ ] `python3 scripts/check-prose README.md SURFACE.md` and `scripts/check-all` pass.

## Steps

- [ ] **1. Take the counts**

```bash
echo "skills: $(ls -d skills/*/ | wc -l)  agents: $(ls agents/*.md | wc -l)  commands: $(ls commands/*.md | wc -l)"
echo "references: $(find references -type f | wc -l) files, $(find references -type f -name '*.md' | wc -l) markdown"
find references -type f ! -name '*.md' | sort
ls tests/gates tests/opencode-install tests/companion
grep -n '"version"' .claude-plugin/plugin.json
```

- [ ] **2. Write the failing check**

```bash
grep -c '"version": "0.1.7"' .claude-plugin/plugin.json
grep -c "References: $(find references -type f | wc -l) files" SURFACE.md
grep -c 'opencode-install/run.sh' README.md
```

- [ ] **3. Run it: verify RED**

Run the three commands above.
Expected: `0`, `0`, `0`.

- [ ] **4. Implement the minimum that passes**

Set the version. Correct `SURFACE.md`'s References heading and listing from step 1's counts. Add the test scripts to `README.md`'s tests block, stating which `check-all` runs.

- [ ] **5. Run it: verify GREEN**

Run the three commands from step 2.
Expected: `1`, `1`, at least `1`.

- [ ] **6. Run the gates**

Run: `python3 scripts/check-manifest && python3 scripts/check-prose README.md SURFACE.md && scripts/check-all`
Expected: all pass, `ALL GREEN`.

- [ ] **7. Commit**

```
git add .claude-plugin/plugin.json SURFACE.md README.md
git commit -m "chore: bump to 0.1.7 and match the inventory to disk"
```

No attribution trailers. Then continue to the next task: never stop and wait.
