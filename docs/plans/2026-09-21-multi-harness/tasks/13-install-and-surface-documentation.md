# 13: Install and surface documentation

**Status:** ready-for-agent
**Blocked by:** 12, 14, 15, 16, 17, 18, 19, 20, 21, 25, 26
**Phase:** Polish

**What to build:** A reader can install fx on any of the three runtimes by
following the documentation, and every claim in it is one the conformance
matrix proved.

**Amended 2026-09-21.** The design amendment (decisions A1 to A9, in the design) changes what
this documentation must say. It must also cover:
- **Codex:** after installing, the user trusts fx's hooks in `/hooks`, and
  trusts them again whenever fx changes a handler setting. ponytail's README
  states the same step (ponytail section 4 of
  `research/prior-art-multi-harness.md`); copy its plainness. The order
  matters: the hooks run only once trusted, so the first session after trust
  plants the review roles and shows a notice to restart Codex once, and only
  the session after that restart can dispatch a role. `fx-setup` plants them
  too, for a user who has not trusted the hooks yet.
- **Read-only agents** cannot write on any runtime, by a different mechanism
  on each: no shell on Claude Code and opencode, and on Codex a kept shell
  whose writes the hook refuses. ADR 0019 is corrected by task 17, and this
  task links to it rather than restating it.
- **Named limits** from the amendment, each in `INSTALL.md`: opencode MCP
  tools for read-only agents, if task 17 found no rule to deny them, and Codex
  row 15, if task 16 ruled it a GAP, with the user-level config key.
- **The preamble** reaches Claude Code in parts, and why.
- **The nightly workflow**, from task 20: what it checks, at the floor and at
  `@latest`, and what it does not.
- **Rows 13 and 14** report GAP on Claude Code and Codex, and these docs list
  them with their reasons. Codex is proven live only after task 22. Until
  then, the docs state Codex live verification as pending, never as done.

**Carried from task 17:** `SURFACE.md:92` and `INSTALL.md:29` still show the
lenses with `Bash` and `bash: allow`. Correct them. Also document that an
existing opencode install keeps its old read-only permissions until the
installer is run again, because the plugin skips agents already present and
never overwrites them. Since task 17 fix round 1 that means more than
`bash: allow`: an old install also lacks the deny-all rule, so its read-only
agents keep `webfetch` and MCP tools as well.

**Carried from the coverage audit** (`state.md`, "Coverage audit"). These
ledger rulings named this task and were missing from its criteria:
- the Codex validator reports five expected failures, one per hidden lane
  (`state.md`, the task 07 rulings);
- hiding a lane on Codex rests on Codex's command-to-skill migrator rejecting
  fx's command frontmatter, which is undocumented Codex behaviour (`state.md`,
  the task 07 fix ruling);
- `README.md`'s gate table lacks `check-tool-names` and later gates, and
  `README.md` still names the old `tests/opencode-install/` path;
- a user whose opencode `general.permission` is a wildcard gets no `task`
  grant from the plugin (task 18 ruling), so two-level dispatch needs them to
  allow `task` themselves;
- `fx-setup` checks role and hook state on Codex only (`state.md`, task 10
  minor); the equivalent checks on Claude Code and opencode are a follow-up
  plan.

The git-gate criteria this task used to carry are overtaken. Task 14 round 5
removed git from Codex read-only agents entirely, so there is no git gate to
comment beside, and ADR 0019 already records why, through task 17.

**Files:**
- Modify: `INSTALL.md`
- Modify: `README.md`
- Modify: `SURFACE.md`
- Modify: `docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md`
- Modify: `lib/plan-state.js`  (comment only, no code)

**Interfaces:**
- Consumes: the conformance results recorded in `state.md` by task 12, and task 21's matrix block
- Produces: no code

**Seam:** `scripts/check-prose`, `scripts/check-paths` and
`scripts/check-reference-leaves`, all existing.

**What must change, and why each is currently wrong.**

`INSTALL.md` documents one opencode path built on a symlink farm and a
standalone Claude Code path. It must document three runtimes, each with its
marketplace or plugin route first and its script route second, and it must
state the Codex hook-trust step for as long as the measured result says it is
needed.

`README.md` describes `hooks/` as Claude Code and `plugins/` as opencode. There
is now a third injector and a shared renderer.

`SURFACE.md` carries three statements this plan falsified:
- that upstream's Codex interface manifest is for "a runtime fx does not
  target". fx targets it.
- that tool restriction is enforced by the harness, so a lens physically cannot
  write. True on two runtimes; on Codex the hook enforces it and the role file
  does not. Point at ADR 0019 rather than restating the mechanism.
- that opencode is "a genuine port, not a downgrade", with the subagent claim
  marked unverified. Row 15 on opencode in task 21 measures it. Replace the
  hedge with that result.

**ADR 0019 gains the measurements** from task 21's rows 12 and 18 on Claude
Code and opencode. Codex row 12 has never been measured passing: task 12
recorded it as a GAP (quota) in the matrix and as a FAIL in its development
run, before roles could be dispatched. Do not claim a Codex measurement here.
State Codex as pending; task 22 writes the Codex result into ADR 0019 before
merge.

**Refreshing an install is documented per runtime.** A user story asks that
`git pull` or a plugin update refresh the install, and Codex copies the plugin
tree, so a repository update does not reach an installed copy until the plugin
is updated. Say which command does it on each runtime, and say plainly where a
`git pull` is not enough.

**Risks:** Documentation that outruns the matrix. Every capability claim must
correspond to a row that passed. Where a row is a `GAP`, say so plainly: a
documented gap is a feature, an undocumented one is the bug this whole plan
exists to prevent.

**Idempotency:** Documentation only.

**Testing:** The prose and path gates. Plus a read-through against `state.md`
and task 21's matrix: no claim without a row.

## Acceptance criteria
- [ ] `INSTALL.md` documents all three runtimes
- [ ] It states how to refresh an install on each, and where `git pull` alone is not enough
- [ ] It states that Claude Code and Codex have no script route, and why they do not need one
- [ ] Each runtime shows its marketplace or plugin route first, script route second
- [ ] The Codex hook-trust step is stated, or omitted with the measured reason
- [ ] `README.md`'s delivery diagram shows three injectors and the shared renderer
- [ ] `SURFACE.md` no longer says Codex is a runtime fx does not target
- [ ] `SURFACE.md`'s lens guarantee points at ADR 0019 instead of asserting one mechanism
- [ ] `SURFACE.md`'s opencode subagent claim carries the measured result, not a hedge
- [ ] Every capability claim in the three documents maps to a row in `state.md` that passed
- [ ] No document says fx has six lenses: there are five, plus a read-only devil's advocate
- [ ] `docs/adr/0019` states that git is unavailable to Codex read-only agents,
      and why: git runs commands from repository config the agent does not
      control (`diff.external`, textconv, `core.fsmonitor`, a nested
      repository's config). No criterion asks for a git-gate comment, and
      `lib/plant-roles.js` is not in this task's Files (from gap 5 of the audit, replacing
      the overtaken `git -c diff.external` criteria)
- [ ] Every `GAP` in `state.md` appears in `INSTALL.md` as a stated limitation
- [ ] `INSTALL.md` states the Codex order: trust fx's hooks in `/hooks`, start
      a session, which plants the roles and shows the restart notice, restart
      Codex once, then dispatch a review agent; or run `fx-setup`, which plants
      them without trusted hooks (from gap 1 of the audit)
- [ ] `INSTALL.md` states that after every fx update on Codex the user
      re-opens `/hooks` and trusts the changed hooks, and what happens until
      they do: the preamble, the guard and read-only enforcement do not run
      (from gap 2 of the audit)
- [ ] `SURFACE.md` and `INSTALL.md` show no read-only agent with `Bash` or
      `bash: allow`, and `INSTALL.md` says an opencode install made before this
      release keeps its old read-only permissions, including shell and
      webfetch, until the installer runs again (from gap 3 of the audit)
- [ ] `INSTALL.md` names, per runtime, how a read-only agent is stopped from
      writing, links ADR 0019, and says the Codex gate is a heuristic that
      stops accidents, not an adversary (from gap 4 of the audit)
- [ ] ADR 0019 records rows 12 and 18 from task 21 on Claude Code and
      opencode, dated, with the CLI versions (from gap 4 of the audit)
- [ ] `INSTALL.md` states the Codex validator reports five expected failures,
      one per hidden lane, and that hiding a lane on Codex depends on its
      command migrator rejecting fx's command frontmatter, which is
      undocumented Codex behaviour (from gap 6 of the audit)
- [ ] `README.md` lists every gate `scripts/check-all` runs, and names no
      retired path such as `tests/opencode-install/` (from gap 6 of the audit)
- [ ] `INSTALL.md` describes the nightly workflow at the floor and at
      `@latest`, what it checks and what it does not; says the Claude Code
      preamble arrives in parts, and why; and marks Codex live verification
      pending, never done (from gap 6 of the audit)
- [ ] `INSTALL.md` says a user who set opencode's `general.permission` to a
      wildcard must allow `task` themselves for two-level dispatch (from gap 7 of the audit)
- [ ] `SURFACE.md`'s opencode subagent claim cites task 21's row 15 result,
      not task 10 (from gap 8 of the audit)
- [ ] `INSTALL.md` says `fx-setup` checks role and hook state on Codex only,
      and names what it does not detect on Claude Code and opencode: plugin
      trust and enable state, CLAUDE.md pointer drift, a second skills pool,
      `subagent_depth` (from gap 24 of the audit)
- [ ] `lib/plan-state.js` no longer claims `PreToolUse` does not fire for
      `Write` or `Edit`: that belief was measured false and the lane check was
      measured firing. Comment only; change no code in that file
- [ ] `SURFACE.md` no longer cites DEBT #30 as a live justification
- [ ] A repository-wide search for the two retired beliefs returns nothing
      outside `docs/adr/`, where recording them is the point
- [ ] `scripts/check-prose`, `check-paths` and `check-reference-leaves` pass

## Steps

- [ ] **1. Walk `state.md` and list every claim**

Read task 12's recorded result and task 21's matrix. Write the list of guarantees that passed, and
the list that are `GAP`. This list is the only source for what the
documentation is allowed to promise.

- [ ] **2. Rewrite `INSTALL.md`**

Three sections, one per runtime. Marketplace or plugin route first. Script
route second, with its reason: the plugin loader is unavailable in that
environment. Keep the existing sibling-directory explanation, which is still
correct for the script path, and delete anything the script no longer does.

- [ ] **3. Correct `README.md`**

Update the delivery diagram and the directory table for the third injector and
`lib/preamble.js`.

- [ ] **4. Correct `SURFACE.md`**

The three statements listed above. Do not restate the lens mechanism in prose:
point at ADR 0019, which carries it with its measurement.

- [ ] **5. Add the end-to-end measurements to ADR 0019**

Rows 12 and 18 from task 21, on Claude Code and opencode, with the date and
the CLI versions. Codex stays pending: task 22 fills it in.

- [ ] **6. Verify no claim outruns the matrix**

Run: `grep -nE 'cannot|never|always|physically' INSTALL.md README.md SURFACE.md`
Check each hit against the list from step 1. Soften or delete any that no row
supports.

- [ ] **7. Run the gates**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add INSTALL.md README.md SURFACE.md docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md lib/plan-state.js
git commit -m "docs: document three install paths and correct the falsified claims"
```

No attribution trailers. This is the last task in the plan.
