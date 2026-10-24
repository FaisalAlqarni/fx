### Finding verdicts

- **Review Important: warm-up fetch and "no usable judge" line duplicated across the two calibrate scripts**: ADDRESSED. `src/lib/judge.ts` now exports `warmUp(config)` and `unusableReason(handle)`. The diff deletes the inline fetch from both `src/scripts/guard-calibrate.ts` and `src/scripts/judge-calibrate.ts` and both call the helpers. `lib/judge.test.ts` covers ok, 503, network down, mock skip and the three `unusableReason` cases.
- **Lens 1 Important: printed rows omit the unavailable count**: ADDRESSED. `scoreRow` and `ruleRow` print `confident c/t, unavailable u` inside the existing cell (nine cells kept), and `RuleScore` carries `unavailable`. `lib/judge-score.test.ts` asserts a dead judge row (`confident 0/3, unavailable 3`) and the process gate asserts the row on a failing server.
- **Lens 2 Important: exit 0 when every item or request was unavailable**: ADDRESSED. `src/scripts/judge-calibrate.ts` returns 1 after printing the rows when `s.unavailable === s.total` (total > 0) and when `answered === 0` in concurrency mode. `judge-calibrate.test.ts` asserts exit 1 and both stderr lines against a server that answers 500.
- **Lens 3 Important: sequential failures pushed as latencies; latency stats include unavailable items**: ADDRESSED. The concurrency loop pushes a sequential latency only when `result.ok` and counts `sequentialFailures`. `scoreConcurrency` takes `sequentialFailures` and forces `sequential` mode when it is above 0. `scoreFeature` takes median and max from `answered` only. Unit tests cover both (`down` with latency 1500 excluded, `seqFail`), and the process test with request 1 failing asserts `failures 1 sequential, 0 concurrent`.
- Lens 4 (Minor, not open) was fixed anyway: the warm-up failure reason now goes to stderr. The "no budget" comment wording was replaced with "Capped at 120 s".

### New breakage in the fix diff

None. Checks I ran by reading the diff:
- `warmUp` skips on `config.mockAnswers` instead of `baseUrl === 'mock'`. The mock handle in the process tests carries mock answers and the gates pass per the report, so the behaviour holds. A real `baseUrl` that also sets `mock_answers` would now skip the warm-up, which is harmless.
- `warmUp` now sends the API key. The key is redacted from the failure message before it is printed.
- The guard-calibrate warm-up body changed from a guard state to `{ text: 'hello' }`. It only loads the model, so no score is affected. The report discloses it.
- The concurrency stderr progress line prints `sequential.join(' ')` (all rounds) instead of the last three. This is cosmetic.
- Report evidence: RED and GREEN rows are given for all three behaviour groups; judge, judge-score and judge-calibrate suites plus the type, generated and escape checks were run one by one. The full `check-all` did not complete, because of `check-prose` on the findings file, which the controller says is now fixed. I did not re-run it.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 01: fix round 1/5 (4 addressed, 0 open: none; commits 63f6aee..3e86e83)
