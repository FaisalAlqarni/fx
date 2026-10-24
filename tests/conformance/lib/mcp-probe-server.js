#!/usr/bin/env node
// generated from src/tests/conformance/lib/mcp-probe-server.ts by scripts/build: edit there, not here
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
var path = __toESM(require("path"));
var readline = __toESM(require("readline"));
var import_json = require("../../../lib/json.js");
const TOOL = {
  name: "write_marker",
  description: "Write the word probe to the file at path.",
  inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
};
function get(v, key) {
  if (v === null || v === void 0) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
function chain(v, ...keys) {
  let cur = v;
  for (const k of keys) {
    if (!cur) return cur;
    cur = get(cur, k);
  }
  return cur;
}
function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let m;
  try {
    m = (0, import_json.parseJson)(line);
  } catch {
    return;
  }
  const id = get(m, "id");
  if (id === void 0) return;
  const method = get(m, "method");
  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: chain(get(m, "params"), "protocolVersion") || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "fxprobe", version: "0" }
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: [TOOL] });
    case "tools/call": {
      const p = chain(get(m, "params"), "arguments", "path") || "";
      if (!p) return error(id, -32602, "path is required");
      fs.writeFileSync(Reflect.apply(path.resolve, path, [p]), "probe\n");
      return reply(id, { content: [{ type: "text", text: `wrote ${p}` }] });
    }
    default:
      return error(id, -32601, `unknown method ${method}`);
  }
});
