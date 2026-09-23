'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
const store = require('../lib/store');

test('list is empty before the first save', () => {
  assert.deepStrictEqual(store.list(), []);
});

test('a saved note loads back', () => {
  store.save('groceries', 'milk and eggs');
  assert.strictEqual(store.load('groceries'), 'milk and eggs');
});

test('list returns every name, sorted', () => {
  store.save('zebra', 'z');
  store.save('apple', 'a');
  assert.deepStrictEqual(store.list(), ['apple', 'groceries', 'zebra']);
});
