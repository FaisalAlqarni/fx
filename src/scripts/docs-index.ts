#!/usr/bin/env node
// The reverse index of doc claims by code path: scripts/docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale
import { loadIndex, queryIndex, stalePassOne, writeIndex } from '../lib/doc-index.js';

const USAGE = 'docs-index: usage: docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale';
const usage = (): never => { process.stderr.write(`${USAGE}\n`); process.exit(2); };

const args = process.argv.slice(2);
let root = process.cwd();
if (args[0] === '--root') {
  if (args.length < 2) usage();
  root = args[1] ?? root;
  args.splice(0, 2);
}
const cmd = args.shift();
const print = (v: unknown): void => { process.stdout.write(`${JSON.stringify(v, null, 2)}\n`); };
const report = (problems: { doc: string; line: number; message: string }[]): void => {
  for (const p of problems) process.stderr.write(`${p.doc}:${p.line}: ${p.message}\n`);
};

if (cmd === 'build' && args.length === 0) {
  const index = writeIndex(root);
  report(index.problems);
  print(index);
} else if (cmd === 'stale' && args.length === 0) {
  const index = loadIndex(root);
  report(index.problems);
  print(stalePassOne(root, index));
} else if (cmd === 'query') {
  let limit = 20;
  if (args[0] === '--limit') {
    if (!/^\d+$/.test(args[1] ?? '')) usage();
    limit = Number(args[1]);
    args.splice(0, 2);
  }
  if (args.length === 0) usage();
  const index = loadIndex(root);
  report(index.problems);
  const claims = queryIndex(index, args);
  // --limit 0 means no cap: the branch-mode docs step must see every claim.
  const shown = limit === 0 ? claims : claims.slice(0, limit);
  print({ claims: shown, more: claims.length - shown.length });
} else {
  usage();
}
