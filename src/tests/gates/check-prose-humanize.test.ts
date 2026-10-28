// Run: node tests/gates/check-prose-humanize.test.js
// scripts/check-prose as the humanize gate (docs/plans/2026-10-29-humanize-gate/design.md):
// it flags each mechanical pattern in Markdown and in each comment syntax, reads
// no code outside a comment and no fenced code block, exits 0 on a clean file,
// and with --diff reports only the lines added since a ref. The second half pins
// the skill text that wires the gate and the humanize pass.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync, execFileSync } from 'child_process';

const root = path.join(__dirname, '..', '..');
// Built from char codes: scripts/check-ts-escapes fails on a dash written in a source file.
const EM = String.fromCharCode(0x2014), EN = String.fromCharCode(0x2013);
const script = path.join(root, 'scripts', 'check-prose');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-prose-humanize-'));
const run = (args: string[], cwd = root) => {
  const r = spawnSync('python3', ['-I', script, ...args], { cwd, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
};
const write = (name: string, text: string) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text);
  return p;
};
// One hit is `<file>:<line>: <pattern>: <excerpt>`.
const hit = (out: string, file: string, line: number, pattern: string) =>
  out.split('\n').some((l) => l.includes(`${file}:${line}: ${pattern}`));

try {
  // Markdown: each pattern on its own line; fenced code is not read.
  const md = write('note.md', [
    'A plain sentence.',                      // 1
    `A dash ${EM} here and ${EN} there.`,   // 2
    'We delve into the tapestry.',            // 3
    'It is not a bug, but a feature.',        // 4
    "It's not a cache, it's a log.",          // 5
    "Here's the thing: it works.",            // 6
    'This is setting the stage for later.',   // 7
    'I hope this helps.',                     // 8
    '```js',                                  // 9
    `const s = "delve ${EM} tapestry"; // I hope this helps`, // 10
    '```',                                    // 11
    '',
  ].join('\n'));
  const m = run([md]);
  assert.strictEqual(m.status, 1, `a Markdown file with hits exits 1:\n${m.out}`);
  for (const [line, pattern] of [[2, 'dash'], [3, 'stock word'], [4, 'not X but Y'], [5, 'not X but Y'],
    [6, 'filler opener'], [7, 'inflated phrase'], [8, 'chatbot artifact']] as const) {
    assert.ok(hit(m.out, md, line, pattern), `Markdown line ${line} flagged as ${pattern}:\n${m.out}`);
  }
  assert.ok(m.out.includes('We delve into the tapestry.'), `a hit quotes its excerpt:\n${m.out}`);
  assert.ok(!m.out.includes(`${md}:1:`), `a clean line is not flagged:\n${m.out}`);
  assert.ok(!m.out.includes(`${md}:10:`), `a fenced code block is not read:\n${m.out}`);

  // Each comment syntax is read; code outside a comment is not.
  const code: [string, string, number][] = [
    ['a.js', 'const s = "delve";\nfetch("https://x.example/delve");\n// we delve here\n', 3],
    ['b.ts', 'let a = 1;\n/* first line\n   and we delve here */\nlet b = 2;\n', 3],
    ['c.cs', 'var s = "I hope this helps";\n// I hope this helps\n', 2],
    ['d.css', '.delve { color: red; }\n/* a tapestry of rules */\n', 2],
    ['e.rb', 'color = "#delve"\nx = 1 # we delve here\n', 2],
    ['f.py', 'x = "delve"\ndef f():\n    """Docstring.\n\n    We delve here.\n    """\n', 5],
    ['g.sh', 'echo delve\n# we delve here\n', 2],
    ['h.yml', 'key: delve\n# we delve here\n', 2],
    ['i.html', '<p>delve</p>\n<!-- a note\n     on the tapestry -->\n', 3],
    ['j.erb', '<%= delve %>\n<!-- I hope this helps -->\n', 2],
  ];
  for (const [name, text, line] of code) {
    const p = write(name, text);
    const r = run([p]);
    assert.strictEqual(r.status, 1, `${name}: a comment hit exits 1:\n${r.out}`);
    assert.ok(r.out.includes(`${p}:${line}: `), `${name}: line ${line} flagged:\n${r.out}`);
    const lines = r.out.split('\n').filter((l) => l.startsWith(`${p}:`));
    assert.ok(lines.every((l) => l.startsWith(`${p}:${line}: `)), `${name}: only the comment is flagged:\n${r.out}`);
  }

  // Code with prose-looking strings and no comment hit exits 0.
  const clean = write('clean.js', `const s = "delve ${EM} I hope this helps";\n// Adds two numbers.\n`);
  const c = run([clean]);
  assert.strictEqual(c.status, 0, `a clean file exits 0:\n${c.out}`);
  const cleanMd = write('clean.md', '# Title\n\nA plain sentence.\n');
  assert.strictEqual(run([cleanMd]).status, 0, 'a clean Markdown file exits 0');

  // --diff <ref>: only lines added since ref, untracked files included.
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(repo);
  const g = (...a: string[]) => execFileSync('git', ['-c', 'user.name=fx', '-c', 'user.email=fx@example.invalid', ...a], { cwd: repo });
  g('init', '-q');
  fs.writeFileSync(path.join(repo, 'old.md'), 'An old line with a tapestry.\n');
  g('add', '.');
  g('commit', '-qm', 'base');
  fs.writeFileSync(path.join(repo, 'old.md'), 'An old line with a tapestry.\nA new line we delve into.\n');
  fs.writeFileSync(path.join(repo, 'new.py'), 'x = 1  # I hope this helps\n');
  const d = run(['--diff', 'HEAD'], repo);
  assert.strictEqual(d.status, 1, `--diff with added hits exits 1:\n${d.out}`);
  assert.ok(d.out.includes('old.md:2: stock word'), `--diff flags the added line:\n${d.out}`);
  assert.ok(!d.out.includes('old.md:1:'), `--diff skips the line that was already there:\n${d.out}`);
  assert.ok(d.out.includes('new.py:1: chatbot artifact'), `--diff reads an untracked file:\n${d.out}`);
  g('add', '.');
  g('commit', '-qm', 'next');
  assert.strictEqual(run(['--diff', 'HEAD'], repo).status, 0, '--diff with nothing added exits 0');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

// The skill text that wires the gate and the passes.
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const finalReview = read('skills/fx-implement/references/final-review.md');
assert.ok(finalReview.includes('## Humanize pass'), 'final review has a Humanize pass section');
assert.ok(finalReview.includes('`docs: humanize pass`') && finalReview.includes('fx-humanize'),
  'final review names the single humanize pass commit and fx-humanize');
assert.ok(read('skills/fx-implement/references/completion.md').includes('humanize pass'),
  'completion names the humanize pass');
assert.ok(read('skills/fx-implement/implementer-prompt.md').includes('check-prose --diff HEAD'),
  'the implementer runs the prose gate on its task before committing');
assert.ok(read('skills/fx-implement/references/exit-gate.md').includes('check-prose --diff <MERGE_BASE>'),
  'the exit gate runs the prose gate on the branch');
for (const f of ['skills/fx-docs/SKILL.md', 'skills/fx-adr/SKILL.md']) {
  assert.ok(read(f).toLowerCase().includes('invoke the fx-humanize lane'), `${f} invokes the fx-humanize lane before committing`);
}

console.log('check-prose humanize gate: all passed');
