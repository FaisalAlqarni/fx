# Brainstorm, design and plan: measured runs

fx 0.2.9 (main plus the confidence check's outputs item), 2026-10-22.

## Method

- Feature: invoice approval in a 13-file Rails seed app (Team, User, Invoice, a Pundit policy, a CSV export, request and policy specs). Nothing was executed.
- One headless Claude Code session per run, `--model opus`, fx loaded with `--plugin-dir`, the question tool disabled so questions arrive as text, edits allowed in the work directory only.
- A Haiku persona played the user from a fixed brief: it answered only what it was asked, said "your call, take the recommended option" for anything outside the brief, and approved when asked.
- A run ended when plan.md and the task files existed and the session's turn ended.
- Tokens are summed from the session transcript, deduplicated by request id. A phase runs from its start to the first write of design.md (brainstorm), then to the fx-plan invocation (design), then to the end (plan). Persona tokens are counted separately.
- A Sonnet judge, the same prompt for every run, checked 13 requirements and 7 contradictions against design.md and, separately, against the task files only.

## Results

| Run | Opening request | Brainstorm | Design | Plan | Total | Owner stops | Questions | Tasks | Criteria | Requirements in design | Requirements in tasks | Contradictions |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| g1 | the feature request | 498,263 tokens, 3.6 min | 243,153, 0.9 min | 504,214, 3.6 min | 1,245,630, 8.1 min | 6 | 12 | 7 | 30 | 12/13 | 13/13 | 0 |
| g2 | the request plus "write a design doc and then a plan" | 562,489, 3.4 min | 324,418, 1.3 min | 976,002, 4.5 min | 1,862,909, 9.2 min | 7 | 13 | 6 | 25 | 13/13 | 13/13 | 0 |

- g1's design states the CSV status column but not that the export still lists every invoice (R09); its tasks carry it.
- Persona tokens: g1 55,554, g2 69,968.
- Times include the persona's replies.
