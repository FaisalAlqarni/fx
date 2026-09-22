'use strict';
// Run: node tests/gates/no-runtime-addressing.test.js
//
// fx ships one set of skill files to Claude Code, opencode and Codex. Only
// PREAMBLE.md is rendered per runtime (ADR 0020), and the rendered bootstrap
// already tells each runtime how to address a lane (ADR 0021): `fx:fx-tdd` on
// Claude Code, bare `fx-tdd` on opencode, `$fx-tdd` on Codex. A skill or
// reference file that says "invoke `fx:fx-tdd`" is right on one runtime and
// contradicts the bootstrap on the other two. So shared text names the lane
// ("invoke the fx-tdd lane") and never a runtime form, and never claims how a
// name resolves.
//
// Agents are addressed the same way: the bootstrap's dispatch rule says how
// each runtime names one, and on Codex a wrong agent_type can run a lens
// without its read-only role.
//
// A paragraph fails when it carries `fx:<lane-or-agent>` or `$<lane>` at all,
// whatever verb sits around it ("use `fx:fx-tdd`", "the `$fx-review` lane"),
// or when it claims a name "may not resolve". Slash commands (`/fx:fx-setup`,
// the generated command-skill headers) are what a person types, so a match
// preceded by `/` is not one. A paragraph that quotes the wrong form on
// purpose carries `prose-gate: quoting`, the marker scripts/check-prose
// already honours.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const DIRS = ['skills', 'references', 'agents', 'commands'];
const MARKER = 'prose-gate: quoting';
const LANES = fs.readdirSync(path.join(root, 'skills'))
  .filter((n) => fs.existsSync(path.join(root, 'skills', n, 'SKILL.md')));

const AGENTS = fs.readdirSync(path.join(root, 'agents'))
  .filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
const alt = (names) => names.join('|');
const runtimeForm = new RegExp(
  `(^|[^/\\w])(fx:(${alt([...LANES, ...AGENTS])})|\\$(${alt(LANES)}))(?![\\w-])`);
// "may not resolve" is the claim about a lane name. Plain "does not resolve"
// stays legal: fx-audit says it of a git ref.
const RESOLVES = /\b(may|might)\s+not\s+resolve/i;

function mdFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Returns "file:line: text" for each offending paragraph in one file's text.
function offences(rel, text) {
  const errors = [];
  const lines = text.split('\n');
  let start = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i < lines.length && lines[i].trim() !== '') continue;
    const para = lines.slice(start, i).join('\n');
    if (para && !para.includes(MARKER)) {
      const form = runtimeForm.test(para);
      if (form || RESOLVES.test(para)) {
        errors.push(`${rel}:${start + 1}: ${form ? 'runtime form of a lane or agent name' : 'resolution claim'}`);
      }
    }
    start = i + 1;
  }
  return errors;
}

const errors = [];
for (const d of DIRS) {
  for (const f of mdFiles(path.join(root, d))) {
    errors.push(...offences(path.relative(root, f), fs.readFileSync(f, 'utf8')));
  }
}
assert.deepStrictEqual(errors, [],
  `shared skill text must name a lane or agent without a runtime form ("invoke the fx-tdd lane"):\n  ${errors.join('\n  ')}`);

// The gate bites.
assert.strictEqual(offences('x', '**Invoke `fx:fx-tdd` before writing any code.**').length, 1, 'the Claude Code form fails');
assert.strictEqual(offences('x', 'Invoke `$fx-tdd` first.').length, 1, 'the Codex form fails');
assert.strictEqual(offences('x', 'Use the addressable name,\nsince a bare `fx-tdd` may\nnot resolve at all.').length, 1,
  'a resolution claim fails across a line break');
// And it spares what it should.
assert.deepStrictEqual(offences('x', 'Invoke the fx-tdd lane before writing any code.'), [], 'the lane name passes');
assert.deepStrictEqual(offences('x', 'The ref does not resolve: stop and ask.'), [], 'a git ref that does not resolve is not a claim');
assert.deepStrictEqual(offences('x', '# /fx:fx-setup\n\nInvoke it as `/fx:fx-grill`.'), [], 'a slash command is not a lane form');
assert.strictEqual(offences('x', 'Dispatch `fx:fx-lens-pipeline` on the file set.').length, 1, 'the Claude Code agent form fails');
assert.strictEqual(offences('x', 'Use `fx:fx-tdd` for RED.').length, 1, 'the form fails without the word invoke');
assert.strictEqual(offences('x', 'The `$fx-review` lane runs next.').length, 1, 'the Codex form fails without the word invoke');
assert.deepStrictEqual(offences('x', 'Never write "invoke `fx:fx-tdd`" here.\n(prose-gate: quoting)'), [], 'a marked quote passes');

console.log('no-runtime-addressing.test.js: OK');
