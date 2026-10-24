# Task 01 re-review, fix round 5

Range 091f38f..ad9f731. HEAD is ad9f731, and `src/` and `lib/` in the worktree match it. Read: `01-rereview-4.md`, the "Fix round 5" section of the report, and the fix diff. Redaction was probed with `node` against the built `lib/redact.js` at HEAD and against `lib/redact.js` at 091f38f for comparison. `node lib/redact.test.js` passes at HEAD. The suite was not re-run, as instructed.

The key property holds for every input tried: the output equals the input with some disjoint substrings replaced by `[REDACTED]`, so line breaks, backslashes and every other character outside a secret reach the judge as written. A random fuzz of 300,000 commands built from continuations (`\` and `\\` before LF and CRLF), quotes, heredocs, comments, URLs and secret flags found no violation and no exception.

### Finding verdicts

- Important 1 (round 4), the backslash-newline rewrite: ADDRESSED at `src/lib/redact.ts:136-170` (`continuations`), `:180-207` (`apply`) and `:211-232` (`redact`). The rules run on a joined copy and only the redacted spans are written back into the original. Probes:
  - `curl \` + newline + `  -u alice:s3cret https://h/x` gives `curl \` + newline + `  -u [REDACTED] https://h/x`, structure kept. The same holds for CRLF, `mysql \` + newline + ` -ps3cret`, and a secret split by a continuation (`-u alice:s3\` + newline + `cret`, replaced whole).
  - `echo x \\` + newline + `rm -rf ~` and the quoted heredoc row (`x\`, `EOF`, `rm -rf ~`) come back unchanged.
  - Even versus odd backslashes: four backslashes before a newline come back unchanged; three before a newline followed by `-u a:s3cret` redact the value and keep all three backslashes and the newline.
  - Inside single quotes: `printf 'a\` + newline + `b'` is unchanged, and `curl 'x\` + newline + `' -u a:s3cret h` redacts the value. A continuation inside double quotes, and one after a `# it's` comment, is joined as bash joins it.
  - Heredoc bodies: a quoted body is never joined; see Minor 2 for an unquoted one.
- Minor 1 (round 4), the plural s: ADDRESSED at `src/lib/redact.ts:26-28` and `:33`. `echo monkeys=3 turkeys=4` is kept, and `apiKeys=`, `API_KEYS=` and `passwords=` are still redacted. Uppercase plurals are still redacted through the new run-on rule; see Minor 1 under New breakage.
- Minor 2 (round 4), uppercase run-together names: ADDRESSED at `src/lib/redact.ts:29-31`. `ACCESSTOKENVALUE=`, `APIKEYVALUE=` and `MYPASSWORDX=` are redacted; `TOKENIZER=`, `XAUTHORITY=` and `KEYBOARD_LAYOUT=` are kept. `AUTHTYPE=` stays kept, as the report says.
- Minor 3 (round 4), the lost closing bracket: ADDRESSED at `src/lib/redact.ts:105`. `echo [password: abc] [token:abc] done` gives `echo [password: [REDACTED]] [token:[REDACTED]] done`.

### New breakage

#### Important

1. `src/lib/redact.ts:192-197` · `apply` keeps a match unredacted whenever the replacement is not the match with one middle part swapped for `[REDACTED]` (`r < 0`, then `continue`). The redaction is skipped without any error. The `-H` rule at `:100` takes a `\s*` after the opening quote and its replacement drops it, so `curl -H ' X-Api-Key: a b c' h` now gives `' X-Api-Key: [REDACTED] b c'` and `-H " Authorization: Bearer abc def"` gives `Bearer [REDACTED] def"`. At 091f38f both were redacted to the closing quote. The later colon rule hides only the first word, so ` b c` and ` def` reach the judge. · Fail closed: when no `[REDACTED]` fits, redact the whole match with one span covering it. Capturing the `\s*` in the `-H` rule also fixes this one case. Add a row with a space after the quote.
2. `src/lib/redact.ts:157-160` and `:142-151` · `continuations` reads any `<<` followed by a word as a heredoc and skips every line after the next newline until a line equals that word. It also ends a single-quoted string at the `\'` of an ANSI-C `$'a\'b'` string. After either misread, no later continuation is joined, so the round 4 leak is back: `echo $((1<<2))` + newline + `curl \` + newline + ` -u a:s3cret h` and `x=$((a<<b))` + newline + `mysql \` + newline + ` -ps3cret` send the whole password to the judge. The same happens after `echo $'a\'b'`. At 091f38f all three were redacted. · Fail closed on parse doubt: also run the rules on a copy that joins every backslash-newline (the round 4 copy) and write back the redacted spans from both copies, since the span map already supports it. Over-redaction is the file's stated preference. Add the arithmetic and ANSI-C rows.

#### Minor

1. `src/lib/redact.ts:31` · `RUN_ON` matches a secret word anywhere inside an uppercase run, so uppercase names that only contain one are now redacted: `HOCKEYSTICK=3`, `BYPASSED=4` and `COMPASSION=5` were kept at 091f38f. The report says `MONKEYS` is kept; it is redacted (`KEY` sits between `N` and `S`). · Accept as over-redaction and correct the report sentence, or require the run to end at a separator or digit after the secret word.
2. `src/lib/redact.ts:162-169` · An unquoted heredoc body is never joined, though bash joins it. `cat <<EOF` + newline + `TOKEN=ab\` + newline + `cd` + newline + `EOF` now leaks `cd`; at 091f38f the whole value was redacted. The report lists this under Limits. · Join continuations in unquoted bodies, or let the fail-closed union from Important 2 cover it.

## Ledger lines

Task 01: fix round 5/5 (4 addressed, 2 open: new Important, `apply` silently skips a rule whose output drops text, so `-H ' X-Api-Key: a b c'` leaks the words after the first; new Important, the continuation scanner misreads `$((1<<2))` and `$'a\'b'`, so a later `curl \` + newline + `-u a:s3cret` leaks the password; commits 091f38f..ad9f731)
Task 01: minor (deferred): the uppercase run-on rule redacts HOCKEYSTICK, BYPASSED and COMPASSION, and MONKEYS is redacted though the report says it is kept.
Task 01: minor (deferred): a continuation inside an unquoted heredoc body is not joined, so the part of a value after it leaks.
