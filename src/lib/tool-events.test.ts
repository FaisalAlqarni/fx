// Run: node lib/tool-events.test.js
// How a tool call is classified, what its outcome was, and which paths it edited.
import * as assert from 'assert';
import * as path from 'path';
import { classifyTool, editedPaths, toolOutcomeAndOutput } from './tool-events.js';

// classifyTool
assert.strictEqual(classifyTool('claude-code', 'Bash', 'git status'), 'read');
assert.strictEqual(classifyTool('claude-code', 'Bash', 'npm test'), 'shell');
assert.strictEqual(classifyTool('codex', 'apply_patch', null), 'edit');
assert.strictEqual(classifyTool('opencode-v2', 'shell', 'ls'), 'read');
assert.strictEqual(classifyTool('claude-code', 'WebFetch', null), 'other');
for (const t of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']) assert.strictEqual(classifyTool('claude-code', t, null), 'edit', t);
for (const t of ['Read', 'Grep', 'Glob']) assert.strictEqual(classifyTool('claude-code', t, null), 'read', t);
for (const t of ['edit', 'write', 'apply_patch']) assert.strictEqual(classifyTool('opencode', t, null), 'edit', t);
for (const t of ['read', 'grep', 'glob', 'list']) assert.strictEqual(classifyTool('opencode', t, null), 'read', t);
assert.strictEqual(classifyTool('codex', 'exec_command', 'make test'), 'shell');
assert.strictEqual(classifyTool('opencode', 'bash', 'make test'), 'shell');
assert.strictEqual(classifyTool('claude-code', 'Bash', null), 'shell', 'a shell call with no readable command is not read-only');
assert.strictEqual(classifyTool('claude-code', 'apply_patch', null), 'other', 'apply_patch is not a Claude Code tool');

// toolOutcomeAndOutput, Claude Code
let r = toolOutcomeAndOutput('claude-code', 'PostToolUse', { stdout: 'out', stderr: 'err', interrupted: false });
assert.deepStrictEqual(r, { outcome: 'ok', output: 'out\nerr' });
r = toolOutcomeAndOutput('claude-code', 'PostToolUseFailure', 'Exit code 1\nboom');
assert.deepStrictEqual(r, { outcome: 'fail', output: 'Exit code 1\nboom' });
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', 'a plain string').outcome, 'ok');
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', undefined).output, '');
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', { stdout: 'x'.repeat(5000) }).output.length, 4096, 'the last 4 KB');
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', { stdout: `${'a'.repeat(5000)}END` }).output.endsWith('END'), true);

// An interrupted call is neither a pass nor a failure (fix round 1)
assert.deepStrictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', { stdout: 'partial', stderr: '', interrupted: true }), { outcome: 'unknown', output: 'partial', interrupted: true });
assert.deepStrictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUseFailure', 'Interrupted', true), { outcome: 'unknown', output: 'Interrupted', interrupted: true });
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUseFailure', 'Exit code 1', false).outcome, 'fail');
assert.strictEqual(toolOutcomeAndOutput('claude-code', 'PostToolUse', { stdout: 'x', interrupted: false }).outcome, 'ok');

// Codex
r = toolOutcomeAndOutput('codex', 'PostToolUse', 'Exit code: 1\nWall time: 0.2s\nOutput:\nboom');
assert.strictEqual(r.outcome, 'fail');
assert.ok(r.output.includes('boom'));
assert.deepStrictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', { exit_code: 0, output: 'ok' }), { outcome: 'ok', output: 'ok' });
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', { exitCode: 2, stdout: 'a', stderr: 'b' }).outcome, 'fail');
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', 'Exit code: 0\nOutput:\nfine').outcome, 'ok');
assert.deepStrictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', 'no code here'), { outcome: 'unknown', output: 'no code here' });
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', { exit_code: 'x' }).outcome, 'unknown');
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', undefined).outcome, 'unknown');
// exec_command (unified exec) text, as the Codex 0.164.0 binary formats it (references/harnesses/codex.md).
const unified = (status: string) => `Chunk ID: 3f2a\nWall time: 0.0123 seconds\n${status}\nOriginal token count: 2\nOutput:\nboom`;
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', unified('Process exited with code 0')).outcome, 'ok');
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', unified('Process exited with code 1')).outcome, 'fail');
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', unified('Process running with session ID 7')).outcome, 'unknown', 'still running: no exit yet');
const running = 'Chunk ID: 3f2a\nWall time: 10.0000 seconds\nProcess running with session ID 7\nOutput:\nProcess exited with code 0\nExit code: 0';
assert.strictEqual(toolOutcomeAndOutput('codex', 'PostToolUse', running).outcome, 'unknown', 'an exit line in the output is not the header');

// editedPaths
const cwd = path.resolve('/work/repo');
assert.deepStrictEqual(editedPaths('claude-code', 'Edit', { file_path: '/work/repo/a.ts' }, cwd), ['/work/repo/a.ts']);
assert.deepStrictEqual(editedPaths('claude-code', 'NotebookEdit', { notebook_path: 'n.ipynb' }, cwd), [path.join(cwd, 'n.ipynb')]);
assert.deepStrictEqual(editedPaths('codex', 'apply_patch', { command: '*** Begin Patch\n*** Update File: x.js\n*** End Patch' }, cwd), [path.join(cwd, 'x.js')]);
assert.deepStrictEqual(editedPaths('opencode', 'edit', { filePath: 'src/b.ts' }, cwd), [path.join(cwd, 'src/b.ts')]);
// A Codex shell apply_patch edits the paths it names (fix round 1)
const heredoc = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Update File: s.js\n*** Add File: t.js\n*** End Patch\nPATCH";
assert.deepStrictEqual(editedPaths('codex', 'Bash', { command: heredoc }, cwd), [path.join(cwd, 's.js'), path.join(cwd, 't.js')]);
assert.deepStrictEqual(editedPaths('codex', 'exec_command', { command: heredoc }, cwd), [path.join(cwd, 's.js'), path.join(cwd, 't.js')]);
assert.deepStrictEqual(editedPaths('codex', 'Bash', { command: 'echo "*** Update File: s.js"' }, cwd), [], 'quoting a header is not a patch');
assert.deepStrictEqual(editedPaths('codex', 'Bash', { command: 'ls' }, cwd), []);
assert.deepStrictEqual(editedPaths('claude-code', 'Bash', { command: heredoc }, cwd), [], 'only Codex runs a shell apply_patch');
assert.deepStrictEqual(editedPaths('claude-code', 'Edit', {}, cwd), []);
assert.deepStrictEqual(editedPaths('claude-code', 'Edit', null, cwd), []);
assert.deepStrictEqual(editedPaths('claude-code', 'Read', { file_path: '/x' }, cwd), [], 'a read edits nothing');
console.log('tool-events.test.js: ok');
