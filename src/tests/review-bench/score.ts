#!/usr/bin/env node
// node tests/review-bench/score.js <findings.md> <match-regex|NONE>
//
// Scores one reviewer findings file from the review bench (task 03b). Prints
// {"caught":bool,"falsePositive":bool,"important":n} and exits 0. Exits 2 when
// the findings file is missing. An Issues heading with no Critical or Important
// section is a review that found nothing at those levels. A reply with none of
// the three headings ignored the template (Haiku 4.5 does, now and then): it is
// scored against its whole text, with no false positive, and marked
// offTemplate so the bench reports how often that happened.
import * as fs from 'fs';

function usage(msg: string): never {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

const [findingsPath, matchArg] = process.argv.slice(2);
if (!findingsPath || matchArg === undefined) usage('usage: score.js <findings.md> <match-regex|NONE>');

let text: string;
try {
  text = fs.readFileSync(findingsPath, 'utf8');
} catch (e) {
  usage(`could not read findings file: ${findingsPath}: ${e instanceof Error ? e.message : String(e)}`);
}

// A heading is any Markdown "#" line; a named section runs from its heading to
// the next heading of any level, or end of file.
const HEADING_RE = /^#{1,6}\s.*$/;
function section(name: string): string | null {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => HEADING_RE.test(l) && new RegExp(`\\b${name}\\b`, 'i').test(l));
  if (start === -1) return null;
  const body: string[] = [];
  for (let i = start + 1; i < lines.length && !HEADING_RE.test(lines[i] ?? ''); i++) body.push(lines[i] ?? '');
  return body.join('\n');
}

const critical = section('Critical');
const important = section('Important');
const offTemplate = critical === null && important === null && section('Issues') === null;

// A finding starts at a dash, star or numbered item ("1." or "1)"); the lines
// that follow, up to the next item, belong to it.
const ITEM_RE = /^\s*(?:[-*]|\d+[.)])\s+\S/;
function findings(body: string | null): string[] {
  const items: string[] = [];
  for (const line of (body || '').split(/\r?\n/)) {
    if (ITEM_RE.test(line)) items.push(line);
    else if (items.length && line.trim()) items[items.length - 1] += '\n' + line;
  }
  return items;
}
const combined = [critical || '', important || ''].join('\n');
const match = matchArg === 'NONE' ? null : new RegExp(matchArg, 'i');

const caught = match ? match.test(offTemplate ? text : combined) : false;
// A false positive is a Critical or Important finding that is not the case's
// defect; the finding that catches it does not count.
const falsePositive = [...findings(critical), ...findings(important)].some((f) => !match || !match.test(f));

process.stdout.write(JSON.stringify({ caught, falsePositive, important: findings(important).length, ...(offTemplate ? { offTemplate } : {}) }) + '\n');
