#!/usr/bin/env node
'use strict';
// A one-tool MCP server over stdio, for the live conformance probes only.
// Its one tool writes a file, so a refusal is observable as a missing file
// and a success as a present one. It never runs outside a conformance
// scratch home: live.sh adds it to the scratch opencode.json when
// FX_OPENCODE_MCP=1, and nowhere else.
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TOOL = {
  name: 'write_marker',
  description: 'Write the word probe to the file at path.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
};

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function error(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return; // a notification, such as notifications/initialized
  switch (m.method) {
    case 'initialize':
      return reply(m.id, {
        protocolVersion: (m.params && m.params.protocolVersion) || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'fxprobe', version: '0' },
      });
    case 'ping':
      return reply(m.id, {});
    case 'tools/list':
      return reply(m.id, { tools: [TOOL] });
    case 'tools/call': {
      const p = (m.params && m.params.arguments && m.params.arguments.path) || '';
      if (!p) return error(m.id, -32602, 'path is required');
      fs.writeFileSync(path.resolve(p), 'probe\n');
      return reply(m.id, { content: [{ type: 'text', text: `wrote ${p}` }] });
    }
    default:
      return error(m.id, -32601, `unknown method ${m.method}`);
  }
});
