Lens: security, 5 findings

No secret reaches the judge unredacted, and nothing is sent anywhere but the configured judge URL. The judge request redacts every state field before sending (`/development/fx/.worktrees/judge-across-fx/src/lib/judge.ts`, `requestBody`). Refusal reasons carry only the rule text and the relative path. I did not read `decision-log.ts`, so I took the comment in the diff that `logDecision` redacts as given.

1. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:168`: the agent can switch off the `no-secrets` refusal. `.fx.json` `hooks.edit_rules: false` makes `decide` return ALLOW before the built-in rules run. The agent can write `.fx.json`, and it is not covered by the fx-state refusal.
   - An agent, or a prompt-injected one, edits `.fx.json` and then writes a secret in the next call.
   - The only trace is the after-the-fact notice from `src/lib/fx-json-watch.ts:23`, shown at Stop or in the health line. By then the secret is on disk.
   - The three built-in rules should not depend on a repo-writable switch. At minimum, a change to `hooks` in `.fx.json` should be refused or gated.
   - The git guard, shell guard and fx-state refusal are not disabled by this switch. They run before `checkEdit` and read separate config.

2. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:71` (via `globMatch` at line 55): a repo-supplied glob can hang the hook, which can skip the Codex shell guard.
   - Globs come from `.fx.json` and are capped at 200 characters. Each `**/` becomes a repeated optional directory group, so a glob made of many `**/` segments backtracks catastrophically on a deep path.
   - The built-in rules run first with fixed globs, so `no-secrets` itself is not skipped.
   - In `src/hooks/fx-codex.ts:323-324`, the Codex Bash `apply_patch` path now runs `checkEdit` before `shellGuard`. A hung `checkEdit` ends in a hook timeout, and `shellGuard` never runs. If Codex treats a timeout as non-blocking, the shell hard rules are bypassed for that call.
   - I did not verify Codex's timeout semantics. Cap the number of `**/` segments or avoid building a regex from untrusted globs.

3. [Important] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:157` (the `checkEdit` catch), with `src/hooks/fx-pretooluse.ts:254-258` and `src/hooks/fx-codex.ts:331-336`: every crash or load failure allows the edit, including the built-in `no-secrets` and `no-conflict-markers` refusals.
   - This is stated as intentional.
   - The hard `no-secrets` refusal therefore holds only while the module loads and the redactor does not throw. A crafted input that makes `redact` throw or run slowly (I did not test this) turns it off silently.
   - The built-ins are plain code checks. They could fail closed, or at least be isolated from the judge-side imports, the way the shell hard rules are.

4. [Minor] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:224` and `:248`: `refusingRule(a.rule.id)` looks only at the rule id, but repo rules are defined in `.fx.json`. A repo, or the agent, can define a rule with a measured, refusing id and its own glob and text. That rule then gets the refuse power the measurement earned for a different rule. A hostile `.fx.json` can use this to make fx refuse arbitrary edits. Bind the refuse power to the rule text and glob, or to a hash of them.

5. [Minor] `/development/fx/.worktrees/judge-across-fx/src/lib/edit-rules.ts:213`: a file-scope repo rule sends the whole existing file (via `readText`), not only the added lines, to the judge. A glob such as `**/*` or `.env*` therefore ships existing `.env` or config contents. The only protection is the redactor, which misses secrets that match no pattern. The judge is local, so this is exposure rather than exfiltration. Consider excluding dotenv and key files from file-scope reads.

Coverage gaps, none of them a new regression:
- `no-secrets` only sees structured edit tools and `apply_patch`. A Claude Code Bash `cat > f` or `sed -i`, or a Codex shell write without the string `apply_patch`, bypasses it (`changedFiles`, `src/lib/edit-rules.ts:90-130`).
- `addedLines` drops lines that already exist in the old text, so only lines the edit adds are checked. That is correct for this purpose.
