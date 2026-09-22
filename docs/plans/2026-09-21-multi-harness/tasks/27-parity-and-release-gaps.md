# 27: Parity and release gaps from the delta coverage audit

**Status:** ready-for-agent
**Blocked by:** 25, 26
**Phase:** Amendment 2

**What to build:** four gaps the delta coverage audit found after amendment 2.
Each one lets a runtime, or a release, silently behave differently from what the
design promises.

1. **Runtime-specific lane addressing inside shared lane text.**
   `skills/fx-implement/implementer-prompt.md:46-48` tells every implementer
   subagent to "Invoke `fx:fx-tdd`" and says "a bare `fx-tdd` may not resolve
   at all". That is correct only on Claude Code. On opencode the bare name is
   the form, and on Codex the form is `$fx-tdd`. A subagent there reads the
   correct rendered bootstrap, and then reads this contradiction. The same
   pattern is at `skills/fx-debug/SKILL.md:325`,
   `skills/fx-brainstorm/SKILL.md:313` and `skills/fx-implement/SKILL.md:625`.
   ADR 0020 fixed this once in `PREAMBLE.md` only. Skill files are one shared
   text for all runtimes and are not rendered per runtime, so they must name
   the lane without a runtime-specific form. The bootstrap already tells each
   runtime how to address a lane. Example wording: "invoke the fx-tdd lane".
2. **The every-caller rule reaches fx-debug only.** Audit rows 74-76 moved it
   to `skills/fx-debug/SKILL.md` Phase 5. A planned bug fix or refactor
   dispatched by fx-implement runs through the implementer prompt and fx-tdd,
   never fx-debug, so its implementer never sees the rule. Give it a second
   home at the moment a fix is written: fx-tdd's GREEN step, or the implementer
   prompt. Update audit rows 74-76 to name that home and the moment it loads.
3. **Release gate.** A Claude Code plugin update only lands when the version
   changes (measured in the task 13 review). Add a gate that fails when the
   plugin's shipped files differ from the base branch's but the version is not
   greater than the base branch's version. Base it on the merge-base with the
   base branch, and skip it when there is no base branch to compare.
4. **Overlap pair.** prototype claims "try a few variations of this screen",
   and fx-design claims "any new screen", but neither names the other. Declare
   the pair in `tests/gates/description-overlap.test.js`, with a redirect
   clause in each description, or list it under "considered and not declared"
   in the audit with a reason.

**Prior art:** none needed. These are fx-internal consistency gaps.

**Files:**
- Modify: `skills/fx-implement/implementer-prompt.md`,
  `skills/fx-implement/SKILL.md`, `skills/fx-debug/SKILL.md`,
  `skills/fx-brainstorm/SKILL.md`, and any other skill or reference file the
  new gate finds
- Modify: `skills/fx-tdd/SKILL.md`, or the implementer prompt, for item 2
- Modify: `docs/plans/2026-09-21-multi-harness/bootstrap-no-loss-audit.md`,
  rows 74-76, plus the pairs section if item 4 is not declared
- Create: `tests/gates/no-runtime-addressing.test.js`
- Create: `tests/gates/release-version.test.js`, or add it to an existing
  version gate
- Modify: `tests/gates/description-overlap.test.js`, plus the fx-design and
  prototype descriptions if the pair is declared
- Modify: `scripts/check-all`
- Modify: generated files, regenerated

**Seam:** free gate tests. There are no live runs in this task. Task 21 and
task 22 part B measure routing.

**Idempotency:** file edits. The gates are deterministic.

## Acceptance criteria
- [ ] `no-runtime-addressing.test.js` fails when any skill or reference file tells the model to invoke a lane with `fx:` or `$`, or carries a resolution claim such as "may not resolve". It excludes generated command-skill headers and quoted examples marked with `prose-gate: quoting`. It passes on the tree, and a mutation that puts back `Invoke \`fx:fx-tdd\`` fails it
- [ ] The four known sites, and any others the gate finds, name the lane without a runtime form
- [ ] The every-caller rule is present where a planned fix is written, and audit rows 74-76 name that home
- [ ] `release-version.test.js` fails when shipped files differ from the merge-base but the version is not greater. It passes on the tree at 0.2.0 against main at 0.1.7. Show both cases, using a fixture repo or a `git archive` copy, never the worktree
- [ ] The fx-design and prototype pair is either declared, with redirects and the gate passing, or listed as considered with a reason
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps
- [ ] **1. Write the failing gates.** Watch the addressing gate fail on the four known sites, and the release gate fail on a same-version fixture.
- [ ] **2. Fix the sites and add the second home.** Handle the pair, then regenerate.
- [ ] **3. Run the full gate, then commit by path.** No attribution trailers.
