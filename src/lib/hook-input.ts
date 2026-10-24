// The trust boundary for hook stdin: one parser per harness. Each checks only
// the fields its hook reads, and narrows a field only where the hook would
// behave the same either way (see the input types in ./types.ts).
import type { ClaudeHookInput, CodexHookInput, HookInputResult } from './types.js';

const NOT_AN_OBJECT = 'hook input is not an object';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function toolInput(v: unknown): Record<string, unknown> | null {
  if (!v) return {};
  return isRecord(v) ? v : null;
}

// The subagent an agent_id names, or null for the root. Any non-empty value
// marks a subagent, whatever its type (task 02 ruling, red team C3); every hook
// uses this one rule (final review, broad minor 2).
export function subagentId(id: unknown): string | null {
  return id === undefined || id === null || id === '' ? null : String(id);
}

export function parseClaudeHookInput(raw: unknown): HookInputResult<ClaudeHookInput> {
  if (!isRecord(raw) || Array.isArray(raw)) return { ok: false, reason: NOT_AN_OBJECT };
  return {
    ok: true,
    value: {
      hook_event_name: raw.hook_event_name,
      tool_name: str(raw.tool_name),
      tool_input: toolInput(raw.tool_input),
      tool_response: raw.tool_response,
      error: str(raw.error),
      is_interrupt: typeof raw.is_interrupt === 'boolean' ? raw.is_interrupt : undefined,
      cwd: str(raw.cwd),
      transcript_path: str(raw.transcript_path),
      session_id: str(raw.session_id),
      prompt: str(raw.prompt),
      agent_id: raw.agent_id,
      agent_type: str(raw.agent_type),
      stop_hook_active: raw.stop_hook_active === true,
      last_assistant_message: str(raw.last_assistant_message) ?? null,
    },
  };
}

export function parseCodexHookInput(raw: unknown): HookInputResult<CodexHookInput> {
  if (!isRecord(raw) || Array.isArray(raw)) return { ok: false, reason: NOT_AN_OBJECT };
  const ti = toolInput(raw.tool_input);
  return {
    ok: true,
    value: {
      hook_event_name: raw.hook_event_name,
      tool_name: raw.tool_name,
      tool_input: ti,
      // exec_command reaches hooks as Bash with a string command (red team M21).
      tool_response: raw.tool_response,
      command: raw.tool_name === 'Bash' ? str(ti?.command) : undefined,
      cwd: str(raw.cwd),
      session_id: str(raw.session_id),
      prompt: str(raw.prompt),
      agent_id: raw.agent_id,
      agent_type: str(raw.agent_type),
      stop_hook_active: raw.stop_hook_active === true,
      last_assistant_message: str(raw.last_assistant_message) ?? null,
    },
  };
}
