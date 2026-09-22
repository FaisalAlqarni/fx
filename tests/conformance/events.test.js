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

console.log('events: all passed');
