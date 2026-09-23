#!/usr/bin/env node
'use strict';
// node tests/review-bench/score.js <findings.md> <match-regex|NONE>
//
// Scores one reviewer findings file from the review bench (task 03b). Prints
// {"caught":bool,"falsePositive":bool,"important":n} and exits 0. Exits 2 when
// the findings file is missing, or carries neither a Critical nor an Important
// heading: a reviewer that did not follow the template is a bench failure, not
// a miss.
const fs = require('fs');

function usage(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

const [findingsPath, matchArg] = process.argv.slice(2);
if (!findingsPath || matchArg === undefined) usage('usage: score.js <findings.md> <match-regex|NONE>');

let text;
try {
  text = fs.readFileSync(findingsPath, 'utf8');
} catch (e) {
  usage(`could not read findings file: ${findingsPath}: ${e.message}`);
}

// A heading is any Markdown "#" line; a named section runs from its heading to
// the next heading of any level, or end of file.
const HEADING_RE = /^#{1,6}\s.*$/;
function section(name) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => HEADING_RE.test(l) && new RegExp(`\\b${name}\\b`, 'i').test(l));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length && !HEADING_RE.test(lines[i]); i++) body.push(lines[i]);
  return body.join('\n');
}

const critical = section('Critical');
const important = section('Important');
if (critical === null && important === null) {
  usage(`no Critical or Important heading in ${findingsPath}: not a template-shaped review`);
}

// A finding starts at a dash, star or numbered item ("1." or "1)"); the lines
// that follow, up to the next item, belong to it.
const ITEM_RE = /^\s*(?:[-*]|\d+[.)])\s+\S/;
function findings(body) {
  const items = [];
  for (const line of (body || '').split(/\r?\n/)) {
    if (ITEM_RE.test(line)) items.push(line);
    else if (items.length && line.trim()) items[items.length - 1] += '\n' + line;
  }
  return items;
}
const combined = [critical || '', important || ''].join('\n');
const match = matchArg === 'NONE' ? null : new RegExp(matchArg, 'i');

const caught = match ? match.test(combined) : false;
// A false positive is a Critical or Important finding that is not the case's
// defect; the finding that catches it does not count.
const falsePositive = [...findings(critical), ...findings(important)].some((f) => !match || !match.test(f));

process.stdout.write(JSON.stringify({ caught, falsePositive, important: findings(important).length }) + '\n');
