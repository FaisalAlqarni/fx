# Report assets: vendored Tailwind and Mermaid

An architecture report opens with no internet connection. Tailwind's version 3
Play CDN script and Mermaid 11's single file browser build ship inside the
plugin, pinned, under `../references/vendor/`. That path, like every path in
this file that starts `../references/`, resolves from this file's own
directory. A report copies them into the project once, then loads them by a
relative path.

Consulted by `fx-architecture` (the HTML report) and any other lane that
writes a self contained HTML page into `docs/plans/<slug>/`. **It is a
reference to consult, not a session to run.**

## Vendored files

| File | Library | Version | Source URL | SHA-256 | Licence file |
|---|---|---|---|---|---|
| `tailwindcss-play-3.4.17.js` | Tailwind CSS (Play CDN build) | 3.4.17 | `https://cdn.tailwindcss.com/3.4.17` | `176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15` | `LICENSE-tailwindcss` |
| `mermaid-11.17.2.min.js` | Mermaid (browser build) | 11.17.2 | `https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js` | `581ed7d74bd9048d0e3a91363927d72ef22942d7722546b27f7cc29e35390eb8` | `LICENSE-mermaid` |

Both licences are MIT, carried verbatim in `../references/vendor/`.

## Copy rule

Before writing the report file, copy each vendored file into the project:

1. Create `docs/plans/_assets/` at the repository root if it does not exist.
2. For each file in the table above, copy it from `../references/vendor/` into
   `docs/plans/_assets/` **only when no file of that name is already there.**
   An existing file of that name is never overwritten by this rule; see the
   mismatch rule below.

## Missing-file rule

A vendored file named in the table but absent from `../references/vendor/`
stops the writer before the report is written. Name the missing file and stop;
do not write a report with a broken script tag.

## Mismatch rule

A file of that name already sitting in `docs/plans/_assets/` whose SHA-256
does not match the table's value is left untouched. The report step says so,
naming the file and both checksums, rather than silently overwriting a copy
that might be a deliberate local variant.

## Script tags

A report's `<head>` carries exactly these three tags, in this order:

```html
<script src="../_assets/tailwindcss-play-3.4.17.js"></script>
<script src="../_assets/mermaid-11.17.2.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });</script>
```

## The relative path

`../_assets/` resolves to `docs/plans/_assets/` only when the report file
sits directly inside a directory under `docs/plans/`. Both places a report
lives satisfy this:

```
docs/plans/<slug>/report-<timestamp>.html
docs/plans/YYYY-MM-DD-architecture-review/report-<timestamp>.html
```

The path is worked out from the report's final place. A report drafted
somewhere else, under `.fx/` for example, and moved into one of these places
afterwards carries the three tags exactly as given above, and is opened or
checked only after the move, once `../_assets/` reaches `docs/plans/_assets/`.

A report that will live anywhere else needs its own relative path worked out
from first principles; this reference does not cover that case.
