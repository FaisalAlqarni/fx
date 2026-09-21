# 10: Setup reports what did not land

**Status:** ready-for-agent
**Blocked by:** 06, 09
**Phase:** Hardening

**What to build:** `fx-setup` tells the user what is missing. A hook cannot do
this: it fails open, silently, by necessity. A user-invoked lane can, and on
Codex it must, because a fresh install has no preamble and no guard until the
hooks are trusted, and nothing announces that.

**Files:**
- Modify: `commands/fx-setup.md`
- Modify: `skills/fx-setup/SKILL.md`  (regenerated, not hand-edited)
- Modify: `lib/plant-roles.js`
- Modify: `lib/plant-roles.test.js`

**Interfaces:**
- Consumes: `plantRoles({ home, source })` (task 06)
- Consumes: `scripts/gen-command-skills` (task 07), to regenerate the skill body
- Produces: `auditRoles({ home, source }) -> { present, missing, stale }`,
  exported from `lib/plant-roles.js`. Reports only. **Writes nothing.**
- Produces: `hooksTrusted({ home }) -> boolean|null`, `null` when it cannot
  tell

**Seam:** `lib/plant-roles.test.js`, the same seam task 06 established.

**Why this is its own task.** It was folded into the installer, where a
reviewer could reject the reporting while accepting the installer rewrite, or
the reverse. Different deliverable, different failure mode, its own gate.

**What it reports.** Three states, never merged: `present`, `missing`, `stale`.
`stale` means a planted role differs from the generated one, which happens
whenever fx updates and the hook has not yet replanted. On Codex it also reports
whether fx's hooks are trusted, because an untrusted hook is indistinguishable
from a working one from inside a session.

**Why `auditRoles` writes nothing.** `plantRoles` already repairs. Setup's job
is to say what is wrong, so the user can decide. A reporter that silently fixes
is a reporter nobody can trust the output of.

**Risks:** `hooksTrusted` reads the user's Codex configuration. Read-only, and
return `null` rather than guessing if the shape is unfamiliar: a confident wrong
answer about whether the guard is running is worse than no answer.

**Idempotency:** Reporting only. Running it a hundred times changes nothing.

**Testing:** Unit against a temporary home seeded into each of the three states.

## Acceptance criteria
- [ ] `auditRoles` against an empty home reports every role as `missing`
- [ ] After `plantRoles`, it reports every role as `present` and none `stale`
- [ ] Changing one planted file reports exactly that one as `stale`
- [ ] `auditRoles` writes nothing: the home is byte-identical before and after
- [ ] An unrelated role in the home appears in none of the three lists
- [ ] `hooksTrusted` returns `null`, not `false`, when it cannot determine the answer
- [ ] `commands/fx-setup.md` reports the three states separately, never merged
- [ ] On Codex it reports hook trust, and names the command that fixes it
- [ ] `skills/fx-setup/SKILL.md` is regenerated, so task 07's equivalence test still passes
- [ ] A user with everything correct sees a short confirmation, not a wall of output

## Steps

- [ ] **1. Write the failing test**

Append to `lib/plant-roles.test.js`:

```js
const { auditRoles, hooksTrusted } = require('./plant-roles');

const home2 = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-audit-'));
const empty = auditRoles({ home: home2, source });
assert.strictEqual(empty.present.length, 0);
assert.strictEqual(empty.missing.length, expected, 'an empty home is all missing');
assert.strictEqual(empty.stale.length, 0);

plantRoles({ home: home2, source });
const full = auditRoles({ home: home2, source });
assert.strictEqual(full.present.length, expected);
assert.strictEqual(full.missing.length, 0);
assert.strictEqual(full.stale.length, 0);

// Reporting must not repair.
const target = path.join(home2, 'agents', `${READ_ONLY_AGENTS[0]}.toml`);
fs.writeFileSync(target, 'name = "tampered"\n');
const drifted = auditRoles({ home: home2, source });
assert.deepStrictEqual(drifted.stale.map((p) => path.basename(p, '.toml')), [READ_ONLY_AGENTS[0]]);
assert.strictEqual(fs.readFileSync(target, 'utf8'), 'name = "tampered"\n',
  'auditRoles must report, never repair');

// An unrelated role belongs to none of the three lists.
fs.writeFileSync(path.join(home2, 'agents', 'someone-elses.toml'), 'name = "theirs"\n');
const after = auditRoles({ home: home2, source });
const all = [...after.present, ...after.missing, ...after.stale].map((p) => path.basename(p, '.toml'));
assert.ok(!all.includes('someone-elses'), 'fx reports only on what it generates');

assert.strictEqual(hooksTrusted({ home: fs.mkdtempSync(path.join(os.tmpdir(), 'fx-notrust-')) }), null,
  'an unknown shape is null, never a confident false');

fs.rmSync(home2, { recursive: true, force: true });
console.log('audit-roles: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node lib/plant-roles.test.js`
Expected: FAIL, `auditRoles is not a function`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Run: `node lib/plant-roles.test.js`
Expected: PASS, `audit-roles: OK`.

- [ ] **5. Add the reporting section to the setup lane**

`commands/fx-setup.md` gains a section that runs the audit and prints the three
states separately. On Codex it also prints hook trust and the command that
fixes it. When everything is correct it prints one line.

- [ ] **6. Regenerate the skill body**

Run: `scripts/gen-command-skills`
Then: `node tests/gates/user-invoked.test.js`
Expected: PASS. The generated body must still match after the depth rewrite.

- [ ] **7. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add lib/plant-roles.js lib/plant-roles.test.js commands/fx-setup.md skills/fx-setup
git commit -m "feat(setup): report missing, stale and untrusted install state"
```

No attribution trailers. Then continue to the next task: never stop and wait.
