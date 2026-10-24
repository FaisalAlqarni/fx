# Before and after benchmarks

Status: run 2026-10-24, results in "Results" below.

What this measures: the two live benches fx already has, run once on the base
checkout (before) and once on this branch with your local judge (after).

- `tests/lane-triggering`: 17 prompts, one fx lane each (or none), scored by
  whether the model invoked the right lane.
- `tests/review-bench`: 9 planted-defect cases, scored by whether fx's task
  reviewer flagged the defect.

The review bench after-run is a no-regression check: the review helpers feed lenses, not the task reviewer this bench measures. The helpers' accuracy is the `review-*` rows in `scores.md`.

## Before you start

1. Two checkouts of fx: the base (the commit this branch was cut from, 402e983)
   and this branch (`judge-across-fx`). Run "before" in the base checkout and
   "after" here. Use `git worktree add` for the base, in a directory of your
   own choosing.
2. Your judge running on loopback, for example `nimble:9b` on Ollama at
   `http://127.0.0.1:11434`.
3. A `judge.json` for it, for example:

   ```json
   {"base_url":"http://127.0.0.1:11434","model":"nimble:9b"}
   ```

   Keep it outside the repository. `<judge.json path>` below is its path.
4. Both benches run inside the conformance jail, with a scratch `HOME`. The
   review bench goes through `tests/conformance/run.sh`, so
   `FX_LIVE_PROVIDER=openrouter` and `OPENROUTER_API_KEY` put it on Haiku 4.5
   through OpenRouter as ADR 0038 sets up. `tests/lane-triggering/run-test.sh`
   does not read `FX_LIVE_PROVIDER`: it copies your Claude Code login into its
   scratch home, so it runs on that account and its default model. Before and
   after must use the same login, and the model name goes in the results table.

`FX_BENCH_JUDGE=<path>` copies that file to `$HOME/.config/fx/judge.json`
inside each run's scratch home and nowhere else. Without it, nothing changes.
The "before" runs leave it unset, so they run with no judge.

## Pilot: one prompt first

The jail shares the host's network namespace, so loopback should work, but
check before spending a full run. On this branch:

```sh
FX_BENCH_JUDGE=<judge.json path> tests/lane-triggering/run-test.sh fx-tdd tests/lane-triggering/prompts/fx-tdd.txt
```

Then look in the judge server's own request log (for Ollama, its server log or
`journalctl -u ollama`) for requests made during that minute. At least one
request means the jail let the judge through. None means the port is blocked,
the judge config was not found, or the lane hint skipped the judge for this
prompt: run it once more with a second prompt, such as
`tests/lane-triggering/prompts/fx-debug.txt`, before concluding anything. The
scratch home, and the decision log inside it, is removed when the run ends, so
the server log is the evidence.

## Before: base checkout, no judge

```sh
tests/lane-triggering/run-all.sh
```

```sh
OPENROUTER_API_KEY=<your key> FX_LIVE_PROVIDER=openrouter tests/review-bench/run.sh 3 judge-before
```

`run-all.sh` prints one PASS, FAIL or SKIP line per prompt and a tally. Any
SKIP means a prompt exercised nothing: fix the cause and rerun. `run.sh`
writes `docs/plans/2026-09-23-lean-build/runs/bench-judge-before.json` and
refuses to overwrite an existing file.

## After: this branch, with the judge

```sh
FX_BENCH_JUDGE=<judge.json path> tests/lane-triggering/run-all.sh
```

```sh
OPENROUTER_API_KEY=<your key> FX_LIVE_PROVIDER=openrouter FX_BENCH_JUDGE=<judge.json path> tests/review-bench/run.sh 3 judge-after
```

The result lands in `bench-judge-after.json` next to the first.

## What to compare

- Lane triggering: the PASS count out of 17 before and after, and which
  prompts changed. The three `none__` prompts must stay PASS, since the hint
  must not fire for them. The model decides each run, so one prompt flipping
  once is noise; repeat a flipped prompt a few times before reading it.
- Review bench: per case, caught out of 3 and false positives out of 3, before
  and after. After must not catch fewer. Nine cases at three reps each is a
  small sample, so a difference of one or two catches is inside the noise.

## Results

Run 2026-10-24. Before: base `402e983`. After: `judge-across-fx` at `cb4e685`
(code `e028c3f`). Judge: `nimble:9b` at `127.0.0.1:11434`. Scripts and raw
results stayed in the session scratchpad.

| bench | before | after | judge |
|---|---|---|---|
| lane-triggering (PASS of 17, 3 reps) | 51/51 | 51/51 | Claude Code default model on the owner's login; nimble:9b after |
| review-bench (defects caught of 24, false positives of 27) | 16, 1 | 18, 1 | Haiku 4.5 through OpenRouter; nimble:9b after |

### Labelled sets (accuracy)

Rerun of every set in `sets/`: every row matches `scores.md` exactly (lane-hint
85%, dispatch-sizing 94%, edit-rules 97% aggregate, review-tripwires 100%,
review-authored 83%, review-search 97%). The qwen3.8-27b server on 8899 cannot
be a judge: it serves the OpenAI chat API, not `/v1/systemone`.

### Offline hooks: decisions

Claude Code hook events sent as stdin data to each checkout, 2 interleaved runs
per setup. Corpus: the 17 lane prompts (x3 passes), the 52 labelled dispatches,
25 Write edits for the built-in rules (11 should refuse, 14 benign), 20
read-only shell calls.

| | before | after, no judge | after, nimble | after, judge down |
|---|---|---|---|---|
| lane hint shown | 0 of 51 | 0 | 42 of 51, 33 right lane | 0 |
| dispatches lowered to haiku | 0 | 0 | 18 of 52 | 0 |
| bad edits refused | 1 of 11 | 11 of 11 | 11 of 11 | 11 of 11 |
| benign edits refused | 0 of 14 | 2 of 14 | 2 of 14 | 2 of 14 |

- Wrong hints, every pass: `fx-architecture` hinted `fx-tdd`,
  `fx-authoring` hinted `fx-review`, and `none__shell-oneliner` (should get no
  hint) hinted `fx-humanize`.
- Dispatch sizing lowered all 16 small edits, and 2 of 5 security-labelled
  dispatches: "Audit session handling" (read as a lookup) and "Rotate the API
  key" (read as a small edit). Lookups (Explore) already ran on haiku and are
  untouched.
- Benign edits refused by the built-ins: a SpinKit class `sk-folding-cube-large`
  (matches the `sk-` vendor key shape) and a doc showing a conflict example
  inside a code fence.

### Offline hooks: speed

Hook wall time in ms, p50 / p95.

| event | before | after, no judge | after, nimble | after, closed port | after, hung judge |
|---|---|---|---|---|---|
| user prompt | 29 / 34 | 37 / 44 | 169 / 190 | 40 / 63 | 41 / 1550 |
| Agent dispatch | 31 / 35 | 35 / 43 | 116 / 127 | 40 / 57 | 43 / 1550 |
| Write | 31 / 37 | 42 / 55 | 41 / 136 | 41 / 49 | 44 / 57 |
| read-only shell | 39 / 47 | 43 / 52 | 40 / 47 | 41 / 49 | 43 / 51 |

A hung judge costs 1.5 s on each of the first 3 prompts and first 3 dispatches
of a session; then the breaker opens and the cost drops to the no-judge level.
(A first harness run showed 10.6 s; that was the fake server never accepting
inside a blocked process. Rerun against a separate server: 1.5 s.)

### Live: lane triggering

17 prompts x 3 reps x before and after = 102 sessions, run 3 at a time.

| | before | after |
|---|---|---|
| right lane (or none) | 51/51 | 51/51 |
| cost | $10.31 ($0.206 per session) | $10.88 ($0.213) |
| mean turns | 3.28 | 3.31 |
| duration median | 13.4 s | 15.8 s |

The before side already passed every prompt, so this set cannot show the hint
helping; it shows the hint, including its 3 wrong lanes, did not cost a pass.

### Live: review bench

9 cases (8 planted defects and a control) x 3 reps x before and after = 54
reviewer sessions on Haiku 4.5 through OpenRouter. Results in
`docs/plans/2026-09-23-lean-build/runs/bench-judge-{before,after}.json`.

| case | before | after |
|---|---|---|
| cli-inline-search | 2/3 | 2/3 |
| empty-throws | 2/3, 1 FP | 3/3 |
| missing-returns-empty | 1/3 | 2/3 |
| path-dotdot-only | 1/3 | 2/3 |
| path-no-check | 2/3 | 3/3 |
| readme-binary | 3/3 | 1/3, 1 FP |
| search-case-sensitive | 2/3 | 2/3 |
| search-query-only | 3/3 | 3/3 |
| control (FP) | 0/3 | 0/3 |

A gap of 2 catches is inside the noise this sample size allows, and the task
reviewer this bench drives does not call the new review helpers, so this is a
no-regression result only.

Two harness fixes were needed first: Node 24's `node --test` prints the spec
reporter by default, so the row now asks for TAP; and Haiku 4.5 sometimes omits
the template headings (about 1 reply in 10), which used to abort the whole
bench. `score.js` now scores such a reply on its whole text and marks it
`offTemplate`.

### Reading

- Gain with no judge: the built-in edit rules refuse 11 of 11 secrets,
  conflict markers and prose dashes (before: 1), for about 10 ms per edit.
- Gain with the judge: 18 of 52 sonnet dispatches move to haiku. The lane hint
  showed no measurable gain on Claude Code here, because the model already
  picks lanes right on these prompts.
- Cost with the judge: about 140 ms per prompt and 85 ms per general dispatch;
  a down judge costs at most 6 x 1.5 s per session.
- Risks found: sizing lowered 2 of 5 security dispatches; 3 of 17 prompts get a
  wrong hint (one on a prompt that should get none); 2 benign edits refused.

## Limits

- Neither bench measures subagent sizing or the edit rules directly. The
  sizing step needs a dispatch to a general agent, which no prompt here asks
  for, and the bench repositories have no `.fx.json` rules. Their evidence is
  the labelled-set scores in `scores.md`.
- The lane-triggering bench shows whether the hint helps; it cannot show
  that the hint did not hurt a prompt that already passed unless that prompt is
  one of the 17.

## Re-run after the judge removal

Offline, no model sessions. The guard decisions of the no-judge code (the same
guard code fx 0.5.0 ships) were compared with the checkout from before the
judge, over 398 calls sent to the Claude Code and Codex hooks: the 42-command
calibration set, the 78 catastrophic commands and the 79 ordinary ones.

| | result |
|---|---|
| decisions that differ from the checkout before the judge | 0 |
| catastrophic commands refused | 78 of 78 |
| ordinary commands refused | 0 of 79 |
