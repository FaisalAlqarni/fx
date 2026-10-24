# 23: README, INSTALL and SURFACE; release check; Phase 5 gate

**Status:** ready-for-agent
**Blocked by:** 22
**Phase:** 5: Records

**What to build:** a person installing or updating fx reads about the three new commands and the glossary migration, and the release is consistent. README and INSTALL name `/fx:fx-pr`, `/fx:fx-retro` and `/fx:fx-what` wherever they list the user-invoked commands (README's command table near line 112, the "commands/" layout lines near 233 and 237; INSTALL's hidden-skills line near 249), and say what happens to an existing CONTEXT.md (read as before, one notice per session, `/fx:fx-setup` renames it after asking once). SURFACE.md's command table gains the three rows in the same form. INSTALL.md line 142 pins `#v0.5.0` in the opencode plugin line; it becomes `#v0.6.0`. The version is 0.6.0 in every manifest `check-manifest` and `codex-manifest.test.js` keep in step; task 01 set it, this task confirms it. Phase 5 closes with `scripts/check-all`.

**Design:** Phase 5: Records

**Files:**
- Modify: `README.md`, `INSTALL.md`, `SURFACE.md`

**Seam:** the text gates and the manifest gates.

**Tests:**
- `grep -c '"version": "0.6.0"' .claude-plugin/plugin.json .codex-plugin/plugin.json .agents/plugins/marketplace.json package.json`: 1 each.
- `grep -c "#v0.6.0" INSTALL.md`: 1, and `grep -c "#v0.5.0" INSTALL.md`: 0.
- `node tests/gates/codex-manifest.test.js` and `node tests/gates/release-version.test.js`: each OK.
- `python3 -I scripts/check-prose README.md INSTALL.md SURFACE.md`: OK line.
- `scripts/check-all`: `ALL GREEN`.

**Testing:** text and manifest gates; then the full gate as the Phase 5 boundary.

## Acceptance criteria
- [ ] README, INSTALL and SURFACE list eight user-invoked commands and describe the glossary migration.
- [ ] Every manifest reads 0.6.0.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Edit the three documents**

- [ ] **2. Run the gates the Tests field names**

Run: the grep, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/codex-manifest.test.js`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/release-version.test.js`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose README.md INSTALL.md SURFACE.md`
Expected: each OK.

- [ ] **3. Commit by path**

```
git add README.md INSTALL.md SURFACE.md
git commit -m "docs: the three new commands and the glossary migration; fx 0.6.0"
```

- [ ] **4. Phase 5 gate** (a plan-mandated phase gate, standing ruling S3: ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`)

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`
Expected: `ALL GREEN`.
