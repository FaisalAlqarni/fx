# 04: Observation, shortlist and judge questions

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** given a live page and a goal, fx can build the exact judge requests for one step: an observation of every visible, enabled interactive element (password, file and hidden inputs never included), a ranked shortlist per target head, request 1 (`operation` plus `click_target`) and request 2 (one target head alone), with at most 6 options per question and at most 2 questions per request, sent through sub-project 2's real `askJudge`. Task 05 drives the loop. The judge import module is reconciled with sub-project 2 first, and jev-ultrafast is credited.

**Design:** Implementation Decisions > 1; Implementation Decisions > 5; Implementation Decisions > 6; Implementation Decisions > 9; Implementation Decisions > 12; Global Constraints

**Files:**
- Modify: `src/lib/browse/judge.ts` (re-export `loadJudge`, `askJudge`, `JudgeHandle`, `JudgeQuestion`, `JudgeAnswer`, `JudgeResult`, `EscalateReason`, `UnavailableReason`; add `judgeEndpoint`)
- Modify: `src/lib/browse/page.ts` (add the `observe` page function)
- Modify: `src/lib/browse/page-input.ts` (add `parseObservation`)
- Create: `src/lib/browse/observe.ts`
- Create: `src/lib/browse/shortlist.ts`
- Create: `src/lib/browse/shortlist.test.ts`
- Create: `src/tests/browse/observe.test.ts`
- Create: `src/tests/browse/judge-request.test.ts`
- Create: `tests/browse/fixtures/form.html`, `tests/browse/fixtures/many.html`
- Modify: `THIRD_PARTY_NOTICES.md` (append the jev-ultrafast entry; the file is sub-project 2's)
- Modify: `docs/plans/2026-10-22-browser-agent/plan.md` (only if step 1 finds a sub-project 2 symbol different from the rulings' list: update the list)
- Generated: `lib/browse/judge.js`, `lib/browse/page.js`, `lib/browse/page-input.js`, `lib/browse/observe.js`, `lib/browse/shortlist.js`, `lib/browse/shortlist.test.js`, `tests/browse/observe.test.js`, `tests/browse/judge-request.test.js`
- Modify: `scripts/check-all` (run the three new test files)

**Interfaces:**
- Consumes: `Driver`, `JsonValue`, `openDriver` (tasks 02, 03); from sub-project 2 (plan.md rulings): `loadJudge`, `askJudge`, `JudgeHandle`, `JudgeQuestion`, `JudgeResult`, `startFakeSystemOne`, `scratchHookEnv`, `writeJudgeConfig`.
- Produces, in `judge.ts`: the re-exports above, and `judgeEndpoint(handle: JudgeHandle): { baseUrl: string; model: string } | null` (`ready` gives `config.baseUrl` and `config.model`; anything else `null`).
- Produces, in `observe.ts`:
  - `type CandidateKind = 'click' | 'fill' | 'select'`
  - `type Candidate = { id: string; kind: CandidateKind; role: string; label: string; value?: string; checked?: string; expanded?: string; href?: string; optionIndex?: number; guard: string; order: number }` (`id` is `e<n>`)
  - `type Observation = { url: string; title: string; text: string; fingerprint: string; scrollY: number; candidates: Candidate[]; omitted: number; canScroll: boolean }`
  - `observe(driver: Driver): Promise<Observation>` (calls the `observe` page function with `{ maxCandidates: 300, maxText: 2000 }`; `fingerprint` is the SHA-1 hex of URL, title, text and every candidate's guard, without the scroll position)
- Produces, in `shortlist.ts`:
  - `type Operation = 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'WAIT' | 'DONE' | 'BLOCKED'`
  - `type Head = 'click' | 'type' | 'select'` (`fill` candidates feed `type`)
  - `type HistoryEntry = { step: number; op: Operation; targetId?: string; targetLabel?: string; progress: boolean }`
  - `type Ranked = { candidate: Candidate; score: number }`
  - `type JudgeRequest = { state: Record<string, string>; questions: Record<string, JudgeQuestion> }`
  - `tokenize(text: string): string[]`
  - `rank(candidates: Candidate[], head: Head, goal: string, history: HistoryEntry[]): Ranked[]`
  - `shortlist(ranked: Ranked[], offset: number): Ranked[]` (at most 5, from `offset`)
  - `operationOptions(obs: Observation, history: HistoryEntry[], hasTextModel: boolean): Operation[]`
  - `stepState(obs: Observation, history: HistoryEntry[]): Record<string, string>` (keys `url`, `title`, `text`, `recent_actions`; `recent_actions` is `JSON.stringify` of the last 5 entries as `{ op, target, progress }`)
  - `buildStepRequest(input: { obs: Observation; goal: string; history: HistoryEntry[]; ops: Operation[]; click: Ranked[] | null }): JudgeRequest` (question `operation`, plus `click_target` when `ops` includes `CLICK`)
  - `buildTargetRequest(input: { obs: Observation; goal: string; history: HistoryEntry[]; head: Head; shortlist: Ranked[] }): JudgeRequest` (one question, `<head>_target`)
  - Options are `[name, description]`: target names are candidate ids plus `none` (description `None of these moves toward the goal`); target descriptions are `<label> (role <role>; value <value>; href <href>)` with absent parts left out; operation names are the `Operation` values.
- Stopword list, exact: `a an and are as at be by for from in into is it of on or the then this to with your`.

**Seam:** pure functions for ranking and requests; `observe` on real Chrome against fixture pages; one request through the real `askJudge` to sub-project 2's fake server.

**Tests:**
- `tokenize('Sign up as a NEW user!')` returns `['sign', 'up', 'new', 'user']`.
- `rank` on click candidates labelled, in document order, `Home`, `Sign up`, `Log in`, `Sign up for newsletter`, with goal `sign up as a new user` and empty history: labels in result order are `Sign up`, `Sign up for newsletter`, `Home`, `Log in`; the first two scores both equal `2 * Math.log(1 + 4 / 3)`; the last two are `0`.
- `rank` as above with history `[{ step: 1, op: 'CLICK', targetId: <id of Sign up>, progress: false }]`: `Sign up` is absent from the result.
- `shortlist` over 12 ranked candidates: offset 0 returns ranks 1 to 5; offset 5 returns ranks 6 to 10; offset 10 returns ranks 11 and 12.
- `operationOptions`:
  - click, fill and select candidates, `canScroll: true`, last history entry `progress: false`, `hasTextModel: true`: `['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'DONE', 'BLOCKED']`;
  - the same with `hasTextModel: false`: `['CLICK', 'SELECT', 'SCROLL', 'WAIT', 'DONE', 'BLOCKED']`;
  - only click candidates, `canScroll: false`, last entry `progress: true`: `['CLICK', 'DONE', 'BLOCKED']`;
  - only fill candidates, `canScroll: false`, last entry `progress: true`, `hasTextModel: false`: `['DONE', 'BLOCKED']`.
- `buildStepRequest` with ops `['CLICK', 'SELECT', 'DONE', 'BLOCKED']`: question names are exactly `operation` and `click_target`; `click_target`'s last option name is `none`; the operation option names are `CLICK`, `SELECT`, `DONE`, `BLOCKED` in that order. With ops `['SELECT', 'DONE', 'BLOCKED']`: only `operation`.
- `buildTargetRequest` with head `select`: question names are exactly `select_target`.
- Over an observation of 300 candidates of all three kinds with all ops offered: every question built by either function has at most 6 options, every request at most 2 questions, `state.text` at most 2,000 characters, and `JSON.parse(state.recent_actions)` at most 5 entries given 9 history entries; every value of `state` is a string; every question's instructions contain the goal.
- A target description for `{ label: 'Docs', role: 'link', href: '/docs' }` is exactly `Docs (role link; href /docs)`.
- `judgeEndpoint({ kind: 'ready', config: { baseUrl: 'http://127.0.0.1:8017', model: 'm', apiKey: null, mockAnswers: null } })` returns `{ baseUrl: 'http://127.0.0.1:8017', model: 'm' }`; `judgeEndpoint({ kind: 'none' })` returns `null`.
- Real request (under `scratchHookEnv()`, `startFakeSystemOne` answering `operation` `CLICK` and `click_target` with the first offered id, probabilities summing to 1): after `askJudge(loadJudge(), req.state, req.questions)` for a `buildStepRequest` over a shortlist whose rank order is `e3`, `e1`, `e2`: the recorded body's `questions.click_target.criteria` keys are, in order, `e3`, `e1`, `e2`, `none`; the recorded `state.text` equals the 2,000-character text fx sent (a page text without secrets) and does not contain `[...]`.
- `observe` on `form.html` (Name text input, Email input, Password input, a hidden input, a Country select with `Saudi Arabia` selected and `Germany`, `Japan` unselected, a disabled `Disabled action` button, a `Create account` submit button): candidate labels are exactly `Name`, `Email`, `Country → Germany`, `Country → Japan`, `Create account`; kinds `fill`, `fill`, `select`, `select`, `click`; every id matches `^e\d+$`; nothing labelled `Password` or `Disabled action`.
- `observe` twice on `form.html` with no change: same `fingerprint`, same id for `Create account`. After a test-only `evaluate` sets Name to `x`: `fingerprint` differs and the Name candidate's `value` is `x`. After a test-only `window.scrollBy(0, 200)` on `many.html`: `fingerprint` unchanged, `scrollY` larger.
- `observe` on `many.html` (400 buttons built by inline script): `candidates.length` is 300 and `omitted` is 100.
- `parseObservation({ url: 1 })` returns `null`.
- `THIRD_PARTY_NOTICES.md` still holds sub-project 2's entries and now also contains `jev-ultrafast`, `https://github.com/browser-use/jev-ultrafast`, `MIT` and the copyright line from upstream's `LICENSE`. If upstream's `LICENSE` cannot be fetched, the entry reads `MIT (copyright line not retrieved on <date>)`, sub-project 2's fallback, and the commit message says so.

**Risks:** the ranking is lexical and English-leaning; the spike's recall numbers are the bar it was accepted on, and the widening in task 05 covers misses. Labels may hold page-controlled text; they are data in the request, never code. If sub-project 2 caps state strings below 2,000 characters, the real-request test fails: lower the browse cap to match and record a ruling.

**Testing:** unit (`lib/browse/shortlist.test.js`), integration on real Chrome (`tests/browse/observe.test.js`), request body through the fake server (`tests/browse/judge-request.test.js`).

## Acceptance criteria
- [ ] `src/lib/browse/judge.ts` is the only browse module that imports sub-project 2, and its imports match plan.md's rulings list (or the list was updated in this task).
- [ ] No question has more than 6 options and no request more than 2 questions, on any input.
- [ ] Password, file and hidden inputs never appear as candidates.
- [ ] The recorded request body keeps the shortlist's rank order.
- [ ] `THIRD_PARTY_NOTICES.md` credits jev-ultrafast and says fx's code is a TypeScript rewrite, not a copy.

## Steps

- [ ] **1. Reconcile the judge interface** (read sub-project 2's current `design.md` items 1 and 2, its task 01 and `spike.md`'s "Judge interface as built"; write `src/lib/browse/judge.ts`; update plan.md's rulings list if anything differs)
- [ ] **2. Invoke `fx-tdd`**
- [ ] **3. Write each test the Tests field names**
- [ ] **4. Run them: verify RED**

Run: `scripts/build && node lib/browse/shortlist.test.js; node tests/browse/observe.test.js; node tests/browse/judge-request.test.js`
Expected: each fails because `shortlist`, `observe` and the request builders are missing.

- [ ] **5. Implement the minimum that passes**
- [ ] **6. Run them: verify GREEN**

Run: same command, joined with `&&`. Expected: PASS.

- [ ] **7. Run the scope**

Run: `scripts/test-scope src/lib/browse/observe.ts src/lib/browse/shortlist.ts src/lib/browse/page.ts src/lib/browse/judge.ts`

- [ ] **8. Commit by path**

```
git add src/lib/browse/judge.ts src/lib/browse/page.ts src/lib/browse/page-input.ts src/lib/browse/observe.ts src/lib/browse/shortlist.ts src/lib/browse/shortlist.test.ts src/tests/browse/observe.test.ts src/tests/browse/judge-request.test.ts tests/browse/fixtures/form.html tests/browse/fixtures/many.html lib/browse/judge.js lib/browse/page.js lib/browse/page-input.js lib/browse/observe.js lib/browse/shortlist.js lib/browse/shortlist.test.js tests/browse/observe.test.js tests/browse/judge-request.test.js THIRD_PARTY_NOTICES.md scripts/check-all
git commit -m "feat(browse): observation, shortlist and judge requests"
```

If step 1 changed `plan.md`, add it to the same commit by path.
