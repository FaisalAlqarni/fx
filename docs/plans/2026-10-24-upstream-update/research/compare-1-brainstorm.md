# Compare 1: brainstorm, spec and domain

fx at `/development/fx` main dd99986. superpowers at v7.0.1 (2ce8aa1). mattpocock-skills at master 5beb35b. Labels on mattpocock ideas: "1.3.0", "1.3.1" or "master" (unreleased).

## 1. Files read

### superpowers (skills/brainstorming, v7.0.1)

| File | Lines | How read |
|---|---:|---|
| SKILL.md | 294 | every line |
| builder-check-prompt.md | 23 | every line |
| visual-companion.md | 299 | full `diff` against fx's copy, every differing line read |
| scripts/server.cjs | 723 | `git diff v6.3.0 HEAD` (one line changed), function inventory diffed against fx `src/.../server.cts` (722), branding and telemetry block read |
| scripts/start-server.sh | 209 | `diff` against fx (fx changes are its own path scheme) |
| scripts/stop-server.sh | 120 | `diff` against fx |
| scripts/helper.js | 167 | function inventory diffed against fx `helper.ts`; no upstream change since 6.3.0 |
| scripts/frame-template.html | 213 | `diff` against fx: identical |
| v6.3.0 tree listing | n/a | to find `spec-document-reviewer-prompt.md` (present at 6.3.0, now deleted) |

### mattpocock-skills (master 5beb35b)

| File | Lines |
|---|---:|
| skills/productivity/grilling/SKILL.md | 30 |
| skills/productivity/grilling/agents/openai.yaml | 3 |
| skills/productivity/grill-me/SKILL.md | 7 |
| skills/productivity/grill-me/agents/openai.yaml | 5 |
| skills/productivity/wait-what/SKILL.md | 7 |
| skills/productivity/wait-what/agents/openai.yaml | 5 |
| skills/engineering/grill-with-docs/SKILL.md | 7 |
| skills/engineering/grill-with-docs/agents/openai.yaml | 5 |
| skills/engineering/to-spec/SKILL.md | 75 |
| skills/engineering/to-spec/agents/openai.yaml | 5 |
| skills/engineering/domain-modeling/SKILL.md | 74 |
| skills/engineering/domain-modeling/GLOSSARY-FORMAT.md | 60 |
| skills/engineering/domain-modeling/ADR-FORMAT.md | 47 |
| skills/engineering/domain-modeling/agents/openai.yaml | 3 |
| `domain.md` (setup-matt-pocock-skills, consumed by every skill) | 51 |
| CHANGELOG.md lines 28 to 36, 136 to 138 (rename and wait-what notes) | n/a |
| base 30204e6 `CONTEXT-FORMAT.md` lines 30 to 60 (to check what fx absorbed) | n/a |
| `git diff 30204e6 HEAD` stat for all area skills | n/a |

### fx (dd99986)

| File | Lines |
|---|---:|
| skills/fx-brainstorm/SKILL.md (17,542 bytes) | 369 |
| skills/fx-brainstorm/COVERAGE.md | 129 |
| skills/fx-brainstorm/visual-companion.md | 302 |
| skills/fx-brainstorm/scripts/* (server.cjs 602, helper.js 146, start 362, stop 125, frame 213) | 1,448 (by diff, as above) |
| src/skills/fx-brainstorm/scripts/server.cts (source of server.cjs) | 722 (lines 100 to 260, 395 to 405 read) |
| references/design-template.md | 88 |
| references/vocab/grilling.md | 81 |
| references/vocab/domain-modeling.md | 165 |
| commands/fx-grill.md | 65 |
| commands/fx-setup.md | 284 (lines 1 to 4, 80 to 110, 260 to 284 read; the rest is not about CONTEXT.md) |
| skills/fx-setup/SKILL.md (generated from the command) | 287 (diffed against the command) |
| skills/fx-setup/agents/openai.yaml | 6 |
| docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md | 19 |
| docs/adr/0045-one-design-checkpoint.md | 15 |
| src/tests/gates/brainstorm-confidence.test.ts | 40 |
| src/hooks/fx-context.ts lines 79 to 122 (SessionStart notice path) | n/a |
| Whole-repo grep for `CONTEXT.md`, `CONTEXT-MAP`, `CONTEXT-FORMAT`, `context.md` (case-insensitive) outside docs/plans | see section 5 |

Not read line by line: the bodies of upstream `server.cjs` and fx `server.cts` beyond the parts listed (compared by diff and function inventory; the only behavioural differences are the `$`-replace fix and fx's removal of remote branding and telemetry).

## 2. Findings per upstream skill

Verdict key: GAP (fx gap), UP (upstream better), FX (fx better), EQ (equivalent), NA (not applicable).

### 2.1 superpowers brainstorming SKILL.md (v7.0.1)

Upstream drift since 6.3.0 is the largest in this area: rewritten in 7.0.0 and again in 7.0.1. Its stated evidence (release notes): v7.0.0 questions "felt formulaic"; in a test scenario the agent skipped the design doc 24 of 24 times before 7.0.1 and 3 of 24 after.

| # | Upstream | fx | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| B1 | "Look Before You Ask" (SKILL.md:38-45): read what they referred to and what it connects to, "keep reading until you can explain how the relevant parts work today and what this change would touch. Never ask what the project or their context already answers." | §2 (SKILL.md:87-89): "Check the current state: files, docs, recent commits." Facts rule at :141-148 covers lookups during rounds. | UP | fx's §2 has no stop condition, so exploration ends when the agent feels ready. Upstream's test ("can I explain how it works today and what this touches") is checkable and is what makes the first question specific. | In fx-brainstorm §2 replace line 89 with: "Read what the user pointed at and the code it connects to, and keep reading until you can say how the relevant parts work today and what this change would touch. Never ask what the repo already answers." | S |
| B2 | First message when they already said what they want (SKILL.md:51-63): echo the request back in your own words (what, who for, why), add what you found that bears on it, "If you found something they may not have considered that would change what they're asking for... like a constraint, a conflict, or a cheaper path, say so plainly." End with one line inviting corrections, then the one question that would most change what gets built. "Specs are often incomplete, so confirm before you build on one." | §1 (SKILL.md:24-27) announces the classification; §3 starts rounds. No echo of the request, no explicit "say the cheaper path before asking". | GAP | The echo is the cheapest point to catch a misread request: one message before any round. The "cheaper path" clause is the YAGNI check at the moment it costs nothing; fx only applies YAGNI to approaches (§5:249). | Add to §1 after line 27: "In the same first message, restate the request in your own words (what, for whom, why) with what you found that changes it: a constraint, a conflict, or a cheaper path. Then start the first round." Keep the classification line. | S |
| B3 | "Get them describing" (SKILL.md:98-101): open questions first, "Their own words carry intent that your options can't. Offer a short menu only when they're stuck." Red flag (:267): "I'll offer a menu of what they might want: Options steer." | §3 (SKILL.md:113-117) and grilling.md:38-44: AskUserQuestion, "Prefer multiple choice where it fits". | UP (partly) | fx's multiple-choice-first rule anchors the user on the agent's guesses about *what* they want; the recommendation-first option makes it worse for intent questions. For *how* decisions (fx's main use) multiple choice with a recommendation is right and fast. | In §3 and grilling.md "How to ask": "Questions about what the user wants and why: open-ended, in their words. Questions about how to build it: multiple choice with your recommendation first." | S |
| B4 | "How it gets made" (SKILL.md:103-111): find out which choices (platform, language, libraries) they want to make, which they hand to you; "Any choice you make goes in the design as your call, never as something they agreed to." Red flag (:268): "A default they never heard is one they couldn't reject." | Confidence check item 1 (SKILL.md:167-168) names "any assumption still standing"; item 3 ties every output to an answer. No marking of the agent's own calls in design.md. | GAP | In a 40-line design the reader cannot tell which decisions the owner made and which the agent filled in. The one review of the file (ADR 0045) is only as good as the reviewer's ability to find the agent's calls. | design-template.md: under Implementation Decisions add "Mark each decision the user did not make as *(my call: <reason>)*." fx-brainstorm §8 review message: "...seams included, and the decisions marked as my call". | S |
| B5 | "Ground to cover" (SKILL.md:113-122): why now, what success looks like, "goals, non-goals, and anti-goals (what would make this a failure even if it technically works)", prior art. | §3:159 "purpose, constraints, success criteria"; template has Out of Scope (:206-208). No anti-goals, no prior art from elsewhere. | GAP | Anti-goals are the failure mode a passing test suite will not catch (for example, a measurement feature that works but leaks PII across organizations). Out of Scope is not the same thing: it lists omitted features, not unacceptable outcomes. | design-template.md: add one line in Problem Statement or a short `## Anti-goals` section: "What would make this a failure even if every test passes." §3:159 add "anti-goals". | S |
| B6 | Socratic questions (SKILL.md:124-132): build each question on the last answer or a finding; "say what you're hoping to learn or what the answer would change. A proposal they can correct, plus your reason for it, often beats a question." | grilling.md:32-34: recommendation with a one-line reason on every question. | EQ (nearly) | fx already gives a reason for the recommendation. Upstream adds the reason for *asking* (what the answer changes), which tells the user how much care the answer needs. | grilling.md "Round size": add "and, when not obvious, what the answer would change." | S |
| B7 | "Offer recon" (SKILL.md:134-137): offer to look deeper; "They decide whether you go." | Facts are your job (SKILL.md:141-146): dispatch Explore without asking, do not block. | FX | For code facts the owner wants autonomy; asking permission to read the repo costs a turn. Upstream's rule targets non-software work and the web. | None. Keep fx. | n/a |
| B8 | "Lay out the approaches" (SKILL.md:139-148): generate several, drop weak ones including any that work against why they want it; present two or three grounded in what the project does; recommend one; "When there's genuinely one sensible way, say so and explain why the others don't fit." In a message of its own. | §5 (SKILL.md:243-250) and step 4: 2 to 3 approaches in the confidence message (ADR 0045, owner decision). | UP (one clause) | The message placement is an owner decision; keep it. The "one sensible way" clause matters: forcing 2 to 3 approaches on a bounded-looking architectural task produces straw-man options that waste review attention. | §5: append "When there is one sensible way, say so and say why the others do not fit, instead of inventing alternatives." | S |
| B9 | The design doc has an **Approaches** part (SKILL.md:198-201, 216): "the two or three ways you considered building it, what each trades off, which one they picked, and why." | design-template.md has no approaches section. The rejected approaches live only in chat, lost on compaction. | GAP | fx-review, fx-plan and fx-devils-advocate re-suggest a rejected approach because the file does not say it was rejected. Same reason the ADR format records non-obvious rejections. | design-template.md: add `## Approaches` after Solution: "The 2 to 3 approaches considered, one line of trade-off each, the one chosen and why." Update fx-brainstorm COVERAGE. | S |
| B10 | "Play It Back" (SKILL.md:170-186): every 200 to 300 words describe one understood part back; "Only what they said goes in as theirs. Anything you filled in goes in as your proposal, with your reason." | ADR 0045 cut checkpoints to one confidence message and one file review. Confidence item 1 cites evidence but does not split "you said" from "I inferred". | UP (the marking only) | Chunked playback contradicts ADR 0045; do not adopt. The theirs/mine split is cheap and makes the confidence message auditable. | §3 confidence item 1: "...each tied to the decision it settled, split into what the user said and what you inferred." | S |
| B11 | "Size the Work" (SKILL.md:188-206): a design doc for every size, short for a small change. 7.0.1 evidence: doc skipped 24/24 before, 3/24 after. | Bounded path: "No design doc, no plan" (SKILL.md:40-41); design lives in chat. | UP (evidence) | fx keeps the `**Approved:**` line in the file precisely because chat does not survive compaction (ADR 0045). A bounded design approved in chat is gone after compaction mid-implementation, so the implementer has nothing to check against. | Option for the owner: bounded path writes a short `docs/plans/YYYY-MM-DD-<slug>/design.md` (Problem, Approach, Files, Seams, `**Approved:**`), no plan. Needs an ADR amending 0045 and a test update. Do not adopt silently. | M |
| B12 | Builder check (SKILL.md:228-245, builder-check-prompt.md:1-23): a fresh subagent reads the design as "a talented [domain] engineer" who cannot talk to the author, reports only questions where "a wrong guess would matter", ranked. Controller sorts into answered (put in doc), minor (settle, mark as own call), theirs (one message to user, most important first). "That's the only round of questions the check produces." | §8 self-review (SKILL.md:317-334) by the same agent that wrote the doc. fx-devils-advocate design mode exists but brainstorm never dispatches it; fx-plan offers red-team only at plan time. | GAP | A writer cannot see its own assumed context; a fresh reader can. It is also cheap: questions only, no rewrite. It fits ADR 0045: the "theirs" pile rides in the one review message, so it adds no checkpoint. It is the strongest new idea in the area. | New file `skills/fx-brainstorm/builder-check-prompt.md` (adapted: "software engineer on this repo", path to design.md, report questions only, "nothing important left"). Architectural checklist step 6 becomes "Self-review it, then the builder check (§8)". §8: three-pile sort, theirs pile goes into the one review message, minor answers marked "my call" (pairs with B4). Without a subagent tool, read it as that builder yourself. Update brainstorm-confidence test regex for step 6. | M |
| B13 | Hard gate (SKILL.md:247-261) lists "installing dependencies, creating projects" and exempts opted-out sessions and approved spikes. | HARD-GATE (SKILL.md:17-22) applies to every path; no opt-out. | FX | Owner rule: the approval never scales down. Upstream's opt-out ("just dive in", :77-82) would remove the gate. | None. Optionally add "installing dependencies" to fx's gate list. | S |
| B14 | First-turn trivial request (SKILL.md:22-24): "Everything that matters is in the request... Do it, and say what you did." | fx sends stated-behavior helpers to fx-tdd via the description (:9-10); otherwise bounded with approval. | EQ | Covered by routing. | None. | n/a |
| B15 | "Never use process jargon. You never need to quote this skill" (SKILL.md:88-92); red flag "I should explain the process first: Ask your question" (:270). | §1 says announce the classification ("this looks bounded, so..."). | EQ | fx's announcement is one plain line by owner choice so it can be overridden. Keep, but the upstream rule supports keeping it to that line. | None. | n/a |
| B16 | Description widened to non-software work (SKILL.md:3). | `/fx:fx-grill` owns decisions not heading for code (fx-grill.md:22-26). | FX | One claimant per intent. | None. | n/a |
| B17 | Design doc location committed (SKILL.md:224-226). | Not committed (SKILL.md:314-315). | NA | Owner rule. | None. | n/a |
| B18 | At 6.3.0 the folder had `spec-document-reviewer-prompt.md`; deleted in 7.0.0, replaced by the builder check. | fx COVERAGE.md lists only SKILL.md, visual-companion.md and scripts for superpowers; the reviewer prompt has no row. | GAP (records) | COVERAGE says "A claim with no verdict is a build error"; one source file was never accounted for. Moot now that upstream replaced it, but the B12 adoption should be recorded. | COVERAGE.md: add a row "spec-document-reviewer-prompt.md (6.3.0): X, unused by 6.3.0 SKILL.md; superseded upstream by builder-check-prompt.md, adopted in B12". | S |

### 2.2 superpowers visual companion and scripts

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| V1 | server.cjs:264 `replace('<!-- CONTENT -->', () => content)` (7.0.0 fix: content inserted literally). | `src/skills/fx-brainstorm/scripts/server.cts:251` and built `server.cjs:201` still `replace('<!-- CONTENT -->', content)`. | GAP (bug) | `String.replace` with a string interprets `$&`, `$'`, `` $` ``. A mockup fragment holding JS or a price string like `$'` or a regex with `$&` is silently corrupted in the browser. | server.cts:251 use `() => content`; rebuild server.cjs; add a case to `src/tests/gates/brainstorm-server.test.ts` serving a fragment that contains `$&` and `$'` and asserting it comes back verbatim. Through fx-tdd. | S |
| V2 | Offer text without the cost warning (SKILL.md:284); 7.0.0 dropped "token-intensive". | Offer keeps "It's still new and can be token-intensive" (SKILL.md:195-197). | EQ | Either is fine; fx's warning is honest. Owner call. | None, or drop the clause to match upstream. | S |
| V3 | Remote logo from primeradiant.com and telemetry env vars (server.cjs:106-112, 244-251); "use actual images (Unsplash)" in visual-companion.md. | No remote fetches; images local or labelled placeholders (fx visual-companion.md, "Use real content"); brand markup is local text. | FX | Local-only, nothing leaves the machine (owner rule). | None. | n/a |
| V4 | n/a | fx still labels the page "Superpowers v<fx version>" (server.cts:238) and the title "Superpowers Brainstorming" (frame-template.html:5); version read by `readSuperpowersVersion()` from fx's own package.json. | GAP (cosmetic) | The owner sees another product's name with fx's version number. | Rename the label to "fx brainstorm v<version>" and the function to `readPluginVersion`; title "fx brainstorm". COVERAGE row 122 says the template is verbatim: note the change. | S |
| V5 | Session files under `.superpowers/brainstorm/`, `/tmp` without project dir. | Mockups in `docs/plans/<slug>/companion/`, state in `.fx/<slug>/companion/` with `.fx/.gitignore` `*`, refuses its own skill dir. | FX | Mockups travel with the plan; session keys cannot be committed. | None. | n/a |

### 2.3 mattpocock grilling (1.3.0 and master)

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| G1 | "Ask the whole frontier in one round" (grilling/SKILL.md:8). | 2 to 4 related questions, one topic (grilling.md:25-30; COVERAGE row 129: owner decision). | FX (owner decision) | Upstream has not answered fx's reason (whole frontier is a scattergun); AskUserQuestion caps at 4 anyway. | None. | n/a |
| G2 | Round template with `---` between questions (SKILL.md:10-22), 1.3.0. | Numbered text fallback for hosts without a question tool (grilling.md:42). | EQ | Readability of the opencode fallback only. | grilling.md:42: "numbered text, one recommendation per question, a horizontal rule between questions." | S |
| G3 | "Word each question so 'yes' accepts your recommended answer." (SKILL.md:24), master, not yet released. | AskUserQuestion puts the recommendation first, labelled "(Recommended)" (grilling.md:38-40). Fallback has no such rule. | EQ with tool / GAP in fallback | In text, a one-word "yes" accepting a whole round only works if each question is worded that way. | grilling.md fallback line: "Word each question so 'yes' accepts your recommendation." | S |
| G4 | Facts by subagent, do not block (SKILL.md:28); done when frontier empty (:30). | Same, plus the written open-questions ledger (grilling.md:46-61). | FX | The ledger stops tangents burying branches. | None. | n/a |

### 2.4 grill-me and grill-with-docs (1.3.0)

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| GM1 | grill-me: user-invoked wrapper, "Call the Skill tool with 'grilling'" (SKILL.md:7). | `/fx:fx-grill` command (fx-grill.md) with an explicit boundary: never classifies, never writes artifacts, hands code work to fx-brainstorm. | FX | Prevents a second claimant for "let's build". | None. | n/a |
| GD1 | grill-with-docs: grilling plus domain-modeling, writing glossary terms and ADRs as decisions crystallise (SKILL.md:3, 7). | fx-grill "never writes ... any other artifact" (fx-grill.md:33-39). fx-brainstorm does load domain-modeling (SKILL.md:150-157). | GAP (small) | A `/fx:fx-grill` session on, say, how the business defines a "conversion" settles domain terms and then throws them away, because the command may not write. A glossary entry is not a work artifact. | fx-grill.md "Running it": "In a repo with a `GLOSSARY.md`, a term that resolves goes into it per `../references/vocab/domain-modeling.md`; an ADR is offered under its three tests. Nothing else is written." Adjust the "never" list to "never writes design.md, plan.md, tasks or code". | S |

### 2.5 to-spec (1.3.0)

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| S1 | "Do NOT interview the user; just synthesize what you already know" (SKILL.md:7). | Superseded: brainstorm always interviews (COVERAGE row 146). | UP (for one case) | When a long conversation or a prior `/fx:fx-grill` already settled the frontier, fx-brainstorm repeats rounds the owner already answered. The confidence check already has the right test (ledger empty, nothing rests on a guess). | §3 before "Close the interview": "If the conversation already settled every frontier question, skip the rounds: go to the confidence check and cite where each decision was settled." | S |
| S2 | Seams: prefer existing, highest, ideal is one, "Check with the user" (SKILL.md:15-17). | §6 (SKILL.md:296-304), confirmed in the one review. | EQ | ADR 0045 moved the confirmation into the file review. | None. | n/a |
| S3 | "A LONG ... extremely extensive" user stories (SKILL.md:33-41). | "complete for the feature's behaviour... no story is padding" (design-template.md:168-169), ADR 0045. | FX | Padding wastes the owner's single review. | None. | n/a |
| S4 | Template: Problem, Solution, User Stories, Implementation Decisions, no paths or snippets with prototype exception, Testing Decisions, Out of Scope, Further Notes (SKILL.md:21-75); unchanged since 1.2.3. | All kept, plus Glossary line, Global Constraints, Open Questions (design-template.md). | FX | Global Constraints feed fx-plan and fx-review. | None (B5, B9 add Anti-goals and Approaches). | n/a |
| S5 | Publish to tracker with `ready-for-agent` label (SKILL.md:19). | `Status: ready-for-agent` line in design.md. | EQ | Same signal, local file. | None. | n/a |

### 2.6 domain-modeling, GLOSSARY-FORMAT.md, ADR-FORMAT.md (1.3.0)

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| D1 | Rename to `GLOSSARY.md` / `GLOSSARY-MAP.md` (1.3.0). | `CONTEXT.md` / `CONTEXT-MAP.md` throughout. | owner decided | See section 5. | Section 5. | M |
| D2 | GLOSSARY-FORMAT.md:32-60: the **map format** (`## Contexts` with link and one-line purpose, `## Relationships` with direction and the events or shared types between contexts), the inference rules (map exists, root only, neither), and "When multiple contexts exist, infer which one the current topic relates to. If unclear, ask." Present at 1.2.3 too (CONTEXT-FORMAT.md:32-60 at 30204e6). | domain-modeling.md:24-37 shows only the directory tree. No map format, no Relationships section, no "if unclear, ask". COVERAGE.md:105 marks the whole CONTEXT-FORMAT.md as kept (D). | GAP (silent drop) | Advantage is multi-engine. Without the Relationships format the map is a link list, and cross-engine flows (which the owner's medium-term goal of one customer record depends on) are written nowhere in the domain docs. The COVERAGE claim is wrong. | domain-modeling.md: add "## GLOSSARY-MAP.md format" with the upstream block (adapted to engines) and the three inference rules plus "if unclear, ask". Fix COVERAGE.md row 105. | S |
| D3 | Description triggers on "discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR" (SKILL.md:3), 1.3.0. | domain-modeling.md is a reference reached only from brainstorm, architecture, plan. No lane or preamble rule fires when the user says "add this to the glossary" or "write an ADR for this". | GAP | Outside those lanes, an ADR gets written in whatever shape the model likes and a glossary entry gets implementation detail. | One line in an existing always-loaded place is too costly (preamble must stay short). Cheapest: add "record an ADR", "add to the glossary" to fx-architecture's description ("where should the seam go" already lives there) with a pointer to domain-modeling.md. Or accept the gap. Owner call. | S |
| D4 | domain.md:47-51: "If your output contradicts an existing ADR, surface it explicitly rather than silently overriding: *Contradicts ADR-0007..., but worth reopening because...*" | domain-modeling.md:246: "An ADR in the area you're touching records a decision not to re-litigate." | UP | fx's rule can make an agent quietly bend a design around a stale ADR. Upstream keeps the ADR's weight but lets a stated reason reopen it in the open. | domain-modeling.md:246 append: "If your work needs to contradict it, say so explicitly with the reason, and let the user decide whether to reopen it." | S |
| D5 | domain.md:11: missing glossary or ADRs, "proceed silently. Don't flag their absence; don't suggest creating them upfront." | fx-setup writes CONTEXT.md only from answers; report notes it is written when the first term resolves (fx-setup.md:92-101, 278). Lazy creation in domain-modeling.md:41. | EQ | Same intent. | None. | n/a |
| D6 | Active vs passive, challenge, sharpen, scenarios, cross-reference with code, update inline, glossary only, ADR three tests, qualifying list, ADR template and optional sections (SKILL.md:8-74, ADR-FORMAT.md:1-47). | domain-modeling.md:1-246 keeps all, with engine examples. | EQ | Upstream changes since 1.2.3 are punctuation and the rename only. | None beyond D1. | n/a |

### 2.7 wait-what (added in 1.2.x per CHANGELOG.md:136; GLOSSARY-MAP follow added in 1.3.0)

| # | Upstream | fx | Verdict | Why | Change | Size |
|---|---|---|---|---|---|---|
| W1 | User-invoked one-liner (SKILL.md:7): "I don't understand where you've got to here. Re-pitch that: a little bit of context, ASD-STE100 Simplified Technical English, and the ubiquitous language from `GLOSSARY.md` (follow `GLOSSARY-MAP.md`...)." CHANGELOG:138: concision skills fail by growing; naming the listener's state asks for fewer words and the missing context together. | Absent. fx-humanize rewrites prose for people but is a rewrite lane, not a "you lost me" corrective; the preamble's prose rules apply to every reply. | GAP (new intent) | The owner already asks for plain prose; this is the one-word way to enforce it on a reply that missed. It is a distinct intent (re-pitch the last message), so it does not compete with fx-humanize (rewrite a text). | New `commands/fx-what.md` (or `fx-wait-what.md`), `disable-model-invocation: true`, body is the upstream sentence with `GLOSSARY.md` and "no dashes, plain words, lead with the point". Commands do not count against lane budgets. | S |

## 3. Ideas fx has that upstream lacks (keep them)

- Path classification (spike, bounded, architectural) with a one-way ratchet and "bounded measures the repo, not your familiarity" (fx-brainstorm SKILL.md:24-47, 357).
- Approval never scales down: every path ends in an explicit yes (SKILL.md:17-22, 364-369). Upstream lets an opted-out session skip the gate.
- Written open-questions ledger, tangents only add (SKILL.md:122-139, grilling.md:46-61). Neither upstream writes the frontier down.
- 95% confidence check with evidence, two-line plan, and every output tied to the answer that settled it (SKILL.md:161-180, ADR 0033).
- One design checkpoint and the `**Approved:**` line in the file, which survives compaction and lets fx-plan skip the restate (ADR 0045).
- Design for isolation and Working in existing codebases (SKILL.md:262-294), dropped upstream in 7.0.0.
- Prose check that routes the design through fx-humanize (SKILL.md:329-332).
- Prototype as a mid-interview tool for behavioural questions, distinct from the visual companion (SKILL.md:226-241).
- Global Constraints and Open Questions sections in the design template (design-template.md:199-214).
- `/fx:fx-grill` boundary: decisions not heading for code, hands code work to fx-brainstorm (fx-grill.md:16-41).
- fx-setup writes the glossary only from the user's answers, never inferred from code (fx-setup.md:92-101, 266-268): the glossary can then catch the code drifting.
- Visual companion local-only, mockups stored with the plan, session secrets un-committable (fx visual-companion.md "Where files go").

## 4. Top recommendations (ranked)

1. Fix the `$&` / `$'` corruption in the companion server (`server.cts:251`, `() => content`) with a regression test. Rests on V1.
2. Rename CONTEXT to GLOSSARY with a SessionStart notice and an fx-setup migration step, never creating a GLOSSARY.md beside an existing CONTEXT.md (section 5). Rests on D1.
3. Add the builder check to the architectural path, folding its "theirs" pile into the one review message so ADR 0045 holds. Rests on B12.
4. Add `## Approaches` (considered, trade-off, chosen, why) to design-template.md so rejected options stop being re-suggested. Rests on B9.
5. Mark the agent's own calls in design.md as "(my call: reason)", and split the confidence message into what the user said and what was inferred. Rests on B4, B10.
6. Restore the GLOSSARY-MAP format with Relationships and "if unclear, ask" in domain-modeling.md, and correct COVERAGE row 105. Rests on D2.
7. First message restates the request and names any constraint, conflict or cheaper path; exploration stops only when the agent can explain how it works today. Rests on B1, B2.
8. Skip the rounds when the conversation already settled the frontier, going straight to the confidence check with citations. Rests on S1.
9. Intent questions open-ended, how-questions multiple choice; add anti-goals to the template. Rests on B3, B5.
10. Add `/fx:fx-what` (wait-what) as a user-only command, and let `/fx:fx-grill` write glossary terms. Rests on W1, GD1.

Owner decisions to put rather than adopt: B11 (a short design.md for bounded tasks; upstream's 24/24 to 3/24 evidence) and D3 (which lane, if any, claims "write an ADR").

Byte budget: fx-brainstorm SKILL.md is 17,542 bytes, 2,458 under the 20,000 cap. B1, B2, B3, B8, B10, S1 and the B12 step text together add roughly 1,700 bytes. To keep headroom, move "Design for isolation and clarity" (SKILL.md:262-281, about 1,100 bytes) into `references/vocab/codebase-design.md` or the design template, loaded at §6 where it is used.

## 5. Plan: rename CONTEXT.md / CONTEXT-MAP.md to GLOSSARY.md / GLOSSARY-MAP.md

### 5.1 Upstream's approach (1.3.0, commit 006a52b, CHANGELOG.md:31-33)

A hard cut. Every skill that reads or writes the files was changed in one release (domain-modeling, grill-with-docs, improve-codebase-architecture, setup's `domain.md`, triage, tdd, diagnosing-bugs, ask-matt, codebase-design, wait-what, pr), `CONTEXT-FORMAT.md` was renamed `GLOSSARY-FORMAT.md`, and users were told in the changelog only: "If you have an existing `CONTEXT.md` (or `CONTEXT-MAP.md`)... `git mv` it to the new name: the skills only look for `GLOSSARY.md`/`GLOSSARY-MAP.md` going forward." No fallback read, no detection, no migration tool. The skills' "proceed silently" rule (domain.md:11) means an unmigrated repo just loses its glossary without a warning.

### 5.2 The risk for fx users

The owner's own repo `/development/advantage-backend` has `CONTEXT-MAP.md`, root `CONTEXT.md` and five engine files (`engines/{core,engagement,measurement,shortlink,survey}/CONTEXT.md`), plus references in `CLAUDE.md`, `repo.md`, `docs/agents/domain.md` and `tasks/todo.md`. Under a hard cut:
- Every lane silently stops reading the glossary (fx-brainstorm, fx-architecture, fx-tdd, fx-debug, fx-plan, fx-audit all read it).
- Worse, domain-modeling.md's "create files lazily" tells the agent to create a new root `GLOSSARY.md` when the first term resolves, beside the existing `CONTEXT.md`. Two glossaries then diverge, and nothing reconciles them.

### 5.3 Every fx file that names CONTEXT.md or CONTEXT-MAP.md (outside docs/plans)

| File | Lines | Change |
|---|---|---|
| references/vocab/domain-modeling.md | 7, 17, 24, 29, 33, 36, 41, 47, 62, 65, 69 | Rename all; heading "GLOSSARY.md format"; add the map format (D2) and the guard in 5.4 |
| skills/fx-brainstorm/SKILL.md | 152, 157 | Rename |
| references/design-template.md | 5, 19 | Rename (`**Glossary:** <path to the relevant GLOSSARY.md...>`) |
| skills/fx-architecture/SKILL.md | 28, 44, 56, 118, 119, 154, 156 | Rename |
| skills/fx-tdd/SKILL.md | 131 | Rename |
| skills/fx-debug/SKILL.md | 85 | Rename |
| skills/fx-plan/SKILL.md | 90 | Rename |
| skills/fx-audit/SKILL.md | 154, 159 | Rename |
| references/vocab/codebase-design.md | 278 | Rename |
| commands/fx-setup.md | 2, 92, 94, 266, 278 | Rename, plus the migration step in 5.4 |
| skills/fx-setup/SKILL.md | 4, 95, 97, 269, 281 | Generated: rerun `scripts/gen-command-skills`, never hand-edit (header line 6 says so) |
| skills/fx-setup/agents/openai.yaml | 4 | Generated with the skill (description); regenerate |
| README.md | 112 | Rename |
| INSTALL.md | 304 | Rename |
| skills/fx-brainstorm/COVERAGE.md | 8, 99, 100, 103, 104, 105 | Keep upstream source names as they were at 1.2.3 (`CONTEXT-FORMAT.md` is a true historical name); change fx-side wording to GLOSSARY and add one note line: "Renamed to GLOSSARY.md / GLOSSARY-MAP.md per ADR 00NN, following mattpocock 1.3.0." |
| skills/fx-architecture/COVERAGE.md | 21, 27, 43, 101, 122 | Same treatment |
| skills/fx-debug/COVERAGE.md | 72 | Same |
| skills/fx-tdd/COVERAGE.md | 74 | Same |
| skills/fx-humanize/COVERAGE.md | 58 | Same |
| docs/adr/0016-harness-facts-are-a-fourth-layer.md | 38 | Leave: ADRs are historical. The new ADR records the rename |

Not affected: `src/tests/gates/fx-json-notice.test.ts:15,39,53` and its built `.js` use a variable named `CONTEXT` for the `fx-context.js` hook path, not the file. Hooks, agents and PREAMBLE.md name neither file. No test currently pins the string.

### 5.4 Recommendation for existing user repos

Do better than upstream's changelog note, but keep the lanes clean of fallback logic (six lanes would otherwise each grow an "or CONTEXT.md" clause).

1. **Lanes name only `GLOSSARY.md` / `GLOSSARY-MAP.md`.** No fallback text in skills.
2. **One guard in domain-modeling.md** (the only place that creates the file): "If `CONTEXT.md` or `CONTEXT-MAP.md` exists and its GLOSSARY counterpart does not, do not create a new file: stop and tell the user to run `/fx:fx-setup`, which renames it." This removes the two-glossaries failure.
3. **Detection once per session, in code, not prose.** `src/hooks/fx-context.ts` already emits a SessionStart notice for `.fx.json` changes (lines 79-122). Add a sibling check in `lib/` that returns a notice when the cwd repo root has `CONTEXT.md` or `CONTEXT-MAP.md` and no `GLOSSARY.md` / `GLOSSARY-MAP.md`: "This repo still uses CONTEXT.md; fx now reads GLOSSARY.md. Run /fx:fx-setup to rename it." A gate test with a fixture repo covers both states. Remove the check after a stated period (say two minor versions), noted in the ADR.
4. **fx-setup does the migration**, on the user's yes, as a numbered step before writing the glossary: list every `CONTEXT.md` found (root, and each file the map links to), `CONTEXT-MAP.md`, the links inside the map, and every file that names them (`CLAUDE.md`, `AGENTS.md`, `repo.md`, `docs/**`, excluding `docs/plans/` and `docs/adr/`); show the list; on approval rename with plain `mv` (git detects the rename at commit; `git mv` would touch the index, and the user runs git), rewrite the map's links and the references, and print what changed. Never commit. For the owner's repo that is 7 files moved, the map's 5 links rewritten, and `CLAUDE.md`, `repo.md`, `docs/agents/domain.md` updated.
5. **New ADR** (next free number, 0053 at dd99986): "The domain glossary is GLOSSARY.md", context (upstream 1.3.0 renamed it; "context" collided with harness context, PREAMBLE context and the `fx-context` hook), decision (names, guard, notice, setup migration, sunset), consequences (COVERAGE notes, ADR 0016 left as history).
6. **Gate test**: no file outside `docs/plans/`, `docs/adr/` and `*/COVERAGE.md` contains `CONTEXT.md` or `CONTEXT-MAP`; `domain-modeling.md` contains the guard sentence; `commands/fx-setup.md` contains the migration step.

Size: M overall (about 20 files of one-word edits, one hook check with a test, one setup step, one ADR).
