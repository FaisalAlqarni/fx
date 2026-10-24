Lens: security. 0 findings.

Compared every line of the old guard with src/lib/git-guard.ts and the generated lib/git-guard.js. Nothing found that lets the new guard allow a command the old one refused, or refuse one it allowed.

- Regexes: byte for byte the same (base branch, attribution, heredoc and here-string, fedToShell operators, segment split, expandShellC, parseGit tokens, clean -f); lookbehind kept.
- Segment splitting, heredoc stripping and sh -c expansion: same control flow; the non-null assertions at src/lib/git-guard.ts lines 504, 515, 520, 541, 551 to 560 are type-only.
- Fallbacks: the heredoc capture fallback at line 459 yields the same joined output as before; String(command) at lines 638 and 651 differs only for a Symbol input, which a JSON hook payload cannot carry.
- Removed raw field in alwaysBlocked: no rule read it.
- branch -D rule: inner parentheses dropped in output; precedence unchanged.
- Exports: all seven callers require the module and take inspect; the esbuild CommonJS wrapper still provides it.
- Known and unchanged: fedToShell and splitSegments split on operators without understanding quotes (documented, not a regression).

Not run: the guard's own tests against the generated file; hook behaviour when the guard fails to load (owned by task 06's failed-load golden cases).
