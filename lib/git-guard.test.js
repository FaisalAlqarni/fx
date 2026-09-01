'use strict';
// Run: node lib/git-guard.test.js <main-checkout> <worktree>
// Exercises the guard against real git directories, not mocks — the whole
// predicate is "what does git say about this directory", so a mock would be
// testing the mock.

const { inspect } = require('./git-guard');

const [MAIN, WT] = process.argv.slice(2);
if (!MAIN || !WT) { console.error('usage: git-guard.test.js <main> <worktree>'); process.exit(2); }

let pass = 0, fail = 0;
const check = (want, cmd, cwd, label) => {
  const got = inspect(cmd, cwd);
  const ok = got.allow === want;
  if (ok) pass++; else { fail++; console.log(`FAIL  ${label}\n      cmd: ${cmd}\n      want allow=${want} got allow=${got.allow} ${got.reason || ''}`); }
};
const blocked = (cmd, cwd, l) => check(false, cmd, cwd, l || cmd);
const allowed = (cmd, cwd, l) => check(true, cmd, cwd, l || cmd);

// ---- main checkout: no writes at all ----
blocked('git commit -m "x"', MAIN);
blocked('git add .', MAIN);
blocked('git merge feature', MAIN);
blocked('git rebase main', MAIN);
blocked('git cherry-pick abc123', MAIN);
blocked('git revert HEAD', MAIN);
blocked('git checkout feature', MAIN);
blocked('git switch feature', MAIN);
blocked('git apply patch.diff', MAIN);
blocked('git rm file.txt', MAIN);
blocked('git mv a b', MAIN);
blocked('git branch newthing', MAIN, 'branch <name> creates');

// ---- main checkout: reads are fine ----
allowed('git status', MAIN);
allowed('git log --oneline -5', MAIN);
allowed('git diff HEAD~1', MAIN);
allowed('git show abc', MAIN);
allowed('git rev-parse HEAD', MAIN);
allowed('git branch', MAIN, 'branch listing');
allowed('git branch -a', MAIN, 'branch listing with flag');
allowed('git tag', MAIN, 'tag listing');
allowed('git check-ignore -q .fx', MAIN);

// ---- worktree add must survive, or the worktree rule is unsatisfiable ----
allowed('git worktree add ../wt2 -b thing', MAIN);
allowed('git fetch origin', MAIN);

// ---- worktree: do whatever you like ----
allowed('git commit -m "x"', WT);
allowed('git add .', WT);
allowed('git merge feature', WT);
allowed('git rebase -i HEAD~3', WT);
allowed('git checkout other', WT);
allowed('git branch newthing', WT);
allowed('git reset --soft HEAD~1', WT);

// ---- push: outward-facing, but a worktree branch is what a PR is made of ----
allowed('git push origin feature', WT, 'push from a worktree');
allowed('git push -u origin feature', WT, 'push -u from a worktree');
blocked('git push origin main', MAIN, 'push from the main checkout');
blocked('git push', MAIN, 'bare push from the main checkout');

// ---- always blocked, worktree or not ----
for (const [cmd, label] of [
  ['git push --force', 'force push'],
  ['git push -f origin feature', 'force push short flag'],
  ['git push --force-with-lease', 'force-with-lease'],
  ['git push --no-verify', 'push --no-verify'],
  ['git push --delete origin feature', 'push --delete'],
  ['git push -d origin feature', 'push -d'],
  ['git push origin :feature', 'push refspec deletion'],
  ['git reset --hard HEAD~1', 'reset --hard'],
  ['git clean -fdx', 'clean -fdx'],
  ['git clean --force', 'clean --force'],
  ['git branch -D feature', 'branch -D'],
  ['git checkout .', 'checkout .'],
  ['git restore .', 'restore .'],
  ['git stash drop', 'stash drop'],
  ['git stash clear', 'stash clear'],
  ['git tag -d v1', 'tag -d'],
  ['git commit --no-verify -m "x"', 'no-verify'],
]) { blocked(cmd, WT, `${label} (worktree)`); blocked(cmd, MAIN, `${label} (main)`); }

// ---- attribution, the rule that has to survive into a subagent ----
blocked('git commit -m "fix\n\nCo-Authored-By: Claude <x@y>"', WT, 'Co-Authored-By');
blocked('git commit -m "fix" -m "Claude-Session: https://x"', WT, 'Claude-Session');
blocked('git commit -m "feat\n\n🤖 Generated with Claude Code"', WT, 'Generated with');
blocked('git commit --trailer "Co-Authored-By: x"', WT, 'trailer flag');
allowed('git commit -m "fix the co-author page layout"', WT, 'benign lookalike prose');

// ---- evasion attempts ----
blocked('cd /tmp && git commit -m x', MAIN, 'compound: cd && git');
blocked('git status && git commit -m x', MAIN, 'compound: read then write');
blocked('echo hi; git add .', MAIN, 'semicolon chain');
blocked(`git -C ${MAIN} commit -m x`, WT, '-C targeting main from a worktree');
blocked('GIT_AUTHOR_NAME=x git commit -m y', MAIN, 'env assignment prefix');
blocked('/usr/bin/git commit -m x', MAIN, 'absolute path to git');
allowed(`git -C ${WT} commit -m x`, MAIN, '-C targeting a worktree from main');

// ---- non-git and non-repo ----
allowed('ls -la', MAIN);
allowed('npm test', MAIN);
allowed('git commit -m x', '/tmp', 'not a repo at all');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
