# Re-review of the final fix wave: fx-audit follow-ups

Base b64ab39, head 78c7174, four commits: 84caae1, 2fa3255, b682b5c, 78c7174.
The stored diff file `.fx/2026-09-12-fx-audit-followups/review/final-fix-wave.diff`
was compared byte for byte against `git diff -U10 b64ab39..78c7174` (after
stripping its short preamble) and is identical, so it was read as the
authoritative diff.

Tests run once each, all green: `bash tests/opencode-install/run.sh`,
`bash tests/gates/check-artifacts-remote.sh`, `python3 scripts/check-paths`,
`bash scripts/check-reference-leaves`, `bash scripts/check-all`. All work
happened in this worktree (read only) plus scratch under
`<job-scratch>/rereview-final/`, removed afterward.
The opencode binary was never run, and the installer was never pointed at
`~/.config/opencode`.

## Finding verdicts

- **C1 (installer deletes a foreign link at `skills`/`references`)**: ADDRESSED.
  `scripts/fx-opencode-install:192` `points_into_fx(entry, source, inside=False)`
  checks a link's recorded target against fx's own path, exact match unless
  `inside=True`. `:207` `check_skills_conflicts` refuses a whole-folder `skills`
  link unless it is exactly `FX_SKILLS`. `:231` `check_link_conflicts` refuses a
  link at `references` or `plugins/fx.js` that is not fx's own, and a real entry
  there. Both run at `:307-309`, in `main()`, before the generation loop and
  before any write, unconditionally (not gated on `--dry-run`). Confirmed with
  `tests/opencode-install/run.sh` case 10 (six setups, real install and dry
  run, 24 checks, all `ok`) and a manual scratch run: an installer-created
  whole-folder `skills` link plus fx's own `references` and `plugins/fx.js`
  links accepted the install with exit 0, and a second install over that
  output was byte-for-byte identical (exit 0, snapshot diff empty). The
  three-path scope the finding named (`skills`, `references`, `plugins/fx.js`)
  and the "before the first write, in both dry run and real install, writing
  nothing" requirement both hold.
  Carried minor (same-named `agents/` file refused like a command file): also
  ADDRESSED. `refuse_if_foreign_generated` (`:135`) now runs for both
  `agents_out` (`:317`) and `commands_out` (`:325`, `:330`) paths, and case 12
  in the test (a foreign `agents/fx-devils-advocate.md`) passes.

- **I1 (both command forms shown wherever a document says what to type)**:
  ADDRESSED. `INSTALL.md:124-125` and `:174` show both forms with runtime
  comments. `README.md:143-145` states the general rule and that the commands
  table shows the Claude Code form; `README.md:154-156` covers the `fx-audit`
  skill case for both runtimes. `SURFACE.md:68` (the user-invoked skill row),
  `SURFACE.md` (a new line ahead of the commands table pointing to the
  opencode form) and the audit-skill line below that table all carry both
  forms. A handful of `/fx:fx-` mentions remain single-form (`README.md:77`,
  `:108`; `SURFACE.md:79`, `:89`, `:141`, `:238-239`): each names a command as
  part of describing behavior or attributing which command writes a file, not
  as an instruction for what to type, so they read as descriptions rather than
  the case I1 asked for. Read in context, that line is reasonable, not a gap.

- **I2 (report-assets path rule versus where Phase 4 drafts its report)**:
  ADDRESSED, with the controller's added requirement honored.
  `references/report-assets.md:67-73`, "The relative path" section, now says
  the path is worked out from the report's final place and that a report
  drafted under `.fx/` and moved afterward carries the three tags as given and
  is opened only after the move. `skills/fx-audit/SKILL.md:296-307`, Phase 3
  step 4 and its Done-when, say the report is written under `.fx/<slug>/draft/`
  "for its final place in the slug directory," name the copy, missing-file and
  mismatch rules by reference only, and add "Only after the move, open the
  report" (`:307`) as a procedural step. Neither file's wording repeats the
  other's: the reference alone states and explains the rule (why the path only
  resolves post-move); the skill only names the rule by pointer and adds the
  ordering its own procedure needs. Read together as an agent would: write the
  report under `.fx/<slug>/draft/` with the `../_assets/` tags already correct
  for the final place, copy the vendored assets to the fixed
  `docs/plans/_assets/` location (independent of where the report currently
  sits), then move both files into the slug directory, and only then open the
  report. That sequence is consistent and does not break.

- **I3 (bare vendor path in the reference)**: ADDRESSED.
  `references/report-assets.md:5-7, 21, 28, 35` all now read
  `../references/vendor/`, the plugin's anchored citation form, with one
  sentence at first use saying it resolves from the file's own directory.
  `scripts/check-paths:25` now scans `references/` as well as `skills/`,
  `agents/` and `commands/`. Ran `python3 scripts/check-paths`: exit 0, "OK: 61
  reference citations, all anchored and resolvable." Confirmed the anchored
  path is a real gate, not just documentation: with `references/vendor/`
  present the check passes; removing it (as the fix report describes and as
  the anchoring logic requires) fails the gate before anything else runs. Ran
  `bash scripts/check-reference-leaves`: exit 0, "OK: no reference links to
  another reference." That script only matches backticked `.md` names, and
  `../references/vendor/...` never ends in `.md`, so widening `check-paths`
  did not turn this citation into a reference-to-reference link.

- **I4 (four remote-load forms slip past `check-artifacts`)**: ADDRESSED.
  `scripts/check-artifacts:43-54` adds an optional-quote `<script src>` and
  `<link href>` match, a side-effect import matched as `import "URL"` with a
  lookbehind that excludes `@import`, a dynamic import matched as
  `import(...)` with the opening quote or backtick right after the paren, and
  a stylesheet import matched as `@import` with or without `url(...)`. Ran
  `bash tests/gates/check-artifacts-remote.sh`: exit 0, all 22
  cases `ok`, including the four new forms, `marked-dynamic-import`,
  `prose-names-a-url`, and the pre-existing `split-script-tag`,
  `vendored-upstream-code` and line-number cases. Independently wrote a
  scratch file with the sentence "The Play CDN script at
  https://cdn.tailwindcss.com is what Tailwind ships" plus, in a fenced code
  block in the same markdown file, `import mermaid from "https://cdn.
  jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";`. Result: the prose
  sentence does not hit; the fenced import does, reported at its own line.
  That is the correct call for this plugin's rule: `skills/`, `agents/`,
  `commands/` and `references/` are all markdown, and the one legitimate
  `<script>` example the plugin ships (`references/report-assets.md`'s own
  template, itself inside a fenced code block) is exactly the same shape as
  the fenced import tested here, just pointed at a local path instead of a
  remote one. A gate that stopped scanning inside fences would stop seeing the
  genuine template too, so scanning fences and flagging only the URL-bearing
  syntax, not bare URLs in prose, is the right split.

- **I5 (the installer test's prompt check proved nothing)**: ADDRESSED.
  `tests/opencode-install/run.sh:16-24` adds `body_carried()`, which requires
  the source's first `# ` heading and its last non-blank line to each appear,
  verbatim, in the generated file, with `fx:fx-` read as `fx-`. `:59-60` runs
  it, plus a `! grep -q "fx:fx-"` check, for every generated command. Ran
  `bash tests/opencode-install/run.sh`: all pass. Reasoned through the
  function rather than repeating the report's scratch mutation: if
  `render_command` emitted an empty body (frontmatter, header and the
  `Arguments` line only), the source's first heading would no longer appear
  anywhere in the generated file, and `grep -qxF` would fail, so the check
  does fail on the defect it targets, not merely on the absence of a fixed
  string the generator always writes regardless of the body.

## Minors and carried minors

- **M1 (dangling link at a command path written through)**: ADDRESSED.
  `refuse_if_foreign_generated` (`scripts/fx-opencode-install:135-141`) checks
  `path.is_symlink()` before anything else and refuses unconditionally, a
  dangling link included. Test case 11 (`tests/opencode-install/run.sh`)
  passes for both a command and an agent path.
- **M2 (final probe cannot catch the sibling rule it names)**: ADDRESSED.
  `scripts/fx-opencode-install:364-366` probes both the linked-skill route and
  `<dest>/references/vocab/good-tests.md` directly. Test case 13 (an installer
  copy with the `references` link step deleted, guarded by `cmp` so it cannot
  silently pass once the installer's text changes) passes.
- **M3 (skill counts include other tools' entries)**: ADDRESSED.
  `scripts/fx-opencode-install:372-373` counts only entries that
  `points_into_fx` recognizes as fx's own. `INSTALL.md:74` reads "12 links
  into fx, beside any other tool's skills." Test case 1's new check
  ("printed skill count is fx's 12 links, not the foreign skill") passes.
- **M4 (stale "base directory" sentence, `fx:` names in a generated command)**:
  ADDRESSED, with the controller's added scope honored. `BASE_DIR_SENTENCE_RE`
  (`:68`) replaces the skill's sentence about a base directory with one that
  fits a command, applied before the path rewrite. `PLUGIN_PREFIX_RE` (`:72`)
  strips `fx:` immediately before `fx-` from a generated command's description
  and body only (`render_command`, `:122`); `convert_agent` never applies it.
  Grepped the repository: no agent file contains `fx:fx-`, so the
  agents-are-untouched claim holds trivially today, and the source files under
  `commands/`, `skills/fx-audit/SKILL.md` and `PREAMBLE.md` still read
  `fx:fx-...` unchanged, confirming only the generated copies are remapped.
- **M5 (forced removal failure not covered in the audit's own wording)**:
  ADDRESSED. `skills/fx-audit/SKILL.md:203` and `:221` both add "If that still
  fails, say what is left at the path and stop," matching
  `skills/fx-review/reviewer-prompt.md:67-68`'s wording.
- **M7 (a root that cannot hold what the gate checks still exits 0)**:
  ADDRESSED. `scripts/check-artifacts:142-145` (`root.is_dir()` and at least
  one of the four scanned areas present) exits 1 and names the root
  otherwise. Test cases `file-root` and `root-with-no-scanned-area` both pass,
  including the case built to prove the old code would have printed a false
  clean result on a root that holds a remote script under a wrongly named
  directory.
- **M9 (the vendor skip never matches on Windows)**: ADDRESSED.
  `scripts/check-artifacts:99` now does `path.relative_to(root).as_posix()`
  before comparing. Reproduced the report's own evidence with
  `pathlib.PureWindowsPath`: the old `str()` plus `PurePosixPath(...).as_posix()`
  route keeps the backslashes (`references\vendor\lib.min.js`, no match), the
  new one normalizes them (`references/vendor/lib.min.js`, matches). No
  automated test exists for this on Linux, which the report says outright;
  that is a reasonable limit, not a gap.
- **M10 (em dash inside INSTALL.md's code fence)**: ADDRESSED.
  `INSTALL.md:145` now reads "opencode's pools: inspect before deleting
  anything." `python3 scripts/check-prose` passes.
- **Carried minor, ADR 0014 wording**: ADDRESSED.
  `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md:5` now reads "hunts
  all six groups listed in the fixture's key."
- **Carried minor, redundant `as_posix()`**: ADDRESSED, folded into M9 above,
  as the wave's own report says.

## New breakage in the fix diff

None found at Critical or Important severity.

One design point worth naming rather than filing as a defect: `M4`'s fix
couples a test to an exact sentence prefix. `BASE_DIR_SENTENCE_RE`
(`scripts/fx-opencode-install:68`) matches the literal text "Every path below
that starts `../../`" in `skills/fx-audit/SKILL.md:25`, up to the next period.
`tests/opencode-install/run.sh:65` ("fx-audit command claims no base
directory") fails if a future edit to that sentence changes its opening
words, because the substitution would then stop firing and the phrase "base
directory" would leak back into the generated command. That is a real
coupling and it will break on an edit to that sentence that has nothing to do
with opencode, but it breaks loudly: the test goes red at commit time rather
than the stale wording silently reappearing in a generated file, which is the
failure mode the finding it fixes was actually about. A less coupled
alternative exists (tag the sentence with a marker comment the way
`check-artifacts` already does for `artifact-gate: ok`, so substitution and
the test do not depend on matching prose), but the current one is a deliberate
trade of a one-line maintenance cost for a loud failure over a silent one, in
keeping with fx's own stated preference for markers over inferred formatting
(ADR 0011). Not a defect; noted because the task asked the question directly.

## Out-of-scope observations

None.

## Verdict

**Fix wave: All taken findings addressed, no new Critical or Important
breakage.**

C1, I1, I2, I3, I4, I5, M1, M2, M3, M4, M5, M7, M9, M10, and the three carried
minors (the `agents/` overwrite refusal, ADR 0014's wording, and the
redundant `as_posix()` folded into M9) are all addressed and verified, either
by running the named test suites and gates once each, by reading the changed
code and prose against the finding's own reproduction, or, for C1's scratch
scenario, by an independent install-then-reinstall run against a manually
built old-style layout. `scripts/check-all` prints ALL GREEN on the current
head. Nothing from this wave is left open.
