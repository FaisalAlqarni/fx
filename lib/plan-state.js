'use strict';
// Reads docs/plans and describes any plan whose build is unfinished.
//
// WHY THIS EXISTS
//
// A skill can hand off to a skill: fx-brainstorm names fx-plan in its closing
// section, and that handoff works because the instruction is in context at the
// moment it is needed. The plan-to-implement handoff is not a step inside a
// skill, it is a SESSION BOUNDARY. A fresh agent opens a repo full of artifacts
// with nothing in context naming fx-implement except a routing table it read
// once, before it had looked at the repo. Measured: a 13-task plan handed to a
// fresh agent produced 97 passing specs and zero Skill calls. DEBT #33.
//
// SessionStart and SubagentStart are the one channel that fires reliably
// (PreToolUse does not fire for Write or Edit at all, DEBT #30), so the routing
// happens here, against what is actually on disk, in specifics rather than in
// the generic table.
//
// Returns a string to append to the preamble, or null when there is nothing to
// say. Never throws: a bug here must not stop a session from starting.

const fs = require('fs');
const path = require('path');

const TASK_DIRS = ['tasks', 'tickets'];   // `tickets` is the legacy name, DEBT #29
const MAX_PLANS = 20;                     // a SessionStart hook has a 5s budget

function readdir(p) {
  try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; }
}

function scan(cwd) {
  const base = path.join(cwd, 'docs', 'plans');
  const out = [];
  for (const e of readdir(base).slice(0, MAX_PLANS)) {
    if (!e.isDirectory()) continue;
    const dir = path.join(base, e.name);
    let taskDir = null;
    for (const d of TASK_DIRS) {
      if (readdir(path.join(dir, d)).length) { taskDir = d; break; }
    }
    if (!taskDir) continue;
    const tasks = readdir(path.join(dir, taskDir))
      .filter((f) => f.isFile() && f.name.endsWith('.md')).length;
    if (!tasks) continue;
    out.push({
      slug: e.name,
      tasks,
      taskDir,
      hasState: fs.existsSync(path.join(dir, 'state.md')),
    });
  }
  return out;
}

function describePlans(cwd) {
  let plans;
  try { plans = scan(cwd); } catch { return null; }
  if (!plans.length) return null;

  // A plan with a ledger is resumable; one without has not been started under
  // fx-implement. Both route to the same lane, with different opening moves.
  const fresh = plans.filter((p) => !p.hasState);
  const named = (fresh.length ? fresh : plans).slice(0, 3);

  const lines = named.map((p) => {
    const where = `\`docs/plans/${p.slug}/${p.taskDir}/\``;
    const count = `${p.tasks} task file${p.tasks === 1 ? '' : 's'}`;
    return p.hasState
      ? `- ${where}: ${count}, and a \`state.md\` ledger already exists, so a build is underway. Read the ledger before anything else and resume at the first unfinished task. Do not redo what it records as done.`
      : `- ${where}: ${count}, and no \`state.md\`. The plan was written and the build has not started under a ledger.`;
  });

  return [
    '## Unfinished plans in this repository',
    '',
    ...lines,
    '',
    '`fx-implement` owns this. Invoke it before writing code against these '
      + 'tasks. It supplies the things a task file structurally cannot: an '
      + 'isolated worktree, a ledger that survives compaction, a fresh subagent '
      + 'per task, a review after each one, and the review lenses the diff earns.',
    '',
    'A task file being detailed enough to execute is not a reason to skip the '
      + 'lane. That is the failure this notice exists to catch: the specificity '
      + 'that makes a plan easy to follow is what makes the lane feel redundant, '
      + 'and the ledger goes missing exactly when the session is long enough to '
      + 'need one.',
    '',
    '**If you were dispatched with one specific task**, you are already inside '
      + 'that lane. Do that task, record it in the ledger, and return. Do not '
      + 're-enter `fx-implement`, and do not pick up the other tasks.',
  ].join('\n') + '\n';
}

module.exports = { describePlans, scan };
