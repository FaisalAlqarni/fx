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

// Matches `main`, `master`, `HEAD:main`, `refs/heads/master`, `+main`.
const BASE_BRANCH = /^\+?(?:[\w./-]*:)?(?:refs\/heads\/)?(?:main|master|trunk)$/;

const ATTRIBUTION = [
  /co-authored-by/i,
  /claude-session/i,
  /generated with/i,
  /🤖/u,
];

function stripHeredocs(command) {
  // A heredoc body is DATA, not commands. Without this, writing a README, a
  // task or a runbook that SHOWS a git command in an example is refused as
  // if the user had run it. Found by dogfooding: it blocked fx's own tasks.
  const lines = String(command).split('\n');
  const out = [];
  let terminator = null;
  for (const line of lines) {
    if (terminator !== null) {
      if (line.trim() === terminator) terminator = null;  // <<- allows indentation
      continue;
    }
    // <<EOF, <<-EOF, <<'EOF', <<"EOF"
    const m = line.match(/<<-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/);
    out.push(line);
    if (m) terminator = m[1] || m[2] || m[3];
  }
  return out.join('\n');
}

function splitSegments(command) {
  // Shell operators that start a new command. Good enough to catch
  // `cd x && git commit`; not a shell parser, and does not claim to be.
  return stripHeredocs(command)
    .split(/\|\||&&|[;\n|&]/).map((s) => s.trim()).filter(Boolean);
}

// `sh -c "<cmd>"` exists to run its argument. A search tool's argument is data
// and must not be scanned (DEBT #46); a shell's `-c` argument is the opposite,
// and skipping it was a hole big enough to drive a base-branch push through.
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

function expandShellC(segment) {
  const m = segment.match(/^\s*(?:\S*\/)?(sh|bash|zsh|dash|ksh)\s+(-[a-zA-Z]*c[a-zA-Z]*)\s+(.+)$/);
  if (!m) return null;
  const arg = m[3].trim();
  const q = arg[0];
  return (q === '"' || q === "'") ? arg.slice(1, arg.lastIndexOf(q)) : arg;
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
  // absolute: they rewrite history someone else may already have.
  if (sub === 'push' && args.some((a) => a === '-f' || a.startsWith('--force'))) {
    return 'force push rewrites history that has already left the machine.';
  }
  if (sub === 'push' && (has(args, '--delete', '-d') || args.some((a) => a.startsWith(':')))) {
    return 'deleting a remote branch destroys work for everyone who has it, and no reflog reaches it.';
  }
  // Push is permitted from a worktree, but never to the BASE branch. The rule
  // is "never push to the base branch without explicit say-so", and a worktree
  // does not change that: `git push origin main` from a feature worktree
  // still lands on main.
  if (sub === 'push' && args.some((a) => BASE_BRANCH.test(a))) {
    return 'that push targets the base branch. Push a feature branch; the base branch is the user\'s to move.';
  }
  // A bare `git push` follows the current branch, which may be the base branch,
  // and the guard no longer asks git where it is. Requiring an explicit target
  // makes the dangerous case unreachable without any cwd introspection, which
  // is what DEBT #47 got wrong twice.
  if (sub === 'push') {
    const refs = args.filter((a) => !a.startsWith('-'));
    if (refs.length < 2 || refs.some((a) => /^HEAD$/i.test(a))) {
      return 'name the branch you are pushing. A bare push follows the current branch, which may be the base branch.';
    }
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
        return 'attribution trailers are never added: no Co-Authored-By, no Claude-Session, no "Generated with".';
      }
    }
  }
  if (sub === 'commit' && args.some((a) => a.startsWith('--trailer'))) {
    return 'trailers are not added to commit messages.';
  }
  return null;
}

/**
 * @returns {{allow: true} | {allow: false, reason: string}}
 */
function inspect(command, cwd) {
  if (!command || !/\bgit\b/.test(command)) return { allow: true };

  const segments = [];
  for (const seg of splitSegments(command)) {
    segments.push(seg);
    const inner = expandShellC(seg);
    if (inner) segments.push(...splitSegments(inner));
  }

  for (const segment of segments) {
    const g = parseGit(segment);
    if (!g) continue;

    const always = alwaysBlocked(g, command);
    if (always) return { allow: false, reason: always };

  }
  return { allow: true };
}

module.exports = { inspect, splitSegments, stripHeredocs, parseGit, expandShellC };
