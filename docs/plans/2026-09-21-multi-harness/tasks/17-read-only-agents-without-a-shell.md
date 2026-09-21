# 17: Read-only agents have no shell, on every runtime

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** fx's six read-only agents (`fx-devils-advocate` and the
five `fx-lens-*`) have no tool that can write a file, on Claude Code, opencode
and Codex. Today each keeps a shell: `tools: Read, Grep, Glob, Bash` on Claude
Code, `bash: allow` on opencode, and the shell on Codex. In conformance row 12,
both a Claude Code lens and an opencode lens said unprompted that a shell
write "would have worked". Design amendment A5.

The agents read the packaged diff file the controller hands them. They do not
run git themselves.

**Files:**
- Modify: `agents/fx-devils-advocate.md`
- Modify: `agents/fx-lens-a11y.md`
- Modify: `agents/fx-lens-database.md`
- Modify: `agents/fx-lens-pipeline.md`
- Modify: `agents/fx-lens-security.md`
- Modify: `agents/fx-lens-silent-failure.md`
- Modify: `lib/agent-dialects.js`  (`toOpencodeAgent`)
- Modify: `scripts/gen-codex-agents`
- Modify: `codex/agents/*.toml`  (regenerated, never hand-edited)
- Modify: `tests/gates/codex-manifest.test.js` or `lib/plant-roles.test.js`,
  whichever already pins the generated role shape
- Modify: `tests/gates/opencode-plugin.test.js`
- Modify: `docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md`

**Interfaces:**
- Consumes: `toOpencodeAgent(source) -> { mode, description, prompt, permission: { edit, bash } }`
  from `lib/agent-dialects.js`
- Produces: every read-only agent's frontmatter is exactly `tools: Read, Grep, Glob`
- Produces: `toOpencodeAgent` returns `permission.bash: 'deny'` for an agent
  whose `tools:` line has no `Bash`
- Produces: `gen-codex-agents` appends this to every role file, after
  `developer_instructions`:
  ```toml

  [features]
  shell_tool = false
  ```
  `shell_tool` is one of the six features a Codex role may disable, and
  `apply_patch` is not among them (`research/codex.md`, section 3). The patch
  tool stays refused by the PreToolUse hook on `agent_type`.

**Seam:** the generators' outputs, which are already drift-checked by
`scripts/check-generated`, and the opencode plugin's config hook, which
`tests/gates/opencode-plugin.test.js` already calls.

**Risks:**
- MEDIUM: an agent body that tells the agent to run shell commands becomes an
  instruction it cannot follow. `agents/fx-lens-database.md` says "You may run
  read-only shell commands (`git diff`, `grep`, reading files)". Rewrite every
  such line to name the diff file and the read and search actions instead.
  Grep all six bodies for `shell`, `git `, `bash`, `run ` before committing,
  and list every hit in the report.
- MEDIUM: the TOML `[features]` table must come after every top-level key, or
  the keys below it move into the table. Check it by parsing one generated
  file.
- The dispatch prompts in `skills/fx-review` and `skills/fx-implement` already
  hand reviewers a diff file. Confirm this, and name the lines in the report.

**Idempotency:** generators are deterministic. Re-running them rewrites the
same bytes, and `scripts/check-generated` proves it.

**Testing:** generator output tests, the opencode config-hook test, and live
row 12 in task 21 (Claude Code and opencode) and task 22 (Codex).

## Acceptance criteria
- [ ] All six `agents/*.md` read-only agents have `tools: Read, Grep, Glob`
- [ ] No read-only agent body tells the agent to run a shell command
- [ ] The opencode config hook gives all six agents `edit: deny` and `bash: deny`
- [ ] Every generated `codex/agents/*.toml` ends with `[features]` and `shell_tool = false`, and still parses with `name`, `description` and `developer_instructions` at top level
- [ ] `scripts/check-generated` passes, so the generated files match their sources
- [ ] ADR 0019 states the guarantee per runtime: which tools are missing, and what refuses the patch tool on Codex. It no longer claims a Claude Code lens "cannot even express a write" while it had Bash
- [ ] Conformance row 12 still passes its free parts, and its README names shell writes as covered

## Steps

- [ ] **1. Write the failing tests**

In `tests/gates/opencode-plugin.test.js`, beside the existing agent-permission
assertions, add:

```js
// Task 17 (amendment A5): a read-only agent has no shell on opencode.
for (const name of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
  assert.strictEqual(config.agent[name].permission.edit, 'deny', `${name} edit`);
  assert.strictEqual(config.agent[name].permission.bash, 'deny', `${name} bash`);
}
```

Use whatever variable already holds the config after the plugin's `config`
hook ran. In this file it is the object the hook mutated.

In the test that already pins the generated Codex role shape, add:

```js
// Task 17: a read-only role turns the shell off. Codex cannot turn off
// apply_patch from a role, so the PreToolUse hook still refuses it.
for (const f of fs.readdirSync(path.join(root, 'codex', 'agents'))) {
  const t = fs.readFileSync(path.join(root, 'codex', 'agents', f), 'utf8');
  assert.match(t, /\n\[features\]\nshell_tool = false\n$/, `${f} disables the shell last`);
  const head = t.split('\n[features]')[0];
  for (const k of ['name', 'description', 'developer_instructions']) {
    assert.match(head, new RegExp(`^${k} = `, 'm'), `${f} keeps ${k} at top level`);
  }
}
for (const f of fs.readdirSync(path.join(root, 'agents'))) {
  const t = fs.readFileSync(path.join(root, 'agents', f), 'utf8');
  assert.match(t, /^tools: Read, Grep, Glob$/m, `${f} has no shell`);
}
```

- [ ] **2. Run them: verify RED**

Run: `node tests/gates/opencode-plugin.test.js`, then the role-shape test file.
Expected: FAIL on `bash` being `allow`, on the missing `[features]` table, and
on `tools:` carrying `Bash`.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Change the six `tools:` lines,
`toOpencodeAgent`, and `gen-codex-agents`. Then regenerate the role files with
the generator and never edit them by hand. Rewrite the shell instructions in
the agent bodies.

- [ ] **4. Run them: verify GREEN**

Run: the same two files, then `scripts/check-generated`. Expected: PASS.

- [ ] **5. Correct ADR 0019**

State the guarantee for each runtime in a small table:
- Claude Code: no write tool and no shell.
- opencode: `edit: deny` and `bash: deny`.
- Codex: shell off in the role, and the patch tool refused by the hook on
  `agent_type`.

Remove the overclaim. The prose gate must pass.

- [ ] **6. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add agents lib/agent-dialects.js scripts/gen-codex-agents codex/agents tests/gates/opencode-plugin.test.js docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md
git commit -m "fix(agents): take the shell away from read-only agents on all three runtimes"
```

Also stage the role-shape test file you changed, by its path. No attribution
trailers. Then continue to the next task: never stop and wait.
