'use strict';
// Run: node tests/fixture-build/hidden/traps.self-test.js
// Builds a correct and a buggy implementation of the fixture's contract and
// checks the hidden tests score each one correctly.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TRAPS = path.join(__dirname, 'traps.test.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-traps-'));

const good = {
  'lib/store.js': `
const fs = require('fs'); const path = require('path');
const dir = () => path.resolve(process.env.NOTES_DIR || './notes');
function file(name) {
  const f = path.resolve(dir(), name);
  if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }
  return f;
}
exports.save = (n, t) => { const f = file(n); fs.mkdirSync(dir(), { recursive: true }); fs.writeFileSync(f, t); };
exports.load = (n) => { const f = file(n); if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return fs.readFileSync(f, 'utf8'); };
exports.list = () => (fs.existsSync(dir()) ? fs.readdirSync(dir()).sort() : []);
`,
  'lib/export.js': `const s = require('./store'); exports.exportAll = () => s.list().map((n) => '# ' + n + '\\n\\n' + s.load(n) + '\\n').join('');`,
  'lib/search.js': `const s = require('./store'); exports.search = (q) => s.list().filter((n) => s.load(n).toLowerCase().includes(q.toLowerCase()));`,
  'cli.js': `
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b); else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(require('./lib/search').search(a).join('\\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
`,
  'README.md': '# notes\n\n```sh\nnode cli.js add hello "hello world"\nnode cli.js show hello\n```\n',
};
const bad = {
  ...good,
  'lib/store.js': good['lib/store.js']
    .replace("if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }", '')
    .replace("if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } ", "if (!fs.existsSync(f)) return ''; "),
  'lib/search.js': `const s = require('./store'); exports.search = (q) => s.list().filter((n) => s.load(n).includes(q));`,
  'README.md': '# notes\n\n```sh\nnotes add hello "hello world"\nnotes show hello\n```\n',
};
// cli-wiring is judged in a temp copy with lib/search.js swapped for a
// sentinel (Ruling I), so `bad`'s case-sensitive search never reaches it:
// `bad`'s cli.js is `good`'s, unmodified, so cli-wiring reads true on `bad`.
// These two variants change only cli.js, to isolate wiring from every other
// trap.
const inlineSearchCli = {
  ...good,
  // A second search implementation inline in cli.js: never requires
  // lib/search.js at all, so the sentinel swap cannot reach it.
  'cli.js': `
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b);
else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(s.list().filter((n) => s.load(n).toLowerCase().includes(String(a).toLowerCase())).join('\\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
`,
};
const pathJoinSearchCli = {
  ...good,
  // Loads lib/search.js through path.join(__dirname, ...) rather than a
  // literal './lib/search' string: a correct, common form the old
  // regex-only check rejected.
  'cli.js': `
const path = require('path');
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b);
else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(require(path.join(__dirname, 'lib', 'search')).search(a).join('\\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
`,
};
// A correct README that overrides NOTES_DIR itself, a plausible answer to
// the task's own "say where notes are stored and how NOTES_DIR changes
// that". readme-example judges the script's own output, not the scorer's
// NOTES_DIR, so this must read true.
const readmeOverridesNotesDir = {
  ...good,
  'README.md': '# notes\n\n```sh\nexport NOTES_DIR=./my-notes\nnode cli.js add hello "hello world"\nnode cli.js show hello\n```\n',
};
// Passes the original path-escape cases (every name it rejects contains
// "..") but never checks an absolute path, which does not: it must miss
// the new case (Ruling L).
const onlyDotDotStore = {
  ...good,
  'lib/store.js': good['lib/store.js'].replace(
    "if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }",
    "if (name.includes('..')) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }",
  ),
};
// Passes load('nope') (file does not exist) but treats an existing, empty
// file the same as a missing one: it must miss the new empty-text case.
const emptyIsMissingStore = {
  ...good,
  'lib/store.js': good['lib/store.js'].replace(
    "if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return fs.readFileSync(f, 'utf8');",
    "const t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; if (!t) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return t;",
  ),
};
// Lower-cases only the query, not the note text: passes search('HELLO')
// against all-lowercase text, but must miss a mixed-case word in mixed-case
// text ("wORL" in "Hello World").
const queryOnlyLowerSearch = {
  ...good,
  'lib/search.js': `const s = require('./store'); exports.search = (q) => s.list().filter((n) => s.load(n).includes(q.toLowerCase()));`,
};
// A correct store shaped differently from the reference: builds the path
// with path.join(dir(), name) and checks the result with startsWith(dir()),
// rather than comparing path.dirname(f) to dir(). It still rejects every
// traversal (path.join normalizes, so a name that walks above dir() fails
// startsWith), but it nests an absolute-looking name inside dir() instead
// of throwing: never resolves outside NOTES_DIR, so design.md's rule never
// applies to it. Must score path-escape true (Ruling M).
const joinStartsWithStore = {
  ...good,
  'lib/store.js': `
const fs = require('fs'); const path = require('path');
const dir = () => path.resolve(process.env.NOTES_DIR || './notes');
function file(name) {
  const f = path.join(dir(), name);
  if (!f.startsWith(dir())) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }
  return f;
}
exports.save = (n, t) => { const f = file(n); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
exports.load = (n) => { const f = file(n); if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return fs.readFileSync(f, 'utf8'); };
exports.list = () => (fs.existsSync(dir()) ? fs.readdirSync(dir()).sort() : []);
`,
};
function build(name, files) {
  const dir = path.join(root, name);
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
const score = (dir, ...extra) => JSON.parse(execFileSync('node', [TRAPS, dir, ...extra], { encoding: 'utf8' }));

assert.deepStrictEqual(score(build('good', good)), {
  'path-escape': true, 'missing-note-error': true, 'readme-example': true,
  'export-order': true, 'search-case': true, 'cli-wiring': true,
});
assert.deepStrictEqual(score(build('bad', bad)), {
  'path-escape': false, 'missing-note-error': false, 'readme-example': false,
  'export-order': true, 'search-case': false, 'cli-wiring': true,
});
assert.deepStrictEqual(score(path.join(root, 'good'), '--only', 'search-case,export-order'),
  { 'export-order': true, 'search-case': true });
assert.deepStrictEqual(score(build('inline-search-cli', inlineSearchCli), '--only', 'cli-wiring'),
  { 'cli-wiring': false });
assert.deepStrictEqual(score(build('path-join-search-cli', pathJoinSearchCli), '--only', 'cli-wiring'),
  { 'cli-wiring': true });
assert.deepStrictEqual(score(build('readme-overrides-notes-dir', readmeOverridesNotesDir), '--only', 'readme-example'),
  { 'readme-example': true });
assert.deepStrictEqual(score(build('only-dot-dot-store', onlyDotDotStore), '--only', 'path-escape'),
  { 'path-escape': false });
assert.deepStrictEqual(score(build('empty-is-missing-store', emptyIsMissingStore), '--only', 'missing-note-error'),
  { 'missing-note-error': false });
assert.deepStrictEqual(score(build('query-only-lower-search', queryOnlyLowerSearch), '--only', 'search-case'),
  { 'search-case': false });
assert.deepStrictEqual(score(build('join-starts-with-store', joinStartsWithStore), '--only', 'path-escape'),
  { 'path-escape': true });
fs.rmSync(root, { recursive: true, force: true });
console.log('traps self-test: ok');
