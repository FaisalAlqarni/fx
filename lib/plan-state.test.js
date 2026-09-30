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
  let out, threw = false;
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

// ---- standing rulings ----
{
  const ledger = '# fx ledger: plan: docs/plans/p/plan.md\n\n## Standing rulings\n\n'
    + 'Ruling: no per-task lenses. Why: owner.\nRuling: sonnet by default. Why: cost.\n\n'
    + '## Log\n\nTask 01: complete (commits a..b, review clean)\n';
  const cwd = repo({ 'p': { tasks: ['01-a.md', '02-b.md'], state: ledger } });
  const out = describePlans(cwd) || '';
  check(out.includes('Ruling: no per-task lenses.'), 'a ledger ruling reaches the session block', out);
  check(out.includes('Ruling: sonnet by default.'), 'every ledger ruling is carried', out);
  check(!out.includes('Task 01: complete'), 'only the rulings section is carried', out);
  check(/after a compaction/i.test(out), 'the block says to re-invoke after a compaction', out);
}
{
  const ledger = '# fx ledger: plan: docs/plans/p/plan.md\n\n## Standing rulings\n\nRuling: a. Why: x.\n';
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: ledger } });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'rulings.md'),
    '# Standing rulings\n\nRuling: a. Why: x.\nRuling: b made mid-run. Why: y.\n');
  const out = describePlans(cwd) || '';
  check(out.includes('Ruling: b made mid-run.'), 'a repo-level ruling appears without a ledger copy', out);
  check((out.match(/Ruling: a\. Why: x\./g) || []).length === 1, 'a ruling in both places appears once', out);
}
{
  const many = Array.from({ length: 30 }, (_, i) => `Ruling: r${i} ${'x'.repeat(300)}`).join('\n');
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: `# fx ledger\n\n## Standing rulings\n\n${many}\n` } });
  const out = describePlans(cwd) || '';
  check((out.match(/Ruling: r\d+/g) || []).length === 10, 'at most 10 rulings are carried', out.length);
  check(out.split('\n').filter((l) => l.startsWith('- Ruling:')).every((l) => l.length <= 200),
    'each carried ruling line is capped at 200 characters');
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  const out = describePlans(cwd) || '';
  check(!/Standing rulings/.test(out), 'no rulings, no rulings heading', out);
}

// ---- standing rulings: fix round 1 ----
{
  const many = Array.from({ length: 12 }, (_, i) => `Ruling: q${i}`).join('\n');
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: `# l\n\n## Standing rulings\n\n${many}\n` } });
  const out = describePlans(cwd) || '';
  check(out.includes("- …and 2 more in docs/plans/rulings.md or the ledger's Standing rulings section."), 'rulings past the cap are counted in the block', out);
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
  const ledger = '# l\n\n### Standing rulings\n\n- Ruling: bullet. Why: a.\n* **Ruling:** bold label. Why: b.\n**Ruling: all bold.**\n\n## Log\n\nTask 01: complete\n';
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md'], state: ledger } })) || '';
  check(out.includes('- Ruling: bullet. Why: a.'), 'a bulleted ruling under a ### heading is carried', out);
  check(out.includes('- Ruling: bold label. Why: b.'), 'a bold Ruling label is normalised', out);
  check(out.includes('- Ruling: all bold.'), 'a fully bold ruling is normalised', out);
  check(!out.includes('Task 01: complete'), 'the log stays out with a ### heading', out);
}
{
  // path.relative throws inside readText's error path, so standingRulings throws.
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'rulings.md'));
  const real = path.relative;
  path.relative = () => { throw new Error('boom'); };
  let out, threw = false;
  try { out = describePlans(cwd) || ''; } catch { threw = true; } finally { path.relative = real; }
  check(!threw && /Unfinished plans/.test(out) && /`p`|docs\/plans\/p\//.test(out), 'a rulings failure loses only the rulings, not the plans block', out);
}

fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
