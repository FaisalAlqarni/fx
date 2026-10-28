# 03: The prose floor in `check` and `BuildResult.prose`

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** `check` and `build` refuse a model below the prose floor, naming the chapter, the rule and the fragment that holds the field, so the problem goes back to the chapter's writer. With `--fragment`, the whole-model rules are skipped and the shape rules apply to what that fragment writes. `build` reports the prose numbers the proof compares. The fixture's `goodSet()` grows into a model that meets the floor, and every existing test it breaks is updated in this task.

**Design:** The prose floor (check rules); Build result and report; Who writes what; Error handling

**Files:**
- Create: `src/lib/sf-prose.ts`
- Modify: `src/lib/sf-build.ts` (`checkModel` runs `checkProse`; `BuildResult.prose`)
- Modify: `src/tests/helpers/sf-fixture.ts` (`goodSet()` meets the floor, below)
- Create: `src/scripts/system-flow-prose.test.ts` (built to `scripts/system-flow-prose.test.js`)
- Modify: `scripts/check-all` (one line)
- Modify: every `src/scripts/system-flow-*.test.ts` the new floor or the new chapter order breaks (expected chapter ids shift by four)

**Interfaces:**
- Consumes: `fieldOrigin` and `originOf` (task 02); `Model` fields (task 01); `FigureSpec` (today's shape; task 05 adds `lanes`).
- Produces, `src/lib/sf-prose.ts`:
  - `sentences(text: string): number` (split on `.`, `?` or `!` followed by a space or the end; not inside backticks; `e.g.` and `i.e.` do not end a sentence)
  - `words(text: string): number` (whitespace-separated tokens)
  - `checkProse(model: Model, mode: 'whole' | 'fragment'): Problem[]`; it takes no origin map: it calls `fieldOrigin` and `originOf` itself to place each problem
  - `proseStats(model: Model, figures: FigureSpec[]): Prose` with `type Prose = { chapters: { id: string; words: number; leadSentences: number; bullets: number }[]; averageWords: number; glossary: number; lifelines: number }`; `words` is lead plus bullets plus not-owned; `averageWords` is the mean rounded to one decimal; `lifelines` counts figures of kind `sequence` that carry `lanes` (0 until task 05).
- Produces: `BuildResult.prose: Prose | null` (null until the check passes).
- Produces, the fixture: `goodSet()` writes `meta.json` (`name: "Fixture"`, `title: "Fixture system"`, a 3-sentence `intro`), `chapters.json` declaring `start-what`, `start-parts`, `start-request`, `start-code` (folder `start-here`, roles in order) then `s1`, each with a lead of 2 sentences of 20 words each and 4 evidenced bullets of 20 words (120 words, inside 120 to 200, so `goodSet()` raises no prose warning), `start-what` with 2 `notOwned` bullets of 10 words (140 words), `start-parts` listing diagram `system`; a sequence `turn` (`chapter: "start-request"`, 4 participants with looks `client`, `service`, `store`, `external`, 5 messages, the fourth a call to the `external` participant and the fifth its reply with `reply: true`, every message evidenced on `app/x.rb` `1-4` `Link`, summary of 12 words); a `glossary.json` of 15 terms, among them `link` (tag `model`, alias `links`, evidence `app/x.rb` `1-4` `Link`) and `short-link` (term `short link`); a code map entry `app` for root `backend` (`path: "app/"`, evidence the folder `app/` then `app/x.rb` `1-4` `Link`); one `sql` store row and one catalogue entry; the word `link` twice in `s1`'s lead; every diagram, sequence and store flow `summary` one sentence of 6 to 30 words.

**Prose problem messages** (exact; `<file>` and pointer are where the field lives, or the `chapters.json` declaration when it is missing):

| Rule | Message |
|---|---|
| name or intro missing | `meta.name missing` / `meta.intro missing` (at `meta.json:/meta`) |
| intro length | `meta.intro has <n> sentences; 2 to 5 required` |
| role missing | `Start here role <role> missing` (at `chapters.json:/sections`) |
| role twice | `role <role> appears <k> times; exactly one required` |
| role order | `section <id> has role <role>; the first four sections must be what, parts, request, code in that order` |
| lead | `section <id>: lead missing` / `section <id>: lead has <n> sentences; 2 to 4 required` |
| bullets | `section <id>: <n> bullets; 4 to 8 required` |
| bullet length | `bullet <id>: <n> words; at most 40` |
| words, error | `section <id>: <n> words of lead, bullets and not owned; at least 100 required` |
| words, warning | `section <id>: <n> words of lead, bullets and not owned; 120 to 200 expected` |
| not owned | `section <id>: <n> notOwned bullets; 2 to 6 required` |
| parts | `section <id>: diagrams must include the level-0 diagram <root>` |
| request | `section <id>: <n> sequences; exactly one required` |
| code map | `section <id>: root <root> has no code map entry; items cite it` |
| caption | `<diagram|sequence|store flow> <id>: summary missing` / `...: summary has <n> sentences; one required` / `...: summary has <n> words; 6 to 30 required` |
| participants | `sequence <id>: <n> participants; at most 12 (split it)` |
| glossary size | `glossary has <n> terms; 15 to 40 required` (at the first glossary fragment's `/glossary`, else `system-flow: check:`) |
| glossary duplicate | `term "<text>" is also used by term:<id>` |

Whole-model rules, skipped under `--fragment`: name and intro presence, role presence and order, lead missing, bullets below 4, words, not-owned count, parts, request, code map, glossary size. Every other rule is a shape rule and runs in both modes.

**Not this task:** the dash ban (exists); `migrate` owed list (task 04 calls `checkProse`).

**Seam:** the `system-flow` CLI run as a process.

**Tests:** each rule passes at its bound and fails one past it, on `goodSet()` with one field changed; stderr matches the table's message at the stated file and pointer.
- `sentences`: through a lead: `"A b. C d? E!"` counts 3 (fails a 2-to-4 bound only when 5); `"Use e.g. this. Then go."` is 2; ``"Run `a. b` now. Done."`` is 2; `"v1.2 is out. Yes."` is 2.
- Intro: 1 sentence fails, 2 passes, 5 passes, 6 fails.
- Lead: 1 and 5 sentences fail, 2 and 4 pass; a section with no lead fails `section s1: lead missing` at `chapters.json:/sections/4`.
- Bullets: 3 and 9 fail, 4 and 8 pass; a 41-word bullet fails `bullet <id>: 41 words; at most 40`.
- Words: `s1` at 120 words (the `goodSet()` default) passes with no warning; the variants at 99 words (fails), 100 words (passes with the 120 to 200 warning in stdout `warnings`) and 201 words (warns) are built inside `system-flow-prose.test.ts` by editing `s1` after `goodSet()`, and `goodSet()` itself stays at 120.
- Not owned: 1 and 7 fail, 2 and 6 pass.
- Roles: `start-code` removed fails `Start here role code missing`; `start-parts` and `start-request` swapped fails the order message on `start-request`; two `request` sections fail `role request appears 2 times; exactly one required`.
- Parts: `start-parts` without `system` fails `section start-parts: diagrams must include the level-0 diagram system`.
- Request: a second sequence with `chapter: "start-request"` fails `section start-request: 2 sequences; exactly one required`; a sequence listed in `sequences` and one naming the chapter both count.
- Code map: a bullet citing `@guide/README.md` with no code map entry for root `guide` fails `section start-code: root guide has no code map entry; items cite it`.
- Caption: a sequence summary of 5 words fails, 6 passes, 30 passes, 31 fails; two sentences fail; a store flow with no summary fails `store flow <id>: summary missing`.
- Participants: 12 pass, 13 fail `sequence turn: 13 participants; at most 12 (split it)`.
- Glossary: 14 and 41 terms fail, 15 and 40 pass; alias `link` beside term `Link` fails `term "link" is also used by term:link`.
- `--fragment`: an area fragment with a 5-sentence lead fails with the lead message; the same fragment with no `glossary.json` in the folder passes (glossary size skipped); a 9-bullet section in it fails.
- Prose numbers: `build` stdout `prose.chapters` holds `{ "id": "s1", "words": 120, "leadSentences": 2, "bullets": 4 }` and `{ "id": "start-what", "words": 140, "leadSentences": 2, "bullets": 4 }`; `prose.averageWords` is `124` (five chapters: 140 + 4 x 120 = 620, divided by 5); stdout `warnings` holds no prose line; `prose.glossary` is `15`; `prose.lifelines` is `0`.
- Dash: an en dash in a lead still fails with today's dash message.

**Risks:** the fixture rewrite shifts chapter numbers in every page and Markdown test; update expected values only, never weaken an assertion.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] A chapter below the floor fails `check` and `build`, naming the fragment its writer owns.
- [ ] An area agent's `--fragment` run reports its own shape problems and nothing that needs the whole model.
- [ ] `build` prints `prose`.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-prose.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-prose.test.js`
Expected: thin chapters pass `check`.

- [ ] **4. Implement the minimum that passes; extend `goodSet()`; fix every broken test's expected values**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-prose.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/lib/sf-prose.ts lib/sf-prose.js src/lib/sf-build.ts lib/sf-build.js src/tests/helpers/sf-fixture.ts tests/helpers/sf-fixture.js scripts/check-all src/scripts/system-flow-*.test.ts scripts/system-flow-*.test.js
git commit -m "feat(system-flow): the prose floor in check and BuildResult.prose"
```

Never push, merge or open a PR.
