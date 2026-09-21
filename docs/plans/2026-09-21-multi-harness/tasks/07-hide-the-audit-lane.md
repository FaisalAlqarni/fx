# 07: Hide the audit lane; commands as skills

**Status:** ready-for-agent
**Blocked by:** 02, 04
**Phase:** Core

**What to build:** On Codex, the audit lane is never selected by the model on
its own, and is still invocable when the user asks for it. The four fx commands
are reachable on Codex, which has no project-scoped command surface.

**Files:**
- Create: `skills/fx-audit/agents/openai.yaml`
- Create: `skills/fx-critique/SKILL.md`
- Create: `skills/fx-grill/SKILL.md`
- Create: `skills/fx-handoff/SKILL.md`
- Create: `skills/fx-setup/SKILL.md`
- Create: `skills/{fx-critique,fx-grill,fx-handoff,fx-setup}/agents/openai.yaml`
- Modify: `.claude-plugin/plugin.json`
- Modify: `scripts/gen-command-skills`  (new, generates the five skill bodies)

**Interfaces:**
- Consumes: `commands/fx-*.md` bodies (existing)
- Produces: five skill directories whose `SKILL.md` body is the command body
  **with reference depths rewritten**, each with `disable-model-invocation:
  true` in frontmatter and an `agents/openai.yaml` carrying
  `policy.allow_implicit_invocation: false`
- Produces: `scripts/gen-command-skills`, the generator that performs the
  rewrite, so no body is hand-copied

**Seam:** Artifact shape in the install test (task 09); absence from the
model-facing listing in the conformance matrix (task 10).

**Measured facts this depends on.**

- Codex's mechanism for hiding a skill from auto-selection is
  `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. Verbatim
  from the documentation: *"When `false`, Codex won't implicitly invoke the
  skill based on user prompt; explicit `$skill` invocation still works."*
  OpenAI's own bundled `review-agent` skill uses exactly this.
- `[[skills.config]] enabled = false` is the wrong mechanism: it hides the
  skill entirely, including from `$name`.
- Codex's custom prompts are deprecated in favour of skills and are user-level
  only, so a command has no project-shareable surface there.
- Claude Code's equivalent is `disable-model-invocation: true` in frontmatter.
  `skills` in a manifest **adds to** the default scan rather than replacing it.

**The commands stay.** `commands/fx-*.md` is not deleted. Claude Code and
opencode both register commands and users type them today. The skills are an
additional surface, and the command body is the single source: the skill body
is generated from it, not hand-copied.

**Byte identity is the wrong rule, and it would break an existing gate.**
`commands/fx-grill.md` cites `../references/vocab/grilling.md` and
`commands/fx-critique.md` cites `../agents/fx-devils-advocate.md`: one level up,
correct from `commands/`. The same bytes at `skills/fx-grill/SKILL.md` need
`../../`, and `scripts/check-paths` resolves citations relative to the citing
file, so a byte-identical copy makes that gate red. The generator rewrites the
depth, and the test asserts **equivalence after rewrite**, not identity.
`scripts/fx-opencode-install` already does exactly this rewrite; reuse it rather
than writing a second one.

**Risks:** Five new skills enter the same selection pool the existing thirteen
live in. Every one must carry the hiding flag on both runtimes, or fx has made
the selection contest it exists to end measurably worse.

**Idempotency:** Creates files. Regeneration overwrites with identical content.

**Testing:** Assert the flag is present on every user-invoked skill, on both
mechanisms, and that no command body and skill body have drifted apart.

## Acceptance criteria
- [ ] `skills/fx-audit/agents/openai.yaml` sets `policy.allow_implicit_invocation: false`
- [ ] Each of the four command-derived skills exists with a `SKILL.md`
- [ ] Every one of the five carries `disable-model-invocation: true` in frontmatter
- [ ] Every one of the five carries `allow_implicit_invocation: false` in its sidecar
- [ ] Each skill body equals its command body after the reference-depth rewrite
- [ ] No generated skill body contains a one-level `../references/` or `../agents/` citation
- [ ] `scripts/check-paths` passes: this is the gate byte-identity would have broken
- [ ] No other skill in the repository carries either flag
- [ ] `scripts/gen-command-skills` is deterministic: running it twice leaves no diff
- [ ] The Codex validator still passes

## Steps

- [ ] **1. Write the failing test**

```js
// tests/gates/user-invoked.test.js
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
  assert.ok(!/(^|[^.])\.\.\/(references|agents)\//m.test(skill.body),
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

console.log('user-invoked.test.js: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/user-invoked.test.js`
Expected: FAIL, `ENOENT` on `skills/fx-audit/agents/openai.yaml`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: `node tests/gates/user-invoked.test.js`
Expected: PASS.

- [ ] **5. Re-validate the Codex manifest**

Run: `python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .`
Expected: `Plugin validation passed`.

- [ ] **6. Register the test and run the gate**

Add to `scripts/check-all`:
```
run user-invoked.test.js    node tests/gates/user-invoked.test.js
```
Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add skills .claude-plugin/plugin.json scripts/gen-command-skills tests/gates/user-invoked.test.js scripts/check-all
git commit -m "feat(codex): hide the audit lane and expose commands as skills"
```

No attribution trailers. Then continue to the next task: never stop and wait.
