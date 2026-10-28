import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { USER_INVOKED_LANES } from '../../lib/user-invoked-lanes.js';

const root = path.join(__dirname, '..', '..');

const frontmatter = (p: string) => {
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, `${p} has no frontmatter`);
  return { head: m[1] ?? '', body: m[2] ?? '' };
};

// The hidden set is whatever the skills' frontmatter says. lib/user-invoked-lanes.js
// carries the one copy the opencode plugins use; it must equal that set, and
// neither plugin may keep a list of its own.
const HIDDEN = fs.readdirSync(path.join(root, 'skills'))
  .filter((d) => fs.existsSync(path.join(root, 'skills', d, 'SKILL.md'))
    && /^disable-model-invocation:\s*true$/m.test(frontmatter(path.join(root, 'skills', d, 'SKILL.md')).head))
  .sort();
assert.deepStrictEqual(HIDDEN, ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro', 'fx-setup', 'fx-system-flow', 'fx-what'], 'nine lanes are user-invoked');
assert.deepStrictEqual([...USER_INVOKED_LANES].sort(), HIDDEN,
  'the opencode plugins hide exactly the lanes whose frontmatter says disable-model-invocation');
// The README's lane count follows the skills: every model-selectable skill but fx-plan and
// fx-implement works with no plan.
{
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const lanes = fs.readdirSync(path.join(root, 'skills')).filter((d) => fs.existsSync(path.join(root, 'skills', d, 'SKILL.md')) && !HIDDEN.includes(d)).length;
  const said = `${WORDS[lanes - 2] ?? ''} of the ${WORDS[lanes] ?? ''} work on their own`;
  assert.ok(fs.readFileSync(path.join(root, 'README.md'), 'utf8').toLowerCase().includes(said), `README.md says "${said}"`);
}
for (const plugin of ['fx-opencode-v1.js', 'fx-opencode-v2.js']) {
  assert.ok(!/fx-critique/.test(fs.readFileSync(path.join(root, 'plugins', plugin), 'utf8')), `${plugin} imports the lane list, it keeps no copy`);
}

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
const deepen = (s: string) => s.replace(/\.\.\/(references|agents)\//g, '../../$1/');
for (const name of ['fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro', 'fx-setup', 'fx-what']) {
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

// fx-system-flow: the lane and its sidecars carry the text the plan names.
{
  const dir = path.join(root, 'skills', 'fx-system-flow');
  const lane = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.ok(/^disable-model-invocation:\s*true$/m.test(frontmatter(path.join(dir, 'SKILL.md')).head), 'fx-system-flow is user-invoked');
  for (const s of ['system-flow estimate', 'system-flow check --fragment', 'detect --repo', '--archify', 'at most 4',
    'It never commits; the owner runs git.',
    'questions. Answer one at a time, skip, or take the recommended answer for every question.']) {
    assert.ok(lane.includes(s), `fx-system-flow SKILL.md says ${s}`);
  }
  // The shared ids exist before any area runs: chapters and level 0 are written
  // and checked in the planning pass, ahead of the dispatch in step 3.
  const planStep = lane.indexOf('### 2. Plan'), dispatch = lane.indexOf('### 3. Investigate');
  const sharedAt = lane.indexOf('`chapters.json` and `level0.json`');
  assert.ok(planStep >= 0 && sharedAt > planStep && sharedAt < dispatch, 'fx-system-flow writes chapters.json and level0.json in step 2, before the dispatch');
  const sidecar: Record<string, string[]> = {
    'planning.md': ['filesToRead', 'levels', 'meta.roots', 'before any area is dispatched', '<area id>-l1'],
    'area-brief.md': ['level 3', '8 to 12 primary nodes', 'context nodes', '<area id>-l1', 'section ids'],
    'fragment-guide.md': ['starts with its area id', '<kind>:<id>'],
    'interview.md': ['Every question carries a recommended answer'],
    'check-and-report.md': ['depth', 'planned'],
  };
  for (const [file, needs] of Object.entries(sidecar)) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const s of needs) assert.ok(text.includes(s), `fx-system-flow ${file} says ${s}`);
  }
}

// fx-adr is a model-selectable lane.
{
  const adr = path.join(root, 'skills', 'fx-adr', 'SKILL.md');
  assert.ok(fs.existsSync(adr), 'skills/fx-adr/SKILL.md exists');
  assert.ok(!/^disable-model-invocation:/m.test(frontmatter(adr).head), 'fx-adr is model-selectable');
}

// fx-docs is a model-selectable lane.
{
  const docs = path.join(root, 'skills', 'fx-docs', 'SKILL.md');
  assert.ok(fs.existsSync(docs), 'skills/fx-docs/SKILL.md exists');
  assert.ok(!/^disable-model-invocation:/m.test(frontmatter(docs).head), 'fx-docs is model-selectable');
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
// wrapped in quotes, valid YAML, migrates). Three of the four
// command-derived skills' source commands already had this property by
// accident, from an unescaped colon in their description prose;
// `fx-handoff`'s did not, and its migrated copy was the exposed lane.
//
// This pins the property deliberately for all four, so a future edit that
// "cleans up" one of these descriptions (quoting it, or removing the colon)
// cannot silently reopen the hole. It is a real but undocumented Codex
// behaviour, not a documented switch: if a future Codex release tolerates
// this YAML, the hole reopens with no local warning, see the fix-round-1
// report for the residual risk.
for (const name of ['fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro', 'fx-setup', 'fx-what']) {
  const cmd = frontmatter(path.join(root, 'commands', `${name}.md`));
  const m = cmd.head.match(/^description:[ \t]*(.+)$/m);
  assert.ok(m, `${name}: commands/${name}.md has no single-line description field`);
  const value = (m[1] ?? '').trim();
  const quoted = /^"([^"\\]|\\.)*"$/.test(value) || /^'([^']|'')*'$/.test(value);
  assert.ok(!quoted && /: /.test(value),
    `${name}: description has no unquoted colon-space, so Codex's own ` +
    `command-to-skill auto-migration will not skip it, and the lane ships ` +
    `unhidden as source-command-${name}`);
}

// Fix round 1, Important: an unquoted `argument-hint: [name]` parses under
// strict YAML as a one-element flow-sequence array, not the string the field
// is meant to carry. Every argument-hint must be a quoted scalar.
for (const name of ['fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro']) {
  const cmd = frontmatter(path.join(root, 'commands', `${name}.md`));
  const m = cmd.head.match(/^argument-hint:[ \t]*(.+)$/m);
  assert.ok(m, `${name}: commands/${name}.md has no argument-hint field`);
  const value = (m[1] ?? '').trim();
  const quoted = /^"([^"\\]|\\.)*"$/.test(value) || /^'([^']|'')*'$/.test(value);
  assert.ok(quoted, `${name}: argument-hint must be a quoted string, got ${value}`);

  const skill = frontmatter(path.join(root, 'skills', name, 'SKILL.md'));
  const sm = skill.head.match(/^argument-hint:[ \t]*(.+)$/m);
  assert.ok(sm, `${name}: generated skills/${name}/SKILL.md has no argument-hint field`);
  assert.strictEqual((sm[1] ?? '').trim(), value,
    `${name}: generated argument-hint has drifted from the command's`);
}

// Final review I5: Claude Code registered each user-invoked lane twice, once
// from commands/ and once from its generated skill (`plugin details` listed
// 21 skills), and the command copy was model-invocable. The manifest declares
// `commands: []`, which replaces the commands/ scan (ADR 0017), so only the
// generated skills register; commands/ stays the source they are generated
// from. The commands carry the flag too, for any runtime that reads them raw.
{
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')); // ts-gate-ok: the test parses a repository file
  assert.deepStrictEqual(manifest.commands, [],
    'the Claude Code manifest declares no command paths, so commands/ is not registered beside the generated skills');
  for (const file of fs.readdirSync(path.join(root, 'commands')).filter((f) => f.endsWith('.md'))) {
    const { head } = frontmatter(path.join(root, 'commands', file));
    assert.ok(/^disable-model-invocation:\s*true$/m.test(head), `commands/${file}: the model must not invoke it`);
    const name = file.slice(0, -3);
    assert.ok(fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')),
      `commands/${file} has no generated skills/${name}/SKILL.md, so with commands: [] it is unreachable`);
  }
}

// Final review I5, gap 6: what the fx-pr and fx-retro commands promise.
const pr = fs.readFileSync(path.join(root, 'skills', 'fx-pr', 'SKILL.md'), 'utf8');
const prTemplate = fs.readFileSync(path.join(root, 'references', 'templates', 'pr-template.md'), 'utf8');
assert.ok(pr.includes('references/templates/pr-template.md'), 'fx-pr names its template');
for (const h of ['## What and why', '## Changes', '## Evidence', '## Merge danger']) assert.ok(prTemplate.includes(`\n${h}\n`), `the PR template has the ${h} section`);
assert.ok(pr.includes('Never run `git push`'), 'fx-pr never pushes');
assert.ok(prTemplate.includes('`Not run:`'), 'the PR template ends its evidence with a Not run: line');
const retro = fs.readFileSync(path.join(root, 'skills', 'fx-retro', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');
assert.ok(retro.includes('**Citation or drop.**'), 'fx-retro drops a candidate without a citation');
assert.ok(retro.includes('Never quote a credential, token, key or personal data from a transcript') && retro.includes('`[redacted]`'),
  'fx-retro redacts credentials and personal data');

console.log('user-invoked.test.js: OK');
