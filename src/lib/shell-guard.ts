// The shell guard (design decision 5). Runs on a shell call after the git
// guard allows it: hard rules that nothing overrides, then a read-only
// allowlist and the repo's own commands that run silently. Any other command
// is allowed and logged. The hard rules and the allowlist live in shell-rules.
import { spawnSync } from 'child_process';
import { CAP_COMMAND, redact } from './redact.js';
import { logDecision } from './decision-log.js';
import { matchRepoCommand } from './evidence.js';
import { readRepoConfig, type CheckCommands } from './repo-config.js';
import { classifyShell, stripComments } from './shell-rules.js';
import type { GuardDecision, Harness } from './types.js';

export { classifyShell, stripComments, type ShellClass } from './shell-rules.js';

export function normalizeCommand(command: string, posix = true): string {
  return redact(stripComments(command, posix).trim().replace(/\s+/g, ' '), CAP_COMMAND);
}

type GuardInput = { command: string; cwd: string; harness: Harness; sessionId: string | null; now?: number; posix?: boolean };
const UNSAFE_TAIL = /[;&|><`]|\$\(/;

// The repo's own command runs silently only as written (lens C1, I7): one
// line, nothing chained after it, a fixed template with nothing added, and a
// placeholder filled with no option and no path out of the repository.
// A fill that leaves the repository: `..`, an absolute or drive path, a home or a variable (final review, lens minor 8).
const LEAVES_REPO = /(?:^|[\\/])\.\.(?:[\\/]|$)|^[\\/~]|^[A-Za-z]:|\$/;
function repoCommand(code: string, checks: CheckCommands): boolean {
  if (/[\r\n]/.test(code.trim())) return false;
  return [checks.test_one, checks.test_scope, checks.test_all, checks.lint, checks.setup].some((t) => {
    const m = matchRepoCommand(code, t);
    if (m === null || UNSAFE_TAIL.test(m.tail)) return false;
    const extra = m.tail.split(' ').filter(Boolean);
    return m.placeholder ? extra.every((a) => !a.startsWith('-') && !LEAVES_REPO.test(a)) : extra.length === 0;
  });
}

// Config keys that make git status, log, diff, show or blame run a program.
const RUNS_PROGRAM = '^(core\\.(fsmonitor|pager)|pager\\..+|diff\\.external|diff\\..+\\.(textconv|command)|filter\\..+\\.(clean|process)|gpg\\.(.+\\.)?program|include\\.path|includeif\\..+\\.path)$';

// A read-only git command is not read-only when the repository's own config names a
// program it would run (lens I9). The user's global and system config are theirs.
function gitRunsRepoProgram(code: string, cwd: string): boolean {
  if (!/^\s*git\s+(?:status|log|diff|show|blame)(?:\s|$)/.test(code)) return false;
  const r = spawnSync('git', ['config', '--show-scope', '--get-regexp', RUNS_PROGRAM], { cwd, timeout: 2000, encoding: 'utf8' });
  if (r.status === 1 && r.stdout === '') return false;  // no such key anywhere
  if (r.status !== 0) return true;                       // cannot tell: not read-only
  return r.stdout.split('\n').some((l) => /^(?:local|worktree)\s/.test(l));
}

// Never rejects: a crash is a warning, and the command runs.
export async function guardShell(input: GuardInput): Promise<GuardDecision> {
  try {
    return guardShellCodeOnly(input);
  } catch (e) {
    return { action: 'warn', reason: `[fx] shell guard off: ${e instanceof Error ? e.message : String(e)}`, source: 'guard-error' };
  }
}

// The same decision, synchronous and free to throw: opencode 2.x refuses by a
// synchronous effect and reports a crash itself (references/harnesses/opencode-v2.md).
export function guardShellCodeOnly(input: GuardInput): GuardDecision {
  const { command, cwd, harness, sessionId } = input;
  const norm = normalizeCommand(command, input.posix);
  const log = (d: GuardDecision): GuardDecision => {
    logDecision({ ts: new Date(input.now ?? Date.now()).toISOString(), harness, event: 'guard', session: sessionId, cwd, text: norm, source: d.source, action: d.action });
    return d;
  };
  const c = classifyShell(command, input.posix);
  if (c.kind === 'hard-deny') return log({ action: 'deny', reason: c.reason, source: 'hard-rule' });
  const code = stripComments(command, input.posix);
  if (c.kind === 'read-only' && !gitRunsRepoProgram(code, cwd)) return { action: 'allow', reason: null, source: 'read-only' };
  // Logged: .fx.json is writable by the agent, so a laundered command leaves a trace (final review, lens I1).
  if (repoCommand(code, readRepoConfig(cwd).checks)) return log({ action: 'allow', reason: null, source: 'repo-command' });
  return log({ action: 'allow', reason: null, source: 'grey' });
}
