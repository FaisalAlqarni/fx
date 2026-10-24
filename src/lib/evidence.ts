// Does a command run one of the repo's own .fx.json commands? One matching
// rule (red team I10), shared by the shell guard's allowlist and, later, the
// Stop evidence check.
import type { CheckCommands } from './repo-config.js';
import type { ToolKind } from './types.js';

const squash = (s: string) => s.trim().replace(/\s+/g, ' ');

// The part of the normalized command after the template's matched text, and
// whether the template has a placeholder; null when the command does not run it.
export function matchRepoCommand(command: string, template: string | null): { tail: string; placeholder: boolean } | null {
  if (template === null) return null;
  const cmd = squash(command);
  const brace = template.indexOf('{');
  const head = squash(brace < 0 ? template : template.slice(0, brace));
  if (head === '') return null;
  if (brace >= 0) {
    const words = head.split(' ');
    // `node {file}` would match every node command.
    if (words.length < 2 && !words[0]?.includes('/')) return null;
    // A placeholder glued to its prefix (`lib/{file}`) continues the word; otherwise the prefix is whole words.
    if (!/\s/.test(template[brace - 1] ?? ' ')) return cmd.startsWith(head) ? { tail: cmd.slice(head.length), placeholder: true } : null;
  }
  if (cmd !== head && !cmd.startsWith(`${head} `)) return null;
  return { tail: cmd.slice(head.length), placeholder: brace >= 0 };
}

export function isRepoCommand(command: string, template: string | null): boolean {
  return matchRepoCommand(command, template) !== null;
}

export function isCheckCommand(command: string, checks: CheckCommands): boolean {
  return [checks.test_one, checks.test_scope, checks.test_all, checks.lint].some((t) => isRepoCommand(command, t));
}

const TAIL = 4096;

// Pass summaries (design decision 7), matched on the last 4 KB of output; a count must be at least 1.
export function hasPassSummary(output: string): boolean {
  const o = output.length > TAIL ? output.slice(-TAIL) : output;
  const failed = /\b[1-9]\d* failed\b/.test(o);
  return /ALL GREEN/.test(o)
    || (/\b[1-9]\d* (?:tests? )?passed\b/.test(o) && !failed)
    || /\b\d+ examples?, 0 failures\b/.test(o)
    || /^OK(?: \(\d+ tests?\))?$/m.test(o)
    || (/Tests:\s+[1-9]\d* passed/.test(o) && !/failed/.test(o))
    || (/^ok\s+\S+/m.test(o) && !/^FAIL/m.test(o))
    || /test result: ok\./.test(o)
    || /Passed!\s+-\s+Failed:\s+0/.test(o);
}

// Programs whose output can quote a pass summary without a test having run.
const QUOTING = ['echo', 'printf', 'cat', 'grep', 'rg', 'head', 'tail', 'sed', 'awk'];

function firstProgram(command: string): string {
  const segment = command.split(/[|;&\n]/)[0] ?? '';
  const word = segment.trim().split(/\s+/).find((w) => !/^\w+=/.test(w)) ?? '';
  return word.split(/[\\/]/).pop() ?? '';
}

// Did this tool call verify the work? Red team I9: a check command's success counts only when
// nothing but arguments follows it; a pipe, `||` or `;` makes the exit code someone else's.
export function countsAsVerification(kind: ToolKind, command: string | null, outcome: 'ok' | 'fail' | 'unknown', output: string, checks: CheckCommands): boolean {
  // A failed run verifies nothing, whatever its output quotes (pytest's `4 passed, 1 error` exits 1).
  if (kind !== 'shell' || outcome === 'fail') return false;
  if (command !== null && outcome === 'ok' && isCheckCommand(command, checks) && !/[|;\n]/.test(command.trim())) return true;
  return (command === null || !QUOTING.includes(firstProgram(command))) && hasPassSummary(output);
}

export function checkHint(checks: CheckCommands): string {
  const cmd = checks.test_scope ?? checks.test_all;
  return cmd === null ? "the project's tests" : `\`${cmd}\``;
}
