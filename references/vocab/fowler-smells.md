# The smell baseline

A fixed set of code smells (Fowler, *Refactoring*, ch. 3) that the Standards
axis carries **even when a repo documents nothing.**

Two rules bind it:

- **The repo overrides.** A documented repo standard always wins. Where the
  repo endorses something this baseline would flag, **suppress the smell.**
- **Always a judgement call.** Each entry is a labelled heuristic: "possible
  Feature Envy": **never a hard violation.** A documented-standard breach can
  be hard; a baseline smell cannot.

**Skip anything tooling already enforces.** rubocop, erb_lint, `dotnet format`,
ktlint and SwiftLint catch their own; a reviewer spent there is wasted.

This file is **pasted in full into the Standards subagent's prompt**: it has
no other access to it.

Each entry reads *what it is* → *how to fix*. Match against the diff.

---

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal
  what it does or holds.
  → Rename it. If no honest name comes, the design is murky.

- **Duplicated Code**: the same logic shape appears in more than one hunk or
  file in the change.
  → Extract the shared shape, call it from both.

- **Feature Envy**: a method that reaches into another object's data more than
  its own.
  → Move the method onto the data it envies.

- **Data Clumps**: the same few fields or parameters keep travelling together;
  a type wanting to be born.
  → Bundle them into one type and pass that.

- **Primitive Obsession**: a primitive or string standing in for a domain
  concept that deserves its own type.
  → Give the concept its own small type.

- **Repeated Switches**: the same `case`/`if`-cascade on the same type recurs
  across the change.
  → Replace with polymorphism, or one map both sites share.

- **Shotgun Surgery**: one logical change forces scattered edits across many
  files in the diff.
  → Gather what changes together into one module.

- **Divergent Change**: one file or module is edited for several unrelated
  reasons.
  → Split it so each module changes for one reason.

- **Speculative Generality**: abstraction, parameters, or hooks added for
  needs the spec doesn't have.
  → Delete it. Inline back until a real need shows.

- **Message Chains**: long `a.b.c.d` navigation the caller shouldn't depend on.
  → Hide the walk behind one method on the first object.

- **Middle Man**: a class or function that mostly just delegates onward.
  → Cut it; call the real target directly.

- **Refused Bequest**: a subclass or implementer that ignores or overrides most
  of what it inherits.
  → Drop the inheritance; use composition.
