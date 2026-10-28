# Planning pass

The controller runs this once per run, after `detect`, before any subagent.
Its output is the plan file, two fragments and one message to the owner.

## Read

For every root `detect` printed, semble first: the top-level layout, the
manifests (`package.json`, `Gemfile`, `*.csproj`, `build.gradle` and the like),
the entry points (routes, controllers, workers, schedulers, main files), the
existing docs and ADR folders. Count each candidate area's source files with
`git ls-files` in its root.

## Split into areas

An area is one unit a reader would name: an engine, a service, an app, an SDK.
Give each an id matching `^[a-z0-9][a-z0-9-]*$`; it becomes the fragment file
name (`<site>/model/fragments/<area id>.json`) and the prefix of every node id
in it, and `build` matches the plan's area to its fragment by that name.

An area over 400 files is split into sub-areas of at most 400, each with its
own id and its own subagent. `system-flow estimate` warns on any area left
over 400.

## Levels per area

Propose a `levels` count per area, 1 to 3:

- 1: the area's level-1 diagram only. A thin area, a client, a config repo.
- 2: level 1 plus a level-2 diagram for each node that holds more than one
  moving part.
- 3: level 2 plus level-3 diagrams for each level-2 node that stands for a
  real mechanism (a pipeline, a state machine, a retry loop, a scheduler).

Count the diagrams this implies per area. Name the sequence candidates (a
request or job that crosses three or more participants) and the store flow
candidates (a trigger that reads and writes more than one store).

## Chapters and their writers

The plan always carries the four Start here chapters first, then the system's
own chapters. The Start here ids and roles are fixed:

| Id | Role | Folder | Says |
|---|---|---|---|
| `start-what` | `what` | `start-here` | what the system is, and what it does not own |
| `start-parts` | `parts` | `start-here` | the parts and how they fit (the level-0 diagram) |
| `start-request` | `request` | `start-here` | the main request end to end, with its one sequence |
| `start-code` | `code` | `start-here` | where data lives, and which folder owns what |

Name **one writer per chapter**, never two:

- `start-what`, `start-parts`, `start-code`: the controller, after every area
  returns.
- `start-request` and each system chapter: the one area the plan names as its
  writer. The area writes the chapter's lead and bullets as a section in its
  own fragment, and the sections merge.

Name **the main request** in the planning message: the sequence candidate that
crosses the most level-0 parts, with the area that owns it. The owner can swap
it. That area writes `start-request`.

## Writing rules

For every lead and bullet, the controller's and each area's: written for an
engineer who knows backends and not this code; the lead says what the part does
and why it matters to someone changing it; one fact per bullet, from code the
writer read, with the narrowest evidence; glossary terms in the code's meaning;
plain words; no "who uses it". `area-brief.md` holds the full floors (lead 2 to
4 sentences, 4 to 8 bullets of at most 40 words, at least 100 words per chapter
and 120 to 200 words expected).

The agent that writes chapter prose, leads, bullets, captions, glossary
definitions and code-map lines invokes `fx-humanize` on it before returning.
The controller does the same for the Start here prose and the glossary it
writes.

## The plan file

Write `<site>/model/plan.json`. `build` reads it for the depth block, so it
stays beside the fragments:

```json
{
  "chapters": 13,
  "areas": [
    { "id": "engine", "root": "host", "files": 320, "filesToRead": 140,
      "levels": 3, "diagrams": 7, "sequences": 2, "storeFlows": 1 }
  ]
}
```

- `files`: the area's source file count.
- `filesToRead`: the files its subagent should open, entry points and the code
  the chapters' questions need first.
- `levels`, `diagrams`, `sequences`, `storeFlows`: the proposed depth.
- `root`: a root id from `detect`.
- `chapters`: the total chapter count, the four Start here chapters included.

Run `system-flow estimate <site>/model/plan.json`. It prints tokens and
minutes per area and in total, its `note` on the constants, and `warnings`.

## Fragments written now

- `meta.json`: top-level `"schemaVersion": 2` (check rejects the fragment
  without it, and a version 1 fragment with the hint to run `system-flow
  migrate`), then `meta.title`, `meta.date`, `meta.purpose`, `"name"` (the
  system's short name, for the page header) and a first `"intro"` of 2 to 5
  sentences (the controller rewrites it after the areas return), then `meta.roots` copied from `detect`'s `roots` ids in the same order, host
  first, each with its `remote` when `detect` printed one. Evidence in another
  root names that id.
- `inventory.json`: every engine, flow, store, job and integration found in
  the code, each with evidence (a folder entry ending in `/` is allowed here).
  `build` marks each entry covered or not covered.

Check each with `system-flow check --fragment <file>` until it exits 0.

## Shared ids

Written after the owner approves, before any area is dispatched, so every
area's `check --fragment` finds the ids it names. Check each file with
`system-flow check --fragment <file>` until it exits 0.

- `chapters.json`: one section per approved chapter, the four Start here
  sections first (ids `start-what`, `start-parts`, `start-request`,
  `start-code`; `role` `what`, `parts`, `request`, `code`; `folder`
  `start-here`), then the system's chapters: `id`, `title`, its reader's
  `question`, and `covers` naming inventory ids where the plan named them. The
  controller's own sections (`start-what`, `start-parts`, `start-code`) get
  their lead and bullets later, in this file. No `diagrams`, `sequences` or `storeFlows` yet: those ids do not exist
  until the areas write them. Areas name a section id in each sequence's and
  store flow's `chapter`.
- `level0.json`: the level-0 diagram, id `level0`, `level: 0`, with
  `levels.root` set to `level0`. One node per area, id `l0-<area id>`, each
  with at least one edge (to another area, or to a context node such as the
  users) and no `children` yet. The `l0-` prefix is the one id form that does
  not start with the area's own id (`fragment-guide.md`, Ids), and an edge
  links nodes of its own diagram, so every level-0 edge ends on a level-0 node.
  Nodes and edges carry evidence from the planning reads, or `unconfirmed` with a question. Each area writes its level-1
  diagram as `<area id>-l1` with `parent: "level0"`; the lane sets the
  level-0 node's `children` to it when the area returns.

Each area's slice carries its section ids, `level0` and `<area id>-l1`.

## The planning message

One message, then stop. The shared ids above are written only after the
owner approves.

1. What `detect` found: docs config, theme source, archify folder or "none:
   every deep diagram is SVG", the site and Markdown folders, the roots.
2. A table of areas: id, root, files, filesToRead, levels, diagrams,
   sequences, store flows.
3. The chapters, the four Start here chapters first, each with its reader's
   question in one sentence and its one writer. Name the main request and the
   area that owns it.
4. The inventory counts by kind.
5. The estimate: total tokens and minutes, the note, every warning.
6. **MkDocs only** (`detect`'s `mkdocs` is not null), asked once: "Add the
   site to `nav` and keep the model out of the build?" followed by the
   `mkdocs.nav` lines and the `mkdocs.excludeDocs` lines exactly as `detect`
   printed them. On a yes, add both `nav` entries and the `exclude_docs`
   lines to `mkdocs.yml`. On a no, leave `mkdocs.yml` alone.
7. The choice: approve, or trim areas, levels or chapters.

A trim edits `plan.json` and reruns `estimate`; show the new totals and wait
again.
