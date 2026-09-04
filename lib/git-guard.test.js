'use strict';
// Run: node lib/git-guard.test.js <main-checkout> <worktree>
// Exercises the guard against real git directories, not mocks: the whole
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

// ---- location is the workflow's business, not the guard's ----
// superpowers has no rule against committing to a main checkout: it puts work
// in a worktree via a procedure and gates integration with a human question.
// fx adopts that. The guard stopped resolving repositories, which is what
// DEBT #47 got wrong in both directions: it refused `cd <worktree> && git
// commit` and allowed `cd <main> && git commit`, silently.
allowed('git commit -m "x"', MAIN, 'commit on a main checkout is the workflow\'s call');
allowed('git add .', MAIN);
allowed('git merge feature', MAIN);
allowed('git rebase main', MAIN);
allowed(`cd ${MAIN} && git commit -m x`, WT, 'DEBT #47: cd no longer changes the verdict');
allowed(`cd ${WT} && git commit -m x`, MAIN, 'DEBT #47: and neither does the reverse');

// ---- worktree add must survive, or the worktree rule is unsatisfiable ----
allowed('git worktree add ../wt2 -b thing', MAIN);
allowed('git fetch origin', MAIN);
allowed('git init', MAIN, 'init a new repo from a main checkout');
allowed('git init /development/newproj', MAIN, 'init with a path');
allowed('git clone https://x/y.git', MAIN, 'clone into a new dir');
allowed('git init', WT, 'init from a worktree');

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
blocked('git push origin main', MAIN, 'push targeting the base branch');
blocked('git push origin master', WT, 'base branch by any name, from anywhere');
blocked('git push', WT, 'a bare push names no target and may be the base branch');
blocked('git push origin HEAD', MAIN, 'HEAD is whatever branch you happen to be on');
allowed('git push origin feature', MAIN, 'an explicit feature branch is fine anywhere');

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
blocked('cd /tmp && git push origin main', MAIN, 'compound: cd && git');
blocked('git status && git push origin main', MAIN, 'compound: read then write');
blocked('echo hi; git push origin main', MAIN, 'semicolon chain');
allowed(`git -C ${MAIN} commit -m x`, WT, '-C no longer implies a location rule');
blocked('GIT_AUTHOR_NAME=x git push origin main', MAIN, 'env assignment prefix');
blocked('/usr/bin/git push origin main', MAIN, 'absolute path to git');
allowed(`git -C ${WT} commit -m x`, MAIN, '-C targeting a worktree from main');

// ---- non-git and non-repo ----
allowed('ls -la', MAIN);
allowed('npm test', MAIN);
allowed('git commit -m x', '/tmp', 'not a repo at all');

// ---- a shell invoked with -c is running commands, not carrying data ----
// The counterpart to DEBT #46: a search tool's argument is data, but `sh -c`
// exists to execute its argument. Both were wrong before, in opposite ways.
blocked(`bash -c 'git push origin main'`, WT, 'bash -c hiding a base-branch push');
blocked(`sh -c "git push --force origin x"`, WT, 'sh -c hiding a force push');
blocked(`bash -lc 'git reset --hard'`, MAIN, 'bash -lc');
allowed(`bash -c 'ls -la'`, MAIN, 'bash -c with nothing of ours in it');
allowed(`grep -rn 'bash -c' docs/`, MAIN, 'searching for the pattern is still data');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ---- DEBT #46: a search pattern is data, not a command ----
allowed(`grep -rn 'git push' docs/`, MAIN, 'searching for a forbidden literal');
allowed(`grep -rniE 'git push|git merge' docs/`, MAIN, 'an alternation in the pattern');
allowed(`grep -rn -i 'co-authored|generated with' docs/`, MAIN, 'searching for trailers');
allowed(`rg 'git commit --amend' .`, WT, 'ripgrep');
blocked(`bash -c 'git push origin main'`, WT, 'a real invocation is still a command');

