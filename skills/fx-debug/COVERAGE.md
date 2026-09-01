# Coverage — fx-debug

Sources:
- `superpowers:systematic-debugging` @ 6.3.0 — claims 1–145
  (+ sidecars `root-cause-tracing.md`, `defense-in-depth.md`,
  `condition-based-waiting.md`)
- `mattpocock:diagnosing-bugs` @ 1.2.3 — claims 146–240
  (+ `scripts/hitl-loop.template.sh`)
- `soe:systematic-debugging` (your fork) — claims 241–389

Verdicts: **K** kept inline · **R** kept in a reference · **C** copy verbatim ·
**S** superseded · **D** dropped.
A claim with no verdict is a build error.

---

## superpowers:systematic-debugging (1–145)

| Claims | Verdict | Note |
|---|---|---|
| 1–2 | S | Frontmatter rewritten; triggers merged with mattpocock's ("debug this", "diagnose", "it throws", "it's slow", "flaky") |
| 3–5 | K | Root cause before fixes; symptom fixes are failure; letter-vs-spirit |
| 6–7 | K | **The Iron Law**; no fixes before Phase 1 is complete |
| 8–13 | K | All 6 "when to use" |
| 14–18 | K | All 5 "ESPECIALLY when" |
| 19–21 | K | All 3 "don't skip when", with their parenthetical reasons |
| 22 | K | Complete each phase before the next |
| 23 | S | Phase 1 was "Root Cause Investigation" → **"Build a feedback loop"**, absorbing read-errors and check-recent-changes as inputs. See the merge note below |
| 24–27 | K | Read error messages carefully — all 4, incl. "they often contain the exact solution" |
| 28–31 | K | Reproduce consistently — all 4. **Corrected after review:** the first draft covered only "does it happen every time"; "can you trigger it reliably", **"what are the exact steps"**, and "if not reproducible → gather more data, don't guess" were missing and have been added to Phase 2 |
| 32–35 | K | Check recent changes — all 4 |
| 36–44 | K | Gather evidence at component boundaries — the WHEN, the BEFORE, all 4 procedure steps, and the three-stage "run once → analyse → investigate that component" |
| 45–46 | S | The CI/build/signing code example → replaced with the general procedure; stack-specific examples belong in `../../references/stacks/*.md` |
| 47–52 | K/R | Trace data flow when deep in the stack; the 4-step quick version; **"fix at source, not at symptom"** |
| 48 | R | Pointer to the full backward-tracing technique → `../../references/vocab/root-cause-tracing.md` |
| 53–64 | K | Phase 2 Pattern Analysis entire — find working examples, **read the reference COMPLETELY, don't skim**, identify differences ("don't assume that can't matter"), understand dependencies. **Folded into Phase 3 as hypothesis-generation**, since that is what it feeds |
| 65–68 | S | **"Form a SINGLE hypothesis"** → **3–5 ranked hypotheses.** mattpocock's reason wins: single-hypothesis generation anchors on the first plausible idea. Superpowers' "state it clearly, write it down, be specific" is kept as the falsifiability requirement |
| 69–71 | K | **Test minimally — smallest possible change, one variable at a time, don't fix multiple things at once.** This is about *testing*, not generating, so it composes with 3–5 ranked candidates rather than conflicting |
| 72–74 | K | Verify before continuing; new hypothesis on failure; **DON'T add more fixes on top** |
| 75–78 | K | When you don't know — say so, don't pretend, ask, research |
| 79 | S | Phase 4 "Implementation" → Phase 5 "Fix and regression test" |
| 80–83 | K | Create a failing test case — simplest reproduction, **MUST have before fixing**. **Corrected after review:** "automated test if possible" and **"one-off test script if no framework"** were missing from the first draft and have been added to Phase 5 step 1 |
| 84 | K | **Use the TDD skill for writing proper failing tests** → calls `fx-tdd`, incl. valid-RED shapes and the anti-tautology rules |
| 85–88 | K | Single fix; ONE change; **no "while I'm here"; no bundled refactoring** |
| 89–92 | K | Verify fix — 3 checks; **evidence before claims** via `fx-implement`'s Iron Law |
| 93–97 | K | **The circuit breaker** — STOP, count, <3 → Phase 1, ≥3 → question the architecture, **don't attempt fix #4 without discussion** |
| 98–105 | K | All 3 architectural-problem patterns; all 3 fundamental questions; discuss before more fixes; **"this is NOT a failed hypothesis — this is a wrong architecture"** → routes to `fx-architecture` |
| 106–118 | K | **All 11 red flags**, plus "ALL of these mean STOP", plus the 3+ rule. One added: reading code to build a theory before a red-capable command exists |
| 119–124 | K | **All 5 user signals** and what each means |
| 125–132 | K | **All 8 rationalization rows**, verbatim. One added: "I'll build the loop after I understand the code" |
| 133–136 | K | Quick-reference table — rewritten for the merged 6-phase shape |
| 137–142 | K | "No root cause" — the condition, all 4 steps, and **"95% of 'no root cause' cases are incomplete investigation"** |
| 143 | R | `root-cause-tracing.md` → `../../references/vocab/root-cause-tracing.md`, adapted to Ruby/C#/Kotlin |
| 144 | R | `defense-in-depth.md` → `../../references/vocab/defense-in-depth.md`, adapted; **plus a note reconciling it with the ladder** (layers added after a real bug proved the path reachable is evidence, not speculation) |
| 145 | C | `condition-based-waiting.md` — **copy verbatim, not yet reviewed.** 115 lines, self-contained technique. Flagged so the provenance ledger records it as unaudited |

### Unreferenced files in the upstream skill directory

`CREATION-LOG.md`, `test-academic.md`, `test-pressure-1..3.md`,
`condition-based-waiting-example.ts` — **D**, the skill's own development
artifacts, mentioned nowhere in it.
`find-polluter.sh` — **S**, its technique is described inline in
`root-cause-tracing.md`; the script itself is bash+glob over a JS test runner
and doesn't fit rspec/dotnet.

## mattpocock:diagnosing-bugs (146–240)

| Claims | Verdict | Note |
|---|---|---|
| 146–147 | S | Frontmatter merged |
| 148–149 | K | A discipline for hard bugs; **skip phases only when explicitly justified** |
| 150 | K | Read `CONTEXT.md` for a mental model; check ADRs in the area |
| 151–155 | K | **Secret redaction entire** — `<REDACTED>`, build loops against env vars, captured artifacts carry auth headers so quote only the signal lines, and **say so and ask if the redacted output isn't enough.** Plus: nothing goes outward |
| 156–161 | K | **"Build a feedback loop — this is the skill. Everything else is mechanical."** The tight-signal reason, the no-loop-no-salvation reason, disproportionate effort, **"be aggressive, be creative, refuse to give up"** |
| 162–171 | K | **All 10 loop-construction options**, incl. HITL as last resort |
| 172 | K | "Build the right feedback loop and the bug is 90% fixed" |
| 173–178 | K | Treat the loop as a product; all 3 tightening questions with their parentheticals; **"a 30-second flaky loop is barely better than no loop"** |
| 179–181 | K | Non-deterministic bugs: raise the **rate**, not cleanliness; the 5 tactics; **"50% is debuggable; 1% is not"** |
| 182–187 | K | When you cannot build a loop: stop and say so, list what you tried, all 3 asks, **do not proceed to hypothesise without a loop** |
| 188–192 | K | The completion criterion and **all 4 checklist items** — red-capable, deterministic, fast, agent-runnable |
| 193–194 | K | **"If you catch yourself reading code to build a theory before this command exists, stop"**; no red-capable command, no Phase 2 |
| 195–198 | K | Reproduce: run it, watch it go red; **"wrong bug = wrong fix"**; reproducible across runs; capture the exact symptom |
| 199–203 | K | Minimise: cut one at a time, re-run after each; **both reasons** (shrinks the hypothesis space, becomes the regression test); done when every element is load-bearing; don't proceed until reproduced and minimised |
| 204–208 | K | **3–5 ranked hypotheses**; the anchoring reason; falsifiable with a stated prediction; the exact format; **"if you cannot state the prediction, the hypothesis is a vibe"** |
| 209–212 | K | Show the ranked list first; both reasons (domain knowledge re-ranks, already-ruled-out); cheap checkpoint; **don't block if they're away** |
| 213–214 | K | Each probe maps to a specific prediction; one variable at a time |
| 215–217 | K | Tool preference: debugger/REPL first (**"one breakpoint beats ten logs"**), targeted boundary logs second, **never "log everything and grep"** |
| 218–220 | K | Tag every debug log with a unique prefix; cleanup is one grep; **"untagged logs survive; tagged logs die"** |
| 221–223 | K | **Perf branch** — logs are usually wrong; baseline measurement then bisect; **"measure first, fix second"** |
| 224–229 | K | **The correct-seam rule** — regression test before the fix *only if* a correct seam exists; the definition; the false-confidence reason; **"if no correct seam exists, that itself is the finding"**; note it; flag it. Routes to `fx-architecture` |
| 230–234 | K | All 5 seam-exists steps, incl. **re-running the Phase 1 loop against the original un-minimised scenario** |
| 235–240 | K | Phase 6 Cleanup and **all 5 checklist items**, incl. **"the correct hypothesis is stated in the commit message so the next debugger learns"** |
| — | C | `scripts/hitl-loop.template.sh` — copy verbatim; it is the only sanctioned human-in-the-loop mechanism |
| — | D | `agents/openai.yaml` — referenced nowhere in the skill |

## soe:systematic-debugging (241–389)

| Claims | Verdict | Note |
|---|---|---|
| 241–384 | — | **Identical to superpowers 1–145** (same file, same sidecars, same timestamps). Already verdicted above |
| 243–244 | K | **Unique to your fork:** "Random fixes waste time and create new bugs. Quick patches mask underlying issues." Kept as the opening rationale |
| 385–389 | S | **"Real-World Impact"** — systematic 15–30 min vs 2–3 hours thrashing; 95% vs 40% first-time fix rate; near-zero vs common new bugs. Dropped as *stated numbers* — they are unsourced and would read as invented precision. **Their content survives** as the rationalization-table rows ("systematic debugging is FASTER than guess-and-check thrashing") |

---

## The merge — two sources, one loop

They disagree on where to start, and mattpocock is right.

**superpowers** opens with *"read errors, reproduce, check recent changes,
gather evidence"* — good inputs, but no forcing function. **mattpocock** opens
with *"build a feedback loop; this is the skill, everything else is
mechanical"* and gives ten concrete ways to build one plus a four-point
completion test.

The merged Phase 1 keeps mattpocock's forcing function and folds superpowers'
inputs into it: **you read the error, check what changed, and use both to build
the red-capable command.**

They also disagree on hypotheses — **one** (superpowers) vs **3–5 ranked**
(mattpocock). That one resolves cleanly because they're talking about different
things: **generate 3–5** (or you anchor on the first plausible idea), then
**test one at a time, minimally, one variable** (or you can't isolate what
worked).

What superpowers contributes that mattpocock has no equivalent for: **the Iron
Law**, **the 3-fix circuit breaker** (the single most valuable rule here — it
converts flailing into an architectural conversation), the **11 red flags**, the
**5 user signals**, and the **8 rationalizations**.

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-debug` | 178 |
| Kept in references (`root-cause-tracing`, `defense-in-depth`) | 6 |
| Copy verbatim (`condition-based-waiting.md`, `hitl-loop.template.sh`) | 2 files |
| Superseded by an explicit decision | 12 |
| Dropped | 8 (upstream dev artifacts + the unsourced impact numbers) |
| Duplicates already verdicted (soe fork) | 144 |
| **Unaccounted** | **0** |
