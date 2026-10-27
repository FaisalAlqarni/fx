// Task 16 fix round 1. fx-setup's Codex command loads lib/plant-roles.js
// from FX, a path the agent infers. A repo file could steer that inference,
// so the command vets FX before it requires anything from it. The vetting is
// inline in the command: a check loaded from FX could not vet FX, because a
// fake root would ship its own check.
//
// FX is never typed by the agent: the command takes this skill's own base
// directory in FX_SKILL_DIR, an environment variable in single quotes, and
// derives the root two levels up. A path holding `$`, a backtick or `"` cannot
// break the shell line or expand.
//
// This runs the command exactly as commands/fx-setup.md ships it, with the
// base directory substituted, from a scratch repo as cwd, against a scratch
// CODEX_HOME.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const root = path.join(__dirname, '..', '..');
const md = fs.readFileSync(path.join(root, 'commands', 'fx-setup.md'), 'utf8');
const fenced = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((m) => (m[1] ?? '').trim());
const PREFIX = "FX_SKILL_DIR='SKILL_DIR' node -e '";
const blocks = fenced.filter((b) => b.includes('plant-roles'));
assert.strictEqual(blocks.length, 1, `one command loads plant-roles, found ${blocks.length}`);
const command = blocks[0] ?? '';
assert.ok(command.startsWith(PREFIX), 'the command takes the skill base directory in FX_SKILL_DIR');
assert.ok(!command.slice(PREFIX.length).includes('SKILL_DIR\''), 'the base directory is substituted in one place only');

const s = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-setup-root-'));
process.on('exit', () => fs.rmSync(s, { recursive: true, force: true }));
const repo = path.join(s, 'repo');
fs.mkdirSync(repo);

// Single-quoted for the shell, the way the agent substitutes it.
const shq = (v: string) => `'${v.replace(/'/g, `'\\''`)}'`;
const withBase = (cmd: string, base: string) => cmd.replace("'SKILL_DIR'", shq(base));

// A fake fx root: the manifest, PREAMBLE.md, skills/fx-setup/SKILL.md, and a
// plant-roles that leaves a marker when it is loaded.
const marker = path.join(s, 'fake-loaded');
function fakeRoot(dir: string, { manifest = true }: { manifest?: boolean } = {}) {
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'skills', 'fx-setup'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'fx-setup', 'SKILL.md'), '# fx-setup\n');
  if (manifest) {
    fs.mkdirSync(path.join(dir, '.codex-plugin'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.codex-plugin', 'plugin.json'), '{"name":"fx"}');
  }
  fs.writeFileSync(path.join(dir, 'PREAMBLE.md'), '# fx\n');
  fs.writeFileSync(path.join(dir, 'lib', 'plant-roles.js'),
    `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x'); module.exports = {};`);
  return dir;
}
const skillDir = (fx: string) => path.join(fx, 'skills', 'fx-setup');
function run(base: string, cwd = repo) {
  const env = { ...process.env, HOME: s, TMPDIR: s, CODEX_HOME: path.join(s, 'codex') };
  return spawnSync('bash', ['-c', withBase(command, base)], { cwd, env, encoding: 'utf8' });
}
function refused(base: string, label: string) {
  const r = run(base);
  assert.notStrictEqual(r.status, 0, `${label}: must be refused`);
  assert.match(r.stderr, /refusing/i, `${label}: says why (${r.stderr.trim()})`);
  assert.ok(!fs.existsSync(marker), `${label}: nothing was loaded from it`);
  assert.ok(!fs.existsSync(path.join(s, 'codex', 'agents')), `${label}: nothing was planted`);
}

refused(skillDir(fakeRoot(path.join(repo, 'vendor', 'fx'))), 'a fake root inside cwd');
refused(path.join(repo, 'skills', 'fx-setup'), 'cwd itself');
refused(skillDir(fakeRoot(path.join(s, 'no-manifest'), { manifest: false })), 'a root without an fx manifest');
fs.mkdirSync(path.join(s, 'no-preamble', '.claude-plugin'), { recursive: true });
fs.mkdirSync(skillDir(path.join(s, 'no-preamble')), { recursive: true });
fs.writeFileSync(path.join(s, 'no-preamble', '.claude-plugin', 'plugin.json'), '{"name":"fx"}');
refused(skillDir(path.join(s, 'no-preamble')), 'a root without PREAMBLE.md');
fs.symlinkSync(path.join(repo, 'vendor', 'fx'), path.join(s, 'link-into-repo'));
refused(skillDir(path.join(s, 'link-into-repo')), 'a symlink outside cwd that resolves inside it');
const other = fakeRoot(path.join(s, 'other'));
fs.mkdirSync(path.join(other, 'skills', 'not-setup'), { recursive: true });
refused(path.join(other, 'skills', 'not-setup'), 'a base directory that is not skills/fx-setup');
refused(other, 'the plugin root given in place of the skill directory');

const ok = run(skillDir(root));
assert.strictEqual(ok.status, 0, `the real plugin root passes: ${ok.stderr}`);
const out = JSON.parse(ok.stdout); // ts-gate-ok: the test parses output it just produced
assert.strictEqual(out.written.length, 6, 'all six roles planted on a fresh CODEX_HOME');
assert.strictEqual(out.audit.present.length, 6, 'and audited present');
assert.ok('hooksTrusted' in out, 'and hook trust reported');
assert.strictEqual(out.catalog.skipped, 'no third-party model in config.toml and no slug named', 'no Codex config: the catalog step reports why it did nothing');

// OpenRouter config: the same command writes the profile and reports it; a failing
// `codex` is reported under catalog.error and the roles still print.
const OR_CFG = 'model = "anthropic/claude-haiku-4.5"\nmodel_provider = "openrouter"\n';
function runWithCodex(label: string, stubBody: string, extraEnv: Record<string, string> = {}, cfg = OR_CFG) {
  const dir = fs.mkdtempSync(path.join(s, 'or-'));
  const home = path.join(dir, 'codex-home');
  fs.mkdirSync(home);
  fs.writeFileSync(path.join(home, 'config.toml'), cfg);
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'codex'), `#!/usr/bin/env node\n${stubBody}\n`, { mode: 0o755 });
  const env = { ...process.env, HOME: s, TMPDIR: s, CODEX_HOME: home, ...extraEnv, PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` };
  const r = spawnSync('bash', ['-c', withBase(command, skillDir(root))], { cwd: repo, env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `${label}: exits 0 (${r.stderr})`);
  return { home, out: JSON.parse(r.stdout) }; // ts-gate-ok: the test parses output it just produced
}
const haikuEntry = { slug: 'anthropic/claude-haiku-4.5', display_name: 'Claude Haiku 4.5', context_window: 200000, max_context_window: 200000, include_skills_usage_instructions: false, apply_patch_tool_type: null, base_instructions: 'BASE', model_messages: { instructions_template: 'BASE' }, shell_type: 'unified_exec', visibility: 'list' };
{
  const r = runWithCodex('openrouter', `console.log(${JSON.stringify(JSON.stringify({ models: [haikuEntry] }))});`);
  assert.strictEqual(r.out.catalog.profile, 'fx-openrouter');
  assert.strictEqual(r.out.catalog.command, 'codex --profile fx-openrouter');
  assert.ok(fs.existsSync(path.join(r.home, 'fx-openrouter.config.toml')), 'the profile file is written');
  assert.strictEqual(fs.readFileSync(path.join(r.home, 'config.toml'), 'utf8'), OR_CFG, 'config.toml is byte-identical');
}
{
  const r = runWithCodex('codex fails', 'process.exit(1);');
  assert.ok(typeof r.out.catalog.error === 'string' && r.out.catalog.error.length > 0, 'catalog.error carries the message');
  assert.strictEqual(r.out.written.length, 6, 'the roles are still planted and printed');
}

// A model the user names reaches setupCatalog through FX_CODEX_SLUGS.
{
  const r = runWithCodex('named slug', `console.log(${JSON.stringify(JSON.stringify({ models: [] }))});`, { FX_CODEX_SLUGS: 'anthropic/claude-haiku-4.5' }, '');
  assert.strictEqual(r.out.catalog.profile, 'fx-custom');
  assert.deepStrictEqual(r.out.catalog.slugs, ['anthropic/claude-haiku-4.5']);
}

// The report wording for the Codex catalog is asserted, so a rewrite cannot drop a statement.
{
  const sec = (/^## [^\n]*Codex[^\n]*\n[\s\S]*?(?=^## )/m.exec(md) ?? [''])[0].replace(/\s+/g, ' ');
  assert.ok(sec.includes('FX_CODEX_SLUGS'), 'the Codex section was found');
  for (const [what, re] of [
    ['the profile replaces the remote model list', /replaces Codex's remote model list/],
    ['the cloned window is a guess', /272000\) is Codex's guess/],
    ['kept, refused and error leave config.toml alone', /`kept`, `refused` or `error`[\s\S]*Never edit `config\.toml`/],
    ['the Anthropic limit on OpenRouter', /`anthropic\/`[\s\S]*heredoc/],
    ['FX_CODEX_SLUGS', /FX_CODEX_SLUGS/],
    ['left', /`left`/],
  ] as const) assert.ok(re.test(sec), `section 6 says: ${what}`);
}

// A path holding shell metacharacters reaches node unexpanded.
const odd = path.join(s, 'we$HOME`id`"ird');
fs.symlinkSync(root, odd);
const oddRun = run(skillDir(odd));
assert.strictEqual(oddRun.status, 0, `a path with $, a backtick and " still runs: ${oddRun.stderr}`);

// The glossary migration step is vetted by the same check on every runtime.
const mig = fenced.filter((b) => b.includes('glossary-migrate'));
assert.strictEqual(mig.length, 1, `one command runs glossary-migrate, found ${mig.length}`);
const migCmd = mig[0] ?? '';
assert.ok(migCmd.startsWith(PREFIX), 'the migration command takes the skill base directory in FX_SKILL_DIR');
assert.ok(migCmd.endsWith("' glossary-migrate.js \"\""), 'the migration command ends with the script and mode arguments');
assert.strictEqual(fenced.filter((b) => b.includes('scratch-migrate')).length, 1, 'the scratch step reuses the one command');
function runMig(base: string, cwd: string, script = 'glossary-migrate.js') {
  return spawnSync('bash', ['-c', withBase(migCmd, base).replace("' glossary-migrate.js", `' ${script}`)], { cwd, env: { ...process.env, HOME: s, TMPDIR: s }, encoding: 'utf8' });
}
const fakeMig = fakeRoot(path.join(repo, 'vendor', 'fx2'));
fs.writeFileSync(path.join(fakeMig, 'lib', 'glossary-migrate.js'), `require('fs').writeFileSync(${JSON.stringify(marker + '-mig')}, 'x');`);
const badMig = runMig(skillDir(fakeMig), repo);
assert.notStrictEqual(badMig.status, 0, 'a root inside cwd is refused');
assert.match(badMig.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker + '-mig'), 'and no migration code was loaded from it');
spawnSync('git', ['init', '-q'], { cwd: repo });
const okMig = runMig(skillDir(odd), repo);
assert.strictEqual(okMig.status, 0, `the real plugin root runs the migration dry run: ${okMig.stderr}`);
assert.match(okMig.stdout, /dry run: nothing changed/);

// The scratch step runs through the same check.
const fakeScr = fakeRoot(path.join(repo, 'vendor', 'fx3'));
fs.writeFileSync(path.join(fakeScr, 'lib', 'scratch-migrate.js'), `require('fs').writeFileSync(${JSON.stringify(marker + '-scr')}, 'x');`);
const badScr = runMig(skillDir(fakeScr), repo, 'scratch-migrate.js');
assert.notStrictEqual(badScr.status, 0, 'scratch: a root inside cwd is refused');
assert.match(badScr.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker + '-scr'), 'scratch: and no code was loaded from it');
const okScr = runMig(skillDir(odd), repo, 'scratch-migrate.js');
assert.strictEqual(okScr.status, 0, `the real plugin root runs the scratch dry run: ${okScr.stderr}`);
assert.match(okScr.stdout, /nothing to move/);
const unknown = runMig(skillDir(odd), repo, 'plant-roles.js');
assert.notStrictEqual(unknown.status, 0, 'a script outside the two migrations is refused');
assert.match(unknown.stderr, /refusing/i);

// From a subdirectory of the repository, a root elsewhere in the same repository
// sits outside cwd but inside the repository root, and is refused by both commands.
const sub = path.join(repo, 'app', 'models');
fs.mkdirSync(sub, { recursive: true });
const fakeSib = fakeRoot(path.join(repo, 'vendor', 'fx4'));
fs.writeFileSync(path.join(fakeSib, 'lib', 'scratch-migrate.js'), `require('fs').writeFileSync(${JSON.stringify(marker + '-sib')}, 'x');`);
const badSib = runMig(skillDir(fakeSib), sub, 'scratch-migrate.js');
assert.notStrictEqual(badSib.status, 0, 'a root inside the repository, run from a subdirectory, is refused');
assert.match(badSib.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker + '-sib'), 'and no migration code was loaded from it');
// The real root planted roles above, so only the refusal and the marker are checked here.
const badPlant = run(skillDir(fakeSib), sub);
assert.notStrictEqual(badPlant.status, 0, 'plant-roles: a root inside the repository, run from a subdirectory, is refused');
assert.match(badPlant.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker), 'plant-roles: and nothing was loaded from it');

console.log('fx-setup-root-check: passed');
