#!/usr/bin/env node
'use strict';
// OpenRouter as the live provider (FX_LIVE_PROVIDER=openrouter). Pure helpers,
// plus a small CLI so live.sh and run.sh reach them through `node`:
//   openrouter.js env <harness> <model>            NAME=value lines
//   openrouter.js setup <harness> <model> <home>   write the config fragments under <home>
//   openrouter.js model <harness> <logfile>        the session's own model, or nothing
//   openrouter.js child  LOG  print the match for a subagent provider error, exit 0 on one
//   openrouter.js error   (env E = CLI error events, S = stderr)  print the match, exit 0 on a provider error
//   openrouter.js leaks <file> [keyfile]           exit 10 when the file holds a key (or the keyfile's value),
//                                                  0 when clean; any other exit is a scan failure, never "clean"
// The key is never in a file or an env value: every config reads it from
// OPENROUTER_API_KEY, and live.sh itself sets ANTHROPIC_AUTH_TOKEN.
const fs = require('fs');
const path = require('path');

const MODELS = {
  primary: 'qwen/qwen3.8-27b:free',
  fallback: 'deepseek/deepseek-v4-flash',
  claude: 'anthropic/claude-haiku-4.5',
};

// A re-run of the same row rewrites the fragment. Codex rewrites the file on
// `plugin add` (comments move), so the old fragment is found by its keys and
// tables, never by a fence, and the plugin tables after it stay.
const OLD_KEYS = /^model(?:_provider)? = .*\n/gm;
const OLD_TABLES = /^\[(?:model_providers\.openrouter(?:\.auth)?|agents)\]\n(?:(?!\[)[^\n]*\n)*/gm;
// Top-level keys only: a `model` key inside another table is not ours.
function stripOld(toml) {
  const i = toml.search(/^\[/m);
  const head = i < 0 ? toml : toml.slice(0, i), rest = i < 0 ? '' : toml.slice(i);
  return head.replace(OLD_KEYS, '') + rest.replace(OLD_TABLES, '');
}

function providerSetup(harness, model) {
  const ref = `openrouter/${model}`;
  switch (harness) {
    case 'codex':
      return { env: {}, files: { '.codex/config.toml': [
        `model = "${model}"`,
        'model_provider = "openrouter"',
        '',
        '[model_providers.openrouter]',
        'name = "openrouter"',
        'base_url = "https://openrouter.ai/api/v1"',
        '',
        '[model_providers.openrouter.auth]',
        'command = "sh"',
        'args = ["-c", "echo $OPENROUTER_API_KEY"]',
        '',
        // A V1 model nests one level by default and no plugin can raise it
        // (references/harnesses/codex.md); a user can, and rows 15 and 18 need
        // a child that can dispatch. V2 models ignore the key.
        '[agents]',
        'max_depth = 2',
        '',
      ].join('\n') } };
    case 'opencode':
      return { env: {}, files: { '.config/opencode/opencode.json': JSON.stringify({
        model: ref, autoupdate: false, share: 'disabled',
        provider: { openrouter: { options: { apiKey: '{env:OPENROUTER_API_KEY}' }, models: { [model]: {} } } },
      }, null, 2) } };
    case 'opencode-v2':
      return { env: {}, files: { '.config/opencode/opencode.json': JSON.stringify({
        model: ref, autoupdate: false, share: 'disabled',
        providers: { openrouter: { apiKey: '{env:OPENROUTER_API_KEY}' } },
      }, null, 2) } };
    case 'claude-code':
      return { files: {}, env: {
        ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
        ANTHROPIC_API_KEY: '',
        ANTHROPIC_MODEL: model,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
        ANTHROPIC_DEFAULT_SONNET_MODEL: model,
        ANTHROPIC_DEFAULT_OPUS_MODEL: model,
      } };
    default:
      throw new Error(`unknown harness: ${harness}`);
  }
}

// Only what the CLI itself reports: the error events live.sh extracts, and the
// CLI's stderr. Never assistant text or tool output, which a model could forge.
// And only what an upstream HTTP error looks like: a status line, a JSON
// status, "API Error: 503", or OpenRouter's own "Insufficient credits". A bare
// "error ... 500" or "Unauthorized" is any tool's text and proves nothing. A
// timeout is not one either: it needs one of these beside it.
const STATUS = '(?:401|429|5\\d\\d)';
const PROVIDER_ERROR = new RegExp([
  'Insufficient credits',
  `\\bHTTP/[\\d.]+ ${STATUS}\\b`,
  `\\b(?:last |http )status(?: code)?[:= ]+${STATUS}\\b`,
  `"(?:status|statusCode|code)"\\s*:\\s*${STATUS}\\b`,
  `\\bAPI Error:? ${STATUS}\\b`,
  `\\b${STATUS} (?:Unauthorized|Too Many Requests|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\\b`,
].join('|'), 'i');
function providerErrorReason(cliErrors, stderr) {
  const m = PROVIDER_ERROR.exec(`${cliErrors}\n${stderr}`);
  return m ? m[0] : null;
}
const isProviderError = (cliErrors, stderr) => providerErrorReason(cliErrors, stderr) !== null;

// A provider error inside a subagent spawn: the CLI's own stream line for a
// collab tool call, whose agent state is errored with the child's last error
// (Codex). Only that state's message is matched, with the same HTTP shapes as
// above; the spawn's prompt, a model's text and tool output are never read.
function childProviderError(logText) {
  for (const j of lines(logText)) {
    // The exec stream (a direct child) or a rollout's event_msg (a grandchild,
    // seen by the child that waited for it).
    const item = j.type === 'item.completed' ? j.item : j.type === 'event_msg' && j.payload ? j.payload.item : null;
    if (!item || (item.type !== 'collab_tool_call' && item.type !== 'CollabAgentToolCall')) continue;
    for (const st of Object.values(item.agents_states || {})) {
      const msg = st && (st.status === 'errored' ? st.message : st.errored);
      const m = typeof msg === 'string' ? PROVIDER_ERROR.exec(msg) : null;
      if (m) return m[0];
    }
  }
  return null;
}

function lines(text) {
  const out = [];
  for (const l of String(text).split('\n')) { try { out.push(JSON.parse(l)); } catch { /* not JSON */ } }
  return out;
}
// The model the session reported in its own event, as reported. Claude Code:
// system/init. Codex: turn_context in the rollout. OpenCode: the assistant
// message in the session export live.sh appends.
function sessionModel(harness, logText) {
  for (const j of lines(logText)) {
    if (harness === 'claude-code' && j.type === 'system' && j.subtype === 'init' && j.model) return j.model;
    if (harness === 'codex' && j.type === 'turn_context' && j.payload && j.payload.model) return j.payload.model;
    if ((harness === 'opencode' || harness === 'opencode-v2') && j.fx_export) {
      for (const m of j.fx_export.messages || []) {
        const x = m.info || m;
        const id = x.modelID || (x.model && (x.model.modelID || x.model.id)) || (typeof x.model === 'string' ? x.model : null);
        if (id && (x.role === 'assistant' || m.type === 'assistant' || harness === 'opencode-v2')) return id;
      }
    }
  }
  return null;
}

// A key-shaped prefix, or the key's own value when the caller has it (the value
// need not start with sk-or-, and a prefix scan alone is easy to evade).
const leaksKey = (text, key) => String(text).includes('sk-or-') || (!!key && String(text).includes(key));

// Write a setup's files under home: JSON merges into what is there, anything
// else goes in front of it (TOML top-level keys must precede its tables),
// replacing any earlier copy of the fragment.
function applySetup(setup, home) {
  for (const [rel, body] of Object.entries(setup.files)) {
    const f = path.join(home, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
    let old = ''; try { old = fs.readFileSync(f, 'utf8'); } catch { /* new file */ }
    const next = rel.endsWith('.json')
      ? JSON.stringify({ ...JSON.parse(old || '{}'), ...JSON.parse(body) }, null, 2) + '\n'
      : body + stripOld(old);
    fs.writeFileSync(f, next, { mode: 0o600 });
  }
}

module.exports = { MODELS, providerSetup, isProviderError, childProviderError, sessionModel, leaksKey, applySetup };

if (require.main === module) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'env') for (const [k, v] of Object.entries(providerSetup(a, b).env)) console.log(`${k}=${v}`);
  else if (cmd === 'setup') applySetup(providerSetup(a, b), c);
  else if (cmd === 'model') { const m = sessionModel(a, fs.readFileSync(b, 'utf8')); if (m) console.log(m); }
  else if (cmd === 'error') { const r = providerErrorReason(process.env.E || '', process.env.S || ''); if (r) console.log(r); process.exit(r ? 0 : 1); }
  else if (cmd === 'child') { const r = childProviderError(fs.readFileSync(a, 'utf8')); if (r) console.log(r); process.exit(r ? 0 : 1); }
  else if (cmd === 'leaks') {
    try {
      const key = b ? fs.readFileSync(b, 'utf8').trim() : (process.env.OPENROUTER_API_KEY || '');
      process.exit(leaksKey(fs.readFileSync(a, 'utf8'), key) ? 10 : 0);
    } catch (e) { console.error(`leak scan failed: ${e.message}`); process.exit(3); }
  }
  else { console.error('usage: openrouter.js env|setup|model|error|child|leaks ...'); process.exit(2); }
}
