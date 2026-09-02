'use strict';
// Run: node lib/plan-state.test.js
//
// Builds real directory trees under a temp dir. The whole predicate is "what is
// on disk in docs/plans", so a mocked fs would be testing the mock. Same
// reasoning as git-guard.test.js.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { describePlans } = require('./plan-state');

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) pass++;
  else { fail++; console.log(`FAIL  ${label}${extra ? `\n      ${extra}` : ''}`); }
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-plan-state-'));
let n = 0;
// spec: { slug: { tasks: [names], state: bool, design: bool, dir: 'tasks'|'tickets' } }
function repo(spec) {
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
  check(!/[—–]/.test(out || ''), 'contains no em or en dashes', out);
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

// ---- never throws, whatever it finds ----
{
  const cwd = path.join(root, 'weird');
  fs.mkdirSync(path.join(cwd, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'a-file-not-a-dir'), 'x');
  let threw = false;
  try { describePlans(cwd); } catch { threw = true; }
  check(!threw, 'a file where a plan directory was expected does not throw');
}

fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
