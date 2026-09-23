#!/usr/bin/env node
'use strict';
// Builds the base tree for one review-bench case: every fixture module file
// except the case's own task file(s), copied from the shared good/
// reference tree. The row commits the result as BASE, then overlays the
// case's files/ (committed as HEAD), so the diff a reviewer reads touches
// only the task's own file(s) (review finding I2).
//
//   node build-case.js <case-dir> <good-dir> <dest-dir>
//
// <dest-dir> must already exist (the row's scratch git working tree, after
// the seed repo is copied in). Prints the owned (excluded-from-base) paths,
// one per line. Exits 2 naming the problem on a bad or missing directory.
const fs = require('fs');
const path = require('path');

const MODULE_FILES = ['lib/store.js', 'lib/export.js', 'lib/search.js', 'cli.js', 'README.md'];

// Every path under <filesDir>, relative, with forward slashes: this is the
// set of files a case's own task touches.
function ownedFiles(filesDir) {
  const out = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), childRel);
      else out.push(childRel);
    }
  })(filesDir, '');
  return out;
}

// Writes destDir's copy of every MODULE_FILE not owned by this case from
// goodDir, and removes any owned one that happens to exist there already (the
// seed ships nothing for these paths, but a caller reusing a dirty destDir
// must not leave a stale copy behind). Returns the owned list.
function buildBase(caseDir, goodDir, destDir) {
  const owned = ownedFiles(path.join(caseDir, 'files'));
  for (const f of MODULE_FILES) {
    const dest = path.join(destDir, f);
    if (owned.includes(f)) {
      fs.rmSync(dest, { force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(goodDir, f), dest);
  }
  return owned;
}

module.exports = { MODULE_FILES, ownedFiles, buildBase };

if (require.main === module) {
  const [caseDir, goodDir, destDir] = process.argv.slice(2);
  if (!caseDir || !goodDir || !destDir) {
    process.stderr.write('usage: build-case.js <case-dir> <good-dir> <dest-dir>\n');
    process.exit(2);
  }
  for (const [name, p] of [['case-dir', caseDir], ['good-dir', goodDir], ['dest-dir', destDir]]) {
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
      process.stderr.write(`build-case.js: ${name} is not a directory: ${p}\n`);
      process.exit(2);
    }
  }
  const owned = buildBase(caseDir, goodDir, destDir);
  process.stdout.write(owned.join('\n') + '\n');
}
