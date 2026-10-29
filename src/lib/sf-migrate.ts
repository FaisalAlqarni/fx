// system-flow migrate: schema version 1 fragments become version 2, all or nothing.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { SCHEMA_FILE, mergeFragments, writeAll } from './sf-model.js';
import type { Fragment, Look, Problem } from './sf-model.js';
import { checkProse } from './sf-prose.js';
import { validate } from './sf-schema.js';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const LOOKS: [Look, string[]][] = [
  ['client', ['client', 'app', 'browser', 'mobile', 'portal', 'ui']],
  ['store', ['store', 'db', 'database', 'sql', 'cache', 'redis', 'bucket', 'files', 'storage']],
  ['external', ['external', 'outside', 'third-party', 'saas']],
  ['security', ['security', 'auth', 'identity', 'check']],
];
export const lookOf = (kind: string | undefined): Look => LOOKS.find(([, kinds]) => kinds.includes((kind ?? '').toLowerCase()))?.[0] ?? 'service';

// look goes right after kind, so the rewritten file reads as the lane writes it.
const withLook = (o: unknown): unknown => {
  if (!isObj(o) || o.look !== undefined) return o;
  const look = lookOf(typeof o.kind === 'string' ? o.kind : undefined);
  const out: Obj = {};
  for (const [k, v] of Object.entries(o)) { out[k] = v; if (k === 'kind') out.look = look; }
  return 'look' in out ? out : { ...out, look };
};

function upgrade(data: Obj): Obj {
  const out: Obj = { ...data };
  if (out.schemaVersion === 1) out.schemaVersion = 2;
  if (isObj(out.meta) && out.meta.name === undefined && typeof out.meta.title === 'string') out.meta = { ...out.meta, name: out.meta.title };
  if (isObj(out.levels) && Array.isArray(out.levels.diagrams)) {
    out.levels = { ...out.levels, diagrams: out.levels.diagrams.map((d: unknown) => (isObj(d) && Array.isArray(d.nodes) ? { ...d, nodes: d.nodes.map(withLook) } : d)) };
  }
  if (Array.isArray(out.sequences)) out.sequences = out.sequences.map((q: unknown) => (isObj(q) && Array.isArray(q.participants) ? { ...q, participants: q.participants.map(withLook) } : q));
  return out;
}

export function migrate(hostRoot: string, site: string): { rewritten: string[]; owed: string[]; problems: Problem[] } {
  const dir = path.join(hostRoot, site, 'model', 'fragments');
  if (!fs.existsSync(dir)) throw new Error(`no fragments folder at ${path.relative(hostRoot, dir)}`);
  const schema = parseJson(fs.readFileSync(SCHEMA_FILE, 'utf8')) as object;
  const problems: Problem[] = [];
  const parsed = new Map<string, Obj>();
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const file = path.relative(hostRoot, path.join(dir, name));
    try {
      const data = parseJson(fs.readFileSync(path.join(dir, name), 'utf8'));
      if (isObj(data)) parsed.set(name, data);
    } catch (e) {
      problems.push({ file, pointer: '', message: `invalid JSON: ${(e as Error).message}`, level: 'error' });
    }
  }
  const fragments: Fragment[] = [];
  const todo: [string, string][] = [];
  for (const [name, data] of parsed) {
    const file = path.relative(hostRoot, path.join(dir, name));
    // upgrade() is idempotent, so every fragment goes through it and only a changed one is written.
    const next = upgrade(data);
    fragments.push({ file, data: next });
    if (JSON.stringify(next) === JSON.stringify(data)) continue;
    for (const e of validate(schema, next)) problems.push({ file, pointer: e.pointer, message: e.message, level: 'error' });
    todo.push([name, `${JSON.stringify(next, null, 2)}\n`]);
  }
  if (problems.length > 0) return { rewritten: [], owed: [], problems };
  const owed = checkProse(mergeFragments(fragments).model, 'whole').filter((p) => p.level === 'error')
    .map((p) => (p.file === '' ? `system-flow: check: ${p.message}` : `${p.file}:${p.pointer}: ${p.message}`));
  const rewritten = writeAll(hostRoot, todo.map(([name, text]): [string, string] => [path.join(dir, name), text])).map((f) => path.relative(hostRoot, f)).sort();
  return { rewritten, owed, problems };
}
