#!/usr/bin/env node
// The system model CLI: system-flow [--root <dir>] [--site <dir>] check
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseJson } from '../lib/json.js';
import { itemsOf, loadFragments, mergeFragments } from '../lib/sf-model.js';

const USAGE = 'system-flow: usage: system-flow [--root <dir>] [--site <dir>] check';
const usage = (): never => { process.stderr.write(`${USAGE}\n`); process.exit(2); };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
while (args[0] === '--root' || args[0] === '--site') {
  const [flag, value] = args.splice(0, 2);
  if (value === undefined) usage();
  opts[(flag ?? '').slice(2)] = value ?? '';
}
const cmd = args.shift();
if (cmd !== 'check' || args.length > 0) usage();

// shortcut: reads .fx.json as raw JSON for this one key; task 03 moves it onto parseFxJson.
function siteFromFxJson(root: string): string | undefined {
  const file = path.join(root, '.fx.json');
  if (!fs.existsSync(file)) return undefined;
  const site = (parseJson(fs.readFileSync(file, 'utf8')) as { system_flow?: { output?: { site?: unknown } } }).system_flow?.output?.site;
  return typeof site === 'string' ? site : undefined;
}

function check(): void {
  const root = path.resolve(opts.root ?? execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  const site = opts.site ?? siteFromFxJson(root) ?? 'docs/system-flow';
  const dir = path.join(root, site, 'model', 'fragments');
  const loaded = loadFragments(dir, root);
  const merged = mergeFragments(loaded.fragments);
  const problems = [...loaded.problems, ...merged.problems];
  for (const p of problems) process.stderr.write(`${p.file}:${p.pointer}: ${p.message}\n`);
  if (problems.some((p) => p.level === 'error')) process.exit(1);
  process.stdout.write(`${JSON.stringify({ ok: true, fragments: loaded.fragments.length, items: itemsOf(merged.model).length, warnings: [] })}\n`);
}

try { check(); } catch (e) {
  process.stderr.write(`system-flow: ${cmd}: ${(e as Error).message.split('\n')[0]}\n`);
  process.exit(1);
}
