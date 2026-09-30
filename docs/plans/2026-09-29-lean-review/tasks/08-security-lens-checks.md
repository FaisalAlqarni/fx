# 08: Security lens checks

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Polish

**What to build:** `fx-lens-security` hunts eight more data-isolation and session defects on any diff, and two that need a whole feature in view only in a branch review. The items come from `cloudflare/security-audit-skill` (MIT), taken as content only: no workflow, sandbox or report schema.

**Files:**
- Modify: `agents/fx-lens-security.md`
- Modify: `codex/agents/fx-lens-security.toml` (regenerated)
- Create: `tests/gates/lens-content.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `tests/gates/lens-content.test.js`, which task 09 extends with a11y and design checks.

**Seam:** the lens's hunt list, pinned by a gate test.

**Risks:** the lens's existing items stay as they are; each new item goes under the existing bold label it belongs to. The lens's frontmatter description is unchanged (it governs the branch-pass trigger).

**Idempotency:** insertions checked for presence first; the generator is idempotent; the `check-all` line is added only if absent.

**Testing:** gate test; `agent-model.test.js`; `check-generated`.

## Acceptance criteria
- [ ] The eight items below are in the hunt list under the labels given.
- [ ] A `**Branch review only**` label carries the two whole-feature items and says when they apply.
- [ ] `codex/agents/fx-lens-security.toml` is regenerated; `scripts/check-generated` passes.
- [ ] `tests/gates/lens-content.test.js` passes and is in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane.**

- [ ] **2. Write the failing test** at `tests/gates/lens-content.test.js`:

```js
'use strict';
// Content absorbed into the lenses. Task 09 adds the a11y and design checks.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
// Prose wraps at any word, so compare with whitespace collapsed.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');

const sec = read('agents/fx-lens-security.md');
for (const phrase of [
  'search, filter, sort or export path',
  'export or import path with no authorization of its own',
  'soft delete or revoke that a cache, search index or background job still honours',
  'webhook or callback URL a user saves',
  'log, analytics or ClickHouse reader that ignores the tenant',
  'differs between "missing" and "forbidden"',
  'not bound to its audience or issuer',
  'session fixation',
  '**Branch review only**',
  'second-order',
  'restore, rollback or undelete',
]) {
  assert.ok(sec.includes(phrase), `security lens hunts: ${phrase}`);
}

console.log('lens-content.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/lens-content.test.js`
Expected: FAIL, `security lens hunts: search, filter, sort or export path`.

- [ ] **4. Add the items to `agents/fx-lens-security.md` `## Hunt list`.**

Under `**Access control**`, after the `- Tenant scope dropped:` bullet:

```markdown
- A new search, filter, sort or export path that drops the tenant scope the
  rest of the model enforces: the list page is scoped, the CSV is not.
- An export or import path with no authorization of its own: it is a second
  door to every record the model holds.
- A soft delete or revoke that a cache, search index or background job still
  honours after the record or grant is gone.
```

Under `**Injection and untrusted input**`, after the `- SSRF:` bullet:

```markdown
- A webhook or callback URL a user saves and the server calls later: SSRF by
  configuration, which a request-time check never sees.
```

Under `**Secrets and data exposure**`, after the last bullet:

```markdown
- A log, analytics or ClickHouse reader that ignores the tenant, so one
  tenant's data reaches another tenant's report.
- Error text or status that differs between "missing" and "forbidden", which
  tells a caller which records exist.
```

Under `**Crypto, sessions, transport**`, after the `- JWT:` bullet:

```markdown
- A JWT whose signature is verified but which is not bound to its audience or
  issuer, so a token minted for another service is accepted.
- No session reset on login (session fixation).
```

After the `**Crypto, sessions, transport**` list, before `## Method`:

```markdown
**Branch review only**: these need the whole feature in view. Report them when
the diff spans more than one task, not on a single task's diff.

- Data stored safely, then reused later in a context that trusts it
  (second-order injection): a name saved through a validated form and later
  interpolated into SQL, a shell command or HTML.
- A restore, rollback or undelete that brings a record back without
  re-checking who may see it, or with grants that were revoked since.
```

- [ ] **5. Run it: verify GREEN**

Run: `node tests/gates/lens-content.test.js`
Expected: `lens-content.test.js: OK`

- [ ] **6. Regenerate the Codex agents**

Run: `scripts/gen-codex-agents && scripts/check-generated`
Expected: `check-generated: OK`; `codex/agents/fx-lens-security.toml` modified.

- [ ] **7. Add the gate to `scripts/check-all`** after the `review-content.test.js` line if present, else after `return-contract.test.js`:

```
run lens-content.test.js node tests/gates/lens-content.test.js
```

- [ ] **8. Run the touched gates**

Run: `node tests/gates/agent-model.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-prose agents/fx-lens-security.md`
Expected: all pass.

- [ ] **9. Commit**

```
git add agents/fx-lens-security.md codex/agents/fx-lens-security.toml tests/gates/lens-content.test.js scripts/check-all
git commit -m "feat(lens-security): data isolation and session checks"
```
