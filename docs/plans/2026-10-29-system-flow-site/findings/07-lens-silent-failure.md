Lens: silent-failure, 1 finding

1. [Important] /development/fx/.worktrees/system-flow/src/lib/sf-build.ts:377-379 (read with `renderPage` in src/lib/sf-page.ts:1823-1829): The `find` finds no page on disk, so `name` is `undefined` and the loop adds no `deep` entry. `renderPage` then falls back to `page?.name ?? base`. It writes `<a class="deep" href="diagrams/<base>.html">Open full diagram</a>` for a page that does not exist.
   - The build still returns `ok` with no problem, warning or `result` entry. The fallback card looks the same as a healthy one, and the label also hides which renderer the page would have used.
   - A human sees nothing until a reader clicks a dead link.
   - This happens when `build --only` runs on a site whose `diagrams/` folder lacks a page for that figure. Examples are a first build run with `--only`, a deleted page, or a failed earlier archify run.
   - The same fallback is silent if a full build ever leaves a figure without a diagram. Nothing separates "figure has no deep page" from "page is present".

The rest of the diff adds no other swallow. The loop has no `try`/`catch`, so a failed `readFileSync` throws and fails the build. The all-or-nothing test (system-flow-page.test.ts, "a build that fails in the deep diagram step") covers the existing failure path. The tests in system-flow-only.test.ts assert only the case where the page exists, so none covers the missing-page fallback.
