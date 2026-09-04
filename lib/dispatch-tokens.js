'use strict';
// Which clauses a lane dispatch must carry, and the check that reads them.
//
// WHY CLAUSES AND NOT PROVENANCE
//
// The obvious check is "does this prompt match a file fx-implement wrote". It
// is the wrong one. It is brittle against adaptation, and adaptation is
// valuable: on the build that produced DEBT #65 the hand-tailored briefs, the
// ones carrying ledger rulings and named risks, are why several defects were
// caught at all. What was lost was never the tailoring. It was clauses, dropped
// one at a time by a controller reconstructing a 300-line template from memory.
//
// So this checks the clauses. A hand-written dispatch that carries them passes.
// A file-derived one that drops them does not.
//
// Every token below traces to a measured loss. Adding a rule to a template
// without adding it here leaves the rule advisory, which is the whole failure
// this module exists to end.

const fs = require('fs');
const path = require('path');

const MARKER = /<!--\s*fx-dispatch:([^>]*)-->/;

const ROLES = {
  implementer: [
    { name: 'the `fx:fx-tdd` invocation', re: /fx:fx-tdd/ },                        // #65
    { name: 'RED evidence', re: /\bRED\b/ },
    { name: 'the attribution prohibition', re: /attribution|Co-Authored-By/i },
    { name: 'the deviation disclosure ("did not do as instructed")',
      re: /did not do as instructed/i },                                            // #53
  ],
  'task-reviewer': [
    { name: 'the ledger path', re: /state\.md|\bledger\b/i },                       // #52
    { name: 'a findings path', re: /findings/i },                                   // #61
    { name: 'the no-subagent rule', re: /not dispatch subagents|never spawn/i },    // #60
    { name: 'the report-is-unverified rule',
      re: /unverified|do not trust the report/i },
  ],
  're-review': [
    { name: 'a findings path', re: /findings/i },                                   // #61
    { name: 'per-finding verdicts (ADDRESSED)', re: /ADDRESSED/ },
  ],
  'branch-review': [
    { name: 'a findings path', re: /findings/i },                                   // #61
    { name: 'the no-subagent rule', re: /not dispatch subagents|never spawn/i },    // #60
    { name: 'the deferred-minors triage', re: /deferred/i },
  ],
};

// Agents that cannot be a lane role. fx's five carry `tools: Read, Grep, Glob,
// Bash` and cannot invoke a skill at all, correctly: they are read-only
// reviewers with nothing to comply with here.
const NOT_A_LANE_ROLE = new Set([
  'Explore', 'Plan', 'statusline-setup', 'claude-code-guide', 'fx:fx-devils-advocate',
]);

const ALLOW = { verdict: 'allow', reason: null };

function planPresent(cwd) {
  try {
    const base = path.join(cwd, 'docs', 'plans');
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const dir of ['tasks', 'tickets']) {
        if (fs.existsSync(path.join(base, entry.name, dir))) return true;
      }
    }
  } catch {
    // No plans directory, or an unreadable cwd. Not our business either way.
  }
  return false;
}

function dispatchCheck({ prompt, subagentType, cwd } = {}) {
  if (typeof prompt !== 'string' || !prompt) return ALLOW;

  const type = subagentType || '';
  if (NOT_A_LANE_ROLE.has(type) || /^fx:fx-lens/.test(type)) return ALLOW;

  const found = MARKER.exec(prompt);

  if (!found) {
    if (!planPresent(cwd || process.cwd())) return ALLOW;
    return {
      verdict: 'warn',
      reason: 'this repository has a plan underway and this dispatch carries no '
            + '`<!-- fx-dispatch: role=... -->` marker. If it is a lane dispatch, '
            + 'fx-implement writes the filled prompt to .fx/dispatch/ and its '
            + 'clauses are checked. If it is not, say so with '
            + '`role=adhoc reason=<why>`.',
    };
  }

  const attrs = found[1];
  const role = (/role=([A-Za-z-]+)/.exec(attrs) || [])[1];

  if (role === 'adhoc') {
    return /reason=\S/.test(attrs)
      ? ALLOW
      : { verdict: 'warn', reason: '`role=adhoc` needs `reason=<why>`. An escape '
                                 + 'nobody has to justify is one nobody reads.' };
  }

  const tokens = ROLES[role];
  if (!tokens) {
    return {
      verdict: 'warn',
      reason: `unknown dispatch role "${role}". Known roles: `
            + `${Object.keys(ROLES).join(', ')}, adhoc.`,
    };
  }

  const missing = tokens.filter((t) => !t.re.test(prompt)).map((t) => t.name);
  if (missing.length) {
    return {
      verdict: 'deny',
      reason: `this dispatch declares role=${role} and is missing `
            + `${missing.join(', ')}. Either send the prompt fx-implement wrote `
            + `to .fx/dispatch/, or mark it \`role=adhoc reason=<why>\` if it is `
            + `deliberately not that role.`,
    };
  }

  return ALLOW;
}

module.exports = { dispatchCheck, ROLES, planPresent };
