# Web

Browser knowledge. True of any interface delivered as HTML and CSS, whatever
renders it: ERB, Razor, JSX, Vue, Blade, plain files.

**This file never names a command, a port, a directory layout or a package
choice.** Those belong to `.fx.json` and `repo.md`.

Vendored from Vercel's `web-interface-guidelines`, curated against what fx
already covers and reordered by what actually goes wrong. **Vendored on purpose:
the upstream skill fetches its rules over the network at review time, which
makes a review behave differently offline.**

Framework-specific rules are not here. A project naming more than one stack
loads each of them, and the framework file carries its own concerns.

---

## Contents

- [Forms](#forms) · the densest cluster of real defects
- [Content that varies](#content-that-varies) · truncation, empty, very long
- [Localisation](#localisation)
- [Typography](#typography)
- [Images and layout shift](#images-and-layout-shift)
- [Browser performance](#browser-performance)
- [Navigation and state](#navigation-and-state)
- [Touch and pointer](#touch-and-pointer)
- [Theming](#theming)
- [Hydration](#hydration)
- [Interface copy](#interface-copy)

Accessibility and focus are **not** here. `fx-lens-a11y` owns them, and a second
copy would be a second source of truth.

---

## Forms

- **`autocomplete` and a meaningful `name` on every input.** The single cheapest
  usability win available, and the one most often missing.
- **Correct `type` and `inputmode`**: `email`, `tel`, `url`, `number`. This
  changes the mobile keyboard, so getting it wrong is a real cost on the device
  most people are using.
- **Never block paste.** `onPaste` with `preventDefault` breaks password
  managers, and the reason it is usually added (a confirm-email field) is a
  worse idea than the paste it blocks.
- **Turn spellcheck off on emails, codes and usernames**: `spellcheck="false"`.
- **A checkbox or radio and its label share one hit target.** Two adjacent
  targets with a dead zone between them is the common broken form.
- **The submit button stays enabled until the request starts**, then shows a
  spinner. Disabling it on invalid input hides why nothing happens.
- **Errors render inline beside their field**, and submitting moves focus to the
  first one.
- **Warn before navigating away from unsaved changes.**
- Placeholders show an example and end in an ellipsis. A placeholder is never a
  label.

## Content that varies

The failure here is that everything looks right against the content you tested.

- **Flex children need `min-w-0`** or the text will not truncate no matter what
  you set on it. This is the reason truncation "does not work".
- Text containers declare how they handle overflow: truncate, clamp to N lines,
  or break words. Choosing none of them is choosing a broken layout.
- **Handle the empty case.** An empty string or an empty array should not render
  a shell with nothing in it.
- User-supplied content arrives short, average and absurdly long. Check all
  three, not the one in the fixture.

## Localisation

- **Format dates and numbers with `Intl.DateTimeFormat` and `Intl.NumberFormat`,
  never by hand.** A hardcoded format is wrong in most of the world and looks
  correct wherever it was written.
- **Detect language from `Accept-Language` or `navigator.languages`, never from
  IP.** Where someone is is not what they read.
- **`translate="no"` on brand names, code tokens and identifiers**, or machine
  translation garbles them into something that looks like a bug in your product.
- **If the interface is bidirectional**, layout mirrors: logical properties
  rather than left and right, and no icon whose meaning depends on a direction
  it no longer points.

## Typography

- An ellipsis character, not three periods. Curly quotes, not straight ones.
- **Non-breaking spaces where a break would read as an error**: `10&nbsp;MB`,
  `⌘&nbsp;K`, a number and its unit, a brand name that is two words.
- **`font-variant-numeric: tabular-nums` wherever numbers stack.** Any column of
  figures, any before-and-after comparison. Proportional digits make a column of
  numbers jitter, and it reads as sloppiness without anyone identifying why.
- `text-wrap: balance` on headings so the last line is not one orphaned word.
- Loading and progress strings end in an ellipsis.

**These are Latin conventions.** Curly quotes, small caps and capitalisation
rules do not transfer to every script, and a script without capitals cannot use
a rule about them. Check before applying them to a language you do not read.

## Images and layout shift

- **Explicit `width` and `height` on every `<img>`.** Without them the page
  reflows when images land, which is the most common cause of a visitor tapping
  the wrong thing.
- Below the fold: `loading="lazy"`. Critical and above the fold:
  `fetchpriority="high"`.
- Prefer a muted looping video to an animated GIF, and provide a still for
  reduced motion.

## Browser performance

- **Lists past roughly 50 items get virtualized**, or `content-visibility: auto`,
  which is one CSS line and enough for the common case.
- **No layout reads during render**: `getBoundingClientRect`, `offsetHeight`,
  `scrollTop`. Reading geometry while rendering forces synchronous layout.
- **Batch reads and writes.** Interleaving them is how one loop becomes hundreds
  of layouts.
- Preconnect to asset and CDN origins. Preload critical fonts with
  `font-display: swap`, so text is readable before the font arrives.
- Prefer uncontrolled inputs. A controlled one runs your code on every keystroke.

## Navigation and state

- **The URL reflects the state**: filters, tabs, pagination, which panel is open.
  If it lives in component state, ask whether it should live in the query string.
  Anything not in the URL cannot be linked, bookmarked or restored.
- Navigation uses a real anchor or the framework's link component, so
  middle-click and modifier-click work. A click handler on a `div` is not a link.
- **Destructive actions get a confirmation or an undo window**, never immediate
  execution.

## Touch and pointer

- `touch-action: manipulation` removes the 300ms double-tap delay.
- `overscroll-behavior: contain` on modals, drawers and sheets, or scrolling
  inside them scrolls the page behind them.
- Set the tap highlight colour deliberately rather than inheriting it.
- **Any gesture needs a tap and keyboard equivalent** unless the gesture is the
  entire point of the product.
- `autofocus` on desktop, on a single primary input, and not on mobile where it
  throws up the keyboard over the content.

## Theming

- **`color-scheme: dark` on the root element** for a dark theme. Without it the
  scrollbars and native form controls stay light and the page looks broken in
  exactly one place.
- `<meta name="theme-color">` matching the page background.
- **A native `<select>` needs explicit `background-color` and `color`**, because
  Windows dark mode will otherwise render it unreadable.

## Hydration

- An input with `value` needs `onChange`, or use the uncontrolled form.
- **Anything read from the environment during render is a hydration mismatch
  waiting to happen**: the current time, the timezone, `window`, `localStorage`,
  randomness. Read it in an effect or pass it in from the server.
- Suppress a hydration warning only at the one node that genuinely differs.

## Interface copy

- Active voice, second person: "Install the CLI", not "The CLI will be
  installed".
- **Specific labels.** "Save API key", not "Continue". A button says what it does.
- **An error says what to do next**, not only what went wrong.
- Numerals for counts: 8 deployments, not eight.
- One action keeps one name for its whole flow. The button that says Publish
  produces a message that says Published.
