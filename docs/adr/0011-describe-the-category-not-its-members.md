# Describe the category; do not enumerate its members

`fx-tdd` once ended its description with *"Covers .rb, .cs, .kt, .swift, .ts and
.erb helpers"*, and reached for the same closed set throughout its body. **None
of it was load-bearing**: every rule in the skill is language-neutral. The
enumeration added nothing and subtracted reach, because an agent working in Go,
Elixir or PHP reads a list it is not on and has a free reason to conclude the
skill is not for it.

Where code must decide, **exclude what is known not to qualify rather than
including what is known to**. `lib/lane-check.js` had an allowlist of fifteen
source extensions and was blind to everything else, silently. It now treats
anything with an extension as source unless it is known prose, config, markup or
a binary asset.

An allowlist is a promise to maintain it forever, and it fails closed against
everything new.
