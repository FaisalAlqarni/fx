'use strict';
// The always-on policy layer for OpenCode 2.x: deny rules the installer writes
// into opencode.json (`experimental.policies`). A policy cannot be overridden
// and says only "Blocked by configuration policy", so every pattern is tight:
// v2's Wildcard.match turns `*` into `.*` and lets a trailing ` *` also match
// the bare command. No pattern contains `?`, and none ends in a bare `*` glued
// to a word (`main*` would block `main-fix`).
//
// This is the second layer behind the plugin's guard, which sees the full
// command text. `sample` (a command the guard refuses) and `allowed` (commands
// the guard allows) let tests/gates/opencode-v2-policies.test.js check each
// pattern against lib/git-guard.js in both directions. The installer writes
// each entry without `sample` and `allowed`.
// ponytail: patterns cover the plain spellings (`git push origin main`, no `-C`
// or `-c` options, no `HEAD:refs/heads/main`); the plugin guard covers the rest.

// `git <sub> <flag> *` and `git <sub> * <flag> *`: the flag first or later.
const forms = (prefix, flag) => [`${prefix} ${flag} *`, `${prefix} * ${flag} *`];

const FAMILIES = [
  [[].concat(...['--force', '-f', '--force-with-lease', '--force-with-lease=*'].map((f) => forms('git push', f))),
    ['git push origin feature', 'git push -u origin feature-f']],
  [[].concat(...['main', 'master', 'trunk'].map((b) => [`git push * ${b}`, `git push * ${b} *`, `git push * *:${b}`, `git push * *:${b} *`])),
    ['git push origin feature', 'git push origin main-fix', 'git push origin feature:main-fix']],
  [[].concat(...['--delete', '-d'].map((f) => forms('git push', f)), ['git push * :*']),
    ['git push origin feature', 'git push origin HEAD:feature']],
  [forms('git commit', '--no-verify'), ['git commit -m x', 'git log --grep no-verify']],
  [forms('git push', '--no-verify'), ['git push origin feature', 'git log --grep no-verify']],
  [forms('git reset', '--hard'), ['git reset --soft HEAD~1', 'git reset HEAD file.txt']],
  [[].concat(...['-f', '-fd', '-df', '-fx', '-xf', '-fdx', '-fxd', '-dfx', '-dxf', '-xfd', '-xdf', '--force'].map((f) => forms('git clean', f))),
    ['git clean -n', 'git clean -nd', 'git clean --dry-run']],
  [forms('git branch', '-D'), ['git branch feature', 'git branch -d merged']],
  [['git stash drop *', 'git stash clear *'], ['git stash pop', 'git stash list']],
  [[].concat(...['checkout', 'restore'].map((s) => [`git ${s} .`, `git ${s} . *`, `git ${s} * .`, `git ${s} * . *`])),
    ['git checkout .github/x', 'git checkout feature', 'git restore src/x.js']],
  [[].concat(...['-d', '--delete'].map((f) => forms('git tag', f))), ['git tag v1', 'git tag -l']],
];

const GUARD_POLICIES = [].concat(...FAMILIES.map(([patterns, allowed]) => patterns.map((p) => ({
  action: 'permission',
  resource: `shell:${p}`,
  effect: 'deny',
  sample: p.replace(/\*/g, 'x'),
  allowed,
}))));

module.exports = { GUARD_POLICIES };
