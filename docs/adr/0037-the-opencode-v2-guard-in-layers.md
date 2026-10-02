# The OpenCode 2.x git guard has three layers, and says which one is live

## Context

On 2.x, `tool.execute.before` cannot be trusted to see the whole shell command as the permission system sees it, and a permission policy cannot run code. The probe (question 3) showed that `permission.evaluate` receives the command already split into pieces, plus `source.{messageID, id}`, and that `tool.execute.before` for the same call carries the full command text and the same ids. The probe (question 5) showed that a policy answers only "Blocked by configuration policy", cannot be overridden, and matches by wildcard.

## Decision

The guard is three layers. `lib/git-guard.js` is the predicate in every layer.

**Layer 1: the full command, in `permission.evaluate`.** `tool.execute.before` records the full command in a map keyed by session, message and call id (`sessionID`, `messageID`, `id`, joined with a NUL). `tool.execute.after` deletes the entry. `permission.evaluate` for a shell call looks the command up by the same key and runs the guard on it, then runs it on each piece in `ev.resources`. A deny carries fx's own reason. Every error path denies:

- a guard that fails to load;
- a lookup that misses, or a key with any part missing (a null `source`, no `sessionID`);
- a recorded command that is not a string;
- a guard that throws.

If `permission.evaluate` cannot be registered, `tool.execute.before` throws for every shell call, and the message names the failure. If both registrations fail, the guard is off, and the preamble says so in a line naming the failed steps. A guard that is off shows in every session.

**Layer 2: installer-written policies.** `lib/opencode-v2-policies.js` holds deny policies for the absolutes that a wildcard can express: force push, push to `main`, `master` or `trunk`, branch deletion on a remote, `--no-verify` on `commit` and `push`, `reset --hard`, `clean -f`, `branch -D`, `stash drop` and `stash clear`, `checkout .` and `restore .`, and tag deletion. The installer writes them into `experimental.policies` and records them as its own. A policy cannot be overridden by the user's session and gives only a generic message, so every pattern is tight. Each has a `sample` the guard refuses and `allowed` commands the guard allows, and `tests/gates/opencode-v2-policies.test.js` checks both directions against `lib/git-guard.js`. The patterns cover plain spellings: no `-C` or `-c` options, no `HEAD:refs/heads/main`, no `branch -d --force`. Layer 1 covers those.

**Layer 3: the throwing `execute.before`.** This is the fallback when layer 1 cannot be registered. It carries no predicate: when `permission.evaluate` failed to register, `tool.execute.before` throws for every shell call, whatever the command, and the message names the failure. It does nothing when layer 1 registered.

Real 2.0.18, through a model, with the plugin linked into a scratch config: `git push --force origin main` ended with a shell tool status of `error` and the message "force push rewrites history that has already left the machine." That is fx's reason, not the policy text.

## The lane check

The lane check runs in `permission.evaluate` on the `edit` action, resolves each resource against the project directory, denies on a hit with fx's reason, and fails open on an error: advice never wedges an edit. On 1.x the same check runs in `tool.execute.before` for `edit`, `write` and `apply_patch`, also denies on a hit (by throwing), and fails open. Live row 17 observed `write` reaching the 2.x check. `patch` is unprobed, so no claim is made for it.

## An exception to ADR-0026

ADR-0026 lets the user's own permission answer win over fx's grant. One check here deliberately does not: the read-only re-deny overrides an incoming `allow`. Why: it is not a grant. It enforces what the agents' author meant, that the six review agents cannot write. A host or session rule that widens them would remove the property. A user who wants a reviewer that writes defines an agent under another name.

The hidden-lane backstop used to be a second exception. It now yields to the user's explicit allow (owner decision 2026-10-02). The evaluate hook sees only the incoming effect, not the rule behind it. The `hide lanes` transform records each agent it finished. Rules are last-match-wins and the user's config lands after fx's deny, so on a recorded agent an incoming `allow` can only be the user's rule, and the call goes through. On an agent fx never processed, such as one defined in `opencode.json` (probe Q11), an incoming `allow` is the runtime default, not an answer, so the call is still refused. If the transform failed, nothing is recorded and every agent is refused. fx blocks the model from picking a hidden lane only when the user said nothing.

## What the 2.x guard does not catch

- `echo "git reset --hard" | sh`. `lib/git-guard.js` does not scan the quoted body of an `echo` that feeds a shell. This gap is older than this ADR and exists on every runtime that shares the library.
- A shell call that OpenCode parses into zero commands never reaches `permission.evaluate`, so layer 1 sees nothing. Layer 3 is inactive whenever layer 1 registered. This is read from the 2.0.18 source, not probed.
- Free text in a push option can make a policy block a command the guard would allow. Policies cannot be overridden. A push option that carries text matching a policy pattern is blocked.

## Limits on hiding the lanes and on read-only agents

- An agent the user defines in `opencode.json` is applied after fx's transforms, so fx's skill-deny rules do not reach it. It lists the five hidden lanes. A call to one is still refused at run time by the `permission.evaluate` backstop, because the runtime default allow on an unrecorded agent is not the user's answer. Probe question 11 disproved the plan to hide them there.
- Hiding steers the model. A direct read of a `SKILL.md` file is not blocked.
- `opencode api skill.list` is unfiltered. Hiding is in each agent's `skill` deny rules, shown by `opencode debug agents`.
- A host that sets session-level permissions cannot widen fx's six read-only agents: the evaluate hook allows them read, grep, glob and list, allows `external_directory` only when every resource is under fx's own `references` directory, and denies every other action. This is read from the 2.0.18 source; the gate test uses a stub.

## Consequences

The preamble reports any failed registration, and denial messages carry the same list, so a broken guard is visible. `permission.evaluate` and `tool.execute.before` are on the 2.x API as probed on 2.0.18 only. A later 2.x release that changes either is caught by the nightly `@latest` free rows and by the free rows.
