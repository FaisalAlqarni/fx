### Finding verdicts

- **Review Important: `--major 1` after `--major 2` does not restore v1 output on a clean destination**: ADDRESSED. Record-based removal of `experimental.subagent_depth` and empty `experimental` (scripts/fx-opencode-install plan_opencode_json, v1 branch). Ran v1, v2, v1 into a fresh dir on the working copy (installer identical to d12d931): `diff -r` against the fresh v1 tree clean. Clean-seed test added (tests/install/run.sh "clean v1, v2, v1 equals a fresh v1 tree").
- **Security 1 (Important): 1.x run deletes user's policy equal to fx's**: ADDRESSED. Ownership by `<dest>/.fx-opencode-owned.json`; only recorded entries removed, missing record = fx owns nothing (plan_opencode_json, owned_policies). A user rule added first is never recorded, so a later 1.x run keeps it. Test "a user's own identical policy and depth 2 survive v2 then v1".
- **Security 2 (Important): detect_major trusts any integer, no timeout**: ADDRESSED. Only 1 or 2 accepted, else exit naming `--major`; `timeout=10` with TimeoutExpired handled (detect_major). Tests: 0.9.1, 3.0.0, no number, hanging stub.
- **Ruled: null or non-object `experimental` refused before any write**: ADDRESSED. plan_opencode_json runs in the checks phase (before links, agents, skills); covers null, array, non-list policies, both majors. Test asserts nothing created.
- **Ruled: version detection 10 s timeout**: ADDRESSED (same as Security 2).

### New breakage in the fix diff

Minor: the record file is rewritten on every run even when nothing changed (write_opencode_json, `if out: write_atomic`), so "a run that changes nothing writes nothing" no longer holds for the record. Content is identical, harmless.
Minor: an install made before this round has no record, so its depth 2 and policies become the user's and are never cleaned up by 1.x. Report notes it; pre-production, accepted.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 06: fix round 1/5 (5 addressed, 0 open: none; commits 44ab55b..d12d931)
Task 06: minor (deferred): ownership record rewritten on every run even when unchanged
Task 06: minor (deferred): pre-round-1 installs have no record, so their depth and policies are treated as the user's
