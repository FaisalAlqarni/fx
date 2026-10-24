Controller re-review, task 03 fix round 1 (3edac0a..9b31c47), 6 production lines.

### Fixed
- Important, String(command) turning a Symbol throw into an allow: src/lib/git-guard.ts now coerces with template literals at the regex test and the alwaysBlocked call, matching old lib/git-guard.js lines 225 and 238 behaviour (a Symbol throws TypeError). Line 39's String(command) is unchanged and was in the old code.
- Covering test: src/lib/git-guard-symbol.test.ts asserts inspect(Symbol('git push -f')) throws TypeError; ran `node lib/git-guard-symbol.test.js`: passed, exit 0. Implementer reports RED before the fix and 0 differences in 93,070 old-versus-new cases.

### New issues
None.
