# 03: Evidence verifier and evidence roots

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** no unchecked claim reaches the site. `system-flow check` resolves every evidence root (the host, plus the repos `.fx.json` names under `system_flow.roots`), reads each cited file from HEAD in a git root, and fails an entry whose file is missing, whose line range runs outside the file, or whose symbol is not in the cited lines. A cited file with uncommitted changes is a warning for `check` and an error for `build` (the `build` side is wired in task 04 through the same function). `check --fragment <file>` checks one fragment, with the ids it references resolved from the rest.

**Design:** Evidence verifier; The model; The CLI; Error handling; Output location

**Files:**
- Create: `src/lib/sf-evidence.ts`
- Modify: `src/lib/fx-json.ts`, `src/lib/types.ts` (the `system_flow` key), `src/lib/fx-json.test.ts`
- Modify: `src/scripts/system-flow.ts` (read `.fx.json` through `parseFxJson`; run the verifier in `check`; `--fragment`)
- Create: `src/scripts/system-flow-evidence.test.ts` (built to `scripts/system-flow-evidence.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `Item`, `Problem`, `itemsOf`, `checkRules` (tasks 01, 02).
- Produces, `src/lib/types.ts`: `FxJson['system_flow']?: { output?: { site: string; markdown: string }; theme?: { source: string; kind: 'docs-css' | 'mkdocs-material' | 'tailwind' | 'app-css' | 'brand' | 'fx' }; roots?: Record<string, string>; diagrams?: { prefer?: 'cheap' | 'fast' | 'detailed'; archify?: string; pageLimits?: Record<string, number>; svg?: string[] } }` (the whole key as plan.md Global Constraints states it; tasks 06 and 12 write parts of it, nothing changes this type later). `parseFxJson` reports `{ key: 'system_flow', reason: 'system_flow must be an object with output, theme, roots and diagrams' }` for any other shape, `{ key: 'system_flow.roots.<id>', reason: 'a root path must be a string' }` for a bad root, `{ key: 'system_flow.diagrams.prefer', reason: 'prefer must be cheap, fast or detailed' }` and `{ key: 'system_flow.diagrams.pageLimits.<name>', reason: 'a page limit must be an integer from 1 to 8' }`.
- Produces, `src/lib/sf-evidence.ts`:
  - `type Root = { id: string; dir: string; git: boolean; head: string | null; remote: string | null; host: boolean }`
  - `resolveRoots(hostRoot: string, meta: Meta, fx: FxJson['system_flow']): { roots: Map<string, Root>; problems: Problem[] }`. The host's id is `meta.roots[0].id`; evidence with no `root` is the host. A root id in `meta.roots` that `.fx.json` does not map, or maps to a missing folder, is one problem: `.fx.json:/system_flow/roots/<id>: root <id> not found at <resolved dir>`.
  - `verifyEvidence(items: Item[], roots: Map<string, Root>, mode: 'check' | 'build'): Problem[]`
  - `readCited(root: Root, path: string): string | null` (HEAD bytes in a git root, working tree otherwise), reused by tasks 09 and 11. It memoises by `(root id, path)` for the life of the process, so a file cited by many entries is read from git once; one `git ls-tree -r --name-only HEAD` per root answers existence and folder checks.
- Produces, CLI: `system-flow check [--fragment <file>]`.

**Seam:** the `system-flow` CLI run as a process against the two-root fixture (`host` and `guide`).

**Tests:** the task 01 fixture (`app/x.rb` of 10 lines, line 1 `class Link`, line 4 `  def expired?`; `guide/README.md` line 1 `# Guide`; the plain root); `meta.roots` is `[{id:'backend'},{id:'guide'}]`; `f.fxJson` maps `guide` to `../guide`; item ids as in Global Constraints. Each failing case exits 1 and prints one stderr line `<f>:<pointer>: <item id>: <evidence as root/path:lines symbol>: <test>`.
- Good: node `link` cites `{path:'app/x.rb', lines:'1-4', symbol:'Link#expired?'}`; exit 0 (last-segment match finds `expired?`).
- Whole symbol: `symbol: 'class Link'`, `lines: '1'`; exit 0.
- Missing file: `path: 'app/nope.rb'`; test text `file missing`.
- Range past end: `lines: '8-12'`; test text `range outside file (10 lines)`. `lines: '0-2'` and `lines: '5-3'` give the same test text.
- Symbol absent: `lines: '5-10'`, `symbol: 'expired?'`; test text `symbol not in cited lines`.
- Multi-range: `lines: '1,4'`, `symbol: 'expired?'`; exit 0 (union of ranges).
- Case: `symbol: 'Expired?'`; `symbol not in cited lines`.
- Folder entry on an inventory item: `path: 'app/'`; exit 0. The same folder entry on a node: `<f>:<pointer>: node link: a folder entry is allowed only on catalogue and inventory entries`.
- Glob: `path: 'app/*.rb'`: `... path with * or { is not allowed`.
- Evidence line characters: `path: 'app/my file.rb'` and ``path: 'app/x`.rb'`` each fail with `... path with whitespace or a backtick cannot be written as an evidence line`; ``symbol: 'a`b'`` fails with `... symbol with a backtick cannot be written as an evidence line`.
- One read per file: 50 nodes each citing `app/x.rb` `lines: '1-4'`; the test runs `check` with `PATH` starting at a fixture folder holding a `git` shell script that appends its arguments to a log file and then runs the real git by absolute path (`command -v git` resolved before the shim is placed); the log holds exactly one line containing `show HEAD:app/x.rb`.
- File entry without `symbol`: `... a file entry needs lines and symbol`.
- Other root: `{root:'guide', path:'README.md', lines:'1', symbol:'Guide'}` with the guide repo's committed README line 1 `# Guide`; exit 0.
- Missing root: `.fx.json` maps `guide` to `../nowhere`; exit 1; exactly one stderr line for the root, `.fx.json:/system_flow/roots/guide: root guide not found at <abs path>`, however many entries cite it.
- Unknown root id: evidence `root: 'mobile'` not in `meta.roots`: `... evidence names root mobile, not in meta.roots`.
- Uncommitted: edit `app/x.rb` in the working tree without committing; `check` exits 0 with stdout `warnings` holding `app/x.rb has uncommitted changes`; the HEAD bytes are still what is checked.
- No git: `meta.roots` gains `{id:'plain'}`, `.fx.json` maps it to `../plain`, and a node cites `{root:'plain', path:'notes.txt', lines:'1', symbol:'Plain'}`; `check` exits 0 and stdout `warnings` holds `root plain: no git: stale and archify sources unavailable`.
- Owner evidence `{owner:'2026-10-28', question:'q1'}`: never checked against code; exit 0.
- `--fragment`: `engine.json` whose edge names node `api` defined in `level0.json`, with a bad range in `level0.json`; `check --fragment docs/system-flow/model/fragments/engine.json` exits 0 (only `engine.json`'s items are verified, `api` resolves); plain `check` exits 1.
- `fx-json.test`: `{"system_flow": {"roots": {"guide": 5}}}` yields the problem `system_flow.roots.guide: a root path must be a string`; `{"system_flow": {"diagrams": {"prefer": "max"}}}` yields `system_flow.diagrams.prefer: prefer must be cheap, fast or detailed`; `{"system_flow": {"diagrams": {"pageLimits": {"seq-turn": 9}}}}` yields `system_flow.diagrams.pageLimits.seq-turn: a page limit must be an integer from 1 to 8`; the design's example block, and the same block plus `"diagrams": {"prefer": "detailed", "pageLimits": {"seq-turn": 5}, "svg": ["arch-engine"]}`, parse with no problem.

**Testing:** CLI process tests; `fx-json.test.js` unit test (existing style).

## Acceptance criteria
- [ ] All five tests of the design's verifier run on every evidence entry with a path, in every root, and each miss names the item, the entry and the test.
- [ ] A missing root is reported once.
- [ ] A file cited by many entries is read from git once.
- [ ] No evidence entry that docs-index's evidence line cannot hold passes `check`.
- [ ] `.fx.json` with the design's `system_flow` block parses with no problem.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-evidence.test.ts` and `src/lib/fx-json.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-evidence.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/fx-json.test.js`
Expected: bad evidence exits 0; `system_flow` is reported as an unknown key or unparsed.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: both print OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-evidence.ts src/lib/fx-json.ts src/lib/types.ts src/scripts/system-flow.ts`, then `node scripts/system-flow-check.test.js` and `node scripts/system-flow-rules.test.js` under the same `scratch-env` prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-evidence.ts lib/sf-evidence.js src/lib/fx-json.ts lib/fx-json.js src/lib/fx-json.test.ts lib/fx-json.test.js src/lib/types.ts lib/types.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-evidence.test.ts scripts/system-flow-evidence.test.js scripts/check-all
git commit -m "feat(system-flow): verify evidence path, range and symbol in every root"
```

No attribution trailers. Then continue to the next task: never stop and wait.
