'use strict';
// The lane-check predicate, extracted so a single PreToolUse dispatcher can
// call it. See hooks/fx-pretooluse.js for why there is only one hook.
//
// Returns null to allow, or a string reason to block.

const fs = require('fs');
const path = require('path');

// EXCLUDE what is known not to be source, rather than enumerating languages.
// An allowlist of extensions is a promise to maintain it forever, and it fails
// closed against every language nobody thought of: Go, Elixir, Clojure, Zig,
// and whatever the next repo is written in. Same defect class as the earlier
// directory-prefix check, which a flat-layout project defeated silently.
// DEBT #34.
const NOT_CODE_EXT = new Set([
  // prose and data
  '.md', '.mdx', '.txt', '.rst', '.adoc', '.csv', '.tsv', '.log',
  // config and manifests
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.lock',
  '.xml', '.csproj', '.fsproj', '.vbproj', '.sln', '.props', '.targets', '.plist',
  // markup and styling: real work, but not the implementation this gate is about
  '.html', '.htm', '.erb', '.haml', '.slim', '.jinja', '.j2', '.mustache', '.hbs',
  '.css', '.scss', '.sass', '.less', '.styl',
  // binary and assets
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.pdf',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp3', '.mp4', '.zip', '.gz',
]);
const SOURCE_DIRS = ['app/', 'src/', 'lib/', 'internal/', 'pkg/', 'cmd/'];
const NOT_SOURCE = /^(config|db\/migrate|bin|script|vendor|node_modules|\.)/;
const CONFIGISH = /^(Gemfile|Rakefile|Makefile|Dockerfile|config\.ru|.*\.config\.[jt]s|.*rc)$/;
// Test conventions across ecosystems: xUnit `FooTests`, Go `foo_test`,
// RSpec `foo_spec`, pytest `test_foo`, Jest `foo.test`.
const TEST_DIRS = ['test/', 'tests/', 'Tests/', 'spec/', 'specs/', '__tests__/', 'features/'];
const TEST_NAME = /(^test_|_test|_spec|\.test|\.spec|Tests?)\.[^.]+$/;

function laneCheck(file, cwd) {
  if (!file) return null;
  const rel = path.relative(cwd, file);
  if (rel.startsWith('..')) return null;              // outside the project

  const stateDir = path.join(cwd, '.fx');
  const mark = (n) => path.join(stateDir, `.lane-${n}`);
  const fired = (n) => fs.existsSync(mark(n));
  const record = (n) => {
    try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(mark(n), ''); } catch { /* best effort */ }
  };

  const ext = path.extname(rel);
  const isCode = ext !== ''                       // Makefile, Dockerfile, LICENSE
    && !NOT_CODE_EXT.has(ext.toLowerCase())
    && !CONFIGISH.test(path.basename(rel))
    && !NOT_SOURCE.test(rel);
  const inTest = TEST_DIRS.some((d) => rel.startsWith(d))
    || rel.split('/').some((seg) => TEST_DIRS.includes(`${seg}/`))
    || TEST_NAME.test(path.basename(rel));

  // 1. Source written with no design anywhere.
  if (isCode && !inTest && !fired('design')) {
    let hasDesign = false;
    try {
      const plans = path.join(cwd, 'docs', 'plans');
      hasDesign = fs.readdirSync(plans).some((d) => fs.existsSync(path.join(plans, d, 'design.md')));
    } catch { hasDesign = false; }
    record('design');
    if (!hasDesign) {
      return `about to write ${rel}, and this repo has no docs/plans/*/design.md.\n\n`
        + `The routing table is read once, before your first action. This is the second `
        + `time of asking, at the moment it actually matters.\n\n`
        + `If the work is architectural, a new project or subsystem or an interface others `
        + `depend on, fx-brainstorm owns it and its output is a design doc plus a plan.\n\n`
        + `If it is genuinely bounded, or you are deliberately skipping the ceremony, say so `
        + `in one line and write the file. This fires once. An unannounced skip is a decision `
        + `made in secret.`;
    }
  }

  // 2. Test written after the implementation it covers.
  if (inTest && !fired('tdd')) {
    // foo_test.go / FooTests.cs / foo.spec.ts / test_foo.py all reduce to "foo".
    const stem = path.basename(rel, path.extname(rel))
      .replace(/^test_/, '')
      .replace(/(_test|_spec|\.test|\.spec|Tests?)$/, '');
    let impl = null;
    const roots = SOURCE_DIRS.map((d) => path.join(cwd, d)).filter(fs.existsSync);
    roots.push(cwd);
    for (const dir of roots) {
      const stack = [dir];
      while (stack.length && !impl) {
        const cur = stack.pop();
        let entries = [];
        try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
          const p = path.join(cur, e.name);
          if (e.isDirectory()) {
            if (!/^(\.|node_modules|vendor|tmp|log|test|spec)$/.test(e.name)) stack.push(p);
            continue;
          }
          if (e.name.replace(/\.[^.]+$/, '') === stem) { impl = path.relative(cwd, p); break; }
        }
      }
      if (impl) break;
    }
    record('tdd');
    if (impl) {
      return `about to write the test ${rel}, and ${impl} already exists.\n\n`
        + `That is the inversion: implementation first, test after. A test written against `
        + `code that already works routinely restates whatever the code does, and passes `
        + `whether or not the logic is right.\n\n`
        + `fx-tdd owns this: Iron Law, verified RED, then GREEN. If you are backfilling `
        + `coverage on purpose that is legitimate, but prove each test fails against the `
        + `unfixed code before trusting it. This fires once.`;
    }
  }

  return null;
}

module.exports = { laneCheck };
