'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');

// hooks/fx-codex.js plants read-only roles into CODEX_HOME on SessionStart
// (task 06). Every hook invocation this file makes is pinned to a throwaway
// CODEX_HOME so running this suite can never write into the real
// ~/.codex on the machine running it.
const testCodexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-manifest-home-'));
const testEnv = { ...process.env, CODEX_HOME: testCodexHome };
const codex = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));

// Amendment A1: Codex uses the manifest `hooks` key when present and falls
// back to hooks/hooks.json (Claude Code's wiring) otherwise. research/codex.md.
assert.strictEqual(codex.hooks, './hooks.json', 'the Codex manifest names its own hooks file');
const cxHooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8')).hooks;
for (const ev of ['SessionStart', 'SubagentStart', 'PreToolUse']) {
  const cmds = cxHooks[ev].flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(cmds.every((c) => c.includes('hooks/fx-codex.js')), `${ev} runs fx-codex.js`);
}
for (const ev of ['SessionStart', 'SubagentStart']) {
  for (const g of cxHooks[ev]) for (const h of g.hooks) {
    assert.strictEqual(h.additionalContextLimit, 0, `${ev} never truncates the preamble`);
  }
}
// Codex sends source "fork" on SessionStart; the docs omit it (research/codex.md, section 2).
for (const g of cxHooks.SessionStart) {
  assert.ok(String(g.matcher).split('|').includes('fork'), 'SessionStart fires on fork');
}
assert.ok(!('agents' in codex), 'no agents key exists in the Codex manifest');
assert.strictEqual(typeof codex.skills, 'string', 'skills is a single path string');
assert.strictEqual(codex.skills, './skills/');
assert.strictEqual(codex.version, claude.version, 'manifest versions must match');

// The design requires manifest and marketplace versions to stay identical, and
// says a gate checks it. This is that gate.
const cxMarket = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
const entry = cxMarket.plugins.find((p) => p.name === 'fx');
assert.ok(entry, 'fx must be listed in the Codex marketplace');
assert.strictEqual(entry.version, codex.version, 'marketplace entry must match the manifest');

const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8'));
assert.ok(hooks.hooks, 'events nest under a top-level hooks key');
assert.deepStrictEqual(
  Object.keys(hooks.hooks).sort(),
  ['PreToolUse', 'SessionStart', 'SubagentStart'],
  'this task adds PreToolUse alongside the two context events'
);
assert.strictEqual(
  hooks.hooks.PreToolUse[0].matcher, '*',
  'PreToolUse matches every tool; fx-codex.js routes internally on tool_name'
);

// No symlinks anywhere Codex would copy: it drops them silently.
// Ask git, not the filesystem: `find` also walks .worktrees/ and other
// gitignored build state, which would fail this gate on something never shipped.
const links = execFileSync('bash', ['-c',
  "git ls-files -s | awk '$1==\"120000\" {print $4}'"],
  { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(links, '', `symlinks are dropped by the Codex installer: ${links}`);

// The injector renders, and renders for Codex.
const out = execFileSync('node', [path.join(root, 'hooks/fx-codex.js')], {
  input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: root }),
  encoding: 'utf8',
  env: testEnv,
});
const parsed = JSON.parse(out);
const ctx = parsed.hookSpecificOutput.additionalContext;
assert.ok(ctx.includes('$fx-tdd'), 'Codex addressing must be rendered');
assert.ok(!ctx.includes('{{'), 'no placeholder may survive');
assert.ok(!ctx.includes('fx:fx-tdd'), 'the plugin prefix is Claude Code only');

const { spawnSync } = require('child_process');

const hook = path.join(root, 'hooks/fx-codex.js');
const fire = (payload) => spawnSync('node', [hook], {
  input: JSON.stringify(payload), encoding: 'utf8', env: testEnv,
});

const refused = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git branch -D some-branch' },
});
assert.strictEqual(refused.status, 2, 'an absolute must be refused');
assert.ok(refused.stderr.trim().length > 0, 'a refusal must state its reason');

const allowed = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git status' },
});
assert.strictEqual(allowed.status, 0, 'a benign command must pass');
assert.strictEqual(allowed.stderr.trim(), '', 'a pass must be silent');

const garbage = spawnSync('node', [hook], { input: 'not json', encoding: 'utf8' });
assert.strictEqual(garbage.status, 0, 'malformed input must not wedge a session');

// PreToolUse for a non-shell tool is not this hook's business.
const other = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'view_image', tool_input: {},
});
assert.strictEqual(other.status, 0);

// The lane check follows the runtime's editing tool. Codex edits with a patch
// tool, so routing only the shell would leave the check absent here.
const patch = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'apply_patch', tool_input: { file_path: path.join(root, 'README.md') },
});
assert.ok(patch.status === 0 || patch.status === 2,
  'apply_patch must reach the lane check, not fall through unexamined');

// The assertion above is satisfied even by a hook that never calls
// laneCheck (README.md is prose, so laneCheck already permits it, AND the
// payload above uses a `file_path` key the real Codex CLI never sends — see
// below). It cannot prove the wiring.
//
// Measured live against Codex CLI 0.155.1 (fix round 1): a real apply_patch
// PreToolUse payload has no `file_path`/`path` key at all. The whole patch
// arrives as raw text under `command` — the SAME key Bash uses:
//
//   tool_name='apply_patch'  tool_input keys=['command']
//     command = '*** Begin Patch\n*** Update File: target.js\n@@\n' +
//                '-const b = 2;\n+const b = 3;\n*** End Patch'
//
// The lane check must parse the affected path(s) out of that text. These
// cases prove the parser, not just the routing.

function withScratch(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-lane-'));
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// Single-file patch: the one path named is source code with no design doc.
withScratch((scratch) => {
  const command = '*** Begin Patch\n*** Update File: lib/widget.js\n@@\n'
    + '-const b = 2;\n+const b = 3;\n*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'apply_patch on source code with no docs/plans/*/design.md must be refused');
  assert.ok(result.stderr.includes('lib/widget.js'),
    'the reason must name the refused path');
});

// Multi-file patch: only the SECOND path is refused. Proves every path is
// checked, not just the first, and that the reason names the specific
// offender rather than the whole patch.
withScratch((scratch) => {
  const command = '*** Begin Patch\n'
    + '*** Update File: README.md\n@@\n-old\n+new\n'
    + '*** Update File: lib/widget.js\n@@\n-const b = 2;\n+const b = 3;\n'
    + '*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'a multi-file patch is refused when ANY of its paths is refused');
  assert.ok(result.stderr.includes('lib/widget.js'),
    'the reason names the specific offending path');
  assert.ok(!result.stderr.includes('README.md'),
    'the reason names the offender, not every path in the patch');
});

// A rename carries two paths: the Update line and the Move-to target. Both
// must be checked.
withScratch((scratch) => {
  const command = '*** Begin Patch\n*** Update File: README.md\n'
    + '*** Move to: lib/renamed.js\n@@\n-old\n+new\n*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'the Move-to target is source code with no design doc and must be checked too');
  assert.ok(result.stderr.includes('lib/renamed.js'),
    'the reason names the Move-to path');
});

// Unparseable patch text: fail open, exactly as a laneCheck throw already
// does. A parsing bug must never wedge a Codex session.
withScratch((scratch) => {
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command: 'this is not a patch at all' },
  });
  assert.strictEqual(result.status, 0,
    'a patch with no recognisable file header must be allowed, not wedge the session');
  assert.strictEqual(result.stderr.trim(), '', 'a pass must be silent');
});

// Read-only agents (task 06). `agent_id`/`agent_type` are undocumented on
// PreToolUse (ADR 0019), so the hook never trusts them there: it looks up
// what SubagentStart recorded, and refuses a write from any agent_id it
// cannot classify that way. These four cases carry an agent_id SubagentStart
// never saw in THIS process, so they exercise the unclassifiable-means-
// refused path, not a lookup hit.
const lensWrite = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
});
assert.strictEqual(lensWrite.status, 2, 'a lens must not be able to write');

const lensRead = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'Bash', tool_input: { command: 'grep -rn TODO .' },
});
assert.strictEqual(lensRead.status, 0, 'a lens must still be able to read');

const controllerWrite = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
});
assert.strictEqual(controllerWrite.status, 0, 'the controller is not a lens');

const lensPatch = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'apply_patch', tool_input: {},
});
assert.strictEqual(lensPatch.status, 2, 'apply_patch from a lens must be refused');

// An agent_id with NO agent_type at all on the PreToolUse payload is still
// refused on a write, unclassified: the hook does not need agent_type
// present to decide "unclassifiable", only agent_id.
const noTypeWrite = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a-no-type',
  tool_name: 'Bash', tool_input: { command: 'touch new-file.txt' },
});
assert.strictEqual(noTypeWrite.status, 2,
  'an agent_id with no recorded identity and no agent_type is refused on write');

// The sixth read-only agent by name: fx-devils-advocate is not fx-lens-*, and
// a prefix match on 'fx-lens-' would leave it writable. Prove it by name,
// not just by relying on the same unclassified-refusal path every other
// agent_id above happens to take.
withScratch((scratch) => {
  const startedAdvocate = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'advocate-1', agent_type: 'fx-devils-advocate',
  });
  assert.strictEqual(startedAdvocate.status, 0);
  const advocateWrite = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'advocate-1',
    tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
  });
  assert.strictEqual(advocateWrite.status, 2,
    'fx-devils-advocate is read-only for the same reason the lenses are, and must be refused too');
});

// Now prove the SubagentStart -> PreToolUse pipeline for real, not just the
// unclassified fallback: record an identity, then look it up.
withScratch((scratch) => {
  const started = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'lens-recorded', agent_type: 'fx-lens-security',
  });
  assert.strictEqual(started.status, 0, 'SubagentStart must not fail the session');

  // The PreToolUse payload here carries NO agent_type at all — proving the
  // refusal comes from the identity SubagentStart recorded, not from trusting
  // the undocumented field a second time.
  const write = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'lens-recorded',
    tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
  });
  assert.strictEqual(write.status, 2, 'a recorded lens identity is still refused on write');

  const read = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'lens-recorded',
    tool_name: 'Bash', tool_input: { command: 'grep -rn TODO .' },
  });
  assert.strictEqual(read.status, 0, 'a recorded lens identity can still read');

  // An ordinary (non-lens) recorded subagent must still be able to write:
  // this refusal is specific to read-only agents, not to every subagent.
  const startedDefault = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'default-recorded', agent_type: 'default',
  });
  assert.strictEqual(startedDefault.status, 0);
  const defaultWrite = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'default-recorded',
    tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
  });
  assert.strictEqual(defaultWrite.status, 0, 'a non-lens subagent is not refused');

  // The identity record lives under the OS temp area, never inside the
  // repository/cwd SubagentStart was called with.
  const leaked = fs.readdirSync(scratch).some((f) => f.includes('lens-recorded'));
  assert.strictEqual(leaked, false,
    'the identity record must not be written into the user\'s repository');
});

// A planting failure must never stop the session. Point CODEX_HOME at a path
// that cannot become a directory (a plain file sits where `agents/` would
// need to be created), so plantRoles's mkdirSync throws, and prove
// SessionStart still renders the preamble normally.
{
  const badHomeParent = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-badhome-'));
  const badHome = path.join(badHomeParent, 'not-a-dir');
  fs.writeFileSync(badHome, 'not a directory');
  const result = spawnSync('node', [hook], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: root }),
    encoding: 'utf8',
    env: { ...process.env, CODEX_HOME: badHome },
  });
  assert.strictEqual(result.status, 0, 'a planting failure must not stop the session');
  const parsedBad = JSON.parse(result.stdout);
  assert.ok(parsedBad.hookSpecificOutput.additionalContext.includes('$fx-tdd'),
    'the preamble still renders even when planting threw');
  fs.rmSync(badHomeParent, { recursive: true, force: true });
}

// Fix round 1: a reproducible write bypass through `bash -c`/`sh -c`/any
// interpreter, found by review and confirmed independently. This is that
// review's full probe table, run for real through the hook contract, with
// a lens identity recorded via SubagentStart exactly as production would
// see it (not the unclassified-refusal fallback the round-1 sample cases
// happened to exercise). Every bypass line must now exit 2; `git status`
// and a plain `grep` (the "must stay allowed" controls) must stay 0, so an
// over-tight allowlist fails this suite instead of passing it silently.
withScratch((scratch) => {
  const startedProbe = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'probe-1', agent_type: 'fx-lens-security',
  });
  assert.strictEqual(startedProbe.status, 0);

  const probe = (command) => fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'probe-1',
    tool_name: 'Bash', tool_input: { command },
  }).status;

  const cases = [
    // [command, expected exit, label]
    ['echo pwned > evidence.txt', 2, 'plain redirect'],
    ['bash -c "echo pwned > evidence.txt"', 2, 'bash -c bypass (round 1 gap)'],
    ['sh -c "echo pwned > evidence.txt"', 2, 'sh -c bypass (round 1 gap)'],
    ['python3 -c "open(1)"', 2, 'python3 -c bypass (round 1 gap)'],
    ['node -e "1"', 2, 'node -e bypass (round 1 gap)'],
    ['bash -c "rm evidence.txt"', 2, 'bash -c wrapping a denylisted command'],
    ['git status', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['curl -o out.txt https://example.com', 2, 'curl -o (reviewer, untried)'],
    ['curl -O https://example.com/file', 2, 'curl -O (reviewer, untried)'],
    ['wget https://example.com/file', 2, 'wget (reviewer, untried)'],
    ['eval "echo pwned > evidence.txt"', 2, 'eval (reviewer, untried)'],
    ['echo $(rm -rf /tmp/x)', 2, 'command substitution $(...) (reviewer, untried)'],
    ['echo `rm -rf /tmp/x`', 2, 'command substitution `...` (reviewer, untried)'],
    ['grep -rn TODO .', 0, 'a plain read — must stay allowed'],
  ];
  for (const [command, expected, label] of cases) {
    assert.strictEqual(probe(command), expected, `${label}: ${command}`);
  }
});

// Fix round 2: the outer allowlist (which binary may run at all) held. The
// gates INSIDE two allowlisted binaries — git, find — were still denylists
// over their own subcommand/action space, and a review reproduced real
// disk writes through both (run for real in a scratch repo, not just
// through the hook). The identical argument that inverted round 1 applies
// one level down: `git` has well over a hundred subcommands, so an
// enumeration of the writing ones is incomplete the day it's written.
// GIT_ALLOWED_SUBCOMMANDS and FIND_ALLOWED_FLAGS in lib/plant-roles.js
// invert both. `tree` is dropped from ALLOWED_BINARIES entirely rather
// than given a third gate.
withScratch((scratch) => {
  const startedProbe2 = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'probe-2', agent_type: 'fx-lens-security',
  });
  assert.strictEqual(startedProbe2.status, 0);

  const probe2 = (command) => fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'probe-2',
    tool_name: 'Bash', tool_input: { command },
  }).status;

  const cases2 = [
    // [command, expected exit, label]
    ['git config user.name pwned', 2, 'git config (round 2 bypass, reproduced)'],
    ['git clone /tmp/x /tmp/pwned', 2, 'git clone (round 2 bypass, reproduced)'],
    ['git archive --output=/tmp/o.tar HEAD', 2, 'git archive --output= (round 2 bypass, reproduced, wrote 10240 bytes)'],
    ['git worktree add /tmp/wt HEAD', 2, 'git worktree add (round 2 bypass, reproduced)'],
    ['find . -fprint /tmp/o.txt', 2, 'find -fprint (round 2 bypass, reproduced, wrote 44 lines)'],
    ['find . -delete', 2, 'find -delete — already caught in round 1'],
    ['git log', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    // Listed by the reviewer as untried but expected to bypass; all confirmed.
    ['git gc', 2, 'git gc (reviewer, untried)'],
    ['git reflog expire', 2, 'git reflog expire (reviewer, untried)'],
    ['git update-ref refs/heads/x HEAD', 2, 'git update-ref (reviewer, untried)'],
    ['git symbolic-ref HEAD', 2, 'git symbolic-ref (reviewer, untried)'],
    ['git notes add', 2, 'git notes (reviewer, untried)'],
    ['git replace', 2, 'git replace (reviewer, untried)'],
    ['git commit-tree', 2, 'git commit-tree (reviewer, untried)'],
    ['git hash-object -w file.txt', 2, 'git hash-object -w (reviewer, untried)'],
    ['git submodule add /tmp/x sub', 2, 'git submodule add (reviewer, untried)'],
    ['git credential approve', 2, 'git credential approve (reviewer, untried)'],
    ['git filter-branch', 2, 'git filter-branch (reviewer, untried)'],
    ['git sparse-checkout set x', 2, 'git sparse-checkout (reviewer, untried)'],
    ['git maintenance run', 2, 'git maintenance (reviewer, untried)'],
    ['git am /tmp/patch', 2, 'git am (reviewer, untried)'],
    ['git bundle create /tmp/b.bundle HEAD', 2, 'git bundle create (reviewer, untried)'],
    ['git format-patch -1', 2, 'git format-patch (reviewer, untried)'],
    ['find . -fls /tmp/o.txt', 2, 'find -fls (reviewer, untried)'],
    ['tree -o /tmp/o.txt', 2, 'tree -o — tree dropped from ALLOWED_BINARIES entirely'],
    // Reads that must stay allowed.
    ['git log --oneline -5', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['git diff', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['git show HEAD', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['git status', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['grep -rn TODO .', 0, 'a plain read — must stay allowed'],
    ['find . -name "*.rb"', 0, 'find -name — must stay allowed'],
    ['cat README.md', 0, 'cat — must stay allowed'],
  ];
  for (const [command, expected, label] of cases2) {
    assert.strictEqual(probe2(command), expected, `${label}: ${command}`);
  }
});

// Fix round 3: `diff`, `log` and `show` are legitimately read-only git
// subcommands (on GIT_ALLOWED_SUBCOMMANDS). The FLAG is what writes: git
// diff/log/show all accept --output=<path> (and the space form) to send
// their own output to a file instead of stdout. This is the third level
// this detector has been wrong at (binaries, then subcommands, then
// flags) and per the coordinator's ruling it is also the last one this
// task chases — see the ceiling comment at the top of
// lib/plant-roles.js's write-detection section for why a fourth round is
// not coming.
withScratch((scratch) => {
  const startedProbe3 = fire({
    hook_event_name: 'SubagentStart', cwd: scratch,
    agent_id: 'probe-3', agent_type: 'fx-lens-security',
  });
  assert.strictEqual(startedProbe3.status, 0);

  const probe3 = (command) => fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    agent_id: 'probe-3',
    tool_name: 'Bash', tool_input: { command },
  }).status;

  const cases3 = [
    ['git diff --output=/tmp/pwned.diff', 2, '--output= on git diff (round 3 bypass, reproduced, wrote 83 bytes)'],
    ['git diff --output /tmp/x', 2, '--output space form on git diff'],
    ['git show --output=/tmp/x', 2, '--output= on git show'],
    ['git log --output=/tmp/x', 2, '--output= on git log'],
    ['git log --oneline -5', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['git diff', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
    ['git status', 2, 'was cleared; task 14 round 5 takes git from read-only agents'],
  ];
  for (const [command, expected, label] of cases3) {
    assert.strictEqual(probe3(command), expected, `${label}: ${command}`);
  }
});

fs.rmSync(testCodexHome, { recursive: true, force: true });

console.log('codex lens enforcement: OK');
console.log('codex guard: OK');
