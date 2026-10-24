// Pins what the conformance and bench scripts do on malformed input: exit code
// and stdout of the built script for each case, recorded by running the
// JavaScript versions at commit 779fa33 (before the TypeScript port). Stderr
// is not compared: a crash prints a stack, and its text differs by runtime.
//
//     node tests/conformance/tooling-malformed.test.js
//     FX_TOOLING_ROOT=<old tree> node tests/conformance/tooling-malformed.test.js --record
//
// --record prints the table's actual results as JSON, to be pasted into
// EXPECTED after running it against the old scripts. It never makes a port pass.
import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = process.env.FX_TOOLING_ROOT ?? path.join(__dirname, '..', '..');
const RECORD = process.argv.includes('--record');

interface Case {
  name: string;
  script: string;
  args?: string[];            // {tmp} becomes the scratch directory
  env?: Record<string, string>;
  input?: string;             // stdin
  files?: Record<string, string>;
  cat?: string;               // a file whose content is appended to stdout
}
interface Result { status: number | null; stdout: string }

const EVENTS = 'tests/conformance/lib/events.js';
const OR = 'tests/conformance/lib/openrouter.js';
const HEADS = 'tests/fixture-build/hidden/implementer-heads.js';
const MCP = 'tests/conformance/lib/mcp-probe-server.js';
const MERGE = 'tests/conformance/lib/merge-opencode-provider.js';
const SCORE = 'tests/review-bench/score.js';
const VERDICT = 'tests/lane-triggering/verdict.js';

const nullElement = '{"type":"assistant","message":{"content":[null]}}\n';
const skillBlock = (skill: string): string => `{"message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":${skill}}}]}}\n`;
const ping = '{"jsonrpc":"2.0","id":1,"method":"ping"}\n';
const src = '{"provider":{"llamacpp":{"a":1}}}';
const transcript = (...lines: string[]): Record<string, string> => ({
  'ctl.jsonl': '{}\n',
  'ctl/subagents/x.jsonl': lines.join('\n') + '\n',
});

const CASES: Case[] = [
  { name: 'events: a null content element crashes', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'claude-code', KIND: 'answer' }, files: { log: nullElement } },
  { name: 'events: HARNESS=constructor runs Object() and prints nothing', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'constructor', KIND: 'answer' }, files: { log: '{"type":"result","result":"x"}\n' } },
  { name: 'events: an unknown HARNESS crashes', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'nope', KIND: 'answer' }, files: { log: '{}\n' } },
  { name: 'events: an unknown KIND exits 2', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'codex', KIND: 'bogus' }, files: { log: '{}\n' } },
  { name: 'events: a cut final line is skipped', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'claude-code', KIND: 'answer' }, files: { log: '{"type":"result","result":"ok"}\n{"type":"res' } },
  { name: 'events: object messages in an export crash', script: EVENTS, args: ['{tmp}/log'], env: { HARNESS: 'opencode', KIND: 'answer' }, files: { log: '{"fx_export":{"info":{"id":"r"},"messages":{}}}\n' } },
  { name: 'events: no log argument crashes', script: EVENTS, env: { HARNESS: 'codex', KIND: 'answer' } },
  { name: 'score: no heading is scored as off-template', script: SCORE, args: ['{tmp}/f', 'foo'], files: { f: 'nothing\n' } },
  { name: 'score: an invalid match regex crashes', script: SCORE, args: ['{tmp}/f', '('], files: { f: '## Critical\n- x\n' } },
  { name: 'score: a missing findings file exits 2', script: SCORE, args: ['{tmp}/absent', 'x'] },
  { name: 'verdict: a non-string skill crashes', script: VERDICT, args: ['none', '{tmp}/s'], files: { s: skillBlock('5') } },
  { name: 'verdict: a null content block crashes', script: VERDICT, args: ['none', '{tmp}/s'], files: { s: '{"message":{"content":[null]}}\n' } },
  { name: 'verdict: unparseable lines are skipped', script: VERDICT, args: ['none', '{tmp}/s'], files: { s: 'x\n{bad\n' } },
  { name: 'verdict: scalar lines are skipped', script: VERDICT, args: ['none', '{tmp}/s'], files: { s: '5\nnull\n' } },
  { name: 'openrouter child: a cut stream exits 3', script: OR, args: ['child', '{tmp}/log', 'codex'], files: { log: '{"type":"session_meta"}\n{cut' } },
  { name: 'openrouter child: a null line is caught and exits 3', script: OR, args: ['child', '{tmp}/log', 'codex'], files: { log: '{"type":"session_meta"}\nnull\n' } },
  { name: 'openrouter child: a Codex log without a rollout exits 3', script: OR, args: ['child', '{tmp}/log', 'codex'], files: { log: '{"type":"x"}\n' } },
  { name: 'openrouter child: a malformed transcript line is skipped', script: OR, args: ['child', '{tmp}/log', 'claude-code'], files: { log: 'transcript: {bad\ntranscript: {"isApiErrorMessage":true,"apiErrorStatus":529}\n' } },
  { name: 'openrouter model: a null export message crashes', script: OR, args: ['model', 'opencode', '{tmp}/log'], files: { log: '{"fx_export":{"messages":[null]}}\n' } },
  { name: 'openrouter model: a missing log crashes', script: OR, args: ['model', 'codex', '{tmp}/absent'] },
  { name: 'openrouter leaks: a missing file exits 3, never clean', script: OR, args: ['leaks', '{tmp}/absent'] },
  { name: 'heads: malformed JSON exits 2', script: HEADS, args: ['{tmp}/ctl.jsonl'], files: transcript('{"type":"user"}', '{oops') },
  { name: 'heads: a null record crashes', script: HEADS, args: ['{tmp}/ctl.jsonl'], files: transcript('null') },
  {
    name: 'heads: a later fix round does not move the head', script: HEADS, args: ['{tmp}/ctl.jsonl'],
    files: transcript(
      '{"type":"user","timestamp":"2026-01-01T00:00:01Z","message":{"content":"You are implementing task 3"}}',
      '{"type":"assistant","timestamp":"2026-01-01T00:00:02Z","message":{"content":"head abc1234"}}',
      '{"type":"user","timestamp":"2026-01-01T00:00:03Z","message":{"content":"fix round"}}',
      '{"type":"assistant","timestamp":"2026-01-01T00:00:04Z","message":{"content":"later 1111111"}}'),
  },
  { name: 'mcp: a junk line is ignored and the next request answered', script: MCP, input: 'junk\n' + ping },
  { name: 'mcp: a null line crashes the server', script: MCP, input: 'null\n' },
  { name: 'mcp: a call without a path is refused', script: MCP, input: '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{}}\n' },
  { name: 'merge: a scalar DST is rewritten as that scalar', script: MERGE, args: ['{tmp}/src', '{tmp}/dst', 'm'], files: { src, dst: '5' }, cat: 'dst' },
  { name: 'merge: a null DST crashes and is left alone', script: MERGE, args: ['{tmp}/src', '{tmp}/dst', 'm'], files: { src, dst: 'null' }, cat: 'dst' },
  { name: 'merge: a SRC without provider.llamacpp exits 3', script: MERGE, args: ['{tmp}/src', '{tmp}/dst', 'm'], files: { src: '{"provider":{}}' } },
];

// Recorded from the JavaScript scripts at 779fa33.
const EXPECTED: Record<string, Result> = {
  "events: a null content element crashes": { status: 1, stdout: "" },
  "events: HARNESS=constructor runs Object() and prints nothing": { status: 0, stdout: "" },
  "events: an unknown HARNESS crashes": { status: 1, stdout: "" },
  "events: an unknown KIND exits 2": { status: 2, stdout: "" },
  "events: a cut final line is skipped": { status: 0, stdout: "ok\n" },
  "events: object messages in an export crash": { status: 1, stdout: "" },
  "events: no log argument crashes": { status: 1, stdout: "" },
  "score: no heading is scored as off-template": { status: 0, stdout: '{"caught":false,"falsePositive":false,"important":0,"offTemplate":true}\n' },
  "score: an invalid match regex crashes": { status: 1, stdout: "" },
  "score: a missing findings file exits 2": { status: 2, stdout: "" },
  "verdict: a non-string skill crashes": { status: 1, stdout: "" },
  "verdict: a null content block crashes": { status: 1, stdout: "" },
  "verdict: unparseable lines are skipped": { status: 0, stdout: "PASS\n" },
  "verdict: scalar lines are skipped": { status: 0, stdout: "PASS\n" },
  "openrouter child: a cut stream exits 3": { status: 3, stdout: "" },
  "openrouter child: a null line is caught and exits 3": { status: 3, stdout: "" },
  "openrouter child: a Codex log without a rollout exits 3": { status: 3, stdout: "" },
  "openrouter child: a malformed transcript line is skipped": { status: 0, stdout: "529\n" },
  "openrouter model: a null export message crashes": { status: 1, stdout: "" },
  "openrouter model: a missing log crashes": { status: 1, stdout: "" },
  "openrouter leaks: a missing file exits 3, never clean": { status: 3, stdout: "" },
  "heads: malformed JSON exits 2": { status: 2, stdout: "" },
  "heads: a null record crashes": { status: 1, stdout: "" },
  "heads: a later fix round does not move the head": { status: 0, stdout: "{\"03\":\"abc1234\"}\n" },
  "mcp: a junk line is ignored and the next request answered": { status: 0, stdout: "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n" },
  "mcp: a null line crashes the server": { status: 1, stdout: "" },
  "mcp: a call without a path is refused": { status: 0, stdout: "{\"jsonrpc\":\"2.0\",\"id\":2,\"error\":{\"code\":-32602,\"message\":\"path is required\"}}\n" },
  "merge: a scalar DST is rewritten as that scalar": { status: 0, stdout: "5\n" },
  "merge: a null DST crashes and is left alone": { status: 1, stdout: "null" },
  "merge: a SRC without provider.llamacpp exits 3": { status: 3, stdout: "" },
};

function run(c: Case): Result {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tooling-malformed-'));
  try {
    for (const [rel, body] of Object.entries(c.files ?? {})) {
      fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
      fs.writeFileSync(path.join(tmp, rel), body);
    }
    const args = (c.args ?? []).map((a) => a.split('{tmp}').join(tmp));
    const r = spawnSync('node', [path.join(ROOT, c.script), ...args], { encoding: 'utf8', input: c.input ?? '', env: { ...process.env, ...c.env } });
    const after = c.cat ? fs.readFileSync(path.join(tmp, c.cat), 'utf8') : '';
    return { status: r.status, stdout: (r.stdout + after).split(tmp).join('<tmp>') };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (RECORD) {
  console.log(JSON.stringify(Object.fromEntries(CASES.map((c) => [c.name, run(c)])), null, 2));
} else {
  for (const c of CASES) {
    const want = EXPECTED[c.name];
    assert.ok(want, `${c.name}: no recorded result`);
    assert.deepStrictEqual(run(c), want, c.name);
  }
  assert.strictEqual(Object.keys(EXPECTED).length, CASES.length, 'EXPECTED has a row no case uses');
  console.log(`tooling-malformed: ok (${CASES.length} cases)`);
}
