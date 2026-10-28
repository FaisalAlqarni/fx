# 06: detect: docs config, output location and evidence roots

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** the lane's first step. `system-flow detect [--repo <path>]...` reads the repo's docs config and evidence roots and prints where the site and the Markdown will go, without asking anything. The Markdown always goes to `<docs_dir>/system/`; when that folder already holds hand-written Markdown, detect picks `<docs_dir>/system-generated/`, and when both do it exits 1 naming both (plan.md "Deviations from the design"). In a MkDocs repo it also prints the exact `nav` entries (the site page and `system/index.md`) and `exclude_docs` lines the planning message offers. Each `--repo <path>` names another evidence root; its id is its folder name made into an id. `--write` saves the output pick under `system_flow.output` and the roots under `system_flow.roots`, keeping every other key. The theme part of the output is filled by task 07, the archify part by task 12.

**Design:** Output location; The lane; The CLI; Out of Scope

**Files:**
- Create: `src/lib/sf-detect.ts`
- Modify: `src/scripts/system-flow.ts` (`detect [--write]`)
- Create: `src/scripts/system-flow-detect.test.ts` (built to `scripts/system-flow-detect.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `parseFxJson` with `system_flow` (task 03), `resolveRoots`'s `Root` (task 03; detect lists roots from `.fx.json`, with no model needed).
- Produces, `src/lib/sf-detect.ts`:

```ts
export type Detected = {
  docsConfig: { kind: 'mkdocs' | 'docusaurus' | 'vitepress' | null; path: string | null; docsDir: string | null };
  output: { site: string; markdown: string };
  mkdocs: { nav: string[]; excludeDocs: string[] } | null;
  theme: { source: string; kind: string } | null;   // null until task 07
  roots: { id: string; path: string; dir: string; git: boolean; remote: string | null; head: string | null }[]; // [0] is the host; path is relative to the host root
};
export function rootId(folder: string): string; // basename lowercased, each run of characters outside [a-z0-9] becomes one '-', leading and trailing '-' trimmed
export function detect(hostRoot: string, repos: string[]): { detected: Detected; problems: Problem[] };
export function writeFxJson(hostRoot: string, d: Detected): void;
```
- Produces, CLI: `system-flow detect [--repo <path>]... [--write]`, stdout the `Detected` JSON. Roots are the host, then `.fx.json` `system_flow.roots`, then each `--repo` not already listed (same resolved folder). Two roots that map to one id exit 1 with `system-flow: detect: roots <path> and <path> both map to id <id>; rename one in .fx.json system_flow.roots`. A `--repo` folder that does not exist exits 1 with `system-flow: detect: no folder at <path>`. Paths are written relative to the host root, never absolute.

**Seam:** the `system-flow` CLI run as a process.

**Tests:**
- MkDocs: host with `mkdocs.yml` holding `docs_dir: docs` and `theme: { name: material }`: `output` is `{ site: "docs/system-flow", markdown: "docs/system" }`; `docsConfig` is `{ kind: "mkdocs", path: "mkdocs.yml", docsDir: "docs" }`; `mkdocs.excludeDocs` deep-equals `["system-flow/README.md", "system-flow/model/", "system-flow/diagrams/src/"]`; `mkdocs.nav` deep-equals `["- System flow: system-flow/index.html", "- System docs: system/index.md"]`.
- Hand-written folder: `docs/system/notes.md` committed without the generated marker: `output.markdown` is `"docs/system-generated"`. A `docs/system/index.md` that carries `<!-- fx-system-flow generated: edit the model, then rebuild -->` does not count: `output.markdown` stays `"docs/system"`.
- Both taken: hand-written `.md` files in `docs/system/` and `docs/system-generated/`: exit 1, stderr `system-flow: detect: docs/system and docs/system-generated hold hand-written Markdown; set system_flow.output.markdown in .fx.json`.
- MkDocs with `docs_dir: site-docs`: `output.site` is `"site-docs/system-flow"`, `output.markdown` is `"site-docs/system"`.
- Docusaurus: host with `docusaurus.config.js` and a `docs/` folder: `docsConfig.kind` is `"docusaurus"`, `output` as the default, `mkdocs` is `null`.
- VitePress: host with `guide/.vitepress/config.ts`: `docsConfig.kind` is `"vitepress"`, `docsDir` is `"guide"`, `output.site` is `"guide/system-flow"`, `output.markdown` is `"guide/system"`.
- None: plain host: `docsConfig.kind` is `null`, `output` is `{ site: "docs/system-flow", markdown: "docs/system" }`.
- `.fx.json` already holding `system_flow.output`: detect reports that pick unchanged.
- Roots: `.fx.json` with `system_flow.roots.guide` set to `../guide`: `roots` holds the host (`id` from the host folder name, `path: "."`, `git: true`, `head` the host HEAD) and `guide` (`path: "../guide"`, its HEAD, `remote` `null`).
- `--repo`: `detect --repo ../guide --repo ../plain --write` on a host with no `.fx.json` roots: `.fx.json` `system_flow.roots` deep-equals `{ "guide": "../guide", "plain": "../plain" }`; `roots[2]` is `{ id: "plain", path: "../plain", git: false, remote: null, head: null, dir: <abs> }`; no value in `.fx.json` starts with `/`.
- Id from folder: `rootId('Shamel.Backend')` is `shamel-backend` (checked by `detect --repo <folder named Shamel.Backend>` printing that id); a second `--repo` whose folder is `shamel_backend` exits 1 with the two-roots message.
- Missing: `detect --repo ../nowhere` exits 1 with `system-flow: detect: no folder at ../nowhere`.
- `--write`: on a host whose `.fx.json` holds `{"test_all": "x"}`, `detect --write` leaves `test_all` and adds `system_flow.output` equal to the printed output; a second `--write` leaves the file byte-identical; `parseFxJson` on the result reports no problem.
- Nothing else is written: without `--write`, the host's `git status --porcelain` is empty after `detect`.

**Idempotency:** `--write` replaces only `system_flow.output`, adds roots that are not listed yet to `system_flow.roots` (never changes an existing root's path), and, after task 07, replaces `system_flow.theme`; a rerun writes the same bytes.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] `detect` asks nothing and writes nothing without `--write`.
- [ ] The three output rules of the design hold in order, with the Markdown in `<docs_dir>/system/` or `<docs_dir>/system-generated/`, never in a folder holding hand-written Markdown.
- [ ] `--repo ... --write` leaves `.fx.json` naming every root by a relative path.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-detect.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-detect.test.js`
Expected: `detect` exits 2.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-detect.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-detect.ts src/scripts/system-flow.ts`

- [ ] **7. Commit by path**

```
git add src/lib/sf-detect.ts lib/sf-detect.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-detect.test.ts scripts/system-flow-detect.test.js scripts/check-all
git commit -m "feat(system-flow): detect the docs config, output location and evidence roots"
```

No attribution trailers. Then continue to the next task: never stop and wait.
