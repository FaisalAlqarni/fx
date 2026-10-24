Controller re-review, task 03 fix round 3 (539be91..75b94f0, 6 production lines in src/lib/shell-rules.ts).

### Finding verdicts

- N4: ADDRESSED. `rulesOf` now checks `[...r.inner, ...(first ? resolve(first.words, vars).inner : [])]` (src/lib/shell-rules.ts, rulesOf): the string bash passes after unquoting and the raw text re-read for cmd, powershell and pwsh, each with `posix` false. For other programs `first` is undefined and the list equals `r.inner`, as before. The five N4 spellings from findings/03-rereview-r2.md are test cases expecting `win-wipe`; the report shows each RED (`gave grey, want win-wipe`) and then `shell-guard.test.js: ok`.
- Deferred minor (LOCALAPPDATA): fixed in the same round. `FX_STATE` gains `\$\{?LOCALAPPDATA\}?`; two cases expect `fx-state`, RED then GREEN.

### New breakage in the fix diff

None found. No test assertion was removed or changed (0 removed lines in shell-guard.test.ts). The extra alternative can also match `$LOCALAPPDATA}` followed by `/fx`, which is a refusal of a fx-state spelling and harmless.

## Ledger lines
Task 03: fix round 3/5: controller re-review (6 lines): 1 addressed, 0 open
