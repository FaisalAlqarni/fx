import * as assert from 'assert';
import { parseOpencodeToolEvent, parseOpencodeV1Call, parseOpencodeV1Result, parseOpencodeV2Result, parseOpencodeAgent } from './opencode-input.js';

const ok = parseOpencodeToolEvent({ tool: 'bash', args: { command: 'ls' } });
assert.ok(ok.ok, 'a tool event parses');
assert.strictEqual(ok.value.tool, 'bash');
assert.deepStrictEqual(ok.value.args, { command: 'ls' });

for (const raw of [42, 'x', null, undefined]) {
  assert.deepStrictEqual(parseOpencodeToolEvent(raw), { ok: false, reason: 'opencode event is not an object' }, JSON.stringify(raw));
}

// The v1 plugin read `output && output.args || {}`: a missing or falsy args is empty.
const noArgs = parseOpencodeToolEvent({ tool: 'edit', args: null });
assert.ok(noArgs.ok);
assert.deepStrictEqual(noArgs.value.args, {});

// A non-string tool never equals a tool name, as before.
const numTool = parseOpencodeToolEvent({ tool: 7 });
assert.ok(numTool.ok);
assert.strictEqual(numTool.value.tool, undefined);

// v2 execute.before: ids and the shell input travel with the event.
const v2 = parseOpencodeToolEvent({ tool: 'shell', sessionID: 's', messageID: 'm', id: 'i', input: { command: 'ls' } });
assert.ok(v2.ok);
assert.deepStrictEqual([v2.value.sessionID, v2.value.messageID, v2.value.id], ['s', 'm', 'i']);
assert.deepStrictEqual(v2.value.input, { command: 'ls' });

// v1 hands the tool on `input` and the arguments on `output`.
const v1 = parseOpencodeV1Call({ tool: 'bash' }, { args: { command: 'ls' } });
assert.ok(v1.ok);
assert.strictEqual(v1.value.tool, 'bash');
assert.deepStrictEqual(v1.value.args, { command: 'ls' });
const v1None = parseOpencodeV1Call(undefined, undefined);
assert.ok(v1None.ok, 'missing input and output are an empty call, as before');
assert.strictEqual(v1None.value.tool, undefined);
assert.deepStrictEqual(v1None.value.args, {});

// v1 carries the session id on `input`, for the shell guard and chat.message.
const v1Session = parseOpencodeV1Call({ tool: 'bash', sessionID: 's1' }, undefined);
assert.ok(v1Session.ok);
assert.strictEqual(v1Session.value.sessionID, 's1');
const v1BadSession = parseOpencodeV1Call({ sessionID: 7 }, undefined);
assert.ok(v1BadSession.ok);
assert.strictEqual(v1BadSession.value.sessionID, undefined, 'a non-string id is no id');

// v1 tool.execute.after: input {tool, sessionID, callID, args}; output {title, output, metadata: {exit}}.
const r1 = parseOpencodeV1Result({ tool: 'bash', sessionID: 's', args: { command: 'ls' } }, { output: 'hi', metadata: { exit: 0 } });
assert.deepStrictEqual(r1, { tool: 'bash', sessionID: 's', args: { command: 'ls' }, outcome: 'ok', output: 'hi' });
assert.strictEqual(parseOpencodeV1Result({}, { metadata: { exit: 2 } }).outcome, 'fail', 'a non-zero exit fails');
assert.strictEqual(parseOpencodeV1Result({}, { metadata: { exit: null } }).outcome, 'unknown', 'a null exit is unknown');
assert.strictEqual(parseOpencodeV1Result({}, { metadata: { exit: null } }).interrupted, true, 'a null exit is a killed process');
assert.strictEqual(parseOpencodeV1Result({}, { metadata: {} }).interrupted, undefined, 'no exit is not an interruption');
assert.strictEqual(parseOpencodeAgent({ agent: 'build' }), 'build');
assert.strictEqual(parseOpencodeAgent({ agent: 3 }), undefined);
assert.strictEqual(parseOpencodeV1Result({}, { output: 'x' }).outcome, 'unknown', 'no exit is unknown');
assert.deepStrictEqual(parseOpencodeV1Result(undefined, undefined), { tool: undefined, sessionID: undefined, args: {}, outcome: 'unknown', output: '' });

// v2 execute.after: status error is a failure; an exit status, when present, decides; else unknown.
const base2 = { tool: 'shell', sessionID: 's', input: { command: 'ls' } };
assert.strictEqual(parseOpencodeV2Result({ ...base2, status: 'error' }).outcome, 'fail');
assert.strictEqual(parseOpencodeV2Result({ ...base2, status: 'completed', metadata: { exit: 0 }, output: 'ok' }).outcome, 'ok');
assert.strictEqual(parseOpencodeV2Result({ ...base2, status: 'completed', metadata: { exit: 1 } }).outcome, 'fail');
assert.strictEqual(parseOpencodeV2Result({ ...base2, status: 'completed' }).outcome, 'unknown');
assert.deepStrictEqual(parseOpencodeV2Result({ ...base2, status: 'completed', output: 'hi' }), { tool: 'shell', sessionID: 's', args: { command: 'ls' }, outcome: 'unknown', output: 'hi' });
assert.strictEqual(parseOpencodeV2Result(null).sessionID, undefined);

console.log('opencode-input tests passed');
