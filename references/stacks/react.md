# React

Ecosystem knowledge. True in any React repo: nothing here describes a
particular project.

**This file never names a command, a port, a directory layout or a package
choice.** Those belong to `.fx.json` and `repo.md`. If something here is only
true of one codebase, it is in the wrong file.

Written against **React 18:19**. Rules that need a framework rather than the
library are marked **[Next]** and apply nowhere else. React embedded in a Rails
or ASP.NET app, mounted per page or per island, uses everything unmarked and
none of the marked.

Sourced from Vercel Engineering's `react-best-practices`, reordered by what
actually costs time.

---

## Contents

- [Waterfalls](#waterfalls) · the largest wins, almost always
- [Bundle size](#bundle-size)
- [Client data fetching](#client-data-fetching)
- [Re-renders](#re-renders)
- [Rendering and the DOM](#rendering-and-the-dom)
- [JavaScript in hot paths](#javascript-in-hot-paths)
- [Server rendering](#server-rendering) **[Next]**
- [Embedded React](#embedded-react) · React inside a server-rendered app

---

## Waterfalls

**The first thing to look for, and usually the largest win.** A waterfall is
two round trips that could have been one, and it costs a network latency each
time rather than a few milliseconds of CPU.

- **`await` late, start early.** Kick a promise off where you know you need it
  and await it where you use the value. An `await` on the line after the call
  serialises two requests that had no dependency on each other.
- **`Promise.all` for anything independent.** If B does not read A's result,
  they are concurrent.
- **Move `await` into the branch that needs it.** Awaiting above a conditional
  pays for data half the renders throw away.
- **Suspense boundaries stream.** A boundary around the slow part lets the rest
  paint, which changes what the user waits for even when total time is equal.

## Bundle size

- **Never import through a barrel file.** `import { x } from '../components'`
  pulls the whole index and everything it re-exports. Import from the module.
  This is the single most common cause of a bundle nobody can explain.
- **Defer non-critical third-party code.** A date library, an analytics client
  or an editor loaded at import time is paid for by every visitor, including
  the ones who never reach the feature.
- **Preload on intent**, not on load: hover, focus, or a route becoming
  reachable.
- **[Next]** `next/dynamic` for anything heavy and below the fold.

## Client data fetching

- **A caching fetch layer deduplicates** identical requests fired by sibling
  components in the same tick. SWR and TanStack Query both do this; hand-rolled
  `useEffect` fetching does not, and that is usually why one endpoint is hit
  four times on mount.
- **Lazy state initialisation.** `useState(expensive())` runs on every render.
  `useState(() => expensive())` runs once.
- **Read state where you use it.** Subscribing high and passing down re-renders
  everything in between.
- **`startTransition` for updates a person is not waiting on**: filtering a
  long list while they keep typing.

## Re-renders

Measure before optimising this section. Re-render work is usually milliseconds,
and a waterfall is usually hundreds. **Memoising a component that renders in
2ms is a common way to add complexity and gain nothing.**

When it is genuinely the problem: derive state rather than syncing it in an
effect, subscribe to the narrowest slice that changes, and split a component
whose halves change at different rates.

## Rendering and the DOM

- **Explicit conditionals.** `cond ? <X/> : null`, not `cond && <X/>`. With a
  number, `0 && <X/>` renders a literal `0`, which is the bug that reaches
  production because `0` is falsy in the test data and truthy in real data.
- **Animate a wrapper, not the SVG element.** Transforms on SVG children skip
  compositing in several engines.
- **`content-visibility: auto`** on long lists tells the browser not to lay out
  what is off screen. It is one CSS line and it beats most virtualisation
  libraries for the common case.
- **Hydration mismatches come from reading the environment during render**:
  `Date`, `window`, `localStorage`, anything random. Read them in an effect, or
  pass the value in from the server.

## JavaScript in hot paths

Only inside a loop or a render that runs often. Outside one, clarity wins.

- Batch DOM changes by toggling a class, not by setting properties one at a
  time.
- Build a `Map` once for repeated lookups instead of `find` inside a loop, which
  is where an accidental quadratic usually lives.
- `toSorted`, `toReversed` and `with` return copies. `sort` and `reverse` mutate
  in place, and mutating props or state is a bug that presents as a missing
  re-render.
- Compare lengths before comparing arrays element by element.

## Server rendering

**[Next]** Everything here needs a framework with a server component boundary.

- `React.cache()` deduplicates within one request.
- An LRU cache spans requests, with the usual caveat that it is per instance.
- **Minimise what crosses the RSC boundary.** Everything passed to a client
  component is serialised into the payload, so passing a whole record to use one
  field ships the whole record.
- Compose data fetching into the tree rather than lifting it to the page, so
  independent subtrees fetch concurrently.

## Embedded React

React mounted inside a server-rendered application, which is where it usually
lives in a Rails or ASP.NET codebase.

- **The server already rendered the page.** React owns an island. Fetching in
  the island what the server could have serialised into the mount point is a
  waterfall the framework never had.
- **Pass initial state through the mount element**, as a data attribute or a
  JSON script tag, and hydrate from it. The first render then needs no request.
- **Nothing in the [Next] section applies.** No RSC boundary, no
  `next/dynamic`, no server components. Code-splitting is whatever the host
  bundler provides.
- **The host's CSRF token, locale and auth context are already on the page.**
  Read them rather than re-fetching, and never mount a second client for
  something the server session already answered.
- **Turbo and similar tools replace DOM you may own.** Mount on a lifecycle
  event and unmount on its counterpart, or a navigation leaks every island it
  ever created.
