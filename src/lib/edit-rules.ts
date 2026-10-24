// Edit rules (design decision 5, as amended 2026-10-24; ADR 0049). Before a
// write or an edit lands, the lines it adds are checked against three built-in
// rules, plain code checks that refuse. Any failure allows the edit and leaves
// a decision-log line.
import * as fs from 'fs';
import * as path from 'path';
import { logDecision } from './decision-log.js';
import { extractPatchAdditions } from './patch-paths.js';
import { PRIVATE_KEY_BLOCK, VENDOR_KEY } from './redact.js';
import { readRepoConfig, repoRoot } from './repo-config.js';
import type { EditRule, Harness } from './types.js';

// The dash rule's text names its characters by code point: the source holds no dash.
export const BUILTIN_RULES: EditRule[] = [
  { id: 'no-dashes', glob: '**/*.{md,mdx}', rule: 'Prose uses no em dash (U+2014) or en dash (U+2013) characters.' },
  { id: 'no-secrets', glob: '**/*', rule: 'The added lines hold no private key block and no API key with a known vendor prefix.' },
  { id: 'no-conflict-markers', glob: '**/*', rule: 'The added lines hold no merge-conflict marker line starting <<<<<<< or >>>>>>>.' },
];

// `removed` is what the edit replaces: a dash already on a changed line is not a new one.
export function builtinBreach(id: string, added: string, removed = ''): boolean {
  const dashes = (t: string) => t.match(/[\u2013\u2014]/g)?.length ?? 0;
  if (id === 'no-dashes') return dashes(added) > dashes(removed);
  // Seven, then a space or the line's end: a setext ======= underline never matches.
  if (id === 'no-conflict-markers') return added.split('\n').some((l) => /^(<{7}|>{7})( |$)/.test(l));
  // Not the log redactor: it masks names like key= and any long run, which ordinary code is full of.
  if (id === 'no-secrets') return added.search(PRIVATE_KEY_BLOCK) >= 0 || added.search(VENDOR_KEY) >= 0;
  return false;
}

// Past this many cells the unmatched middle counts as wholly replaced.
const LCS_MAX_CELLS = 4_000_000;

// A line diff by longest common subsequence: the lines of `after` it leaves
// unmatched were added, those of `before` were removed. A trailing carriage
// return is ignored on both sides, so a CRLF file on disk and LF content (or
// the reverse) still match line for line.
export function lineDiff(before: string, after: string): { added: string; removed: string } {
  const lines = (t: string) => t.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const a = lines(before);
  const b = lines(after);
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const A = a.slice(s, a.length - e);
  const B = b.slice(s, b.length - e);
  // shortcut: a huge rewrite skips the table and sends its whole middle; switch to Myers if a log shows it matters.
  if (A.length * B.length > LCS_MAX_CELLS) return { added: B.join('\n'), removed: A.join('\n') };
  const w = B.length + 1;
  const L = new Uint32Array((A.length + 1) * w);
  const at = (i: number, j: number) => L[i * w + j] ?? 0;
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) L[i * w + j] = A[i] === B[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  }
  const added: string[] = [];
  const removed: string[] = [];
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { i++; j++; }
    else if (at(i + 1, j) >= at(i, j + 1)) removed.push(A[i++] ?? '');
    else added.push(B[j++] ?? '');
  }
  return { added: [...added, ...B.slice(j)].join('\n'), removed: [...removed, ...A.slice(i)].join('\n') };
}

export const addedLines = (before: string, after: string): string => lineDiff(before, after).added;

type GlobToken = { kind: 'text'; options: string[] } | { kind: 'one' | 'star' | 'any' | 'dirs' };

function globTokens(glob: string): GlobToken[] {
  const out: GlobToken[] = [];
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] ?? '';
    const close = c === '{' ? glob.indexOf('}', i) : -1;
    if (glob.startsWith('**/', i)) { out.push({ kind: 'dirs' }); i += 2; }
    else if (glob.startsWith('**', i)) { out.push({ kind: 'any' }); i += 1; }
    else if (c === '*') out.push({ kind: 'star' });
    else if (c === '?') out.push({ kind: 'one' });
    else if (close > i) { out.push({ kind: 'text', options: glob.slice(i + 1, close).split(',') }); i = close; }
    else out.push({ kind: 'text', options: [c] });
  }
  return out;
}

// Against the whole POSIX relative path: * and ? stay inside one directory,
// **/ spans zero or more, {a,b} lists literal alternatives. The glob comes from
// an agent-writable .fx.json, so it is matched by one pass per token over the
// set of reachable path positions, never by a regex that can backtrack.
export function globMatch(glob: string, relPath: string): boolean {
  const n = relPath.length;
  let reach: boolean[] = Array.from({ length: n + 1 }, (_, i) => i === 0);
  for (const t of globTokens(glob)) {
    const next: boolean[] = new Array<boolean>(n + 1).fill(false);
    if (t.kind === 'text' || t.kind === 'one') {
      for (let i = 0; i <= n; i++) {
        if (!reach[i]) continue;
        if (t.kind === 'text') { for (const o of t.options) if (relPath.startsWith(o, i)) next[i + o.length] = true; }
        else if (i < n && relPath[i] !== '/') next[i + 1] = true;
      }
    } else if (t.kind === 'dirs') {
      // Zero or more `<name>/` segments.
      let open = false;
      for (let i = 0; i <= n; i++) {
        if (reach[i]) next[i] = true;
        if (next[i]) open = true;
        if (i < n && relPath[i] === '/') {
          if (open) next[i + 1] = true;
          open = false;
        }
      }
    } else {
      for (let i = 0; i <= n; i++) next[i] = Boolean(reach[i]) || (i > 0 && Boolean(next[i - 1]) && (t.kind === 'any' || relPath[i - 1] !== '/'));
    }
    reach = next;
  }
  return Boolean(reach[n]);
}

// `path` is absolute; `removed` holds the lines the edit replaces.
export interface ChangedFile { path: string; added: string; removed: string }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function readText(file: string): string | null {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function written(file: string, content: string): ChangedFile {
  return { path: file, ...lineDiff(readText(file) ?? '', content) };
}

function edited(file: string, oldS: string, newS: string): ChangedFile {
  return { path: file, ...lineDiff(oldS, newS) };
}

function patched(cwd: string, patch: unknown): ChangedFile[] {
  return extractPatchAdditions(patch).map((f) => ({ path: path.resolve(cwd, f.path), added: f.text, removed: f.removed }));
}

export function changedFiles(harness: Harness, toolName: string, toolInput: unknown, cwd: string): ChangedFile[] {
  if (!isRecord(toolInput)) return [];
  const ti = toolInput;
  if (harness === 'codex') {
    const command = str(ti.command);
    if (toolName === 'apply_patch') return patched(cwd, command);
    if ((toolName === 'Bash' || toolName === 'exec_command') && command?.includes('apply_patch')) return patched(cwd, command);
    return [];
  }
  if (harness === 'claude-code') {
    const p = str(ti.file_path) ?? str(ti.notebook_path);
    if (p === null) return [];
    const file = path.resolve(cwd, p);
    const content = str(ti.content);
    const oldS = str(ti.old_string);
    const newS = str(ti.new_string);
    if (toolName === 'Write' && content !== null) return [written(file, content)];
    if (toolName === 'Edit' && oldS !== null && newS !== null) return [edited(file, oldS, newS)];
    if (toolName === 'MultiEdit' && Array.isArray(ti.edits)) {
      const diffs = ti.edits.flatMap((e) => {
        const o = isRecord(e) ? str(e.old_string) : null;
        const n = isRecord(e) ? str(e.new_string) : null;
        return o !== null && n !== null ? [lineDiff(o, n)] : [];
      });
      return [{ path: file, added: diffs.map((d) => d.added).join('\n'), removed: diffs.map((d) => d.removed).join('\n') }];
    }
    const source = str(ti.new_source);
    if (toolName === 'NotebookEdit' && source !== null) return [{ path: file, added: source, removed: '' }];
    return [];
  }
  // opencode 1.x; 2.x names the patch tool `patch` and the file `path` (read from 2.1.4, references/harnesses/opencode-v2.md).
  const v2 = harness === 'opencode-v2';
  if (toolName === (v2 ? 'patch' : 'apply_patch')) return patched(cwd, ti.patchText);
  const p = str(v2 ? ti.path : ti.filePath);
  if (p === null) return [];
  const file = path.resolve(cwd, p);
  const content = str(ti.content);
  const oldS = str(ti.oldString);
  const newS = str(ti.newString);
  if (toolName === 'write' && content !== null) return [written(file, content)];
  if (toolName === 'edit' && oldS !== null && newS !== null) return [edited(file, oldS, newS)];
  return [];
}

export interface EditCheckInput { harness: Harness; sessionId: string | null; cwd: string; toolName: string; toolInput: unknown; now: number }
export type EditRuleDecision = { action: 'allow' | 'refuse'; reason: string | null };

const ALLOW: EditRuleDecision = { action: 'allow', reason: null };
const refusal = (rule: EditRule, rel: string): EditRuleDecision => ({ action: 'refuse', reason: `[fx] rule ${rule.id}: ${rule.rule} (${rel})` });
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

// One decision-log line for a failure that allowed the edit. Exported for the
// hooks, whose own code around checkEdit can fail; never throws.
export function logEditRuleError(input: Pick<EditCheckInput, 'harness' | 'sessionId' | 'cwd' | 'now'>, message: string, text = ''): void {
  try {
    logDecision({ ts: new Date(input.now).toISOString(), harness: input.harness, event: 'edit-rule', session: input.sessionId, cwd: input.cwd, text, source: 'error', action: 'allow', unavailable: message });
  } catch { /* the stderr line is the trace */ }
}

function failed(input: EditCheckInput, e: unknown): EditRuleDecision {
  const m = messageOf(e);
  try { process.stderr.write(`[fx] edit rules off: ${m}\n`); } catch { /* the log line below is the trace */ }
  logEditRuleError(input, m);
  return ALLOW;
}

// Never throws: a crash allows the edit, says so on stderr and logs the error.
export function checkBuiltins(input: EditCheckInput): EditRuleDecision {
  const { harness, sessionId, cwd, toolName, toolInput, now } = input;
  try {
    if (!readRepoConfig(cwd).hooks.editRules) return ALLOW;
    const root = repoRoot(cwd);
    // A file outside the repository gets no rules.
    const files = changedFiles(harness, toolName, toolInput, cwd).flatMap((f) => {
      const rel = path.relative(root, f.path).split(path.sep).join('/');
      return rel === '' || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel) ? [] : [{ ...f, rel }];
    });
    for (const rule of BUILTIN_RULES) {
      for (const f of files) {
        if (!globMatch(rule.glob, f.rel) || !builtinBreach(rule.id, f.added, f.removed)) continue;
        logDecision({ ts: new Date(now).toISOString(), harness, event: 'edit-rule', session: sessionId, cwd, text: `${f.rel} ${rule.id}`, source: 'hard-rule', action: 'refuse' });
        return refusal(rule, f.rel);
      }
    }
    return ALLOW;
  } catch (e) {
    return failed(input, e);
  }
}

// The same check for a hook that awaits it. Never rejects.
export async function checkEdit(input: EditCheckInput): Promise<EditRuleDecision> {
  return checkBuiltins(input);
}
