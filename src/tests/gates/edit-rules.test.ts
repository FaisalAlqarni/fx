// Run: node tests/gates/edit-rules.test.js
// Edit rules at the process seam: hooks/fx-pretooluse.js and hooks/fx-codex.js
// on a write, under scratch homes. Every edit's content is data: nothing here
// is written by a hook or run.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readDecisionLog, runHook, scratchHookEnv, type HookDirs } from '../helpers/hook-env.js';
import { hardReason } from '../../lib/shell-rules.js';

const ROOT = path.join(__dirname, '..', '..');
const PRETOOL = path.join(ROOT, 'hooks', 'fx-pretooluse.js');
const CODEX = path.join(ROOT, 'hooks', 'fx-codex.js');
const EM = String.fromCodePoint(0x2014);
const RM_ROOT = '[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n';
const DASH_REFUSAL = '[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)\n';
const FK = { id: 'fk-index', glob: 'db/migrate/*.rb', rule: 'Every foreign key gets an index.', scope: 'file' };
const TODO = { id: 'no-todo', glob: '**/*.rb', rule: 'No TODO comments.' };
const MIGRATION = 'db/migrate/1_add_user.rb';
const CONTENT = 'class AddUser < ActiveRecord::Migration[7.1]\n  def change\n    add_reference :users, :org\n  end\nend\n';

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}

async function main(): Promise<void> {
  const cleanups: (() => void)[] = [];
  let repos = 0;
  const repo = (files: Record<string, string> = {}, fxJson?: unknown) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fx-edit-rules-${repos++}-`));
    cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
    spawnSync('git', ['init', '-q', dir]);
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    if (fxJson !== undefined) fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify(fxJson));
    return dir;
  };
  const setup = () => {
    const e = scratchHookEnv();
    cleanups.push(e.cleanup);
    return { env: e.env, dirs: e.dirs };
  };
  const call = (hook: string, env: NodeJS.ProcessEnv, cwd: string, tool: string, ti: unknown, session = 's1') =>
    runHook(hook, { hook_event_name: 'PreToolUse', session_id: session, cwd, tool_name: tool, tool_input: ti }, env);
  const write = (env: NodeJS.ProcessEnv, cwd: string, file: string, content: string, session?: string) =>
    call(PRETOOL, env, cwd, 'Write', { file_path: file, content }, session);
  const ruleLog = (dirs: HookDirs) => readDecisionLog(dirs).filter((e) => get(e, 'event') === 'edit-rule');
  const repoRules = { rules: [FK, TODO] };
  // A scratch copy of the plugin with one lib module replaced.
  const pluginWith = (dirs: HookDirs, lib: string, source: string, hook = 'fx-pretooluse.js') => {
    const copy = path.join(dirs.root, `plugin-${fs.readdirSync(dirs.root).length}`);
    fs.cpSync(path.join(ROOT, 'hooks'), path.join(copy, 'hooks'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'lib'), path.join(copy, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(copy, 'lib', lib), source);
    return path.join(copy, 'hooks', hook);
  };
  const errorLines = (dirs: HookDirs) => ruleLog(dirs).filter((l) => get(l, 'source') === 'error');

  try {
    // 1. A Markdown write that adds an em dash.
    {
      const { env, dirs } = setup();
      const r = await write(env, repo(), 'docs/a.md', `# T\nan ${EM} b\n`);
      assert.strictEqual(r.code, 2, r.err);
      assert.strictEqual(r.err, DASH_REFUSAL);
      const log = ruleLog(dirs);
      assert.strictEqual(log.length, 1, JSON.stringify(log));
      assert.deepStrictEqual([get(log[0], 'source'), get(log[0], 'action'), get(log[0], 'text')], ['hard-rule', 'refuse', 'docs/a.md no-dashes']);
    }
    // 2. Old breaches on disk never block a clean addition.
    {
      const { env } = setup();
      const old = `old ${EM} line\n`;
      const r = await write(env, repo({ 'docs/a.md': old }), 'docs/a.md', `${old}new clean line\n`);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
    }
    // 2b. A word changed on a line that already holds a dash is allowed; a new dash on it is refused.
    {
      const { env } = setup();
      const dir = repo({ 'docs/a.md': `a typo ${EM} here\n` });
      const fix = await call(PRETOOL, env, dir, 'Edit', { file_path: 'docs/a.md', old_string: `a typo ${EM} here`, new_string: `a fix ${EM} here` });
      assert.strictEqual(fix.code, 0, fix.err);
      const more = await call(PRETOOL, env, dir, 'Edit', { file_path: 'docs/a.md', old_string: `a typo ${EM} here`, new_string: `a typo ${EM} here ${EM} too` });
      assert.strictEqual([more.code, more.err].join(' '), `2 ${DASH_REFUSAL}`);
    }
    // 3. Conflict markers, and a setext underline that is not one.
    {
      const { env } = setup();
      const dir = repo();
      const marker = await write(env, dir, 'src/a.ts', 'const a = 1;\n<<<<<<< HEAD\n');
      assert.strictEqual(marker.code, 2);
      assert.ok(marker.err.startsWith('[fx] rule no-conflict-markers:'), marker.err);
      const setext = await write(env, dir, 'docs/b.md', 'Title\n=======\n');
      assert.strictEqual(setext.code, 0, setext.err);
    }
    // 4. A secret the redactor finds; the log names the file, never the value.
    {
      const { env, dirs } = setup();
      const r = await write(env, repo(), 'src/env.sh', 'export OPENAI_API_KEY=sk-proj-1234567890abcdef');
      assert.strictEqual(r.code, 2);
      assert.ok(r.err.startsWith('[fx] rule no-secrets:'), r.err);
      const log = ruleLog(dirs);
      assert.strictEqual(log.length, 1);
      assert.ok(!JSON.stringify(log).includes('sk-proj'), JSON.stringify(log));
    }
    // 5. The switch lets everything through and logs nothing.
    {
      const { env, dirs } = setup();
      const r = await write(env, repo({}, { hooks: { edit_rules: false } }), 'docs/a.md', `an ${EM} b\n`);
      assert.strictEqual(r.code, 0, r.err);
      assert.deepStrictEqual(ruleLog(dirs), []);
    }
    // 6. An Edit is checked on what its new string adds.
    {
      const { env } = setup();
      const dir = repo();
      const add = await call(PRETOOL, env, dir, 'Edit', { file_path: 'docs/a.md', old_string: 'a', new_string: `a\nb ${EM}` });
      assert.strictEqual(add.code, 2);
      assert.strictEqual(add.err, DASH_REFUSAL);
      const removal = await call(PRETOOL, env, dir, 'Edit', { file_path: 'docs/a.md', old_string: `a\nb ${EM}`, new_string: 'a' });
      assert.strictEqual(removal.code, 0, removal.err);
    }
    // 7. A repository's own rules are ignored silently: no refusal, no output, no log (ADR 0049).
    {
      const { env, dirs } = setup();
      const r = await write(env, repo({}, repoRules), MIGRATION, `${CONTENT}# TODO\n`);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.deepStrictEqual(ruleLog(dirs), []);
    }
    // The fx-state refusal is unchanged; a file outside the repository gets no rules.
    {
      const { env, dirs } = setup();
      const dir = repo({}, { rules: [{ id: 'all', glob: '**/*', rule: 'Anything.' }] });
      // fx state is the machine state directory (shell-rules namesFxState), not a repository's .fx/.
      const state = await write(env, dir, path.join(dirs.state, 'sessions', 'x.jsonl'), 'x');
      assert.strictEqual(state.code, 2);
      assert.strictEqual(state.err, `${hardReason('fx-state')}\n`);
      const outside = await write(env, dir, '../outside.md', `an ${EM} b\n`);
      assert.strictEqual(outside.code, 0, outside.err);
    }
    // A rule module that fails to load lets the edit through, says so and logs it, on both hooks.
    for (const hook of ['fx-pretooluse.js', 'fx-codex.js']) {
      const { env, dirs } = setup();
      const copy = pluginWith(dirs, 'edit-rules.js', "throw new Error('load');\n", hook);
      const r = hook === 'fx-codex.js'
        ? await call(copy, env, repo(), 'apply_patch', { command: `*** Begin Patch\n*** Add File: docs/a.md\n+an ${EM} b\n*** End Patch` })
        : await call(copy, env, repo(), 'Write', { file_path: 'docs/a.md', content: `an ${EM} b\n` });
      assert.strictEqual(r.code, 0, r.err);
      assert.ok(r.err.includes('[fx] edit rules off: load'), r.err);
      const errors = errorLines(dirs);
      assert.strictEqual(errors.length, 1, JSON.stringify(ruleLog(dirs)));
      assert.ok(String(get(errors[0], 'unavailable')).includes('load'), hook);
      if (hook === 'fx-pretooluse.js') {
        const state = await call(copy, env, repo(), 'Write', { file_path: path.join(dirs.state, 'x'), content: 'x' });
        assert.strictEqual(state.code, 2, 'the fx-state refusal does not need the rule module');
      }
    }
    // A throw inside the rule check allows the edit and logs the error (ruling, review I4).
    {
      const { env, dirs } = setup();
      const hook = pluginWith(dirs, 'repo-config.js', [
        "exports.repoRoot = () => { throw new Error('boom'); };",
        'exports.readRepoConfig = () => ({ hooks: { stopCheck: true, loopNudge: true, editRules: true }, checks: {} });',
        '',
      ].join('\n'));
      const r = await call(hook, env, repo(), 'Write', { file_path: 'docs/a.md', content: `an ${EM} b\n` });
      assert.strictEqual(r.code, 0, r.err);
      assert.ok(r.err.includes('[fx] edit rules off: boom'), r.err);
      const errors = errorLines(dirs);
      assert.strictEqual(errors.length, 1, JSON.stringify(ruleLog(dirs)));
      assert.deepStrictEqual([get(errors[0], 'action'), get(errors[0], 'unavailable')], ['allow', 'boom']);
    }
    // Codex: apply_patch, and the same patch run through the shell.
    {
      const PATCH = `*** Begin Patch\n*** Add File: docs/a.md\n+an ${EM} b\n*** End Patch`;
      const { env } = setup();
      const direct = await call(CODEX, env, repo(), 'apply_patch', { command: PATCH });
      assert.strictEqual(direct.code, 2, direct.err);
      assert.strictEqual(direct.err, DASH_REFUSAL);
      const shell = await call(CODEX, env, repo(), 'Bash', { command: `apply_patch <<'PATCH'\n${PATCH}\nPATCH` });
      assert.strictEqual(shell.code, 2, shell.err);
      assert.strictEqual(shell.err, DASH_REFUSAL);
      // A patch that passes the edit rules is still denied by a shell hard rule in the same command.
      const clean = '*** Begin Patch\n*** Add File: docs/ok.md\n+fine\n*** End Patch';
      const hard = await call(CODEX, env, repo(), 'Bash', { command: `apply_patch <<'PATCH'\n${clean}\nPATCH\nrm -rf ~` });
      assert.strictEqual(hard.code, 2, hard.err);
      assert.strictEqual(hard.err, RM_ROOT);
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log('edit-rules.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
