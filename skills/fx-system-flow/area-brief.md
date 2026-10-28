# Area brief

The controller pastes this file, the fragment guide and your slice of the plan
into your prompt. You investigate one area of a system and write one fragment.

## You own

- One file: the fragment path in your prompt,
  `<site>/model/fragments/<area id>.json`. Write no other file. Read other
  fragments only to reuse an id.
- Your slice: the area id, its root, `filesToRead`, the planned `levels`,
  `diagrams`, `sequences` and `storeFlows`, the chapters with their section ids
  and reader's questions, the sequence and store flow candidates, the level-0
  diagram id `level0` and your level-1 diagram id `<area id>-l1`.

## Ids you are given

- Your level-1 diagram is `<area id>-l1`, with `"parent": "level0"`. Use that
  id exactly; the controller links the level-0 node to it.
- Each sequence's and store flow's `chapter` is one of the section ids in your
  slice. Never invent a section id.
- Your other ids start with `<area id>-`, as the fragment guide says.

You never invoke `/fx:fx-system-flow`, never commit, never edit code in any
root.

## How to investigate

1. **semble first.** Search with semble for each chapter question and each
   candidate before opening files; read the file and line it returns. Fall
   back to grep only for every occurrence of a literal.
2. Read the area's entry points and the files `filesToRead` counts for.
3. Write each fact once, from code you read, with the evidence that proves it.

## Prose

You write the prose for what you own, from code you read.

- **Chapters you write:** your slice names the chapters you write (its
  `start-request` when you own the main request). Write each as a section in
  your own fragment with its `id`, `lead` and `bullets`; the controller's
  `chapters.json` already declares the section, and the two merge.
- **Lead:** 2 to 4 sentences. Say what the part does and why it matters to
  someone changing it.
- **Bullets:** 4 to 8 bullets of at most 40 words, one fact each, each with the
  narrowest evidence.
- **Chapter floor:** at least 100 words of lead and bullets together, and 120
  to 200 words expected. A chapter under 100 words fails `check`; one under 120
  passes with a warning and goes back to its writer once.
- **Figures:** every diagram, sequence and store flow carries `summary`, one
  sentence of 6 to 30 words that says what to notice. Every node and
  participant carries `look`; every message carries `label` (one plain
  sentence, it becomes the narration) and `short` (the code-ish name on the
  arrow), and `reply` set to `true` on a reply.
- **Code map:** one `codeMap` entry for each folder of your area that a
  newcomer opens first: `root`, `path` (a folder ending in `/`), `owns` (one
  sentence) and evidence (the folder, then the file to start reading).
- **Words:** write for an engineer who knows backends and not this code. Use
  glossary terms in the code's meaning. Plain words, no "who uses it".
- **`fx-humanize`:** invoke it on the chapter prose, leads, bullets, captions,
  glossary candidates and code-map lines before returning. It changes wording
  only; evidence and facts stay.

## Evidence rules

- Every evidenced item carries at least one evidence entry, or
  `"unconfirmed": true` and a question.
- A file entry is `{ "root", "path", "lines", "symbol" }`: `path` relative to
  the root, `lines` such as `"40-62"` inside the file, `symbol` a name that
  appears in those lines. Omit `root` for the host.
- Cite the narrowest range that holds the fact. A guess is a question, not
  evidence.

## Depth rules

- Your level-1 diagram has a node for each part of the area. Drill every
  level-1 node that stands for a real mechanism (a pipeline, a state machine,
  a retry loop, a scheduler, a protocol) down to level 3: a level-2 diagram
  for the node, and a level-3 diagram for each level-2 node that is itself a
  mechanism. A plain config holder or a thin wrapper stays a leaf.
- Give each diagram 8 to 12 primary nodes. Fewer means the level is too thin
  to be worth a page; more means a group belongs one level down.
- Draw the neighbours that live outside the diagram (another area's service,
  a store, an external API) as context nodes with `primary: false`, so each
  page shows where its parts connect.
- Meet the area's planned `levels` and `diagrams`. When the code does not hold
  enough to meet them, build what it holds and say why in your return.
- Keep each sequence to one request or job. `build` pages a deep sequence at
  8 messages or fewer per page.

## Check

Run `<cli> --root <host root> check --fragment <your file>` until it exits 0.
It prints problems as `<file>:<pointer>: <message>`. Fix each problem in your
file from the code. A problem naming another file is not yours: list it in
your return and leave that file alone.

`check --fragment` also lays out your figures. A problem
`figure <key> cannot meet 1 crossing and 860 px` means that diagram is too
wide or too tangled for the page: split it one level down before you return.
Move a group of its nodes into a new child diagram, give the node that stands
for the group `children` naming it, and check again. The split keeps every
arrow labelled on automatic layout, so leave `layout` unset. Splits sit outside
the fix-round count.

At most 2 fix rounds after your first full write. An item still failing after
round 2: set `"unconfirmed": true`, remove its evidence, add a question for it,
and list it in your return.

## Return

In this order, nothing else:

1. `Fragment: <path>` and `check --fragment: exit 0` (or the last stderr lines).
2. `Depth: levels <n>/<planned>, diagrams <n>/<planned>, sequences <n>/<planned>, store flows <n>/<planned>`, then one line per shortfall saying why.
3. `Prose: <chapter ids written>`, the section ids you wrote a lead and bullets for.
4. `Glossary candidates`: 3 to 8 terms the code gives a particular meaning, one
   JSON line each: `{"term","tag","meaning","evidence"}`. `tag` is one of
   `model`, `service`, `job`, `store`, `message`, `external`, `concept`;
   `evidence` is the entry list of the fragment guide. The controller writes
   `glossary.json` from them.
5. Open questions, each as `<question id>: <text> | recommended: <answer> | items: <handle>, ...`. Every question has a recommended answer and the handles of the items it settles.
6. Items left `unconfirmed`, by handle.
