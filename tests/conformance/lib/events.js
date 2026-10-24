#!/usr/bin/env node
// generated from src/tests/conformance/lib/events.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var fs = __toESM(require("fs"));
var import_json = require("../../../lib/json.js");
const kind = process.env.KIND;
const harness = process.env.HARNESS;
const lines = Reflect.apply(fs.readFileSync, fs, [process.argv[2], "utf8"]).split("\n");
const out = {
  answer: [],
  tool_output: [],
  sub_input: [],
  sub_output: [],
  sub_type: [],
  sub_fork: [],
  sub_tool_output: [],
  skills: [],
  skill_attempts: [],
  max_depth: 0
};
function get(v, key) {
  if (v === null || v === void 0) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
function each(v) {
  if (typeof v === "string" || Array.isArray(v)) return v;
  throw new TypeError(`${typeof v} is not iterable`);
}
const records = [];
for (const l of lines) {
  if (!l.startsWith("{")) continue;
  try {
    records.push((0, import_json.parseJson)(l));
  } catch {
  }
}
function text(c) {
  if (c == null) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((x) => text(x)).join("\n");
  if (typeof c === "object") return text(get(c, "text") ?? get(c, "content") ?? get(c, "output") ?? get(c, "message") ?? "");
  return String(c);
}
function claude() {
  const dispatch = /* @__PURE__ */ new Set();
  const skillCalls = {};
  const nested = /* @__PURE__ */ new Set();
  for (const r of records) {
    const top = get(r, "parent_tool_use_id") == null;
    const message = get(r, "message");
    const mc = message ? get(message, "content") : void 0;
    const content = Array.isArray(mc) ? mc : [];
    if (get(r, "type") === "assistant") {
      const sub = !top && dispatch.has(get(r, "parent_tool_use_id"));
      for (const b of content) {
        if (get(b, "type") === "text" && top) out.answer.push(get(b, "text"));
        if (get(b, "type") === "text" && sub) out.sub_output.push(get(b, "text"));
        if (get(b, "type") !== "tool_use") continue;
        const name = get(b, "name");
        const input = get(b, "input");
        if (name === "Agent" || name === "Task") {
          if (top) {
            dispatch.add(get(b, "id"));
            out.sub_input.push(text(input && get(input, "prompt")));
            out.sub_type.push(input && get(input, "subagent_type") || "general-purpose");
          } else nested.add(get(b, "id"));
        }
        if (name === "Skill" && input) skillCalls[String(get(b, "id"))] = get(input, "skill") || get(input, "command") || "";
      }
    }
    if (get(r, "type") === "user") {
      for (const b of content) {
        if (get(b, "type") !== "tool_result") continue;
        const t = text(get(b, "content"));
        const id = get(b, "tool_use_id");
        out.tool_output.push(t);
        if (String(id) in skillCalls) {
          out.skill_attempts.push(skillCalls[String(id)]);
          if (!get(b, "is_error")) out.skills.push(skillCalls[String(id)]);
        }
        if (nested.has(id) && !get(b, "is_error")) out.max_depth = Math.max(out.max_depth, 2);
        if (!top) out.sub_tool_output.push(t);
        if (top && dispatch.has(id)) out.sub_output.push(t);
      }
    }
    if (get(r, "type") === "system" && get(r, "subtype") === "task_notification" && dispatch.has(get(r, "tool_use_id"))) {
      out.sub_output.push(text(get(r, "summary")));
    }
    if (get(r, "type") === "result") {
      const result = get(r, "result");
      if (typeof result === "string") out.answer.push(result);
    }
  }
  if (dispatch.size) out.max_depth = Math.max(out.max_depth, 1);
}
function codex() {
  const parent = {};
  let thread = null;
  const depth = (start) => {
    let t = start, d = 0;
    while (t && parent[String(t)]) {
      t = parent[String(t)];
      d++;
    }
    return d;
  };
  let sawRollout = false;
  const reads = {};
  for (const r of records) {
    const payload = get(r, "payload");
    if (get(r, "type") === "session_meta" && payload) {
      sawRollout = true;
      thread = get(payload, "id");
      if (get(payload, "parent_thread_id")) parent[String(thread)] = get(payload, "parent_thread_id");
      continue;
    }
    const item = get(r, "item");
    if (get(r, "type") === "item.completed" && item && !sawRollout) {
      if (get(item, "type") === "agent_message") out.answer.push(get(item, "text"));
      if (get(item, "type") === "command_execution") out.tool_output.push(text(get(item, "aggregated_output")));
      if (get(item, "type") === "collab_tool_call" && get(item, "tool") === "wait") {
        for (const st of Object.values(get(item, "agents_states") || {})) if (st && get(st, "status") === "completed") out.sub_output.push(text(get(st, "message")));
      }
      continue;
    }
    if (get(r, "type") !== "response_item" || !payload) continue;
    const p = payload;
    const d = depth(thread);
    const ptype = get(p, "type");
    if (ptype === "message" && get(p, "role") === "assistant" && d === 0) out.answer.push(text(get(p, "content")));
    if (ptype === "message" && get(p, "role") === "user" && d === 0) {
      for (const m of text(get(p, "content")).matchAll(/<skill>\s*<name>([^<]+)<\/name>/g)) out.skills.push((m[1] ?? "").trim());
    }
    if ((ptype === "function_call" || ptype === "custom_tool_call") && get(p, "name") === "spawn_agent") {
      if (d === 0) {
        out.sub_input.push(text(get(p, "arguments") || get(p, "input")));
        let a = {};
        try {
          a = (0, import_json.parseJson)(String(get(p, "arguments") || "{}"));
        } catch {
        }
        out.sub_type.push(get(a, "agent_type") || get(a, "role") || "default");
        const forked = get(p, "namespace") === "multi_agent_v2" ? get(a, "fork_turns") !== "none" : get(a, "fork_context") === true;
        out.sub_fork.push(forked ? "forked" : "isolated");
      }
    }
    if (ptype === "function_call" || ptype === "custom_tool_call") {
      const names = [...String(get(p, "arguments") || get(p, "input") || "").matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((m) => m[1] ?? "");
      if (names.length) {
        reads[String(get(p, "call_id"))] = names;
        out.skill_attempts.push(...names);
      }
    }
    if (ptype === "function_call_output" || ptype === "custom_tool_call_output") {
      const t = text(get(p, "output"));
      for (const n of each(reads[String(get(p, "call_id"))] || [])) if (t.includes(`name: ${n}
`)) out.skills.push(n);
      out.tool_output.push(t);
      if (d > 0) out.sub_tool_output.push(t);
    }
    if (ptype === "agent_message" && d === 0 && get(p, "author") && get(p, "author") !== "/root") {
      out.sub_output.push(text(get(p, "content")));
    }
  }
  for (const t of Object.keys(parent)) out.max_depth = Math.max(out.max_depth, depth(t));
}
function opencode() {
  const sessions = {};
  const exports2 = [];
  const rootParts = [];
  for (const r of records) {
    if (get(r, "fx_export")) {
      exports2.push(get(r, "fx_export"));
      continue;
    }
    const part = get(r, "part") || {};
    if (get(r, "type") === "text" && get(part, "text")) out.answer.push(get(part, "text"));
    if (get(r, "type") === "tool_use" && get(part, "type") === "tool") rootParts.push(part);
  }
  for (const e of exports2) {
    const info = get(e, "info") || {};
    sessions[String(get(info, "id"))] = get(info, "parentID") || null;
  }
  if (!Object.values(sessions).includes(null)) {
    exports2.push({ info: { id: "root" }, messages: [{ parts: rootParts }] });
    sessions.root = null;
  }
  const depth = (start) => {
    let id = start, d = 0;
    while (id && sessions[String(id)]) {
      id = sessions[String(id)];
      d++;
    }
    return d;
  };
  for (const e of exports2) {
    const sid = get(get(e, "info") || {}, "id");
    const d = depth(sid);
    out.max_depth = Math.max(out.max_depth, d);
    for (const m of each(get(e, "messages") || [])) {
      for (const part of each(get(m, "parts") || [])) {
        if (get(part, "type") !== "tool") continue;
        const st = get(part, "state") || {};
        const t = [text(get(st, "output")), text(get(st, "error"))].filter(Boolean).join("\n");
        out.tool_output.push(t);
        if (d > 0) out.sub_tool_output.push(t);
        if (get(part, "tool") === "task" && d === 0) {
          out.sub_input.push(text(get(get(st, "input") || {}, "prompt")));
          out.sub_type.push(text(get(get(st, "input") || {}, "subagent_type")));
          out.sub_output.push(text(get(st, "output")));
        }
        if (get(part, "tool") === "skill" && get(st, "status") === "completed") out.skills.push(text(get(get(st, "input") || {}, "name")));
      }
    }
  }
}
function opencodeV2() {
  const sessions = {};
  const parent = {};
  let root = null;
  const rootParts = [];
  for (const r of records) {
    if (get(r, "fx_export")) continue;
    if (get(r, "sessionID") && !root) root = get(r, "sessionID");
    const part = get(r, "part") || {};
    if (get(r, "type") === "text" && get(part, "text")) out.answer.push(get(part, "text"));
    if (get(r, "type") === "tool_use") rootParts.push(part);
  }
  sessions[String(root)] = rootParts;
  for (const r of records) {
    if (!get(r, "fx_export")) continue;
    const e = get(r, "fx_export"), parts = [];
    for (const m of each(get(e, "messages") || [])) {
      const none = [];
      for (const p of none.concat(get(m, "content") || [], get(m, "parts") || [])) {
        if (p && get(p, "type") === "tool") parts.push({ tool: get(p, "name") || get(p, "tool"), state: get(p, "state") });
      }
    }
    const info = get(e, "info") || {};
    if (get(info, "id")) sessions[String(get(get(e, "info"), "id"))] = parts;
  }
  const childOf = (st) => {
    const viaMeta = get(get(get(st, "metadata") || {}, "metadata") || {}, "sessionID");
    return viaMeta || (text(get(st, "output") ?? get(st, "content")).match(/<subagent sessionID="(ses_[A-Za-z0-9]+)"/) || [])[1];
  };
  for (const [sid, parts] of Object.entries(sessions)) {
    for (const p of parts) {
      const st = get(p, "state") || {};
      if (get(p, "tool") === "subagent" && get(st, "status") === "completed" && childOf(st)) parent[String(childOf(st))] = sid;
    }
  }
  const depth = (start) => {
    let id = start, d = 0;
    while (id && parent[String(id)] && d < 20) {
      id = parent[String(id)];
      d++;
    }
    return d;
  };
  for (const c of Object.keys(parent)) out.max_depth = Math.max(out.max_depth, depth(c));
  for (const [sid, parts] of Object.entries(sessions)) {
    const d = depth(sid);
    for (const p of parts) {
      const st = get(p, "state") || {};
      const t = [text(get(st, "output") ?? get(st, "content")), text(get(st, "error"))].filter(Boolean).join("\n");
      out.tool_output.push(t);
      if (d > 0) out.sub_tool_output.push(t);
      if (get(p, "tool") === "subagent" && d === 0) {
        out.sub_input.push(text(get(get(st, "input") || {}, "prompt")));
        out.sub_type.push(text(get(get(st, "input") || {}, "agent")));
        out.sub_output.push(text(get(st, "output") ?? get(st, "content")));
      }
      if (get(p, "tool") === "skill") {
        const n = text(get(get(st, "input") || {}, "name"));
        out.skill_attempts.push(n);
        if (get(st, "status") === "completed") out.skills.push(n);
      }
    }
  }
}
const readers = { "claude-code": claude, codex, opencode, "opencode-v2": opencodeV2 };
const reader = Reflect.get(readers, String(harness));
if (typeof reader !== "function") throw new TypeError(`${String(harness)} is not a function`);
Reflect.apply(reader, readers, []);
if (kind === "max_depth") console.log(out.max_depth);
else if (String(kind) in out) {
  const list = Reflect.get(out, String(kind));
  if (!Array.isArray(list)) throw new TypeError(`out[kind].filter is not a function`);
  const v = list.filter(Boolean);
  if (v.length) console.log(v.join("\n"));
} else {
  console.error(`events.js: unknown KIND ${kind}`);
  process.exit(2);
}
