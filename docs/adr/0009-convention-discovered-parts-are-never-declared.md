# Anything discovered by convention is never declared in the manifest

`plugin.json` names only what is **not** in a standard location. `agents/` and
`hooks/hooks.json` are found by convention, and declaring either is an error
that `scripts/check-manifest` now rejects.

Declaring `agents` fails validation loudly and the install stops, which is
survivable. Declaring `hooks` is worse: skills, agents and commands all load
normally and **the entire hooks block is silently dropped**. The plugin reports
itself installed and enabled, every skill is listed, and the preamble injection
and the git guard are simply absent.

**That is the worst failure shape available: the parts you can see work, and the
parts that enforce the rules do not.**
