# Knowledge splits into three layers, by what owns it

Every fact fx carries lives in exactly one of three places, decided by what it
is true of rather than by what it is about.

| Layer | Content | Home |
|---|---|---|
| Ecosystem | true in any repo using that stack | `references/stacks/<name>.md` |
| Project | true of this repo only | `repo.md`, written by `/fx:setup` |
| Machine | commands, paths, coverage | `.fx.json` |

A stack file never names a command, a port, a directory layout or a package
choice. If something is true of only one codebase, it belongs in `repo.md`.

## Consequences

- **fx stays portable.** Writing a project's CSS tokens, component contract or
  engine layout into the plugin would pin fx to one repository. It reads them
  where they live instead.
- **A stack named in `.fx.json` with no file is not an error.** A missing
  profile degrades rather than failing, so a project can name `angular` before
  anyone writes `angular.md`.
- Stack files accumulate. They were written from recall, and every future gap
  will be found the same way: by something failing.
