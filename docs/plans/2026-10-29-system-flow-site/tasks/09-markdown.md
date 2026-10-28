# 09: Markdown: leads, Start here docs, code map, captions, `glossary.md`

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** the generated Markdown says what the page says. Each chapter doc gains its lead as the paragraph after the question; the `what` doc gains a "Not owned here" list; the `code` doc gains the stores overview and the code map table; every figure's `summary` is a one-line caption before its Mermaid block or figure link. The four Start here docs live in `start-here/` with its `index.md` (the controller declares `folder: "start-here"` on them). `glossary.md` joins `components.md`, `stores.md`, `rules-in-force.md` and `coverage.md` in the Markdown root, one row per term with its evidence line. The root `index.md` links `start-here/index.md` and `glossary.md`, so a reader reaches both from the docs root. Escaping, evidence lines and the generated marker are unchanged.

**Design:** Markdown; The page: chapter content

**Files:**
- Modify: `src/lib/sf-markdown.ts` (`renderMarkdown` content; `renderGlossary`)
- Modify: `src/lib/sf-build.ts` (write `glossary.md` on every build, like `coverage.md`)
- Create: `src/scripts/system-flow-markdown.test.ts` (built to `scripts/system-flow-markdown.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: merged sections with `role`, `lead`, `notOwned`, `folder`; `Model.glossary`, `Model.codeMap` (tasks 01, 02); `escapeCell`, `escapeMermaid`, `evidenceLine` (`sf-markdown.ts`); `parseDoc` (`src/lib/doc-evidence.ts`).
- Produces: `renderGlossary(model: Model, roots: Map<string, Root>, hostId: string, markdownRoot: string): { path: string; text: string }`.

**Seam:** the `system-flow` CLI run as a process, reading the written docs and parsing them with `parseDoc`.

**Tests:** `build` on `goodSet()` with Markdown at `docs/system`.
- Paths: `docs/system/start-here/index.md`, `start-here/start-what.md` to `start-here/start-code.md`, `docs/system/s1.md` and `docs/system/glossary.md` are written, each with the generated marker.
- Root index: `docs/system/index.md` holds a Markdown link whose target is `start-here/index.md` and one whose target is `glossary.md`; following each target from `docs/system/` reaches a written file.
- Lead: in `s1.md` the line after the question paragraph is the lead text.
- Not owned: `start-what.md` holds a `## Not owned here` heading followed by 2 list items, each with its evidence line.
- Code doc: `start-code.md` holds a stores table with header `| Store kind | Rows | Shown in |` and a code map table with header `| Folder | What it owns | Start reading at |`, row `app/` with `app/x.rb:1-4 Link`.
- Captions: in the doc that draws `seq-turn`, the line before its Mermaid fence is the sequence `summary` in italics (`_<summary>_`).
- Glossary: `glossary.md` has `# Glossary`, one table row per term (15), sorted by term case-insensitive, each with its evidence line; a term holding `|` is escaped as `\|`.
- Parsed back: `parseDoc` on `s1.md`, `start-what.md` and `glossary.md` returns no parse problem and the evidence entries the model holds for those items.
- Hand-written collision: an existing `docs/system/glossary.md` without the marker is left alone and `build` exits 1 with today's collision message.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] Each chapter doc carries its lead, bullets and captions; `glossary.md` carries every term; the root `index.md` links `start-here/index.md` and `glossary.md`.
- [ ] `parseDoc` reads every new doc's evidence back.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-markdown.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-markdown.test.js`
Expected: no `glossary.md`; no lead line.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-markdown.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/lib/sf-markdown.ts lib/sf-markdown.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-markdown.test.ts scripts/system-flow-markdown.test.js scripts/check-all
git commit -m "feat(system-flow): Markdown carries leads, Start here, code map and glossary"
```

Never push, merge or open a PR.
