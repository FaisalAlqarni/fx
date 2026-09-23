'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env, NOTES_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'notes-')) };
const cli = (...args) => spawnSync('node', [path.join(__dirname, '..', 'cli.js'), ...args], { env, encoding: 'utf8' });

cli('add', 'groceries', 'milk and eggs');
cli('add', 'todo', 'call the plumber');

test('export prints every note', () => {
  const r = cli('export');
  assert.strictEqual(r.status, 0);
  assert.ok(r.stdout.includes('# groceries\n\nmilk and eggs\n'));
  assert.ok(r.stdout.includes('# todo\n\ncall the plumber\n'));
});

test('search prints each matching name on its own line', () => {
  const r = cli('search', 'milk');
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(r.stdout.split('\n').filter(Boolean), ['groceries']);
});

test('search with no match prints nothing', () => {
  const r = cli('search', 'bicycle');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), '');
});

test('show still works', () => {
  assert.strictEqual(cli('show', 'todo').stdout, 'call the plumber\n');
});
