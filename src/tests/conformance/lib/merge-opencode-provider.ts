#!/usr/bin/env node
// Usage: merge-opencode-provider.js SRC DST MODEL [opencode-v2]
// Copies only provider.llamacpp from the user's opencode.json (SRC) into the
// scratch one (DST), and sets the model. It MERGES: live.sh runs this before
// every row but installs fx only before the first, so a rewrite would drop the
// plugin entry, mcp and subagent_depth from every later row (task 23, PD1).
// Exit 3: SRC has no provider.llamacpp.
import * as fs from 'fs';
import { parseJson } from '../../../lib/json.js';

const [src = '', dst = '', model, harness] = process.argv.slice(2);
let p: unknown;
try {
  // Any throw (unreadable, not JSON) and any missing level both mean "no provider".
  p = Reflect.get(Object(Reflect.get(Object(parseJson(fs.readFileSync(src, 'utf8'))), 'provider')), 'llamacpp');
} catch { p = null; }
if (!p) process.exit(3);
// DST is whatever JSON it holds. Object.assign and the v2 keys act on it as
// they always did, so an array, a number or null behave as before.
let cfg: unknown = {};
// shortcut: an unreadable DST is replaced by a fresh config without a word (as before the port).
try { cfg = parseJson(fs.readFileSync(dst, 'utf8')); } catch {}
if (cfg === null) throw new TypeError('Cannot convert undefined or null to object');
Object.assign(Object(cfg), { model, autoupdate: false, share: 'disabled', provider: { llamacpp: p } });
// A headless 2.x run has no answerer for the question tool (a session that calls
// it ends "Session interrupted: shutdown"), so deny it. 1.x must not get the key.
if (harness === 'opencode-v2') {
  if (typeof cfg !== 'object') throw new TypeError(`Cannot create property 'permissions' on ${typeof cfg} '${cfg}'`);
  Object.assign(cfg, {
    permissions: [{ action: 'question', resource: '*', effect: 'deny' }],
    // The user's own answer, see INSTALL.md: fx does not grant nested dispatch on 2.x.
    agents: { general: { permissions: [{ action: 'subagent', resource: '*', effect: 'allow' }] } },
  });
}
fs.writeFileSync(dst, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
fs.chmodSync(dst, 0o600);
