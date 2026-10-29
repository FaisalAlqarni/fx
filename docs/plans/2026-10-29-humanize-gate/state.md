# State: humanize gate

RED, `node tests/gates/check-prose-humanize.test.js` before the script change:

```
AssertionError [ERR_ASSERTION]: Markdown line 2 flagged as dash:
0 block(s) exempted by `prose-gate: quoting`
FAIL: 1 lines with a dash, 1 stock-vocabulary hits, 0 block(s) with an unclosed parenthesis, 0 mis-tagged closing fence(s)
  /tmp/claude-1000/hg/tmp/check-prose-humanize-BkItoF/note.md:2  dash
  /tmp/claude-1000/hg/tmp/check-prose-humanize-BkItoF/note.md:3  "delve"
```

After the script change, before the skill text: `AssertionError [ERR_ASSERTION]: final review has a Humanize pass section`.

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 01 | check-prose flags each chosen pattern in Markdown and in `#`, `//`, `/* */`, `<!-- -->` and docstring comments, skips code outside comments and fenced code, exits 0 on a clean file, and with `--diff` reads only added lines and untracked files | `src/tests/gates/check-prose-humanize.test.ts` | gate | PASS | `node tests/gates/check-prose-humanize.test.js` |
| 02 | fx-implement's final review names the single humanize pass; the implementer and exit gate run check-prose; fx-docs and fx-adr invoke fx-humanize | `src/tests/gates/check-prose-humanize.test.ts` | gate | PASS | same command |
