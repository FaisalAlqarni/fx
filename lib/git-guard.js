'use strict';
// Shared by the Claude Code PreToolUse hook and the opencode plugin.
// One implementation so the two runtimes cannot drift apart.
//
//   GIT_DIR === GIT_COMMON_DIR  ->  main checkout  ->  block every mutation
//   GIT_DIR !== GIT_COMMON_DIR  ->  in a worktree  ->  allow
//
// Plus rules that hold everywhere, worktree or not.
//
// Fails CLOSED: a git subcommand this file does not recognise is treated as
// mutating. A new git verb should be denied on the main checkout until someone
// adds it, not silently permitted.

const { execFileSync } = require('child_process');
const path = require('path');

// Read-only. Safe anywhere.
const READ_ONLY = new Set([
  'status', 'log', 'diff', 'show', 'describe', 'blame', 'grep', 'shortlog',
  'ls-files', 'ls-tree', 'ls-remote', 'cat-file', 'rev-parse', 'rev-list',
  'symbolic-ref', 'for-each-ref', 'count-objects', 'verify-commit',
  'whatchanged', 'version', 'help', 'var', 'check-ignore', 'merge-base',
  'name-rev', 'annotate', 'difftool', 'range-diff', 'cherry',
]);

// Mutating, but harmless to the main checkout's working tree — and
// `worktree add` is how we escape the main checkout in the first place.
// Blocking it would make the worktree rule impossible to satisfy.
const ALLOWED_ON_MAIN = new Set(['fetch', 'worktree', 'remote', 'config', 'stash']);

const ATTRIBUTION = [
  /co-authored-by/i,
  /claude-session/i,
  /generated with/i,
  /🤖/u,
];

function splitSegments(command) {
  // Shell operators that start a new command. Good enough to catch
  // `cd x && git commit`; not a shell parser, and does not claim to be.
  return String(command).split(/\|\||&&|[;\n|&]/).map((s) => s.trim()).filter(Boolean);
}

function parseGit(segment) {
  const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  let i = 0;
  // Leading env assignments: FOO=bar git ...
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  if (i >= tokens.length) return null;
  const bin = path.basename(tokens[i].replace(/^["']|["']$/g, ''));
  if (bin !== 'git') return null;
  i++;

  let dir = null;
  // Global options that come before the subcommand.
  while (i < tokens.length && tokens[i].startsWith('-')) {
    const t = tokens[i];
    if (t === '-C' && tokens[i + 1]) { dir = strip(tokens[i + 1]); i += 2; continue; }
    if (t.startsWith('--git-dir=') || t.startsWith('--work-tree=')) { dir = strip(t.split('=')[1]); i++; continue; }
    if ((t === '-c' || t === '--namespace') && tokens[i + 1]) { i += 2; continue; }
    i++;
  }
  if (i >= tokens.length) return null;
  return { sub: strip(tokens[i]), args: tokens.slice(i + 1).map(strip), dir, raw: segment };
}

const strip = (s) => String(s).replace(/^["']|["']$/g, '');
const has = (args, ...flags) => args.some((a) => flags.includes(a));

// Rules that hold in a worktree too.
function alwaysBlocked({ sub, args, raw }, fullCommand) {
  // Plain `push` is ordinary mutating work: allowed from a worktree branch,
  // still refused on the main checkout by the rule below. Force variants are
  // absolute — they rewrite history someone else may already have.
  if (sub === 'push' && args.some((a) => a === '-f' || a.startsWith('--force'))) {
    return 'force push rewrites history that has already left the machine.';
  }
  if (sub === 'push' && (has(args, '--delete', '-d') || args.some((a) => a.startsWith(':')))) {
    return 'deleting a remote branch destroys work for everyone who has it, and no reflog reaches it.';
  }
  if (has(args, '--no-verify', '-n') && (sub === 'commit' || sub === 'push')) {
    return '--no-verify skips the hooks the repo installed on purpose.';
  }
  if (sub === 'reset' && has(args, '--hard')) {
    return 'reset --hard destroys uncommitted work irreversibly.';
  }
  if (sub === 'clean' && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === '--force')) {
    return 'clean -f deletes untracked files, including ones never shown to the user.';
  }
  if (sub === 'branch' && (has(args, '-D') || (has(args, '-d') && has(args, '--force')))) {
    return 'branch -D force-deletes a branch that may hold unmerged commits.';
  }
  if ((sub === 'checkout' || sub === 'restore') && args.some((a) => a === '.' || a === './')) {
    return `${sub} . discards every uncommitted change in the tree.`;
  }
  if (sub === 'stash' && (has(args, 'drop') || has(args, 'clear'))) {
    return 'stash drop/clear destroys stashed work with no reflog to recover it.';
  }
  if (sub === 'tag' && (has(args, '-d') || has(args, '--delete'))) {
    return 'deleting a tag rewrites released history.';
  }
  if (sub === 'commit' || sub === 'merge' || sub === 'tag') {
    for (const re of ATTRIBUTION) {
      if (re.test(fullCommand)) {
        return 'attribution trailers are never added — no Co-Authored-By, no Claude-Session, no "Generated with".';
      }
    }
  }
  if (sub === 'commit' && args.some((a) => a.startsWith('--trailer'))) {
    return 'trailers are not added to commit messages.';
  }
  return null;
}

// `branch`/`tag` with no positional argument is a listing — read-only.
function isListing(sub, args) {
  if (sub !== 'branch' && sub !== 'tag') return false;
  return !args.some((a) => !a.startsWith('-'));
}

function locate(cwd) {
  try {
    const out = execFileSync('git', ['rev-parse', '--absolute-git-dir', '--git-common-dir'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split('\n');
    if (out.length < 2) return { repo: false };
    const gitDir = path.resolve(cwd, out[0].trim());
    const common = path.resolve(cwd, out[1].trim());
    return { repo: true, worktree: gitDir !== common };
  } catch {
    return { repo: false };
  }
}

/**
 * @returns {{allow: true} | {allow: false, reason: string}}
 */
function inspect(command, cwd) {
  if (!command || !/\bgit\b/.test(command)) return { allow: true };

  for (const segment of splitSegments(command)) {
    const g = parseGit(segment);
    if (!g) continue;

    const always = alwaysBlocked(g, command);
    if (always) return { allow: false, reason: always };

    if (READ_ONLY.has(g.sub) || isListing(g.sub, g.args)) continue;
    if (ALLOWED_ON_MAIN.has(g.sub)) continue;

    const where = locate(g.dir ? path.resolve(cwd || process.cwd(), g.dir) : (cwd || process.cwd()));
    if (!where.repo) continue;      // not a repo — nothing of ours to protect
    if (where.worktree) continue;   // inside a worktree — do whatever you like

    return {
      allow: false,
      reason: `\`git ${g.sub}\` writes to the main checkout. Commits and writes happen in a git worktree only — create one and work there.`,
    };
  }
  return { allow: true };
}

module.exports = { inspect, splitSegments, parseGit, locate };
