# 07: The `fx-browse` skill and lane pointers

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** Polish

**What to build:** a user types `/fx:fx-browse explore <url> --goal "<text>" [--expect-text <s>]` or `/fx:fx-browse read <url>` on Claude Code, `$fx:fx-browse` on Codex, or `/fx-browse` on opencode; the agent builds the CLI's absolute path from the skill's base directory, runs it with exactly the user's arguments and a 600,000 ms shell timeout, reads `report.md` (or `page.md`), and relays the outcome in the report's words, never calling `done-unverified` a pass. The model never selects `fx-browse` on its own. The `research` lane points at `read` (never `--local`) for public pages that need JavaScript, and `fx-design` points at `read --local` for a screenshot of a running page; both pointers resolve on Claude Code, Codex and opencode installs. An ADR records the decision, every place that lists the user-invoked lanes lists six, and the docs name only the judges the spike passed.

**Design:** Solution; Implementation Decisions > 4; Implementation Decisions > 10; Implementation Decisions > 12; Global Constraints

**Files:**
- Create: `skills/fx-browse/SKILL.md` (hand-written, like `skills/fx-audit/SKILL.md`)
- Generated: `skills/fx-browse/agents/openai.yaml` (by `scripts/gen-command-skills`)
- Modify: `scripts/gen-command-skills` (generate `fx-browse`'s sidecar the way it does `fx-audit`'s)
- Modify: `src/lib/user-invoked-lanes.ts` and generated `lib/user-invoked-lanes.js` (six lanes, sorted: `fx-audit`, `fx-browse`, `fx-critique`, `fx-grill`, `fx-handoff`, `fx-setup`)
- Modify: `src/lib/opencode-commands.ts` and generated `lib/opencode-commands.js` (the citation rewrite also covers `../../lib/`)
- Modify: `scripts/fx-opencode-install` (link `lib/` into the destination beside `references/`, with the same ownership checks it applies to `references/`)
- Modify: the user-invoked gate test source under `src/tests/gates/` and its generated file (six lanes; `fx-browse` checked like `fx-audit`)
- Modify: the opencode plugin gate test source under `src/tests/gates/` and its generated file (the `fx-browse` command case below)
- Modify: `tests/conformance/rows/09-every-skill-discovered.sh`, `tests/conformance/rows/13-audit-lane-not-model-facing.sh` (their `HIDDEN` lists)
- Modify: `tests/install/run.sh` (the `fx-browse` command and pointer checks below)
- Modify: `skills/research/SKILL.md` (one paragraph)
- Modify: `skills/fx-design/SKILL.md` (one sentence in "Critique your own work")
- Create: `docs/adr/<next free number>-fx-owns-a-browser-driver.md`
- Modify: `docs/adr/0012-what-fx-deliberately-does-not-cover.md` (amendment line under "No browser-driven design loop")
- Modify: `docs/adr/0025-the-five-user-invoked-lanes-keep-disable-model-invocation.md` (amendment line: six lanes, `fx-browse` added, same mechanism)
- Modify: `SURFACE.md` (user-invoked skills: six; `research` gains one paragraph)
- Modify: `README.md` (the user-invoked table and the layout listing name `fx-browse`)
- Modify: `INSTALL.md` (a short "Browser agent" section: `browse.json` beside `judge.json` with `browserPath` and `textModel`; Chrome, Chromium or Edge required unless the project has Playwright or puppeteer; the judges `spike.md` lists as passing; macOS unverified unless `spike.md` says otherwise)

**Interfaces:**
- Consumes: the CLI `node <plugin>/lib/browse/cli.js read|explore ...` (tasks 02, 05, 06); `USER_INVOKED_LANES`; `opencodeCommands(root, destAbs)`; `spike.md`'s list of passing judges (task 01).
- Produces: `skills/fx-browse/SKILL.md` frontmatter, exact:
  ```yaml
  name: fx-browse
  description: >
    Explore a running web UI toward a goal, or read a page that needs JavaScript, in a fresh headless browser
  disable-model-invocation: true
  ```
- Produces: the skill body. It states, in this order: the two invocation forms and their flags (`--expect-text`, `--expect-url`, `--max-steps`, `--local`, `--allow-remote`); the sentence pattern `fx-audit` uses ("Every path below that starts `../../` resolves from the base directory this skill is given when it is invoked"), so the opencode rewrite replaces it; build the absolute path of `../../lib/browse/cli.js` from that base directory and run `node <absolute path> <subcommand> <the user's arguments, unchanged>` with the shell tool's timeout set to 600,000 ms; never add a URL, `--local` or `--allow-remote` the user did not give; read the last stdout line `outcome: <outcome> <dir>`, then `<dir>/report.md` or `<dir>/page.md`; report the outcome word for word, and say plainly that `done-unverified` means the judge claimed success and nothing checked it; when `explore` ends `blocked`, give the reason and any judge failure detail from the report; end an `explore` summary with the report's suggestion to write the checks as Playwright tests or system specs; on exit 1 or 2, relay stderr; name the supported judges from `spike.md`.
- Produces: the `research` paragraph, exact text: "**Pages that need JavaScript.** When a fetch returns an empty shell or a page that only renders in a browser, resolve `../../lib/browse/cli.js` from this skill's base directory to an absolute path and run `node <that path> read <url>` on that same public URL, then read what it prints. It opens a fresh headless browser profile, loads only that URL, and refuses local and private addresses."
- Produces: the `fx-design` sentence, appended to the first paragraph of "Critique your own work", exact text: "For a page served locally, resolve `../../lib/browse/cli.js` from this skill's base directory and run `node <that path> read --local <url>`; it saves a screenshot."

**Seam:** the existing gates (`user-invoked`, opencode plugin, description overlap, `check-paths`, `check-prose`, `check-generated`), the install runs, and the free conformance rows, all through `scripts/check-all`.

**Tests:**
- User-invoked gate: the hidden list equals `['fx-audit', 'fx-browse', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup']`; `skills/fx-browse/SKILL.md` frontmatter has `disable-model-invocation: true`; `skills/fx-browse/agents/openai.yaml` has `allow_implicit_invocation: false`; `USER_INVOKED_LANES` sorted equals the hidden list.
- opencode plugin gate: `opencodeCommands(root, '/dest')['fx-browse'].template` contains `/dest/lib/browse/cli.js`, does not contain `../../`, and does not contain `base directory`.
- Install run, opencode (both majors): `<dest>/lib/browse/cli.js` exists; the generated `commands/fx-browse.md` contains no `../../` and every absolute path under the destination it names exists; `<dest>/skills/research/../../lib/browse/cli.js` and `<dest>/skills/fx-design/../../lib/browse/cli.js` exist.
- Install run, Codex and Claude Code: `skills/research/../../lib/browse/cli.js`, `skills/fx-design/../../lib/browse/cli.js` and `skills/fx-browse/../../lib/browse/cli.js` exist under the installed plugin root.
- Description overlap gate passes unchanged (a hidden lane competes with nothing).
- `scripts/check-paths` exits 0 with the new `../../lib/browse/cli.js` citations in `research`, `fx-design` and `fx-browse`.
- `scripts/check-generated` exits 0 after `scripts/gen-command-skills` and `scripts/build`; running `scripts/gen-command-skills` twice changes nothing.
- `scripts/check-prose skills/fx-browse/SKILL.md skills/research/SKILL.md skills/fx-design/SKILL.md SURFACE.md README.md INSTALL.md docs/adr` prints OK.
- Conformance rows 09 and 13 (free runs in `scripts/check-all`) pass with `fx-browse` in `HIDDEN`.
- The ADR states: fx owns a browser driver; library first (Playwright, puppeteer) then CDP over `--remote-debugging-pipe`; no WebSocket client and why; a fresh profile in the OS temp directory per run; origin pinned after the first load; `read` refuses local hosts without `--local` and `explore` needs `--allow-remote` for a non-local judge or text model; at most 6 options per judge question and 2 questions per request; model output never becomes a selector, script or URL; `verified` only in code; surfaced as a user-invoked skill plus pointers, no new lane; amends ADRs 0012 and 0025.

**Risks:** several places enumerate the user-invoked lanes by hand (the lib list, the user-invoked gate, conformance rows 09 and 13, ADR 0025's title and text, README). Before committing, run `grep -rn '"fx-handoff", "fx-setup"\|fx-handoff fx-setup\|five user-invoked\|five lanes' --include='*.ts' --include='*.js' --include='*.sh' --include='*.md' --include='*.py' . | grep -v '^./docs/plans\|^./.worktrees\|^./.fx'` and update every hit that is a live list. Skill count assertions (for example "thirteen skills" in Codex notes) may need the new count. The ADR 0025 file name keeps "five" (renaming breaks links); its amendment line says six. Linking `lib/` into an opencode config directory adds a top-level `lib` entry there; the installer refuses a `lib` it did not create, as it does for `references`.

**Idempotency:** `scripts/fx-opencode-install` already replaces only links it owns; the `lib/` link follows the same rule, so a rerun leaves it unchanged.

**Testing:** gates, install runs and free conformance rows through `scripts/check-all`.

## Acceptance criteria
- [ ] Typing `/fx:fx-browse read --local <fixture url>` in a Claude Code session prints the page's text through the skill (checked by hand once; record the session line in the ledger).
- [ ] A naive prompt about exploring a UI never makes the model call the `Skill` tool with `fx-browse` (conformance row 13 with the new list).
- [ ] The `research` and `fx-design` pointers resolve to an existing `lib/browse/cli.js` on Claude Code, Codex and opencode installs.
- [ ] `INSTALL.md` and the skill name only the judges `spike.md` lists as passing.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write each test change the Tests field names** (user-invoked gate, opencode plugin gate, install runs, conformance `HIDDEN` lists)
- [ ] **3. Run them: verify RED**

Run: `scripts/build && node tests/gates/user-invoked.test.js; node tests/gates/opencode-plugin.test.js; bash tests/install/run.sh opencode`
Expected: each fails because `fx-browse` and the `lib/` link do not exist yet.

- [ ] **4. Implement the minimum that passes** (skill, sidecar generator, lane list, opencode rewrite, installer link, pointers, ADR and docs)
- [ ] **5. Run them: verify GREEN**

Run: `scripts/gen-command-skills && scripts/build && node tests/gates/user-invoked.test.js && node tests/gates/opencode-plugin.test.js && bash tests/install/run.sh opencode && bash tests/install/run.sh opencode-v2 && bash tests/install/run.sh codex && bash tests/install/run.sh claude-code && scripts/check-paths && scripts/check-prose`
Expected: PASS.

- [ ] **6. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **7. Commit by path**

Stage exactly the files listed under **Files**, by path, plus the generated `.js` beside each modified source. Then:

```
git commit -m "feat(browse): fx-browse skill, lane pointers and ADR"
```
