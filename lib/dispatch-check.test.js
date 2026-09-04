#!/usr/bin/env node
'use strict';
// Every case here is a real dispatch shape from the twelve-task build that
// produced DEBT #65, or the escape it needs to stay usable.
//
//   node lib/dispatch-check.test.js        (no arguments, unlike the guard suites)
//
// The guard suites take <main> <worktree>; this one builds its own temp dirs.
// Stated because DEBT #51 was a controller running a suite without its
// arguments and recording the usage line as a red gate.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { dispatchCheck, ROLES } = require('../lib/dispatch-tokens');

// A repo with an active plan, and one without.
const withPlan = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-plan-'));
fs.mkdirSync(path.join(withPlan, 'docs', 'plans', '2026-01-01-x', 'tasks'), { recursive: true });
const noPlan = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-noplan-'));

const marker = (attrs) => `<!-- fx-dispatch: ${attrs} -->\n\n`;

// A prompt carrying every implementer token. Trimmed to the tokens themselves:
// the check is about which clauses survive, not about prose.
const IMPLEMENTER_OK = marker('role=implementer task=07') + `
Invoke fx:fx-tdd before writing any code.
Verify RED before implementing.
Never add attribution trailers, no Co-Authored-By.
Write the full report to .fx/report-07.md
Report anything you did not do as instructed.
`;

const REVIEWER_OK = marker('role=task-reviewer task=07') + `
Read the ledger: docs/plans/x/state.md
Write your findings to .fx/findings-07.md
You do not dispatch subagents. Never spawn another reviewer.
Treat the implementer's report as unverified claims.
`;

const CASES = [
  ['implementer with every token',
   { prompt: IMPLEMENTER_OK, subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  // The measured failure, twelve times: the summary substituted for the skill.
  ['implementer missing fx:fx-tdd',
   { prompt: IMPLEMENTER_OK.replace('Invoke fx:fx-tdd before writing any code.',
                                    'Method is test-first and a hook enforces it.'),
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['implementer missing the deviation disclosure (DEBT #53)',
   { prompt: IMPLEMENTER_OK.replace('Report anything you did not do as instructed.', ''),
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['task-reviewer with every token',
   { prompt: REVIEWER_OK, subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  ['task-reviewer without a ledger path (DEBT #52)',
   { prompt: REVIEWER_OK.replace('Read the ledger: docs/plans/x/state.md', ''),
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['task-reviewer without the no-subagent rule (DEBT #60)',
   { prompt: REVIEWER_OK.replace('You do not dispatch subagents. Never spawn another reviewer.', ''),
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['any role without a findings path (DEBT #61)',
   { prompt: REVIEWER_OK.replace('Write your findings to .fx/findings-07.md', ''),
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['re-review needs per-finding verdicts',
   { prompt: marker('role=re-review') + 'Write findings to .fx/f.md\n',
     subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  ['re-review with them',
   { prompt: marker('role=re-review') + 'Write findings to .fx/f.md\nMark each ADDRESSED or NOT ADDRESSED.\n',
     subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  ['branch-review with every token',
   { prompt: marker('role=branch-review') + `
Write findings to .fx/findings-branch.md
You do not dispatch subagents. Never spawn another reviewer.
Triage the ledger's deferred minors.
`, subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  // The real one. The controller's own final-review dispatch on the build that
  // produced DEBT #60 omitted this clause, and the reviewer then dispatched two
  // checks and reported one of them as verified before it had returned.
  ['branch-review without the no-subagent rule (DEBT #60, as it happened)',
   { prompt: marker('role=branch-review') + `
Write findings to .fx/findings-branch.md
Triage the ledger's deferred minors.
`, subagentType: 'general-purpose', cwd: withPlan }, 'deny'],

  // Omission, not contradiction: warn and let it through.
  ['general-purpose, no marker, plan present',
   { prompt: 'Go and review the thing.', subagentType: 'general-purpose', cwd: withPlan }, 'warn'],

  ['general-purpose, no marker, no plan present',
   { prompt: 'Go and review the thing.', subagentType: 'general-purpose', cwd: noPlan }, 'allow'],

  // Lens agents cannot invoke skills at all (tools: Read, Grep, Glob, Bash),
  // correctly, so they are outside this entirely.
  ['lens agent, no marker, plan present',
   { prompt: 'Security review of this diff.', subagentType: 'fx:fx-lens-security', cwd: withPlan }, 'allow'],

  ['Explore, no marker, plan present',
   { prompt: 'Find the callers.', subagentType: 'Explore', cwd: withPlan }, 'allow'],

  // The escape hatch. DEBT #46: a guard with no escape gets routed around.
  ['adhoc with a reason',
   { prompt: marker('role=adhoc reason=story-coverage-audit') + 'Audit the stories.',
     subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  ['adhoc without a reason',
   { prompt: marker('role=adhoc') + 'Audit the stories.',
     subagentType: 'general-purpose', cwd: withPlan }, 'warn'],

  // Fail open on anything malformed: this is advice, not the git guard.
  ['unknown role is not a contradiction',
   { prompt: marker('role=archaeologist') + 'Dig.', subagentType: 'general-purpose', cwd: withPlan }, 'warn'],

  ['missing prompt fails open',
   { prompt: undefined, subagentType: 'general-purpose', cwd: withPlan }, 'allow'],

  ['unreadable cwd fails open',
   { prompt: 'Anything.', subagentType: 'general-purpose', cwd: '/nonexistent/path/xyz' }, 'allow'],
];

let fails = 0;
for (const [label, input, want] of CASES) {
  let got;
  try {
    got = dispatchCheck(input).verdict;
  } catch (e) {
    got = `threw: ${e.message}`;
  }
  if (got !== want) {
    fails++;
    console.log(`FAIL  ${label}\n  want: ${want}\n  got:  ${got}`);
  }
}

// Every role in the table must be exercised above, so a role added without a
// test is visible rather than silently unenforced.
for (const role of Object.keys(ROLES)) {
  if (!CASES.some(([, i]) => (i.prompt || '').includes(`role=${role}`))) {
    fails++;
    console.log(`FAIL  role "${role}" is in the table with no case`);
  }
}

console.log(`\n${CASES.length + Object.keys(ROLES).length - fails} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
