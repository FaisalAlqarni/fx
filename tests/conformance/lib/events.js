#!/usr/bin/env node
'use strict';
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
//   KIND=sub_tool_output  what tool calls made INSIDE a subagent returned
//   KIND=max_depth        how deep dispatch went: 0 none, 1 a subagent, 2 its child
//   KIND=skills           the name of every skill a session loaded, one per line
//
// Formats, measured against Claude Code 2.1.278, Codex CLI 0.155.1 and
// opencode 1.18.25:
//   claude-code  stream-json. A subagent's messages carry parent_tool_use_id.
//   codex        `exec --json` output, then every rollout file the run wrote.
//                Each rollout opens with session_meta; a subagent's names its
//                parent_thread_id. The dispatch message is encrypted.
//   opencode     `run --format json` output for the root session, then one
//                {"fx_export": ...} line per session the run reached.
const fs = require('fs');

const kind = process.env.KIND;
const harness = process.env.HARNESS;
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const out = {
  answer: [], tool_output: [], sub_input: [], sub_output: [], sub_type: [],
  sub_tool_output: [], skills: [], max_depth: 0,
};

const records = [];
for (const l of lines) {
  if (!l.startsWith('{')) continue;
  try { records.push(JSON.parse(l)); } catch { /* a partial line: skip */ }
}
const text = (c) => {
  if (c == null) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(text).join('\n');
  if (typeof c === 'object') return text(c.text ?? c.content ?? c.output ?? '');
  return String(c);
};

function claude() {
  const dispatch = new Set();
  const skillCalls = {};             // Skill tool_use id -> skill name
  for (const r of records) {
    const top = r.parent_tool_use_id == null;
    const content = (r.message && Array.isArray(r.message.content)) ? r.message.content : [];
    if (r.type === 'assistant') {
      for (const b of content) {
        if (b.type === 'text' && top) out.answer.push(b.text);
        if (b.type !== 'tool_use') continue;
        if (b.name === 'Agent' || b.name === 'Task') {
          if (top) {
            dispatch.add(b.id);
            out.sub_input.push(text(b.input && b.input.prompt));
            out.sub_type.push((b.input && b.input.subagent_type) || 'general-purpose');
          }
          else out.max_depth = Math.max(out.max_depth, 2);
        }
        // Counted only once its result comes back without an error.
        if (b.name === 'Skill' && b.input) skillCalls[b.id] = b.input.skill || b.input.command || '';
      }
    }
    if (r.type === 'user') {
      for (const b of content) {
        if (b.type !== 'tool_result') continue;
        const t = text(b.content);
        out.tool_output.push(t);
        if (b.tool_use_id in skillCalls && !b.is_error) out.skills.push(skillCalls[b.tool_use_id]);
        if (!top) out.sub_tool_output.push(t);
        if (top && dispatch.has(b.tool_use_id)) out.sub_output.push(t);
      }
    }
    if (r.type === 'result') {
      if (typeof r.result === 'string') out.answer.push(r.result);
      const st = r.subagent_stats;
      if (st && typeof st.max_depth === 'number') out.max_depth = Math.max(out.max_depth, st.max_depth);
    }
  }
  if (dispatch.size) out.max_depth = Math.max(out.max_depth, 1);
}

function codex() {
  const parent = {};                 // thread id -> parent thread id
  let thread = null;
  const depth = (t) => { let d = 0; while (t && parent[t]) { t = parent[t]; d++; } return d; };
  let sawRollout = false;
  const reads = {};                  // call id -> skill names its command reads
  for (const r of records) {
    if (r.type === 'session_meta' && r.payload) {
      sawRollout = true;
      thread = r.payload.id;
      if (r.payload.parent_thread_id) parent[thread] = r.payload.parent_thread_id;
      continue;
    }
    // exec --json items, used only when no rollout was written
    if (r.type === 'item.completed' && r.item && !sawRollout) {
      if (r.item.type === 'agent_message') out.answer.push(r.item.text);
      if (r.item.type === 'command_execution') out.tool_output.push(text(r.item.aggregated_output));
      continue;
    }
    if (r.type !== 'response_item' || !r.payload) continue;
    const p = r.payload;
    const d = depth(thread);
    if (p.type === 'message' && p.role === 'assistant' && d === 0) out.answer.push(text(p.content));
    if (p.type === 'message' && p.role === 'user' && d === 0) {
      // An explicitly addressed skill is injected as a <skill> user message.
      for (const m of text(p.content).matchAll(/<skill>\s*<name>([^<]+)<\/name>/g)) out.skills.push(m[1].trim());
    }
    if ((p.type === 'function_call' || p.type === 'custom_tool_call') && p.name === 'spawn_agent') {
      if (d === 0) {
        out.sub_input.push(text(p.arguments || p.input));
        let a = {};
        try { a = JSON.parse(p.arguments || '{}'); } catch { /* not JSON */ }
        out.sub_type.push(a.agent_type || a.role || 'default');
      }
    }
    if (p.type === 'function_call' || p.type === 'custom_tool_call') {
      // Codex loads a skill by reading its SKILL.md through the shell. The
      // attempt is not the load: it counts only if the read's output below
      // carries that skill's own frontmatter name.
      const names = [...String(p.arguments || p.input || '').matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((m) => m[1]);
      if (names.length) reads[p.call_id] = names;
    }
    if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      const t = text(p.output);
      for (const n of reads[p.call_id] || []) if (t.includes(`name: ${n}\n`)) out.skills.push(n);
      out.tool_output.push(t);
      if (d > 0) out.sub_tool_output.push(t);
    }
    if (p.type === 'agent_message' && d === 0 && p.author && p.author !== '/root') {
      out.sub_output.push(text(p.content));
    }
  }
  for (const t of Object.keys(parent)) out.max_depth = Math.max(out.max_depth, depth(t));
}

function opencode() {
  const sessions = {};               // id -> parentID
  const exports = [];
  const rootParts = [];              // the root session's tool parts, from the run stream
  for (const r of records) {
    if (r.fx_export) { exports.push(r.fx_export); continue; }
    const part = r.part || {};
    if (r.type === 'text' && part.text) out.answer.push(part.text);
    if (r.type === 'tool_use' && part.type === 'tool') rootParts.push(part);
  }
  for (const e of exports) {
    const info = e.info || {};
    sessions[info.id] = info.parentID || null;
  }
  // An export can fail; the root session's own tool calls are also in the run
  // stream, so fall back to those rather than read an empty session.
  if (!Object.values(sessions).includes(null)) {
    exports.push({ info: { id: 'root' }, messages: [{ parts: rootParts }] });
    sessions.root = null;
  }
  const depth = (id) => { let d = 0; while (id && sessions[id]) { id = sessions[id]; d++; } return d; };
  for (const e of exports) {
    const sid = (e.info || {}).id;
    const d = depth(sid);
    out.max_depth = Math.max(out.max_depth, d);
    for (const m of e.messages || []) {
      for (const part of m.parts || []) {
        if (part.type !== 'tool') continue;
        const st = part.state || {};
        const t = [text(st.output), text(st.error)].filter(Boolean).join('\n');
        out.tool_output.push(t);
        if (d > 0) out.sub_tool_output.push(t);
        if (part.tool === 'task' && d === 0) {
          out.sub_input.push(text((st.input || {}).prompt));
          out.sub_type.push(text((st.input || {}).subagent_type));
          out.sub_output.push(text(st.output));
        }
        if (part.tool === 'skill' && st.status === 'completed') out.skills.push(text((st.input || {}).name));
      }
    }
  }
}

({ 'claude-code': claude, codex, opencode })[harness]();
if (kind === 'max_depth') console.log(out.max_depth);
else if (kind in out) { const v = out[kind].filter(Boolean); if (v.length) console.log(v.join('\n')); }
else { console.error(`events.js: unknown KIND ${kind}`); process.exit(2); }
