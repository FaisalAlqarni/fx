'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.NOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
const store = require('../lib/store');
const { search } = require('../lib/search');

store.save('groceries', 'milk and eggs');
store.save('todo', 'call the plumber');
store.save('recipes', 'pancakes need milk');

test('search returns every note whose text contains the query', () => {
  assert.deepStrictEqual(search('milk'), ['groceries', 'recipes']);
});

test('search returns only the matching notes', () => {
  assert.deepStrictEqual(search('plumber'), ['todo']);
});

test('a query that matches nothing returns an empty list', () => {
  assert.deepStrictEqual(search('bicycle'), []);
});
