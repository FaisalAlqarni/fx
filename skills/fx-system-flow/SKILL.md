---
name: fx-system-flow
description: >
  Investigate a whole system across its repositories and build an evidenced system flow site
argument-hint: "[--repo <path>]... [--rebuild] [cheap|fast|detailed]"
disable-model-invocation: true
---

# /fx:fx-system-flow

```
/fx:fx-system-flow [--repo <path>]... [--rebuild] [cheap|fast|detailed]
```

- **`--repo <path>`**: an extra evidence root, given once per repository. The
  repository the owner runs this in is the host root.
- **`--rebuild`**: allow a full rebuild of a site that already has a model.
- **`cheap`, `fast` or `detailed`**: the archify preference, passed to every
  build as `--prefer <value>`. `cheap` renders every deep diagram as SVG.

The site page draws its own figures (inline SVG, animated step players, the
React Flow map). archify diagrams are separate pages the site links to, never
embedded, so a site is complete without archify.

**This skill's own files.** Every path below that starts `../../` resolves from
the base directory this skill is given when it is invoked, never from the
user's repository. The CLI is `node <fx>/scripts/system-flow`, where `<fx>` is
the folder `../../` names; written below as `system-flow`. Run it from the host
root. It prints JSON on stdout and problems on stderr as
`<file>:<pointer>: <message>`, and exits 0 on success, 1 on a failed check, 2 on
a usage error.

Sidecars, each read at the step that names it:

| File | Read at |
|---|---|
| `../../skills/fx-system-flow/planning.md` ([planning.md](planning.md)) | Step 2 |
| `../../skills/fx-system-flow/area-brief.md` ([area-brief.md](area-brief.md)) | Step 3, pasted into each area subagent's prompt (it holds the prose floors) |
| `../../skills/fx-system-flow/fragment-guide.md` ([fragment-guide.md](fragment-guide.md)) | Step 3, for every fragment, by the controller and by each subagent |
| `../../skills/fx-system-flow/interview.md` ([interview.md](interview.md)) | Step 5 |
| `../../skills/fx-system-flow/check-and-report.md` ([check-and-report.md](check-and-report.md)) | Step 6 |

The model schema is `../../references/system-flow/system-model.schema.json`.

---

## Boundary

- **It never commits; the owner runs git.** It writes the site, its model and
  the Markdown under the folders `detect` picks, `.fx.json` `system_flow`
  through the CLI, and, on the owner's yes, the MkDocs `nav` and
  `exclude_docs` lines. Nothing else in the repository changes.
- **Evidence roots are read only.** No root's code is edited, built or run.
- **Area subagents never invoke `/fx:fx-system-flow`.** It is user-invoked;
  each subagent gets the area brief and writes one fragment.
- Nothing leaves the machine: no push, no PR, no network fetch.

## Rerun

Before step 1, look for `<site>/model/fragments/` at the site folder
`.fx.json` `system_flow.output.site` names (default `docs/system-flow`).

- **None:** run steps 1 to 6.
- **Present:** run step 1, then `system-flow stale` and read
  `<site>/model/coverage.json`. Offer the owner these choices (add "Bring the
  prose up to date" when `check` prints `schemaVersion 1: run system-flow
  migrate` or a prose problem) and stop until they pick:
  1. **Refresh stale.** For each handle `stale` lists, reread the cited code,
     fix the item in the fragment that owns it, run
     `system-flow check --fragment <file>`, then
     `system-flow verify <handle>...` on the fixed items. A changed fact gets
     a `corrections` entry (fragment guide). Then steps 4 to 6.
  2. **Cover uncovered.** Run step 2 on the entries `coverage.json` lists with
     no chapter, as new areas or chapters only, then steps 3 to 6 for them.
  3. **Bring the prose up to date.** For a site built before the prose floor.
     Run it only on a clean working tree: check `git status --porcelain` and
     stop if it prints anything, so the undo below cannot lose other work. When
     the model is version 1, run `system-flow migrate`; undo it with
     `git restore -- <site>/model/fragments`. Then write the `owed` list it
     prints (or `system-flow check`'s prose problems when the model is already
     version 2): the four Start here sections, leads and bullets, `summary` on
     every figure, `meta.name` and `meta.intro`, the code map and
     `glossary.json`, by the writers the planning sidecar names. Then steps 4
     to 6.
  4. **Full rebuild**, offered only when `--rebuild` was given or the owner asks
     for it. A full rebuild is a new audit. Ask the owner to remove the old
     area fragments (`git rm <site>/model/fragments/<area id>.json`, every
     area) and commit that removal, and wait until they have: HEAD then holds
     no area fragment, so no `corrections` entry is owed for any item. Then
     steps 1 to 6.

## Steps

### 1. Detect

Run `system-flow detect --write`, adding `--repo <path>` for each `--repo` the
owner gave, in their order (`detect --repo a --repo b --write`). Read from its
JSON:

- `output.site` and `output.markdown`: where the site and Markdown go.
- `roots`: the evidence roots, host first, each with its `id`.
- `mkdocs`: the `nav` and `excludeDocs` lines, or null.
- `archify.dir`: the archify folder `detect` found at
  `$CLAUDE_CONFIG_DIR/skills/archify` or `~/.claude/skills/archify`, or null.
  Those two places are where archify comes from; `.fx.json` holds no archify
  path, and a folder a repository file names is never run.
- `docsConfig` and `theme`: for the planning message.

Exit 1 prints the problem (two folders holding hand-written Markdown, a missing
root, two roots with one id): show it to the owner and stop. Nothing is asked
in this step.

**The build command.** Every build in this run is
`system-flow build`, plus `--archify <archify.dir>` when `detect` found one, plus
`--prefer <cheap|fast|detailed>` when the owner gave one. Written below as
**the build**. Run every build as a tracked background command and wait for its
exit before reading its output: an archify build can run past the 10 minute cap
on a foreground command, which kills it partway.

### 2. Plan, then stop

Read `../../skills/fx-system-flow/planning.md` and follow it: it writes the
plan file, `inventory.json` and `meta.json`, runs
`system-flow estimate <plan file>`, and shows the planning message.

**Stop.** No area subagent is dispatched until the owner approves the plan or
trims it. A trim changes the plan file; run `system-flow estimate` again and
show the new totals. In a MkDocs repo, apply the `nav` and `exclude_docs` lines
only when the owner answered yes to that question.

**After approval, before any dispatch,** write `chapters.json` and `level0.json`
as planning.md's Shared ids section says, and run
`system-flow check --fragment <file>` on each until it exits 0. They fix the
ids both sides use: the section ids, the level-0 diagram and node ids, and the
level-1 diagram id `<area id>-l1` each area owns.

### 3. Investigate

Dispatch one subagent per approved area, **at most 4 at a time**; start the
next area when one returns. Each prompt holds, in this order: the full text of
`../../skills/fx-system-flow/area-brief.md`, the full text of
`../../skills/fx-system-flow/fragment-guide.md`, the area's slice of the plan
(its entry in the plan file, its chapters with their section ids and
questions, its sequence and store flow candidates, the level-0 diagram id and
its own level-1 diagram id), the roots from `detect`, the absolute path of the
fragment it owns (`<site>/model/fragments/<area id>.json`) and the absolute
path of the CLI with `--root <host root>`. Rewrite each relative path in the
pasted text to the absolute path it resolves to from the sidecar's own folder,
since a subagent has no skill base directory.

A subagent returns when `system-flow check --fragment <its file>` exits 0, or
after its 2 fix rounds. Collect its open questions, its depth line, its `Prose:` and `Humanized:` lines and its
`Glossary candidates`.

When an area returns, read its `Humanized:` line as check-and-report.md "Humanized prose" says,
then set `children: "<area id>-l1"` on its level-0 node in
`level0.json`, and add the area's diagrams to the `diagrams` of the chapters
that show them in `chapters.json`; check both with `--fragment`.

After the last area returns, the controller writes the Start here prose and
the glossary:

- `what`, `parts` and `code`: lead, bullets and `notOwned` in `chapters.json`,
  from the planning reads and the area fragments. Re-read the evidence a
  fragment cites; never copy it blind.
- `glossary.json`: from the 3 to 8 `Glossary candidates` each area returned,
  duplicates removed, 15 to 40 terms.
- The final `meta.intro` in `meta.json`.
- Invoke `fx-humanize` on this prose before returning to the build, and check
  each file with `system-flow check --fragment <file>`.

While subagents run, the controller writes `rules.json`, the Rules in force,
checked the same way. List every ADR in every root's ADR folder whose status
does not open with Superseded, Deprecated or Ignored. Write one rule per
numbered decision, summarised in one sentence, with `adr` and `decision` (the
number, or the lead phrase of an unnumbered ADR), and the ADR's own evidence
lines when it has them.

### 4. Build the draft

Run the build. Exit 1 lists problems as `<file>:<pointer>: <message>`. Send each
problem to the owner of its file:

- An area fragment: back to that area's subagent with the list, at most 2
  rounds in total for that fragment. An item still failing is marked
  `unconfirmed` with its evidence removed, gets a question, and goes in the
  report.
- A controller fragment: fix it yourself the same way.
- A cited file with uncommitted changes: stop and name the files; the owner
  commits or stashes.
- A rule citing a superseded ADR: rewrite the rule from the ADR that superseded
  it.
- A figure over 1 crossing or 860 px: follow the unfit-figure loop in
  `../../skills/fx-system-flow/check-and-report.md`.

Repeat the build until it exits 0.

### 5. Interview

Read `../../skills/fx-system-flow/interview.md` and follow it. Merge every open
question from the subagents and your own into `questions.json`, then open with
the count and the choice:

```markdown
<n> questions. Answer one at a time, skip, or take the recommended answer for every question.
```

Ask one question at a time, each with its recommended answer. With zero
questions, say so and go to step 6.

### 6. Rebuild, check, report

Run the build again. Then read `../../skills/fx-system-flow/check-and-report.md`
and follow it: the visual check of `index.html` and every diagram page at 1440
and 390 in light and dark, the archify retries, and the report, which carries
the depth block of planned against built per area and the Prose block.

## Every stop

| After | Wait for |
|---|---|
| Rerun detected | The owner's pick: refresh stale, cover uncovered, bring the prose up to date, or full rebuild |
| Full rebuild picked | The owner commits the removal of the old area fragments |
| `detect` exits 1 | The owner fixes `.fx.json` or the roots |
| Step 2 | Approval or a trim of the plan |
| A cited file is uncommitted | The owner commits or stashes |
| A figure fails after 2 rounds | The owner's decision on that figure |
| Each interview question | One answer, a skip, or "take every recommendation" |

## Rules

- Every fact on the site carries evidence a check can test, or is marked
  `unconfirmed` with a question. A plausible guess is a question, never a fact.
- The CLI is the only writer of `system-model.json`, the pages, the Markdown and
  `.fx.json`. The lane and its subagents write fragments and the plan file.
- semble first for finding code, in the controller and in every subagent.
- The code wins over a doc, a comment or an earlier fragment.
- A fragment another area owns is read, never written.
- Never invent a CLI flag. The subcommands are `detect`, `estimate`, `check`,
  `build`, `query`, `stale`, `verify` and `migrate`, as named above and in the sidecars.
- Prose on the site and in the report follows the `fx-humanize` lane: no em or en
  dashes, English labels, Arabic only for real product strings.
