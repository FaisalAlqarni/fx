// Run: node lib/edit-rules.test.js
// The pure parts of the edit rules: globs, rule matching, added lines, the
// built-in code checks and what each harness's edit changes.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { BUILTIN_RULES, addedLines, builtinBreach, changedFiles, checkBuiltins, checkEdit, globMatch } from './edit-rules.js';

// Test data that needs a dash is built from a code point.
const EM = '\u2014';

const globs: [string, string, boolean][] = [
  ['**/*.{md,mdx}', 'README.md', true],
  ['**/*.{md,mdx}', 'docs/a/b.mdx', true],
  ['**/*.{md,mdx}', 'src/a.ts', false],
  ['db/migrate/*.rb', 'db/migrate/1_x.rb', true],
  ['db/migrate/*.rb', 'db/migrate/old/1_x.rb', false],
  ['src/**', 'src/a/b.ts', true],
  ['?.ts', 'a.ts', true],
  ['?.ts', 'ab.ts', false],
  ['a.b', 'axb', false],
];
for (const [glob, rel, want] of globs) assert.strictEqual(globMatch(glob, rel), want, `${glob} ${rel}`);
assert.strictEqual(globMatch('{a', '{a'), true, 'an unclosed brace is literal');
assert.strictEqual(globMatch('src/**/x.ts', 'src/x.ts'), true, '**/ spans zero directories');
assert.strictEqual(globMatch('src/**/x.ts', 'src/a/b/x.ts'), true);
assert.strictEqual(globMatch('*/x', 'a/b/x'), false);
// An agent can write .fx.json: no glob may stall the hook (ruling, review I1).
{
  const started = Date.now();
  assert.strictEqual(globMatch(`${'*'.repeat(150)}x`, 'a'.repeat(40)), false);
  assert.strictEqual(globMatch(`${'**/'.repeat(60)}x`, `${'a/'.repeat(40)}b`), false);
  assert.ok(Date.now() - started < 100, `${Date.now() - started} ms`);
}

assert.deepStrictEqual(BUILTIN_RULES.map((r) => r.id), ['no-dashes', 'no-secrets', 'no-conflict-markers']);
assert.deepStrictEqual(BUILTIN_RULES.filter((r) => globMatch(r.glob, 'docs/a.md')).map((r) => r.id), ['no-dashes', 'no-secrets', 'no-conflict-markers']);
assert.deepStrictEqual(BUILTIN_RULES.filter((r) => globMatch(r.glob, 'src/a.ts')).map((r) => r.id), ['no-secrets', 'no-conflict-markers']);

assert.strictEqual(addedLines('a\nb\nc', 'a\nX\nb\nc'), 'X');
assert.strictEqual(addedLines('a\na', 'a\na\na'), 'a');
assert.strictEqual(addedLines('', 'x\ny'), 'x\ny');
assert.strictEqual(addedLines('x\ny', 'y'), '');
assert.strictEqual(addedLines('a\r\nb', 'a\nb\nc'), 'c', 'a CRLF file on disk, LF content');
assert.strictEqual(addedLines('a\nb', 'a\r\nb\r\nc'), 'c', 'and the reverse');
// A line diff, not a count: a new block counts whole even when the same edit
// drops an equal line elsewhere.
assert.strictEqual(addedLines('  alt=""\nk1\nk2', 'k1\nk2\n<img\n  src={logo}\n  alt=""\n/>'), '<img\n  src={logo}\n  alt=""\n/>');
assert.strictEqual(addedLines('a\nb', 'b\na'), 'a', 'a moved line counts as added');

assert.strictEqual(builtinBreach('no-dashes', `a ${EM} b`), true);
assert.strictEqual(builtinBreach('no-dashes', 'a \u2013 b'), true, 'an en dash');
assert.strictEqual(builtinBreach('no-dashes', 'a - b'), false);
assert.strictEqual(builtinBreach('no-dashes', `a fix ${EM} b`, `a typo ${EM} b`), false, 'a dash the replaced line already held');
assert.strictEqual(builtinBreach('no-dashes', `a ${EM} b ${EM}`, `a ${EM} b`), true, 'one more dash than it replaces');
assert.strictEqual(builtinBreach('no-conflict-markers', '<<<<<<< HEAD'), true);
assert.strictEqual(builtinBreach('no-conflict-markers', 'x\n>>>>>>> main'), true);
assert.strictEqual(builtinBreach('no-conflict-markers', 'Title\n======='), false, 'a setext underline');
assert.strictEqual(builtinBreach('no-conflict-markers', '<<<<<<<<'), false, 'eight is not a marker');
assert.strictEqual(builtinBreach('no-secrets', 'export OPENAI_API_KEY=sk-proj-1234567890abcdef'), true);
assert.strictEqual(builtinBreach('no-secrets', 'const x = 1'), false);
assert.strictEqual(builtinBreach('no-secrets', 'the log shows [REDACTED] here'), false, 'a marker already present is not a secret');
// Only a private key block or a vendor-prefixed key refuses; ordinary code the log redactor would mask does not.
const PEM_LINE = (word: string) => `${'-'.repeat(5)}${word} RSA PRIVATE KEY${'-'.repeat(5)}`;
assert.strictEqual(builtinBreach('no-secrets', `${PEM_LINE('BEGIN')}\nMIIEowIBAAKCAQEA\n${PEM_LINE('END')}`), true, 'a PEM private key block');
assert.strictEqual(builtinBreach('no-secrets', `token = "${'ghp'}_${'a1B2'.repeat(9)}"`), true, 'a vendor-prefixed key');
for (const line of [
  '<li key={item.id}>',
  'password: "Password"',
  `Fixed in ${'0123456789abcdef0123456789abcdef01234567'} last week.`,
  'app/controllers/admin/organizations/subscriptions/billing',
  `"integrity": "sha512-${'Zm9vYmFyYmF6'.repeat(7)}=="`,
  "let(:user) { create(:user, password: 'password123') }",
]) assert.strictEqual(builtinBreach('no-secrets', line), false, line);
assert.strictEqual(builtinBreach('fk-index', `a ${EM} b`), false, 'not a built-in');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-edit-rules-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
fs.mkdirSync(path.join(dir, 'docs'));
fs.writeFileSync(path.join(dir, 'docs', 'a.md'), `old ${EM} line\n`);
fs.writeFileSync(path.join(dir, 'a.md'), 'p\nq');

// Write: compared with the file on disk; a missing file is empty.
assert.deepStrictEqual(
  changedFiles('claude-code', 'Write', { file_path: 'docs/a.md', content: `old ${EM} line\nnew clean line\n` }, dir),
  [{ path: path.join(dir, 'docs', 'a.md'), added: 'new clean line', removed: '' }],
);
assert.deepStrictEqual(
  changedFiles('claude-code', 'Write', { file_path: path.join(dir, 'new.md'), content: 'x\n' }, '/elsewhere'),
  [{ path: path.join(dir, 'new.md'), added: 'x', removed: '' }],
  'an absolute path, a new file',
);
// MultiEdit: each edit's added lines, in order.
assert.deepStrictEqual(
  changedFiles('claude-code', 'MultiEdit', { file_path: 'a.md', edits: [{ old_string: 'p', new_string: 'x' }, { old_string: 'q', new_string: 'y' }] }, dir),
  [{ path: path.join(dir, 'a.md'), added: 'x\ny', removed: 'p\nq' }],
);
assert.deepStrictEqual(
  changedFiles('claude-code', 'MultiEdit', { file_path: 'a.md', edits: [{ old_string: 'p', new_string: 'x' }, { old_string: 'z', new_string: 'y' }] }, dir),
  [{ path: path.join(dir, 'a.md'), added: 'x\ny', removed: 'p\nz' }],
);
// Edit: the new string over the old one.
fs.writeFileSync(path.join(dir, 'b.md'), 'a a');
assert.deepStrictEqual(
  changedFiles('claude-code', 'Edit', { file_path: 'b.md', old_string: 'a', new_string: `a\nb ${EM}` }, dir),
  [{ path: path.join(dir, 'b.md'), added: `b ${EM}`, removed: '' }],
);
assert.deepStrictEqual(
  changedFiles('claude-code', 'Edit', { file_path: 'b.md', old_string: 'nope', new_string: 'x' }, dir),
  [{ path: path.join(dir, 'b.md'), added: 'x', removed: 'nope' }],
  'the file does not hold old_string',
);
assert.deepStrictEqual(
  changedFiles('claude-code', 'NotebookEdit', { notebook_path: 'n.ipynb', new_source: 'print(1)' }, dir),
  [{ path: path.join(dir, 'n.ipynb'), added: 'print(1)', removed: '' }],
);
assert.deepStrictEqual(changedFiles('claude-code', 'Read', { file_path: 'a' }, '/w'), []);
assert.deepStrictEqual(changedFiles('claude-code', 'Write', { file_path: 3, content: 'x' }, '/w'), [], 'a non-string path');
assert.deepStrictEqual(changedFiles('claude-code', 'Write', null, '/w'), []);

// Codex: apply_patch, and a shell call that runs one.
const PATCH = `*** Begin Patch\n*** Add File: docs/c.md\n+one ${EM}\n*** End Patch`;
assert.deepStrictEqual(
  changedFiles('codex', 'apply_patch', { command: PATCH }, dir),
  [{ path: path.join(dir, 'docs', 'c.md'), added: `one ${EM}`, removed: '' }],
);
for (const tool of ['Bash', 'exec_command']) {
  assert.deepStrictEqual(
    changedFiles('codex', tool, { command: `apply_patch <<'PATCH'\n${PATCH}\nPATCH` }, dir).map((f) => f.added),
    [`one ${EM}`],
    tool,
  );
}
assert.deepStrictEqual(changedFiles('codex', 'Bash', { command: 'ls' }, dir), []);

// opencode 1.x.
assert.deepStrictEqual(
  changedFiles('opencode', 'write', { filePath: 'a.md', content: 'p\nq\nr' }, dir),
  [{ path: path.join(dir, 'a.md'), added: 'r', removed: '' }],
);
assert.deepStrictEqual(
  changedFiles('opencode', 'edit', { filePath: 'a.md', oldString: 'q', newString: 'q2' }, dir),
  [{ path: path.join(dir, 'a.md'), added: 'q2', removed: 'q' }],
);
assert.deepStrictEqual(changedFiles('opencode', 'apply_patch', { patchText: PATCH }, dir).map((f) => f.path), [path.join(dir, 'docs', 'c.md')]);

// opencode 2.x: the names read from the 2.1.4 binary (references/harnesses/opencode-v2.md "Tool vocabulary").
assert.deepStrictEqual(
  changedFiles('opencode-v2', 'edit', { path: 'a.md', oldString: 'a', newString: 'x' }, '/w'),
  [{ path: path.join('/w', 'a.md'), added: 'x', removed: 'a' }],
);
assert.deepStrictEqual(
  changedFiles('opencode-v2', 'write', { path: 'a.md', content: 'p\nq\nr' }, dir),
  [{ path: path.join(dir, 'a.md'), added: 'r', removed: '' }],
);
assert.deepStrictEqual(changedFiles('opencode-v2', 'patch', { patchText: PATCH }, dir).map((f) => f.path), [path.join(dir, 'docs', 'c.md')]);
// The 1.x names are not the 2.x ones: an unmeasured shape gets no check, never a refusal.
assert.deepStrictEqual(changedFiles('opencode-v2', 'edit', { filePath: 'a.md', oldString: 'a', newString: 'x' }, '/w'), []);
assert.deepStrictEqual(changedFiles('opencode-v2', 'apply_patch', { patchText: PATCH }, dir), []);

// checkBuiltins: the built-in step alone, synchronous, for a runtime that cannot await.
{
  const repo = path.join(dir, 'builtins');
  fs.mkdirSync(repo);
  assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: repo }).status, 0);
  const input = (content: string) => ({ harness: 'opencode' as const, sessionId: 's', cwd: repo, toolName: 'write', toolInput: { filePath: 'docs/a.md', content }, now: Date.now() });
  const refused = checkBuiltins(input(`a ${EM} b\n`));
  assert.ok(!(refused instanceof Promise), 'not a promise');
  assert.deepStrictEqual(refused, { action: 'refuse', reason: '[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)' });
  assert.deepStrictEqual(checkBuiltins(input('clean\n')), { action: 'allow', reason: null });
}

// A repository's own rules in .fx.json are ignored silently: no refusal, no log line (ADR 0049).
async function repoRulesIgnored(): Promise<void> {
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(repo);
  assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: repo }).status, 0);
  fs.writeFileSync(path.join(repo, '.fx.json'), JSON.stringify({ rules: [{ id: 'no-todo', glob: '**/*.rb', rule: 'No TODO comments.' }] }));
  const state = path.join(dir, 'state');
  Object.assign(process.env, { XDG_STATE_HOME: state, LOCALAPPDATA: state });
  const d = await checkEdit({ harness: 'claude-code', sessionId: null, cwd: repo, toolName: 'Write', toolInput: { file_path: 'a.rb', content: '# TODO\n' }, now: Date.now() });
  assert.deepStrictEqual(d, { action: 'allow', reason: null });
  assert.ok(!fs.existsSync(path.join(state, 'fx', 'decisions.jsonl')), 'no log line');
}

repoRulesIgnored().then(() => console.log('edit-rules.test.js: ok'), (e) => { console.error(e); process.exit(1); });
