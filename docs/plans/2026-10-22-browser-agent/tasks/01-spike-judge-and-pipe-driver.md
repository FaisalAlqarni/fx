# 01: Spike: local judge on real pages, pipe driver per OS

**Status:** ready-for-agent
**Blocked by:** None within this plan. External: sub-projects 1 and 2 complete (plan.md standing rulings).
**Phase:** MVP

**What to build:** evidence, not product code. Four questions are answered with numbers in `docs/plans/2026-10-22-browser-agent/spike.md`, and the plan continues only if every bar passes:

1. Given a page, a goal and fx's shortlist of at most 5 candidates plus `none`, does a local judge pick the right operation and target, fast enough for sub-project 2's 1,500 ms budget?
2. Does a throwaway version of the loop complete real flows on real pages?
3. Does Chrome driven over `--remote-debugging-pipe` from Node 20 launch, navigate, evaluate, screenshot and shut down cleanly, with a fresh profile, on Linux and on Windows?
4. Does Chrome, launched with the design's flags, open any connection the page did not ask for?

All spike code is throwaway and lives under `.fx/spike-browse/` (ignored, ADR 0015). It may be plain JavaScript. Only `spike.md` is committed.

**Design:** Implementation Decisions > 3; Implementation Decisions > 5; Implementation Decisions > 6; Implementation Decisions > 9; Further Notes

**Files:**
- Create: `docs/plans/2026-10-22-browser-agent/spike.md`
- Scratch, not committed: `.fx/spike-browse/**`

**Interfaces:**
- Consumes: `loadJudge`, `askJudge`, `JudgeQuestion` from `lib/judge.js` (sub-project 2; plan.md rulings). If any differs from the rulings' list, record the real name and signature in `spike.md` under "Judge interface as built"; task 04 reconciles `src/lib/browse/judge.ts` against that record and updates plan.md's list.

**Seam:** none (a spike). Its output is `spike.md`.

**Tests:** the spike measures these; each has a pass bar.

- Prerequisites: `test -f scripts/build && test -d src/lib && node -e "require('./lib/judge.js').loadJudge"` exits 0. If not, stop and report that sub-project 1 or 2 is not complete.
- Labelled set: 12 steps across at least 5 pages. At least 3 pages are local copies of the design's fixtures (sign-up form with a select, covered button, many buttons); at least 2 are real public pages the owner names when the spike starts (ask in the ledger; do not pick URLs yourself). Each step records: URL, goal, the correct operation, and the correct target's label.
- Shortlist recall: for each step, run the design item 6 ranking over the candidates the design item 5 rules collect (a throwaway page function is fine). Bar: the correct target is in the top 5 on at least 11 of 12 steps, or in the top 15 (two widenings) on 12 of 12.
- Judge accuracy: for each available judge among Kev-4B, Nimble 9B (Ollama), Rizzo 4B and d1-3B, send request 1 of design item 6 (`operation` plus `click_target`, at most 6 options each, string state) per step, plus request 2 when the correct operation is `TYPE` or `SELECT`, and score operation and target both right. Bar: at least one judge gets at least 10 of 12. Record per judge: score, answers with `escalate` not `null`, results with `bad-response` (and whether the malformed part was a head the step did not use), and p50 and p95 request latency.
- Latency: bar: p95 latency of request 1 at most 1,200 ms for every judge counted as passing (sub-project 2 aborts at 1,500 ms).
- End-to-end flows: 4 flows on real pages the owner names (for example "find the pricing page", "search for X"), each with an expectation text, run by a throwaway loop following design items 6 to 8 with the best judge. Bar: at least 3 of 4 reach the expectation within 20 steps.
- Pipe driver, Linux (this WSL2 machine): launch the finder's Chrome with the design item 3 flags and a profile from `fs.mkdtemp(path.join(os.tmpdir(), 'fx-browse-'))`, send `Target.createTarget`, `Page.navigate` to a fixture served on `127.0.0.1`, `Runtime.evaluate` of `document.title`, `Page.captureScreenshot`, then `Browser.close`. Bar: title matches, PNG is non-empty, the process has exited within 5 s, the profile directory is deleted.
- Pipe driver, Windows: the same script copied under `/mnt/c/...` and run with `cmd.exe /c node <script>` from WSL2 (Windows Node and Chrome or Edge on the Windows host). Required: if Windows Node is not installed, stop and ask the owner to install it. Same bar.
- macOS: recorded as "unverified" unless the owner provides a Mac.
- Connections: run one Linux launch with a throwaway logging HTTP proxy (`--proxy-server=http://127.0.0.1:<port>` and `--proxy-bypass-list=<-loopback>`) while loading the fixture. Bar: the proxy logs no host other than the fixture server.
- Library detection: in a scratch project with `playwright-core` and `puppeteer-core` installed, `require.resolve(name, { paths: [scratchDir] })` finds each, and launching each with the system Chrome's `executablePath` opens the fixture. Record pass or fail; informational, not a stop bar.

**Risks:** installing `playwright-core` and `puppeteer-core` in the scratch project downloads from npm; that is dev-time work on the owner's machine, not product behaviour. Real public pages are loaded only from the owner's list.

**Idempotency:** everything under `.fx/spike-browse/` is recreated on a rerun; `spike.md` is overwritten.

**Testing:** manual measurement, recorded.

## Acceptance criteria
- [ ] `spike.md` holds the labelled set, the per-judge table (score, escalations, bad responses, p50, p95), shortlist recall, the 4 flows and their results, per-OS driver results, the proxy log summary, library results, the judge interface as built, the list of judges that passed every judge bar (only these are named as supported in task 07), and a one-line verdict: `GO` or `STOP: <bar that failed>`.
- [ ] Verdict `GO` only when every bar above passed.
- [ ] **Stop rule:** on `STOP`, commit `spike.md`, mark tasks 02 to 07 `Status: blocked-on-owner` in the ledger, and report to the owner which bar failed, with the numbers and these options: a different judge, 10 options per question measured again, a two-stage shortlist, or the Node 22 WebSocket fallback for a failing OS. Do not start task 02.

## Steps

- [ ] **1. Check the prerequisites** (the first Tests entry)
- [ ] **2. Ask the owner for the public pages and the 4 flows** (record them in the ledger)
- [ ] **3. Build the throwaway pipe driver; run it on Linux, on Windows through `cmd.exe`, and under the logging proxy**
- [ ] **4. Build the throwaway observer and ranking, and measure shortlist recall**
- [ ] **5. Run each available judge over the labelled set**
- [ ] **6. Run the 4 flows with the best judge**
- [ ] **7. Run library detection**
- [ ] **8. Write `spike.md` with the verdict**
- [ ] **9. Commit by path**

```
git add docs/plans/2026-10-22-browser-agent/spike.md
git commit -m "docs(browse): spike results for judge and pipe driver"
```

On `GO`, continue to task 02. On `STOP`, apply the stop rule and wait for the owner.
