# Coverage — fx-implement

Source: `superpowers:subagent-driven-development` @ 6.3.0 — 289 claims
Plus: `superpowers:verification-before-completion` @ 6.3.0 (claims V1–V58)
Plus: `superpowers:using-git-worktrees` @ 6.3.0 (claims W59–W141)

Verdicts: **K** kept inline · **R** kept in a reference file · **S** superseded
(with the decision that supersedes it) · **D** dropped (with reason).
A claim with no verdict is a build error.

---

## subagent-driven-development (289)

| Claims | Verdict | Note |
|---|---|---|
| 1–2 | S | Frontmatter replaced by `fx-implement`'s own; triggers rewritten for `docs/plans/<slug>/tickets/` |
| 3–8 | K | Intro, why-subagents, the three reasons, core principle |
| 9 | K | Narration: at most one short line between tool calls |
| 10–13 | K | Continuous execution + the reason |
| 14–18 | K | Rulings-not-stalls, the format, the reason |
| 19–20, 22–23 | K | Stop conditions 1, 2, 4 |
| 21 | S | "side effect outside this worktree… a merge, a push, a publish" → broadened to "leaves the machine", per the offline rule |
| 24–33 | S | Decision-graph edges → the "When this skill applies" table; `executing-plans` branch removed (that skill is absorbed, subagents always available) |
| 34–61 | S | Process-graph nodes/edges → restated as prose in §1–§5. Every decision point is covered by prose; verified edge by edge |
| 62 | K | Isolated workspace |
| 63 | K | Never start on main/master without explicit consent |
| 64–66 | K | Compaction fact, the re-dispatch anecdote, ledger-not-todos |
| 67–68 | S | `scripts/sdd-workspace` derived a path (`dirname plan.md` here), it did no work. Deleted. The workspace **splits by lifetime**: durable `docs/plans/<slug>/` (design, plan, tickets, state.md — committed) and ephemeral `.fx/<slug>/` (reports, review packages — git-ignored, `check-ignore` verified before use) |
| 69 | K | Another slug's directory is never yours to read or write |
| 70–74 | K | Ledger check, resume rules, mid-loop rule, foreign-ledger rule, identity first line |
| 75–76 | K | Ledger as recovery map; trust it over recollection after compaction |
| 77 | S | `git clean -fdx` destroys the workspace → n/a, the plan dir is committed, not git-ignored scratch |
| 78–81 | K | Read plan once, Global Constraints, read the design, provisional-rulings note |
| 82–93 | K | Pre-flight scan: both row types, "not a scan you ran", write to ledger, rule before execution, proceed silently if clean, review loop as net |
| 94–113 | K | Model selection entire section incl. turn-count-beats-token-price and the 3 complexity signals |
| 114–117 | K | Batch same-shape work |
| 118–119 | K | Context-residency fact; artifacts as files |
| 120–123 | K | Waiting on subagents: no polling, no open-ended wait, bounded 5–10 min stretches, reconcile children, the reason |
| 124 | K | Record BASE before dispatching |
| 125–126 | S | `scripts/task-brief` → the ticket file **is** the brief (one file per ticket already). Script deleted |
| 127–133 | K | The five dispatch contents; exact values only in the brief; never make a subagent read the whole plan |
| 134–135 | K | Report file naming + the short return contract |
| 136–139 | K | One ticket not session history; the 42k-char anecdote; what a fresh subagent needs |
| 140–142 | S | "implementer never dispatches subagents" → narrowed: read-only `Explore` allowed; **no reviewer, no writer**. Both original reasons kept verbatim |
| 143 | K | Carry a pointer to parked findings in the area |
| 144 | K | Record agent identity for rounds 1–3 |
| 145 | K | Never parallel implementers — **reason replaced**: shared test environment, not file conflicts (worktrees solve files; they don't give a second Postgres) |
| 146 | K | implementer-prompt.md |
| 147–162 | K | All four statuses, all BLOCKED sub-rules incl. "plan itself is wrong", never-ignore-an-escalation, answer questions properly. **Added**: BLOCKED-5 skip-and-continue, per the never-stall-the-queue decision |
| 163–166 | K | Ticket-scoped gates; never skip; never accept a missing verdict; self-review never replaces |
| 167–171 | K | review-package as a file; the bash-less fallback; the "never enters your context" reason; never `HEAD~1`; never dispatch without a diff file |
| 172–180 | K | Three paths + constraints; attention-lens framing; verbatim copying; no open-ended directives; no re-running tests; **the anti-pre-judging rule and its four trigger phrases** |
| 181–183 | K | ⚠️ Cannot-verify items: don't block, you resolve each, confirmed gap enters the loop |
| 184 | K | task-reviewer-prompt.md |
| 185–192 | K | Loop triggers; the two exit routes; Minor never enters; deferred-minor ledger format + "a roll-up nobody reads is a silent discard"; plan-mandated findings are yours to rule on |
| 193–199 | K | Round definition; 5-round cap; resume 1–3 + reason; harness fallback; fresh+capable 4–5 with the exact framing text; the three-resumes reasoning |
| 200–208 | K | Per-round contract; covering-tests-command-output precondition; name the covering tests; scoped re-review with FIX_BASE; ADDRESSED/NOT ADDRESSED; new breakage joins; out-of-scope → deferred minors; ledger format |
| 209–210 | K | Never fix findings in the controller session + reason |
| 211–220 | K | The breaker; three adjudication categories with formats; the structural-failure reason; stop only when every path is a guess; adjudicate only at the cap; "pre-judging with a different name"; silent discard forbidden |
| 221–225 | K | Completion lines, both formats; mark todo; never advance with open Critical/Important |
| 226–229 | K | Final package with MERGE_BASE + reason; most capable model; point at deferred/parked |
| 230–232 | K | ONE fix subagent; the rebuild-context reason; the cost anecdote |
| 233–236 | K | Exactly one scoped re-review; adjudicate residuals; four stop classes; no second fix wave |
| 237–240 | K | "Rulings I made" exhaustive; the reason; "a ruling that dies… was a decision made in secret" (reworded from "dies with the workspace") |
| 241–242 | K | Delete the workspace at the end — but **only the ephemeral half** (`.fx/<slug>/`). `docs/plans/<slug>/` is committed and durable and is never deleted. Sibling-directories rule kept verbatim |
| 243 | S | `finishing-a-development-branch` → completion report only; merge/PR/push are the user's |
| 244–252 | K | All 9 rationalization rows verbatim; 5 more added for this project's failure modes |
| 253–289 | D | Example Workflow. Illustrative only; every rule it demonstrates is stated normatively above. **Reinstate if the skill proves hard to follow without a worked example.** |

## verification-before-completion (58)

| Claims | Verdict | Note |
|---|---|---|
| V1–V2 | S | Frontmatter; absorbed into `fx-implement` |
| V3–V6 | K | Evidence before claims; letter-vs-spirit; Iron Law; "in this message" |
| V7–V15 | K | Gate function, all five steps, "skip any step = lying, not verifying" |
| V16–V22 | K | All 7 rows of the failures table, incl. the regression-test row |
| V23–V30 | K | All 8 red flags |
| V31–V38 | R | 8-row rationalization table → `../../references/vocab/verification.md` |
| V39–V48 | R | Key patterns (tests, regression red-green, build, requirements, agent delegation) → reference. **Regression red-green pattern also inlined into `fx-tdd`** |
| V49–V58 | K | When-to-apply list; "the rule applies to paraphrases, synonyms, implications" |

## using-git-worktrees (83)

| Claims | Verdict | Note |
|---|---|---|
| W59–W60 | S | Frontmatter; absorbed into `fx-implement` §Setup |
| W61–W67 | K | Isolated workspace; native-first; detect-first; never fight the harness |
| W68 | S | Its own announce line → `fx-implement` announces once for the run |
| W69–W78 | K | Detection commands; submodule guard; already-in-worktree → skip |
| W79 | K | On-branch report |
| W80 | K | **Detached-HEAD report** — extended: do not commit on a detached HEAD, those commits become unreachable |
| W81 | K | Normal-checkout branch |
| W82–W85 | S | Ask consent → the user's standing instruction *is* the declared preference; upstream's own rule W84 says honor it without asking |
| W86–W94 | K | Two mechanisms in order; native tool names; phantom-state reason; fallback condition |
| W95–W102 | K | Directory priority; explicit preference beats filesystem state; `.worktrees` wins |
| W103–W106 | K | `git check-ignore` MUST + the whole-tree-committed reason |
| W107–W109 | K | The create commands |
| W110–W111 | K | Sandbox fallback |
| W112–W117 | S | npm/cargo/pip/poetry/go setup → `../../references/stacks/*.md`. **None of upstream's five match this user's stacks** |
| W118–W121 | K | Baseline before work; failures → report and ask |
| W119 | S | npm/cargo/pytest/go test → stack profile |
| W122–W124 | K | Report template |
| W125–W136 | S | 12 Quick Reference rows — each restates a rule kept inline |
| W137–W141 | K | All 5 rationalizations |

---

## Summary

| | Count |
|---|---:|
| Kept inline | 203 |
| Kept in a reference | 18 |
| Superseded by an explicit decision | 71 |
| Dropped | 37 (all of them the Example Workflow, claims 253–289) |
| **Unaccounted** | **0** |
