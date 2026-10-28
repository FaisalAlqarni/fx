# Task 06 review

### Spec Compliance
- ✅ Spec compliant. Read from the diff and src/lib/sf-detect.ts at 64a6c4e; nothing was run.
- ⚠️ Cannot verify from diff: the listed tests were not re-run, per the rules.

### Strengths
- Output rule order matches the Deviations: existing pick, then `<docs>/system`, then `<docs>/system-generated`, else exit 1 naming both (sf-detect.ts, detect).
- `writeFxJson` edits the parsed document: it sets only `system_flow.output`, adds roots not yet listed, and never overwrites an existing root. Other top-level keys and other `system_flow` keys survive. Root paths come from `path.relative`, so a `--repo` given as an absolute path is still written relative.
- No `--write`, no write. Tests cover the byte-identical second write, the collision and missing-folder messages, and an empty `git status`.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
1. src/lib/sf-detect.ts docsConfig: an absolute `docs_dir` in mkdocs.yml gives an absolute `output.site` and `output.markdown`, and `--write` saves them. That breaks the rule against writing an absolute machine path into `.fx.json`. Reject it or make it relative.
2. src/scripts/system-flow-detect.test.ts: `--write` is tested only against a `test_all` key. Nothing pins that an existing `system_flow.theme` or `diagrams` block survives, or that an existing root's path is not changed, though the Idempotency field requires both.

The report's untested VitePress config at the host root and missing `.fx.json` root are not required: the brief's Tests field names only `guide/.vitepress` and `--repo ../nowhere`.

### Assessment
**Task quality:** Approved
**Reasoning:** Output choice, relative-only roots and key preservation all follow the brief. Two Minors remain: an absolute `docs_dir` and thin preservation tests.

## Ledger lines
Task 06: minor (deferred): an absolute mkdocs docs_dir would be written into .fx.json as an absolute output path.
Task 06: minor (deferred): the detect tests do not pin that --write keeps system_flow.theme, diagrams and existing root paths.
