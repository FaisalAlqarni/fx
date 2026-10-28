# 01: system-flow CLI, model schema, fragment merge and the fixture

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** an agent writes model fragments into `<site>/model/fragments/` and runs `node scripts/system-flow check`. The CLI loads every fragment, validates each against the JSON Schema shipped beside the lane with fx's own schema-subset validator, rejects a `schemaVersion` newer than it knows, merges the fragments (arrays concatenated, `stores` tables unioned) and rejects an id defined twice for the same kind, naming both files. Every declared id and every section folder must match `^[a-z0-9][a-z0-9-]*$`. This task also ships the test fixture every later task builds on. It prints JSON counts on success and `<file>:<pointer>: <message>` lines on failure.

**Design:** The CLI; The model; Fragments and merge; The pieces

**Files:**
- Create: `src/scripts/system-flow.ts` (built to extensionless `scripts/system-flow`): argument parsing, `--root` (default `git rev-parse --show-toplevel`), `--site` (default `.fx.json` `system_flow.output.site`, else `docs/system-flow`; this task reads `.fx.json` as raw JSON for that one key, task 03 moves it onto `parseFxJson`), the `check` subcommand, exit codes 0, 1, 2
- Create: `src/lib/sf-schema.ts` (the subset validator)
- Create: `src/lib/sf-model.ts` (types, `loadFragments`, `mergeFragments`, `itemsOf`)
- Create: `skills/fx-system-flow/system-model.schema.json` (JSON Schema for one fragment: every key optional at top level; `schemaVersion` required only in `meta.json`, checked in code)
- Create: `src/tests/helpers/sf-fixture.ts` (built to `tests/helpers/sf-fixture.js`; it replaces the design's `scripts/make-git-fixture`, see plan.md "Deviations from the design")
- Create: `src/scripts/system-flow-check.test.ts` (built to `scripts/system-flow-check.test.js`)
- Modify: `scripts/build` (add `scripts/system-flow.ts` to the extensionless case list), `src/scripts/test-scope.ts` (same name in `EXTENSIONLESS`), `scripts/check-all` (`run system-flow-check.test.js node scripts/system-flow-check.test.js` after the plan-check line)
- Modify: the plugin version 0.7.0 to 0.8.0 in `.claude-plugin/plugin.json` (the file `tests/gates/release-version.test.js` reads), `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `package.json` and the root entry of `package-lock.json` (the codex-manifest gate cross-checks them)

**Interfaces:**
- Produces, `src/lib/sf-model.ts` (a type shape that encodes decisions; field lists follow design "The model" plus the item-id rule in Global Constraints):

```ts
export type FileEvidence = { root?: string; path: string; lines?: string; symbol?: string };
export type OwnerEvidence = { owner: string; question?: string };
export type Evidence = FileEvidence | OwnerEvidence;
export type Verified = Record<string, string>; // root id -> 40-hex commit
export type Evidenced = { evidence: Evidence[]; unconfirmed?: boolean; verified?: Verified }; // on every evidenced kind
export type Node = Evidenced & { id: string; label: string; kind: string; role: string; children?: string; primary?: boolean };
export type Edge = Evidenced & { from: string; to: string; label: string; short?: string; mode?: 'sync' | 'async' };
export type Group = Evidenced & { id: string; label: string; members: string[]; groups?: string[] };
export type Diagram = { id: string; level: 0 | 1 | 2 | 3; parent?: string; title: string; summary: string; groups: Group[]; nodes: Node[]; edges: Edge[]; layout?: Record<string, { col: number; row: number }> };
export type Model = { schemaVersion: 1; meta: Meta; levels: { root: string; diagrams: Diagram[] }; sequences: Sequence[]; stores: Stores; storeFlows: StoreFlow[]; catalogue: CatalogueEntry[]; rules: Rule[]; inventory: InventoryEntry[]; sections: Section[]; questions: Question[]; corrections: Correction[] };
export type ItemKind = 'node' | 'edge' | 'group' | 'participant' | 'message' | 'sql' | 'cache' | 'memory' | 'files' | 'client' | 'step' | 'catalogue' | 'inventory' | 'rule' | 'bullet';
export type Item = { id: string; kind: ItemKind; handle: string; evidence: Evidence[]; verified?: Verified; unconfirmed?: boolean; file: string; pointer: string };
export const ID_PATTERN = '^[a-z0-9][a-z0-9-]*$';
export function handleOf(kind: ItemKind, id: string): string; // node:api, edge:engine:api>db, store:sql-links, step:first#2
export function parseHandle(h: string): { prefix: string; id: string } | null; // null when the prefix is not one of plan.md's handle prefixes
export type Problem = { file: string; pointer: string; message: string; level: 'error' | 'warning' };
export type Fragment = { file: string; data: Record<string, unknown> };
export function loadFragments(dir: string, hostRoot: string): { fragments: Fragment[]; problems: Problem[] };
export function mergeFragments(fragments: Fragment[]): { model: Model; problems: Problem[] };
export function itemsOf(model: Model): Item[];
```

  `Meta`, `Sequence`, `Stores`, `StoreFlow`, `CatalogueEntry`, `Rule`, `InventoryEntry`, `Section`, `Question`, `Correction` follow the design's model table exactly, plus: a required `id` on every store row and every bullet; every evidenced type (participant, message, store row, flow step, catalogue entry, inventory entry, rule, bullet, as well as node, edge and group) intersects `Evidenced`; `chapter` on sequences and store flows; optional `folder` on a section (its Markdown subfolder, default the Markdown root). `cache` replaces system-flow's `redis`. Store flow `store` is one of `sql`, `cache`, `memory`, `files`, `client`; `op` is `read`, `write` or `delete`. `Item.file` is the fragment the item came from, relative to the host root; `Item.pointer` its JSON Pointer in that file.
- Produces, `src/lib/sf-schema.ts`: `validate(schema: object, value: unknown): { pointer: string; message: string }[]`, supporting exactly `type`, `required`, `properties`, `additionalProperties: false`, `items`, `enum`, `pattern`, `maxLength`, `$ref` (local `#/$defs/...`). Messages, exact: `required property <name> missing`, `property <name> not allowed`, `expected <type>`, `value <json> not in enum`, `does not match <pattern>`, `longer than <n> characters`.
- Produces, `tests/helpers/sf-fixture.js`:

```ts
type RootName = 'host' | 'guide' | 'plain';
export function sfFixture(): {
  base: string; host: string; guide: string; plain: string; home: string;
  put(root: RootName, rel: string, body: string): void;
  git(root: 'host' | 'guide', ...args: string[]): string;   // stdout, trimmed; throws on a non-zero exit
  commit(root: 'host' | 'guide', message?: string): string;  // `git add -A` then commit; returns the new HEAD
  fragment(name: string, data: unknown): void;               // <host>/docs/system-flow/model/fragments/<name>.json
  fxJson(data: unknown): void;                               // writes <host>/.fx.json, pretty-printed, newline at the end
  goodSet(): void;                                           // writes the good fragment set below
  env(extra?: Record<string, string>): Record<string, string>;  // the environment `run` passes
  run(args: string[], env?: Record<string, string>): { status: number | null; stdout: string; stderr: string };
};
```

  Layout under `base = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'))`: `host/` and `guide/` are git repos (`git -c user.name=t -c user.email=t@t`), `plain/` is a folder with no git, `home/` is the HOME given to the CLI. At creation the fixture writes and commits `host/app/x.rb` (10 lines: line 1 `class Link`, line 4 `  def expired?`, line 5 `    true`, the rest `  # pad <n>`) and `host/app/y.rb` (2 lines: `module Y`, `end`), commits `guide/README.md` (line 1 `# Guide`), and writes `plain/notes.txt` (line 1 `Plain`). `run` spawns `node scripts/system-flow --root <host> ...args` with `HOME=<home>`, `CLAUDE_CONFIG_DIR` removed, then `env` merged over that. Nothing is ever deleted.
- Produces, CLI: `system-flow [--root <dir>] [--site <dir>] check`; stdout on success `{"ok":true,"fragments":<n>,"items":<n>,"warnings":[...]}`.

**Seam:** the `system-flow` CLI run as a process against the fixture (design Testing Decisions seam 1).

**Tests:** (fragment paths below are relative to `docs/system-flow/model/fragments/`)
- Good set (`goodSet()`): `meta.json` with `schemaVersion: 1` and `meta.roots` `[{ id: "backend" }]`; `level0.json` with diagram `system` (level 0) holding nodes `link` and `db` and edge `link` to `db`; `chapters.json` with section `s1` (`question: "Where do links expire?"`) and bullet `b1`. Every item cites a committed fixture file: `link` cites `{ path: "app/x.rb", lines: "1-4", symbol: "Link#expired?" }`, `db` and the edge cite `{ path: "app/y.rb", lines: "1-2", symbol: "Y" }`, `b1` cites `{ path: "app/x.rb", lines: "4", symbol: "expired?" }`, so later tasks reuse the set once evidence is verified. `check` exits 0 and stdout parses to `{ ok: true, fragments: 3, items: 4, warnings: [] }` (2 nodes, 1 edge, 1 bullet).
- Fixture: `plain/` has no `.git`; `git('host', 'log', '--format=%s')` lists one commit; `f.env()` (the builder `run` uses) has `HOME` equal to `f.home` and no `CLAUDE_CONFIG_DIR` key, even when the test process has one; `f.env({ CLAUDE_CONFIG_DIR: 'x' })` has it as `x`.
- Unknown key: `level0.json` node carries `colour: "red"`; exit 1; stderr has the line `docs/system-flow/model/fragments/level0.json:/levels/diagrams/0/nodes/0: property colour not allowed`.
- Missing required: a section without `question`; exit 1; stderr line ends `/sections/0: required property question missing`.
- Bad enum: an edge with `mode: "maybe"`; stderr line ends `/levels/diagrams/0/edges/0/mode: value "maybe" not in enum`.
- Too long: an edge `short` of 27 characters; stderr line ends `/short: longer than 26 characters`.
- Newer schema: `meta.json` with `schemaVersion: 2`; exit 1; stderr line `docs/system-flow/model/fragments/meta.json:/schemaVersion: schemaVersion 2 is newer than this CLI (1)`.
- No schemaVersion: `meta.json` without it; stderr line ends `meta.json:: required property schemaVersion missing`.
- Duplicate id: node `api` in `level0.json` and in `engine.json`; exit 1; stderr line `docs/system-flow/model/fragments/engine.json:/levels/diagrams/0/nodes/0: node api is also defined in docs/system-flow/model/fragments/level0.json`.
- Same id, two kinds: node `turn` in `level0.json` and sequence `turn` in `engine.json`: exit 0.
- Duplicate edge pair: two edges `link` to `db` in diagram `system`: exit 0, and `itemsOf` names them `system:link>db` and `system:link>db#2` (assert through stdout `items` equal to 5 and through a duplicate-check that does not fire).
- Id pattern: node id `Api`: exit 1; stderr line ends `/levels/diagrams/0/nodes/0/id: does not match ^[a-z0-9][a-z0-9-]*$`. A section `folder: "../x"`: stderr line ends `/sections/0/folder: does not match ^[a-z0-9][a-z0-9-]*$`. A `meta.roots` id `Guide`: the same message at `/meta/roots/0/id`.
- Group evidence: a group `g1` with `evidence` and `unconfirmed` passes the schema; a group carrying `colour` fails with `property colour not allowed`.
- Stores union: `a.json` with one `stores.sql` row and `b.json` with one `stores.sql` row and one `stores.cache` row; exit 0; `items` counts 3 store rows plus the rest.
- Bad JSON: `x.json` holding `{`; exit 1; stderr line starts `docs/system-flow/model/fragments/x.json:: invalid JSON`.
- Usage: `system-flow frobnicate`; exit 2; stderr starts `system-flow: usage:`.

**Risks:** the schema is the one copy of the format; put `ID_PATTERN` on every declared id and on `folder` in the schema itself; write it before the types and keep the types in step by reading the schema in review. A skills folder without `SKILL.md` until task 15: run `scripts/check-all` here and, if a gate fails on the bare folder, add the exception the gate already allows or stop and report.

**Testing:** CLI process tests on the two-root fixture; `scripts/check-all` for the gates.

## Acceptance criteria
- [ ] `node scripts/system-flow --root <fixture> check` on a good fragment set exits 0 with the counts.
- [ ] Every schema keyword the design lists is enforced, and nothing else is needed at run time (no new `dependencies` in `package.json`).
- [ ] A duplicate id of one kind names both fragment files; the same id on two kinds passes.
- [ ] No declared id or section folder outside `^[a-z0-9][a-z0-9-]*$` passes, `../x` included.
- [ ] The fixture offers a plain root, `git(root, ...args)` and `fxJson`, and the good set cites committed files.
- [ ] `scripts/check-all` passes, the version gate included.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-check.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-check.test.js`
Expected: fails because `scripts/system-flow` does not exist.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests.

- [ ] **5. Run them: verify GREEN**

Run: same two commands. Expected: `system-flow-check.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit by path**

```
git add src/scripts/system-flow.ts scripts/system-flow src/lib/sf-schema.ts lib/sf-schema.js src/lib/sf-model.ts lib/sf-model.js skills/fx-system-flow/system-model.schema.json src/tests/helpers/sf-fixture.ts tests/helpers/sf-fixture.js src/scripts/system-flow-check.test.ts scripts/system-flow-check.test.js scripts/build src/scripts/test-scope.ts scripts/test-scope scripts/check-all package.json package-lock.json .claude-plugin/plugin.json .codex-plugin/plugin.json .agents/plugins/marketplace.json
git commit -m "feat(system-flow): CLI with model schema, fragment merge and check"
```

No attribution trailers. Then continue to the next task: never stop and wait.
