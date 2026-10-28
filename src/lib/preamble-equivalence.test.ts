// Pins the preamble renders and describePlans outputs recorded from the
// hand-written JavaScript before the TypeScript port. The expected files live
// in tests/gates/fixtures/plan-state/expected. A deliberate change to
// PREAMBLE.md or to the plan block means regenerating them.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describePlans } from './plan-state';
import { HARNESSES, render } from './preamble';

const FIXTURES = path.join(__dirname, '..', 'tests', 'gates', 'fixtures', 'plan-state');
const RECORD = process.argv.includes('--record');
// The Codex render names the plugin root; fixtures hold <root> instead.
const ROOT = path.resolve(__dirname, '..');
function check(raw: string | null, name: string, label: string): void {
  const got = raw === null ? null : [fs.realpathSync(ROOT), ROOT].reduce((out, r) => out.split(r).join('<root>'), raw);
  const file = path.join(FIXTURES, 'expected', name);
  if (RECORD) fs.writeFileSync(file, got ?? '');
  else assert.strictEqual(got, fs.readFileSync(file, 'utf8'), label);
}

// Work in a scratch copy: git cannot store mode 000, and the committed files stay untouched.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-plan-state-'));
const unreadable = path.join(scratch, 'd', 'docs', 'plans', 'demo', 'state.md');
try {
  fs.cpSync(FIXTURES, scratch, { recursive: true, filter: (src) => path.basename(src) !== 'expected' });

  for (const name of ['a', 'b', 'c']) {
    check(describePlans(path.join(scratch, name)), `plans-${name}.txt`, `describePlans ${name}`);
  }
  if (process.getuid?.() === 0) {
    console.log('preamble-equivalence: skipping fixture d (running as root, mode 000 is still readable)');
  } else {
    fs.chmodSync(unreadable, 0);
    check(describePlans(path.join(scratch, 'd')), 'plans-d.txt', 'describePlans d');
  }

  for (const harness of HARNESSES) {
    for (const subagent of [false, true]) {
      const got = render({ harness, cwd: path.join(scratch, 'a'), subagent });
      check(got, `render-${harness}-${subagent ? 'subagent' : 'session'}.txt`, `render ${harness} subagent=${subagent}`);
    }
  }
} finally {
  try { fs.chmodSync(unreadable, 0o644); } catch { /* not created or already removed */ }
  fs.rmSync(scratch, { recursive: true, force: true });
}
console.log(`preamble-equivalence.test.js: ${RECORD ? 'recorded' : 'ok'}`);
