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
  'export-order': true, 'search-case': false, 'cli-wiring': false,
});
assert.deepStrictEqual(score(path.join(root, 'good'), '--only', 'search-case,export-order'),
  { 'export-order': true, 'search-case': true });
fs.rmSync(root, { recursive: true, force: true });
console.log('traps self-test: ok');
