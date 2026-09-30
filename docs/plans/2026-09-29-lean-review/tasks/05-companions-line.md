# 05: Companion tools line in the preamble

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** every session and every subagent, on all three runtimes, is told to use the owner's companion tools when the runtime has them and to skip them silently when it does not: repowise before reading or searching files, the ponytail skill at full, the caveman skill at full, and fx-humanize on prose for people. A repository can replace the line or turn it off with a `companions` key in `.fx.json`. The owner asked for this ten times across sessions because subagents read neither memory nor CLAUDE.md.

**Files:**
- Modify: `lib/preamble.js`
- Modify: `lib/preamble.test.js`
- Create: `docs/adr/0032-the-preamble-carries-a-companion-tools-line.md`

**Interfaces:**
- Consumes: the worst-case fixture in `lib/preamble.test.js` as task 04 left it (10 rulings).
- Produces: `render({ harness, cwd, subagent })` output (signature unchanged) now includes the companions line for sessions and subagents. `.fx.json` key `companions`: a string replaces the default; `""` turns it off; a missing file, missing key, non-string value or unparseable file means the default.

**Seam:** `render()` output per harness, in `lib/preamble.test.js`.

**Risks:** the bootstrap-alone budget (under 3,000) is measured with an empty directory, where the default line now appears. The line sits outside the bootstrap by design (`design.md` §5c), so the test's "alone" render must use a directory whose `.fx.json` has `{"companions": ""}`. This is the first code that reads `.fx.json`; it must never throw. `plugins/fx.js` renders once at construction, so an opencode session picks up a changed `.fx.json` on its next start; that is acceptable and should be one line in the ADR.

**Idempotency:** read-only rendering; temp fixtures removed at the end.

**Testing:** unit tests on `render()` output across the three harnesses; budget tests.

## Acceptance criteria
- [ ] With no `.fx.json`, every harness's session and subagent render contains the default line, which names repowise, ponytail, caveman and the fx-humanize lane rendered for that harness.
- [ ] `.fx.json` `{"companions": "Use tool X."}` replaces the default; `{"companions": ""}` removes it; `{ not json` falls back to the default.
- [ ] The bootstrap-alone budget is measured with companions off and stays under 3,000; the worst case (repo.md, 3 plans, 10 rulings, default companions) stays under 9,000, per harness.
- [ ] ADR-0032 records the default text, the override, and why it lives outside the bootstrap.

## Steps

- [ ] **1. Invoke the `fx-tdd` lane.**

- [ ] **2. Write the failing test.** Add a block to `lib/preamble.test.js` before its final `console.log('preamble.test.js: OK')`, reusing the file's existing requires of `fs`, `os`, `path`, `render` and `HARNESSES` (add any that are missing at the top):

```js
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-companions-'));
  for (const harness of HARNESSES) {
    for (const subagent of [false, true]) {
      const text = render({ harness, cwd: dir, subagent });
      assert.ok(text.includes('Companion tools.'), `${harness}${subagent ? ' subagent' : ''}: default line present`);
      for (const tool of ['repowise', 'ponytail', 'caveman', 'fx-humanize']) {
        assert.ok(text.includes(tool), `${harness}: the line names ${tool}`);
      }
    }
  }
  fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify({ companions: 'Use tool X.' }));
  let t = render({ harness: 'claude-code', cwd: dir });
  assert.ok(t.includes('Use tool X.') && !t.includes('Companion tools.'), 'a string replaces the default');
  fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify({ companions: '' }));
  t = render({ harness: 'claude-code', cwd: dir });
  assert.ok(!t.includes('Companion tools.') && !t.includes('Use tool X.'), 'an empty string turns it off');
  fs.writeFileSync(path.join(dir, '.fx.json'), '{ not json');
  t = render({ harness: 'claude-code', cwd: dir });
  assert.ok(t.includes('Companion tools.'), 'unparseable .fx.json falls back to the default');
  fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify({ companions: 42 }));
  t = render({ harness: 'claude-code', cwd: dir });
  assert.ok(t.includes('Companion tools.'), 'a non-string value falls back to the default');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('companions line: passed');
}
```

- [ ] **3. Run it: verify RED**

Run: `node lib/preamble.test.js`
Expected: FAIL, `claude-code: default line present`.

- [ ] **4. Implement in `lib/preamble.js`** with `fx-tdd`. Add a function `companions(cwd, lane)` returning a string or `null`, reading `path.join(cwd, '.fx.json')` inside a try. The default text, with the lane rendered through the harness's `lane()`:

```js
`Companion tools. Use each one this runtime has, and skip silently any it lacks: `
  + 'repowise for codebase questions before reading or searching files; the '
  + 'ponytail skill at full; the caveman skill at full; '
  + `\`${lane('fx-humanize')}\` on prose written for people.`
```

In `render()`, append it (preceded by a blank line) after the `repo.md` note and before the plans block, for sessions and subagents alike.

- [ ] **5. Fix the bootstrap-alone measurement.** In the budget block, create the `empty` directory's `.fx.json` as `{"companions": ""}` before rendering `alone`, with a comment: the companions line is outside the bootstrap by design (ADR-0032) and counts toward the 9,000 worst case instead. Leave the `worst` fixture without an `.fx.json`, so it carries the default line.

- [ ] **6. Run it: verify GREEN**

Run: `node lib/preamble.test.js`
Expected: `companions line: passed` and `preamble.test.js: OK`. If the subagent-equals-empty-dir assertion (the one comparing a subagent render with a render of a fresh empty directory) fails, it is because both now carry the default line equally; it should still pass. If it does not, read why before changing it.

- [ ] **7. Run the other preamble consumers**

Run: `node tests/gates/codex-hook-output.test.js && node tests/gates/opencode-plugin.test.js && node tests/gates/no-runtime-addressing.test.js`
Expected: all pass.

- [ ] **8. Write ADR-0032** at `docs/adr/0032-the-preamble-carries-a-companion-tools-line.md`. H1: `# The preamble carries a conditional companion-tools line`. Prose: subagents read neither memory nor CLAUDE.md, the owner repeated the request ten times (Sep 21 to 26), the default text verbatim, the conditional wording so a missing tool is skipped, the `.fx.json` override, why it sits outside the 3,000-character bootstrap, and the opencode render-once note.

- [ ] **9. Commit**

```
git add lib/preamble.js lib/preamble.test.js docs/adr/0032-the-preamble-carries-a-companion-tools-line.md
git commit -m "feat(preamble): conditional companion-tools line, overridable in .fx.json"
```
