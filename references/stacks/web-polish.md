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
