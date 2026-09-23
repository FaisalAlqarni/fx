#!/usr/bin/env node
'use strict';
// Extracts the `prompt: |` body from an fx-implement dispatch template
// (skills/fx-implement/task-reviewer-prompt.md's fenced markdown block) and
// fills its [KEY] placeholders, so the review bench measures the template as
// it stands in the working tree, not a copy.
//
//   node fill-template.js <template.md>
//
// Placeholder values come from environment variables named exactly like the
// placeholder (TASK_FILE, GLOBAL_CONSTRAINTS, ...); an unset one is left
// untouched. Also usable as a module: extractPromptBody, fillPlaceholders.
const fs = require('fs');

const PROMPT_MARKER_RE = /^\s*prompt:\s*\|\s*$/;
const FENCE_RE = /^```\s*$/;
const BODY_INDENT = '    ';

function extractPromptBody(templateText) {
  const lines = templateText.split('\n');
  const start = lines.findIndex((l) => PROMPT_MARKER_RE.test(l));
  if (start === -1) throw new Error('no "prompt: |" line found in template');
  const body = [];
  for (let i = start + 1; i < lines.length && !FENCE_RE.test(lines[i]); i++) {
    const l = lines[i];
    body.push(l.startsWith(BODY_INDENT) ? l.slice(BODY_INDENT.length) : l);
  }
  return body.join('\n');
}

function fillPlaceholders(body, values) {
  let out = body;
  for (const [k, v] of Object.entries(values)) out = out.split(`[${k}]`).join(v);
  return out;
}

module.exports = { extractPromptBody, fillPlaceholders };

if (require.main === module) {
  const templatePath = process.argv[2];
  if (!templatePath) {
    process.stderr.write('usage: fill-template.js <template.md>\n');
    process.exit(2);
  }
  const KEYS = ['TASK_FILE', 'GLOBAL_CONSTRAINTS', 'LEDGER_FILE', 'REPORT_FILE', 'BASE_SHA', 'HEAD_SHA', 'DIFF_FILE', 'FINDINGS_FILE'];
  const values = {};
  for (const k of KEYS) if (process.env[k] !== undefined) values[k] = process.env[k];
  const body = extractPromptBody(fs.readFileSync(templatePath, 'utf8'));
  process.stdout.write(fillPlaceholders(body, values));
}
