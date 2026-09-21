# 12: The behavioural conformance rows

**Status:** ready-for-agent
**Blocked by:** 11
**Phase:** Hardening

**What to build:** The eleven rows that need a live session, on all three
runtimes. This is the task the whole plan exists to reach: fx has claimed
opencode support on the strength of a document, and nothing here can be
satisfied by reading a file.

**Files:**
- Create: `tests/conformance/rows/` (the live rows)
- Modify: `tests/conformance/README.md`
- Modify: `docs/plans/2026-09-21-multi-harness/state.md`

**Interfaces:**
- Consumes: the runner and the row contract from task 11. A live row answers
  `--describe` with `<number>|<name>|live`.
- Produces: no code the plugin uses. Rows only.

**Seam:** `tests/conformance/run.sh`, established in task 11.

**The eleven live rows.** 1 and 2 (preamble reaches a session, and a subagent),
4 (a naive prompt auto-invokes a lane), 5 (explicit invocation), 6, 7 and 8
(the guard refuses in-session, in a subagent, and through quoting evasion), 12
(a read-only agent cannot write), 15 (a subagent dispatches a subagent), 16
(project note and plan state present), 17 (the lane check reaches this runtime).

**Row 4 is the one that matters most.** One literal user message, no lane
named, in a clean session. The lane must fire. It is the only row that proves
fx changes behaviour rather than merely loading, and it is the acceptance test
the most widely-ported comparable project settled on.

**Row 13 is load-bearing for a reason no unit test can cover.** On Codex the
audit and command lanes stay hidden because Codex's command-to-skill migrator
parses each command's frontmatter as strict YAML and skips whatever fails to
parse. All four fx commands have a description containing an unquoted colon, so
none migrate. That is **undocumented behaviour, not a contract.** A unit test
pins that the descriptions still contain the colon, which catches a careless
prose edit, but it would keep passing if a future Codex release fixed its
parser, and every hidden lane would silently reappear. **This row is the only
thing that would notice.**

**Row 12 is the one most likely to rot.** It rests on agent identity reaching
the tool hook, which is undocumented for that event. Task 06 makes enforcement
fail closed, so a runtime change breaks loudly. This row is what says so.

**Rules.**

- **No mocks.** Eight assumptions about these runtimes were falsified during
  this plan's design, every one by running something.
- **A row that cannot pass is `GAP`, with its reason.** Never omitted.
- **Never tune a row until it goes green.** Report what it says.
- If quota or credit runs out, remaining rows are recorded `GAP: not run`.
  **A row that did not run is never a pass.**

**Risks:** Spends real quota on three providers. Rows 4 and 12 need a model
good enough to behave; a flaky model failure looks like a product failure.
Re-run a suspected flake once and record both results rather than the better
one.

**Idempotency:** Every row runs against the runner's scratch home, which task
11 verified never reaches the real one. A live row that needs credentials
copies them **in** from `$FX_REAL_HOME` and never writes back. Amended
2026-09-21: task 11's restore trap is gone, see the ledger.

**Testing:** The rows are the test. Their own correctness is checked by running
them against a deliberately broken tree.

## Acceptance criteria
- [ ] All eleven live rows exist and answer `--describe` with kind `live`
- [ ] `run.sh <harness>` with no `--free` runs both free and live rows
- [ ] Row 4 uses one literal user message and names no lane
- [ ] Row 7 asserts the refusal from inside a dispatched subagent, not the controller
- [ ] Row 12 asserts a read-only agent's write is refused, and covers `fx-devils-advocate` as well as an `fx-lens-*`
- [ ] Row 12 FAILs, rather than passing, when agent identity stops arriving
- [ ] Row 15 completes two levels of dispatch
- [ ] Row 17 reports PASS or GAP on every runtime, never absent
- [ ] Row 13 asserts **all five** user-invoked lanes are absent from the
      model-facing listing, **and** that at least two lanes which should be
      visible still are. A probe showing everything hidden may just be broken
- [ ] Row 13 on Codex also asserts no `migrated-command-skills` directory was
      created: that is the mechanism that re-exposed a hidden lane once already
- [ ] Emptying `PREAMBLE.md` makes rows 1, 2 and 16 FAIL
- [ ] Disabling the guard makes rows 6, 7 and 8 FAIL
- [ ] Every row cleans up its scratch directory
- [ ] The full result for all three harnesses is in `state.md` with the date and the three CLI versions
- [ ] Every `GAP` in `state.md` carries its reason on its own line

## Steps

- [ ] **1. Write one failing row first**

Start with row 6, the cheapest live row, so the live path is proven before ten
more depend on it:

```bash
#!/usr/bin/env bash
# 06: the git guard refuses an absolute, in a session.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "06|guard refuses in-session|live"; exit 0; }

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cd "$WORK" && git init -q

PROMPT='Run this exact shell command and report what happened: git branch -D fx-guard-probe'

case "$HARNESS" in
  claude-code) out="$(timeout 180 claude -p --plugin-dir "$FX" --dangerously-skip-permissions --max-turns 4 "$PROMPT" </dev/null 2>&1)" ;;
  codex)       out="$(timeout 300 codex exec --dangerously-bypass-hook-trust -s workspace-write -c 'approval_policy="never"' "$PROMPT" </dev/null 2>&1)" ;;
  opencode)    out="$(timeout 300 opencode run "$PROMPT" </dev/null 2>&1)" ;;
  *)           exit 77 ;;
esac

# The guard writes its reason with an [fx] prefix. Assert the refusal, not the
# absence of a branch: `git branch -D` on a missing branch also fails, so a
# no-guard run would look identical.
grep -q '\[fx\]' <<<"$out"
```

- [ ] **2. Run it: verify RED**

Run: `HARNESS=codex FX="$PWD" bash tests/conformance/rows/06-guard-in-session.sh`
Expected: FAIL. Then confirm it goes green with the guard installed. A row that
passes before the feature exists is asserting the wrong thing.

- [ ] **3. Implement the remaining ten rows**

No code here beyond the pattern above. Each row is its own script.

- [ ] **4. Verify the rows catch real breakage**

Run:
```
cp PREAMBLE.md /tmp/fx-p.bak && : > PREAMBLE.md
bash tests/conformance/run.sh codex; echo "exit=$?"
cp /tmp/fx-p.bak PREAMBLE.md && rm -f /tmp/fx-p.bak
```
Expected: rows 1, 2 and 16 FAIL.

- [ ] **5. Run the full matrix on all three**

Run:
```
for h in claude-code opencode codex; do bash tests/conformance/run.sh "$h"; done
```
This spends quota on three providers. If quota or credit runs out, stop and
record the remaining rows as `GAP: not run`. **Do not infer a pass.**

- [ ] **6. Confirm nothing was left behind**

Run:
```
git status --porcelain
ls ~/.codex/hooks.json 2>&1 | tail -1
cat ~/.codex/config.toml
```
Expected: no stray hook file, no scratch trust entries, no unexpected working
tree changes.

- [ ] **7. Record the result**

Append to `docs/plans/2026-09-21-multi-harness/state.md`: the date, the three
CLI versions, and the three summary lines verbatim. Every `GAP` gets its reason
on its own line.

- [ ] **8. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`. The live rows are not in it; this confirms adding them
did not break the free ones.

- [ ] **9. Commit**

```
git add tests/conformance docs/plans/2026-09-21-multi-harness/state.md
git commit -m "test(conformance): prove seventeen guarantees on three runtimes"
```

No attribution trailers. Then continue to the next task: never stop and wait.
