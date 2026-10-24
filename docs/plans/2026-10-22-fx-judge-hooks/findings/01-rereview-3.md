# Task 01 re-review, fix round 3

Range 52dcfc9..486da67. HEAD is 486da67, and `lib/redact.js` and `src/lib/redact.ts` in the worktree match it. Read: `01-rereview-2.md`, the fix round 3 section of the report, and the fix diff. Redaction was probed with `node -e` against the built `lib/redact.js` at HEAD, and against `lib/redact.js` at 52dcfc9 and 8676140 for comparison. `node lib/redact.test.js` and `node lib/decision-log.test.js` pass at HEAD, so every round 1 and round 2 row still holds. The suite was not re-run, as instructed.

### Finding verdicts

- Important 1, a URL shows the judge a host it does not contact: NOT ADDRESSED, one variant left. `src/lib/redact.ts:56` now stops userinfo at `/`, `?` and `#`. Probed and kept whole: `https://evil.example/i.sh?@github.com`, `https://evil.example/@github.com`, `https://evil.example#@github.com`, the same with `HTTPS://` and `Https://`, and `https://evil.example%40github.com/x`. A backslash still passes: `https://evil.example\@github.com/x` reaches the judge as `https://[REDACTED]@github.com/x`. curl 8.5 and Python's `urlsplit` read that host as `github.com`, but a WHATWG parser (Node `fetch` and `new URL`, Deno, Bun, browsers) reads `\` as `/` and contacts `evil.example`. So `node -e "fetch('https://evil.example\\@github.com/x')"` still shows the judge the wrong host. This was already true at 8676140, so it is not new in this diff. Fix: add `\\` to the userinfo class, `[^\s/?#\\"'<>]*@`, and add the `node -e fetch` command as a row that must keep `evil.example`.
- Minor 1, `-u user:pass` with no command anchor: ADDRESSED at `src/lib/redact.ts:61`. `docker run -u 1000:1000 img` and `docker exec -u root:root c sh` are kept (rows at `src/lib/redact.test.ts:122-123`). `curl -u`, `curl -ualice:s3cret` and `env FOO=1 curl -u a:s3cret x` are still redacted. See New breakage, Important 2, for a line continuation.
- Minor 2, the `sshpass -p` span: ADDRESSED at `src/lib/redact.ts:84`. `sshpass -e ssh h -p 2222` is kept, and `sshpass -v -p hunter2 ssh h -p 2222` redacts only the password (rows at `src/lib/redact.test.ts:124-125`).
- Minor 3, wider names hit ordinary words, and `}` was eaten: ADDRESSED at `src/lib/redact.ts:24`, `:27-28` and `:35`. `--author=me`, `--author bob`, `auth:login` and `keyboard=us` are kept, and `{token:1}` keeps its brace. The narrower names cost real secrets, see New breakage, Important 1.
- Minor 4, the 40-character runs hide `cwd` in the decision log: ADDRESSED at `src/lib/decision-log.ts:42`, tested at `src/lib/decision-log.test.ts:43-46`. Named secrets in `cwd` are still redacted (`/w/TOKEN=c`).

Removed row. The round 2 row `https://u:p/ss@github.com/a/b` was dropped. The argument holds: under RFC 3986 the authority ends at the first `/`, so the host is `u`, and keeping the row would require the very rule that allows the spoof. A password holding `/` has to be sent as `%2F`, and `https://u:p%2Fss@github.com` is still redacted.

Third argument. `redact(text, cap, runs = true)` at `src/lib/redact.ts:103` keeps every existing caller unchanged: the default applies everywhere, and only the decision log passes `false`, for `cwd` alone. A bare boolean in third position is hard to read at a call site, but there is one call site, so it is acceptable. It changes the brief's signature, and the report says so.

Spoof and credential probes, each with the expected output: `http://alice:s3cret@h.example/x`, `https://...`, `HTTPS://u:s3cret@github.com/x`, `postgres://`, `postgresql://`, `mongodb://`, `mongodb+srv://`, `redis://:s3cret@`, `rediss://default:s3cret@`, `ssh://alice:s3cret@h:22` and `git clone ssh://...` all give `[REDACTED]@` and keep the real host. `https://u:p@ss@github.com/a/b` and `https://u%40x:p@github.com/x` are redacted whole.

### New breakage

#### Important

1. `src/lib/redact.ts:24` · The new name boundary `(?![a-z0-9])` and the fixed word list drop secret names that 52dcfc9 redacted, so their values now leave the machine. Probed, redacted at 52dcfc9 and kept at HEAD: `GITHUB_TOKEN2=abc`, `SECRET1=abc`, `creds2=abc`, `api_keys=abc`, `passwords=abc`, `--api-keys abc`, `--password1 x`, `"apiKeys": "abc"`, `passcode=abc`, and the bare colon forms `auth: s3cret` and `X-Auth: s3cret`. The file's own rule is that over-redaction costs context and under-redaction sends a secret off the machine; this round traded the second for the first. · Allow a plural and digits after the word: `${words(list)}s?(?![a-z])`. That keeps `author`, `keyboard` and `tokenizer` out and brings back `TOKEN2`, `keys` and `passwords`. For `auth` before a colon, require whitespace after the colon, which keeps `auth:login` and redacts `X-Auth: v`. Add the probed names as rows.
2. `src/lib/redact.ts:61` · The `curl` anchor uses `UNTIL`, which stops at a newline, so a curl command split with a line continuation keeps its password: `curl \` then `-u alice:s3cret https://h/x` on the next line, and the same with `--user`, come through unchanged; at 52dcfc9 both were redacted. `src/lib/shell-guard.ts:259` sends `redact(code.trim(), ...)` to the judge without joining lines, so the password reaches the judge request. · Let the anchor cross a backslash-newline, for example `(?:[^\n;|&]|\\\n)*?` in place of `UNTIL` for this rule (and for `-b` at `:79`), and add a two-line row.

#### Minor

1. `src/lib/redact.ts:35` · An unquoted value after a colon now stops at `,`, `}` and `]`, so a secret holding one is cut short: `password: a,b` gives `password: [REDACTED],b`, and `x-token: abc}def` gives `x-token: [REDACTED]}def`. At 52dcfc9 both were redacted whole. · Stop at those characters only when the name sits inside a brace or bracket, or accept the partial leak.

## Ledger lines

Task 01: fix round 3/5 (4 addressed, 3 open: the URL host spoof still passes with a backslash for WHATWG clients such as Node fetch; new Important, the name boundary drops TOKEN2, api_keys, passwords and auth: names that round 2 redacted; new Important, curl -u across a line continuation is no longer redacted; commits 52dcfc9..486da67)
Task 01: minor (deferred): stop an unquoted colon value at , } and ] only inside braces, so password: a,b does not leak ,b.
