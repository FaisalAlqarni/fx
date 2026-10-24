// What one tool call was (edit, read, shell, other), how it ended, and which
// paths it edited, per harness. Pure: the tracker records what this returns.
import * as path from 'path';
import { classifyShell } from './shell-rules.js';
import type { Harness, ToolKind } from './types.js';

const EDIT = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'apply_patch', 'edit', 'write']);
const READ = new Set(['Read', 'Grep', 'Glob', 'read', 'grep', 'glob', 'list']);
const SHELL = new Set(['Bash', 'exec_command', 'bash', 'shell']);

// Tool names are shared across harnesses only where the harness really has the tool.
const HAS: Record<Harness, (n: string) => boolean> = {
  'claude-code': (n) => ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Read', 'Grep', 'Glob', 'Bash'].includes(n),
  codex: (n) => n === 'apply_patch' || n === 'Bash' || n === 'exec_command',
  opencode: (n) => ['edit', 'write', 'apply_patch', 'read', 'grep', 'glob', 'list', 'bash'].includes(n),
  'opencode-v2': (n) => ['edit', 'write', 'apply_patch', 'read', 'grep', 'glob', 'list', 'shell', 'bash'].includes(n),
};

export function classifyTool(harness: Harness, toolName: string, command: string | null): ToolKind {
  if (!HAS[harness](toolName)) return 'other';
  if (EDIT.has(toolName)) return 'edit';
  if (READ.has(toolName)) return 'read';
  if (!SHELL.has(toolName)) return 'other';
  return command !== null && classifyShell(command, process.platform !== 'win32').kind === 'read-only' ? 'read' : 'shell';
}

const TAIL = 4096;
const last4k = (s: string) => (s.length > TAIL ? s.slice(-TAIL) : s);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (r: Record<string, unknown>, keys: string[]) => keys.map((k) => r[k]).filter((v): v is string => typeof v === 'string' && v !== '');

// `interrupted` is set only when true: partial output proves nothing, so the call never verifies.
type Outcome = { outcome: 'ok' | 'fail' | 'unknown'; output: string; interrupted?: true };

// Claude Code: the event name decides (references/harnesses/claude-code.md).
// For PostToolUseFailure the caller passes the payload's `error` string and,
// when set, `is_interrupt`. An interrupted call is neither a pass nor a
// failure: its outcome is unknown, so it never verifies and never repeats.
// Codex: an exit code in the response, else unknown, which never counts as success.
// Codex's schema leaves tool_response untyped; the text forms are its model-facing output.
export function toolOutcomeAndOutput(harness: Harness, event: string, toolResponse: unknown, interrupted = false): Outcome {
  if (harness === 'claude-code') {
    const text = typeof toolResponse === 'string' ? toolResponse : isRecord(toolResponse) ? strings(toolResponse, ['stdout', 'stderr']).join('\n') : '';
    const stopped = interrupted || (isRecord(toolResponse) && toolResponse.interrupted === true);
    if (stopped) return { outcome: 'unknown', output: last4k(text), interrupted: true };
    return { outcome: event === 'PostToolUseFailure' ? 'fail' : 'ok', output: last4k(text) };
  }
  if (typeof toolResponse === 'string') {
    // Shell tool text, then exec_command (unified exec) text (references/harnesses/codex.md).
    // Only the header before the `Output:` line counts, so the command's own output cannot set the outcome.
    const header = toolResponse.split(/^Output:$/m)[0] ?? '';
    const m = /^(?:Exit code:|Process exited with code) (\d+)/m.exec(header);
    return { outcome: m ? (Number(m[1]) === 0 ? 'ok' : 'fail') : 'unknown', output: last4k(toolResponse) };
  }
  if (isRecord(toolResponse)) {
    const code = [toolResponse.exit_code, toolResponse.exitCode].find((v): v is number => typeof v === 'number');
    const output = strings(toolResponse, ['output', 'stdout', 'stderr']).join('\n');
    return { outcome: code === undefined ? 'unknown' : code === 0 ? 'ok' : 'fail', output: last4k(output) };
  }
  return { outcome: 'unknown', output: '' };
}

// A Codex shell call that runs apply_patch edits the paths its patch names.
const SHELL_TOOLS = ['Bash', 'exec_command'];

// extractPatchPaths loads here, not at the top: a broken lib/patch-paths then
// costs only the edit counting that needs it, and the throw reaches the caller.
export function editedPaths(harness: Harness, toolName: string, toolInput: unknown, cwd: string): string[] {
  if (!isRecord(toolInput)) return [];
  const abs = (p: string) => path.resolve(cwd, p);
  const patchPaths = (text: unknown): string[] => {
    const { extractPatchPaths }: typeof import('./patch-paths.js') = require('./patch-paths.js');
    return extractPatchPaths(text).map(abs);
  };
  const command = toolInput.command;
  if (harness === 'codex' && SHELL_TOOLS.includes(toolName) && typeof command === 'string' && /\bapply_patch\b/.test(command)) return patchPaths(command);
  if (classifyTool(harness, toolName, null) !== 'edit') return [];
  if (toolName === 'apply_patch') return patchPaths(command ?? toolInput.patchText);
  const p = [toolInput.file_path, toolInput.notebook_path, toolInput.filePath].find((v): v is string => typeof v === 'string' && v !== '');
  return p === undefined ? [] : [abs(p)];
}
