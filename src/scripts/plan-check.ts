#!/usr/bin/env node
// The artifacts a build must leave before anyone says it is complete (e2e bug 4):
// an approved design, one task file per plan row, a done or parked line per task,
// the final review and exit gate lines, a work branch that is not main, and no
// em or en dash anywhere in the plan dir. One line per check; exit 1 on any FAIL.
//
//     scripts/plan-check <plan dir>
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const dir = process.argv[2];
if (!dir || process.argv.length > 3) {
  process.stderr.write('plan-check: usage: plan-check <plan dir>\n');
  process.exit(2);
}

const lines: string[] = [];
const report = (name: string, problem: string | null, okText: string) => lines.push(problem ? `FAIL ${name}: ${problem}` : `ok ${name}: ${okText}`);
const read = (rel: string): string | null => { try { return fs.readFileSync(path.join(dir, rel), 'utf8'); } catch { return null; } };

const design = read('design.md');
report('design.md', design === null ? 'missing' : /^\*\*Approved:\*\* \d{4}-\d{2}-\d{2}/m.test(design) ? null : 'no **Approved:** YYYY-MM-DD line',
  'approved');

const plan = read('plan.md');
const rows = plan === null ? [] : [...plan.matchAll(/^\|\s*(\d{2})\s*\|/gm)].map((m) => m[1] ?? '');
let files: string[] = [];
try { files = fs.readdirSync(path.join(dir, 'tasks')).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort(); } catch { /* no tasks dir */ }
if (plan === null) report('plan.md', 'missing', '');
else if (rows.length === 0) report('plan.md', 'no task table rows', '');
else {
  const missing = rows.filter((n) => files.filter((f) => f.startsWith(`${n}-`)).length !== 1);
  const extra = files.filter((f) => !rows.includes(f.slice(0, 2)));
  report('tasks', missing.length ? `no task file for ${missing.join(', ')} (one tasks/NN-*.md per plan row; tasks inline in plan.md do not count)`
    : extra.length ? `${extra.join(', ')} has no row in plan.md` : null, `${rows.length} rows, ${rows.length} task files`);
}

const state = read('state.md');
if (state === null) report('state.md', 'missing', '');
else {
  const open = rows.filter((n) => !new RegExp(`^Task ${n}: (complete|parked:)`, 'm').test(state));
  report('tasks done', open.length ? `${open.join(', ')} has no Task NN: complete or Task NN: parked: line` : null, `${rows.length} complete or parked`);
  const missing = ['Final review:', 'Exit gate:'].filter((l) => !new RegExp(`^${l}`, 'm').test(state));
  report('ledger', missing.length ? missing.map((l) => `no ${l} line`).join(', ') : null, 'Final review: and Exit gate: lines present');
}

const b = spawnSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
const branch = b.status === 0 ? b.stdout.trim() : '';
report('branch', !branch ? 'not in a git repository' : ['main', 'master'].includes(branch) ? `${branch} is the base branch, not a work branch` : null, branch);

const dashes: string[] = [];
const walk = (d: string): void => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.isFile()) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/[\u2013\u2014]/.test(l)) dashes.push(`${path.relative(dir, f)}:${i + 1}`); });
  }
};
try { walk(dir); } catch { dashes.push('plan dir cannot be read'); }
report('dashes', dashes.length ? dashes.join(', ') : null, 'no em or en dash');

process.stdout.write(lines.join('\n') + '\n');
process.exit(lines.some((l) => l.startsWith('FAIL')) ? 1 : 0);
