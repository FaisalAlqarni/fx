# Multi-harness fx: Codex support, opencode proven, marketplace distribution

**Date:** 2026-09-21
**Status:** ready-for-agent
**Glossary:** none. This repository has no `CONTEXT.md`; `SURFACE.md` and
`docs/adr/` carry the vocabulary. One term was sharpened during this session:
**harness** now names a fourth knowledge layer with its own home, recorded in
`docs/adr/0016`.

## Problem Statement

fx claims to support two runtimes. It supports one.

Claude Code works and is measured. opencode was written from documentation,
shipped, and never run. Its correctness has been an assumption for as long as
the support has existed, and the assumption is wrong in at least three places.
One of them sits in the most load-bearing paragraph fx has: `PREAMBLE.md` tells
every opencode session to invoke `fx:fx-tdd` and warns that a bare `fx-tdd` may
not resolve. On opencode the reverse is true. The instruction has been backwards
the whole time and nothing reported it, because nothing ever ran.

A third runtime is now worth targeting. `SURFACE.md` records a decision not to
ship a Codex manifest because Codex was "a runtime fx does not target". That was
true when written. Codex now has skills, hooks, subagents, plugins, a
marketplace and a documented instruction file.

Installation is also harder than it should be. fx ships to opencode through a
bespoke script that builds a symlink farm inside the user's config directory.
Every runtime fx targets now has a native plugin mechanism, and a bespoke
installer is a thing to maintain, document and get wrong.

The requirement that sets the bar: everything must be shown to work everywhere,
and installation must go through each runtime's own marketplace. Not asserted.
Shown.

## Solution

One source of truth in the repository, delivered through each runtime's native
plugin mechanism, with a conformance matrix that proves every guarantee on every
runtime.

Skills stay harness-neutral: they name actions, never tools. Runtime differences
live in one reference file per runtime. The only thing rendered per runtime
rather than referenced is the lane name inside the opening imperative, because
that paragraph must stay self-sufficient.

The native mechanism is the default path. opencode also keeps a script-driven
install, because it is the one runtime whose plugin loading can be switched off
outright. Claude Code and Codex have no script route and do not need one: their
plugin systems deliver everything except Codex's subagent roles, and those are
planted by a function that three callers share.

Safety guarantees keep their strength everywhere, but the mechanism delivering
each one is named per runtime rather than asserted once, and every mechanism
here was measured rather than read.

## User Stories

1. As an fx user on Claude Code, I want to install from a marketplace, so that
   setup is two commands I already know.
2. As an fx user on Codex, I want to install from a marketplace, so that I do
   not run a stranger's shell script to get a plugin.
3. As an fx user on Codex, I want the review lenses present without a second
   install step, so that fx is not half-installed by default.
4. As an fx user on opencode, I want to install by adding one config entry, so
   that nothing writes a symlink farm into my config directory.
5. As an fx user whose environment disables plugin loading, I want a script
   install, so that a restricted machine is not a machine without fx.
6. As an fx user, I want the setup lane to tell me what did not land, so that a
   half-provisioned install is visible instead of silent.
7. As an fx user on Codex, I want fx to work before I have trusted its hooks, so
   that the first session is not the broken one.
8. As an fx user on any runtime, I want the preamble in every session, so that
   lanes fire without my asking.
9. As an fx user on any runtime, I want the preamble in every dispatched
   subagent, so that an implementer is bound by the rules that bound its
   dispatcher.
10. As an fx user on any runtime, I want the preamble to name lanes the way my
   runtime addresses them, so that following it literally works.
11. As an fx user on any runtime, I want the git guard to refuse irreversible
   commands, so that the protection I rely on is not silently absent.
12. As an fx user on any runtime, I want that guard to hold inside subagents, so
   that delegation is not an escape hatch.
13. As an fx user on any runtime, I want review lenses that cannot write to my
    repository, so that a review cannot become an edit.
14. As an fx user on any runtime, I want the audit lane never selected by the
    model on its own, so that it costs nothing until I ask.
15. As an fx user on any runtime, I want the audit lane invocable when I do ask,
    so that hiding it from the model does not hide it from me.
16. As an fx user on opencode, I want subagents able to dispatch subagents, so
    that the implement lane works rather than failing at its second hop.
17. As an fx user on opencode, I want the preamble to name lanes correctly, so
    that the instruction stops being backwards.
18. As an fx user on opencode, I want the lane check and plan-state block that
    Claude Code sessions get, so that the port is a port and not a subset.
19. As an fx user running more than one runtime, I want each skill registered
    once, so that I do not get the duplicate-selection contest fx exists to end.
20. As an fx user, I want `git pull` or a plugin update to refresh my install,
    so that staying current costs nothing.
21. As an fx maintainer, I want one skill body per lane, so that a fix reaches
    every runtime at once.
22. As an fx maintainer, I want runtime facts in a known place, so that adding a
    fifth runtime does not mean editing skills.
23. As an fx maintainer, I want the derived runtime artifacts generated and
    drift-checked, so that three dialects cannot silently diverge.
24. As an fx maintainer, I want a conformance matrix, so that a claim of support
    is a row that passed rather than a sentence someone wrote.
25. As an fx maintainer, I want unsupported guarantees shown as gaps, so that a
    missing capability is visible rather than absent.
26. As an fx maintainer, I want the guard to stay one implementation, so that
    runtimes cannot drift apart on the thing that matters most.
27. As an fx maintainer, I want the free checks free, so that artifact shape is
    caught without spending quota.
28. As an fx maintainer, I want behavioural conformance run before a release and
    when a runtime updates, so that a runtime change is caught by us rather than
    by a user.
29. As an fx maintainer, I want a guarantee resting on an undocumented field to
    carry its own test, so that its removal is announced by a red test rather
    than by silence.
30. As an fx maintainer, I want the beliefs encoded in gates to match measured
    reality, so that a passing gate stops being evidence for a false claim.
31. As a reviewer of this work, I want each correction to carry the measurement
    that forced it, so that nobody re-derives it from documentation.

## Implementation Decisions

### Distribution: native mechanisms, no bespoke installer

Each runtime is reached through its own plugin system. The repository is the
single source and carries one manifest per runtime.

**Claude Code** ships everything in one plugin. Skills, agents, commands and
both hook events are discovered by convention, verified against the installed
CLI: a plugin declaring none of them still reported its full component
inventory. Nothing about Claude Code needs a manual step.

**Codex** ships skills, hooks and MCP configuration through its marketplace. Two
constraints are non-obvious and both were measured. Its own bundled validator
rejects a `hooks` key in the manifest, so hooks ship by convention as a file at
the plugin root and are never declared (**superseded by the amendment, A1**: the
runtime honours the key and ignores an undeclared root file); the one curated plugin that passes
validation does exactly this, and the two well-known plugins that declare the
key both fail. And its installer drops symlinks while preserving execute bits,
so nothing symlinked may be shipped.

**opencode** loads a plugin from one config entry. The plugin registers fx's
skills by appending to the live configuration object during the config hook,
registers the lens agents the same way, and raises the subagent depth limit
itself.

The existing installer script is **kept**, not deleted, and updated to the facts
measured here. The plugin path is better where it works, and that qualifier
carries weight: opencode has forks, two environment switches disable plugins
outright, and part of the registration surface this relies on is experimental.
The script is the supported route when the plugin loader is unavailable, and it
is what keeps fx installable in a restricted environment.

### Knowledge layering

`docs/adr/0016` adds a **harness** layer to the ecosystem, project and machine
split. Runtime facts live in one reference file per runtime: tool vocabulary,
subagent dispatch, sandbox behaviour, invocation syntax.

Skills name actions, never tools. This is what lets one skill body be correct
everywhere, and it makes adding a runtime a matter of adding a file. A harness
file carries nothing an agent needs *before* it can invoke a lane.

### The preamble is rendered

`docs/adr/0020`. `PREAMBLE.md` stays one file and carries placeholders where a
name is runtime-specific. One shared function renders it; each injector calls
that function.

The alternative, making the imperative neutral and pointing at the harness file
for syntax, is rejected by `docs/adr/0002` and its measurement: the imperative
at line 56 of 210 fired zero times in five; first, unchanged, five in five. A
pointer inside the imperative also contradicts that same paragraph's instruction
to invoke rather than read.

Both hook runtimes export the same plugin-root variable, so the injector command
form is identical on each. Preamble assembly moves into the shared function,
which closes an existing asymmetry: the plan-state block and the lane check
currently reach only Claude Code sessions.

### The lane check reaches every runtime, or says why not

The design closes an asymmetry: the plan-state block and the lane check reach
only Claude Code today. Both must reach all three, and the lane check follows
each runtime's own editing tool rather than Claude Code's. On Codex that tool is
the patch tool, so routing only the shell there would leave the check absent
while looking present.

The conformance matrix carries a row for it. A runtime that cannot support it
gets a gap with its reason, never silence.

### The guard stays one implementation

The guard module does not change. A shell call on Codex arrives with the same
tool name and the same command field as on Claude Code, so the two hook runtimes
share one path. opencode is the only real adapter, and only at its edges:
different field names in, an exception rather than an exit code out.

### Read-only lenses: identity from the role, enforcement from the hook

`docs/adr/0019`, now fully measured on all three.

Claude Code enforces a tool allowlist. opencode enforces a permission block,
where the write and patch permissions collapse onto the edit permission. Codex
was measured directly and the documentation is misleading: a role file declaring
read-only did **not** prevent the spawned subagent from writing a file. The role
file supplies identity and instructions; the hook supplies enforcement.

The discriminator is the agent type field, which carries the custom role name
into the tool hook. This was confirmed with a real custom role, at both user and
project scope.

**Enforcement fails closed.** That field is documented for the subagent
lifecycle events and undocumented for the tool event, so relying on the tool
event alone would fail open: a release that stopped sending it would downgrade
enforcement to prose with no error anywhere. The hook records the agent identity
when a subagent starts, on the event where the field is documented, and refuses
a write from any subagent it cannot classify. An unclassifiable subagent is a
refusal, not an assumption.

**The set of read-only agents is generated, never matched by prefix.** Five are
named `fx-lens-*` and the sixth is the devil's advocate, which carries the same
tool restriction for the same reason. A prefix match would leave it writable on
Codex while read-only on Claude Code.

Identity is the only thing available: the spawn tool's message argument reaches
the hook **encrypted**, so no content-based routing is possible.

Lens roles are authored in the Claude Code dialect and the other two are derived
from it, because it is the only dialect expressing read-only as a tool
allowlist.

### Lens roles live at user scope, and the hook plants them

Roles were measured working at both user and project scope. User scope is
correct: a lens is a fact about fx, not about any repository, so by the layering
above it belongs where fx is installed. Project scope would also put a file per
agent into every repository and make Codex behave unlike the other two runtimes,
where plugin agents are available everywhere.

No Codex plugin can ship a role, so fx plants them. **One function does the
planting and three callers invoke it**, which is the rule the guard module
already follows and the reason two runtimes have not drifted on it.

The session-start hook plants them on every session, idempotently, confined to
fx's own name prefix. That is the zero-step path, and precedent exists in
Codex's own bundled skills, which write into the same home directory.

A hook alone is not sufficient, for a measured reason rather than a cautious
one: Codex skips a plugin's hooks until the user reviews and trusts them, so on
a fresh install the hook cannot plant anything, because the hook is not yet
running. The setup lane therefore plants them too, and unlike a hook it can
**verify and report**: that the hook is not yet trusted, or that a role file is
stale against the installed version. A hook fails open and silently by
necessity; reporting is a different job, not a duplicated one.

The installer script is the third caller, for installs that never went through a
marketplace at all.

### Derived artifacts are generated and drift-checked

The Codex dialect is generated from the Claude Code definitions, committed, and
verified by a gate that regenerates and compares. It must exist as a file
because a file is what gets planted.

opencode needs no committed file: its plugin converts the same definitions at
run time, and the installer script calls that same converter rather than
carrying its own. **One converter per dialect**, and a gate asserts no second
implementation exists. Hand-syncing dialects is the failure every comparable
project reports.

### Hiding a lane from the model

Each runtime has a real mechanism, and the earlier decision to accept exposure
on Codex is withdrawn as having been made on bad information. Claude Code has a
frontmatter flag. Codex has an invocation-policy key in the skill's sidecar,
used by its own bundled review skill. opencode denies the skill by permission,
which removes it from the model-facing listing while leaving the user's route
intact.

### Gate corrections

`docs/adr/0017` and `0018`. Two beliefs encoded as measured facts in fx's own
gate and hook were measured false: declaring component keys does not fail
validation, and matcher groups are not capped per plugin. The manifest gate
drops its prohibition and instead checks the hazard that is real, a declared key
orphaning the directory that would otherwise be scanned. The single-dispatcher
hook shape is kept for portability, which is a reason that survives scrutiny.

## Testing Decisions

### Confirmed seams

**The preamble renderer**, as a pure function, at the existing unit-test seam
used by the other library modules: plain node, no framework.

**Generated-artifact drift**, at the existing free gate: regenerate the derived
dialects and compare against what is committed.

**Install artifact shape**, at the existing install-test seam, generalised to
take a runtime. It reads files and spends nothing, so it stays free.

**Behavioural conformance**, one new seam, one runner per runtime driving the
real CLI headlessly. This is the only new seam and the highest one available:
everything below it is covered by reading files, and reading files is exactly
what cannot prove a live session loads them. That gap is where opencode has been
sitting.

### The conformance matrix

Sixteen guarantees, asserted on all three runtimes: preamble in a session;
preamble in a subagent; lane name rendered with no placeholder surviving; a
naive prompt auto-invoking the lane; explicit invocation by the runtime's own
addressing; the guard refusing in-session; the guard refusing inside a subagent;
the guard surviving quoting and heredoc evasion; every skill discovered and
counted; reference paths resolving; lens roles registered; a lens physically
unable to write; the audit lane absent from model-facing listings; the audit
lane invocable by the user; a subagent able to dispatch a subagent; and the
project note and plan-state block present.

### What a good test is here

External behaviour only. A row asserts what a user would observe. No row asserts
how a runtime is wired internally.

No mocks. A mocked runtime tests our model of the runtime, and six separate
assumptions about these runtimes were falsified during this design by running
them.

A row that cannot pass is reported as a gap with its reason. A gap is a visible
state, distinct from a pass and from a failure. Omitting a row is forbidden,
because a silently absent row is how a runtime comes to claim parity it does not
have.

### Prior art

The unit seam matches the existing library tests. The install seam is the
existing install test, generalised. The behavioural seam follows the existing
lane-triggering test, which already measures whether a naive prompt makes the
model invoke a lane, and already points the run at the working tree rather than
a cache keyed by version.

## Global Constraints

- Claude Code 2.1.278 or later; opencode 1.18.25 or later; Codex CLI 0.155.1 or
  later. Every claim here was measured against these.
- No new runtime dependencies. fx ships node and shell only.
- The git guard module is not modified by this work, except the heredoc fix in amendment A7.
- Nothing is added above the opening imperative of `PREAMBLE.md`, and nothing
  inside it is made indirect.
- Skills name actions, never tools. A skill body naming a runtime's tool is a
  defect.
- No symlinks inside anything shipped to a runtime that copies plugin trees.
- Every script invocation in a skill names its interpreter, because at least one
  runtime is reported to strip execute bits on delivery.
- **Superseded by amendment A1.** The Codex manifest declares
  `"hooks": "./hooks.json"`. Formerly: the Codex manifest declares no hooks key.
- Manifest versions and marketplace entry versions stay identical, and a gate
  checks it.
- Refreshing an install is per runtime and documented, not assumed. Codex
  copies the plugin tree, so a repository update does not reach an installed
  copy until the plugin is updated.
- Derived artifacts carry a generated-file header naming their source, and a
  gate fails on drift.
- Provisioning has one implementation; the hook, the setup lane and the
  installer are callers of it, never reimplementations.
- Every provisioning route is idempotent and safe to run repeatedly.
- Behavioural conformance never runs inside the free gate.
- A guarantee resting on an undocumented field carries a conformance row.
- Measure against the installed plugin, or point the run at the working tree.
- Writes into a user's runtime home are confined to names fx generates, listed
  explicitly rather than matched by prefix, and are idempotent.
- An install finding fx already present in a second skills pool warns and names
  the remediation. It never refuses: a working install keeps working.
- No attribution trailers in commits.

## Out of Scope

- Runtimes other than the three named. The harness layer is the extension point.
- Listing in any runtime's first-party curated catalogue. This design makes fx
  installable from its own marketplace; being carried by someone else's is a
  separate decision.
- Slash-command parity on Codex, which has no project-scoped command surface and
  directs authors to skills instead. fx's commands become skills there.
- A live-reload development loop on Claude Code. The one source type that loads
  in place needs interactive consent and does not support Windows, so it is
  documented for maintainers rather than built into the install path.
- Reworking which lanes exist, what they say, or how they are worded.
- Migrating existing installs. Every current path keeps working.
- Windows.

## Amendment 2026-09-21: what the live matrix falsified

The behavioural rows in task 12 were the first thing in this build to run fx
inside real sessions. They falsified four assumptions this design rested on.
Primary-source research, kept in `research/`, explains each one. The user ruled
that Codex parity is the point of the work, so these are fixed here rather
than recorded as gaps.

### What was false

1. **Codex never ran `hooks/fx-codex.js`.** Codex uses the manifest `hooks` key
   when present and falls back to `hooks/hooks.json` otherwise, which is Claude
   Code's wiring (`research/codex.md`, source at `rust-v0.155.1`). The root
   `hooks.json` was never loaded. As a result Codex had no role planting, no
   read-only enforcement, no patch-tool lane check, and Claude Code's
   addressing. The live checks in tasks 04 to 06 passed anyway, because both
   hooks deliver a preamble.
2. **The preamble is cut short on Claude Code, and would be on Codex.**
   - Claude Code keeps hook context over 10,000 characters per hook as a file,
     and shows the model a 2,000 character preview
     (`research/claude-code-context-limit.md`). The rendered preamble is 12.3KB.
   - Codex spills context over 2,500 tokens per handler unless the handler sets
     `additionalContextLimit`.
3. **Codex roles were never dispatchable.** Codex hides `spawn_agent`'s
   `agent_type` until user roles exist, and roles were never planted because of
   the first finding. Codex also reads roles once per session, before any hook
   runs, so roles planted by a SessionStart hook are visible only from the next
   session. Codex ignores `sandbox_mode` in a role file.
4. **opencode subagents cannot dispatch.** The `task` tool needs an exact
   `permission.task` entry on the agent. A wildcard does not grant it, and
   `subagent_depth` only limits nesting once the tool exists
   (`research/opencode-subagents.md`).

Two further facts shape the fixes:
- Codex rejects hook output that carries a key it does not know. The run is
  marked failed and nothing is blocked, so a guard that prints a Claude-only
  key fails open.
- On Claude Code and opencode, a read-only agent kept a shell, so "cannot
  write" held only for the editing tools.

### Decisions

**A1. One hooks file per runtime.**
- The Codex manifest declares `"hooks": "./hooks.json"`, which is the file
  wiring `hooks/fx-codex.js`.
- Claude Code keeps `hooks/hooks.json`.
- Neither script detects its runtime: the file that invoked it already says
  which runtime it is.
- This reverses the global constraint that the Codex manifest declares no
  `hooks` key. That constraint cited a bundled validator that rejects the key.
  The runtime honours the key, and the installed CLI has no validate command.
  The task measures a marketplace install with the key present, which makes no
  model call. If the install refuses the key, the fallback is ponytail's shape:
  one shared file whose script detects Codex by `PLUGIN_ROOT` and shapes its
  output per host.

**A2. Codex hook output carries only keys Codex accepts.** `fx-codex.js`
output is checked against the key set in `research/codex.md`. A free test
feeds the script each event and fails on any other key, so a guard can never
fail open this way.

**A3. The preamble reaches the model whole on every runtime.**
- **Claude Code:** the rendered preamble is split into parts, each under 9,000
  characters, cut at section boundaries. Each part is emitted by its own
  handler on SessionStart and on SubagentStart. Part 1 opens with the opening
  imperative, and nothing goes above it. Each part ends with a line naming
  itself and the part count, so the model can tell when a part is missing.
  Handler order is not relied on.
- **Codex:** its SessionStart and SubagentStart handlers set
  `additionalContextLimit: 0`, so nothing needs splitting there.
- **opencode:** the system transform has no limit.
- A gate fails if any Claude Code part reaches 9,000 characters, or if the
  parts put back together differ from the full render.

**A4. Codex roles are dispatchable.**
- SessionStart plants the roles as before, and `fx-setup` plants them too.
- When a session writes a role that was not there, its injected context tells
  the user to restart Codex once before dispatching a review agent.
- Dispatch wording rendered for Codex passes `agent_type` explicitly. By
  default a spawn copies the parent's history, and in that mode a role applies
  only when it is named.
- Read-only enforcement stays in the `PreToolUse` hook keyed on `agent_type`.

**A5. Read-only agents have no shell, on every runtime.**
- On Claude Code, their tool lists drop Bash.
- On opencode, their agents get `bash: deny` alongside `edit: deny`.
- On Codex, their role turns the shell off, and the hook still refuses the
  patch tool.
- They read the packaged diff file instead of running git.
- This is the strongest guarantee each runtime offers. Neither project
  surveyed ships read-only agents at all.

**A6. opencode two-level dispatch.** The plugin's config hook grants
`permission.task = "allow"` to the agents that dispatch: the general agent and
fx's non-read-only agents. Read-only agents keep `task` denied.

**A7. Small defects fixed here.**
- The four dead assertions in `lib/git-guard.test.js` run again.
- `tests/install/run.sh` runs its Claude Code CLI checks under a scratch HOME.
- The guard refuses a git command fed to a shell as a heredoc body. The global
  constraint freezing `lib/git-guard.js` is lifted for that fix alone.

**A8. Nightly conformance in CI.** A workflow installs the pinned `claude`,
`codex` and `opencode` and runs the free rows against the real binaries every
night. It needs no model calls and no secrets. This is caveman's
`agent-conformance.yml` pattern. The live rows stay local.

**A9. Merge gate.** The branch does not merge until the Codex live matrix
passes. Codex quota resets on 2026-10-21. Everything else is built and proven
before then.

### Testing for the amendment

- Every fix gets a free test at the seam it changes: the manifest key, the
  Codex output key set, the part sizes and their reassembly, the role notice,
  the opencode config hook's permissions, and the read-only tool lists.
- The live rows already exist, and each finding above has a row that fails
  today. Rows 01, 02 and 16 fail on Claude Code. Rows 12 and 15 cover roles and
  nesting. The amendment is done when those rows pass on Claude Code and
  opencode now, and on Codex after the quota reset.
- Hook tests spawn the real scripts with each runtime's real payloads, which is
  ponytail's `tests/hooks.test.js` pattern, rather than calling functions.

## Open Questions

None. Every question raised was closed by decision or by measurement, and the
two previously predicted gaps are now hard requirements with measured
mechanisms behind them.

One contradiction is carried into implementation as a verification step rather
than an open question: the hook documentation states that plugin-bundled hooks
are skipped until reviewed and trusted, while an install performed during
research recorded no trust entry. The guard depends on the answer, so the first
conformance run settles it, and the install instructions state the trust step
until it does.

## Further Notes

Six assumptions were falsified during this design, each by running something
rather than reading about it. Codex serialises shell calls in Claude Code's
shape. Subagent identity reaches the tool hook. A role file's read-only
declaration does not actually prevent writes. Both non-Claude runtimes have a
real mechanism for hiding a skill from the model. The standalone hook
configuration file nests events under a key no documentation showed. And user
scope for roles, which one source asserted was unread, works.

Two further beliefs, encoded in fx's own gate and hook comments as measured
facts, were also false. `docs/adr/0010` names the shape: a measurement can be
honest, thorough, and about a different thing than the claim it is offered for.
A gate encoding a false belief is worse, because it reads as fresh evidence for
that belief every time it passes.

The load-bearing lesson from surveying how other projects solve this is not
about file layout. It is that the bootstrap has to actually fire. The project
shipping to the most runtimes states it in one sentence: without the bootstrap
the skill files are inert, present on disk and never invoked. That is the
failure the conformance matrix exists to make unshippable.
