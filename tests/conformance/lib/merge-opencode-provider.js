#!/usr/bin/env node
'use strict';
// Usage: merge-opencode-provider.js SRC DST MODEL
// Copies only provider.llamacpp from the user's opencode.json (SRC) into the
// scratch one (DST), and sets the model. It MERGES: live.sh runs this before
// every row but installs fx only before the first, so a rewrite would drop the
// plugin entry, mcp and subagent_depth from every later row (task 23, PD1).
// Exit 3: SRC has no provider.llamacpp.
const fs = require('fs');
const [src, dst, model] = process.argv.slice(2);
let p;
try { p = JSON.parse(fs.readFileSync(src, 'utf8')).provider.llamacpp; } catch { p = null; }
if (!p) process.exit(3);
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(dst, 'utf8')); } catch {}
Object.assign(cfg, { model, autoupdate: false, share: 'disabled', provider: { llamacpp: p } });
fs.writeFileSync(dst, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
fs.chmodSync(dst, 0o600);
