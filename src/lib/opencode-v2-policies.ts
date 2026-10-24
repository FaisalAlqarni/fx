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
const forms = (prefix: string, flag: string) => [`${prefix} ${flag} *`, `${prefix} * ${flag} *`];
// Subcommands that take a free-text message (`commit -m`, `tag -m`) get the
// leading form only: `git commit * --no-verify *` would also block a message
// that merely mentions the flag, and no policy can be overridden. The plugin
// guard, which tokenizes the full command, catches the later positions.
const leading = (prefix: string, flag: string) => [`${prefix} ${flag} *`];

const FAMILIES: [string[], string[]][] = [
  [['--force', '-f', '--force-with-lease', '--force-with-lease=*'].flatMap((f) => forms('git push', f)),
    ['git push origin feature', 'git push -u origin feature-f']],
  [['main', 'master', 'trunk'].flatMap((b) => [`git push * ${b}`, `git push * ${b} *`, `git push * *:${b}`, `git push * *:${b} *`]),
    ['git push origin feature', 'git push origin main-fix', 'git push origin feature:main-fix']],
  [[...['--delete', '-d'].flatMap((f) => forms('git push', f)), 'git push * :*'],
    ['git push origin feature', 'git push origin HEAD:feature']],
  [leading('git commit', '--no-verify'), ['git commit -m x', 'git log --grep no-verify', 'git commit -m "explain --no-verify flag"']],
  [leading('git push', '--no-verify'), ['git push origin feature', 'git log --grep no-verify']],
  [forms('git reset', '--hard'), ['git reset --soft HEAD~1', 'git reset HEAD file.txt']],
  [['-f', '-fd', '-df', '-fx', '-xf', '-fdx', '-fxd', '-dfx', '-dxf', '-xfd', '-xdf', '--force'].flatMap((f) => forms('git clean', f)),
    ['git clean -n', 'git clean -nd', 'git clean --dry-run']],
  [forms('git branch', '-D'), ['git branch feature', 'git branch -d merged']],
  [['git stash drop *', 'git stash clear *'], ['git stash pop', 'git stash list']],
  [['checkout', 'restore'].flatMap((s) => [`git ${s} .`, `git ${s} . *`, `git ${s} * .`, `git ${s} * . *`]),
    ['git checkout .github/x', 'git checkout feature', 'git restore src/x.js']],
  [['-d', '--delete'].flatMap((f) => leading('git tag', f)), ['git tag v1', 'git tag -l', 'git tag -a v1 -m "delete with -d flag"']],
];

export const GUARD_POLICIES = FAMILIES.flatMap(([patterns, allowed]) => patterns.map((p) => ({
  action: 'permission',
  resource: `shell:${p}`,
  effect: 'deny',
  sample: p.replace(/\*/g, 'x'),
  allowed,
})));
