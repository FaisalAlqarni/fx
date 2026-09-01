# Coverage — fx-architecture

Sources (all `mattpocock-skills` @ 1.2.3):
- `improve-codebase-architecture` — SKILL.md + `HTML-REPORT.md`
- `codebase-design` — SKILL.md + `DEEPENING.md` + `DESIGN-IT-TWICE.md`
- `domain-modeling` — covered in `fx-brainstorm/COVERAGE.md`

Verdicts: **K** kept inline · **R** kept in a reference · **H** kept in
`HTML-REPORT.md` · **S** superseded · **X** dropped.

---

## improve-codebase-architecture

| Claim | Verdict | Note |
|---|---|---|
| Frontmatter name/description | S | Rewritten; adds the `fx-review` boundary ("for a DIFF, use fx-review") |
| `disable-model-invocation: true` | S | Model-invocable, but with a **structural-verb trigger list only** — restructure, shallow, deepen, where should the seam go, hard to test, audit the architecture. The cheap half (the vocabulary) is a reference, so routine design questions never reach this skill |
| Surface friction, propose deepening opportunities, aim is testability and AI-navigability | K | |
| Built on the codebase-design vocabulary; use the terms exactly; don't drift to component/service/API/boundary | K | |
| **"The domain language in `CONTEXT.md` gives names to good seams"** | K | **Restored** |
| **"ADRs record decisions this command should not re-litigate"** | K | **Restored** — a standing constraint on the whole scan, not just the ADR-conflict paragraph |
| Scope before you scan: YAGNI | K | |
| Deepening pays off on future change → weight recently-changed code; decide where to look before you look | K | |
| User named a direction → take it, skip the inference | K | |
| `git log --oneline` hot spots; scattered → widen the net | K | |
| Read `CONTEXT.md` and area ADRs first | K | + `CONTEXT-MAP.md` routing and "never scan every engine at once" |
| Spawn a sub-agent to walk the codebase; explore organically, no rigid heuristics | K | |
| All 5 friction questions | K | |
| The deletion test; "concentrates" is the signal | K | |
| **"Write to the OS temp directory so nothing lands in the repo"** | K/H | **Restored** — the reason, not just the rule. Two prior runs left files in `/development` |
| **`$TMPDIR` → `%TEMP%` (Windows) → `/tmp`** | K/H | **Restored** — cross-platform |
| **`architecture-review-<timestamp>.html`, fresh per run** | K/H | **Restored** |
| Open it (`xdg-open` / `open` / `start`) and tell them the absolute path | K/H | + **WSL** (`explorer.exe "$(wslpath -w …)"`), and "print the path regardless" for silent open failures |
| Tailwind + Mermaid via CDN | H | Kept. Noted: needs a connection to render; nothing about the repo leaves the machine |
| Mix Mermaid with hand-crafted CSS/SVG; when to use which; **collapse animations** | H | |
| Each candidate gets a before/after visualisation | H | |
| Card fields: Files · Problem · Solution · Benefits · Before/After · strength badge | K/H | |
| **Benefits "explained in terms of locality and leverage, and how tests would improve"** | K | **Restored** — without it, benefits degrade to "cleaner code" |
| **Before/After "side-by-side, custom-drawn, illustrating the shallowness and the deepening"** | K/H | **Restored** |
| Top recommendation section | K/H | |
| `CONTEXT.md` vocabulary for the domain, codebase-design for the architecture; the Order-intake-module example | K/H | |
| ADR conflicts: surface only when the friction warrants reopening; mark clearly; don't list every theoretical refactor | K | |
| Pointer to HTML-REPORT.md | K | |
| **Do NOT propose interfaces yet**; ask "which would you like to explore?" | K | |
| Grilling loop on the chosen candidate: constraints, dependencies, shape, what's behind the seam, which tests survive | K | Now via `../../references/vocab/grilling.md` — clustered rounds, interactive question tool |
| Side effects inline via domain-modeling; all 4 bullets (new term → add; fuzzy term → update; rejection → offer an ADR; alternatives → design-it-twice) | K | |
| — | K | **Added:** handoff to `fx-plan`, incl. expand–contract for wide refactors. Upstream ends at the grilling loop with no route to implementation |

### HTML-REPORT.md

| Content | Verdict |
|---|---|
| Scaffold (Tailwind CDN, Mermaid ESM, the `.seam`/`.leak`/`.deep` custom layer) | H |
| Header: repo, date, compact legend, **no intro paragraph** | H |
| Candidate card: all 8 fields, badge palette, `font-mono text-sm` | H |
| **"If the diagram needs a paragraph to be understood, redraw the diagram"** | H |
| All 5 diagram patterns — Mermaid graph (with the code sample), hand-built boxes, cross-section, mass diagram, call-graph collapse | H |
| Style guidance: editorial not dashboard, one accent + red + amber, ~320px, `text-xs uppercase tracking-wider`, only-two-scripts | H |
| Top recommendation: one card, name, one sentence, anchor | H |
| Tone: the 10 exact terms, the 4 never-substitutes, the 4 fitting phrasings | H |
| **Wins bullets in glossary terms; never "easier to maintain" or "cleaner code"** | H |
| "If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it." | H |

## codebase-design → `../../references/vocab/codebase-design.md`

| Content | Verdict |
|---|---|
| The 7-term glossary with every *Avoid* list | R |
| Deep vs shallow ASCII diagrams and the three interface questions | R |
| Depth is a property of the interface, not the implementation; internal vs external seams | R |
| **The deletion test** — vanishes vs reappears across N callers | R |
| **The interface is the test surface** | R |
| **One adapter = hypothetical seam, two = real** | R |
| Designing for testability: accept dependencies, return results, small surface area | R |
| The 6 relationship statements | R |
| All 3 rejected framings (depth-as-ratio, interface-as-keyword, boundary) | R |
| TypeScript examples | S → rewritten in Ruby |

## DEEPENING.md → `../../references/vocab/codebase-design.md` (*Deepening*)

| Content | Verdict |
|---|---|
| All 4 dependency categories with their testing consequence | R |
| The ports-and-adapters recommendation shape, verbatim | R |
| Seam discipline: one-vs-two adapters, **"a single-adapter seam is just indirection"** | R |
| Internal vs external seams; don't expose internal seams through the interface | R |
| **Replace, don't layer** — delete the old unit tests, test at the interface, assert observable outcomes, **"if a test has to change when the implementation changes, it is testing past the interface"** | R + also inlined in `fx-architecture` |

## DESIGN-IT-TWICE.md → `../../references/vocab/codebase-design.md` (*Design It Twice*)

| Content | Verdict |
|---|---|
| Ousterhout framing: your first idea is unlikely to be the best | R |
| Step 1: frame the problem space — constraints, dependency category, illustrative sketch (**not a proposal**) | R |
| **Show it, then immediately proceed — the user reads while the agents work** | R |
| Step 2: 3+ parallel agents, each a **radically different** interface | R |
| Separate technical brief per agent, **independent of the user-facing explanation** | R |
| All 4 constraint prompts, verbatim | R |
| **Include both codebase-design and CONTEXT.md vocabulary in every brief** | R |
| The 5 required outputs per agent | R |
| Step 3: present sequentially, compare in prose by depth/locality/seam placement | R |
| Your own recommendation; propose a hybrid if elements combine; **"be opinionated: the user wants a strong read, not a menu"** | R |

---

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-architecture` | 28 |
| Kept in `HTML-REPORT.md` | 24 |
| Kept in `../../references/vocab/codebase-design.md` | 31 |
| Superseded by an explicit decision | 4 |
| Dropped | 0 |
| **Unaccounted** | **0** |

## The six the hand-audit caught, all restored

1. ADRs record decisions **not to re-litigate**
2. `CONTEXT.md`'s domain language **names good seams**
3. Temp dir **"so nothing lands in the repo"** — the reason, not just the rule
4. `%TEMP%` on Windows · `start` · the timestamped filename — cross-platform
5. Benefits **in terms of locality and leverage, and how tests improve**
6. Diagrams **custom-drawn, illustrating the shallowness and the deepening** ·
   collapse animations

## And one correction to the earlier draft

The draft proposed publishing the report as an **Artifact**. That sends your
architecture — module names, file paths, domain vocabulary — to claude.ai.
Removed entirely; the report is a local temp file opened in a local browser.
