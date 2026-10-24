// Run: node lib/patch-paths.test.js
// The paths a Codex apply_patch payload names; moved unchanged from hooks/fx-codex.
import * as assert from 'assert';
import { extractPatchAdditions, extractPatchPaths } from './patch-paths.js';

const patch = (...lines: string[]) => ['*** Begin Patch', ...lines, '*** End Patch', ''].join('\n');

assert.deepStrictEqual(extractPatchPaths(patch('*** Add File: x.txt', '+hi')), ['x.txt']);
assert.deepStrictEqual(extractPatchPaths(patch('*** Update File: a.js', '@@', '-1', '+2', '*** Delete File: b.js')), ['a.js', 'b.js']);
assert.deepStrictEqual(extractPatchPaths(patch('*** Update File: old.js', '*** Move to: new.js')), ['old.js', 'new.js'], 'a rename names both paths');
assert.deepStrictEqual(extractPatchPaths(`apply_patch <<'PATCH'\n  *** Update File: indented.js\nPATCH`), ['indented.js'], 'an indented heredoc body');
assert.deepStrictEqual(extractPatchPaths('not a patch'), []);
for (const bad of [undefined, null, 7, {}, ['*** Add File: x']]) assert.deepStrictEqual(extractPatchPaths(bad), [], `${JSON.stringify(bad)} yields no paths`);
// The lines each patched file gains, for the edit rules.
assert.deepStrictEqual(
  extractPatchAdditions('*** Begin Patch\n*** Update File: a.md\n@@\n-old\n+new one\n+new two\n*** Add File: b.txt\n+hello\n*** End Patch'),
  [{ path: 'a.md', text: 'new one\nnew two', removed: 'old' }, { path: 'b.txt', text: 'hello', removed: '' }],
);
assert.deepStrictEqual(extractPatchAdditions(patch('*** Update File: old.md', '*** Move to: new.md', '@@', '+x')), [{ path: 'new.md', text: 'x', removed: '' }], 'a rename adds to the new path');
assert.deepStrictEqual(extractPatchAdditions(patch('*** Delete File: gone.md', '+x')), [], 'a deleted file gains nothing');
assert.deepStrictEqual(extractPatchAdditions(42), []);
assert.deepStrictEqual(extractPatchAdditions('not a patch\n+x'), []);
console.log('patch-paths.test.js: ok');
