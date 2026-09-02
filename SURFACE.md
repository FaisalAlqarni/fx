# The fx surface — Section 1, agreed

What ships, decided. Deferred items are in `OPEN-DECISIONS.md`; known gaps in
`DEBT.md`.

Working name is **`fx`** — still a placeholder. Renaming is a `sed` across
files and stays cheap until the repo exists.

---

## Lanes — 9 written, 1 deferred

Model-selectable, exactly one claimant each. All descriptions are pure trigger
lists; none summarizes a workflow.

**Line budget, revised 2026-09-02.** The 500-line cap was justified as
"paid per subagent dispatch". That was wrong: a lane's `SKILL.md` is read once
by whoever invokes it, and a dispatched implementer reads
`implementer-prompt.md`, not the skill. The real justification is dilution —
a longer skill binds less per line, which this session demonstrated when an
agent read `fx-brainstorm` in full, classified correctly, and overrode it.

So the budget is now **by role, not one number**: a coordinator lane
(`fx-implement`, read once per session, procedure-heavy) may run to ~550. A
discipline lane (`fx-tdd`, `fx-debug`, read at the moment of temptation) stays
tight, because dilution is the whole risk there. `fx-implement` sits at 527
after absorbing ten fixes, and that is accepted rather than compressed —
compressing it risked losing a rule, and splitting it behind a pointer would
recreate DEBT #20.

| Skill | Owns | Status |
|---|---|---|
| `fx-brainstorm` | Entry point. Classify → clustered rounds + ledger → sectioned design → gate | ✅ |
| `fx-plan` | Vertical tracer tasks, blocking edges, Consumes/Produces | ✅ |
| `fx-implement` | Works the frontier, worktree, fresh subagent per task, rulings not stalls | ✅ |
| `fx-tdd` | Iron Law, verify-RED (runtime **and** compile-time), confirmed seams | ✅ |
| `fx-review` | Two axes reported separately + triggered risk lenses | ✅ |
| `fx-architecture` | Deepening opportunities in existing code, local HTML report | ✅ |
| `fx-debug` | Feedback loop first, 3-fix circuit breaker, correct-seam rule | ✅ |
| `fx-humanize` | Prose de-slopification (verbatim upstream, one line changed) | ✅ |
| `fx-authoring` | Writing skills, agents, dispatch prompts, CLAUDE.md | ✅ |
| **`fx-design`** | **Deferred — see D1.** Nothing owns design in the interim | ⏸ |

## Procedures — 2

Copied verbatim; only the frontmatter `description` was rewritten into a
trigger list, so neither can contest a lane.

| Skill | Lines | Note | |
|---|---|---|---|
| `research` | 12 + 1 | One added paragraph: query terms may not carry module names, file paths or internal service names — searches reach third parties | ✅ |
| `prototype` | 26 + `LOGIC.md` + `UI.md` | Verbatim body. **Called by `fx-brainstorm` §4**, next to the visual companion: a picture answers "what would it look like", a prototype answers "would it work" | ✅ |

Upstream ships an `agents/openai.yaml` beside each. Not copied — it is a Codex
interface manifest for a runtime fx does not target, and it restates the
`description` we deliberately rewrote.

**Dropped:** `wizard`, `resolving-merge-conflicts` — merge conflicts are handled
by hand, and infra-setup wizards are rare here.
**Removed from inventory:** the 7 Android skills (D4).

## Agents — 5 (performance lens cut, D5)

| Agent | Source | Lines | Note |
|---|---|---|---|
| `fx-devils-advocate` | `soe:adversarial-review` | — | ✅ written |
| `fx-lens-database` | `ecc:database-reviewer` | 100 | 6 engines on one Postgres — highest value |
| `fx-lens-security` | `ecc:security-reviewer` | 117 | Devise / devise-jwt / Pundit surface |
| `fx-lens-a11y` | `ecc:a11y-architect` | 149 | axe-core-rspec + Arabic RTL |
| `fx-lens-silent-failure` | `ecc:silent-failure-hunter` | 59 | Sidekiq workers, broker consumers |
| ~~`fx-lens-performance`~~ | `ecc:performance-optimizer` | 455 | **Cut — D5.** ~370 of 455 lines are React/webpack/bundle advice; the usable residue is `fx-lens-database`'s |

**Models pinned per lens:** `security` and `database` at top tier; `a11y`,
`silent-failure` and `performance` at mid-tier. Those two don't fire on simple
diffs — they need `db/migrate/`, a model, `structure.sql`, or a
Devise/Pundit/JWT path — so **simple tasks see no slowdown; the extra cost lands
only on migrations and auth changes.** An omitted model silently inherits the
session's, usually the priciest, so every agent file pins one explicitly.

All read-only: `tools: Read, Grep, Glob, Bash`. Tool restriction is enforced by
the harness, so a lens physically cannot write to the repo.

## Delivery — one preamble, two runtimes

`PREAMBLE.md` is the single canonical text (**measured 1,173 tokens** — 27% over
the 920 estimated here originally), paid per session and
per subagent dispatch. Contents, all four agreed:

| Part | ~tok | Why it must be here |
|---|---:|---|
| The ladder + "when NOT to be lazy" | 550 | Governs every code response |
| Routing table | 150 | Deterministic routing that doesn't depend on description matching — and the only copy a subagent sees |
| Non-negotiables | 100 | No attribution trailers · commits only in a worktree · nothing leaves the machine · Arabic/RTL default · evidence before claims. **All of these live in CLAUDE.md and memory, which subagents never read** |
| Anti-slop prose rule | 120 | Applies to commit messages, ADRs, `CONTEXT.md` and chat |

```
PREAMBLE.md                          ← single source, fx owns it
 ├─ Claude Code  hooks/fx-context.js    SessionStart + SubagentStart
 │               hooks/fx-git-guard.js  PreToolUse · Bash
 └─ opencode     plugins/fx.js          experimental.chat.system.transform
                                        tool.execute.before
```

**opencode is a genuine port, not a downgrade.** Its plugin API supports system-prompt
injection and tool blocking — `tool.execute.before` blocks by throwing, the same
pattern its docs use to prevent `.env` reads. Shares `PREAMBLE.md` and the guard
predicate with the Claude Code side.

**Subagents are covered too.** opencode implements them as **child sessions** —
`TaskTool` calls `Session.create({ parentID })` then `SessionPrompt.prompt()` —
so they go through the same session-creation and prompt-construction path as a
top-level session. One mechanism covers both, where Claude Code needs two
separate events. *(Architecture confirmed; that the system-transform hook fires
on child sessions follows from it but is not documented outright. Verify with a
throwaway subagent probe before relying on it.)*

One caveat: `experimental.chat.system.transform` carries an `experimental.`
prefix and may change — the stable fallback is `~/.config/opencode/AGENTS.md`,
which every session including child sessions reads.

`fx` never writes to `~/.claude/CLAUDE.md`. opencode reads it as a global
fallback, but it's the user's file — `/fx:setup` writes to
`~/.config/opencode/AGENTS.md` instead, so upgrades can replace rather than
merge.

### The git guard — one condition, no unlock

```
GIT_DIR == GIT_COMMON   →  main checkout   →  BLOCK every mutating git command
GIT_DIR != GIT_COMMON   →  in a worktree   →  allow
```

**"Within a worktree do whatever you like. On the main branch, no write or
commit at all — hard rule."** No unlock command, no expiring token, no escape
hatch to maintain.

`push` follows the same condition: allowed from a worktree branch, so an agent
can open a PR from the branch it just built; refused on the main checkout, which
already cannot hold a commit to push.

Always blocked regardless of location:
- `reset --hard`, `clean -fdx`, `branch -D`, `push --force` (and
  `--force-with-lease`), `checkout .`
- `--no-verify`
- **Any commit message containing `Co-Authored-By`, `Claude-Session`, or
  "Generated with"** — this is the only mechanism that survives into a dispatched
  subagent, which reads neither CLAUDE.md nor memory

### Stack detection

`.fx.json` in the repo names the stack explicitly; detection only runs when it's
absent. Deterministic, and it survives a repo growing a second language —
advantage-backend has a `Gemfile`, a `package.json` and 1,658 vendored `.ts`
files, which no priority order resolves honestly.

## Commands — 4

| Command | Does |
|---|---|
| `/fx:setup` | Writes `.fx.json` · the `AGENTS.md` fx block (opencode delivery) · `docs/plans/` + `docs/agents/*` · `.gitignore` entries for `.fx/` and `.worktrees/` |
| `/fx:critique` | Dispatches `fx-devils-advocate` at any design or plan |
| `/fx:grill` | The interview technique standalone — no classification, no gate. For decisions not heading for code |
| `/fx:level` | Writes `lite\|full\|ultra` to `~/.claude/fx.json` |

**`/fx:help` cut** — it printed the routing table, which the preamble already
carries in every session and every subagent. A command that prints what you are
already looking at is a no-op paying maintenance.

## References — 24 written

```
design-template.md
vocab/  codebase-design · defense-in-depth · domain-modeling · fowler-smells
        good-tests · grilling · model-selection · persuasion-principles
        receiving-review · root-cause-tracing · skill-testing · verification
        worktree-setup
```

**Leaves.** 0 cross-links. `codebase-design` absorbed `deepening` and
`design-it-twice` — the cycle was the symptom that they were one topic split
three ways. Enforced by `scripts/check-reference-leaves`. See the design doc §2.

**Missing:** `references/stacks/*.md` — Section 3, and a dead pointer in
`fx-implement`, `fx-tdd`, `fx-debug` and `implementer-prompt.md` today.

## The routing table

| Trigger | Lane |
|---|---|
| new feature · "let's build" · any creative work | `fx-brainstorm` |
| an approved design exists | `fx-plan` |
| tasks exist, build them | `fx-implement` |
| writing or changing code with logic | `fx-tdd` |
| review a diff, branch or PR | `fx-review` |
| structure of existing code is the problem | `fx-architecture` |
| bug · test failure · unexpected behavior | `fx-debug` |
| **`.erb` · CSS · anything visual** | **No owner yet.** Apply the project's CSS tokens and the shared-partial contract; flag anything beyond that. See D1 |
| a prose document needs fixing | `fx-humanize` |
| editing a SKILL.md / CLAUDE.md / AGENTS.md | `fx-authoring` |
| any chart or dashboard | built-in `dataviz` |
| library / framework / API docs | `context7` |

## Stack knowledge — three layers, Section 3

**fx is stack-general.** Nothing in it assumes Rails. Laravel, Spring, Flutter,
Angular or Swift work the day you open the repo — because the required layer is
`.fx.json`, and the ecosystem file is optional enrichment.

| Layer | Owns | Lives | Written by |
|---|---|---|---|
| **Ecosystem** | Rails / .NET / Docker knowledge, true in *any* repo | `references/stacks/*.md` — ships with fx | authored |
| **Repo** | *this* project — structure, patterns, techniques, conventions | `repo.md` at project root | `/fx:setup`, draft reviewed first |
| **Machine** | `stacks: []`, test commands, coverage | `.fx.json` | `/fx:setup` |

**Sole ownership per fact.** `repo.md` never restates a command; it points at
`.fx.json`. Nothing is written twice, so nothing can drift apart.

`stacks` is a **list**, composed per repo — `[rails, docker, postgres]`,
`[dotnet, docker]`. That is how `docker` and `data` fit: not alternatives to
`rails`, additional profiles layered on. One flat namespace, one claimant per
name — so `data.md` and the standalone `postgres` skill cannot both exist.

**A missing profile must degrade, never fail.** Commands live in `.fx.json`,
so an unwritten ecosystem file costs traps, not function.

Ecosystem files defer on anything the repo decides: *"use the test framework
this repo uses"* plus the detection rule — never *"use RSpec"*.

| File | Status |
|---|---|
| `observability.md` | ✅ written |
| `rails.md` | ⏳ exemplar — sets the shape, since no template ships |
| `dotnet.md` · `docker.md` · `frontend.md` · `data.md` | ✗ |
| ~~`android.md`~~ · ~~`ios.md`~~ | dropped — D4, D5 |

**Adding a stack later:** write the file. No template, no `/fx:stack` command.

## The two skills directories

Claude Code reads `~/.claude/skills/`. **Codex, Copilot CLI, Gemini CLI and
opencode read `~/.agents/skills/`** — a separate tree Claude Code cannot see
except through explicit symlinks.

| | Was | Now |
|---|---:|---|
| `~/.claude/skills/` | 24 | **11** — 7 Android (kept global), `mysql`, `postgres`, `archify`, `find-skills` (symlinks) |
| `~/.agents/skills/` | 44 | **29** |

**Done:** all 15 `planetscale-*` deleted from both trees — self-hosted
Postgres 17 + ClickHouse here, so Vitess, `pscale`, deploy requests and Traffic
Control apply to nothing. Content backed up to `/tmp/planetscale-content-backup.tgz`.

**Kept as standalone skills:** `postgres`, `mysql`. They do **not** contest with
`fx-review` — `postgres` triggers on *"working with a Postgres database"*,
`fx-review` on *"changed code needs checking"*. Different conditions. That
separation only exists because the descriptions were rewritten as trigger lists.

**Deferred — mirror the uninstall in `~/.agents/skills`:** the 19+ mattpocock
skills, `humanizer` and `ui-ux-pro-max` live there too. Uninstalling the Claude
Code plugins does **not** remove them, so **in opencode the selection contest
fx exists to end stays live.** Delete them there **only once fx is installed for
opencode** — doing it now would leave opencode with neither.

## Upstream tracking — withdrawn

**fx is a fork, not a downstream.** The absorbed skills were adapted once and
are now owned here. No provenance ledger, no `/fx:upgrade`, no snapshots.

Consequence, stated once: upstream fixes and new ideas never arrive on their
own. Wanting one later means going and reading that skill deliberately.

The `COVERAGE.md` files stay, but their job changed — they are now a record of
**why** a claim was kept, superseded or dropped, not an input to a
reconciliation. Still the answer to "why doesn't fx-tdd do X", still worth
having; just no longer load-bearing for anything automated.

## Absorbed this round

`advantage-backend/.claude/logging-best-practices/` → `references/stacks/observability.md`.

932 lines across 5 files, deduplicated to one reference. Its own examples
carried a note apologising for using checkout/cart domains; they are rewritten
in Survey/Campaign/Organization. Added: `I18n.locale` on every event (Arabic is
the default and locale bugs are invisible without it), and the project's
**trace-topology rule** — async jobs nest inside the initiating request's trace
as a child span, and that is not to be changed without asking.

The original skill sat at `.claude/logging-best-practices/` instead of
`.claude/skills/logging-best-practices/` and **never loaded once** between Feb
and Sep 2026.

## Plugins that survive

`context7` · `figma` · `chrome-devtools-mcp` · `playwright` · `ruby-lsp` ·
`security-guidance` · `claude-md-management` · `claude-code-setup`

**Uninstalled:** `ecc` · `superpowers` · `mattpocock-skills` · `ponytail` ·
`humanizer` · `frontend-design` · `code-simplifier` · `sp-ecc` · `soe` ·
`kotlin-lsp` · **`impeccable`** · `ui-ux-pro-max` *(pending D2 — its corpus may
still be absorbed before removal)*

Built-ins that stay and are used, not replaced: `/code-review` (the correctness
engine inside `fx-review`), `/simplify`, `dataviz`, `Explore`, `Plan`.
