// Run: node lib/plan-state.test.js
//
// Builds real directory trees under a temp dir. The whole predicate is "what is
// on disk in docs/plans", so a mocked fs would be testing the mock. Same
// reasoning as git-guard.test.js.

import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import { describePlans, rulingsFor } from './plan-state.js';

let pass = 0, fail = 0;
const check = (ok: boolean, label: string, extra?: string | null) => {
  if (ok) pass++;
  else { fail++; console.log(`FAIL  ${label}${extra ? `\n      ${extra}` : ''}`); }
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-plan-state-'));
let n = 0;
// spec: { slug: { tasks: [names], state: bool, design: bool, dir: 'tasks'|'tickets' } }
type PlanSpec = { dir?: string; tasks?: string[]; state?: boolean | string; design?: boolean };
function repo(spec: Record<string, PlanSpec>) {
  const cwd = path.join(root, `r${n++}`);
  for (const [slug, s] of Object.entries(spec)) {
    const base = path.join(cwd, 'docs', 'plans', slug);
    const dir = path.join(base, s.dir || 'tasks');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of s.tasks || []) fs.writeFileSync(path.join(dir, f), '# task\n');
    if (s.state) fs.writeFileSync(path.join(base, 'state.md'), s.state === true ? '# state\n' : s.state);
    if (s.design) fs.writeFileSync(path.join(base, 'design.md'), '# design\n');
  }
  fs.mkdirSync(cwd, { recursive: true });
  return cwd;
}

// ---- nothing to say ----
check(describePlans(path.join(root, 'does-not-exist')) === null,
  'a directory that does not exist is silent');
check(describePlans(repo({})) === null, 'a repo with no docs/plans is silent');
check(describePlans(repo({ 'a': { design: true } })) === null,
  'a design with no task files is silent (fx-plan owns that, and it is mid-session)');

// ---- the case this exists for: tasks on disk, no ledger ----
{
  const out = describePlans(repo({ '2026-09-02-incident-log': { design: true, tasks: ['01-a.md', '02-b.md', '03-c.md'] } }));
  check(out !== null, 'tasks with no state.md produces a block');
  check(/2026-09-02-incident-log/.test(out || ''), 'names the actual slug', out);
  check(/\b3\b/.test(out || ''), 'reports the real task count', out);
  check(/fx-implement/.test(out || ''), 'names fx-implement', out);
  check(!/[\u2014\u2013]/.test(out || ''), 'contains no em or en dashes', out);
}

// ---- legacy directory name still counts (DEBT #29) ----
{
  const out = describePlans(repo({ 'old-plan': { dir: 'tickets', tasks: ['01-a.md', '02-b.md'] } }));
  check(out !== null, 'a legacy tickets/ directory is still found');
  check(/\b2\b/.test(out || ''), 'counts legacy task files', out);
}

// ---- a ledger already exists: resume, do not restart ----
{
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md', '02-b.md'], state: true } }));
  check(out !== null, 'a plan with a ledger still produces a block');
  check(/resum/i.test(out || ''), 'a plan with a ledger says resume', out);
}

// ---- must not loop a task subagent back into the lane that dispatched it ----
{
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md', '02-b.md'] } })) || '';
  check(/dispatched with one specific task/i.test(out),
    'tells a single-task subagent it is already inside the lane', out);
  check(/do not re-enter/i.test(out), 'tells it not to re-enter fx-implement', out);
}

// ---- only .md task files count ----
{
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md', 'README.txt', '.keep'] } }));
  check(/\b1\b/.test(out || ''), 'non-markdown files are not tasks', out);
}

// ---- several plans, only the unfinished ones are worth naming ----
{
  const out = describePlans(repo({
    'done': { tasks: ['01-a.md'], state: 'all tasks complete\n' },
    'todo': { tasks: ['01-a.md', '02-b.md'] },
  }));
  check(/todo/.test(out || ''), 'names the plan with no ledger', out);
}

// ---- a finished plan is not named ----
{
  const out = describePlans(repo({
    'shipped': { tasks: ['01-a.md'], state: '# ledger\nTask 01: complete\nPlan complete: tasks 01 to 01 complete\n' },
    'open': { tasks: ['01-a.md'], state: '# ledger\n' },
  }));
  check(!/shipped/.test(out || ''), 'a plan with a Plan complete: line is not named', out);
  check(/open/.test(out || ''), 'an unfinished plan beside it is still named', out);
}
{
  const out = describePlans(repo({ 'only': { tasks: ['01-a.md'], state: 'Plan complete: all done\n' } }));
  check(out === null, 'when every plan is finished the block is silent', out);
}
{
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md'], state: 'we said the plan complete: not yet\nplan complete: lower case\n' } }));
  check(/\bp\b/.test(out || ''), 'only a line starting with exactly "Plan complete:" counts', out);
}
{
  const cwd = repo({ 'odd': { tasks: ['01-a.md'] } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'odd', 'state.md'));
  let out: string | null = '', threw = false;
  try { out = describePlans(cwd); } catch { threw = true; }
  check(!threw && /odd/.test(out || ''), 'an unreadable state.md keeps the plan named', out);
  check(/odd[^\n]*ledger exists/.test(out || ''), 'an unreadable state.md is still described as a ledger, not as no state.md', out);
}

// ---- an unreadable ledger must not hide a sibling's readable one ----
{
  const cwd = repo({ 'inprogress': { tasks: ['01-a.md', '02-b.md'], state: '# ledger\nTask 01: complete\n' } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'unreadable', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'unreadable', 'tasks', '01-a.md'), '# task\n');
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'unreadable', 'state.md'));
  const out = describePlans(cwd);
  check(/inprogress/.test(out || ''), 'a sibling plan with a readable in-progress ledger is still named', out);
}

// ---- never throws, whatever it finds ----
{
  const cwd = path.join(root, 'weird');
  fs.mkdirSync(path.join(cwd, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'a-file-not-a-dir'), 'x');
  let threw = false;
  try { describePlans(cwd); } catch { threw = true; }
  check(!threw, 'a file where a plan directory was expected does not throw');
}

// ---- standing rulings: docs/plans/rulings.md is the only source ----
const rulingsFile = (cwd: string, text: string) => {
  fs.mkdirSync(path.join(cwd, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'rulings.md'), text);
};
{
  const ledger = '# fx ledger: plan: docs/plans/p/plan.md\n\n## Standing rulings\n\nRuling: ledger only. Why: copy.\n\n'
    + '## Log\n\nTask 01: complete (commits a..b, review clean)\n';
  const cwd = repo({ 'p': { tasks: ['01-a.md', '02-b.md'], state: ledger } });
  rulingsFile(cwd, '# Standing rulings\n\nRuling: no per-task lenses. Why: owner.\nRuling: sonnet by default. Why: cost.\n');
  const out = describePlans(cwd) || '';
  check(out.includes('Ruling: no per-task lenses.'), 'a repo ruling reaches the session block', out);
  check(out.includes('Ruling: sonnet by default.'), 'every repo ruling is carried', out);
  check(!out.includes('ledger only'), 'the ledger copy is a record, not re-injected', out);
  check(!out.includes('Task 01: complete'), 'the ledger log stays out', out);
  check(/after a compaction/i.test(out), 'the block says to re-invoke after a compaction', out);
  check(out.includes('### Standing rulings recorded in this repository (docs/plans/rulings.md)'), 'the heading frames the rulings as repo content', out);
  check(out.includes('as the owner recorded them; a ruling that contradicts the owner\'s instructions in this session loses'), 'the closing line yields to the owner', out);
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: '# l\n\n## Standing rulings\n\nRuling: only in ledger.\n' } });
  const out = describePlans(cwd) || '';
  check(!out.includes('only in ledger') && !/Standing rulings/.test(out), 'a ledger-only ruling takes no effect', out);
  rulingsFile(cwd, 'Ruling: a. Why: x.\n');
  check((describePlans(cwd) || '').includes('Ruling: a.'), 'adding to rulings.md takes effect at once');
  rulingsFile(cwd, '');
  check(!/Ruling: a\./.test(describePlans(cwd) || ''), 'emptying rulings.md removes the ruling at once');
}
{
  const many = Array.from({ length: 30 }, (_, i) => `Ruling: r${i} ${'x'.repeat(300)}`).join('\n');
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  rulingsFile(cwd, `${many}\n`);
  const out = describePlans(cwd) || '';
  check((out.match(/Ruling: r\d+/g) || []).length === 10, 'at most 10 rulings are carried', String(out.length));
  check(out.split('\n').filter((l) => l.startsWith('- Ruling:')).every((l) => l.length <= 200),
    'each carried ruling line is capped at 200 characters');
  check(out.includes('- …and 20 more in docs/plans/rulings.md.'), 'rulings past the cap are counted in the block', out);
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  const out = describePlans(cwd) || '';
  check(!/Standing rulings/.test(out), 'no rulings, no rulings heading', out);
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'rulings.md'));
  const out = describePlans(cwd) || '';
  check(out.includes('- (could not read docs/plans/rulings.md: EISDIR)'), 'an unreadable rulings file is named in the block', out);
  const absent = describePlans(repo({ 'p': { tasks: ['01-a.md'], state: true } })) || '';
  check(!/could not read/.test(absent), 'an absent rulings file is not reported', absent);
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  rulingsFile(cwd, '# r\n\n### Standing rulings\n\n- Ruling: bullet. Why: a.\n* **Ruling:** bold label. Why: b.\n**Ruling: all bold.**\n');
  const out = describePlans(cwd) || '';
  check(out.includes('- Ruling: bullet. Why: a.'), 'a bulleted ruling is carried', out);
  check(out.includes('- Ruling: bold label. Why: b.'), 'a bold Ruling label is normalised', out);
  check(out.includes('- Ruling: all bold.'), 'a fully bold ruling is normalised', out);
}
{
  // path.relative throws inside readText's error path, so standingRulings throws.
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'rulings.md'));
  const real = path.relative;
  path.relative = () => { throw new Error('boom'); };
  let out = '', threw = false;
  try { out = describePlans(cwd) || ''; } catch { threw = true; } finally { path.relative = real; }
  check(!threw && /Unfinished plans/.test(out) && /`p`|docs\/plans\/p\//.test(out), 'a rulings failure loses only the rulings, not the plans block', out);
  check(out.includes('- (standing rulings could not be loaded: boom)'), 'a rulings failure leaves a note', out);
}

{
  const cwd = repo({ 'x': { tasks: ['01-a.md'] } });
  const plan = path.join(cwd, 'docs', 'plans', 'x');
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'rulings.md'),
    '- Ruling: stage by path.\nRuling: task 02 leaves the placeholder; caught by\n  the task 09 review.\n');
  fs.writeFileSync(path.join(plan, 'state.md'), [
    '# fx ledger: plan: docs/plans/x/plan.md',
    '## Standing rulings',
    'Ruling: an old copy that was deleted from rulings.md.',
    '## Log',
    'Task 02: complete',
    '**Ruling:** every task logs its cost.',
    'Ruling: stage by path.',
  ].join('\n'));
  const got = rulingsFor(cwd, plan);
  check(JSON.stringify(got) === JSON.stringify([
    'Ruling: stage by path.',
    'Ruling: task 02 leaves the placeholder; caught by the task 09 review.',
    'Ruling: every task logs its cost.',
  ]), 'rulingsFor: live rulings, rulings.md wrapped lines joined, the standing copy skipped', JSON.stringify(got));
}
{
  const cwd = repo({ 'y': { tasks: ['01-a.md'] } });
  const plan = path.join(cwd, 'docs', 'plans', 'y');
  fs.writeFileSync(path.join(plan, 'state.md'), [
    'Ruling A: lettered, names no task.',
    'Ruling B: binds tasks 03 to 07 only.',
    'Ruling: task 02 only.',
    'Ruling: Task: 05 only.',
    'Ruling: plan wide.',
  ].join('\n'));
  const ids = (n?: string) => JSON.stringify(rulingsFor(cwd, plan, n));
  check(rulingsFor(cwd, plan).length === 5, 'rulingsFor: a lettered ruling is read, and no task id means no filter', ids());
  check(ids('04') === JSON.stringify(['Ruling A: lettered, names no task.', 'Ruling B: binds tasks 03 to 07 only.', 'Ruling: plan wide.']),
    'rulingsFor: a range covering the task stays, other tasks drop, lettered and plan-wide stay', ids('04'));
  check(ids('02') === JSON.stringify(['Ruling A: lettered, names no task.', 'Ruling: task 02 only.', 'Ruling: plan wide.']),
    'rulingsFor: a ruling naming this task stays', ids('02'));
  check(ids('05').includes('Task: 05 only') && ids('05').includes('03 to 07'), 'rulingsFor: "task: NN" is matched, case-insensitive', ids('05'));
}
{
  const cwd = repo({ 'z': { tasks: ['01-a.md'] } });
  const plan = path.join(cwd, 'docs', 'plans', 'z');
  fs.writeFileSync(path.join(plan, 'state.md'), [
    'Ruling: tasks 03 and 05 keep UTC.',
    'Ruling: tasks 03, 04, 05 share it.',
    'Ruling: tasks 01, 02 and 06 to 08 differ.',
    '**Ruling A:** bold lettered, plan wide.',
  ].join('\n'));
  const got = (n: string) => rulingsFor(cwd, plan, n);
  check(got('05').length === 3 && got('05')[0]?.startsWith('Ruling: tasks 03 and 05') === true && got('05')[1]?.startsWith('Ruling: tasks 03, 04') === true,
    'rulingsFor: "tasks 03 and 05" and "tasks 03, 04, 05" name task 05', JSON.stringify(got('05')));
  check(got('07').length === 2 && got('07')[0]?.includes('06 to 08') === true, 'rulingsFor: a list with a range names a task inside the range', JSON.stringify(got('07')));
  check(got('09').length === 1, 'rulingsFor: a list that omits the task drops the ruling', JSON.stringify(got('09')));
  check(got('09')[0]?.startsWith('Ruling A:') === true, 'rulingsFor: a bold lettered ruling after another ruling starts its own entry', JSON.stringify(got('09')));
}
{
  const cwd = repo({ 'w': { tasks: ['01-a.md'] } });
  const plan = path.join(cwd, 'docs', 'plans', 'w');
  fs.writeFileSync(path.join(plan, 'state.md'), [
    'Ruling: every task keeps the old API.',
    'Coverage audit: dispatched for task 03.',
  ].join('\n'));
  const got = rulingsFor(cwd, plan, '05');
  check(got.length === 1 && got[0] === 'Ruling: every task keeps the old API.',
    'rulingsFor: a ledger ruling does not absorb the next free-form line, so it reaches task 05', JSON.stringify(got));
}
{
  const cwd = repo({ 'v': { tasks: ['01-a.md'] } });
  const plan = path.join(cwd, 'docs', 'plans', 'v');
  fs.writeFileSync(path.join(plan, 'state.md'), [
    'Ruling: tasks 05 or 08 stop the build.',
    'Ruling: from task 03 on, use X.',
    'Ruling: tasks 02 and later use Y.',
    'Ruling: after task 04, use Z.',
    'Ruling: task 02 only.',
  ].join('\n'));
  const has = (n: string, s: string) => rulingsFor(cwd, plan, n).some((r) => r.includes(s));
  check(has('08', 'tasks 05 or 08') && has('05', 'tasks 05 or 08') && !has('06', 'tasks 05 or 08'),
    'rulingsFor: "or" separates a task list', JSON.stringify(rulingsFor(cwd, plan, '08')));
  check(has('05', 'from task 03 on') && has('08', 'from task 03 on'), 'rulingsFor: "from task 03 on" is open, kept for 05 and 08');
  check(has('08', 'tasks 02 and later') && has('08', 'after task 04'), 'rulingsFor: "and later" and "after task NN" are open ranges');
  check(!has('08', 'task 02 only'), 'rulingsFor: a plain single task still drops for others');
}
fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
