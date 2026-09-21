# The preamble is rendered, not copied

`PREAMBLE.md` is one file injected verbatim on every runtime. Its opening
imperative names the lanes concretely, invoke `fx:fx-tdd`, and warns that a
bare `fx-tdd` may not resolve at all.

On opencode that advice is exactly backwards: `fx-tdd` is the right name and
`fx:fx-tdd` is the wrong one. On Codex both are wrong; the form is `$fx-tdd`.
The installer rewrites the plugin prefix in generated commands and agents, and
has never touched the preamble, because `plugins/fx.js` reads the file directly.

So the single most load-bearing paragraph in fx has been shipping wrong
instructions to a runtime fx claims to support, since that support existed.

## Why the obvious fix is the wrong one

The obvious fix is to make the imperative harness-neutral and point at
`references/harnesses/<name>.md` for the syntax. `0002` rules that out and has
the measurement to back it: the imperative at line 56 of 210 fired 0/5; first,
unchanged, 5/5. Order is force, and the first section survives while everything
after it competes.

A pointer inside the imperative is worse than a late imperative. It asks the
agent to perform a read before it can act, in the same paragraph that tells it
**invoke, do not read**. The instruction would contradict itself, and per `0002`
that failure is silent and looks like a description problem somewhere else.

## The rule

`PREAMBLE.md` stays one source and carries a placeholder where a name is
runtime-specific. Each injector renders it through one shared function before
injecting, so every session sees a concrete, correct, self-sufficient
imperative, with no indirection and no read.

```
PREAMBLE.md ──> lib/preamble.js ──┬─> hooks/fx-context.js   Skill · fx:fx-tdd
   {{LANE:fx-tdd}}                ├─> plugins/fx.js         Skill · fx-tdd
                                  └─> hooks/fx-codex.js     $fx-tdd
```

`references/harnesses/<name>.md` still exists and still carries the tool
vocabulary of `0016`. What it must never carry is anything the agent needs
**before** it can invoke a lane.

## Consequences

- **One renderer, not three substitutions.** Three injectors each doing their own
  string replacement is how the runtimes drift apart, which is the failure
  `lib/git-guard.js` exists to prevent on the other side.
- **A placeholder that reaches a session unrendered is a bug, not a cosmetic
  one.** It gets a test per runtime.
- `0002` is reinforced, not amended. Nothing is added above the imperative and
  nothing is made indirect inside it; only the names are made correct.
