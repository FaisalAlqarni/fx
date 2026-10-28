# Proof results: Codex model catalog and Codex render

Run 2026-10-28 by the fx-implement controller after the exit gate passed on `e41cc79` (fx 0.8.0). Protocol: design.md, "Proof protocol".

## Setup

- Codex CLI 0.164.0, OpenRouter, one first turn per run, prompt `prompts/baseline.txt` ("Managers need to approve invoices before they get paid. Can we add that?").
- Seed: `/tmp/claude-1000/fx-codex/proof/seed` (the Ledgerly e2e repo plus an invoices migration), copied fresh per run.
- Runner: `proof/run.sh`, which sources the tree's `tests/conformance/lib/live.sh` (jail, scratch home, key file, `with-key.sh`, fx install, OpenRouter config), trusts the hooks the way `/hooks` does, and runs `codex exec`. A1, A3 and R run the build's `node lib/codex-catalog.js setup` inside the jail with the key, then `codex --profile fx-openrouter exec`.
- Builds: A0 and A1 install fx 0.7.0 (`ce1fb19`); A3 and R install this branch (`192b007`, fx 0.8.0).
- Analysis: `proof/analyze.py` reads each rollout and the work tree. A lane counts as opened only when the `SKILL.md` path in the call exists on disk. "Code before design" means code files changed and no `design.md` was written before the first code write.

## Results

| Arm | Build | Runs | Usage block | New wording | Opened fx-brainstorm first | Opened any lane | Wrote code before design | Wrong-path lane reads | Calls before first opened lane |
|---|---|---|---|---|---|---|---|---|---|
| A0 | 0.7.0, no catalog | 10 Haiku | 0/10 | 0/10 | 8/10 | 9/10 | 2/10 | 2 runs (`~/.codex/skills/.system/...`) | 12 to 38, median 15.5 |
| A1 | 0.7.0 render, catalog via profile | 10 Haiku | 10/10 | 0/10 | 7/10 | 8/10 | 3/10 | 0 | 12 to 58, median 14.5 |
| A3 | the build: catalog via profile plus new render | 10 Haiku | 10/10 | 10/10 | 9/10 | 10/10 | 1/10 | 0 | 4 to 17, median 13 |
| R1 | the build | 3 `anthropic/claude-sonnet-5.5` | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 0 | 0, 0, 0 |
| R2 | the build | 3 `openai/gpt-6.1-sol` | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 0 | 0, 0, 0 |

All 36 runs exited 0.

## Against the pass bars

- A3, lane entered in at least 9/10: 10/10. Pass.
- A3, no code before a design in at least 9/10: 9/10. Pass. The one miss, run a3-3, opened fx-tdd and wrote 9 code files by heredoc; fx's hooks printed no `[fx]` line, which is the stated limit for Anthropic models on OpenRouter (ADR 0065).
- A3, 0/10 wrong-path reads: 0. Pass. A0 had 2 runs that guessed `~/.codex/skills/.system/fx-brainstorm/SKILL.md`; one of them (a0-9) never opened a lane and wrote 10 code files.
- R1, no regression from e3a: 3/3 opened fx-brainstorm as the first call and wrote no code. Pass.
- R2, no regression from e3b: 3/3 opened fx-brainstorm as the first call and wrote no code. The catalog gave the model `apply_patch_tool_type: freeform`, but no run wrote a file, so "`apply_patch` called as a tool on any write" and "the `[fx]` lane-check line on a code write" were not exercised.
- Ordering, reported without a bar: the median number of calls before the first opened lane was 13 in A3 against 15.5 in A0. Haiku still reads about a dozen files before its lane, as the spike predicted, but the range narrowed (A3 maximum 17, A0 38).

## Reading

- The catalog entry alone (A1) did not help Haiku here: 7/10 brainstorm first and 3/10 code before design, against A0's 8/10 and 2/10. With 10 runs per arm, a difference of one run is noise.
- The A0 baseline in this run (2/10 code before design) is better than the earlier 4/6. A0 and A3 differ by one run on code before design; the clearer effect of the build is the absence of wrong-path lane reads and every run opening a lane.
- Writes by Anthropic models on OpenRouter stay invisible to fx: A0, A1 and A3 together made 76 heredoc writes, 0 `apply_patch` calls and 1 `[fx]` line.

## Key handling and spend

- The key reached each run only through `with-key.sh`; it was held in an environment variable by the runner and never printed.
- Key scans (`python3 -I tools/scrub.py`) after each of the 37 runs (36 plus one smoke run): 1 hit per run, 37 in total, each the run's own `live.sh` key file under `keytmp/`, redacted. A final scan of the whole proof directory found 0.
- OpenRouter spend for the proof, smoke run included: USD 3.45 (usage 21.0784 before, 24.5279 after), under the USD 8 stop.
