// The trust boundary for opencode plugin events. Checks only the fields the
// plugins read and keeps each as the old code saw it: a non-string tool never
// matched a tool name, and a falsy args or input read as an empty object.
import type { OpencodeEventResult, OpencodeToolResult } from './types.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function obj(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : {};
}

export function parseOpencodeToolEvent(raw: unknown): OpencodeEventResult {
  if (!isRecord(raw)) return { ok: false, reason: 'opencode event is not an object' };
  return {
    ok: true,
    value: {
      tool: str(raw.tool),
      args: obj(raw.args),
      input: obj(raw.input),
      sessionID: str(raw.sessionID),
      messageID: str(raw.messageID),
      id: str(raw.id),
    },
  };
}

// v1 `tool.execute.before(input, output)`: the tool is on input, the arguments
// on output, the session id on input. Either may be missing; that is an empty
// call, not a failure. chat.message and the system transform read the session id the same way.
export function parseOpencodeV1Call(input: unknown, output: unknown): OpencodeEventResult {
  return parseOpencodeToolEvent({ tool: obj(input).tool, args: obj(output).args, sessionID: obj(input).sessionID });
}

// A numeric exit status is ok for 0 and fail otherwise; none (or null) is unknown.
function outcomeOf(exit: unknown): OpencodeToolResult['outcome'] {
  return typeof exit === 'number' ? (exit === 0 ? 'ok' : 'fail') : 'unknown';
}

// v1 `tool.execute.after(input, output)`: input {tool, sessionID, callID, args}; output {title, output, metadata},
// with the exit status of a bash call at metadata.exit (measured, 1.18.25).
export function parseOpencodeV1Result(input: unknown, output: unknown): OpencodeToolResult {
  const out = obj(output);
  return {
    tool: str(obj(input).tool),
    sessionID: str(obj(input).sessionID),
    args: obj(obj(input).args),
    outcome: outcomeOf(obj(out.metadata).exit),
    output: str(out.output) ?? '',
    // A null exit is a killed process: its partial output never verifies.
    ...(obj(out.metadata).exit === null ? { interrupted: true } : {}),
  };
}

// v2 `execute.after` event: status "error" is a failed or refused call (probe finding). Where the output text
// and the exit status live is not measured: read from `output`, `metadata.exit` and `exit` when present.
export function parseOpencodeV2Result(raw: unknown): OpencodeToolResult {
  const ev = obj(raw);
  const exit = obj(ev.metadata).exit ?? ev.exit;
  return {
    tool: str(ev.tool),
    sessionID: str(ev.sessionID),
    args: obj(ev.input),
    outcome: ev.status === 'error' ? 'fail' : outcomeOf(exit),
    output: str(ev.output) ?? '',
  };
}

// The agent a prompt was addressed to: 1.x `chat.message` input.agent (measured, task 06). The 2.1.4 prompt
// event has no such field (references/harnesses/opencode-v2.md), so this is undefined there.
export function parseOpencodeAgent(input: unknown): string | undefined {
  return str(obj(input).agent);
}
