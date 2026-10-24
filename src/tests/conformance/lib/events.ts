#!/usr/bin/env node
// Reads one live session's log (tests/conformance/lib/live.sh) and prints one
// slice of it as plain text. The three runtimes record a session differently;
// this is the one place that knows how, so a row asserts on meaning, never on
// a runtime's JSON shape.
//
//   KIND=answer           what the top-level session said
//   KIND=tool_output      what any tool call returned or refused, at any depth
//   KIND=sub_input        the prompt each subagent was dispatched with
//   KIND=sub_output       what each dispatched subagent returned to its parent
//   KIND=sub_type         the agent type each subagent was dispatched as
//   KIND=sub_fork         codex: `forked` or `isolated` per subagent, by whether it inherited the parent's history
//   KIND=sub_tool_output  what tool calls made INSIDE a subagent returned
//   KIND=max_depth        how deep dispatch went: 0 none, 1 a subagent, 2 its child
//   KIND=skills           the name of every skill a session loaded, one per line
//   KIND=skill_attempts   every Skill tool call attempted, loaded or blocked
//
// Formats, measured against Claude Code 2.1.278, Codex CLI 0.155.1 and
// opencode 1.18.25:
//   claude-code  stream-json. A subagent's messages carry parent_tool_use_id.
//   codex        `exec --json` output, then every rollout file the run wrote.
//                Each rollout opens with session_meta; a subagent's names its
//                parent_thread_id. The dispatch message is encrypted.
//   opencode     `run --format json` output for the root session, then one
//                {"fx_export": ...} line per session the run reached.
//   opencode-v2  2.0.18, probe-findings.md question 10: `run --format json`
//                lines {type, sessionID, part}, where a tool_use part is
//                {tool, state:{status, input, output|error, metadata}}; then
//                one {"fx_export": {info, messages}} line per session, from
//                `opencode session export`. A dispatch is the `subagent` tool
//                (input {agent, description, prompt}); its child session id is
//                in the output (<subagent sessionID="ses_...">) and the export
//                carries no parent link, so depth is read from those ids.
import * as fs from 'fs';
import { parseJson } from '../../../lib/json.js';

const kind = process.env.KIND;
const harness = process.env.HARNESS;
// Node's own path validation, so a missing argument fails as before.
const lines: string[] = Reflect.apply(fs.readFileSync, fs, [process.argv[2], 'utf8']).split('\n');

interface Out {
  answer: unknown[]; tool_output: unknown[]; sub_input: unknown[]; sub_output: unknown[]; sub_type: unknown[];
  sub_fork: unknown[]; sub_tool_output: unknown[]; skills: unknown[]; skill_attempts: unknown[]; max_depth: number;
}
const out: Out = {
  answer: [], tool_output: [], sub_input: [], sub_output: [], sub_type: [], sub_fork: [],
  sub_tool_output: [], skills: [], skill_attempts: [], max_depth: 0,
};

// A session log is untrusted JSON of four runtimes' shapes, read as unknown.
// get() is a property read with JavaScript's own failure on null and
// undefined, so a malformed record crashes here as it did before the port.
function get(v: unknown, key: string): unknown {
  if (v === null || v === undefined) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
// What `for (const x of v)` accepts from JSON: an array, or a string by character.
function each(v: unknown): Iterable<unknown> {
  if (typeof v === 'string' || Array.isArray(v)) return v;
  throw new TypeError(`${typeof v} is not iterable`);
}

const records: unknown[] = [];
for (const l of lines) {
  if (!l.startsWith('{')) continue;
  try { records.push(parseJson(l)); } catch { /* a partial line: skip */ }
}
function text(c: unknown): string {
  if (c == null) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => text(x)).join('\n');
  if (typeof c === 'object') return text(get(c, 'text') ?? get(c, 'content') ?? get(c, 'output') ?? get(c, 'message') ?? '');
  return String(c);
}

function claude(): void {
  const dispatch = new Set<unknown>();
  const skillCalls: Record<string, unknown> = {};  // Skill tool_use id -> skill name
  const nested = new Set<unknown>();               // Agent/Task tool_use ids made inside a subagent
  for (const r of records) {
    const top = get(r, 'parent_tool_use_id') == null;
    const message = get(r, 'message');
    const mc = message ? get(message, 'content') : undefined;
    const content: unknown[] = Array.isArray(mc) ? mc : [];
    if (get(r, 'type') === 'assistant') {
      // A dispatch is asynchronous: the tool_result below is only an
      // acknowledgement ("Async agent launched successfully"). What the
      // subagent returns to its parent arrives as its own assistant messages,
      // which name the dispatching tool_use in parent_tool_use_id.
      const sub = !top && dispatch.has(get(r, 'parent_tool_use_id'));
      for (const b of content) {
        if (get(b, 'type') === 'text' && top) out.answer.push(get(b, 'text'));
        if (get(b, 'type') === 'text' && sub) out.sub_output.push(get(b, 'text'));
        if (get(b, 'type') !== 'tool_use') continue;
        const name = get(b, 'name');
        const input = get(b, 'input');
        if (name === 'Agent' || name === 'Task') {
          if (top) {
            dispatch.add(get(b, 'id'));
            out.sub_input.push(text(input && get(input, 'prompt')));
            out.sub_type.push((input && get(input, 'subagent_type')) || 'general-purpose');
          }
          // A nested dispatch counts only once its result comes back
          // without an error; the attempt alone is not depth 2.
          else nested.add(get(b, 'id'));
        }
        // Counted only once its result comes back without an error.
        if (name === 'Skill' && input) skillCalls[String(get(b, 'id'))] = get(input, 'skill') || get(input, 'command') || '';
      }
    }
    if (get(r, 'type') === 'user') {
      for (const b of content) {
        if (get(b, 'type') !== 'tool_result') continue;
        const t = text(get(b, 'content'));
        const id = get(b, 'tool_use_id');
        out.tool_output.push(t);
        // A blocked call (disable-model-invocation: true) still reached the
        // model as an attempt; skills counts only a load that succeeded.
        if (String(id) in skillCalls) {
          out.skill_attempts.push(skillCalls[String(id)]);
          if (!get(b, 'is_error')) out.skills.push(skillCalls[String(id)]);
        }
        if (nested.has(id) && !get(b, 'is_error')) out.max_depth = Math.max(out.max_depth, 2);
        if (!top) out.sub_tool_output.push(t);
        if (top && dispatch.has(id)) out.sub_output.push(t);
      }
    }
    // The other half of an asynchronous dispatch: the completion notice, which
    // carries the subagent's summary and names the dispatch in tool_use_id.
    if (get(r, 'type') === 'system' && get(r, 'subtype') === 'task_notification' && dispatch.has(get(r, 'tool_use_id'))) {
      out.sub_output.push(text(get(r, 'summary')));
    }
    if (get(r, 'type') === 'result') {
      const result = get(r, 'result');
      if (typeof result === 'string') out.answer.push(result);
    }
  }
  if (dispatch.size) out.max_depth = Math.max(out.max_depth, 1);
}

function codex(): void {
  const parent: Record<string, unknown> = {};  // thread id -> parent thread id
  let thread: unknown = null;
  const depth = (start: unknown): number => {
    let t = start, d = 0;
    while (t && parent[String(t)]) { t = parent[String(t)]; d++; }
    return d;
  };
  let sawRollout = false;
  const reads: Record<string, string[]> = {};  // call id -> skill names its command reads
  for (const r of records) {
    const payload = get(r, 'payload');
    if (get(r, 'type') === 'session_meta' && payload) {
      sawRollout = true;
      thread = get(payload, 'id');
      if (get(payload, 'parent_thread_id')) parent[String(thread)] = get(payload, 'parent_thread_id');
      continue;
    }
    // exec --json items, used only when no rollout was written
    const item = get(r, 'item');
    if (get(r, 'type') === 'item.completed' && item && !sawRollout) {
      if (get(item, 'type') === 'agent_message') out.answer.push(get(item, 'text'));
      if (get(item, 'type') === 'command_execution') out.tool_output.push(text(get(item, 'aggregated_output')));
      // V1 returns a child's answer as the wait call's agent state.
      if (get(item, 'type') === 'collab_tool_call' && get(item, 'tool') === 'wait') {
        for (const st of Object.values(get(item, 'agents_states') || {})) if (st && get(st, 'status') === 'completed') out.sub_output.push(text(get(st, 'message')));
      }
      continue;
    }
    if (get(r, 'type') !== 'response_item' || !payload) continue;
    const p = payload;
    const d = depth(thread);
    const ptype = get(p, 'type');
    if (ptype === 'message' && get(p, 'role') === 'assistant' && d === 0) out.answer.push(text(get(p, 'content')));
    if (ptype === 'message' && get(p, 'role') === 'user' && d === 0) {
      // An explicitly addressed skill is injected as a <skill> user message.
      for (const m of text(get(p, 'content')).matchAll(/<skill>\s*<name>([^<]+)<\/name>/g)) out.skills.push((m[1] ?? '').trim());
    }
    if ((ptype === 'function_call' || ptype === 'custom_tool_call') && get(p, 'name') === 'spawn_agent') {
      if (d === 0) {
        out.sub_input.push(text(get(p, 'arguments') || get(p, 'input')));
        let a: unknown = {};
        try { a = parseJson(String(get(p, 'arguments') || '{}')); } catch { /* not JSON */ }
        out.sub_type.push(get(a, 'agent_type') || get(a, 'role') || 'default');
        // V2 forks unless fork_turns is "none"; V1 forks only on fork_context true.
        const forked = get(p, 'namespace') === 'multi_agent_v2' ? get(a, 'fork_turns') !== 'none' : get(a, 'fork_context') === true;
        out.sub_fork.push(forked ? 'forked' : 'isolated');
      }
    }
    if (ptype === 'function_call' || ptype === 'custom_tool_call') {
      // Codex loads a skill by reading its SKILL.md through the shell. The
      // attempt is not the load: it counts only if the read's output below
      // carries that skill's own frontmatter name.
      const names = [...String(get(p, 'arguments') || get(p, 'input') || '').matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((m) => m[1] ?? '');
      if (names.length) { reads[String(get(p, 'call_id'))] = names; out.skill_attempts.push(...names); }
    }
    if (ptype === 'function_call_output' || ptype === 'custom_tool_call_output') {
      const t = text(get(p, 'output'));
      for (const n of each(reads[String(get(p, 'call_id'))] || [])) if (t.includes(`name: ${n}\n`)) out.skills.push(n);
      out.tool_output.push(t);
      if (d > 0) out.sub_tool_output.push(t);
    }
    if (ptype === 'agent_message' && d === 0 && get(p, 'author') && get(p, 'author') !== '/root') {
      out.sub_output.push(text(get(p, 'content')));
    }
  }
  for (const t of Object.keys(parent)) out.max_depth = Math.max(out.max_depth, depth(t));
}

function opencode(): void {
  const sessions: Record<string, unknown> = {};  // id -> parentID
  const exports: unknown[] = [];
  const rootParts: unknown[] = [];               // the root session's tool parts, from the run stream
  for (const r of records) {
    if (get(r, 'fx_export')) { exports.push(get(r, 'fx_export')); continue; }
    const part = get(r, 'part') || {};
    if (get(r, 'type') === 'text' && get(part, 'text')) out.answer.push(get(part, 'text'));
    if (get(r, 'type') === 'tool_use' && get(part, 'type') === 'tool') rootParts.push(part);
  }
  for (const e of exports) {
    const info = get(e, 'info') || {};
    sessions[String(get(info, 'id'))] = get(info, 'parentID') || null;
  }
  // An export can fail; the root session's own tool calls are also in the run
  // stream, so fall back to those rather than read an empty session.
  if (!Object.values(sessions).includes(null)) {
    exports.push({ info: { id: 'root' }, messages: [{ parts: rootParts }] });
    sessions.root = null;
  }
  const depth = (start: unknown): number => {
    let id = start, d = 0;
    while (id && sessions[String(id)]) { id = sessions[String(id)]; d++; }
    return d;
  };
  for (const e of exports) {
    const sid = get(get(e, 'info') || {}, 'id');
    const d = depth(sid);
    out.max_depth = Math.max(out.max_depth, d);
    for (const m of each(get(e, 'messages') || [])) {
      for (const part of each(get(m, 'parts') || [])) {
        if (get(part, 'type') !== 'tool') continue;
        const st = get(part, 'state') || {};
        const t = [text(get(st, 'output')), text(get(st, 'error'))].filter(Boolean).join('\n');
        out.tool_output.push(t);
        if (d > 0) out.sub_tool_output.push(t);
        if (get(part, 'tool') === 'task' && d === 0) {
          out.sub_input.push(text(get(get(st, 'input') || {}, 'prompt')));
          out.sub_type.push(text(get(get(st, 'input') || {}, 'subagent_type')));
          out.sub_output.push(text(get(st, 'output')));
        }
        if (get(part, 'tool') === 'skill' && get(st, 'status') === 'completed') out.skills.push(text(get(get(st, 'input') || {}, 'name')));
      }
    }
  }
}

function opencodeV2(): void {
  const sessions: Record<string, unknown[]> = {};  // session id -> its tool parts
  const parent: Record<string, unknown> = {};      // child session id -> dispatching session id
  let root: unknown = null;
  const rootParts: unknown[] = [];
  for (const r of records) {
    if (get(r, 'fx_export')) continue;
    if (get(r, 'sessionID') && !root) root = get(r, 'sessionID');
    const part = get(r, 'part') || {};
    if (get(r, 'type') === 'text' && get(part, 'text')) out.answer.push(get(part, 'text'));
    if (get(r, 'type') === 'tool_use') rootParts.push(part);
  }
  sessions[String(root)] = rootParts;
  for (const r of records) {
    if (!get(r, 'fx_export')) continue;
    const e = get(r, 'fx_export'), parts: unknown[] = [];
    for (const m of each(get(e, 'messages') || [])) {
      const none: unknown[] = [];
      for (const p of none.concat(get(m, 'content') || [], get(m, 'parts') || [])) {
        if (p && get(p, 'type') === 'tool') parts.push({ tool: get(p, 'name') || get(p, 'tool'), state: get(p, 'state') });
      }
    }
    const info = get(e, 'info') || {};
    if (get(info, 'id')) sessions[String(get(get(e, 'info'), 'id'))] = parts;
  }
  // Pass one: the parent map. A dispatch counts only when it completed and
  // named a child; the depth-limit error names none.
  const childOf = (st: unknown): unknown => {
    const viaMeta = get(get(get(st, 'metadata') || {}, 'metadata') || {}, 'sessionID');
    return viaMeta || (text(get(st, 'output') ?? get(st, 'content')).match(/<subagent sessionID="(ses_[A-Za-z0-9]+)"/) || [])[1];
  };
  for (const [sid, parts] of Object.entries(sessions)) {
    for (const p of parts) {
      const st = get(p, 'state') || {};
      if (get(p, 'tool') === 'subagent' && get(st, 'status') === 'completed' && childOf(st)) parent[String(childOf(st))] = sid;
    }
  }
  const depth = (start: unknown): number => {
    let id = start, d = 0;
    while (id && parent[String(id)] && d < 20) { id = parent[String(id)]; d++; }
    return d;
  };
  for (const c of Object.keys(parent)) out.max_depth = Math.max(out.max_depth, depth(c));
  // Pass two: what each session did.
  for (const [sid, parts] of Object.entries(sessions)) {
    const d = depth(sid);
    for (const p of parts) {
      const st = get(p, 'state') || {};
      const t = [text(get(st, 'output') ?? get(st, 'content')), text(get(st, 'error'))].filter(Boolean).join('\n');
      out.tool_output.push(t);
      if (d > 0) out.sub_tool_output.push(t);
      if (get(p, 'tool') === 'subagent' && d === 0) {
        out.sub_input.push(text(get(get(st, 'input') || {}, 'prompt')));
        out.sub_type.push(text(get(get(st, 'input') || {}, 'agent')));
        out.sub_output.push(text(get(st, 'output') ?? get(st, 'content')));
      }
      if (get(p, 'tool') === 'skill') {
        const n = text(get(get(st, 'input') || {}, 'name'));
        out.skill_attempts.push(n);
        if (get(st, 'status') === 'completed') out.skills.push(n);
      }
    }
  }
}

// The runtime name picks the reader; a name with no reader fails as before.
const readers = { 'claude-code': claude, codex, opencode, 'opencode-v2': opencodeV2 };
const reader: unknown = Reflect.get(readers, String(harness));
if (typeof reader !== 'function') throw new TypeError(`${String(harness)} is not a function`);
Reflect.apply(reader, readers, []);
if (kind === 'max_depth') console.log(out.max_depth);
else if (String(kind) in out) {
  const list: unknown = Reflect.get(out, String(kind));
  if (!Array.isArray(list)) throw new TypeError(`out[kind].filter is not a function`);
  const v = list.filter(Boolean);
  if (v.length) console.log(v.join('\n'));
}
else { console.error(`events.js: unknown KIND ${kind}`); process.exit(2); }
