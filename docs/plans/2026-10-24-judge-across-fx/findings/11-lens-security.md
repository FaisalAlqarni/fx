Lens: security, 2 findings

1. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/judge-review.ts:67` (callers at 223 and 249): `readUnder` stops traversal and symlink escape. It checks the resolved real path against the real `--root`, and an absolute path or `..` falls outside and returns null. But it has no check on which file inside `--root` gets read. A hostile package can name `.env`, `config/master.key`, `.npmrc`, `.git/config` or `id_rsa`, even though the file is not in the diff. `authored` then sends that file's first 40 lines (`judge-questions.ts:148`) to the judge. `search` sends the file's whole function-split text, in chunks (`judge-review.ts:249-255`).
   - The only protection is `redact()`, which `judge.ts:60` applies to every state value before the request. That is name-based (`KEY=`, `token:`, userinfo URLs). I did not confirm it catches PEM private-key bodies or secret values that have no secret-looking name. Treat those as possibly leaked.
   - The impact depends on the judge. If `base_url` is remote (`judge-cli.ts:99` shows this is allowed), the reviewer's untracked secret files can leave the machine. A local judge limits it to that host.

2. [Minor] `/development/fx/.worktrees/judge-across-fx/src/lib/judge-review.ts:236,289`: the package's file paths and function names go unescaped into the output (`reason: 'name'` entries and `brief` lines). That output goes back to the reviewing agent, so a hostile filename or function name can inject instructions into it. It can only add lines, because `main` has no code that removes a lens. The risk is a steered reviewer, not data loss.

What passed:
- No shell or `exec` appears in `judge-review.ts`.
- The only outbound call is `askJudge`, which uses the configured judge URL.
- The decision log records only the package basename, the cwd, and counts.
- Error paths pass through `redact`, and `judge.ts` strips the API key from network error messages.

Not checked:
- The bodies of `parseReviewPackage` and `parseTripwiresLine`: the file view elided them, so I never read how file paths are parsed.
- The specific patterns in `redact.ts`, beyond the name-based rules.
- `decision-log.ts` and `judge-call.ts` internals.
- A directory or FIFO inside `--root` as a hang risk: I did not look.
