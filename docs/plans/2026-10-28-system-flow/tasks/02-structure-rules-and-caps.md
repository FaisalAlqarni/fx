# 02: Structure rules and caps in check

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** after the schema passes, `system-flow check` enforces the structure a reader relies on: every reference resolves, every evidenced item of every kind carries evidence or says it is unconfirmed, every diagram stays readable, and no em or en dash reaches the site. A model that breaks a rule fails with one line per problem naming the item; Arabic script in a label passes with a warning so a real product string survives and anything else gets fixed.

**Design:** The model; The CLI; Terms

**Files:**
- Create: `src/lib/sf-rules.ts`
- Modify: `src/scripts/system-flow.ts` (call `checkRules` after a clean merge)
- Create: `src/scripts/system-flow-rules.test.ts` (built to `scripts/system-flow-rules.test.js`)
- Modify: `scripts/check-all` (one `run system-flow-rules.test.js ...` line)

**Interfaces:**
- Consumes: `Model`, `Problem`, `mergeFragments`, `itemsOf` (from task 01).
- Produces: `checkRules(model: Model, origin: Map<string, { file: string; pointer: string }>): Problem[]` in `src/lib/sf-rules.ts`. `origin` maps every handle (`<kind>:<id>`, plan.md Global Constraints, derived ids included) to where it is defined; `mergeFragments` gains it as a third return field `origin` in this task.

**Seam:** the `system-flow` CLI run as a process (`check`).

**Tests:** each on the task 01 good set plus the one change named; every failing case exits 1; `<f>` stands for the fragment file path relative to the host root.
- 13 primary nodes in diagram `engine`: stderr line `<f>:/levels/diagrams/0: level engine has 13 primary nodes, at most 12`.
- Evidence per kind: one case per evidenced kind, each with `evidence: []` and no `unconfirmed`, each failing with `<f>:<pointer>: <kind word> <id> has no evidence and is not unconfirmed`, and each passing (exit 0) once `unconfirmed: true` is added. The kind words and ids: `node api`, `edge engine:api>db`, `group g1`, `participant turn.api`, `message turn#1`, `store row sql-links`, `step first#1`, `catalogue entry q-mail`, `inventory entry job-sweep`, `rule r1`, `bullet b1`.
- Primary node `api` in `system` with `children: "engine"` while diagram `engine` has `parent: "clients"`: `... node api opens engine, whose parent is clients, not system`.
- Context node `mail` (`primary: false`) in `system` with `children: "engine"` while `engine` has `parent: "clients"`: exit 0 (a context node only needs an existing target).
- `children: "nowhere"` on a primary node and on a context node: each fails with `... node <id> opens missing diagram nowhere`.
- A node with no edge in its diagram: `... node lonely in system has no edge`.
- Edge `from: "api", to: "ghost"`: `... edge system:api>ghost names a missing node ghost`.
- Message `turn#3` with `to: "ghost"`: `... message turn#3 names a missing participant ghost`.
- Flow step `first#2` with `actor: "ghost"` where no node or participant `ghost` exists anywhere: `... step first#2 names a missing actor ghost`.
- A store flow with `chapter: "nochapter"`: `... flow first names a missing chapter nochapter`; a sequence with `chapter: "x"` gives `... sequence turn names a missing chapter x`.
- Section `s1` with `diagrams: ["gone"]`: `... section s1 names a missing diagram gone`; the same for `sequences`, `storeFlows`, `storeRefs` (a store row id), `catalogueRefs` and `covers` (an inventory id), with the kind word `sequence`, `store flow`, `store row`, `catalogue entry`, `inventory entry`.
- Handles: question `q1` with `items: ["node:ghost"]`: `... question q1 names a missing item node:ghost`; `items: ["api"]` (no prefix): `... question q1 names api, which is not a handle (<kind>:<id>)`; correction `c1` with `item: "bullet:b9"`: `... correction c1 names a missing item bullet:b9`; `items: ["node:api"]` with node `api` present: exit 0.
- An em dash (U+2014) in a node label: `... /levels/diagrams/0/nodes/0/label: em or en dash`; an en dash (U+2013) in a bullet text gives the same message at its pointer.
- Node `api` with label `"مرحبا"`: exit 0; stdout `warnings` equals `["<f>:/levels/diagrams/0/nodes/0/label: Arabic script in a label of node api"]`.
- The task 01 good set still exits 0 with `warnings: []`.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] Every cap and cross-reference the design's "Caps checked by `check`" paragraph lists fails with its own message, with the children rule as plan.md states it.
- [ ] Each of the eleven evidenced kinds fails without evidence and passes when `unconfirmed`.
- [ ] Arabic script is a warning in stdout, not a failure.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-rules.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-rules.test.js`
Expected: the failing-model cases exit 0 because no rule exists yet.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-rules.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-rules.ts src/lib/sf-model.ts src/scripts/system-flow.ts src/scripts/system-flow-rules.test.ts`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-check.test.js`

- [ ] **7. Commit by path**

```
git add src/lib/sf-rules.ts lib/sf-rules.js src/lib/sf-model.ts lib/sf-model.js src/scripts/system-flow.ts scripts/system-flow src/scripts/system-flow-rules.test.ts scripts/system-flow-rules.test.js scripts/check-all
git commit -m "feat(system-flow): structure rules, caps and dash ban in check"
```

No attribution trailers. Then continue to the next task: never stop and wait.
