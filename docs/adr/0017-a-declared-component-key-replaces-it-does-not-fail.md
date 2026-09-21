# A declared component key replaces the default scan; it does not fail validation

`scripts/check-manifest` refuses a `plugin.json` that declares `agents` or
`hooks`, on the stated grounds that declaring `agents` fails validation and
declaring `hooks` "double-loads and takes the entire hooks block down with it".

**Both grounds are false.** Measured 2026-09-21 against Claude Code 2.1.278, with
a throwaway plugin declaring `agents` and `hooks` together:

```
$ claude plugin validate <probe>
⚠ Found 1 warning:
  ❯ author: No author information provided...
✔ Validation passed with warnings
```

The only warning was about the author field. Both keys are documented, and
`agents` appears in the official schema example.

## What is actually true

Declaring a component key **replaces** the directory that would otherwise be
scanned. For `commands`, `agents`, `workflows` and `outputStyles`, naming the key
stops the convention scan: to keep the default and add more, list it explicitly.
`skills` is the exception: it always adds to the `skills/` scan rather than
replacing it.

So the rule fx wanted was real, but it was recorded as the wrong rule. The
hazard is silent loss of the default scan, not a failed load. A gate that
refuses the key prevents a thing that does not happen, and teaches a reason that
is not the reason.

## Why this kept happening

`0010` names the shape: a measurement can be honest, thorough, and about a
different thing than the claim it is offered for. Three false conclusions in one
hour came from measuring a stale plugin cache. These two came from the same
place and outlived it by longer, because a gate that encodes a false belief
reads as evidence for the belief every time it passes.

## Consequences

- **`scripts/check-manifest` drops the prohibition** and, where a key is
  declared, checks the thing that actually bites: that the default directory is
  still reachable.
- `0009` is amended, not withdrawn. Convention discovery is still the default
  fx uses; it is no longer justified by a validation error that does not exist.
- **Re-measure before recording a harness limit, with `--plugin-dir`.** Not
  because the docs are untrustworthy, but because fx's own history is that the
  confident version of the claim is the one that survives unexamined.
