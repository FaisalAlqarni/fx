// fx's agents converted to OpenCode v2's agent format, checked with v2's own
// rule: the last matching permission rule wins.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
import { toOpencodeV2Agent, toOpencodeAgent } from '../../lib/agent-dialects.js';

interface Rule { action: string; resource: string; effect: string }

function effect(rules: Rule[], action: string, resource: string) {
  const glob = (p: string, s: string) => new RegExp('^' + p.split('*').map((x: string) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s);
  let out = 'ask';
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}

const refs = path.join(root, 'references');
for (const f of fs.readdirSync(path.join(root, 'agents')).filter((n) => n.endsWith('.md'))) {
  const md = fs.readFileSync(path.join(root, 'agents', f), 'utf8');
  const a = toOpencodeV2Agent(md, { referencesDirs: [refs] });
  assert.strictEqual(a.mode, 'subagent', `${f}: a subagent`);
  assert.ok(a.description && a.description.length > 20, `${f}: has its description`);
  assert.ok(a.system && a.system.length > 100, `${f}: body becomes the system prompt`);
  assert.deepStrictEqual(a.permissions[0], { action: '*', resource: '*', effect: 'deny' }, `${f}: deny everything first`);
  assert.strictEqual(effect(a.permissions, 'read', 'src/x.js'), 'allow', `${f}: can read`);
  assert.strictEqual(effect(a.permissions, 'grep', '*'), 'allow', `${f}: can grep`);
  assert.strictEqual(effect(a.permissions, 'edit', 'src/x.js'), 'deny', `${f}: cannot edit`);
  assert.strictEqual(effect(a.permissions, 'shell', 'rm -rf /'), 'deny', `${f}: cannot run a shell`);
  assert.strictEqual(effect(a.permissions, 'subagent', 'general'), 'deny', `${f}: cannot delegate`);
  assert.strictEqual(effect(a.permissions, 'external_directory', path.join(refs, 'vocab', 'x.md')), 'allow', `${f}: reads fx references`);
  assert.ok(toOpencodeAgent(md, { referencesDirs: [refs] }).permission, `${f}: the v1 converter is unchanged`);
}
console.log('opencode-v2-agent.test.js: OK');
