### Finding verdicts

- **05-review Important 1 / Spec ❌: `git commit * --no-verify *` blocks a commit message that mentions the flag**: ADDRESSED. lib/opencode-v2-policies.js:32-33 use `leading()` only for commit and push `--no-verify`; :41 does the same for `tag -d/--delete`. :32 pins `git commit -m "explain --no-verify flag"` in `allowed`, and :41 pins `git tag -a v1 -m "delete with -d flag"`. I ran both, plus `git commit --amend -m "x --no-verify y"`, `git notes add -m "git push --force"` and `git stash push -m "reset --hard later"`: the guard allows each and no policy matches. The later-position form (`git commit -m x --no-verify`) now passes the policy, but the guard still refuses it (checked). That is the trade the finding offered. The residual quoted-text case in push `-o` is ledgered as Minor below.
- **Lens [Critical] 1: a failed `permission.evaluate` registration leaves every shell call unguarded, silently**: ADDRESSED. plugins/fx-opencode-v2.js:144 and :202 capture the registration error. At :210, `execute.before` throws for every shell call and names the error; probe Q4 proves a throw there refuses cleanly. The throw comes before the record at :212, so no id leaks (probe Q3 notes). If both registrations fail, :219-220 push "the git guard is off" into `failures`, and the preamble shows it. Tests at tests/gates/opencode-v2-plugin.test.js:219, :226 and :231. Controller check: I put the 35e801a plugin into a scratch worktree at d149944 and ran the test. Each new case failed on the old plugin once the earlier assertion was neutralised. In order: "an array command is not recorded" (:202, actual allow), "with evaluate unregistered, execute.before refuses every shell call" (:219, thrown undefined), "with both registrations failed, the preamble says the git guard is off" (:226), "a failed execute.before registration shows in the denial" (:231). I then removed the scratch worktree.
- **Lens [Important] 2: `String(ev.input.command)` records "undefined" or an array's join, so `inspect` allows**: ADDRESSED. plugins/fx-opencode-v2.js:212 records only when `typeof ev.input.command === 'string'`. Anything else misses the lookup at :164, and the call is denied. The tests at tests/gates/opencode-v2-plugin.test.js:198-203 cover an array, a missing field and a missing input. The array case failed against 35e801a (seen).

### New breakage in the fix diff

- Minor: lib/opencode-v2-policies.js:26, :28-29 and :30 still use the mid-command forms (`git push * --force *`, `git push * main *`, `git push * -d *`). The fix report says "Other families take no message text; checked". That misses `git push -o/--push-option`, which takes free text. Three commands the guard allows are blocked by a policy nobody can override: `git push -o "merge into main now" origin feature`, `git push -o "ci.variable=A --force x" origin feature` and `git push --push-option="desc: -d later" origin feature` (run). This is rare in practice, and the workaround is to reword the option. `git branch -m "a -D b"` also matches, but a branch name cannot contain spaces, so that case does not matter.
- Minor: plugins/fx-opencode-v2.js:147-201: the evaluate hook body was wrapped in a new `try`, but its lines were not reindented. The block now reads one level shallower than its nesting.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 05: fix round 1/5 (3 addressed, 0 open: none; commits 35e801a..d149944)
Task 05: minor (deferred): push policies `git push * --force *`, `* main *`, `* -d *` still block a guard-allowed `git push -o "<text holding the token>"`
Task 05: minor (deferred): evaluate hook body in plugins/fx-opencode-v2.js:147-201 not reindented after the try wrap
