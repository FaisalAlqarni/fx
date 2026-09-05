# fx owns the over-engineering intent; it still does not replace ponytail

Two separate things were tangled together here, and only one of them survived.

## fx does not replace ponytail

fx's README, INSTALL, SURFACE and marketplace description all claimed it did.
**It never did.** ponytail is a substantial plugin with its own hooks, an MCP
server, a Gemini extension, six skills and benchmarks, and fx absorbed none of
it. That claim is removed from all four places.

## But fx does claim the over-engineering intent

The routing table used to send "is this too much" to *"ponytail if installed;
fx has no lane for it"*. That row pointed at nothing: **ponytail is disabled**
in this environment (`"ponytail@ponytail": false`), along with every other
plugin superseded during consolidation. Disabling them is what stopped the skill
listing truncating, so re-enabling one to serve a single intent trades a
measured fix for a routing convenience, and re-introduces a review-intent
collision besides.

**`fx-architecture` owns it now**, because excess complexity is a wrong shape
like any other and the lane already owned wrong shapes. Measured on the lane
harness:

| Prompt | Before | After |
|---|---|---|
| "is this over-engineered, what can we delete" | 1/5 | **5/5** |
| "this file is 900 lines and I cannot test it" | 2/2 | **3/3** |

The second row is the one that mattered: widening a description usually costs
the triggers it already had, and here it did not.

## What it carries

`references/vocab/codebase-design.md` holds five tests, the deletion test it
already had plus four adapted from `vanity-engineering-review`: **replacement**
(could something boring do 90% of this), **new hire** (learnable in an hour),
**scale** (matched to real scale or an imagined one), **resume** (chosen because
it is right or because it is impressive).

**The requirements anchor is the load-bearing part.** All five misfire without
knowing who uses the code, what it must do and at what scale, so `fx-architecture`
establishes that before scanning. Complexity is only excessive relative to a
requirement; a scan that skips this reports taste as though it were a finding.

## If ponytail is ever re-enabled

`ponytail-review` is a good 57-line reviewer with a forced output grammar and a
`net: -<N> lines possible.` footer. It is a fine second opinion and it is not
required. Nothing in fx depends on it.
