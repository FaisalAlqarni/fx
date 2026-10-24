#!/usr/bin/env node
// A one-tool MCP server over stdio, for the live conformance probes only.
// Its one tool writes a file, so a refusal is observable as a missing file
// and a success as a present one. It never runs outside a conformance
// scratch home: live.sh adds it to the scratch opencode.json when
// FX_OPENCODE_MCP=1, and nowhere else. The tool writes to any path the caller
// names, resolved from the cwd: nothing here confines it, the scratch home does.
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { parseJson } from '../../../lib/json.js';

const TOOL = {
  name: 'write_marker',
  description: 'Write the word probe to the file at path.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
};

// Property read with JavaScript's own failure on null and undefined: a request
// line of `null` crashed the old server and still does.
function get(v: unknown, key: string): unknown {
  if (v === null || v === undefined) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
// `a && a.b && a.b.c`: stops at the first falsy value, as the original did.
function chain(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) {
    if (!cur) return cur;
    cur = get(cur, k);
  }
  return cur;
}

function reply(id: unknown, result: unknown): void { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function error(id: unknown, code: number, message: string): void { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  let m: unknown;
  // shortcut: an unparseable line gets no JSON-RPC error reply (as before the port); add one if a probe needs it.
  try { m = parseJson(line); } catch { return; }
  const id = get(m, 'id');
  if (id === undefined) return; // a notification, such as notifications/initialized
  const method = get(m, 'method');
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: chain(get(m, 'params'), 'protocolVersion') || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'fxprobe', version: '0' },
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: [TOOL] });
    case 'tools/call': {
      const p = chain(get(m, 'params'), 'arguments', 'path') || '';
      if (!p) return error(id, -32602, 'path is required');
      fs.writeFileSync(Reflect.apply(path.resolve, path, [p]), 'probe\n');
      return reply(id, { content: [{ type: 'text', text: `wrote ${p}` }] });
    }
    default:
      return error(id, -32601, `unknown method ${method}`);
  }
});
