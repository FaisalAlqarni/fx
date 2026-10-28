# /fx:fx-system-flow, second iteration: a site that explains the system to a new engineer

**Date:** 2026-10-29
**Status:** ready-for-agent
**Approved:** 2026-10-29
**Glossary:** fx has no GLOSSARY.md; terms follow PREAMBLE.md, ADR 0066 and the first design (`docs/plans/2026-10-28-system-flow/design.md`, "Terms"). Terms this design adds are under Implementation Decisions, "Terms".

Research: `research/facts.md` (the gap analysis numbers, the owner's original page, the approved mockup, sequence sizes in the existing models, and the code facts this design leans on).

## Problem Statement

The first iteration produces a correct, evidenced site that does not teach. Measured against the owner's hand-built Shamel page, a generated chapter averages 11 words of prose against 122 and carries no fact bullets at all, because no brief asks for them. The diagram summaries the area agents write are never shown. The menu is a static list that scrolls away. Sequences are drawn as box diagrams with folded arrows, so they read as one more architecture picture. Figure controls float between the diagram and the next heading, and tall figures never start playing. Nothing on the page tells a newcomer what the system is, what it leaves to others, how one request travels through it, or where to start reading the code.

The reader is a new engineer who knows backends in general and has never seen this codebase. They open the site to get oriented, and later to find one answer quickly. Today's page gives them a catalogue of the evidence and leaves the explaining to them.

## Solution

The owner reruns `/fx:fx-system-flow`. The site that comes out is built from the owner's own page structure, made generic: a sticky numbered side menu with a filter box, grouped "Start here", "How it works" and "Reference". Every site opens with the same four chapters: what the system is and what it does not own, the parts and how they fit (the level-0 walkthrough and the map explorer), one main request end to end told as a story with its sequence, and where data lives with a code map of which folder owns what. Then the system's own chapters, then a glossary, the rules in force, coverage and corrections.

Every chapter has a lead of 2 to 4 sentences and 4 to 8 evidenced fact bullets, and every figure sits in a card with its title, a one-line caption saying what to notice, the figure, and a control bar inside the card. Sequences are drawn as lifelines. Terms in the text link to the glossary. The `check` step refuses a model that falls short of these floors, so a thin chapter fails the build instead of reaching the page. The generated Markdown carries the same leads, bullets and glossary.

## Approaches

1. **A new site template from the owner's page, prose as checked model fields (chosen, owner, 2026-10-29).** The shared fx page template stays as it is for fx-docs, fx-audit and fx-architecture; the prose is written by the agents that read the code and enforced by `check`. Costs a schema version 2 with a migration, a lane change and a rerun of both proof sites.
2. **Patch the shared page template and add a prose pass at the end.** Smaller diff, but two layouts in one shared file, and a separate prose pass would cite code its writer never read.
3. **Ship build-page.mjs as is.** Not viable: Shamel-only tables, a different model shape and a hand-placed level 0 (`research/facts.md`).

## User Stories

1. As a new engineer, I want the site to open with what the system is and what it deliberately leaves to other systems, so that I know its edges before its insides.
2. As a new engineer, I want a walkthrough of the level-0 parts, each in a sentence or two, next to the map I can drill into, so that I can name every part and see how they connect.
3. As a new engineer, I want one main request told end to end as a short story next to its lifeline sequence, so that I have one concrete path through the system before I read the rest.
4. As a new engineer, I want a code map saying which folder owns what and which file to read first, and an overview of where data is stored, so that I can find my way into the code.
5. As a new engineer, I want every chapter to open with a lead and a handful of evidenced facts, each showing the file and line behind it, so that I learn the part from the page and can check any claim.
6. As a new engineer, I want every figure in a card with a caption that says what to notice, so that I know what to look at before I press Play.
7. As a new engineer, I want the play controls, the narration of the current step and the step count inside the figure's card and still on screen while I look at a tall figure, so that the controls never float away from the figure they drive.
8. As a new engineer, I want every figure to start playing when I scroll to it and to pause when I scroll past, whatever its height, so that no figure stays still.
9. As a new engineer, I want sequences drawn as lifelines with numbered arrows, dashed replies and the call that leaves the system marked, so that I can follow who calls whom in order.
10. As a new engineer, I want each card to link to the full archify diagram, so that I can open the large version when I need it.
11. As a new engineer, I want a sticky numbered side menu grouped into Start here, How it works and Reference, with the chapter I am reading highlighted, so that I always know where I am.
12. As a new engineer, I want a filter box in the menu that narrows chapters, parts and glossary terms as I type, so that I can find an answer fast on my second visit.
13. As a new engineer on a phone, I want the menu as a sticky top bar that opens the chapter list and the filter, and wide figures that scroll inside their card with labels I can read, so that the site works at 390 px.
14. As a new engineer, I want a glossary of 15 to 40 terms in the meaning the code gives them, each tagged and evidenced, with terms in the text linking to it, so that the codebase's words stop being ambiguous.
15. As the owner, I want `check` to fail a chapter without a lead of 2 to 4 sentences, with fewer than 4 or more than 8 bullets, or under 100 words, a figure without a caption, a glossary outside 15 to 40 terms, and a site missing a Start here chapter, so that the prose floor holds on every run.
16. As the owner, I want the build result to report words per chapter, chapters with leads and bullets, glossary size and inline lifeline count, so that I can compare a run with my page from numbers.
17. As the owner, I want existing version-1 fragments migrated by one CLI command that fills what can be derived and lists the prose still owed, so that a site from the first iteration can be brought up to date without a full rebuild.
18. As the owner, I want the generated Markdown to carry the leads, bullets, the Start here chapters, the code map and the glossary, so that the docs site says what the page says.
19. As the owner, I want the shared fx page template that fx-docs, fx-audit and fx-architecture use left as it is on master, so that this work changes no other lane's pages.

## Implementation Decisions

### Terms

- **Site template:** the HTML template the site page is built from, generalised from the owner's `page-template.html`. Not the shared kit page template.
- **Start here:** the four fixed opening chapters every site has, marked by a section `role`: `what`, `parts`, `request`, `code`.
- **Lead:** the 2 to 4 sentence opening paragraph of a chapter.
- **Card:** the box that holds one figure: title, caption, figure, control bar.
- **Lifeline sequence:** a sequence drawn with participants across the top, a vertical line under each, and one numbered arrow per message, in order.
- **Look:** the visual class of a node or participant (`service`, `store`, `client`, `external`, `security`), which sets its colour and legend item. `kind` stays as free text and becomes the node's second line.
- **Prose floor:** the minimums `check` enforces on leads, bullets, words, captions and the glossary.

### The pieces

| Unit | What it does | How it is used | Depends on |
|---|---|---|---|
| Site template | The page shell: grid, sticky menu, filter, mobile bar, chapter head, card, lifeline and table CSS, the menu and theme script, slots | Read by the page renderer | fx tokens and `theme.css` for colours |
| Page renderer | Fills the site template from the model: header, legend, menu, chapters by group, cards, Reference chapters, filter index, term links | Called by `build` | Model, layout figures, coverage, theme |
| Lifeline layout | Deterministic grid geometry for a sequence: columns, rows, arrows, labels, the leaving call | Called by layout in `build` and `check --fragment` | Model only (no ELK) |
| Figure player `fx-flow-2.js` | Draws box and lifeline figures inside a card, the control bar, narration, autoplay and pause | Loaded by the page | The figure specs inline in the page |
| Schema 2 and `migrate` | New fields, section merge across fragments, the v1 to v2 migration | `check`, `build`, `system-flow migrate` | Model |
| Prose rules | The prose floor and the Start here rules | Called by `check` and `build` | Model |
| Markdown renderer | Gains leads, not-owned list, code map, captions and `glossary.md` | Called by `build` | Model |
| SVG fallback deep page | Draws a sequence page as lifelines from the same geometry | Called by `build` when archify is absent or fails | Lifeline layout |
| Lane sidecars | Planning, area brief, fragment guide, check-and-report gain the prose, Start here, glossary and code map instructions | Read by the controller and area agents | Nothing |

### The model: schema version 2

`schemaVersion` becomes 2. Additions only, with one relaxation and one new required field:

| Where | Change |
|---|---|
| `meta` | `name` (the short system name the legend and menu use, "Shamel"), `intro` (the system story for the header, 2 to 5 sentences) |
| `section` | `role` (enum `what`, `parts`, `request`, `code`; absent means a How it works chapter), `lead` (string), `notOwned` (bullets, only on `role: "what"`). `required` drops to `id` alone, because a section is now assembled from several fragments (below); `check` requires `title` and `question` on the merged section |
| `node`, `participant` | `look` (enum `service`, `store`, `client`, `external`, `security`), **required** |
| `message` | `short` (at most 26 characters, the arrow label), `reply` (boolean, drawn dashed) |
| `sequence`, `storeFlow` | `summary` (the card caption; `diagram` already has one) |
| top level | `glossary[]`: `id`, `term`, `aliases[]`, `tag` (enum `model`, `service`, `job`, `store`, `message`, `external`, `concept`), `meaning`, `evidence[]`, `unconfirmed`, `verified` |
| top level | `codeMap[]`: `id`, `root`, `path` (a folder ending in `/`), `owns` (one sentence), `evidence[]` (at least one folder entry and one file entry; the first file entry is "start reading here"), `unconfirmed`, `verified` |

Glossary terms and code map entries are items: handles `term:<id>` and `code:<id>`, evidence verified on path, range and symbol, stamped by `verify` and `build`, listed by `stale` and `query`, like every other item. A folder entry is allowed on code map entries, as on catalogue and inventory entries.

Diagram `summary` keeps its field and narrows its meaning: one sentence saying what to notice, shown as the card caption. The archify subtitle keeps using it.

**Sections merge across fragments.** `chapters.json` declares every section (`id`, `title`, `question`, `role`, order). Another fragment may hold a section with the same `id` to add `lead`, `bullets`, `notOwned` and figure references for a chapter it writes. Merge combines them: arrays concatenate, a scalar set in two fragments is an error naming both files, and a section id that `chapters.json` does not declare is an error. This is the one kind exempt from the duplicate-id rule; every other kind keeps it. The chapter order is the order in `chapters.json`.

**Why the floors are check rules, not schema.** The subset validator has no `minItems` or `minLength`, and a fragment is legitimately incomplete while agents work (`chapters.json` is written before any lead exists). The schema stays the shape; `check` on the whole model enforces the floor.

### Migration

`system-flow migrate` is a new subcommand. It rewrites every fragment in `<site>/model/fragments/` from version 1 to 2, all or nothing (the existing write-all helper: every file to a temp file first, renamed only when all are written):

1. `schemaVersion` 1 becomes 2 where present.
2. Every node and participant gets `look` from its `kind` by a fixed table: `client`, `app`, `browser`, `mobile`, `portal`, `ui` to `client`; `store`, `db`, `database`, `sql`, `cache`, `redis`, `bucket`, `files`, `storage` to `store`; `external`, `outside`, `third-party`, `saas` to `external`; `security`, `auth`, `identity`, `check` to `security`; anything else to `service`. Matching is case-insensitive on the whole kind.
3. `meta.name` is copied from `meta.title` when absent.

It changes no label, fact or evidence, so no corrections entry is owed. It is idempotent: a version-2 fragment is left byte for byte. It prints JSON with the files rewritten and `owed`: the prose the model still lacks (Start here roles missing, chapters without lead or within the bullet floor, sequences and store flows without `summary`, glossary size, roots without a code map entry, `meta.intro`), the same list `check` would fail on. The lane's rerun path offers "Bring the prose up to date", which writes exactly the owed list.

`check` and `build` on a version-1 fragment fail with one problem per file: `schemaVersion 1: run system-flow migrate`. A fragment newer than the CLI is rejected as today.

### The prose floor (check rules)

Run on the merged model by `check` and `build`. With `--fragment`, the rules that need the whole model (presence of the four roles, a lead or bullets on every chapter, `meta.intro`, glossary size, code map per root) are skipped, and the shape rules apply to whatever the fragment does write, so an area agent learns of a five-sentence lead or nine bullets in its own check run.

| Rule | Level |
|---|---|
| `meta.name` and `meta.intro` present; intro 2 to 5 sentences | error |
| Exactly one section of each role `what`, `parts`, `request`, `code`, and they are the first four sections in that order | error |
| Every section has `title`, `question`, a `lead` of 2 to 4 sentences, and 4 to 8 bullets | error |
| Every bullet at most 40 words and evidenced or `unconfirmed` (evidence as today) | error |
| Lead plus bullets plus not-owned at least 100 words | error |
| Lead plus bullets plus not-owned outside 120 to 200 words | warning |
| `what`: 2 to 6 `notOwned` bullets | error |
| `parts`: its `diagrams` include `levels.root` | error |
| `request`: exactly one sequence (listed or naming the chapter) | error |
| `code`: at least one code map entry per root that any item cites | error |
| Every diagram, sequence and store flow drawn on the page has a `summary` of one sentence, 6 to 30 words | error |
| A sequence has at most 12 participants (split it otherwise) | error |
| Glossary 15 to 40 terms; no two terms or aliases equal ignoring case | error |
| No em or en dash anywhere (as today) | error |

Sentences are counted by splitting on `.`, `?` or `!` followed by a space or the end, outside backticks, with `e.g.` and `i.e.` not ending a sentence (`shortcut: a rule-based splitter; replace it if a real lead is miscounted in a proof run`). Words are whitespace-separated tokens.

A prose problem points at the fragment that holds the offending field, or at `chapters.json` when the field is missing, so it goes back to the chapter's writer.

### Who writes what

| Text | Writer | When |
|---|---|---|
| `meta.name`, first `meta.intro` | Controller | Planning, in `meta.json` |
| The four Start here sections (ids `start-what`, `start-parts`, `start-request`, `start-code`, folder `start-here`) | Controller declares them in `chapters.json` | After approval, with the other shared ids |
| Lead and bullets of `what`, `parts`, `code`; `notOwned` | Controller, in `chapters.json` | After every area returns, from its planning reads and the area fragments (evidence it cites is re-read, never copied blind) |
| Lead and bullets of `request` | The area that owns the main request's sequence | During its investigation, in its own fragment |
| Lead and bullets of each How it works chapter | The one area the plan names as the chapter's writer | During its investigation, in its own fragment |
| `summary` on every diagram, sequence and store flow; `look` on every node and participant; `short` and `reply` on messages | The area that owns them | In its fragment |
| `codeMap` entries for the area's folders | The area | In its fragment |
| Glossary | Controller, in a new controller fragment `glossary.json` | After areas return, from the 3 to 8 candidate terms each area returns (term, tag, meaning, evidence); the controller removes duplicates and checks with `--fragment` |
| Final `meta.intro` | Controller | Same pass as the glossary |

The plan names, per chapter, exactly one writer. The main request is the sequence candidate that crosses the most level-0 parts; the planning message names it, so the owner can swap it.

Writing rules, in the area brief and the planning sidecar, for every lead and bullet: written for an engineer who knows backends and not this code; the lead says what the part does and why it matters to someone changing it; one fact per bullet, from code the writer read, with the narrowest evidence; glossary terms in the code's meaning; plain words; no "who uses it"; a message `label` is one plain sentence (it becomes the narration) and `short` is the code-ish name on the arrow.

### Lane changes

- **planning.md:** the plan always carries the four Start here chapters first; names the main request and its area; names one writer per chapter; `meta.json` gains `name` and a first `intro`; `schemaVersion` 2.
- **area-brief.md:** a "Prose" section with the writing rules and floors above, the chapters the area writes, `summary`, `look`, `short`, `reply`, `codeMap`; the return gains `Prose: <chapter ids written>` and a `Glossary candidates` block, one JSON line per term.
- **fragment-guide.md:** the new keys and kinds, the section merge rule, the look table, the handles `term` and `code`.
- **SKILL.md:** step 3 adds the controller's Start here and glossary pass after the last area returns; the Rerun choices gain "Bring the prose up to date" (run `migrate` when the model is version 1, then write the `owed` list); `migrate` joins the list of subcommands; the build-result prose block joins the report.
- **check-and-report.md:** a prose block in the report (below), and the unmet-floor loop under Error handling.
- SKILL.md stays under 20,000 bytes; the sidecars stay one level deep.

### Data flow

1. **Detect**, unchanged.
2. **Plan:** areas, the four Start here chapters plus the system's chapters, a writer per chapter, the main request; `meta.json` with `name` and `intro`. Stop for approval.
3. **Shared ids:** `chapters.json` (with `role` on the first four) and `level0.json`, each checked with `--fragment`.
4. **Investigate:** each area writes its fragment, figures with `summary` and `look`, its chapters' lead and bullets as merged sections, its `codeMap`; returns glossary candidates.
5. **Start here and glossary:** the controller writes the `what`, `parts` and `code` prose in `chapters.json`, `glossary.json`, and the final `meta.intro`; each checked with `--fragment`.
6. **Build:** merge (sections combine), schema, cross-references, prose rules, evidence; layout (ELK for level and flow figures, the lifeline grid for sequences); page from the site template; Markdown; deep diagrams; `BuildResult` with the prose block.
7. **Interview, rebuild, visual check, report**, as today.

### The site template

`references/system-flow/site-template.html`, generalised from the owner's `model/page-template.html`. Every Shamel string becomes a slot or a model field. Colours come only from fx token names (`--paper --panel --ink --muted --rule --code --accent --accent-tint --warn --alert --violet --info --info-tint`), so `theme.css` from the detected design language themes it; the original's `--green` maps to `--accent`, `--green-t` to `--accent-tint`, `--saffron` and `--tok` to `--warn`, `--magenta` to `--violet`, `--blue` to `--info`, `--blue-t` to `--info-tint`. Type scale from the original; families from `theme.css` when the repo names fonts, else the original's stacks with system fallbacks. Logical properties throughout, so `dir="rtl"` mirrors.

Slots: `TITLE`, `NAME`, `HEADER` (intro, how to read, roots and date), `LEGEND`, `MENU`, `CHAPTERS`, `MAP_DATA`, `DIAGRAMS`, `SITE_INDEX`, `FOOTER`. The fixed "how to read" paragraph lives in the template, written generically: figures play when scrolled to and the bar under each drives them; terms link to the glossary; each chapter's "Files and locations" holds the evidence; "Open in archify" opens the full diagram.

The template carries its own inline script (theme toggle under `fx-theme`, menu, filter, scroll spy, evidence toggle), as the original did. It is not a kit file: it is never copied into a repo, only read by `build`.

**Layout at 1440:** the original's grid: a 240 px menu column, 40 px gap, `main` up to 900 px, 1228 px total with padding, centred. The menu is `position: sticky; top: 0; max-block-size: 100vh; overflow: auto`. Card content width is 870 px, so every box figure (at most 860 px) fits at 1:1.

**Menu.** Name and "System flow, generated by fx" at the top, the theme toggle, the filter box, then three groups with headings. Start here and How it works items are numbered `01` onward by a CSS counter in the accent colour; Reference items (Glossary, Rules in force, Coverage, Corrections) are unnumbered. The scroll spy marks the chapter in the middle band of the window (`rootMargin: -40% 0px -55% 0px`) with the tinted background and `aria-current="location"`, and scrolls the menu itself (never the page) to keep it visible.

**Filter.** A `type="search"` input labelled "Filter chapters, parts, terms". `build` writes a small inline index: per chapter its number, title, question and lead; per part (every node label in every level) the chapter that draws its diagram, else chapter `start-parts`; per glossary term its anchor. Typing narrows the menu, case-insensitively on substrings: chapters that match stay with their number, parts show under their chapter, terms show as `G` items linking to `#term-<id>`; an `aria-live` line says how many match, or "Nothing matches". Escape or an empty box restores the full menu.

**Below 900 px:** one column. The menu becomes a sticky top bar with the name and a "Chapters" control. The control is a `<details>` element, so the list opens without JavaScript; with JavaScript, choosing a link or pressing Escape closes it and returns focus. The open panel holds the filter and the grouped list, scrolls on its own, and is at most the window height. The theme toggle moves into the bar.

**Chapter head:** an eyebrow with the number and the question (as in the mockup), the H2 title, the lead, then the bullets. Under each bullet its first evidence entry as `path:lines` in small mono; the full list stays in the chapter's collapsed "Files and locations (n)" box.

**Header:** H1 `meta.title`, `meta.intro`, the how-to-read paragraph, roots, model date and chapter count, an "Open all evidence boxes" button, and the legend.

**Legend by look,** one item per look the model uses plus the moving step: "Part of <name>", "Data or files", "Phone or browser", "Outside <name>", "Security or identity check", "Call that leaves <name>", "Step in flight". Context nodes stay dashed, as today.

**Footer:** that the page is generated, the record (`model/fragments/`), the two rebuild commands, and that it runs offline.

### The page: chapter content

| Group | Chapter | Content beyond lead and bullets |
|---|---|---|
| Start here | 01 What it is | "Not owned here" list (`notOwned`), each with its evidence |
| Start here | 02 The parts and how they fit | The level-0 card; the React Flow map explorer (today's chapter 00, unchanged in behaviour); the component catalogue tables (today's Components chapter) |
| Start here | 03 One request, end to end | The main request's lifeline card; the lead and bullets tell it as a story in order |
| Start here | 04 Where data lives and where to start in the code | A stores overview (one row per store kind with its row count and the chapters that show it, then `meta.conventions` as the key notation note); the code map table grouped by root: folder, what it owns, start reading at (`path:lines symbol` of the first file entry) |
| How it works | 05 onward | The system's chapters: cards for their diagrams, sequences and store flows, store flow tables, store tables, catalogue tables, Files and locations, as today |
| Reference | Glossary | One row per term: term with its anchor, tag chip, meaning, evidence line; "The words this site uses, in the meaning the code gives them. <n> terms." |
| Reference | Rules in force | As today |
| Reference | Coverage | As today, plus today's Open questions as a "Not known yet" list when there are any |
| Reference | Corrections | As today |

**Term links.** In leads, bullets, not-owned items and captions, the first occurrence in each chapter of each term or alias links to its glossary row (`<a class="term" href="#term-<id>">`, underlined dotted, the meaning as `title`). Matching is case-insensitive on whole words, longest term first, on already-escaped text and never inside a tag or code span. Every repository string is still HTML-escaped before it enters the page, and inline JSON still writes `<` as `<`.

### Cards

Every inline figure (level diagram, lifeline sequence, store flow) is one card, written by the page renderer:

```html
<figure class="card" id="fig-<key>">
  <h3>Sequence: create a prompt</h3>
  <p class="cap">What happens between the app's POST and the 202 it gets back. Step 4 is the only call that leaves the service.</p>
  <div class="fig" role="region" tabindex="0" aria-label="create a prompt, scrolls sideways">  <!-- the SVG goes here -->
  </div>
  <div class="ctl" data-fx-flow="<key>">  <!-- the bar goes here; holds the archify link without JavaScript -->
    <a class="deep" href="diagrams/seq-<id>.html">Open in archify</a>
  </div>
</figure>
```

The title, caption and link render without JavaScript; a `<noscript>` line in `.fig` says the figure needs JavaScript and the link opens the full diagram. The link reads "Open in archify" when the deep diagram was rendered by archify and "Open full diagram" when it fell back to SVG.

**Control bar,** inside the card under a top rule, `position: sticky; bottom: 0` with the panel background, so it stays on screen while any part of a tall card is: Play or Pause (one button that toggles: it reads Pause while the figure is playing; filled accent, at least 84 px wide), Back and Next (icon buttons with `aria-label`s), Reset (returns the figure to rest before step 1 and stops playback), the narration, the count `4 / 7` and the deep link at the end. All targets at least 36 px. The narration is one sentence, `aria-live="polite"`: "Step 4: <from> to <to>: <message label>." followed by the first evidence as a code chip, built from text nodes, never from HTML. Before the first step it reads "Press Play, or step with Next." Reset is kept (owner, 2026-10-29). Back from step 1 also returns to the figure at rest, and Play at the end restarts.

**Autoplay:** play starts the first time any part of the `.fig` box enters the middle band of the window (`rootMargin: -40% 0px -40% 0px`, threshold 0), whatever the figure's height. It pauses when no part of the card is visible and resumes on return if the reader had not paused it. Under reduced motion nothing plays on its own and the token does not move.

**Scale:** an SVG is drawn at 1:1, never shrunk, so no label renders under 12 px. When the card is narrower than the figure, `.fig` scrolls sideways inside the card; the bar is outside the scroller and never scrolls away. At each step the player scrolls `.fig` sideways (not the page) so the active arrow is in view, instantly under reduced motion.

**Box figures** gain from the original: a second line per node (`role` when 26 characters or less, else `kind`) at 12 px, colour and shape by `look` (store with a cap line, client tinted info, external dashed muted, security violet), node text 13.5 px, edge labels 12 px.

### Lifeline sequences

Layout is a deterministic grid computed at build time (no ELK), written as a `FigureSpec` of kind `sequence` with `lanes` and `rows` in place of nodes and edges:

| Measure | Value |
|---|---|
| Column width `c` | `clamp(floor(832 / n), 104, 180)` for `n` participants |
| Figure width | `n × c + 28` (14 px margin each side) |
| Participant box | `c - 12` wide, 44 px tall, label 13 px on at most 2 lines, cut with an ellipsis and the full label as `<title>` |
| Row | 40 px per message, 56 px for a self-call (a loop 28 px to the right of the lifeline); first row at y 72 |
| Arrow label | `<n>` in bold then `short` (else the label cut at 26 characters on clause or word boundaries), 12 px, above the arrow from the calling lifeline with a panel halo; may run past the arrow's end, never past the figure's edge |
| Styles | Call: solid line, filled head. Async: solid line, open head. Reply (`reply: true`): dashed. Leaving call (the target participant's look is `external`): `--warn` stroke 2.4 px and the legend item. External participants tinted. Active step: accent, 2.8 px, label bold |

**The 860 rule.** With up to 8 participants, `c` is at least 104 and the figure is at most `8 × 104 + 28 = 860` px, inside the 870 px card at 1:1. With 9 to 12 participants the figure is 964 to 1276 px and scrolls sideways inside the card at 1440 as well; the check caps a sequence at 12 participants. The existing models fit the no-scroll case: 4 to 7 participants in both proof models, at most 9 in the owner's (`research/facts.md`). The layout report line for a sequence gives width, participants, messages and `scrolls at 860: yes|no`; crossings do not apply.

**The 390 rule.** The card's content is about 332 px wide at 390 (16 px page padding, 12 px card padding, 1 px border). A 6-participant sequence (`c` = 138, 856 px) shows about two and a half lifelines at a time and scrolls sideways inside the card; text stays at 12 px and up. The page itself never scrolls sideways. The bar wraps to two rows (buttons, count and link; then the narration at full width) and stays under the scroller.

The SVG fallback deep page draws sequences from the same lifeline geometry, one page per 8 messages as today. archify sequence pages are unchanged and stay separate linked pages, never embedded (ADR 0066 decision 3).

### Kit files

The player changes bytes, so under the renaming rule it becomes `fx-flow-2.js` (built from `src/references/visual/fx-flow-2.ts`), with its row and checksum in `visual-assets.md`; `fx-flow-1.js` and its source are removed, since no released page loads it. This matters even before merge: the copy rule never overwrites an existing `assets/fx-flow-1.js`, so a regenerated proof site would keep the old player. `fx-map-2.js` and `fx-tokens-1.css` are unchanged.

### Markdown

Each chapter doc gains its lead as the paragraph after the question, the bullets as today, a "Not owned here" list in `what`, the code map table and stores overview in `code`, and each figure's `summary` as a one-line caption before its Mermaid block or figure link. The four Start here docs go in a `start-here/` folder with its `index.md`; `glossary.md` joins `components.md`, `stores.md`, `rules-in-force.md` and `coverage.md` in the Markdown root, one row per term with its evidence line. Escaping, evidence lines and the generated marker are unchanged.

### Build result and report

`BuildResult` gains `prose`: per chapter `id`, `words` (lead plus bullets plus not-owned), `leadSentences`, `bullets`; the average words per chapter; `glossary` size; `lifelines` (sequences drawn inline as lifelines). The report prints them as a "Prose" block beside Depth. These are the numbers the proof compares.

### What it replaces

- **`sf-page` on the shared kit template:** replaced by the site template. `references/visual/page-template.html` returns to its master content (the `NAV` and `DIAGRAMS` slots and the figure and table CSS this branch added are reverted, since the site was their only user), and the gate assertions on those additions move to the site template.
- **Chapter 00 "Explore the system":** the explorer moves into chapter 02.
- **The fixed Components chapter:** its tables move into chapter 02; How it works chapters keep their `catalogueRefs` tables.
- **The fixed Open questions chapter:** a list inside Coverage.
- **The "Deep diagrams:" comma lists** in the nav and per chapter: replaced by the link in each card.
- **`sequenceInput` (ELK boxes with folded arrows):** replaced by the lifeline layout, inline and in the SVG fallback.
- **`fx-flow-1.js`:** replaced by `fx-flow-2.js`; Reset kept; observer at 0.6 replaced by the middle-band rule with pause.
- **The legend by raw kind:** replaced by the legend by look.
- Kept: evidence verified on path, range and symbol; the model as the record; generated Markdown; the React Flow map; archify optional and never embedded; multi-root; theme detection; the visual check; every hardening from the final review (escaping, symlink-safe writes, all-or-nothing fragment writes, disarmed table-cell links, the archify lookup that never runs a repo path).

### The ADR

**Amend ADR 0066**, not a new ADR. 0066 is new on this branch and unmerged, and the decisions here refine the same site; a second ADR would split one decision set across two records before either ships. Through fx-adr:

- Add a decision: the site page is built from its own site template, generalised from the owner's hand-built page; the shared kit page template keeps serving fx-docs, fx-audit and fx-architecture (ADR 0061 decision 1) and is not changed by this lane.
- Add a decision: every site opens with four Start here chapters (what it is and does not own, the parts, one request end to end, where data lives and the code map) and ends with Reference (glossary, rules in force, coverage, corrections); the model carries the prose (leads, bullets, glossary, code map) at schema version 2, and `check` enforces the prose floor.
- Extend decision 3 by one sentence: sequences are drawn inline as lifelines inside chapter cards; archify sequences stay linked pages, never embedded.
- Renumber "Still in force" after the added decisions; 0062's supersede line is unchanged.

## Error handling

| Failure | What happens |
|---|---|
| A version-1 fragment | `check` and `build` exit 1 with `schemaVersion 1: run system-flow migrate` per file; the lane's rerun path runs `migrate`. |
| `migrate` cannot produce a valid version-2 fragment (a fragment that fails the version-2 schema after the transform) | Nothing is written; exit 1 with the problems per file. |
| A prose rule fails | Exit 1 naming the chapter, the rule and the fragment holding the field. The controller sends it to the chapter's writer, at most 2 rounds, as for evidence. Still failing: the controller reports the chapter to the owner with its numbers and stops for a decision: merge the chapter into a neighbour, or drop it. There is no flag that waives the floor. |
| The glossary is under 15 terms after the candidates | The controller asks each area for more candidates, one round; still short, it reports to the owner and stops, as above. |
| A section declared only outside `chapters.json`, or one scalar set by two fragments | Exit 1 naming both files; the controller fixes `chapters.json` or the writer assignment. |
| A sequence over 12 participants | Exit 1; the area splits it into two sequences. |
| A figure wider than the card | Not a failure: it scrolls inside the card at 1:1. A box figure over 860 px still fails layout as today. |
| No JavaScript | Chapters, prose, tables and evidence read; the phone menu opens through `<details>`; each card shows title, caption and the deep link. |
| No browser | `Visual check: not run: no browser`, naming every page, as today. |

Every other row of the first design's error table stands.

## Testing Decisions

**Seams, highest first. Please confirm them.** The same three seams as the first iteration; no new one.

1. **The `system-flow` CLI run as a process** (`check`, `build`, `migrate` on fixture repos from `scripts/make-git-fixture`). Most tests live here:
   - `migrate`: a version-1 fragment set becomes version 2 with `look` from the table and `meta.name` from the title; a second run changes no byte; a fragment that would still be invalid leaves every file untouched; `owed` lists exactly the missing prose; `check` on version 1 prints the migrate hint.
   - Section merge: a lead and bullets from an area fragment reach the merged section; a lead set in two fragments, and a section absent from `chapters.json`, each fail naming both files.
   - Each prose rule passes at its bound and fails one past it (sentences, bullets, words, not-owned, caption sentence and words, glossary size and duplicates, participants, the four roles and their order, the `parts`, `request` and `code` rules); `--fragment` skips the whole-model rules and keeps the shape rules.
   - Glossary and code map entries are items: a bad range fails evidence; `stale` and `query` list them.
   - The page: the menu has the three groups in order with numbered Start here and How it works items; every figure is a `figure.card` with title, caption, `.fig` region and `.ctl` holding the deep link with the right label; the figure JSON for a sequence has lanes and rows with `c` and width as the table says for 4, 8, 9 and 12 participants and a leaving call marked; the first term occurrence per chapter is linked and the second is not; a `<script>` term or lead is escaped; the filter index holds chapters, parts and terms; no Shamel string appears.
   - Markdown: leads, not-owned, code map, captions and `glossary.md`, parsed back by docs-index's parser.
   - `BuildResult.prose` numbers on a fixture with known counts.
   - The SVG fallback page for a sequence draws lifelines.
2. **Gate tests on text:** the site template holds every slot, no outside URL, the 240 px sticky menu rule, the card and sticky bar rules, logical properties; `page-template.html` equals master; `visual-assets.md` checksums with `fx-flow-2.js` and no `fx-flow-1.js`; the sidecars state the prose floor, the Start here roles and the glossary and code map duties; SKILL.md under 20,000 bytes; `migrate` named in SKILL.md; `validateFigure` accepts a lifeline spec and rejects a step naming a missing row (run in node with no DOM, as today).
3. **The proof's Playwright check** for browser behaviour (autoplay and pause, sticky bar position, filter, scroll spy, mobile menu, sideways scroll, label sizes), as the first iteration checked kit scripts in its proof runs.

A good test asserts what a CLI user or a page reader sees: exit codes, stdout JSON, files written, page markup and figure JSON. Never an internal function.

Prior art: `src/scripts/system-flow-check.test.ts`, `system-flow-page.test.ts`, `system-flow-layout.test.ts`, `system-flow-diagrams.test.ts`, `src/tests/gates/visual-kit.test.ts`, `src/tests/gates/skill-size.test.ts`, `src/tests/gates/user-invoked.test.ts`.

### Proof

Scratch copies only, under the session scratchpad through `scripts/scratch-env`; never the real repos, never under `/home/faisal` or `/mnt`. Proof scripts and results live in `docs/plans/2026-10-29-system-flow-site/proof/` and `results.md`.

1. **Migration.** Copy the first iteration's Shamel.Backend fragments into the scratchpad as a git repo, run `migrate`, then `check`: the hint disappears, `owed` matches the problems `check` lists, and no label or evidence changed (diff of the fragments shows only `schemaVersion`, `look` and `meta.name`).
2. **Rerun the lane** in full on fresh scratch copies: (a) Shamel.Backend, made a git repo with one commit; (b) the four Advantage repos, host `advantage-backend` plus `advantage-guide`, the Android SDK and the store app. Both builds exit 0 with every evidence entry verified.
3. **Compare with the owner's page.** One Playwright script (Chromium, reduced motion off and on, light and dark, 1440 and 390) measures the owner's `index.html` and both new sites the same way, and writes one table:

| Measure | Pass line for both new sites |
|---|---|
| Reading prose per chapter (question, lead, bullets) | average at least 120 words; the owner's page measured beside it |
| Chapters with a lead and 4 to 8 bullets | every chapter |
| Glossary size | 15 to 40 |
| Sequences drawn inline as lifelines | every model sequence |
| Side menu | sticky at 1440, 230 to 250 px wide, three groups, current chapter marked after scrolling to three chapters; sticky top bar at 390 that opens and closes |
| Filter | typing a known term narrows to the matching chapter, part and term; clearing restores the menu |
| Cards | every figure inside a card whose box contains its bar; the bar stays in the viewport while the card is |
| Autoplay | every figure reaches step 1 within 3 s of its box reaching the middle of the window, at both widths; it pauses when scrolled away |
| Labels | no figure text under 12 px computed size at either width |
| Page width | no page-level horizontal scroll at 390 |
| Console | 0 errors on every page and width |

   Plus the full visual check of `visual-check.md` on `index.html` and every deep diagram, archify outputs included.
4. **Record** the estimate against actual tokens and wall-clock, as the first proof did, and the screenshots the owner reviews. The owner reviews the result; the table is evidence for that review, not a substitute for it.

## Global Constraints

- No em or en dashes in any file, label, commit message or chat output.
- Labels and prose in English; Arabic only for real product strings and sample replies, wrapped as `<span lang="ar" dir="rtl">` on pages.
- Pages default to `lang="en" dir="ltr"` and use logical properties.
- Pages load only files under the site's `assets/`; no CDN, no network request.
- fx gains no runtime dependency; elkjs is loaded from `references/vendor/`.
- Edit `src/**/*.ts`, then run `scripts/build`; never hand-edit generated JavaScript.
- Every `skills/*/SKILL.md` stays under 20,000 bytes; references one level deep.
- A kit file's byte change renames it (`fx-flow-2.js`).
- Every string from a repository is HTML-escaped before it enters a page; inline JSON writes `<` as `\u003c`.
- `references/visual/page-template.html` is identical to master at merge.
- `schemaVersion` is 2; a version-1 fragment is migrated by `system-flow migrate`, never by hand.
- Side menu column 240 px; collapse to the top bar below 900 px.
- Figures are drawn at 1:1 and never shrunk; no figure text under 12 px; a figure wider than its card scrolls inside the card; no page-level horizontal scroll at 390 px.
- A box figure is at most 860 px wide with at most 1 crossing; a lifeline sequence has at most 12 participants and fits 860 px up to 8.
- Chapter prose: lead 2 to 4 sentences, 4 to 8 bullets of at most 40 words, at least 100 words (120 to 200 expected); figure caption one sentence of 6 to 30 words; glossary 15 to 40 terms.
- Tests run with TMPDIR in the session scratchpad through `scripts/scratch-env`; nothing written or deleted under the owner's home or `/mnt`.
- Never type rm, trap, bash -c or sh -c; python3 runs with `-I` only.
- Each task commits its own paths on the `system-flow` branch (per-task commits, owner-approved); never push, merge or open a PR. No attribution trailers.

## Out of Scope

- A "who uses it" chapter or any audience field.
- A second audit page; Reference stays on the one page.
- Full-text search over bullets and evidence; the filter covers chapters, parts and terms.
- Rendering SVG on the server for the inline figures; figures stay drawn by the player.
- Changing archify's own pages, or embedding archify output.
- Changing fx-docs, fx-audit or fx-architecture pages, or the shared kit page template.
- A hand-placed level 0 beyond the existing layout hints.
- Translating the site into Arabic.
- A flag that waives the prose floor.

Anti-goals: a chapter that passes the floor with padding (bullets that restate the lead or the diagram, or carry no evidence); a page whose figures shrink until they cannot be read; a site that only a reader of the code already understands.

## Open Questions

- [x] Reader and goal → a new engineer, onboarding and fast retrieval (owner decision 1).
- [x] Page structure → the owner's page, generalised; shared template untouched (decision 2); its branch additions reverted so it equals master.
- [x] Opening chapters → the four Start here roles, then How it works, then Reference (decision 3); Components moves into chapter 02, Open questions into Coverage.
- [x] Prose depth and its enforcement → lead, 4 to 8 bullets, 120 to 200 words, captions; schema fields, briefs, check rules, renderer (decision 4).
- [x] Who writes the prose → the agent that read the code: areas for their chapters and the main request, the controller for `what`, `parts`, `code` and the glossary; sections merge across fragments.
- [x] Navigation and filter → decision 5, as specified above.
- [x] Glossary → decision 6; a controller fragment fed by area candidates.
- [x] Cards and controls → decision 7; Reset kept and Play toggles to Pause (owner, 2026-10-29).
- [x] Lifelines → decision 8; 1:1 with sideways scroll inside the card, cap of 12 participants.
- [x] What stays → decision 9.
- [x] Proof → decision 10, the table above.
- [x] Schema bump → version 2 with `migrate`, because `look` is now required and the migration derives it.
- [x] ADR → amend 0066.

None open.

## Further Notes

- Sizes for reference: the owner's page averages 122 words of question plus bullets per chapter over 19 chapters and 101 bullets; the first iteration averaged 11 with 0 bullets. Message labels in the existing models run 38 to 59 characters at the median, which is why the arrow carries `short` and the narration carries the label.
- The prose adds work to each area agent and a controller pass after the areas. The estimate's constants are recalibrated from proof run (a), as in the first iteration.
