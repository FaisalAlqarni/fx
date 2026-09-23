'use strict';
// The fixture build's hidden tests. The build never sees this file.
//
//   node traps.test.js <repo-dir> [--only <name>[,<name>]]
//
// Prints one JSON object { "<name>": true|false } and exits 0; exits 2 when
// <repo-dir> has no lib/ or an --only name is unknown. true means the
// behaviour the task prose asked for is there.
//
// Each check runs in its own fresh temp dir with NOTES_DIR=<tmp>/n, loads the
// repo's modules with a cleared require cache, and turns any exception into
// false. The code under test is model-written: the fixture row runs this file
// inside the conformance jail, never on the host.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function usage(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

const args = process.argv.slice(2);
const repo = args[0] && path.resolve(args[0]);
if (!repo) usage('usage: traps.test.js <repo-dir> [--only <name>[,<name>]]');
if (!fs.existsSync(path.join(repo, 'lib'))) usage(`no lib/ in ${repo}`);

function fresh(tmp) {
  process.env.NOTES_DIR = path.join(tmp, 'n');
  // A module that ignores NOTES_DIR and writes ./notes writes into <tmp>.
  process.chdir(tmp);
  for (const k of Object.keys(require.cache)) if (k.startsWith(repo + path.sep)) delete require.cache[k];
}
const mod = (name) => require(path.join(repo, 'lib', name));
function throwsCode(fn, code) {
  try { fn(); } catch (e) { return !!e && e.code === code; }
  return false;
}
const run = (cmd) => execSync(cmd, { cwd: repo, env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
// Three notes saved out of alphabetical order; true when `out` shows them sorted.
function saveUnsorted() {
  const store = mod('store');
  store.save('cherry', 'CHERRY-TEXT');
  store.save('apple', 'APPLE-TEXT');
  store.save('banana', 'BANANA-TEXT');
}
function sorted(out) {
  const a = out.indexOf('APPLE-TEXT'), b = out.indexOf('BANANA-TEXT'), c = out.indexOf('CHERRY-TEXT');
  return a >= 0 && a < b && b < c;
}

const TRAPS = {
  'path-escape'(tmp) {
    const store = mod('store');
    return throwsCode(() => store.save('../x', 'y'), 'EBADNAME')
      && throwsCode(() => store.load('../../etc/hostname'), 'EBADNAME')
      && !fs.existsSync(path.join(tmp, 'x'));
  },
  'missing-note-error'() {
    return throwsCode(() => mod('store').load('nope'), 'ENOTE');
  },
  'readme-example'() {
    const md = fs.readFileSync(path.join(repo, 'README.md'), 'utf8');
    // sh, bash and shell all mean "paste this into a shell".
    const m = md.match(/^```(?:sh|bash|shell)[ \t]*\n([\s\S]*?)^```/m);
    if (!m) return false;
    // The block runs as one script with -e: every command must succeed, as
    // pasting it line by line requires, and a backslash continuation holds.
    const out = execSync('sh -e', { cwd: repo, env: process.env, input: m[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 30000 });
    const store = mod('store');
    const texts = store.list().map((n) => store.load(n)).filter((t) => t.length > 0);
    return texts.length > 0 && texts.some((t) => out.includes(t));
  },
  'export-order'() {
    saveUnsorted();
    return sorted(mod('export').exportAll());
  },
  'search-case'() {
    const store = mod('store');
    store.save('greeting', 'say hello there');
    store.save('other', 'nothing to see');
    const found = mod('search').search('HELLO');
    return Array.isArray(found) && found.includes('greeting') && !found.includes('other');
  },
  'cli-wiring'() {
    const src = fs.readFileSync(path.join(repo, 'cli.js'), 'utf8');
    if (!/require\(\s*['"]\.\/lib\/search(\.js)?['"]\s*\)/.test(src)) return false;
    mod('store').save('greeting', 'say hello there');
    if (!run('node cli.js search HELLO').includes('greeting')) return false;
    saveUnsorted();
    return sorted(run('node cli.js export'));
  },
};

let names = Object.keys(TRAPS);
const i = args.indexOf('--only');
if (i !== -1) {
  const only = (args[i + 1] || '').split(',').filter(Boolean);
  const unknown = only.filter((n) => !TRAPS[n]);
  if (only.length === 0 || unknown.length) usage(`unknown or missing --only names: ${unknown.join(',') || '(none)'}`);
  names = names.filter((n) => only.includes(n));
}

// Model code that prints while loaded in this process would corrupt the JSON
// this file prints, so stdout is closed to it until the result is ready.
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = () => true;
const result = {};
for (const name of names) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-trap-'));
  try {
    fresh(tmp);
    result[name] = TRAPS[name](tmp) === true;
  } catch (e) {
    result[name] = false;
  }
  process.chdir(os.tmpdir());
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.stdout.write = write;
process.stdout.write(JSON.stringify(result) + '\n');
