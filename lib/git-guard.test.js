// generated from src/lib/git-guard.test.ts by scripts/build: edit there, not here
"use strict";
var import_git_guard = require("./git-guard.js");
const [MAIN = "", WT = ""] = process.argv.slice(2);
if (!MAIN || !WT) {
  console.error("usage: git-guard.test.js <main> <worktree>");
  process.exit(2);
}
let pass = 0, fail = 0;
const check = (want, cmd, cwd, label) => {
  const got = (0, import_git_guard.inspect)(cmd, cwd);
  const ok = got.allow === want;
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL  ${label}
      cmd: ${cmd}
      want allow=${want} got allow=${got.allow} ${"reason" in got ? got.reason : ""}`);
  }
};
const blocked = (cmd, cwd, l) => check(false, cmd, cwd, l || cmd);
const allowed = (cmd, cwd, l) => check(true, cmd, cwd, l || cmd);
allowed('git commit -m "x"', MAIN, "commit on a main checkout is the workflow's call");
allowed("git add .", MAIN);
allowed("git merge feature", MAIN);
allowed("git rebase main", MAIN);
allowed(`cd ${MAIN} && git commit -m x`, WT, "DEBT #47: cd no longer changes the verdict");
allowed(`cd ${WT} && git commit -m x`, MAIN, "DEBT #47: and neither does the reverse");
allowed("git worktree add ../wt2 -b thing", MAIN);
allowed("git fetch origin", MAIN);
allowed("git init", MAIN, "init a new repo from a main checkout");
allowed("git init /development/newproj", MAIN, "init with a path");
allowed("git clone https://x/y.git", MAIN, "clone into a new dir");
allowed("git init", WT, "init from a worktree");
allowed('git commit -m "x"', WT);
allowed("git add .", WT);
allowed("git merge feature", WT);
allowed("git rebase -i HEAD~3", WT);
allowed("git checkout other", WT);
allowed("git branch newthing", WT);
allowed("git reset --soft HEAD~1", WT);
allowed("git push origin feature", WT, "push from a worktree");
allowed("git push -u origin feature", WT, "push -u from a worktree");
blocked("git push origin main", MAIN, "push targeting the base branch");
blocked("git push origin master", WT, "base branch by any name, from anywhere");
blocked("git push", WT, "a bare push names no target and may be the base branch");
blocked("git push origin HEAD", MAIN, "HEAD is whatever branch you happen to be on");
allowed("git push origin feature", MAIN, "an explicit feature branch is fine anywhere");
for (const [cmd, label] of [
  ["git push --force", "force push"],
  ["git push -f origin feature", "force push short flag"],
  ["git push --force-with-lease", "force-with-lease"],
  ["git push --no-verify", "push --no-verify"],
  ["git push --delete origin feature", "push --delete"],
  ["git push -d origin feature", "push -d"],
  ["git push origin :feature", "push refspec deletion"],
  ["git reset --hard HEAD~1", "reset --hard"],
  ["git clean -fdx", "clean -fdx"],
  ["git clean --force", "clean --force"],
  ["git branch -D feature", "branch -D"],
  ["git checkout .", "checkout ."],
  ["git restore .", "restore ."],
  ["git stash drop", "stash drop"],
  ["git stash clear", "stash clear"],
  ["git tag -d v1", "tag -d"],
  ['git commit --no-verify -m "x"', "no-verify"]
]) {
  blocked(cmd, WT, `${label} (worktree)`);
  blocked(cmd, MAIN, `${label} (main)`);
}
blocked('git commit -m "fix\n\nCo-Authored-By: Claude <x@y>"', WT, "Co-Authored-By");
blocked('git commit -m "fix" -m "Claude-Session: https://x"', WT, "Claude-Session");
blocked('git commit -m "feat\n\n\u{1F916} Generated with Claude Code"', WT, "Generated with");
blocked('git commit --trailer "Co-Authored-By: x"', WT, "trailer flag");
allowed('git commit -m "fix the co-author page layout"', WT, "benign lookalike prose");
blocked("cd /tmp && git push origin main", MAIN, "compound: cd && git");
blocked("git status && git push origin main", MAIN, "compound: read then write");
blocked("echo hi; git push origin main", MAIN, "semicolon chain");
allowed(`git -C ${MAIN} commit -m x`, WT, "-C no longer implies a location rule");
blocked("GIT_AUTHOR_NAME=x git push origin main", MAIN, "env assignment prefix");
blocked("/usr/bin/git push origin main", MAIN, "absolute path to git");
allowed(`git -C ${WT} commit -m x`, MAIN, "-C targeting a worktree from main");
allowed("ls -la", MAIN);
allowed("npm test", MAIN);
allowed("git commit -m x", "/tmp", "not a repo at all");
blocked(`bash -c 'git push origin main'`, WT, "bash -c hiding a base-branch push");
blocked(`sh -c "git push --force origin x"`, WT, "sh -c hiding a force push");
blocked(`bash -lc 'git reset --hard'`, MAIN, "bash -lc");
allowed(`bash -c 'ls -la'`, MAIN, "bash -c with nothing of ours in it");
allowed(`grep -rn 'bash -c' docs/`, MAIN, "searching for the pattern is still data");
allowed(`grep -rn 'git push' docs/`, MAIN, "searching for a forbidden literal");
allowed(`grep -rniE 'git push|git merge' docs/`, MAIN, "an alternation in the pattern");
allowed(`grep -rn -i 'co-authored|generated with' docs/`, MAIN, "searching for trailers");
allowed(`rg 'git commit --amend' .`, WT, "ripgrep");
blocked(`bash -c 'git push origin main'`, WT, "a real invocation is still a command");
console.log(`
${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
