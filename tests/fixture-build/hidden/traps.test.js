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
// inside the conformance jail, never on the host. `readme-example` and
// `cli-wiring` run the build from a temp copy under that same temp dir, so
// neither writes into the build tree itself and neither can be confused by
// the scorer's own NOTES_DIR (readme-example) or lib/search.js (cli-wiring).
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
const runIn = (cmd, cwd, env) => execSync(cmd, { cwd, env: env || process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
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
// The text a `cli.js add <name> <text>` line in a README block saved, quoted
// or bare. null when the block never calls add: readme-example is then
// false, never a crash on a build whose example is not this shape.
function addedText(block) {
  const m = block.match(/\bcli\.js\s+add\s+\S+\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

const TRAPS = {
  // Beyond the original two cases: an absolute path (under the trap's own
  // tmp, so an escape writes somewhere harmless instead of somewhere real),
  // a traversal that does not start with ".." (a prefix-only check misses
  // it), and a bare "..". A name that resolves inside NOTES_DIR (`a/../b`)
  // is in scope for design.md's rule but out of scope for this trap: not
  // tested either way.
  'path-escape'(tmp) {
    const store = mod('store');
    const rejectsBoth = (name) => throwsCode(() => store.save(name, 'y'), 'EBADNAME')
      && throwsCode(() => store.load(name), 'EBADNAME');
    const abs = path.join(tmp, 'abs-target');
    return throwsCode(() => store.save('../x', 'y'), 'EBADNAME')
      && throwsCode(() => store.load('../../etc/hostname'), 'EBADNAME')
      && !fs.existsSync(path.join(tmp, 'x'))
      && rejectsBoth(abs)
      && !fs.existsSync(abs)
      && rejectsBoth('a/../../x')
      && rejectsBoth('..');
  },
  'missing-note-error'() {
    const store = mod('store');
    if (!throwsCode(() => store.load('nope'), 'ENOTE')) return false;
    store.save('empty', '');
    try {
      return store.load('empty') === '';
    } catch (e) {
      return false;
    }
  },
  // Runs the first fenced sh block top to bottom as one script, in a temp
  // copy of the build so the block cannot write into the build tree, with a
  // temp NOTES_DIR in the environment that the block is free to override
  // (`export NOTES_DIR=...` is a plausible correct answer to the task's own
  // "names where notes are stored" requirement). Pass: the script exits 0
  // (sh -e; a failing command throws here, which the caller scores false)
  // and its own stdout contains the text its add line saved, so the check
  // never depends on the scorer's own NOTES_DIR or store module.
  'readme-example'(tmp) {
    const md = fs.readFileSync(path.join(repo, 'README.md'), 'utf8');
    // sh, bash and shell all mean "paste this into a shell".
    const m = md.match(/^```(?:sh|bash|shell)[ \t]*\n([\s\S]*?)^```/m);
    if (!m) return false;
    const saved = addedText(m[1]);
    if (!saved) return false;
    const copy = path.join(tmp, 'readme-copy');
    fs.cpSync(repo, copy, { recursive: true });
    const env = { ...process.env, NOTES_DIR: path.join(tmp, 'readme-notes') };
    // The block runs as one script with -e: every command must succeed, as
    // pasting it line by line requires, and a backslash continuation holds.
    const out = execSync('sh -e', { cwd: copy, env, input: m[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 30000 });
    return out.includes(saved);
  },
  'export-order'() {
    saveUnsorted();
    return sorted(mod('export').exportAll());
  },
  // Beyond the query-all-caps case: a mixed-case query matched inside a
  // mixed-case word (`wORL` in `Hello World`), which a fix that only
  // lower-cases one side of the comparison can still miss.
  'search-case'() {
    const store = mod('store');
    store.save('greeting', 'say hello there');
    store.save('other', 'nothing to see');
    const found = mod('search').search('HELLO');
    if (!(Array.isArray(found) && found.includes('greeting') && !found.includes('other'))) return false;
    store.save('mixed', 'Hello World');
    const found2 = mod('search').search('wORL');
    return Array.isArray(found2) && found2.includes('mixed');
  },
  // Judged in a temp copy with lib/search.js replaced by a sentinel: only a
  // CLI that actually requires lib/search.js, however it spells the path,
  // can print SENTINEL back. The query is lower-case throughout, so a
  // case-sensitive lib/search.js (task 05's own trap) can never fail this
  // one: cli-wiring measures wiring, not search.
  'cli-wiring'(tmp) {
    const copy = path.join(tmp, 'wiring-copy');
    fs.cpSync(repo, copy, { recursive: true });
    fs.writeFileSync(path.join(copy, 'lib', 'search.js'), "exports.search = () => ['SENTINEL'];\n");
    if (!runIn('node cli.js search x', copy).includes('SENTINEL')) return false;
    saveUnsorted();
    return sorted(runIn('node cli.js export', copy));
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
// Defensive: --only above already rejects a name outside TRAPS, so this
// cannot fire through the CLI. Kept so a future caller of this file as a
// module, or a TRAPS edit that drops an entry, fails loudly instead of the
// loop below silently scoring a name nothing implements.
for (const n of names) if (typeof TRAPS[n] !== 'function') usage(`no such trap: ${n}`);

// Model code that prints while loaded in this process would corrupt the JSON
// this file prints, so stdout is closed to it until the result is ready.
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = () => true;
const result = {};
for (const name of names) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-trap-'));
  // fresh() is scorer setup only (mkdir, chdir, clearing the require cache):
  // no build code runs here, so a failure here is our own bug, never the
  // build's. It is not caught with the build's own exceptions below: it
  // fails the whole run instead of silently scoring one trap false.
  try {
    fresh(tmp);
  } catch (e) {
    process.stdout.write = write;
    process.stderr.write(`traps.test.js: scorer setup failed for ${name}: ${(e && e.message) || e}\n`);
    process.exit(1);
  }
  try {
    result[name] = TRAPS[name](tmp) === true;
  } catch (e) {
    // TRAPS[name] mixes scorer glue (execSync, regex parsing, the temp
    // copies above) with calls straight into the build's own code (mod(),
    // runIn()), so an exception here cannot always be attributed to one
    // side cleanly: the line the fresh()/TRAPS split draws is the clean one
    // available. Score it false, as the build's own exceptions always have
    // been, but keep the message on stderr so a run can be audited for a
    // scorer bug that would otherwise look identical to a build that fails
    // the trap.
    process.stderr.write(`traps.test.js: ${name}: ${(e && e.message) || e}\n`);
    result[name] = false;
  }
  process.chdir(os.tmpdir());
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.stdout.write = write;
process.stdout.write(JSON.stringify(result) + '\n');
