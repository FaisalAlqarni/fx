#!/usr/bin/env node
// The system model CLI: system-flow [--root <dir>] [--site <dir>] check
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseJson } from '../lib/json.js';
import { parseFxJson } from '../lib/fx-json.js';
import { resolveRoots, verifyEvidence } from '../lib/sf-evidence.js';
import { checkRules } from '../lib/sf-rules.js';
import type { FxJson } from '../lib/types.js';
import type { Problem } from '../lib/sf-model.js';
import { itemsOf, loadFragments, mergeFragments } from '../lib/sf-model.js';

const USAGE = 'system-flow: usage: system-flow [--root <dir>] [--site <dir>] check [--fragment <file>]';
const usage = (): never => { process.stderr.write(`${USAGE}\n`); process.exit(2); };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
while (args[0] === '--root' || args[0] === '--site') {
  const [flag, value] = args.splice(0, 2);
  if (value === undefined) usage();
  opts[(flag ?? '').slice(2)] = value ?? '';
}
const cmd = args.shift();
if (cmd !== 'check') usage();
let fragmentArg: string | undefined;
if (args[0] === '--fragment') {
  args.shift();
  fragmentArg = args.shift();
  if (fragmentArg === undefined) usage();
}
if (args.length > 0) usage();

// .fx.json is read through parseFxJson; only problems under system_flow are this command's.
function systemFlowConfig(root: string): { config: FxJson['system_flow']; problems: Problem[] } {
  const file = path.join(root, '.fx.json');
  if (!fs.existsSync(file)) return { config: undefined, problems: [] };
  const parsed = parseFxJson(parseJson(fs.readFileSync(file, 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  const problems = parsed.problems.filter((p) => p.key.startsWith('system_flow'))
    .map((p): Problem => ({ file: '.fx.json', pointer: `/${p.key.split('.').join('/')}`, message: p.reason, level: 'error' }));
  return { config: parsed.value.system_flow, problems };
}

function check(): void {
  const root = path.resolve(opts.root ?? execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  const cfg = systemFlowConfig(root);
  const site = opts.site ?? cfg.config?.output?.site ?? 'docs/system-flow';
  const dir = path.join(root, site, 'model', 'fragments');
  const loaded = loadFragments(dir, root);
  const merged = mergeFragments(loaded.fragments);
  let problems = [...cfg.problems, ...loaded.problems, ...merged.problems];
  let items = itemsOf(merged.model);
  if (problems.length === 0) {
    problems = checkRules(merged.model, merged.origin);
    const resolved = resolveRoots(root, merged.model.meta, cfg.config);
    // With --fragment, only that fragment's items are verified and reported; the rest supply the ids it names.
    const only = fragmentArg === undefined ? undefined : path.relative(root, path.resolve(root, fragmentArg));
    if (only !== undefined && !loaded.fragments.some((f) => f.file === only)) throw new Error(`no fragment ${only}`);
    if (only !== undefined) items = items.filter((i) => i.file === only);
    problems.push(...resolved.problems, ...verifyEvidence(items, resolved.roots, 'check'));
    if (only !== undefined) problems = problems.filter((p) => p.file === only || p.file === '.fx.json');
  }
  const errors = problems.filter((p) => p.level === 'error');
  for (const p of errors) process.stderr.write(`${p.file}:${p.pointer}: ${p.message}\n`);
  if (errors.length > 0) process.exit(1);
  const warnings = problems.map((p) => `${p.file}:${p.pointer}: ${p.message}`);
  process.stdout.write(`${JSON.stringify({ ok: true, fragments: loaded.fragments.length, items: itemsOf(merged.model).length, warnings })}\n`);
}

try { check(); } catch (e) {
  process.stderr.write(`system-flow: ${cmd}: ${(e as Error).message.split('\n')[0]}\n`);
  process.exit(1);
}
