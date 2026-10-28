#!/usr/bin/env node
// The system model CLI: system-flow [--root <dir>] [--site <dir>] [--markdown <dir>] check | build
import * as path from 'path';
import { execFileSync } from 'child_process';
import { build, checkModel, layoutChecked, systemFlowConfig } from '../lib/sf-build.js';
import type { DiagramFlags } from '../lib/sf-build.js';
import { itemsOf, originOf, parseHandle } from '../lib/sf-model.js';
import { changedPaths, diffBases, loadModelItems, queryPaths, staleItems, verifyItems } from '../lib/sf-stale.js';
import { estimate, readPlan } from '../lib/sf-estimate.js';
import { detect, docsConfig, writeFxJson } from '../lib/sf-detect.js';

const USAGE = 'system-flow: usage: system-flow [--root <dir>] [--site <dir>] [--markdown <dir>] check [--fragment <file>] | build [--only <handle|path>[,...]]... [--archify <dir>] [--prefer cheap|fast|detailed] [--page-limit <name>=<1-8>]... [--svg <name>]... | estimate <plan file> | detect [--repo <path>]... [--write] | query <path>... | query --diff <base> [--base <root id>=<ref>]... | stale | verify <handle>... | --all';
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
if (cmd !== 'check' && cmd !== 'build' && cmd !== 'detect' && cmd !== 'estimate' && cmd !== 'query' && cmd !== 'stale' && cmd !== 'verify') usage();
const repos: string[] = [];
let write = false;
if (cmd === 'detect') {
  for (let a = args.shift(); a !== undefined; a = args.shift()) {
    if (a === '--write') write = true;
    else if (a === '--repo' && args.length > 0) repos.push(args.shift() as string);
    else usage();
  }
}
let planArg = '';
if (cmd === 'estimate') planArg = args.shift() ?? '';
if (cmd === 'estimate' && planArg === '') usage();
let fragmentArg: string | undefined;
if (cmd === 'check' && args[0] === '--fragment') {
  args.shift();
  fragmentArg = args.shift();
  if (fragmentArg === undefined) usage();
}
if (cmd === 'build') takeFlags(['--markdown']);
let archifyArg: string | undefined;
let onlyArg: string[] | undefined;
const flags: DiagramFlags = {};
if (cmd === 'build') {
  for (let a = args[0]; a !== undefined && a.startsWith('--'); a = args[0]) {
    args.shift();
    const v = args.shift();
    if (v === undefined) usage();
    if (a === '--archify') archifyArg = path.resolve(v as string);
    else if (a === '--only' && v !== '') onlyArg = [...(onlyArg ?? []), ...(v as string).split(',').filter((x) => x !== '')];
    else if (a === '--prefer' && (v === 'cheap' || v === 'fast' || v === 'detailed')) flags.prefer = v;
    else if (a === '--page-limit') {
      const m = /^([^=]+)=([1-8])$/.exec(v as string);
      if (!m) usage();
      flags.pageLimits = { ...flags.pageLimits, [m?.[1] as string]: Number(m?.[2]) };
    } else if (a === '--svg' && v !== '') flags.svg = [...(flags.svg ?? []), v as string];
    else usage();
  }
}
let diffBase: string | undefined;
const givenBases: Record<string, string> = {};
let queried: string[] = [];
let verifyAll = false;
if (cmd === 'query') {
  if (args[0] === '--diff') {
    args.shift();
    diffBase = args.shift();
    if (diffBase === undefined) usage();
    while ((args[0] as string | undefined) === '--base') {
      args.shift();
      const m = /^([^=]+)=(.+)$/.exec(args.shift() ?? '');
      if (!m) usage();
      givenBases[m?.[1] ?? ''] = m?.[2] ?? '';
    }
  } else {
    queried = args.splice(0);
    if (queried.length === 0) usage();
  }
}
if (cmd === 'verify') {
  if (args[0] === '--all') { args.shift(); verifyAll = true; } else queried = args.splice(0);
  if (!verifyAll && queried.length === 0) usage();
  for (const h of queried) {
    if (parseHandle(h) === null) { process.stderr.write(`system-flow: verify: ${h} is not a handle (<kind>:<id>)\n`); process.exit(2); }
  }
}
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

function estimateCmd(): void {
  const { plan, problems } = readPlan(path.resolve(planArg), planArg);
  for (const p of problems) process.stderr.write(p.file === '' ? `system-flow: estimate: ${p.message}\n` : `${p.file}:${p.pointer}: ${p.message}\n`);
  if (plan === null) process.exit(1);
  print(estimate(plan));
}

async function check(): Promise<void> {
  const root = hostRoot();
  const site = opts.site ?? systemFlowConfig(root).config?.output?.site ?? 'docs/system-flow';
  const checked = checkModel(root, site, 'check', fragmentArg);
  if (report(checked.problems) > 0) process.exit(1);
  // An area agent runs check --fragment before it returns: lay out that fragment's figures so it can split an unfit one.
  if (fragmentArg !== undefined) {
    const only = path.relative(root, path.resolve(root, fragmentArg));
    const own = (o: object): boolean => originOf(o).file === only;
    const m = checked.model;
    const mine = { ...m, levels: { ...m.levels, diagrams: m.levels.diagrams.filter(own) }, sequences: m.sequences.filter(own), storeFlows: m.storeFlows.filter(own) };
    if (report((await layoutChecked(mine)).unfit) > 0) process.exit(1);
  }
  const warnings = checked.problems.map((p) => `${p.file}:${p.pointer}: ${p.message}`);
  process.stdout.write(`${JSON.stringify({ ok: true, fragments: checked.fragments.length, items: itemsOf(checked.model).length, warnings })}\n`);
}

const siteOf = (root: string): string => opts.site ?? systemFlowConfig(root).config?.output?.site ?? 'docs/system-flow';
const print = (v: unknown): void => { process.stdout.write(`${JSON.stringify(v)}\n`); };

function queryCmd(): void {
  const root = hostRoot();
  const { items, roots } = loadModelItems(root, siteOf(root));
  const hostId = [...roots.values()].find((r) => r.host)?.id ?? '';
  if (diffBase === undefined) return print({ items: queryPaths(items, queried, hostId) });
  for (const id of Object.keys(givenBases)) {
    if (!roots.has(id) || roots.get(id)?.host) { process.stderr.write(`system-flow: query: --base names ${roots.has(id) ? 'the host root' : 'no root'} ${id}\n`); process.exit(2); }
  }
  const { bases, unbased } = diffBases(items, roots, diffBase, givenBases);
  const found = new Map<string, { handle: string; kind: string; file: string }>();
  const added: Record<string, string[]> = {};
  for (const [id, base] of Object.entries(bases)) {
    const diff = changedPaths(roots.get(id) as NonNullable<ReturnType<typeof roots.get>>, base);
    added[id] = diff.added;
    for (const hit of queryPaths(items, diff.changed.map((p) => (id === hostId ? p : `@${id}/${p}`)), hostId)) found.set(hit.handle, hit);
  }
  print({ items: [...found.values()], bases, unbased, added });
}

function staleCmd(): void {
  const root = hostRoot();
  const { items, roots } = loadModelItems(root, siteOf(root));
  print({ roots: staleItems(items, roots) });
}

function verifyCmd(): void {
  const root = hostRoot();
  const { roots, fragmentsDir } = loadModelItems(root, siteOf(root));
  print({ verified: verifyItems(fragmentsDir, verifyAll ? 'all' : queried, roots) });
}

async function buildCmd(): Promise<void> {
  const root = hostRoot();
  const output = systemFlowConfig(root).config?.output;
  const result = await build({ hostRoot: root, site: opts.site ?? output?.site ?? 'docs/system-flow', markdown: opts.markdown ?? output?.markdown ?? 'docs/system', docsDir: docsConfig(root).docsDir, archify: archifyArg, only: onlyArg, flags: Object.keys(flags).length ? flags : undefined });
  for (const p of result.problems.filter((x) => x.file === '' && x.level === 'error')) process.stderr.write(`system-flow: build: ${p.message}\n`);
  report(result.problems.filter((x) => x.file !== ''));
  if (!result.ok) process.exit(1);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

(cmd === 'build' ? buildCmd() : Promise.resolve().then({ detect: detectCmd, estimate: estimateCmd, query: queryCmd, stale: staleCmd, verify: verifyCmd, check }[cmd as 'check'])).catch((e: Error) => {
  process.stderr.write(`system-flow: ${cmd}: ${e.message.split('\n')[0]}\n`);
  process.exit(1);
});
