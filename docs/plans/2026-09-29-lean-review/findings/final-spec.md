**Spec review, lean-review branch 68ba929..ee13f92.** I found no Critical issues and two Important ones. Nothing was run; this is from reading the diff, the spec and the ledger rulings.

**(a) Missing or partial**

- [Important] "New repo-level file `docs/plans/rulings.md`: one `Ruling:` line per standing owner ruling". The file is not in the diff and does not exist in the worktree. `fx-implement` only copies from it "if that file exists", and nothing creates it. The cross-plan carry has nothing to carry, and the owner's existing standing rules were never seeded.
- [Important] "No `model` and a `subagent_type` whose definition pins none → `model` is set to `sonnet`." `lib/dispatch-route.js` returns null when `subagent_type` is empty, before it checks `model`. Claude Code treats an omitted type as `general-purpose`, so that dispatch still inherits the parent model. A type-less `opus` call with no reason also skips the downgrade. Ruling 138 restricts routing to `general-purpose`, `claude` and `Plan`, but I don't think it intends to exclude the omitted-type case. Fix: treat an empty type as `general-purpose`, leaving `fork` alone.
- [Minor] §4: "The controller rejects a report whose test command is `test_all`, and ledgers it." `fx-implement` instead says "the work stands" and only ledgers it, and only when `.fx.json` has a `test_scope`. This is a softer rule than the spec's, and no ruling covers it.
- [Minor] §3 ledger line: `Task NN: fix round R: controller re-review (L lines): clean|<finding>`. `fix-loop.md` writes `<X> addressed, <Y> open` and adds `R/5`. The format differs.
- [Minor] §9: "the branch step shows every lens and devil's advocate". The README pipeline diagram says "every lens on its broad trigger" and does not name devil's advocate. The lens table text does.
- [Minor] §9: "Install: OpenCode measured on 1.18.25 and 2.0.18." Only `INSTALL.md` carries this, and the README just points to it.

**(b) Scope creep**

- [Minor] §8: `web-polish.md` is "about 35 lines". It is 55. It adds an "Icons" section (outline versus filled pair, one set per surface), a modal-origin rule and a "never the only signal" bullet that duplicates the a11y lens. None of these were requested.
- [Minor] The exit-gate classification adds rules the spec does not have: a test file absent on the merge base is "introduced", a merge-base failure "some other way" is "introduced", and "pre-existing" needs "the same assertion". It also adds a throwaway worktree procedure. This is plausible gap-filling, but it is not in §4.
- [Minor] The `mode: branch` brief line is new. The spec gives no mechanism for it. The security lens's "Branch review only" section and the `fx-review` brief both depend on it, so it is needed, but it is undocumented in the design.
- [Minor] The companions line appends a "(.fx.json could not be read…)" sentence on a parse error. The spec says a bad file "means the default, never a crash". The extra warning is unrequested.
- [Minor] `plan-state.js` accepts bold and bullet `Ruling:` variants and also reads `rulings.md` when no ledger lists rulings. The spec says it adds "that ledger's standing rulings". This is defensible.

**(c) Implemented but looks wrong**

- [Minor] §3 says the re-review is skipped when "the finding is not Critical". `fix-loop.md` condition 4 says "No open finding is Critical". This matches. But because `git diff --numstat` excludes `*.md`, a fix that only changes a prompt or skill `.md` counts as 0 production lines and qualifies. In this repo the `.md` files are the product. This is a spec-consistent but risky reading of "doc files not counted".
- [Minor] The routing hook emits `updatedInput` without `permissionDecision: "allow"`. Ruling 137 covers this, and I accept it.

The rulings at lines 137 to 139 (permissionDecision omitted, routing limited to three types, rulings cap of 10) do not contradict the design without reason, apart from the omitted-type gap noted above.
