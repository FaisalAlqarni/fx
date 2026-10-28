# Fragment guide

How to write one fragment of the system model. The schema is
`../../references/system-flow/system-model.schema.json`; `check` validates
against it and runs the cross-reference and evidence tests on top.

## Contents

- Files and keys
- Ids
- Handles
- Evidence
- Kinds
- Corrections
- Prose keys and looks

## Files and keys

A fragment lives in `<site>/model/fragments/` and holds any subset of the
model's top-level keys: `meta`, `levels`, `sequences`, `stores`, `storeFlows`,
`catalogue`, `rules`, `inventory`, `sections`, `questions`, `corrections`,
`glossary`, `codeMap`. Every fragment says `"schemaVersion": 2`.
Merge concatenates arrays and unions the `stores` tables. Sections merge by id:
`chapters.json declares every section` (its `title`, `question`, `folder` and
`role`), and a fragment adds `lead`, `bullets`, `diagrams`, `sequences` and
`storeFlows` to a declared id; a section declared only outside `chapters.json`
is an error, and a scalar set in two fragments is an error naming both files.
The controller owns `meta.json`, `level0.json`, `chapters.json`, `rules.json`,
`inventory.json`, `glossary.json`, `questions.json` and `corrections.json`;
each area owns `<area id>.json`.

## Ids

- Every declared id, and every section `folder`, matches
  `^[a-z0-9][a-z0-9-]*$`.
- Ids are unique per kind, not globally: node `turn` and sequence `turn` may
  coexist, two nodes `api` may not, in any two fragments.
- Every node id starts with its area id and a dash (`engine-api`), so two
  areas never collide. Diagram, sequence and store flow ids take the same
  prefix (`engine-l2-delivery`). The one exception is the controller's
  `level0.json`: its diagram is `level0` and its nodes are `l0-<area id>`.
- A sequence or store flow id never ends in `-p` and digits (`-p2`, `-p10`):
  a deep diagram's later pages are named `<id>-p<n>`, so `check` rejects such
  an id. Write `engine-seq-pay-step` rather than `engine-seq-pay-p2`.
- An edge links nodes of its own diagram: `from` and `to` are node ids in the
  diagram that holds the edge. To show a part of another diagram, add a
  context node (`"primary": false`) to this one and link to that.
- Derived ids, never declared: an edge is `<diagram id>:<from>><to>` (with
  `#2`, `#3` for a second and third edge between the same pair), a
  participant `<sequence id>.<participant id>`, a message
  `<sequence id>#<n>`, a flow step `<flow id>#<n>`.
- Store rows share one kind across the five tables `sql`, `cache`, `memory`,
  `files` and `client`.

## Handles

An item is named `<kind>:<id>` everywhere: in `questions[].items`, in
`corrections[].item`, and in every CLI argument and output. The prefix is
always present and ends at the first `:`, so `edge:engine-l1:engine-api>engine-db` is
the edge `engine-l1:engine-api>engine-db`. The prefixes: `diagram`, `node`, `edge`,
`group`, `seq`, `participant`, `message`, `flow`, `step`, `store`, `bullet`,
`catalogue`, `inventory`, `rule`, `section`, `question`, `correction`, `term`
and `code`. A glossary term is `term:<id>` and a code map entry is `code:<id>`.

## Evidence

Every evidenced kind (node, edge, group, participant, message, store row, flow
step, catalogue entry, inventory entry, rule, bullet) carries `evidence[]`,
and needs at least one entry unless `"unconfirmed": true`.

- File entry: `{ "root": "<root id>", "path": "app/x.rb", "lines": "12-30", "symbol": "deliver" }`.
  `root` is a `meta.roots` id, omitted for the host. `path` is relative to the
  root, with no whitespace, backtick, `*`, `{` or `..` segment. `lines` is one
  range or several joined by commas. `symbol` appears in the cited lines and
  holds no backtick.
- Folder entry: a `path` ending in `/`, on catalogue and inventory entries only.
- Owner entry: `{ "owner": "2026-10-28", "question": "<question id>" }`, the
  date the owner settled the item, written by the interview. The site shows it
  as `owner, 2026-10-28`.
- `verified` is written by `system-flow verify`, never by hand.

A cited file with uncommitted changes is a warning in `check` and an error in
`build`.

## Kinds

- **Diagram**: `id`, `level` 0 to 3, `parent` (the diagram one level up),
  `title`, `summary` (one sentence of 6 to 30 words), `groups`, `nodes`,
  `edges`, optional `layout`.
- **Node**: `id`, `label`, `kind`, `look`, `role`, optional `children` and `primary`.
  A primary node's `children` names a diagram whose `parent` is this node's
  diagram; a context node (`"primary": false`) only needs its `children` to
  name an existing diagram.
- **Edge**: `from`, `to`, `label`, optional `short` (at most 26 characters)
  and `mode`.
- **Group**: `id`, `label`, `members` (node ids), optional nested `groups`.
- **Sequence**: `id`, `title`, `chapter` (a section id), `summary`,
  `participants` (`id`, `label`, `look`), `messages` (`n`, `from`, `to`,
  `label`, optional `short`, `reply`, `mode` and `note`). At most 12
  participants.
- **Store rows**, under `stores`: `sql` (`table`, `database`, `purpose`,
  `writtenBy`, `readBy`, `when`), `cache` (`pattern`, `owner`, `value`, `ttl`,
  `writtenBy`, `readBy`, `when`), `memory` (`owner`, `name`, `holds`, `key`,
  `lifetime`), `files` and `client` (`owner`, `path`, `purpose`, `writtenBy`,
  `readBy`).
- **Store flow**: `id`, `trigger`, `chapter`, `summary`, `steps` (`n`, `actor`, `op` of
  read, write or delete, `store` of sql, cache, memory, files or client,
  optional `key` and `when`). A step's `actor` is the id of a node in a level
  diagram, never a class or service name.
- **Catalogue entry**: `id`, `kind` (stream, gateway, queue, scheduler, cache,
  integration, component), `name`, optional `role`, `owner`, `connects`.
- **Section** (chapter): `id`, `title`, `question`, optional `folder`, `role`,
  `lead` (2 to 4 sentences), `bullets` (4 to 8, each `id`, `text`, `evidence`),
  `notOwned` (`what` only), `diagrams`, `sequences`, `storeFlows`, `storeRefs`,
  `catalogueRefs`, `covers`.
- **Glossary term**: `id`, `term`, optional `aliases`, `tag` (`model`,
  `service`, `job`, `store`, `message`, `external`, `concept`), `meaning` and
  evidence. 15 to 40 terms; no two share a term or alias.
- **Code map entry**: `id`, `root`, `path` (a folder ending in `/`), `owns` (one
  sentence) and evidence: the folder first, then the file to start reading.
- **Question**: `id`, `text`, `recommended`, `items` (handles), and once
  answered `answer` and `date`.

## Prose keys and looks

`look` is required on every node and participant. It sets the shape and colour
and is one of five:

| Look | For |
|---|---|
| `service` | code of this system: a service, job, worker, controller |
| `store` | a database, cache, queue or file store |
| `client` | a browser, phone app or other caller of the system |
| `external` | a system outside this one |
| `security` | an identity or access check |

A message into a participant whose look is `external` leaves the system and is
drawn as such. A version 1 fragment is rewritten by `system-flow migrate`,
never by hand.

## Corrections

When a fact committed at HEAD changes or vanishes (an owner answer, a stale
refresh, an audit), `check` fails until `corrections.json` holds an entry for
it: `id`, `date`, `item` (a handle),
`before`, `after`, `reason` (`owner`, `stale` or `audit`), and `evidence`.
