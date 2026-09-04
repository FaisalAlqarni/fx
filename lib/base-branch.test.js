'use strict';
// Regression tests: push is allowed from a worktree, but NEVER to the base
// branch. Found by dogfooding: the D-A implementation allowed
// `push origin main` from a worktree, which is looser than the option the user
// chose ("allowed on a feature branch in a worktree") and violates the
// standing rule "never push to the base branch without explicit say-so".
//
// Run: node lib/base-branch.test.js <main-checkout> <worktree>

const { inspect } = require('./git-guard');

const [MAIN, WT] = process.argv.slice(2);
if (!MAIN || !WT) { console.error('usage: base-branch.test.js <main> <worktree>'); process.exit(2); }

const G = ['g', 'i', 't'].join('');
let pass = 0, fail = 0;
const check = (want, cmd, cwd, label) => {
  const got = inspect(cmd, cwd).allow;
  if (got === want) pass++;
  else { fail++; console.log(`FAIL  ${label}\n      ${cmd}\n      want allow=${want} got allow=${got}`); }
};

// --- blocked everywhere: the base branch is the user's to move ---
for (const [cmd, label] of [
  [`${G} push origin main`, 'push origin main'],
  [`${G} push origin master`, 'push origin master'],
  [`${G} push origin trunk`, 'push origin trunk'],
  [`${G} push origin HEAD:main`, 'push HEAD:main'],
  [`${G} push origin feature:master`, 'push feature:master'],
  [`${G} push origin refs/heads/main`, 'push refs/heads/main'],
  [`${G} push origin +main`, 'push +main'],
  [`${G} push -u origin main`, 'push -u origin main'],
]) {
  check(false, cmd, WT, `${label} (worktree)`);
  check(false, cmd, MAIN, `${label} (main checkout)`);
}

// --- still allowed: a feature branch from a worktree ---
check(true, `${G} push origin feature`, WT, 'feature branch from worktree');
check(true, `${G} push -u origin my-work`, WT, 'push -u feature from worktree');
check(true, `${G} push origin HEAD:feature`, WT, 'HEAD:feature from worktree');
check(false, `${G} push`, WT, 'a bare push names no target and may follow the base branch');

// --- a branch merely CONTAINING the word is not the base branch ---
check(true, `${G} push origin maintenance`, WT, 'branch named maintenance');
check(true, `${G} push origin feature/main-nav`, WT, 'branch named feature/main-nav');
check(true, `${G} push origin mastermind`, WT, 'branch named mastermind');

// --- nothing else loosened ---
check(false, `${G} push --force origin feature`, WT, 'force push still blocked');
check(true, `${G} push origin feature`, MAIN, 'an explicit feature branch is fine anywhere');
check(true, `${G} commit -m x`, MAIN, 'where you commit is the workflow\'s business, not the guard\'s');
check(true, `${G} commit -m x`, WT, 'commit in worktree still allowed');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
