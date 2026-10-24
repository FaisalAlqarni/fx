#!/usr/bin/env node
// compile-brief --worktree <dir> [--context <file>] <SLUG> <TASK_FILE> <OUTFILE>
// Writes the one brief an implementer or task reviewer reads (ADR 0042) and
// prints OUTFILE's path. Plan files come from <dir>/docs/plans/<SLUG>/, .fx.json
// from <dir>, stack files from this plugin's references/stacks/.
import * as fs from 'fs';
import * as path from 'path';
import { rulingsFor } from '../../../lib/plan-state.js';
import { parseJson } from '../../../lib/json.js';

const PLUGIN = path.join(__dirname, '..', '..', '..');

function die(msg: string): never { process.stderr.write(`compile-brief: ${msg}\n`); process.exit(2); }

const args = process.argv.slice(2);
const opt: { worktree?: string; context?: string } = {};
const pos: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i] ?? '';
  if (a === '--worktree') opt.worktree = args[++i];
  else if (a === '--context') opt.context = args[++i];
  else pos.push(a);
}
const [slug = '', taskFile = '', outFile = ''] = pos;
const worktree = opt.worktree;
if (!worktree || pos.length !== 3) die('usage: compile-brief --worktree <dir> [--context <file>] <SLUG> <TASK_FILE> <OUTFILE>');

const read = (p: string): string | null => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const planDir = path.join(worktree, 'docs', 'plans', slug);
const task = read(taskFile);
if (task === null) die(`cannot read task file ${taskFile}`);

// The section of md headed `##` to `######` with this text, heading line
// included, up to the next heading of the same or a higher level; null when absent.
function section(md: string, heading: string): string | null {
  const lines = md.split('\n');
  const level = (l: string): number => /^(#{1,6})\s/.exec(l)?.[1]?.length ?? 0;
  const start = lines.findIndex((l) => level(l) >= 2 && l.replace(/^#+/, '').trim().toLowerCase() === heading.toLowerCase());
  if (start === -1) return null;
  const lv = level(lines[start] ?? '');
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { const n = level(lines[i] ?? ''); if (n > 0 && n <= lv) { end = i; break; } }
  return lines.slice(start, end).join('\n').trim();
}

// Only the bold numbered paragraph `**N.` of a section body.
function numbered(sec: string, n: string): string | null {
  const lines = sec.split('\n').slice(1);
  const start = lines.findIndex((l) => l.startsWith(`**${n}.`));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^\*\*\d+\./.test(lines[i] ?? '') || /^#/.test(lines[i] ?? '')) { end = i; break; }
  return lines.slice(start, end).join('\n').trim();
}

const entries = (md: string, label: string): string[] | null => {
  const m = md.match(new RegExp(`^\\*\\*${label}:\\*\\*[ \\t]*(.*)$`, 'm'));
  return m ? (m[1] ?? '').split(';').map((s) => s.trim()).filter(Boolean) : null;
};

const plan = read(path.join(planDir, 'plan.md'));
if (plan === null) die(`cannot read ${path.join(planDir, 'plan.md')}`);
const gc = section(plan, 'Global Constraints');
const gcBody = gc && gc.split('\n').slice(1).join('\n').trim();

let context = 'None.';
if (opt.context) {
  const c = read(opt.context);
  if (c === null) die(`cannot read context file ${opt.context}`);
  context = c.trim() || 'None.';
}

const rulings = rulingsFor(worktree, planDir, (path.basename(taskFile).match(/^(\d+)-/) || [])[1]);

const dEntries = entries(task, 'Design');
const design = dEntries ? read(path.join(planDir, 'design.md')) : '';
if (design === null) die(`cannot read ${path.join(planDir, 'design.md')}, which the task's Design entry needs`);
const designOut = !dEntries ? 'None.' : dEntries.map((e) => {
  const [head, n] = e.split('>').map((s) => s.trim());
  const sec = section(design, head ?? '');
  const got = sec && n ? numbered(sec, n) : sec;
  if (!got) die(`Design entry resolves to nothing: ${e}`);
  return got;
}).join('\n\n');

const stackFile = (name: string): string | null => read(path.join(PLUGIN, 'references', 'stacks', `${name}.md`));
const sEntries = entries(task, 'Stack');
let stackOut: string;
if (sEntries) {
  stackOut = sEntries.map((e) => {
    const i = e.indexOf('/');
    const md = i > 0 ? stackFile(e.slice(0, i)) : null;
    const got = md && section(md, e.slice(i + 1).trim());
    if (!got) die(`Stack entry resolves to nothing: ${e}`);
    return got;
  }).join('\n\n');
} else {
  let stacks: unknown;
  try {
    const fx = parseJson(read(path.join(worktree, '.fx.json')) || '{}');
    if (fx === null) throw new TypeError("Cannot read properties of null (reading 'stacks')");
    stacks = typeof fx === 'object' && 'stacks' in fx ? fx.stacks : undefined;
  } catch (e) { die(`cannot parse .fx.json: ${e instanceof Error ? e.message : String(e)}`); }
  // Outside the try on purpose: a truthy non-array crashed here before the port.
  const names = stacks || [];
  if (!Array.isArray(names)) throw new TypeError('names.map is not a function');
  stackOut = names.map((n) => {
    const md = stackFile(String(n));
    if (md === null) die(`.fx.json names stack ${n}, which has no file`);
    return md.trim();
  }).join('\n\n') || 'None.';
}

fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
fs.writeFileSync(outFile, [
  '## Task', task.trim(),
  '## Global constraints', gcBody || 'None.',
  '## Context', context,
  '## Rulings', rulings.length ? rulings.map((r) => `- ${r}`).join('\n') : 'None.',
  '## Design excerpt', designOut,
  '## Stack', stackOut,
].join('\n\n') + '\n');
process.stdout.write(`${outFile}\n`);
