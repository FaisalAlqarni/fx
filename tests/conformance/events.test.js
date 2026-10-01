#!/usr/bin/env node
'use strict';
// tests/conformance/lib/events.js reads one live session's log and prints one
// slice of it. This proves the slices a row asserts on, against fixtures cut
// from real session logs.
//
// Claude Code dispatches an agent ASYNCHRONOUSLY: the tool_result tied to the
// dispatching tool_use carries only "Async agent launched successfully...".
// The subagent's actual answer arrives later, as a system/task_notification
// naming the dispatch in tool_use_id, and as assistant messages whose
// parent_tool_use_id names it. Reading only the tool_result made KIND=sub_output
// empty, which failed probe 93 on a working product.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const EVENTS = path.join(__dirname, 'lib', 'events.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-events-test-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

function slice(kind, harness, records) {
  const log = path.join(dir, 'log');
  fs.writeFileSync(log, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return execFileSync('node', [EVENTS, log], {
    env: { ...process.env, KIND: kind, HARNESS: harness },
    encoding: 'utf8',
  });
}

// --- Claude Code, async dispatch ------------------------------------------------
// Shape taken from a real probe-93 log: an Agent tool_use, the async
// acknowledgement as its tool_result, the subagent's own assistant messages
// carrying parent_tool_use_id and subagent_type, and the task_notification.
const ASYNC_ACK =
  'Async agent launched successfully. (This tool result is internal metadata — never quote ' +
  'or paste any part of it, including the agentId below, into a user-facing reply.)\n' +
  'agentId: a551c2ad871450f58';
const FINDING =
  'Lens: security, 2 findings\n\n1. [Critical] app/users_controller.rb:3: SQL injection. ' +
  '`params[:name]` is interpolated straight into a string passed to `User.where`.';

const asyncLog = [
  { type: 'assistant', parent_tool_use_id: null, message: { content: [
    { type: 'tool_use', id: 'toolu_async', name: 'Agent',
      input: { subagent_type: 'fx:fx-lens-security', prompt: 'Security lens review' } },
  ] } },
  { type: 'user', parent_tool_use_id: null, message: { content: [
    { type: 'tool_result', tool_use_id: 'toolu_async', content: [{ type: 'text', text: ASYNC_ACK }] },
  ] } },
  // The subagent's own turn: a tool call, then its answer.
  { type: 'assistant', parent_tool_use_id: 'toolu_async', subagent_type: 'fx:fx-lens-security',
    message: { content: [{ type: 'tool_use', id: 'toolu_inner', name: 'Read', input: { file_path: '/x' } }] } },
  { type: 'user', parent_tool_use_id: 'toolu_async', subagent_type: 'fx:fx-lens-security',
    message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_inner', content: 'the diff' }] } },
  { type: 'assistant', parent_tool_use_id: 'toolu_async', subagent_type: 'fx:fx-lens-security',
    message: { content: [{ type: 'text', text: FINDING }] } },
  { type: 'system', subtype: 'task_notification', task_id: 'a551c2ad871450f58',
    tool_use_id: 'toolu_async', status: 'completed',
    summary: 'Lens: security. SQL injection in app/users_controller.rb, line 3.' },
  { type: 'result', subtype: 'success', result: 'Reviewed the last commit.' },
];

let out = slice('sub_output', 'claude-code', asyncLog);
assert.match(out, /users_controller\.rb/,
  'sub_output must carry an asynchronously dispatched subagent\'s answer');
assert.match(out, /SQL injection/,
  'sub_output must carry the finding text, not just the async acknowledgement');
assert.match(out, /Lens: security\. SQL injection/,
  'sub_output must carry the task_notification summary');

// The other slices must not regress on the same log.
assert.match(slice('sub_type', 'claude-code', asyncLog), /^fx:fx-lens-security$/m,
  'sub_type still names the dispatched role');
assert.match(slice('sub_input', 'claude-code', asyncLog), /Security lens review/,
  'sub_input still carries the dispatch prompt');
assert.match(slice('sub_tool_output', 'claude-code', asyncLog), /the diff/,
  'sub_tool_output still carries what a tool inside the subagent returned');
out = slice('answer', 'claude-code', asyncLog);
assert.match(out, /Reviewed the last commit\./, 'answer still carries the top-level result');
assert.doesNotMatch(out, /SQL injection/, 'a subagent\'s text is never the top-level answer');

// A synchronous dispatch still reports through its tool_result.
const syncLog = [
  { type: 'assistant', parent_tool_use_id: null, message: { content: [
    { type: 'tool_use', id: 'toolu_sync', name: 'Task',
      input: { subagent_type: 'general-purpose', prompt: 'look something up' } },
  ] } },
  { type: 'user', parent_tool_use_id: null, message: { content: [
    { type: 'tool_result', tool_use_id: 'toolu_sync', content: 'the subagent returned this' },
  ] } },
];
assert.match(slice('sub_output', 'claude-code', syncLog), /the subagent returned this/,
  'a synchronous dispatch still reports through its tool_result');

// A nested dispatch is depth 2, not a top-level subagent's answer.
const nestedLog = asyncLog.concat([
  { type: 'assistant', parent_tool_use_id: 'toolu_async', subagent_type: 'fx:fx-lens-security',
    message: { content: [
      { type: 'tool_use', id: 'toolu_nested', name: 'Agent',
        input: { subagent_type: 'general-purpose', prompt: 'a child dispatch' } },
    ] } },
  { type: 'assistant', parent_tool_use_id: 'toolu_nested', subagent_type: 'general-purpose',
    message: { content: [{ type: 'text', text: 'GRANDCHILD ANSWER' }] } },
]);
assert.doesNotMatch(slice('sub_output', 'claude-code', nestedLog), /GRANDCHILD ANSWER/,
  'a nested subagent\'s answer is not a top-level subagent\'s answer');

// A Skill call Claude Code blocks (disable-model-invocation: true) still
// reaches the model as an attempt, even though it never becomes a load: the
// tool_result comes back with is_error true. `skills` only counts a load
// that succeeded; row 13 needs to know an attempt happened at all, blocked
// or not, so it has its own kind.
const blockedSkillLog = [
  { type: 'assistant', parent_tool_use_id: null, message: { content: [
    { type: 'tool_use', id: 'toolu_skill', name: 'Skill', input: { skill: 'fx-audit' } },
  ] } },
  { type: 'user', parent_tool_use_id: null, message: { content: [
    { type: 'tool_result', tool_use_id: 'toolu_skill', is_error: true,
      content: [{ type: 'text', text: 'This skill is not available for automatic invocation.' }] },
  ] } },
];
assert.match(slice('skill_attempts', 'claude-code', blockedSkillLog), /^fx-audit$/m,
  'skill_attempts must record a Skill call even when Claude Code blocks it');
assert.strictEqual(slice('skills', 'claude-code', blockedSkillLog), '',
  'skills must not record a blocked Skill call as a successful load');

// --- opencode 2.x -------------------------------------------------------------
// Shapes from probe-findings.md question 10: run lines carry the root session's
// tool_use parts; a dispatch is the `subagent` tool and names its child in the
// output; `session export` has no parent link, and its assistant content holds
// {type:'tool', name, state} parts.
const v2Root = 'ses_root1';
const v2Dispatch = (child, prompt, answer) => ({
  tool: 'subagent',
  state: { status: 'completed', input: { agent: 'general', description: 'd', prompt },
    output: `<subagent sessionID="${child}" state="completed">\n${answer}\n</subagent>`,
    metadata: { metadata: { sessionID: child } } },
});
const v2Run = [
  { type: 'step_start', sessionID: v2Root, part: { type: 'step-start' } },
  { type: 'tool_use', sessionID: v2Root, part: { type: 'tool', ...v2Dispatch('ses_kid1', 'outer prompt', 'NESTED-OK') } },
  { type: 'tool_use', sessionID: v2Root, part: { type: 'tool', tool: 'skill', state: { status: 'completed', input: { name: 'fx-tdd' }, output: 'loaded' } } },
  { type: 'tool_use', sessionID: v2Root, part: { type: 'tool', tool: 'skill', state: { status: 'error', input: { name: 'fx-audit' }, error: 'denied' } } },
  { type: 'text', sessionID: v2Root, part: { type: 'text', text: 'NESTED-OK' } },
];
const v2Kid = { fx_export: { info: { id: 'ses_kid1' }, messages: [{ content: [
  { type: 'tool', id: 'c1', name: 'subagent', state: v2Dispatch('ses_kid2', 'inner prompt', 'NESTED-OK').state },
  { type: 'tool', id: 'c2', name: 'shell', state: { status: 'completed', input: { command: 'ls' }, output: 'KIDSHELL' } },
] }] } };
const v2Log = [...v2Run, v2Kid];
assert.strictEqual(slice('max_depth', 'opencode-v2', v2Log).trim(), '2', 'a child that dispatches is depth 2');
assert.strictEqual(slice('max_depth', 'opencode-v2', v2Run).trim(), '1', 'one completed dispatch is depth 1');
assert.strictEqual(slice('answer', 'opencode-v2', v2Log).trim(), 'NESTED-OK');
assert.strictEqual(slice('sub_type', 'opencode-v2', v2Log).trim(), 'general', 'only the root session\'s dispatches');
assert.strictEqual(slice('sub_input', 'opencode-v2', v2Log).trim(), 'outer prompt');
assert.match(slice('sub_output', 'opencode-v2', v2Log), /NESTED-OK/);
assert.match(slice('sub_tool_output', 'opencode-v2', v2Log), /KIDSHELL/);
assert.strictEqual(slice('skills', 'opencode-v2', v2Log).trim(), 'fx-tdd', 'a denied skill call is not a load');
assert.deepStrictEqual(slice('skill_attempts', 'opencode-v2', v2Log).trim().split('\n'), ['fx-tdd', 'fx-audit']);
const v2Refused = [
  { type: 'tool_use', sessionID: v2Root, part: { type: 'tool', tool: 'subagent', state: { status: 'error', input: { agent: 'general', prompt: 'p' }, error: 'Subagent depth limit reached (1)' } } },
];
assert.strictEqual(slice('max_depth', 'opencode-v2', v2Refused).trim(), '0', 'a refused dispatch is no depth');

// Codex: sub_fork says whether each top-level spawn inherited the parent's
// history. MultiAgentV2 forks unless fork_turns is "none"; V1 (the namespace a
// model outside the bundled catalog gets) forks only on fork_context true.
const spawn = (namespace, args) => [{ type: 'session_meta', payload: { id: 't0' } },
  { type: 'response_item', payload: { type: 'function_call', name: 'spawn_agent', namespace, arguments: JSON.stringify({ message: 'm', ...args }) } }];
for (const [ns, args, want] of [
  ['multi_agent_v1', {}, 'isolated'],
  ['multi_agent_v1', { fork_context: false }, 'isolated'],
  ['multi_agent_v1', { fork_context: true }, 'forked'],
  ['multi_agent_v2', { fork_turns: 'none' }, 'isolated'],
  ['multi_agent_v2', {}, 'forked'],
  ['multi_agent_v2', { fork_turns: 'all' }, 'forked'],
  ['multi_agent_v2', { fork_turns: '2' }, 'forked'],
]) assert.strictEqual(slice('sub_fork', 'codex', spawn(ns, args)).trim(), want, `${ns} ${JSON.stringify(args)}`);

// Codex V1 hands a child's answer back as the wait call's agent state, in the
// exec stream: `completed` with the child's last message. Only that state
// counts as a subagent's return (row 02, qwen run 2026-10-01).
const wait = (st) => [{ type: 'item.completed', item: { type: 'collab_tool_call', tool: 'wait', agents_states: { t1: st } } }];
assert.strictEqual(slice('sub_output', 'codex', wait({ status: 'completed', message: 'N=111 P=35' })).trim(), 'N=111 P=35');
assert.strictEqual(slice('sub_output', 'codex', wait({ status: 'errored', message: 'oops' })).trim(), '', 'an errored child returned nothing');
assert.strictEqual(slice('sub_output', 'codex', wait({ status: 'pending_init', message: null })).trim(), '');

console.log('events: all passed');
