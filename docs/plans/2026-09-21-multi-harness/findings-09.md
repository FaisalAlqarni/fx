# Task 09 review findings

**Spec compliance: PASS** (19/19; the `commands/fx-setup.md` leg correctly
dropped per ruling and moved to task 10)
**Task quality: PASS**
No Critical or Important findings.

## One converter, established properly

The reviewer grepped `convert_agent` repository-wide across `*.py` and `*.js`:
the only hit is a comment in `lib/agent-dialects.js` saying the installer calls
that module instead of keeping its own. It then confirmed
`scripts/fx-opencode-install` is **the only Python file in the repository**, so
no second implementation can hide elsewhere. Both `plugins/fx.js` and the
installer call the same `toOpencodeAgent`, driven by the same
`READ_ONLY_AGENTS`.

## The rewritten scenario, proven mutation-sensitive

This was the risk: a scenario rewritten from "byte-identical" to something
weaker is exactly where an assertion quietly stops asserting. The reviewer
mutated `merge_opencode_json` into a wholesale rewrite that drops the user's
`theme` key, and got `FAIL: opencode.json keeps the user's own keys`, with the
`subagent_depth` check still passing and correctly isolating which half broke.
Restored clean.

## Warn, never refuse

Constructed by hand with `HOME` pointing at a fixture already holding `fx-tdd`
under `~/.agents/skills`. **Exit code 0**, install completed, and stdout named
both pools and the remediation. A non-zero exit here would have broken a working
install, which the design forbids.

## Six agents, all six checked

Every generated file inspected directly rather than through the harness. All
six, including `fx-devils-advocate`, carry `permission: edit: deny, bash: allow`
and **none contains a `tools:` key**, which on opencode would be a silent no-op.

## Other verification

All three harness modes exit 0. Installing twice into one destination produces
identical trees and identical SHA-256 per file. `--dry-run` creates nothing and
its printed paths are byte-identical to a real run's. Codex planting writes
regular files, zero symlinks. `~/.codex/agents` absent before and after. No fx
artifacts under the real opencode home. `lib/git-guard.js` untouched, no
attribution trailer.

## The implementer found six defects in the task-supplied test

Trap clobbering; an `exit` escaping `eval` into the whole suite; a tautological
OR; a false-positive regex; an out-of-scope file assertion; a mismatched check
name and assertion. Each documented with a reason. That is eleven plan-authored
test defects across this build, every one caught by someone running the code
rather than reading it.

## Cannot verify

That `~/.agents/skills` really is opencode 1.18.25's second pool rests on the
measurement recorded in `references/harnesses/opencode.md`; the reviewer did not
re-derive it against a live install. Task 12 covers it.
