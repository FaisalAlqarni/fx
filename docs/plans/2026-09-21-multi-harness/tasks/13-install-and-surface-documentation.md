# 13: Install and surface documentation

**Status:** ready-for-agent
**Blocked by:** 12, 14, 15, 16, 17, 18, 19, 20
**Phase:** Polish

**What to build:** A reader can install fx on any of the three runtimes by
following the documentation, and every claim in it is one the conformance
matrix proved.

**Amended 2026-09-21.** The design amendment (decisions A1 to A9) changes what
this documentation must say. It must also cover:
- **Codex:** after installing, the user trusts fx's hooks in `/hooks`, and
  trusts them again whenever fx changes a handler setting. The first session
  plants the review roles, and the user restarts Codex once.
- **Read-only agents** have no shell on any runtime. ADR 0019 is corrected by
  task 17, and this task links to it rather than restating it.
- **The preamble** reaches Claude Code in parts, and why.
- **The nightly workflow** (task 20): what it checks and what it does not.
- **Rows 13 and 14** report GAP on Claude Code and Codex, and these docs list
  them with their reasons. Codex is proven live only after task 22. Until
  then, the docs state Codex live verification as pending, never as done.

**Files:**
- Modify: `INSTALL.md`
- Modify: `README.md`
- Modify: `SURFACE.md`
- Modify: `docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md`
- Modify: `lib/plan-state.js`  (comment only, no code)

**Interfaces:**
- Consumes: the conformance result recorded in `state.md` (task 12)
- Produces: no code

**Seam:** `scripts/check-prose`, `scripts/check-paths` and
`scripts/check-reference-leaves`, all existing.

**What must change, and why each is currently wrong.**

`INSTALL.md` documents one opencode path built on a symlink farm and a
standalone Claude Code path. It must document three runtimes, each with its
marketplace or plugin route first and its script route second, and it must
state the Codex hook-trust step for as long as task 12's result says it is
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
  marked unverified. Task 10 verified it. Replace the hedge with the result.

**ADR 0019 gains the measurement** from task 12's row 12, the first end-to-end
confirmation of the Codex guarantee rather than a probe.

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

**Testing:** The prose and path gates. Plus a read-through against `state.md`:
no claim without a row.

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
- [ ] `docs/adr/0019` records the known fourth-level bypass
      `git -c diff.external=<program> diff`, demonstrated invoking an
      arbitrary program that wrote a file. It is accepted, not fixed, per the
      ceiling ruling. Recording it is what keeps the ceiling honest
- [ ] A comment near the git gate in `lib/plant-roles.js` names that instance,
      so the next reader does not rediscover it and assume it is unknown
- [ ] Every `GAP` in `state.md` appears in `INSTALL.md` as a stated limitation
- [ ] `lib/plan-state.js` no longer claims `PreToolUse` does not fire for
      `Write` or `Edit`: that belief was measured false and the lane check was
      measured firing. Comment only; change no code in that file
- [ ] `SURFACE.md` no longer cites DEBT #30 as a live justification
- [ ] A repository-wide search for the two retired beliefs returns nothing
      outside `docs/adr/`, where recording them is the point
- [ ] `scripts/check-prose`, `check-paths` and `check-reference-leaves` pass

## Steps

- [ ] **1. Walk `state.md` and list every claim**

Read task 12's recorded result. Write the list of guarantees that passed, and
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

- [ ] **5. Add the end-to-end measurement to ADR 0019**

Row 12's result, with the date and the Codex version.

- [ ] **6. Verify no claim outruns the matrix**

Run: `grep -nE 'cannot|never|always|physically' INSTALL.md README.md SURFACE.md`
Check each hit against the list from step 1. Soften or delete any that no row
supports.

- [ ] **7. Run the gates**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add INSTALL.md README.md SURFACE.md docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md
git commit -m "docs: document three install paths and correct the falsified claims"
```

No attribution trailers. This is the last task in the plan.
