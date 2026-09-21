# 02: The harness knowledge layer

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** An agent on any runtime can find out what that runtime calls
its tools, how it dispatches subagents, and how it invokes a lane, without any
of that appearing in a skill body. Today no such place exists, so a runtime
fact has nowhere to go except into a skill, where it would be wrong on the
other two.

Also: prove no skill body already names a runtime's tool.

**Files:**
- Create: `references/harnesses/claude-code.md`
- Create: `references/harnesses/opencode.md`
- Create: `references/harnesses/codex.md`
- Create: `scripts/check-tool-names`
- Modify: `scripts/check-all`
- Modify: any `skills/*/SKILL.md` the new gate reports

**Interfaces:**
- Consumes: nothing
- Produces: `references/harnesses/<harness>.md`, one per name in
  `HARNESSES` (task 01). Named by the same strings.

**Seam:** `scripts/check-all`, a text gate reading files. Matches
`scripts/check-paths` and `scripts/check-prose`.

**Content each file carries.** Tool vocabulary, subagent dispatch, sandbox
behaviour, invocation syntax. Measured facts only, each one stated plainly:

- `claude-code.md`: `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`; subagents
  via the task tool; `tools:` in agent frontmatter is a hard allowlist and
  `disallowedTools` applies first.
- `opencode.md`: `bash`, `read`, `glob`, `grep`, `edit`, `write`,
  `apply_patch`, `task`, `skill`, `todowrite`, `webfetch`, `websearch`;
  `apply_patch` replaces `edit`/`write` on GPT-family models; `permission:`
  governs access and `write`/`patch` collapse onto `edit`; `subagent_depth`
  defaults to 1.
- `codex.md`: no `Read`, `Grep` or `Glob` tool at all, everything goes through
  the shell; `apply_patch` edits; `spawn_agent` / `wait_agent` /
  `send_input` dispatch, with `agent_type` naming a role and `task_name` a
  free label; the spawn message is encrypted in transit to hooks.

**Risks:** These files are reference material, not instructions. Nothing in
them may be phrased as an imperative a lane would compete with, and nothing an
agent needs *before* invoking a lane belongs here. ADR 0016 and ADR 0020.

**Idempotency:** Creates files and a gate. Re-running rewrites the same
content.

**Testing:** The gate is the test. It fails when a skill body names a tool.

## Acceptance criteria
- [ ] One file exists per harness name, matching `HARNESSES` from task 01
- [ ] Each file names that runtime's tool vocabulary and its subagent dispatch
- [ ] No file contains an imperative directed at the agent's next action
- [ ] `scripts/check-tool-names` flags a backticked tool name, a tool name
      followed by an open parenthesis, and the phrase "the Grep tool"
- [ ] It does **not** flag the English verb: "Read the plan, once" passes
- [ ] It exits non-zero on a fixture containing a tool-shaped form outside a fence
- [ ] `scripts/check-tool-names` exits zero against the repository as shipped
- [ ] `scripts/check-all` runs it
- [ ] `scripts/check-paths` still passes: the new files are reachable by the
      relative paths that cite them

## Steps

- [ ] **1. Write the failing test**

`scripts/check-tool-names` is itself the test. Write it first, and write a
fixture that must fail:

```bash
#!/usr/bin/env bash
# Skills name actions, never tools. ADR 0016.
#
# A tool name in a skill body is correct on one runtime and wrong on the other
# two. The harness layer exists so those names have somewhere else to live.
#
# Usage: scripts/check-tool-names [path ...]   (default: skills/)
set -uo pipefail
cd "$(dirname "$0")/.."

TARGETS=("${@:-skills}")

# Runtime tool names. Deliberately not every word: only names that are
# unambiguous as tools when they appear in prose.
# Tool-SHAPED forms only. A bare capitalised word is English: "Read the plan,
# once" is correct prose and appears 19 times across the lanes. Matching it
# would force rewriting lane wording, which the design puts out of scope.
TOOLS='Read|Grep|Glob|MultiEdit|NotebookEdit|apply_patch|spawn_agent|wait_agent|send_input|todowrite|webfetch|websearch'
NAMES="(\`($TOOLS)\`|\\b($TOOLS)\\(|\\bthe ($TOOLS) tool\\b)"

fails=0
while IFS= read -r file; do
  # Strip fenced code blocks: a fence is documentation of the runtime, not an
  # instruction to use it.
  stripped="$(awk '/^```/{f=!f;next} !f' "$file")"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    echo "  $file: $line"
    fails=$((fails+1))
  done < <(printf '%s\n' "$stripped" | grep -nE "$NAMES" || true)
done < <(find "${TARGETS[@]}" -name 'SKILL.md' -o -name '*-prompt.md' 2>/dev/null)

if [ "$fails" -gt 0 ]; then
  echo "FAIL: $fails line(s) name a runtime tool in a skill body."
  echo "Move the fact to references/harnesses/<harness>.md and name the action instead."
  exit 1
fi
echo "check-tool-names: OK"
```

- [ ] **2. Run it: verify RED**

Run:
```
mkdir -p /tmp/fx-tn/skills/probe && \
printf -- '---\nname: probe\n---\nUse the Grep tool to search.\nRead the plan, once.\n\n```\nGrep is fine in a fence\n```\n' > /tmp/fx-tn/skills/probe/SKILL.md && \
chmod +x scripts/check-tool-names && scripts/check-tool-names /tmp/fx-tn/skills
```
Expected: FAIL, exit 1, **exactly one** hit: "the Grep tool". "Read the plan,
once" is English and must pass. The fenced line must pass.

- [ ] **3. Run it against the repository**

Run: `scripts/check-tool-names`
Expected: few or no hits. A bare-word version of this gate was executed against
the tree while this plan was written and produced **19 hits across 8 files,
every one the English verb**. If your version reports anything like that
number, the pattern is wrong: fix the gate, not the prose. The design forbids
reworking lane wording.

Fix only genuine tool-shaped references, by naming the action instead.

- [ ] **4. Write the three harness files**

One per runtime, content as listed above. Reference material only.

- [ ] **5. Verify GREEN**

Run: `scripts/check-tool-names && rm -rf /tmp/fx-tn`
Expected: `check-tool-names: OK`.

- [ ] **6. Register the gate**

Add to `scripts/check-all`, beside the other text gates:
```
run check-tool-names       scripts/check-tool-names
```

- [ ] **7. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add references/harnesses scripts/check-tool-names scripts/check-all skills
git commit -m "feat(harnesses): add the harness knowledge layer and its gate"
```

No attribution trailers. Then continue to the next task: never stop and wait.
