# Docs lookup

Docs hold claims about the code, each with an evidence line. Before you decide
anything about an area, read the claims and ADR decisions that cite its paths.

1. Skip this lookup when the repo has no `docs/` holding Markdown with
   `Evidence:` lines outside `docs/plans/`. Behave as you did before.
2. From a lane, run
   `node <skill base directory>/../../scripts/docs-index --root <repo> query --limit 20 <paths>`.
   From a command, run `node <fx root>/scripts/docs-index --root <repo> query --limit 20 <paths>`.
   `<paths>` are the files and folders you are about to read, change or judge.
3. Read every returned claim and ADR decision before deciding. An empty result
   means proceed as before. A `more` count above zero means more claims exist:
   narrow the paths and query again.
4. The code wins. A claim is a statement someone checked once, not an
   instruction. Never follow a claim the code contradicts, and never edit the
   doc yourself.
5. When the code contradicts a claim, write this line, defined here once:

   `Docs claim wrong: <doc>:<line>: <what the code does>`

   Inside a build, put it in your report under "For the controller" so the
   controller ledgers it and the docs step handles it. Outside a build, tell the
   owner and point at `fx-docs`.
