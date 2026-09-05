---
name: fx-design
description: >
  Use on "make this look good", "design this page", "build a landing page",
  "make it less generic", "this looks AI-generated", or any new screen, page
  or component where how it looks is part of the job. For a diff, use
  fx-review; for the structure behind the screen, use fx-architecture. It
  carries a calibrated list of the specific treatments current models reach for
  by default, and you cannot check your own output against a list you have not
  read.
---

# fx-design

Announce: "Using fx-design to work out the visual direction before building."

The failure this exists to prevent is not ugliness. It is **convergence**: a
page that could belong to any product, assembled from the treatments every
model reaches for when nothing told it otherwise. The user can recognise that
look, which is why the work has to be specific to this brief rather than good
in general.

## 1. Ground it in the subject

**If the brief does not say what this is for, work it out and confirm before
designing.** Propose one concrete subject, the audience, and the job the design
has to do.

The subject's industry, materials and vocabulary are where distinctive choices
come from. A toy for eight-year-olds and a dashboard for financial analysts
share no visual decisions, and a design that would suit either has not been
designed for one.

Build with the real content throughout. Placeholder text hides the problems
real copy creates.

## 2. The plan, before any code

A compact token system, written down and reviewed before you build.

- **Color**: 4 to 6 named hex values. **Dominant colors with sharp accents beat
  timid, evenly spread palettes.**
- **Type**: the families and their roles. One or two, and if two, clearly
  distinct.
- **Layout**: a one-sentence concept plus an ASCII wireframe. Include
  alignment: left, centred, justified.
- **Principles**: what makes this page this page and not a neighbour.

### Then review the plan against the brief, before writing code

Work through the brief as if you had not just written the plan, and see whether
you arrive somewhere similar. **Anything you would have produced for any
comparable page is a default, not a choice.** Revise it, and say what changed
and why.

Only build once the plan survives that pass.

## 3. Calibration: what convergence looks like

Current model output clusters here. Every one is legitimate for some brief. The
tell is that they appear regardless of subject.

1. A warm cream background near `#F4F1EA`, high-contrast serif display, and a
   terracotta accent near `#D97757`.
2. Near-black background, one bright acid-green or vermilion accent.
3. Broadsheet layout: hairline rules, zero border radius, dense columns.
4. The card kit: content chopped into identical rounded cards, one radius on
   everything regardless of hierarchy, the same soft grey shadow under each,
   gradient washes as decoration.
5. Template chrome that survives any subject: a tracked-out all-caps eyebrow
   above every heading, meta strings joined with middle dots, tinted near-black
   standing in for black, a monospace face for small labels, an arrow appended
   to link text.
6. Purple gradient on white.

**Where the brief pins a direction, follow it exactly, including when it asks
for one of these.** The brief's own words always win. Where the brief leaves an
axis free, do not spend that freedom on a default.

## 4. Typography

Type carries more personality than any other choice, and it is the one most
often left on autopilot.

**Do not reach for** Inter, Roboto, Open Sans, Lato, Arial, or the system
stack. They are not bad; they are what gets chosen when nothing was chosen.
Note that `Space Grotesk` has itself become a default.

Directions worth considering, by character:

| Character | Families |
|---|---|
| Editorial | Playfair Display, Crimson Pro, Fraunces, Newsreader |
| Technical | IBM Plex, Source Sans 3, JetBrains Mono, Fira Code |
| Contemporary | Clash Display, Satoshi, Cabinet Grotesk |
| Distinctive | Bricolage Grotesque, Instrument Serif |

**Use the extremes.** Weight contrast of 100/200 against 800/900, not 400
against 600. Size jumps of 3x and more, not 1.5x. A scale that only ever steps
gently reads as an absence of decisions.

Set a real scale, following *The Elements of Typographic Style* defaults, with
deliberate weights, widths and spacing. **State the choice and the reason
before writing code.**

Line length under 80 characters. Serif faces tolerate slightly longer lines and
want slightly more line height than a sans at the same size.

**Avoid, because each is a tell:** accenting one word in a headline with italic,
bold or color; all caps for labels; a typographic label above content that did
not need one.

## 5. Structure, motion, background

**Structural devices encode information.** Outlines, rules, numbering, eyebrows
and dividers should tell the reader something about the content. Numbered
markers belong on a sequence; check the content is one before adding them.

**Motion that nobody triggered is for attention, and one orchestrated moment
beats scattered effects.** One page-load sequence with staggered reveals lands;
a fade-and-slide on every section and a hover transition on every card is the
generic default and reads as machine-made. Motion that answers an action, an
open, an expand, a confirm, is welcome, because it shows what changed.

**Backgrounds can carry atmosphere.** Layered gradients, a geometric pattern, a
contextual effect. A flat fill is a choice worth making deliberately rather than
by omission.

## 6. Restraint

**Spend boldness in one place.** One element is the memorable thing; everything
around it stays quiet. Cut decoration that does not serve the brief.

Before you call it done, remove one thing.

## 7. The quality floor, met without announcing it

- Responsive down to mobile.
- Visible keyboard focus on every interactive element.
- `prefers-reduced-motion` respected.
- Contrast that passes at the sizes actually used.
- **If the project is bidirectional, the layout mirrors**: logical properties
  rather than left and right, and no icon whose meaning depends on a direction
  it no longer points.

For the mechanical rules underneath this floor, read
`../../references/stacks/web.md`: forms, content that varies in length,
localisation, layout shift, theming and interface copy. **It is the checklist;
this skill is the judgment.**

## 8. Writing is design content

Words exist to make the interface easier to use, not to decorate it.

- Name things as the user understands them. Someone manages notifications, not
  webhook configuration.
- Active voice. A control says what happens: "Save changes", not "Submit".
- **One action keeps one name through the whole flow.** The button that says
  Publish produces a message that says Published.
- Errors explain what happened and what to do, in the interface's voice. They
  do not apologise and they are never vague.
- An empty state is an invitation to act, not a mood.
- Sentence case, plain verbs, no filler. Each element does one job.

## Any template language

The judgement here is not framework-specific and neither is this skill. ERB,
Razor, JSX, Vue, plain HTML: the palette, scale, structure and copy decisions
are the same, and only the syntax changes.

Where the project has its own tokens, shared partials or component contract,
**those win**. Read them first: `repo.md` names them. A design that ignores an
existing system is not distinctive, it is inconsistent.

## Critique your own work

Look at the built result, not the code. Screenshot it if the environment
allows. Ask what a person seeing it for the first time notices first, and
whether that is what you intended.

Then check it against section 3 honestly. **The list is only useful if you
apply it to your own output**, and the reason it is worth applying is that the
convergent choice always feels like the good one from inside.
