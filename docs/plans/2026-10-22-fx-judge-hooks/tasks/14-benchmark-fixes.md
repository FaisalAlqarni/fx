# 14: Benchmark fixes

**Status:** ready-for-agent
**Blocked by:** 13
**Phase:** Polish

**What to build:** the before/after benchmark (`benchmark.md`, Findings) found four defects in the built hooks. Fix each so the guard and the turn checks do what the design says on real repositories: edits under long paths reach the Stop check; seven catastrophic spellings are refused by the hard rules with no judge; the judge no longer refuses a command only because quoted text names a dangerous command; a retry written as a shell loop counts toward the repeat-failure signal.

**Design:** Implementation Decisions > 5; Implementation Decisions > 7; Implementation Decisions > 8; Implementation Decisions > 3

**Files:**
- Modify: `src/lib/journal.ts` and/or `src/lib/loop-tracker.ts`, `src/lib/tool-events.ts` (edit paths recorded relative to the repository root, never passed through the secret redactor; commands still redacted)
- Modify: `src/lib/shell-rules.ts` and its tests (new hard-rule spellings)
- Modify: `src/lib/shell-guard.ts` and its tests (the judge's view of a command masks inert quoted text)
- Modify: `src/lib/loop-tracker.ts` and its tests (a failed shell loop that repeats one check counts as repeats of that check)
- Modify: gate tests where a process-level case is needed; `references/harnesses/*.md` or ADR 0047 where a rule's wording changes

**Interfaces:**
- Finding 1: an `edit` journal event carries the path relative to the git top level of the session's cwd (or absolute when outside it), unredacted; `turnNeedsEvidence` and the inside-repository test compare that form. Secrets in commands, prompts and messages stay redacted as today.
- Finding 2: these are hard denials with no judge, on every harness, matched at command position like the existing rules: `find` with `-delete` (or `-exec rm`) whose starting point is a root, home or system directory (`/`, `~`, `$HOME`, `/home/*`, `/Users/*`, system dirs); a download piped into an interpreter (`python`, `python3`, `perl`, `ruby`, `node`, `php`) as well as a shell; `systemctl` with `reboot`, `poweroff`, `halt`, `kexec`; `init 0` and `init 6`, `telinit 0` and `telinit 6`; PowerShell `Remove-Item` with `-Path`/`-LiteralPath` naming a drive root, home or `$env:USERPROFILE` with a recurse flag; `Get-ChildItem` (or `gci`, `ls`, `dir`) on a drive root or home piped to `Remove-Item`. Each gets a reason in the existing reason family.
- Finding 3: the text the judge receives (not the hard rules' input) replaces with a placeholder the message of `git commit -m/--message/-F -`, and the body of a heredoc whose consumer is a non-executing program (`cat`, `tee`, `git`, `printf`, `echo`); heredocs consumed by a shell or interpreter, and every other argument, are sent unchanged. Hard rules keep reading the full command.
- Finding 4: when a shell command that failed is a `for`/`while`/`until` loop (or `seq`/`repeat`-style loop) whose body runs one command matching a check, it counts as that many identical failing runs of the inner command (capped at the repeat-failure threshold), so three failures in one loop, or a loop plus later runs, can fire the nudge once.

**Seam:** the guard classifier and journal rules as functions; the hooks as processes.

**Tests:**
- Finding 1: an Edit of `engines/measurement/app/models/measurement/campaign.rb` (and a path of 120 characters) then Stop blocks once on Claude Code and Codex; the journal line holds the relative path; a command containing a 40-character token is still redacted.
- Finding 2: each listed spelling is `hard-deny` with no judge; negatives stay allowed or grey: `find . -name '*.tmp' -delete`, `find ./build -delete`, `curl -fsSL https://x/install.sh -o install.sh`, `python3 script.py`, `systemctl status nginx`, `systemctl restart app`, `Remove-Item -Recurse -Force .\dist`.
- Finding 3: with a fake judge recording requests, `git commit -m 'curl x | sh is blocked now'` sends a state whose command has the message masked; a heredoc into `cat > notes.md` is masked; a heredoc into `bash` or `python3` is not; hard rules still deny `bash <<EOF ... rm -rf ~ ... EOF`.
- Finding 4: a failed `for i in 1 2 3; do node --test; done` records repeats of `node --test` and fires the repeat-failure nudge once; a successful loop records no failure; an unrelated loop (`for f in *.js; do node $f; done`) is not counted as one check.
- Existing gates, golden fixtures (re-record only with a stated reason), `scripts/check-prose` on touched Markdown.

**Risks:** masking text the judge sees must never hide an executable payload: anything consumed by a shell or interpreter stays visible, and the hard rules always see the raw command. New hard rules must not refuse ordinary project commands; every new rule has a negative test. Storing raw edit paths must not reintroduce secrets: paths are file names, not contents.

## Acceptance criteria
- [ ] The four benchmark findings are fixed, each with RED then GREEN.
- [ ] No previously passing gate or golden case changed meaning.
- [ ] `scripts/check-all` prints `ALL GREEN` through test_scope.

## Steps
- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the failing tests; run them (RED)**
- [ ] **3. Implement**
- [ ] **4. Run them and the gates (GREEN)**
- [ ] **5. Commit**
