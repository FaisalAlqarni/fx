// The local decision log: one JSON line per logged decision in
// <state dir>/decisions.jsonl. It never leaves the machine and never changes
// a decision: a failure is one stderr line, never a throw. Every string field
// is redacted before it is written.
import * as fs from 'fs';
import * as path from 'path';
import { machinePaths } from './fx-paths.js';
import { LOG_ROTATE_BYTES } from './thresholds.js';
import { CAP_COMMAND, redact } from './redact.js';
import type { Harness } from './types.js';

export interface DecisionLogEntry {
  ts: string;
  harness: Harness;
  event: 'guard' | 'stop' | 'nudge' | 'queue' | 'health' | 'edit-rule';
  session: string | null;
  cwd: string;
  text: string;
  source: string;
  action: string;
  unavailable?: string;
}

const LOCK_STALE_MS = 10000;

// Two hooks can both see a full log; without the lock the second would move the
// first one's fresh log over the older generation (final review, lens minor 3).
// A hook that finds the lock taken appends to the current log and moves on.
function rotate(dir: string, file: string): void {
  const lock = path.join(dir, 'decisions.rotate.lock');
  try {
    fs.closeSync(fs.openSync(lock, 'wx', 0o600));
  } catch {
    // A lock a crashed hook left behind is cleared once, and taken by whoever gets it next.
    let age = 0;
    try { age = Date.now() - fs.statSync(lock).mtimeMs; } catch { return; }
    if (age <= LOCK_STALE_MS) return;
    fs.rmSync(lock, { force: true });
    try { fs.closeSync(fs.openSync(lock, 'wx', 0o600)); } catch { return; }
  }
  try {
    // Checked again under the lock: the hook that held it last may have rotated already.
    if (fs.statSync(file).size > LOG_ROTATE_BYTES) fs.renameSync(file, path.join(dir, 'decisions.1.jsonl'));
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

export function logDecision(entry: DecisionLogEntry, stateDir?: string): void {
  try {
    const dir = stateDir ?? machinePaths().stateDir;
    const file = path.join(dir, 'decisions.jsonl');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // mode on mkdir and open applies only to a new path; tighten an existing one too.
    const posix = process.platform !== 'win32';
    if (posix) fs.chmodSync(dir, 0o700);
    let size = 0;
    try { size = fs.statSync(file).size; } catch { /* no log yet */ }
    if (size > LOG_ROTATE_BYTES) rotate(dir, file);
    // cwd is a path: named secrets go, but a long run of path characters stays.
    const redacted = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, typeof v === 'string' ? redact(v, CAP_COMMAND, k !== 'cwd') : v]));
    const fd = fs.openSync(file, 'a', 0o600);
    try {
      if (posix) fs.fchmodSync(fd, 0o600);
      fs.writeSync(fd, `${JSON.stringify(redacted)}\n`);
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    process.stderr.write(`[fx] decision log: ${e instanceof Error ? e.message : String(e)}\n`);
  }
}
