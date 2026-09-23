#!/usr/bin/env node
'use strict';
// node tests/lane-triggering/verdict.js <expected-lane|none> <stream.json>
//
// PASS/FAIL for a lane-triggering run, from the stream-json a live prompt
// produced. The decision is the FIRST fx lane invoked, never any lane
// anywhere in the run: a run that starts fx-brainstorm and later fires
// fx-tdd is not evidence fx-tdd triggered (the row 04 regression this
// closes, docs/plans/2026-09-21-multi-harness/state.md, task 24).
//
// An fx lane is a Skill tool_use whose input.skill, with any leading
// "plugin:" prefix stripped, names a directory under skills/. A non-fx
// skill (superpowers:brainstorming) is not one, so it is skipped over
// rather than counted as "a lane fired".
const fs = require('fs');
const path = require('path');

const [, , expected, streamFile] = process.argv;
if (!expected || !streamFile) {
  console.error('usage: verdict.js <expected-lane|none> <stream.json>');
  process.exit(2);
}

const skillsDir = path.join(__dirname, '..', '..', 'skills');
const knownLanes = new Set(fs.readdirSync(skillsDir));

const lines = fs.readFileSync(streamFile, 'utf8').split('\n').filter(Boolean);
let firstLane = null;
for (const line of lines) {
  let event;
  try { event = JSON.parse(line); } catch { continue; }
  const content = event && event.message && event.message.content;
  if (!Array.isArray(content)) continue;
  for (const block of content) {
    if (block.type !== 'tool_use' || block.name !== 'Skill') continue;
    const raw = block.input && block.input.skill;
    if (!raw) continue;
    const name = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
    if (!knownLanes.has(name)) continue;
    firstLane = name;
    break;
  }
  if (firstLane) break;
}

if (expected === 'none') {
  if (firstLane) {
    console.log(`FAIL a lane was invoked: ${firstLane}`);
    process.exit(1);
  }
  console.log('PASS');
  process.exit(0);
}

if (!firstLane) {
  console.log('FAIL no lane invoked');
  process.exit(1);
}
if (firstLane !== expected) {
  console.log(`FAIL first lane was ${firstLane}`);
  process.exit(1);
}
console.log('PASS');
process.exit(0);
