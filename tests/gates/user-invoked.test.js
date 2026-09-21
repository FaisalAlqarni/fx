'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];

const frontmatter = (p) => {
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, `${p} has no frontmatter`);
  return { head: m[1], body: m[2] };
};

for (const name of HIDDEN) {
  const skill = path.join(root, 'skills', name, 'SKILL.md');
  const { head } = frontmatter(skill);
  assert.ok(/^disable-model-invocation:\s*true$/m.test(head),
    `${name}: Claude Code must not auto-select it`);

  const sidecar = path.join(root, 'skills', name, 'agents', 'openai.yaml');
  const yaml = fs.readFileSync(sidecar, 'utf8');
  assert.ok(/allow_implicit_invocation:\s*false/.test(yaml),
    `${name}: Codex must not auto-select it`);
}

// The command body is the source of truth, modulo reference depth.
const deepen = (s) => s.replace(/\.\.\/(references|agents)\//g, '../../$1/');
for (const name of ['fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup']) {
  const cmd = frontmatter(path.join(root, 'commands', `${name}.md`));
  const skill = frontmatter(path.join(root, 'skills', name, 'SKILL.md'));
  assert.strictEqual(skill.body.trim(), deepen(cmd.body).trim(),
    `${name}: skill body has drifted from the command body`);
  // A one-level citation is `../references/` or `../agents/` not already
  // preceded by another `../` (which would make it two-level, correct at
  // skill depth). The task's own regex, `/(^|[^.])\.\.\/(...)\//m`, treats
  // the `/` inside a two-level `../../references/` as "not a dot" and flags
  // the correctly-deepened citation too: fixed with a negative lookbehind
  // instead of a preceding-character class.
  assert.ok(!/(?<!\.\.\/)\.\.\/(references|agents)\//.test(skill.body),
    `${name}: a one-level citation in a skill body breaks check-paths`);
}

// Nothing else is hidden. Check the FRONTMATTER only: skills/fx-authoring
// legitimately documents this field in its body, and matching the whole file
// makes this assertion red against correct content.
for (const dir of fs.readdirSync(path.join(root, 'skills'))) {
  if (HIDDEN.includes(dir)) continue;
  const p = path.join(root, 'skills', dir, 'SKILL.md');
  if (!fs.existsSync(p)) continue;
  assert.ok(!/^disable-model-invocation:/m.test(frontmatter(p).head),
    `${dir}: only user-invoked lanes are hidden`);
}

// Fix round 1: `skills/<name>/agents/openai.yaml` only hides fx's OWN copy
// of a lane. Codex separately auto-migrates `commands/<name>.md` into its
// own generated skill under `.codex-plugin/migrated-command-skills/
// source-command-<name>/`, with no sidecar and no hiding of any kind, and a
// live probe (throwaway CODEX_HOME, `codex debug prompt-input`) showed
// `fx-handoff` exposed there while the other three were not.
//
// Isolated with a dozen live installs, holding one variable at a time: the
// migrator silently SKIPS a command whose frontmatter fails strict YAML
// parsing (confirmed: a raw, unquoted `: ` inside `description` is
// sufficient to fail the parse and block migration; the identical text
// wrapped in quotes — valid YAML — migrates). Three of the four
// command-derived skills' source commands already had this property by
// accident, from an unescaped colon in their description prose;
// `fx-handoff`'s did not, and its migrated copy was the exposed lane.
//
// This pins the property deliberately for all four, so a future edit that
// "cleans up" one of these descriptions (quoting it, or removing the colon)
// cannot silently reopen the hole. It is a real but undocumented Codex
// behaviour, not a documented switch: if a future Codex release tolerates
// this YAML, the hole reopens with no local warning — see the fix-round-1
// report for the residual risk.
for (const name of ['fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup']) {
  const cmd = frontmatter(path.join(root, 'commands', `${name}.md`));
  const m = cmd.head.match(/^description:[ \t]*(.+)$/m);
  assert.ok(m, `${name}: commands/${name}.md has no single-line description field`);
  const value = m[1].trim();
  const quoted = /^"([^"\\]|\\.)*"$/.test(value) || /^'([^']|'')*'$/.test(value);
  assert.ok(!quoted && /: /.test(value),
    `${name}: description has no unquoted colon-space, so Codex's own ` +
    `command-to-skill auto-migration will not skip it, and the lane ships ` +
    `unhidden as source-command-${name}`);
}

console.log('user-invoked.test.js: OK');
