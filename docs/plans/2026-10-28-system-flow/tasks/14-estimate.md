# 14: estimate, the plan file and the depth report

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the owner sees what a full run costs before anything runs, and afterwards sees whether the run reached the depth it planned. `system-flow estimate <plan file>` reads the planning pass's plan and prints tokens and wall-clock per area and in total, with the constants it used and whether they are calibrated. The cost of an area comes from the files its subagent will read (`filesToRead`), not from the area's total file count (`files`, which only decides the 400-file split). Until task 20 measures them, the constants are system-flow-derived guesses and the output says so. Every `build` reports a depth block: levels, diagrams per level, primary and context nodes, edges, sequences, messages, store rows, flows, chapters, evidence entries and files cited, in total and per area, each area's planned numbers beside its built ones.

**Design:** The CLI; The lane; Open Questions; Proof before merge; Fragments and merge

**Files:**
- Create: `src/lib/sf-estimate.ts` (the plan file reader, `estimate`, `depth`)
- Modify: `src/lib/sf-build.ts` (read `<site>/model/plan.json` when present; fill `BuildResult.depth`)
- Modify: `src/scripts/system-flow.ts` (`estimate <plan file>`)
- Create: `src/scripts/system-flow-estimate.test.ts` (built to `scripts/system-flow-estimate.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `Model`, `Item`, `itemsOf`, `loadFragments` (task 01); `build`, `BuildResult` (task 04).
- Produces, the plan file format (decided here; the design names the file but not its shape), `<site>/model/plan.json`, written by the lane's planning pass:

```json
{ "areas": [ { "id": "engine", "root": "backend", "files": 94, "filesToRead": 40, "levels": 3, "diagrams": 4, "sequences": 3, "storeFlows": 2 } ],
  "chapters": 19 }
```

  Every area field is required. `id` matches the area's fragment name (`<area>.json`); `levels` is how many levels the area's diagrams span (1 to 3, level 0 belongs to the controller).
- Produces, `src/lib/sf-estimate.ts`:

```ts
export const ESTIMATE = { calibrated: false, tokensPerFile: 6000, tokensPerFigure: 15000, controllerTokens: 300000, minutesPerFile: 0.4, minutesPerFigure: 1.5, controllerMinutes: 20, parallel: 4 };
export type Plan = { areas: { id: string; root: string; files: number; filesToRead: number; levels: number; diagrams: number; sequences: number; storeFlows: number }[]; chapters: number };
export function readPlan(file: string): { plan: Plan | null; problems: Problem[] };
export function estimate(plan: Plan): { areas: { id: string; tokens: number; minutes: number }[]; total: { tokens: number; minutes: number }; constants: typeof ESTIMATE; note: string; warnings: string[] };
export type Depth = { levels: number; diagramsPerLevel: [number, number, number, number]; diagrams: number; primaryNodes: number; contextNodes: number; edges: number; sequences: number; messages: number; storeRows: number; flows: number; chapters: number; evidence: number; filesCited: number };
export function depth(model: Model, items: Item[], plan: Plan | null): { total: Depth; areas: { id: string; planned: { levels: number; diagrams: number; sequences: number; storeFlows: number } | null; built: Depth }[] };
```

  Per area: figures = diagrams + sequences + storeFlows; tokens = filesToRead × tokensPerFile + figures × tokensPerFigure; minutes = filesToRead × minutesPerFile + figures × minutesPerFigure. Total tokens = sum + controllerTokens. Total minutes = controllerMinutes + (sum of area minutes) / min(parallel, number of areas), rounded to one decimal. `note` is `"constants are guesses until proof run (a) calibrates them"` while `calibrated` is false, else `"constants measured on <date>"` (task 20 sets it). `warnings` holds `area <id> has <n> files; split it into sub-areas of at most 400` for each area over 400 files.

  Depth (decided here): `levels` counts distinct `level` values; `evidence` counts file evidence entries (owner evidence excluded); `filesCited` counts distinct `(root, path)` pairs of file entries (folder entries excluded); `chapters` counts sections. An area's `built` counts what its fragment `<area>.json` defines; `total` counts the whole merged model. An area in the plan with no fragment gets a `built` of zeros; a fragment that is not a plan area (such as `level0.json`) counts only in `total`. `BuildResult.depth` holds the result, with `areas` empty and `planned` absent when there is no `plan.json`.
- Produces, CLI: `system-flow estimate <plan file>`; a malformed plan exits 1 with `<plan file>:<pointer>: <message>`.

**Seam:** the `system-flow` CLI run as a process (`estimate`, `build`).

**Tests:**
- Two areas: `A` (files 120, filesToRead 10, levels 2, diagrams 2, sequences 1, storeFlows 0) and `B` (files 300, filesToRead 20, levels 1, diagrams 1, sequences 0, storeFlows 1): stdout `areas` deep-equals `[{ id: "A", tokens: 105000, minutes: 8.5 }, { id: "B", tokens: 150000, minutes: 11 }]`; `total` deep-equals `{ tokens: 555000, minutes: 29.8 }`; `constants.calibrated` is `false`; `note` is `"constants are guesses until proof run (a) calibrates them"`; `warnings` is `[]`.
- `files` does not drive cost: area `A` with `files: 5000` and the same `filesToRead` gives the same tokens and minutes, and `warnings` deep-equals `["area A has 5000 files; split it into sub-areas of at most 400"]`.
- One area `A` alone: `total.minutes` is `28.5` (20 + 8.5 / 1).
- Six areas of filesToRead 10, no figures: each `tokens: 60000`, `minutes: 4`; `total.minutes` is `26` (20 + 24 / 4).
- Malformed: an area without `filesToRead`: exit 1, stderr line `<plan file>:/areas/0: required property filesToRead missing`.
- Missing file: exit 1, stderr `system-flow: estimate: cannot read <plan file>`.
- Depth per area: the task 01 good set, plus `plan.json` area `engine` (levels 2, diagrams 2, sequences 1, storeFlows 0) and fragment `engine.json` with diagram `engine` (level 1, parent `system`, opened by node `link`: 3 primary nodes, 1 context node, 3 edges) and diagram `engine-jobs` (level 2, parent `engine`: 2 primary nodes, 1 edge), sequence `turn` (`chapter: "s1"`, 2 participants, 4 messages), every one of those items citing `app/x.rb` `lines: '1-4'` `symbol: 'Link'` once; `build` stdout `depth.areas` deep-equals `[{ id: "engine", planned: { levels: 2, diagrams: 2, sequences: 1, storeFlows: 0 }, built: { levels: 2, diagramsPerLevel: [0, 1, 1, 0], diagrams: 2, primaryNodes: 5, contextNodes: 1, edges: 4, sequences: 1, messages: 4, storeRows: 0, flows: 0, chapters: 0, evidence: 16, filesCited: 1 } }]`.
- Depth total: the same build: `depth.total.levels` is 3, `diagramsPerLevel` `[1, 1, 1, 0]`, `chapters` 1, `filesCited` 2 (`app/x.rb`, `app/y.rb`), and `evidence` equals 16 plus the good set's 4.
- Planned area with no fragment: area `ghost` in the plan: its `built` has every count 0.
- No plan: without `plan.json`, `depth.areas` is `[]` and `depth.total` is filled.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] The estimate is printed per area and in total from `filesToRead`, with its constants, the calibration note and the split warning.
- [ ] Every build reports depth in total and per area, planned beside built.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-estimate.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-estimate.test.js`
Expected: `estimate` exits 2 and `build` stdout has no `depth`.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-estimate.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-estimate.ts src/lib/sf-build.ts src/scripts/system-flow.ts`, then `node scripts/system-flow-build.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-estimate.ts lib/sf-estimate.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-estimate.test.ts scripts/system-flow-estimate.test.js scripts/check-all
git commit -m "feat(system-flow): estimate from the plan file and report planned against built depth"
```

No attribution trailers. Then continue to the next task: never stop and wait.
