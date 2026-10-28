# 04: `system-flow migrate`

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** MVP

**What to build:** `system-flow [--root <dir>] [--site <dir>] migrate` rewrites every fragment in `<site>/model/fragments/` from version 1 to 2, all or nothing, and prints what was rewritten and the prose the model still owes. It changes no label, fact or evidence. A version-2 fragment is left byte for byte.

**Design:** Migration; Error handling

**Files:**
- Create: `src/lib/sf-migrate.ts`
- Modify: `src/scripts/system-flow.ts` (the `migrate` subcommand and the usage line)
- Create: `src/scripts/system-flow-migrate.test.ts` (built to `scripts/system-flow-migrate.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `writeAll` (`sf-model.ts`); `checkProse(model, 'whole')` (task 03); the schema (task 01).
- Produces, `src/lib/sf-migrate.ts`: `lookOf(kind: string | undefined): Look` (the design's table, case-insensitive on the whole kind, `undefined` gives `service`) and `migrate(hostRoot: string, site: string): { rewritten: string[]; owed: string[]; problems: Problem[] }`.
- Produces, stdout on success: `{"rewritten":[<file>...],"owed":[<"file:pointer: message">...]}`, files relative to the host root, sorted; `owed` is exactly the error lines `checkProse` gives on the migrated model, in the format `check` prints (task 03's messages).
- The usage line gains `| migrate`.

**Seam:** the `system-flow` CLI run as a process.

**Tests:** a version-1 set: `meta.json` (`schemaVersion: 1`, `meta.title: "Shop"`, no `name`), `level0.json` with nodes of kinds `Database`, `browser`, `third-party`, `auth`, `backend` and no `look`, `turns.json` with one sequence whose participants have kinds `cache` and none, and `chapters.json` with one section (no role, no lead).
- Looks: after `migrate`, the five nodes have `look` `store`, `client`, `external`, `security`, `service`; the participants `store` and `service`.
- Version and name: `meta.json` has `schemaVersion: 2` and `meta.name: "Shop"`; a `meta.name` already present is kept.
- Nothing else changes: parse each fragment before and after; removing `look`, `schemaVersion` and `meta.name` from the after-copy gives a value deep-equal to the before-copy.
- Output: exit 0; stdout `rewritten` is the four files; `owed` holds `docs/system-flow/model/fragments/meta.json:/meta: meta.intro missing`, `docs/system-flow/model/fragments/chapters.json:/sections: Start here role what missing` and the other prose lines, and equals the error lines `check` prints on the migrated set (run `check` and compare as sets).
- The hint is gone: `check` after `migrate` prints no `run system-flow migrate` line.
- Idempotent: a second `migrate` exits 0 with `rewritten: []`, and every fragment's bytes and mtime are unchanged.
- Mixed set: version-2 `meta.json` and a `chapters.json` that says `schemaVersion: 1`: `migrate` rewrites only `chapters.json`.
- All or nothing: a version-1 node with `kind: 42` (the transform cannot produce a valid version-2 fragment): exit 1, stderr names `level0.json` and the pointer, and every fragment is byte-unchanged.
- No folder: `--site nowhere` exits 1 with `system-flow: migrate: no fragments folder at nowhere/model/fragments`.
- Usage: `migrate extra` exits 2 with the usage line.

**Idempotency:** writes go through `writeAll` (every file to a temp file, renamed only when all are written); a version-2 fragment is never rewritten.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] One command brings a first-iteration model to version 2 and lists the prose still owed, the same list `check` fails on.
- [ ] A second run changes nothing.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-migrate.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-migrate.test.js`
Expected: exit 2, the usage line (no `migrate` subcommand yet).

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-migrate.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/lib/sf-migrate.ts lib/sf-migrate.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-migrate.test.ts scripts/system-flow-migrate.test.js scripts/check-all
git commit -m "feat(system-flow): system-flow migrate from schema version 1 to 2"
```

Never push, merge or open a PR.
