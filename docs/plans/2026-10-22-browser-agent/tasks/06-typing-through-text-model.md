# 06: Typing through an optional text model

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Core

**What to build:** when the user has configured a text model in `browse.json` (`<machinePaths().configDir>/browse.json`, key `textModel`: any OpenAI-compatible endpoint, such as Ollama's `http://127.0.0.1:11434/v1`), `explore` can fill forms: the judge picks `TYPE`, a second request picks the field, the text model writes the value from the goal and the field's context, and fx replaces the field's content with it. Without a text model, `TYPE` is never offered. A non-local text model needs `--allow-remote`, like a non-local judge. A bad or missing reply types nothing and is logged.

**Design:** Implementation Decisions > 4; Implementation Decisions > 6; Implementation Decisions > 7; Implementation Decisions > 10; Global Constraints

**Files:**
- Create: `src/lib/browse/text-model.ts` (`makeTypeText`)
- Create: `src/lib/browse/text-model-input.ts` (`parseTextReply`)
- Modify: `src/lib/browse/config-input.ts` (`textModel`)
- Modify: `src/lib/browse/page.ts` (page function `selectContent`)
- Modify: `src/lib/browse/step.ts` (the `TYPE` action)
- Modify: `src/lib/browse/cli.ts` (build `typeText` from `browse.json`; the `--allow-remote` check also covers the text model; pass `textModelBaseUrl`)
- Create: `src/lib/browse/text-model.test.ts`
- Create: `src/tests/browse/explore-type.test.ts`
- Modify: `tests/browse/fixtures/form.html` (submit shows `Welcome, <name> (<country>)`; a `name` query parameter pre-fills Name)
- Modify: `src/tests/browse/explore-cli.test.ts` (the text model consent case)
- Generated: the matching `lib/browse/*.js`, `tests/browse/explore-type.test.js`, `tests/browse/explore-cli.test.js`
- Modify: `scripts/check-all` (run the two new test files)

**Interfaces:**
- Consumes: `TypeTextFn`, `FieldContext`, `runExplore`, `ExploreOptions`, `buildTargetRequest` (tasks 04, 05); `parseBrowseConfig`, `readBrowseConfig`, `isLocalUrl` (task 02); `scratchHookEnv`, `writeJudgeConfig`, `runHook` (sub-project 2).
- Produces, in `config-input.ts`: `parseBrowseConfig(raw: unknown): { browserPath?: string; textModel?: { baseUrl: string; model: string; apiKeyEnv?: string }; warning?: string }`.
- Produces, in `text-model.ts`: `makeTypeText(cfg: { baseUrl: string; model: string; apiKeyEnv?: string }, opts?: { timeoutMs?: number; env?: Record<string, string | undefined> }): TypeTextFn`. It uses Node's global `fetch` with `AbortSignal.timeout` (default 20,000 ms) and resolves `null` on any failure; it never throws.
- Produces, in `text-model-input.ts`: `parseTextReply(body: unknown): string | null`.

**Seam:** `makeTypeText` against a fake OpenAI-compatible server on `127.0.0.1:0`; `runExplore` with a scripted judge and that fake server on real Chrome; the CLI under `scratchHookEnv()`.

**Tests:**
- `parseTextReply({ choices: [{ message: { content: '{"text":"Ada"}' } }] })` returns `'Ada'`; content `'{"text":"Ada","x":1}'` returns `null`; content `'{"text":""}'` returns `null`; a 2,001-character `text` returns `null`; content `'not json'` returns `null`; `{}` returns `null`.
- `parseBrowseConfig({ textModel: { baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen3:4b' } })` returns `{ textModel: { baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen3:4b' } }`; adding `apiKeyEnv: 'TM_KEY'` keeps it; `{ textModel: { baseUrl: 'http://x/v1' } }` returns `{ warning: 'fx-browse: ignoring malformed browse.json' }`.
- `makeTypeText` against the fake server with `model: 'm'`: the server receives `POST /v1/chat/completions`; body `model` is `'m'`, `response_format` is `{ type: 'json_object' }`, `temperature` is `0`, `max_tokens` is `256`; the user message content parses as JSON with keys `goal`, `label`, `role`, `value`, `title`, `text`, `recent`, and `text` has at most 2,000 characters.
- `makeTypeText` with `apiKeyEnv: 'TM_KEY'` and `env: { TM_KEY: 'k' }`: the request carries `Authorization: Bearer k`; with no `apiKeyEnv`: no `Authorization` header.
- `makeTypeText` when the server answers 500: resolves `null`; when it never answers and `timeoutMs` is 200: resolves `null` within 1,000 ms.
- Explore (`choice: 'cdp'`) on `form.html?name=old`, goal `sign up as Ada from Japan`, `expectText: 'Welcome, Ada (Japan)'`, a scripted judge (`TYPE` then `type_target` Name; `TYPE` then `type_target` Email; `SELECT` then `select_target` `Country → Japan`; `CLICK` `Create account`) and a fake text server answering `Ada` for a field labelled `Name` and `ada@example.com` for `Email`: `outcome: 'verified'`, `steps: 4`; the Name field held `Ada`, not `oldAda`, before submit; the two `TYPE` steps' trace lines have `typed_text` `Ada` and `ada@example.com`; each `TYPE` and `SELECT` step made exactly 2 judge requests, the second holding one question.
- Explore on `form.html` with `typeText: null`: no `operation` question in any request offers `TYPE`.
- Explore where the text server returns `{"text":""}`: the `TYPE` step's trace line has `action` `text-model-invalid` and `progress` `false`.
- `writeReport` with `textModelBaseUrl: 'https://api.example.com/v1'`: `report.md` contains `Page content was sent to api.example.com.`
- CLI (under `scratchHookEnv()`, `--driver cdp`, mock judge as in task 05): with `browse.json` `{ "textModel": { "baseUrl": "https://api.example.com/v1", "model": "m" } }` in `dirs.config`, `explore <origin>/form.html --goal x` exits 2 with stderr `fx-browse: page content would be sent to api.example.com; pass --allow-remote to allow it`.

**Risks:** the API key is read from the named environment variable at call time and never written to the trace or report. Only page text, the goal and the field's context go to the text model; password fields are never candidates, so their values are never sent.

**Idempotency:** each run writes a new run directory; nothing is persisted elsewhere.

**Testing:** unit and fake-server (`lib/browse/text-model.test.js`), integration on real Chrome (`tests/browse/explore-type.test.js`), CLI (`tests/browse/explore-cli.test.js`).

## Acceptance criteria
- [ ] With a text model configured, an explore run fills and submits the sign-up form and reaches `verified`.
- [ ] Without one, `TYPE` is never offered and nothing calls a text model.
- [ ] A non-local text model is never called without `--allow-remote`.
- [ ] No API key appears in `trace.jsonl` or `report.md`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write each test the Tests field names**
- [ ] **3. Run them: verify RED**

Run: `scripts/build && node lib/browse/text-model.test.js; node tests/browse/explore-type.test.js; node tests/browse/explore-cli.test.js`
Expected: each new case fails because `makeTypeText` and the `TYPE` action are missing.

- [ ] **4. Implement the minimum that passes**
- [ ] **5. Run them: verify GREEN**

Run: same command, joined with `&&`. Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/test-scope src/lib/browse/text-model.ts src/lib/browse/step.ts src/lib/browse/cli.ts src/lib/browse/config-input.ts`

- [ ] **7. Commit by path**

```
git add src/lib/browse/text-model.ts src/lib/browse/text-model-input.ts src/lib/browse/config-input.ts src/lib/browse/page.ts src/lib/browse/step.ts src/lib/browse/cli.ts src/lib/browse/text-model.test.ts src/tests/browse/explore-type.test.ts src/tests/browse/explore-cli.test.ts tests/browse/fixtures/form.html lib/browse/text-model.js lib/browse/text-model-input.js lib/browse/config-input.js lib/browse/page.js lib/browse/step.js lib/browse/cli.js lib/browse/text-model.test.js tests/browse/explore-type.test.js tests/browse/explore-cli.test.js scripts/check-all
git commit -m "feat(browse): typing through an optional text model"
```
