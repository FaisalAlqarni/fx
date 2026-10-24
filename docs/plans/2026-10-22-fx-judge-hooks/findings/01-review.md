# Task 01 review: judge client and per-machine config

Base 3b63173, head 51aa589. Read: the brief, the report with its fix round, the `src/` TypeScript, ADR 0047, `THIRD_PARTY_NOTICES.md`, and the headers of the generated JavaScript. Focused checks ran against the built `lib/` files and local loopback servers only. No remote judge was called.

### Spec Compliance

- Per-OS paths: ✅ `src/lib/fx-paths.ts:9-22`, XDG on Linux and macOS, `APPDATA` and `LOCALAPPDATA` on Windows, `path.win32` so the tests pass on Linux. `parseFxEnv` gains the four fields, empty is `undefined` (`src/lib/env.ts:13-20`).
- `judge.json` parsing with exact reasons: ✅ every reason the brief names, plus extra typed reasons for `model`, `api_key`, `insecure_http`, scheme and `mock_answers` (`src/lib/judge-input.ts:52-85`).
- Loopback only counts as local: ✅ `src/lib/judge-input.ts:22-30`, anchored regex, `127.0.0.1.evil.com` is tested as remote.
- Userinfo rejected: ✅ `src/lib/judge-input.ts:78`.
- `insecure_http` opt-in: ✅ `src/lib/judge-input.ts:82`.
- Ruling, query or fragment rejected: ✅ `src/lib/judge-input.ts:80`, checked on the raw text so an empty `?` or `#` is caught, with a test for each.
- Redaction classes and caps: ✅ for every case the brief lists, each pinned to its exact output (`src/lib/redact.test.ts:6-40`). Common spellings of the same classes still leak (Important 3).
- Budget: ✅ one `AbortController` covers connect, reply and body (`src/lib/judge.ts:88-119`). Checked here: a server that sends headers and then stalls the body resolves as `timeout` in 1,503 ms.
- Fail-open and `askJudge` never rejects: ✅ every path returns a typed result. `none` and `invalid` return before any network code.
- Escalate reasons: ✅ `src/lib/judge.ts:40-45`. The brief's `small-gap` example was replaced by a reachable one; the ruling carries this concern to the final review.
- Redirect handling: ✅ `redirect: 'error'` (`src/lib/judge.ts:100`), with a test proving the second host received nothing.
- Decision log: ✅ redacted `text`, dir `0700`, file `0600`, rotation over 5,242,880 bytes replacing the older file, one stderr line on failure (`src/lib/decision-log.ts:29-41`).
- `judge-cli` without argv keys: ✅ only `path` and `check`. No key flag anywhere, and `guard-calibrate` takes only `--base-url` and `--model`.
- Ruling, `GUARD_QUESTION` replaced by the spike wording: ✅ `src/lib/guard-question.ts:7-15`. Re-run gives 0 of 11 deny-labelled commands let run with no prompt, under the bar of 2.
- Ruling, notices completed from public LICENSE files: ✅ all seven entries carry a URL, MIT, a copyright line and the idea taken, and say no code was copied.
- Calibration recorded in ADR 0047: ✅ the table, backend, command, date and first-attempt table are all present. One deviation from the brief: the prompt pass covers 21 commands per row, not all 42 (Minor 6).
- ADR 0047 contents: ✅ fails open, plain code first, hygiene not a boundary, only prompts soften with the Stop lift exception, both amendments, ask per harness, logs local, amends ADR 0001.
- `scripts/check-all` gains the seven runs: ✅ `scripts/check-all:97-103`. The suite was not re-run, as instructed.

### Strengths

- The budget is real: one abort signal spans the body read, verified here with a stalled body.
- `redirect: 'error'` was added during self-review and driven by a failing test. Without it, a 307 would resend the redacted state to a host the user never configured.
- The query and fragment check runs on the raw text, so the edge cases that `URL` would normalize away are still caught.
- The parsers take `unknown` with no `as` and return typed reasons that never echo a config value.
- The report is honest about a calibration run where every call timed out and was discarded. That run would have looked like a perfect result.
- Redaction tests compare exact strings, and the cap test proves truncation runs after redaction.

### Issues

#### Critical

None.

#### Important

1. `src/lib/judge.ts:93` and `src/lib/judge.ts:115-116` · An `api_key` holding a control character ends up in the result's `detail`. Checked here: `apiKey: "SECRETKEY\nX"` gives `detail: "Headers.append: \"Bearer SECRETKEY\nX\" is an invalid header value."`. `judge-cli` does not print `detail` today, but `guard-calibrate.ts:96` writes it to stderr, and the decision log's `unavailable` field is where task 03 will put it. A trailing newline is exactly what a key pasted into `fx-setup` (task 11) brings with it. · The brief says the key never reaches error messages or logs. · Reject in `parseJudgeConfig` any `api_key` outside printable ASCII without spaces (`/^[\x21-\x7e]+$/`), with a typed reason that does not echo the value, and test it. Also stop passing the raw `e.message` through as `detail` for errors raised before the request leaves.

2. `src/lib/judge-input.ts:88-94` · `checkAnswer` does not check that the probability keys are the asked options, or that `choice` is the top option. Checked here: `{ choice: "run", probabilities: { zzz: 0.95, run: 0.05 } }` parses `ok`, and `escalation` (`src/lib/judge.ts:42-44`) then reads top 0.95 and returns `escalate: null`, so a run with 5% confidence looks sure. Similarly `{ choice: "deny", probabilities: { run: 0.9, ... } }` parses with no escalation. · This is the trust-boundary parser the escalation contract rests on, and task 03's guard allows `run` with `escalate === null`. · Require the probability keys to equal the asked option names, and either reject a `choice` that is not the arg max or compute the escalation from `probabilities[choice]`. Add a test for each case.

3. `src/lib/redact.ts:22`, `src/lib/redact.ts:25`, `src/lib/redact.ts:28` · Classes the design names leak in common spellings. Checked here, each unchanged or partly changed: `curl --user=alice:s3cret`, `curl -ualice:s3cret`, `sshpass -phunter2 ssh host`, and `https://u:p@ss@github.com` (redacts `u:p` and leaves `ss`, because `[^\s/@]+@` stops at the first `@` while URL parsers split at the last). · The brief says never under-redact, and these strings go to a remote judge. · Make the `-u` rule accept `--user=` and the attached form (`-u\S*:\S+`), let `sshpass` take `-p\S+`, and match userinfo up to the last `@` before the host (`[^\s/]+@` with a greedy run, or `\S+?@(?=[^\s@/]+(?:[:/]|\s|$))`). Add each case above to `redact.test.ts`.

#### Minor

1. `src/lib/redact.ts:11` · `MYSQL_PWD=s3cret` and a JSON body such as `curl -d '{"password":"hunter2"}'` or `{"api_key": "abc"}` pass through unchanged. Neither is in the design's named list, but both are common. · Add `pwd` to `NAME` and a rule for a quoted JSON key whose name matches `NAME`.
2. `src/lib/redact.ts:17` · An `Authorization` value made only of letters, followed by a space, is read as the scheme: `Authorization: abcdefSECRET x` leaves `abcdefSECRET`. · Limit the optional scheme to the known words (`Bearer`, `Basic`, `Token`, `Digest`, and a small set more).
3. `src/lib/judge-input.ts:64-67` · A `mock_answers` key named `__proto__` sets the prototype of `mockAnswers` instead of adding an entry (checked: the result has `mockAnswers: {}` whose prototype is the answer). The file is local, so the harm is a confusing lookup. · Build `mockAnswers` with `Object.create(null)` or skip `__proto__`.
4. `src/lib/decision-log.ts:33-38` · `mode: 0o600` applies only when the file is created, so an existing `decisions.jsonl` with wider permissions stays that way. Only `text` is redacted, and `cwd`, `source`, `override` and `unavailable` are written as given, while the design says every string is redacted before a log line. · `fchmod` after open on POSIX, and redact the other free-text fields when task 03 starts filling them.
5. `src/lib/judge.test.ts:95-106` · The assertion that `idle` saw zero requests proves nothing: neither the `none` handle nor the mock handle points at `idle`. · Point a `ready` mock config at `idle.url` with `mockAnswers` set, or drop the server and say the no-request path is structural.
6. `src/scripts/guard-calibrate.ts:71-75` · The brief asks for every command twice, the second time with `Please run: <command>`. The script sends the matching prompt to 21 commands and an unrelated prompt to the other 21, so the "with prompt" deny column counts 6 of 11, not 11. The extra unrelated-prompt row is useful. · Run the matching prompt on all 42 and keep the unrelated row as a third pass.

### Assessment

The structure is sound, and most of the hard properties hold under direct checks: the budget covers the body, the client fails open, redirects are refused, nothing is sent without a config, and the CLI never prints the key. Three things stop it from being trusted as the boundary between secrets and a remote judge: a malformed key can surface in an error detail, the response parser lets the escalation read probabilities that do not belong to the asked options, and named redaction classes leak in their common alternative spellings. Each fix is small and local to one function.

Ready: with fixes.

## Ledger lines

Task 01: minor (deferred): redact MYSQL_PWD and JSON-body secret keys such as "password" and "api_key".
Task 01: minor (deferred): limit the Authorization scheme match to known scheme words so a letters-only secret is not taken as the scheme.
Task 01: minor (deferred): build mockAnswers without a prototype so a __proto__ key cannot replace it.
Task 01: minor (deferred): tighten an existing decisions.jsonl to 0600 and redact the log's other free-text fields.
Task 01: minor (deferred): make the judge test's zero-requests assertion point at the idle server or remove it.
Task 01: minor (deferred): run the calibration's matching-prompt pass on all 42 commands as the brief specifies.
