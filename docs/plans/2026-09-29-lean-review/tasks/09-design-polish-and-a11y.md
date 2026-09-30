# 09: Design polish reference and a11y lines

**Status:** ready-for-agent
**Blocked by:** 07, 08
**Phase:** Polish

**What to build:** `fx-design` gains a CSS-only reference of motion, surface and icon heuristics absorbed from `emil-design-eng` and `better-ui` (both MIT, neither measured). The a11y lens gains two checks: animation as the only signal of a state change, and which icons to mirror in RTL. fx-design's "card kit" tell is narrowed so it does not forbid a layered shadow. ADR-0034 records every piece of absorbed content from tasks 07, 08 and 09, and amends ADR-0012.

**Files:**
- Create: `references/stacks/web-polish.md`
- Modify: `skills/fx-design/SKILL.md`
- Modify: `agents/fx-lens-a11y.md`
- Modify: `codex/agents/fx-lens-a11y.toml` (regenerated)
- Modify: `docs/adr/0012-what-fx-deliberately-does-not-cover.md`
- Create: `docs/adr/0034-external-review-security-and-design-content-absorbed.md`
- Modify: `tests/gates/lens-content.test.js`

**Interfaces:**
- Consumes: `tests/gates/lens-content.test.js` from task 08 (already in `scripts/check-all`); the four review items from task 07.
- Produces: `references/stacks/web-polish.md`, loaded from `fx-design` §7.

**Seam:** file content, pinned by the extended gate test plus `check-paths` and `check-reference-leaves`.

**Risks:** `scripts/check-reference-leaves` forbids a reference that names another reference `.md` file: `web-polish.md` must not mention `web.md` by filename. `scripts/check-paths` requires every citation to resolve. The a11y lens description is unchanged.

**Idempotency:** new files written whole; insertions checked for presence first; the generator is idempotent.

**Testing:** gate test; `check-paths`; `check-reference-leaves`; `check-generated`.

## Acceptance criteria
- [ ] `references/stacks/web-polish.md` exists with the content below.
- [ ] `fx-design` loads it in §5 (motion) and §7 (next to the `web.md` load); item 4 of §3 carries the hierarchy clause.
- [ ] `fx-lens-a11y` Perception has the animation-only-signal bullet; RTL has the flip table.
- [ ] ADR-0012's motion paragraph says it is superseded in part by ADR-0034, and ADR-0012 gains "No SEO or marketing audit" and "No paid web search backend".
- [ ] ADR-0034 lists what was absorbed from each of the four sources, where it went, and what was not adopted and why.
- [ ] The gate test, `check-paths`, `check-reference-leaves` and `check-generated` pass.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane.**

- [ ] **2. Extend the failing test.** In `tests/gates/lens-content.test.js`, before the final `console.log`, add:

```js
const a11y = read('agents/fx-lens-a11y.md');
assert.ok(a11y.includes('A state change signalled only by animation'), 'a11y: animation is never the only signal');
assert.ok(a11y.includes('| Mirror in RTL | Never mirror |'), 'a11y: the RTL icon table exists');

const polish = read('references/stacks/web-polish.md');
for (const phrase of ['scale(0.97)', 'Never `ease-in`', 'under 300 ms', 'transition: all',
  '(hover: hover) and (pointer: fine)', 'outer radius = inner radius + padding', 'transition: none !important']) {
  assert.ok(polish.includes(phrase), `web-polish: ${phrase}`);
}
assert.ok(polish.includes('heuristics'), 'web-polish says its rules are heuristics');

const design = read('skills/fx-design/SKILL.md');
const s5 = design.slice(design.indexOf('## 5. Structure, motion, background'), design.indexOf('## 6. Restraint'));
const s7 = design.slice(design.indexOf('## 7. The quality floor'), design.indexOf('## 8. Writing is design content'));
assert.ok(s5.includes('references/stacks/web-polish.md'), 'fx-design §5 loads web-polish for motion');
assert.ok(s7.includes('references/stacks/web-polish.md'), 'fx-design §7 loads web-polish');
assert.ok(design.includes('a layered shadow that separates one surface from another is not this tell'),
  'the card-kit tell is narrowed');

const adr12 = read('docs/adr/0012-what-fx-deliberately-does-not-cover.md');
assert.ok(adr12.includes('Superseded in part by ADR-0034'), 'ADR-0012 motion paragraph is marked');
assert.ok(adr12.includes('**No SEO or marketing audit.**') && adr12.includes('**No paid web search backend.**'),
  'ADR-0012 records the new no\'s');
assert.ok(fs.existsSync(path.join(root, 'docs/adr/0034-external-review-security-and-design-content-absorbed.md')),
  'ADR-0034 exists');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/lens-content.test.js`
Expected: FAIL, `a11y: animation is never the only signal`.

- [ ] **4. Create `references/stacks/web-polish.md`** with exactly:

````markdown
# Web polish

Motion, surface and icon heuristics for interfaces delivered as HTML and CSS,
whatever renders them. Absorbed from `emil-design-eng` (Emil Kowalski, MIT)
and `better-ui` (Jakub Krehel, MIT). **These are heuristics, not measured
rules**: neither source measured them. The brief and the project's own tokens
win over any value here.

## Motion

- **Gate by frequency.** No animation on actions done 100 or more times a day
  or triggered from the keyboard (shortcuts, command palette, row hover, tab
  switch). Keep motion for rare moments: first load, success, empty states.
- **Easing.** `ease-out` for anything entering or responding to input. Never
  `ease-in` for UI: it delays the first movement, the moment the user watches.
- **Duration.** UI transitions under 300 ms. Exits are shorter and softer than
  entrances.
- **Name the properties.** Never `transition: all`; list what moves.
- **Interruptible UI uses transitions**, not keyframes, so a reversal starts
  from where the element is.
- **Animate transform and opacity only.** Anything else triggers layout or
  paint on every frame.
- **Press feedback.** `transform: scale(0.97)` on `:active` for pressable
  elements. One value across the product.
- **Never from nothing.** Enter from `scale(0.95)` with `opacity: 0`, never
  from `scale(0)`. A popover grows from its trigger (`transform-origin` at the
  trigger); a modal grows from the centre.
- **Hover effects only where hover exists:**
  `@media (hover: hover) and (pointer: fine)`.
- **Theme switch.** Suppress transitions for the swap: add
  `*,*::before,*::after{transition: none !important}`, force a reflow, remove
  it on the next frame. Otherwise every colour transition fires at once and
  the page smears.
- **Never the only signal.** Every animated state change also has a static
  cue: text, an icon, or colour plus shape.

## Surfaces

- **Concentric radius:** outer radius = inner radius + padding. Mismatched
  nested radii are the most common reason an interface feels off.
- **Shadows for depth, borders for structure.** Where a border exists only to
  lift a surface, use layered transparent `box-shadow`. Keep borders for
  dividers, separators, and selected or focus states.
- **Image outline:** `1px` at 10% opacity, pure black in light mode
  (`oklch(0 0 0 / 0.1)`), pure white in dark (`oklch(1 0 0 / 0.1)`). Never a
  tinted neutral: it picks up the surface and reads as dirt on the edge.
- **Optical alignment.** Icon-only buttons, play triangles and carets are
  aligned by eye, not by bounding box: nudge the glyph until it looks centred.

## Icons

- **Stroke follows the text weight** next to it; one icon set per surface.
- **`currentColor`** for fill or stroke, so icons follow text colour and theme.
- **Outline by default, filled for the active state**, used as a pair, never
  interchangeably.
````

- [ ] **5. Edit `skills/fx-design/SKILL.md`.**

§3, item 4: `the same soft grey shadow under each,` becomes `the same soft grey shadow under each (uniform depth regardless of hierarchy; a layered shadow that separates one surface from another is not this tell),`.

§5, after the paragraph starting `**Motion that nobody triggered is for attention**`, add: `Motion values (easing, duration, press scale, what never animates) are in \`../../references/stacks/web-polish.md\`.`

§7, after the paragraph that loads `../../references/stacks/web.md` (ending `this skill is the judgment.**`), add:

```markdown
For motion, surfaces and icons, read `../../references/stacks/web-polish.md`.
It carries heuristics, not measured rules: the brief and the project's tokens
win.
```

- [ ] **6. Edit `agents/fx-lens-a11y.md`.** Under `**Perception**`, after `- Animation with no \`prefers-reduced-motion\` guard.`, add:

```markdown
- A state change signalled only by animation: every animated state needs a
  static cue too (text, an icon, or colour plus shape).
```

Under `**RTL and localisation**`, replace `- Directional icons (chevrons, arrows, back buttons) not mirrored in RTL.` with:

```markdown
- An icon mirrored or not mirrored against its meaning under `dir="rtl"`
  (after better-ui, MIT):

  | Mirror in RTL | Never mirror |
  |---|---|
  | Back and forward arrows, chevrons in navigation | Logos and brand marks |
  | Text-block glyphs: alignment, lists, indent | Checkmarks |
  | Speaker and volume waves | Physical objects: clocks, cups, pencils |
  | "Send" style directional glyphs | Media playback controls (play and rewind keep tape direction) |
```

- [ ] **7. Edit ADR-0012.** Append to the `**No motion or animation guidance**` paragraph: ` Superseded in part by ADR-0034: \`references/stacks/web-polish.md\` now carries motion heuristics, labelled as unmeasured.` Before `## Still undecided`, add:

```markdown
**No SEO or marketing audit.** Half of a useful SEO audit is marketing
strategy, and the rest needs a live site and search-console access that fx
lanes do not have. `seo-audit` (coreyhaines31/marketingskills) can be
installed beside fx; its triggers do not contest a lane. `ai-seo` was
rejected outright: its claims are vendor anecdotes and it changes monthly.

**No paid web search backend.** `firecrawl-search` was considered for the
`research` lane and rejected: a paid service that sends per-search feedback
off the machine by default, a second claimant for web research, and little
over the runtime's own fetch, context7 and a browser driver.
```

- [ ] **8. Write ADR-0034** at `docs/adr/0034-external-review-security-and-design-content-absorbed.md`. H1: `# External review, security and design content is absorbed as text, never as lanes`. Prose: the rule (one claimant per intent, so external skills become content in existing prompts and lenses); per source, what was taken and where it went (akkie76/code-review-skills: four review items, task 07; cloudflare/security-audit-skill: eight checks plus two branch-only, task 08; emil-design-eng and better-ui: `web-polish.md` and two a11y checks, this task, with press scale 0.97 chosen over 0.96); what was not adopted (firecrawl-search, seo-audit, ai-seo, the React-only parts, the review scheme and sandboxed workflow) and why; that ADR-0012 is amended.

- [ ] **9. Run it: verify GREEN**

Run: `node tests/gates/lens-content.test.js`
Expected: `lens-content.test.js: OK`

- [ ] **10. Regenerate and run the touched gates**

Run: `scripts/gen-codex-agents && scripts/check-generated && scripts/check-paths && scripts/check-reference-leaves && node tests/gates/agent-model.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-prose references/stacks/web-polish.md skills/fx-design/SKILL.md agents/fx-lens-a11y.md docs/adr/0012-what-fx-deliberately-does-not-cover.md docs/adr/0034-external-review-security-and-design-content-absorbed.md`
Expected: all pass; `codex/agents/fx-lens-a11y.toml` modified.

- [ ] **11. Commit**

```
git add references/stacks/web-polish.md skills/fx-design/SKILL.md agents/fx-lens-a11y.md codex/agents/fx-lens-a11y.toml docs/adr/0012-what-fx-deliberately-does-not-cover.md docs/adr/0034-external-review-security-and-design-content-absorbed.md tests/gates/lens-content.test.js
git commit -m "feat(design): web-polish heuristics, a11y motion and RTL icon checks"
```
