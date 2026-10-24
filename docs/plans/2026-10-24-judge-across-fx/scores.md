# Judge scores

The rows `scripts/judge-calibrate.js` printed for each labelled set in `sets/`,
copied unchanged. `src/lib/judge-features.ts` takes `FEATURE_GATE`,
`REFUSING_RULES` and `JUDGE_CONCURRENCY` from these rows, and
`lib/judge-features.test.js` fails when the two disagree.

Backend: nimble:9b at http://127.0.0.1:11434
Measured: 2026-10-24

Each run: `scripts/scratch-env node scripts/judge-calibrate.js <feature> --base-url http://127.0.0.1:11434 --model nimble:9b`,
then the same with `concurrency`. No item in any run was unavailable.

| feature | metric | value | confident | unsure-clean | bar | gate | median | max |
|---|---|---|---|---|---|---|---|---|
| lane-hint | accuracy | 85% | confident 54/64, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 89 ms | max 169 ms |
| dispatch-sizing | precision | 94% | confident 34/52, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 41 ms | max 52 ms |
| edit-rules | precision | 97% | confident 169/323, unavailable 0 | unsure-clean 22% | bar 95% | log-only | median 33 ms | max 98 ms |
| review-tripwires | accuracy | 100% | confident 59/60, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 38 ms | max 54 ms |
| review-authored | accuracy | 83% | confident 30/32, unavailable 0 | unsure-clean n/a | bar 85% | log-only | median 39 ms | max 48 ms |
| review-search | accuracy | 97% | confident 99/100, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 35 ms | max 49 ms |

Per rule, as `judge-calibrate edit-rules` printed them. Ruling C2 of
`state.md`: these rows alone decide which rules refuse, and `edit-rules` is
enabled when at least one does, whatever the aggregate row above says.

| rule rails-fk-index | precision | 93% | confident 29/42, unavailable 0 | unsure-clean 25% | bar 95% | advises |
| rule rails-no-rescue-nil | precision | 100% | confident 14/41, unavailable 0 | unsure-clean 0% | bar 95% | advises |
| rule dotnet-no-blocking-async | precision | 100% | confident 30/40, unavailable 0 | unsure-clean 10% | bar 95% | refuses |
| rule dotnet-no-empty-catch | precision | 100% | confident 15/40, unavailable 0 | unsure-clean 0% | bar 95% | advises |
| rule react-no-raw-html | precision | 90% | confident 31/40, unavailable 0 | unsure-clean 40% | bar 95% | advises |
| rule react-key-not-index | precision | 100% | confident 5/40, unavailable 0 | unsure-clean 90% | bar 95% | advises |
| rule docker-pinned-base | precision | 100% | confident 15/40, unavailable 0 | unsure-clean 10% | bar 95% | advises |
| rule web-img-alt | precision | 100% | confident 30/40, unavailable 0 | unsure-clean 0% | bar 95% | refuses |

Concurrency:

| concurrency | sequential | sequential median 31 ms | concurrent max 89 ms | failures 0 sequential, 0 concurrent |
