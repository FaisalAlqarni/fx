# 09: Glossary reader, session notice and decline key

**Status:** ready-for-agent
**Blocked by:** 01, 08
**Phase:** 2: Renames and rebase

**What to build:** fx names the domain glossary GLOSSARY.md (and GLOSSARY-MAP.md for a multi-context repo), and a repo that still has CONTEXT.md keeps working. One function decides which file is the glossary: GLOSSARY-MAP.md, then GLOSSARY.md, then CONTEXT-MAP.md, then CONTEXT.md, at the repository root, and it never creates a file. When the file it finds has the old name, every session (never a subagent) gets one notice line at start, on every runtime, through the shared preamble render. When the owner has answered no to the rename, `.fx.json` holds `"glossary_rename": "declined"` and the notice stops. Task 10 makes the lanes and fx-setup use these rules.

**Design:** Phase 2: Glossary rename; Testing Decisions

**Files:**
- Create: `src/lib/glossary.ts`, built to `lib/glossary.js`
- Test: `src/lib/glossary.test.ts`, built to `lib/glossary.test.js`
- Modify: `scripts/check-all` (add `run glossary.test.js  node lib/glossary.test.js` beside the other `lib/` tests)
- Modify: `src/lib/preamble.ts` and built `lib/preamble.js` (inside the existing `if (!subagent)` block of `render`, after the plans block, in its own try like the plans block)
- Modify: `src/lib/fx-json.ts` and built `lib/fx-json.js` (parse `glossary_rename`)
- Modify: `src/lib/types.ts` and built `lib/types.js` (`FxJson` gains `glossary_rename: 'declined'`)
- Test: `src/lib/fx-json.test.ts` and built `lib/fx-json.test.js` (the new key)

**Interfaces:**
- Produces: `findGlossary(root: string): { file: 'GLOSSARY-MAP.md' | 'GLOSSARY.md' | 'CONTEXT-MAP.md' | 'CONTEXT.md'; legacy: boolean } | null`. Reads only; `legacy` is true for the two CONTEXT names.
- Produces: `glossaryNotice(root: string): string | null`. Returns null when `findGlossary` returns null or a non-legacy file, or when `<root>/.fx.json` parses with `glossary_rename` equal to `"declined"`. Otherwise returns exactly: `This repository's glossary is still named <file>. fx now reads GLOSSARY.md (GLOSSARY-MAP.md for a map) first and the old name second. Run the fx-setup command to rename it; answer no there and fx stops asking.`
- Produces: `.fx.json` key `glossary_rename`, the only accepted value `"declined"`; any other value is dropped and listed in `problems` as `{ key: 'glossary_rename', reason: 'glossary_rename must be "declined"' }`. Task 10's fx-setup step writes it.
- Consumes: `repoRoot(cwd: string): string` from `src/lib/repo-config.ts`, to find the root that `render` passes to `glossaryNotice`.

**Seam:** `findGlossary` and `glossaryNotice` called directly on scratch directories; `render` for the wiring.

**Tests:**
- GLOSSARY.md only: `findGlossary(dir)` returns `{ file: 'GLOSSARY.md', legacy: false }`; `glossaryNotice(dir)` returns null.
- CONTEXT.md only: returns `{ file: 'CONTEXT.md', legacy: true }`; the notice equals the exact text above with `<file>` = `CONTEXT.md`.
- Both GLOSSARY.md and CONTEXT.md: returns `{ file: 'GLOSSARY.md', legacy: false }`; the notice is null; the directory listing before and after the call is identical (no file created).
- Neither: returns null; the notice is null; no file created.
- CONTEXT-MAP.md and CONTEXT.md: returns `{ file: 'CONTEXT-MAP.md', legacy: true }`.
- Declined: CONTEXT.md plus `.fx.json` `{"glossary_rename":"declined"}`; the notice is null.
- `parseFxJson({ glossary_rename: 'yes' })`: `value` has no `glossary_rename`; `problems` equals `[{ key: 'glossary_rename', reason: 'glossary_rename must be "declined"' }]`.
- `render({ harness: 'claude-code', cwd: <git repo dir with CONTEXT.md> })` ends with the notice line; with `subagent: true` it does not contain `still named`.

**Risks:** the preamble budget tests in `lib/preamble.test.js` render fx's own checkout, which has no glossary, so their counts do not move; the plan-state and hook golden fixtures render directories with no glossary, so they do not change. A git call in `repoRoot` has a 2-second timeout and falls back to `cwd`; the notice must never throw out of `render`.

**Testing:** unit, then `test_scope` on the sources.

## Acceptance criteria
- [ ] A session started in a repo holding only CONTEXT.md shows the notice once; a subagent never does; a repo with `"glossary_rename": "declined"` never does.
- [ ] No code path creates a glossary file.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/lib/glossary.test.ts` and `src/lib/fx-json.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/glossary.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/fx-json.test.js`
Expected: fail because `lib/glossary.js` and the key do not exist.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests.

- [ ] **5. Run them: verify GREEN**

Run: same commands. Expected: PASS.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/glossary.ts src/lib/fx-json.ts src/lib/preamble.ts scripts/check-all`

- [ ] **7. Commit by path**

```
git add src/lib/glossary.ts src/lib/glossary.test.ts lib/glossary.js lib/glossary.test.js src/lib/preamble.ts lib/preamble.js src/lib/fx-json.ts src/lib/fx-json.test.ts lib/fx-json.js lib/fx-json.test.js src/lib/types.ts lib/types.js scripts/check-all
git commit -m "feat(glossary): read GLOSSARY.md first, notice an old CONTEXT.md once per session"
```
