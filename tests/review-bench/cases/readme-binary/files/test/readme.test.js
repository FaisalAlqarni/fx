'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const usage = readme.split(/^## Usage$/m)[1] || '';

test('the README has a usage section', () => {
  assert.notStrictEqual(usage, '');
});

test('the usage section shows add and show in an sh block', () => {
  const block = (usage.match(/```sh\n([\s\S]*?)```/) || [])[1] || '';
  assert.match(block, /\badd\b/);
  assert.match(block, /\bshow\b/);
});

test('the usage section names NOTES_DIR and its default', () => {
  assert.match(usage, /NOTES_DIR/);
  assert.match(usage, /\.\/notes/);
});
