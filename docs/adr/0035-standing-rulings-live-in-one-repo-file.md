# Standing rulings live in one repo file, read at every session start

## Context

Owner rulings were lost because they lived in chat or in one plan's ledger, so the owner repeated them each build. Decision 38 survived only because the agent happened to write it into each ledger.

## Decision

A ruling that holds for every build is written once, as a `Ruling:` line in `docs/plans/rulings.md`. `fx-implement` asks "this plan only, or every plan?" when the owner rules mid-run, and appends an every-plan ruling to that file.

`standingRulings()` in `lib/plan-state.js` reads `docs/plans/rulings.md` and nothing else, at every session start, compaction included. `describePlans()` adds the lines to the preamble block with a note to invoke `fx-implement` again before the next dispatch. A new ledger copies the file's lines into its `## Standing rulings` section, followed by a `## Log` heading, but that copy is a record and is never re-injected. Reading one source means an edited or deleted ruling takes effect at once, and a ledger section without an end marker cannot leak later plan-only rulings into every session.

The repository wrote the file, not the plugin or the owner in this session, so the block says so. Its heading is `### Standing rulings recorded in this repository (docs/plans/rulings.md)`, and its closing line says the rulings override `fx-implement`'s defaults "as the owner recorded them; a ruling that contradicts the owner's instructions in this session loses". A contributor who can commit a `Ruling:` line cannot outrank the owner who is present.

A thrown error while reading adds the line `- (standing rulings could not be loaded: <code or message>)` to the block instead of dropping the rulings silently.

The block carries at most 10 rulings, each cut to 160 characters. `describePlans()` is appended to every session's preamble, which `lib/preamble.test.js` holds under 9,000 characters with 10 long rulings present.
