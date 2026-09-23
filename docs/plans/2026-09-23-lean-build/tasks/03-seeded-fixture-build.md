# 03: Seeded fixture build

**Status:** ready-for-agent
**Blocked by:** 01, 02
**Phase:** MVP

**What to build:** a repeatable, scored fx build. A tiny repository and an
approved six-task fx plan for it, with planted traps. One command runs a real
headless `fx-implement` build of that plan inside the conformance jail, then
scores it three ways:

1. **Caught at the end:** each trap's hidden test, run on the finished branch.
2. **By review:** the same hidden test run at the original implementer's own
   commit for the task that carries the trap. Red there and green at the end
   means review caught it; red at both means review missed it. This is the number that shows
   whether a change weakened review. Caught-at-the-end alone saturates when
   implementers get it right first time.
3. **Cost and time:** `scripts/build-cost` on the session's transcript.

Plus, for step 4: **merge defects**, a task's hidden test green on its own
task branch and red after the merge.

The build never sees the hidden tests. The traps are **in task prose**, not in
the fixture design's Global Constraints: `fx-implement` copies Global
Constraints verbatim into every implementer dispatch
(`skills/fx-implement/SKILL.md`, the dispatch and Global Constraints sections),
so a trap placed there is answered before it can be sprung.

**Files:**
- Create: `tests/fixture-build/repo/` (the seed repository, see "Seed repo")
- Create: `tests/fixture-build/repo/docs/plans/2026-01-01-notes/design.md`
- Create: `tests/fixture-build/repo/docs/plans/2026-01-01-notes/plan.md`
- Create: `tests/fixture-build/repo/docs/plans/2026-01-01-notes/tasks/01-store.md` … `06-cli-export-search.md`
- Create: `tests/fixture-build/hidden/traps.test.js`
- Create: `tests/fixture-build/hidden/traps.self-test.js`
- Create: `tests/fixture-build/hidden/implementer-heads.js`
- Create: `tests/fixture-build/hidden/implementer-heads.test.js`
- Create: `tests/fixture-build/rows/01-fixture-build.sh`
- Create: `tests/fixture-build/run.sh`
- Create: `tests/fixture-build/README.md`
- Modify: `tests/conformance/lib/live.sh` (timeout and max-turns overridable)
- Modify: `tests/conformance/run.sh` (only if it scrubs `FX_FIXTURE_*`; see "run.sh")
- Modify: `scripts/check-all` (add the two unit tests)

**Interfaces:**
- Consumes: `scripts/build-cost <controller.jsonl> --json` (task 01).
- Consumes: the conformance row contract: `<row> --describe` prints
  `<n>|<name>|live`; exit 0 pass, 77 gap, other fail; `live_workdir` creates
  `$WORK` (a git repo on `main`, named `work.XXXXXX` under the scratch
  directory), `live_run "$PROMPT"` runs one headless session there. The runner
  has already pointed `HOME` and `CLAUDE_CONFIG_DIR` into a scratch directory.
- Produces: `live.sh` reads `FX_LIVE_TIMEOUT` (default `600`) and
  `FX_LIVE_MAX_TURNS` (default `30`) for the claude-code branch of `live_run`.
  With both unset, behaviour is byte-identical to today.
- Produces: `node tests/fixture-build/hidden/traps.test.js <repo-dir> [--only <trap>[,<trap>]]`
  prints one JSON object `{ "<trap>": true|false }` for the six traps (or only
  the named ones) and exits 0; exits 2 when `<repo-dir>` has no `lib/`.
  Traps: `path-escape`, `missing-note-error`, `readme-example`,
  `export-order`, `search-case`, `cli-wiring`.
- Produces: `node tests/fixture-build/hidden/implementer-heads.js <controller.jsonl>`
  prints `{ "<NN>": "<sha>" }`: for each fixture task, the original
  implementer's head. The subagent files beside the controller transcript
  (`<session>/subagents/*.jsonl`) whose first user message contains
  `You are implementing task <NN>` are that task's implementers and fixers; the
  earliest by first timestamp is the original. Its head is the last 7 to 40
  character hex SHA in its final assistant message's text. A task with no
  parseable SHA is omitted (scored `unknown`).
- Produces: `tests/fixture-build/run.sh <runs> <label>` writes
  `docs/plans/2026-09-23-lean-build/runs/<label>-<n>.json`, one per run:

```json
{ "label": "baseline", "run": 1, "fxCommit": "649da01", "parallel": false, "builtOnMain": false,
  "caughtAtEnd":    { "path-escape": true, "missing-note-error": true, "readme-example": true,
                      "export-order": true, "search-case": false, "cli-wiring": true },
  "byReview":       { "path-escape": "caught", "missing-note-error": "unknown", "readme-example": "clean",
                      "export-order": "clean", "search-case": "missed", "cli-wiring": "clean" },
  "mergeDefects": 0,
  "cost": { "...": "the full build-cost --json object" } }
```

  `byReview[t]`, from the trap at the implementer head and at the end:
  `caught` (red, then green), `missed` (red, then red), `clean` (green at the
  head: the implementer got it right, nothing for review to catch; a later red
  at the end also counts as `missed`), `unknown` (no head found). Only
  `caught` and `missed` say anything about review: a variant whose
  implementers do better shows more `clean`, which is not a review loss.

**Seed repo** (`tests/fixture-build/repo/`): Node, no dependencies, CommonJS.
`README.md` (one line), `lib/.gitkeep`, `test/.gitkeep`, and `.fx.json`:
`"test_one": "node --test {file}"`, `"test_scope": "node --test {paths}"`,
`"test_all": "node --test"`, `"setup": "node --version"`,
`"isolated_test_execution": false`, every other key `null`. `setup` is a real
command because `fx-implement` stops to ask when it is `null`, and nobody
answers in a headless run.

**The fixture plan** is a real fx plan written with the `fx-plan` templates
(`plan.md` header block verbatim, one file per task, Files, Interfaces,
Acceptance criteria, test code written out). Its Global Constraints are
generic only: `CommonJS, synchronous APIs, no dependencies`, `Notes live under
process.env.NOTES_DIR, default ./notes`. Every task's Interfaces pin exact
names: `lib/store.js` exports `save(name, text)`, `load(name) -> string`,
`list() -> string[]`; `lib/export.js` exports `exportAll() -> string`;
`lib/search.js` exports `search(q) -> string[]`; `cli.js` commands
`add <name> <text>`, `show <name>`, `export`, `search <q>`.

Tasks and traps. The trap sentence sits once in the task's **What to build**
prose; the task's example test and acceptance criteria do not mention it. The
spec reviewer, which checks the diff against the whole task file, is meant to
catch it. No fixture file uses the word "trap".

| # | Task | Blocked by | Trap sentence (in task prose) | Hidden test |
|---|------|-----------|------|-------------|
| 01 | `lib/store.js` | none | **path-escape**: "Names come from the command line, so a name that would resolve outside `NOTES_DIR` is rejected with `err.code === 'EBADNAME'`." **missing-note-error**: "Loading a note that does not exist throws with `err.code === 'ENOTE'`; callers must be able to tell it from an empty note." | `save('../x','y')` and `load('../../etc/hostname')` throw `EBADNAME`, and `<tmp>/x` does not exist; `load('nope')` throws `ENOTE` |
| 02 | `cli.js`: `add`, `show` | 01 | none | |
| 03 | `README.md` usage section (filed as docs) | 02 | **readme-example**: "The example must work when pasted into a shell at the repository root; there is no installed binary." | first fenced `sh` block, run line by line in the repo with a temp `NOTES_DIR`, exits 0 and prints the note text |
| 04 | `lib/export.js` | 01 | **export-order**: "Notes appear in the order `list()` returns them." | three notes saved out of order export sorted |
| 05 | `lib/search.js` | 01 | **search-case**: "People type queries in any case." | `search('HELLO')` finds a note containing `hello` |
| 06 | `cli.js`: `export`, `search` | 02, 04 | **cli-wiring**: declared `Parallel with: 05` ("06 only touches `cli.js`"), but its `search` command needs `lib/search.js` from 05 | `node cli.js search HELLO` prints the matching name, `node cli.js export` prints sorted output, and `cli.js` requires `./lib/search` (no second search implementation) |

Tasks 04 and 05 declare `**Parallel with:**` each other with a true reason:
disjoint files, both consume only `lib/store.js`. That is the pair step 4 can
speed up. Task 06's claim is the false one a guard must send back to serial.
Until task 11 lands, `fx-implement` ignores the field.

**Row** (`tests/fixture-build/rows/01-fixture-build.sh`), in order:
1. `--describe` prints `1|fixture build|live`.
2. Source `live.sh`, `live_workdir`, copy `tests/fixture-build/repo/.` into
   `$WORK`. If `FX_FIXTURE_PARALLEL=1`, set `isolated_test_execution` to
   `true` in the copied `.fx.json` (default: `false`, so today's `fx-implement`
   stays serial and the baseline is not confounded). Commit on `main`. **Do
   not copy `hidden/`.**
3. `FX_LIVE_TIMEOUT=10800 FX_LIVE_MAX_TURNS=2000 live_run` with the prompt:
   `The plan in docs/plans/2026-01-01-notes/ is approved and ready. Build it. This is an unattended headless run: nobody will answer questions, so take the recommended option at every choice. Never end your turn while a subagent is outstanding: dispatch subagents as foreground calls (several in one message run at the same time). Finish with the branch reviewed and not merged.`
4. Locate the build: the worktree from `git -C "$WORK" worktree list` that is
   not `$WORK`; if none, use `$WORK` and set `"builtOnMain": true`.
5. Controller transcript: `enc=$(printf %s "$WORK" | sed 's/[^A-Za-z0-9]/-/g')`
   (Claude Code encodes the cwd this way: `work.XXXXXX` becomes
   `work-XXXXXX`), then the `*.jsonl` files directly in
   `$CLAUDE_CONFIG_DIR/projects/$enc/` (not in subdirectories). Exactly one
   is expected; zero or several is a row failure naming what was found.
6. `caughtAtEnd`: `traps.test.js` on the build.
7. `byReview`: `implementer-heads.js` on the transcript; for each task
   with a trap and a known head, `git worktree add --detach` a temp checkout at
   that head (outside `$WORK`), run `traps.test.js <checkout> --only <its traps>`,
   remove the checkout.
8. `mergeDefects`: for each ledger line `Task NN: parallel with MM, branch <b>`
   (written by task 11's procedure; absent before it), run that task's traps at
   `<b>`'s head and at the end; count green-then-red. `0` when no such line.
9. `cost`: `scripts/build-cost --json` on the transcript.
10. Write the result JSON to `$FX_FIXTURE_OUT/$FX_FIXTURE_LABEL-$FX_FIXTURE_RUN.json`.
    The row runs on the host side of the jail, so this path is outside it.
11. Exit 0 when the build produced a branch and every scorer ran; exit 1
    otherwise, naming the scorer. A trap missed is data, not a row failure.

**`run.sh`**: validates `<runs>` is a positive integer and `<label>` matches
`^[a-z0-9-]+$`, refuses an existing result file (exit 2 with its path), then
loops `FX_CONFORMANCE_ROWS=tests/fixture-build/rows FX_FIXTURE_OUT=... FX_FIXTURE_LABEL=... FX_FIXTURE_RUN=$i tests/conformance/run.sh claude-code`,
passing `FX_FIXTURE_PARALLEL` through. Check whether `tests/conformance/run.sh`
scrubs the environment; if it does, allow-list the four `FX_FIXTURE_*`
variables there. Prints per run: `run <n>: end <k>/6, review caught <c> missed <m>, merge defects <m>, parallel <0|1>, controller calls <c>, tokens <t>, wall <minutes>m`.

**Seam:** unit for `traps.test.js` (by `traps.self-test.js`) and
`implementer-heads.js` (by its test), both in `check-all`. The row is live and
owner-run (task 04, which starts with a one-run smoke).

**Risks:**
- The row must never touch the real `~/.claude`. Everything goes through the
  conformance runner, which sets `HOME` and `CLAUDE_CONFIG_DIR` to scratch and
  refuses to run rows outside it. Do not call `claude` directly from `run.sh`.
  Temp checkouts in step 7 are removed with `git worktree remove`, never with
  `rm -rf` on a computed path.
- Trap difficulty is a guess until the smoke and baseline runs; task 04 owns
  adjusting it.

**Idempotency:** `run.sh` refuses to overwrite a result file.

**Testing:** the two unit tests; `bash -n` on both shell files; the row's
`--describe`; `scripts/check-all`. The live row is not run in this task.

## Acceptance criteria
- [ ] With `FX_LIVE_TIMEOUT` and `FX_LIVE_MAX_TURNS` unset, `live_run`'s claude-code command line is unchanged.
- [ ] `traps.self-test.js` passes: all six traps `true` on the reference build, the planted-bug build scores exactly as the test states, and `--only` limits the output.
- [ ] `implementer-heads.test.js` passes: picks the earliest implementer per task, takes the last SHA of its final message, omits a task with no SHA, ignores reviewer files.
- [ ] The fixture plan follows the `fx-plan` templates, pins the exports above, and each trap sentence appears once, in prose only.
- [ ] `grep -ril trap tests/fixture-build/repo` prints nothing; `lib/.gitkeep` and `test/.gitkeep` exist.
- [ ] `run.sh` refuses a bad run count, a bad label, and an existing result file.
- [ ] `tests/fixture-build/README.md` gives the one command, says it spends quota, and says a run takes up to 3 hours.

## Steps

- [ ] **1. Write the failing self-test**

```js
'use strict';
// Run: node tests/fixture-build/hidden/traps.self-test.js
// Builds a correct and a buggy implementation of the fixture's contract and
// checks the hidden tests score each one correctly.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TRAPS = path.join(__dirname, 'traps.test.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-traps-'));

const good = {
  'lib/store.js': `
const fs = require('fs'); const path = require('path');
const dir = () => path.resolve(process.env.NOTES_DIR || './notes');
function file(name) {
  const f = path.resolve(dir(), name);
  if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }
  return f;
}
exports.save = (n, t) => { const f = file(n); fs.mkdirSync(dir(), { recursive: true }); fs.writeFileSync(f, t); };
exports.load = (n) => { const f = file(n); if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return fs.readFileSync(f, 'utf8'); };
exports.list = () => (fs.existsSync(dir()) ? fs.readdirSync(dir()).sort() : []);
`,
  'lib/export.js': `const s = require('./store'); exports.exportAll = () => s.list().map((n) => '# ' + n + '\\n\\n' + s.load(n) + '\\n').join('');`,
  'lib/search.js': `const s = require('./store'); exports.search = (q) => s.list().filter((n) => s.load(n).toLowerCase().includes(q.toLowerCase()));`,
  'cli.js': `
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b); else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(require('./lib/search').search(a).join('\\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
`,
  'README.md': '# notes\n\n```sh\nnode cli.js add hello "hello world"\nnode cli.js show hello\n```\n',
};
const bad = {
  ...good,
  'lib/store.js': good['lib/store.js']
    .replace("if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }", '')
    .replace("if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } ", "if (!fs.existsSync(f)) return ''; "),
  'lib/search.js': `const s = require('./store'); exports.search = (q) => s.list().filter((n) => s.load(n).includes(q));`,
  'README.md': '# notes\n\n```sh\nnotes add hello "hello world"\nnotes show hello\n```\n',
};
function build(name, files) {
  const dir = path.join(root, name);
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
const score = (dir, ...extra) => JSON.parse(execFileSync('node', [TRAPS, dir, ...extra], { encoding: 'utf8' }));

assert.deepStrictEqual(score(build('good', good)), {
  'path-escape': true, 'missing-note-error': true, 'readme-example': true,
  'export-order': true, 'search-case': true, 'cli-wiring': true,
});
assert.deepStrictEqual(score(build('bad', bad)), {
  'path-escape': false, 'missing-note-error': false, 'readme-example': false,
  'export-order': true, 'search-case': false, 'cli-wiring': false,
});
assert.deepStrictEqual(score(path.join(root, 'good'), '--only', 'search-case,export-order'),
  { 'export-order': true, 'search-case': true });
fs.rmSync(root, { recursive: true, force: true });
console.log('traps self-test: ok');
```

`cli-wiring` is `false` on the buggy build because its CLI search inherits the
case bug from `lib/search.js`.

- [ ] **2. Run it: verify RED.** Run: `node tests/fixture-build/hidden/traps.self-test.js`. Expected: FAIL, `Cannot find module .../traps.test.js`.

- [ ] **3. Implement `traps.test.js`** (driven by `fx-tdd`). Each trap runs in
its own fresh temp directory `<tmp>` with `NOTES_DIR=<tmp>/n`, so a build that
fails the escape check writes into `<tmp>` and nowhere else; `path-escape` also
asserts `<tmp>/x` does not exist afterwards. Each trap loads the repo's modules
with a cleared `require` cache and catches every exception into `false`.
`readme-example` and `cli-wiring` run commands with `child_process.execSync`
(`cwd` the repo, `NOTES_DIR` in the env) and treat a non-zero exit as `false`.

- [ ] **4. Run it: verify GREEN.**

- [ ] **5. Write the failing `implementer-heads.test.js`**: synthetic controller and subagent files in a temp dir (two implementer files for task 01 at different times, final messages containing SHAs; one reviewer file with a SHA; one implementer for task 02 with no SHA). Expected output: `{ "01": "<the earlier file's last SHA>" }`. Verify RED, implement `implementer-heads.js`, verify GREEN.

- [ ] **6. Write the seed repo and the fixture plan** per the sections above. Then: `grep -ril trap tests/fixture-build/repo` prints nothing.

- [ ] **7. Make `live_run`'s timeout and max-turns overridable.** In `tests/conformance/lib/live.sh`, claude-code branch only: `timeout "${FX_LIVE_TIMEOUT:-600}"` and `--max-turns "${FX_LIVE_MAX_TURNS:-30}"`. Run `bash tests/conformance/runner-isolation.test.sh` and `bash -n tests/conformance/lib/live.sh`.

- [ ] **8. Write the row, `run.sh` and the README.** Run `bash -n` on both scripts, `tests/fixture-build/rows/01-fixture-build.sh --describe` (prints `1|fixture build|live`, spends nothing), and `tests/fixture-build/run.sh 0 baseline` and `run.sh 1 BAD`: each exits 2.

- [ ] **9. Run the suite.** Add both unit tests to `scripts/check-all`, run it.

- [ ] **10. Commit**

```
git add tests/fixture-build tests/conformance/lib/live.sh scripts/check-all
git commit -m "test(fixture-build): seeded fixture build scored at the end, by review, and by cost"
```

Add `tests/conformance/run.sh` only if step 8 changed it. `tests/fixture-build`
is a directory this task creates entirely.
