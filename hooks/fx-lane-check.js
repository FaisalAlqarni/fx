#!/usr/bin/env node
'use strict';
// Claude Code — PreToolUse on Write and Edit.
//
// WHY THIS EXISTS
//
// The routing table lives in PREAMBLE.md, injected per message. That reliably
// catches an agent BEFORE its first action, and the entry lane fires. Every
// downstream lane triggers mid-task: fx-tdd when you are about to write logic,
// fx-review when an implementation is finished. Those moments arrive hours
// after the only point the routing table is read, and nothing re-reads it.
//
// Measured: an autonomous agent building a real app invoked fx-brainstorm
// unprompted, then wrote 850 lines with no design doc, no plan, no TDD, and
// no review. 1 lane of 5. Not a discipline failure — there was no moment at
// which the question got asked.
//
// So ask it here. Two checks, each fires ONCE per session per repo, blocks
// with a reason, and records that it fired. A gate you can answer and move
// past, not a nag.
//
// Both are skippable by design: state why in one line and continue. The point
// is that the decision becomes conscious and visible, not that it becomes
// impossible. DEBT #24 — a red-flag table catches self-deception; only a
// structural check catches an informed override.

const fs = require('fs');
const path = require('path');

const SOURCE_DIRS = ['app/', 'src/', 'lib/', 'internal/', 'pkg/', 'cmd/'];
const TEST_DIRS = ['test/', 'tests/', 'spec/', '__tests__/'];
const TEST_NAME = /(_test|_spec|\.test|\.spec)\./;

function deny(reason) {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

process.on('uncaughtException', () => process.exit(0));   // never block on our own bug

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  const tool = input.tool_name;
  if (tool !== 'Write' && tool !== 'Edit') process.exit(0);

  const file = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || '';
  const cwd = input.cwd || process.cwd();
  if (!file) process.exit(0);

  const rel = path.relative(cwd, file);
  if (rel.startsWith('..')) process.exit(0);          // outside the project

  // Fired-once markers live beside the other ephemeral state.
  const stateDir = path.join(cwd, '.fx');
  const mark = (name) => path.join(stateDir, `.lane-${name}`);
  const alreadyFired = (name) => fs.existsSync(mark(name));
  const record = (name) => {
    try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(mark(name), ''); } catch { /* best effort */ }
  };

  const inSource = SOURCE_DIRS.some((d) => rel.startsWith(d));
  const inTest = TEST_DIRS.some((d) => rel.startsWith(d)) || TEST_NAME.test(path.basename(rel));

  // --- Check 1: writing source with no design anywhere ---------------------
  if (inSource && !inTest && !alreadyFired('design')) {
    let hasDesign = false;
    try {
      const plans = path.join(cwd, 'docs', 'plans');
      hasDesign = fs.readdirSync(plans).some((d) =>
        fs.existsSync(path.join(plans, d, 'design.md')));
    } catch { hasDesign = false; }

    if (!hasDesign) {
      record('design');
      deny(
        `about to write ${rel}, and this repo has no docs/plans/*/design.md.\n\n` +
        `The routing table is read once, before your first action. This is the ` +
        `second time of asking, at the moment it actually matters.\n\n` +
        `If the work is architectural — a new project, a new subsystem, an ` +
        `interface others depend on — fx-brainstorm owns it, and its output is ` +
        `a design doc plus a plan.\n\n` +
        `If it is genuinely bounded, or you are deliberately skipping the ` +
        `ceremony, say so in one line and write the file. This fires once. ` +
        `An unannounced skip is a decision made in secret (DEBT #25).`
      );
    }
    record('design');
  }

  // --- Check 2: test written after the implementation it covers ------------
  if (inTest && !alreadyFired('tdd')) {
    // Look for a same-named implementation file that already exists.
    const base = path.basename(rel).replace(TEST_NAME, '.').replace(/^(test_)/, '');
    const stem = base.replace(/\.[^.]+$/, '');
    let impl = null;
    for (const d of SOURCE_DIRS) {
      const dir = path.join(cwd, d);
      if (!fs.existsSync(dir)) continue;
      const stack = [dir];
      while (stack.length && !impl) {
        const cur = stack.pop();
        let entries = [];
        try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
          const p = path.join(cur, e.name);
          if (e.isDirectory()) { stack.push(p); continue; }
          if (e.name.replace(/\.[^.]+$/, '') === stem) { impl = path.relative(cwd, p); break; }
        }
      }
      if (impl) break;
    }

    if (impl) {
      record('tdd');
      deny(
        `about to write the test ${rel}, and ${impl} already exists.\n\n` +
        `That is the inversion: implementation first, test after. A test ` +
        `written against code that already works routinely restates whatever ` +
        `the code does, and passes whether or not the logic is right.\n\n` +
        `fx-tdd owns this — Iron Law, verified RED, then GREEN. If you are ` +
        `backfilling coverage on purpose, that is legitimate: say so, and ` +
        `prove each test fails against the unfixed code before trusting it. ` +
        `This fires once.`
      );
    }
    record('tdd');
  }

  process.exit(0);
});
