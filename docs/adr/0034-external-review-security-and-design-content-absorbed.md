# External review, security and design content is absorbed as text, never as lanes

### Context

Four external skills were reviewed for what fx could take from them. fx holds one claimant per intent: each lane and lens owns its work, so a second skill claiming the same intent splits the model's attention and lets neither win.

### Decision

External skills become content inside existing prompts, lenses and references. None becomes a lane.

**akkie76/code-review-skills** gave four review items, added to the review prompt in task 07 (commit 7634883): a sweep for callers and variants of a changed function, a re-read of each fact a change relies on, test-constant drift, and doc drift.

**cloudflare/security-audit-skill** gave eight checks for `agents/fx-lens-security.md`, added in task 08 (commit 867cae2): search, filter, sort and export paths; import and export paths; soft delete and revoke; saved webhook URLs; tenant-blind log and analytics readers; "missing" versus "forbidden" responses; tokens not bound to audience or issuer; session fixation. Two of the eight apply to branch review only (second-order effects, restore and undelete paths). `fx-review` now passes each lens a `mode:` line, so the lens knows whether it reads a branch or a diff.

**emil-design-eng (Emil Kowalski, MIT) and better-ui (Jakub Krehel, MIT)** gave `references/stacks/web-polish.md`, loaded from `fx-design` sections 5 and 7, and two checks for `agents/fx-lens-a11y.md` (this task): animation as the only signal of a state change, and which icons to mirror in RTL. Neither source measured its values, so the reference says they are heuristics. Press scale is 0.97, chosen over the 0.96 one source used. The "card kit" tell in `fx-design` is narrowed so a layered shadow that separates surfaces no longer counts as it.

### Not adopted

- `firecrawl-search`: paid, sends per-search feedback off the machine by default, and duplicates the `research` lane.
- `seo-audit`: half marketing strategy, half needs a live site. It can be installed beside fx.
- `ai-seo`: vendor anecdotes that change monthly.
- The React-only parts of the design sources: fx stacks are not React-specific.
- The review scheme and sandboxed workflow of the review source: fx-review already owns both.

### Consequences

ADR-0012 is amended: its motion paragraph is superseded in part, and it gains "No SEO or marketing audit" and "No paid web search backend". `tests/gates/lens-content.test.js` pins the absorbed text.
