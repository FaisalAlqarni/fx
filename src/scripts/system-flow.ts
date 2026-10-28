#!/usr/bin/env node
// The system model CLI: system-flow [--root <dir>] [--site <dir>] [--markdown <dir>] check | build
import * as path from 'path';
import { execFileSync } from 'child_process';
import { build, checkModel, systemFlowConfig } from '../lib/sf-build.js';
import { itemsOf } from '../lib/sf-model.js';
import { detect, writeFxJson } from '../lib/sf-detect.js';

const USAGE = 'system-flow: usage: system-flow [--root <dir>] [--site <dir>] [--markdown <dir>] check [--fragment <file>] | build | detect [--repo <path>]... [--write]';
const usage = (): never => { process.stderr.write(`${USAGE}\n`); process.exit(2); };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
// Global flags go before the subcommand; build also takes --markdown after it.
const takeFlags = (names: string[]): void => {
  while (names.includes(args[0] ?? '')) {
    const [flag, value] = args.splice(0, 2);
    if (value === undefined) usage();
    opts[(flag ?? '').slice(2)] = value ?? '';
  }
};
takeFlags(['--root', '--site', '--markdown']);
const cmd = args.shift();
if (cmd !== 'check' && cmd !== 'build' && cmd !== 'detect') usage();
const repos: string[] = [];
let write = false;
if (cmd === 'detect') {
  for (let a = args.shift(); a !== undefined; a = args.shift()) {
    if (a === '--write') write = true;
    else if (a === '--repo' && args.length > 0) repos.push(args.shift() as string);
    else usage();
  }
}
let fragmentArg: string | undefined;
if (cmd === 'check' && args[0] === '--fragment') {
  args.shift();
  fragmentArg = args.shift();
  if (fragmentArg === undefined) usage();
}
if (cmd === 'build') takeFlags(['--markdown']);
if (args.length > 0) usage();

const hostRoot = (): string => path.resolve(opts.root ?? execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
const report = (problems: { file: string; pointer: string; message: string; level: string }[]): number => {
  const errors = problems.filter((p) => p.level === 'error');
  for (const p of errors) process.stderr.write(`${p.file}:${p.pointer}: ${p.message}\n`);
  return errors.length;
};

function detectCmd(): void {
  const root = hostRoot();
  const { detected, problems } = detect(root, repos);
  // A problem with no file prints as `system-flow: detect: <message>` (ruling 8).
  for (const p of problems) process.stderr.write(p.file === '' ? `system-flow: detect: ${p.message}\n` : `${p.file}:${p.pointer}: ${p.message}\n`);
  if (problems.length > 0) process.exit(1);
  if (write) writeFxJson(root, detected);
  process.stdout.write(`${JSON.stringify(detected)}\n`);
}

function check(): void {
  const root = hostRoot();
  const site = opts.site ?? systemFlowConfig(root).config?.output?.site ?? 'docs/system-flow';
  const checked = checkModel(root, site, 'check', fragmentArg);
  if (report(checked.problems) > 0) process.exit(1);
  const warnings = checked.problems.map((p) => `${p.file}:${p.pointer}: ${p.message}`);
  process.stdout.write(`${JSON.stringify({ ok: true, fragments: checked.fragments.length, items: itemsOf(checked.model).length, warnings })}\n`);
}

async function buildCmd(): Promise<void> {
  const root = hostRoot();
  const output = systemFlowConfig(root).config?.output;
  const result = await build({ hostRoot: root, site: opts.site ?? output?.site ?? 'docs/system-flow', markdown: opts.markdown ?? output?.markdown ?? 'docs/system' });
  report(result.problems);
  if (!result.ok) process.exit(1);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

(cmd === 'build' ? buildCmd() : Promise.resolve().then(cmd === 'detect' ? detectCmd : check)).catch((e: Error) => {
  process.stderr.write(`system-flow: ${cmd}: ${e.message.split('\n')[0]}\n`);
  process.exit(1);
});
