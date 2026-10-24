#!/usr/bin/env node
// OpenRouter as the live provider (FX_LIVE_PROVIDER=openrouter). Pure helpers,
// plus a small CLI so live.sh and run.sh reach them through `node`:
//   openrouter.js env <harness> <model>            NAME=value lines
//   openrouter.js setup <harness> <model> <home>   write the config fragments under <home>
//   openrouter.js model <harness> <logfile>        the session's own model, or nothing
//   openrouter.js child  LOG HARNESS  print a subagent provider error and exit 0; exit 1 for none, 3 if the log cannot be read
//   openrouter.js error   (env E = CLI error events, S = stderr)  print the match, exit 0 on a provider error
//   openrouter.js leaks <file> [keyfile]           exit 10 when the file holds a key (or the keyfile's value),
//                                                  0 when clean; any other exit is a scan failure, never "clean"
// The key is never in a file or an env value: every config reads it from
// OPENROUTER_API_KEY, and live.sh itself sets ANTHROPIC_AUTH_TOKEN.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../../../lib/json.js';

export const MODELS = {
  primary: 'qwen/qwen3.8-27b:free',
  fallback: 'deepseek/deepseek-v4-flash',
  claude: 'anthropic/claude-haiku-4.5',
};

// Session logs and configs are untrusted JSON read as unknown. get() is a
// property read with JavaScript's own failure on null and undefined, so a
// malformed record crashes here as it did before the port.
function get(v: unknown, key: string): unknown {
  if (v === null || v === undefined) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
// What `for (const x of v)` accepts from JSON: an array, or a string by character.
function each(v: unknown): Iterable<unknown> {
  if (typeof v === 'string' || Array.isArray(v)) return v;
  throw new TypeError(`${typeof v} is not iterable`);
}
// readFileSync with Node's own validation of the path, so a missing CLI
// argument fails with Node's message as it did before the port.
function readFile(f: unknown): string {
  return Reflect.apply(fs.readFileSync, fs, [f, 'utf8']);
}

// A re-run of the same row rewrites the fragment. Codex rewrites the file on
// `plugin add` (comments move), so the old fragment is found by its keys and
// tables, never by a fence, and the plugin tables after it stay.
const OLD_KEYS = /^model(?:_provider)? = .*\n/gm;
const OLD_TABLES = /^\[(?:model_providers\.openrouter(?:\.auth)?|agents)\]\n(?:(?!\[)[^\n]*\n)*/gm;
// Top-level keys only: a `model` key inside another table is not ours.
function stripOld(toml: string): string {
  const i = toml.search(/^\[/m);
  const head = i < 0 ? toml : toml.slice(0, i), rest = i < 0 ? '' : toml.slice(i);
  return head.replace(OLD_KEYS, '') + rest.replace(OLD_TABLES, '');
}

interface Setup { env: Record<string, string>; files: Record<string, string> }

export function providerSetup(harness: unknown, model: unknown): Setup {
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
        provider: { openrouter: { options: { apiKey: '{env:OPENROUTER_API_KEY}' }, models: { [String(model)]: {} } } },
      }, null, 2) } };
    case 'opencode-v2':
      return { env: {}, files: { '.config/opencode/opencode.json': JSON.stringify({
        model: ref, autoupdate: false, share: 'disabled',
        providers: { openrouter: { apiKey: '{env:OPENROUTER_API_KEY}' } },
        // A headless run has no one to answer the question tool: a session that
        // calls it ends "Session interrupted: shutdown". The runner denies it,
        // as a non-interactive user would.
        permissions: [{ action: 'question', resource: '*', effect: 'deny' }],
        // The user's own answer, see INSTALL.md: fx does not grant nested dispatch on
        // 2.x, so the scratch config adds the rule a user adds to let general dispatch.
        agents: { general: { permissions: [{ action: 'subagent', resource: '*', effect: 'allow' }] } },
      }, null, 2) } };
    case 'claude-code':
      return { files: {}, env: {
        ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
        ANTHROPIC_API_KEY: '',
        ANTHROPIC_MODEL: String(model),
        ANTHROPIC_DEFAULT_HAIKU_MODEL: String(model),
        ANTHROPIC_DEFAULT_SONNET_MODEL: String(model),
        ANTHROPIC_DEFAULT_OPUS_MODEL: String(model),
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
function providerErrorReason(cliErrors: unknown, stderr: unknown): string | null {
  const m = PROVIDER_ERROR.exec(`${cliErrors}\n${stderr}`);
  return m ? m[0] : null;
}
export const isProviderError = (cliErrors: unknown, stderr: unknown): boolean => providerErrorReason(cliErrors, stderr) !== null;

// A provider error inside a subagent spawn: the CLI's own stream line for a
// collab tool call, whose agent state is errored with the child's last error
// (Codex). Only that state's message is matched, with the same HTTP shapes as
// above; the spawn's prompt, a model's text and tool output are never read.
export function childProviderError(logText: unknown): string | null {
  for (const j of lines(logText)) {
    // OpenCode: the session export's assistant message error, as the CLI wrote it.
    const fx = get(j, 'fx_export');
    if (fx) {
      for (const m of each(get(fx, 'messages') || [])) {
        // 1.x: info.error.data. 2.x: a flat message whose error is
        // {type, message, status} (a real 401 and 400, probe-findings.md section 12).
        const e = get(get(m, 'info') || m, 'error');
        const d = e && (get(e, 'data') || e);
        if (!d) continue;
        const st = new RegExp(`^${STATUS}$`).exec(String(get(d, 'statusCode') || get(d, 'status')));
        const message = get(d, 'message');
        const msg = typeof message === 'string' ? PROVIDER_ERROR.exec(message) : null;
        const hit = st || msg;
        if (hit) return hit[0];
      }
      continue;
    }
    // The exec stream (a direct child) or a rollout's event_msg (a grandchild,
    // seen by the child that waited for it).
    const type = get(j, 'type');
    const payload = get(j, 'payload');
    const item = type === 'item.completed' ? get(j, 'item') : type === 'event_msg' && payload ? get(payload, 'item') : null;
    if (!item || (get(item, 'type') !== 'collab_tool_call' && get(item, 'type') !== 'CollabAgentToolCall')) continue;
    const states: unknown[] = Object.values(get(item, 'agents_states') || {});
    for (const st of states) {
      const msg = st && (get(st, 'status') === 'errored' ? get(st, 'message') : get(st, 'errored'));
      const m = typeof msg === 'string' ? PROVIDER_ERROR.exec(msg) : null;
      if (m) return m[0];
    }
  }
  return null;
}

// The detector must read the whole log or say it could not. A line that opens a
// JSON object and does not parse (a cut stream, a cut rollout) is blind: a
// grandchild's error lives only in its parent's rollout. A Codex log with no
// session_meta has no rollout appended, so a grandchild would be invisible.
// Lines prefixed `stderr: `, `transcript: ` and the like are not stream lines.
export function childCheck(harness: unknown, logText: unknown): string | null {
  for (const l of String(logText).split('\n')) {
    if (!l.startsWith('{')) continue;
    try { parseJson(l); } catch { throw new Error('unparseable JSON line in the session log'); }
  }
  if (harness === 'codex' && !/"type":"session_meta"/.test(String(logText))) throw new Error('no rollout in the Codex session log');
  return childProviderError(logText) || transcriptProviderError(logText);
}

// Claude Code: the session's transcript lines (`transcript: {json}`, subagent
// sidechains included). An API-error entry is the CLI's own flag, not text.
function transcriptProviderError(logText: unknown): string | null {
  for (const l of String(logText).split('\n')) {
    if (!l.startsWith('transcript: {')) continue;
    let j: unknown;
    try { j = parseJson(l.slice(12)); } catch { continue; }
    if (get(j, 'isApiErrorMessage') === true) return String(get(j, 'apiErrorStatus') || get(j, 'error') || 'api error');
  }
  return null;
}

function lines(text: unknown): unknown[] {
  const out: unknown[] = [];
  for (const l of String(text).split('\n')) { try { out.push(parseJson(l)); } catch { /* not JSON */ } }
  return out;
}
// The model the session reported in its own event, as reported. Claude Code:
// system/init. Codex: turn_context in the rollout. OpenCode: the assistant
// message in the session export live.sh appends.
export function sessionModel(harness: unknown, logText: unknown): unknown {
  for (const j of lines(logText)) {
    if (harness === 'claude-code' && get(j, 'type') === 'system' && get(j, 'subtype') === 'init' && get(j, 'model')) return get(j, 'model');
    if (harness === 'codex' && get(j, 'type') === 'turn_context' && get(j, 'payload') && get(get(j, 'payload'), 'model')) return get(get(j, 'payload'), 'model');
    if ((harness === 'opencode' || harness === 'opencode-v2') && get(j, 'fx_export')) {
      for (const m of each(get(get(j, 'fx_export'), 'messages') || [])) {
        const x = get(m, 'info') || m;
        const model = get(x, 'model');
        const id = get(x, 'modelID') || (model && (get(model, 'modelID') || get(model, 'id'))) || (typeof model === 'string' ? model : null);
        if (id && (get(x, 'role') === 'assistant' || get(m, 'type') === 'assistant' || harness === 'opencode-v2')) return id;
      }
    }
  }
  return null;
}

// A key-shaped prefix, or the key's own value when the caller has it (the value
// need not start with sk-or-, and a prefix scan alone is easy to evade).
export const leaksKey = (text: unknown, key?: unknown): boolean => String(text).includes('sk-or-') || (!!key && String(text).includes(String(key)));

// Write a setup's files under home: JSON merges into what is there, anything
// else goes in front of it (TOML top-level keys must precede its tables),
// replacing any earlier copy of the fragment.
export function applySetup(setup: Setup, home: string | undefined): void {
  for (const [rel, body] of Object.entries(setup.files)) {
    // Node's own path validation, so a missing home fails as before (and only when there is a file to write).
    const f: string = Reflect.apply(path.join, path, [home, rel]);
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
    let old = ''; try { old = fs.readFileSync(f, 'utf8'); } catch { /* new file */ }
    // Object() lets the spread take whatever JSON the two files hold, as it did.
    const next = rel.endsWith('.json')
      ? JSON.stringify({ ...Object(parseJson(old || '{}')), ...Object(parseJson(body)) }, null, 2) + '\n'
      : body + stripOld(old);
    fs.writeFileSync(f, next, { mode: 0o600 });
  }
}

if (require.main === module) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'env') for (const [k, v] of Object.entries(providerSetup(a, b).env)) console.log(`${k}=${v}`);
  else if (cmd === 'setup') applySetup(providerSetup(a, b), c);
  else if (cmd === 'model') { const m = sessionModel(a, readFile(b)); if (m) console.log(m); }
  else if (cmd === 'error') { const r = providerErrorReason(process.env.E || '', process.env.S || ''); if (r) console.log(r); process.exit(r ? 0 : 1); }
  else if (cmd === 'child') {
    // exit 0: a provider error in a subagent (printed); 1: none; 3: the log could not be read.
    try { const r = childCheck(b, readFile(a)); if (r) console.log(r); process.exit(r ? 0 : 1); }
    catch (e) { console.error(`child check failed: ${e instanceof Error ? e.message : String(e)}`); process.exit(3); }
  }
  else if (cmd === 'leaks') {
    try {
      const key = b ? readFile(b).trim() : (process.env.OPENROUTER_API_KEY || '');
      process.exit(leaksKey(readFile(a), key) ? 10 : 0);
    } catch (e) { console.error(`leak scan failed: ${e instanceof Error ? e.message : String(e)}`); process.exit(3); }
  }
  else { console.error('usage: openrouter.js env|setup|model|error|child|leaks ...'); process.exit(2); }
}
