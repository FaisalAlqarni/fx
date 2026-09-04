# Section 3: stack profiles

Closes the dead-pointer gap: four files pointed at
`references/stacks/<stack>.md` and the directory did not exist.

## Decided

Three layers, each the **sole owner** of its facts. No fact appears twice: duplication is what makes files drift, so there is none to drift.

| Layer | Owns | Lives | Written by |
|---|---|---|---|
| Ecosystem | Rails / .NET / Docker knowledge, true in any repo | `references/stacks/*.md` | ships with fx |
| Repo | *this* project: structure, patterns, techniques, conventions | `repo.md` at project root | `/fx:setup`, **draft reviewed before it lands** |
| Machine | `stacks: []`, test commands, coverage | `.fx.json` | `/fx:setup` |

- `.fx.json` stays a separate file. `repo.md` **never restates a command**: it
  points at `.fx.json`.
- `stacks` is a **list**, composed per repo: `[rails, docker, postgres]`,
  `[dotnet, docker]`, `[flutter]`.
- **A stack profile is optional.** Commands come from `.fx.json`, so an
  unknown stack works on day one (Laravel, Spring, Flutter) it just has no
  traps file. Nothing hard-fails on a missing profile.
- **No template, no `/fx:stack`.** Adding a stack means writing the file.
  Commands stay at 4.
- Ecosystem files defer on choices the repo makes: *"use the test framework
  this repo uses"*, with the detection rule: never *"use RSpec"*.

## To build

- [x] `references/stacks/observability.md`: 233 ln; **project facts stripped out** (see below)
- [x] `references/stacks/rails.md`: 213 ln; exemplar, sets the precedent
- [x] `references/stacks/dotnet.md`: 199 ln; .NET 8, xunit/Moq/EF Core/NetArchTest
- [x] `references/stacks/docker.md`: 143 ln
- [x] ~~`frontend.md`~~: dropped, not one ecosystem
- [x] ~~`data.md`~~: dropped, the standalone `postgres` skill serves it
- [x] `/fx:setup`: 129 ln; `.fx.json` + `repo.md` + review gate
- [x] `.fx.json` schema: defined in `commands/fx-setup.md`, one place
- [x] Dead pointers fixed in `fx-implement`, `fx-tdd` (×3), `fx-debug`, `implementer-prompt.md`
- [ ] **Leakage check has no test.** The three new files were grepped by hand for
      project terms. Nothing stops the next stack file from leaking

## Grounding, verified

| | Fact |
|---|---|
| advantage-backend | Rails **7.2**, RSpec 7, Devise + devise-jwt + Pundit, Sidekiq, Pagy 9, Turbo + Stimulus, `rails_semantic_logger`, 6 engines, 6 Dockerfiles, 40-target Makefile |
| Messaging | .NET **8.0** (`rollForward: latestMinor`), xunit + FluentAssertions + Moq + coverlet, **NetArchTest** for architecture tests, EF Core, `src/{APIs,Core,External,Infrastructure,Web,Workers}` |

## Seed content for advantage-backend's `repo.md`

Extracted from `observability.md`, which was written in Section 1 before the
three-layer rule existed and carried project facts in a portable file. The
ecosystem claims stayed; these did not, and must not be lost:

- Six engines, each mounted at `/` on its own port via `ENV['ENGINE']`; the
  wide event's `service` field is populated from it
- One log schema shared across all six: `user_id`, never `userId`
- `I18n.locale` on every event: Arabic is the default locale, so locale bugs
  are invisible to a developer working in it
- **Trace topology:** async jobs nest INSIDE the initiating request's trace as
  a child span, not as a separate root. Deliberate. Do not change without
  asking.
- OpenTelemetry → Elastic APM / Kibana

## Open

- `data.md` vs the standalone `postgres` skill: **resolved: dropped.** The
  repo declares `stacks: [..., postgres]` and the existing skill serves it
- `frontend.md`: **dropped.** "Frontend" is not one ecosystem; React, Angular
  and Turbo/Stimulus share no traps. Write `react.md` or `turbo.md` when a repo
  needs one
- Section 1's `push` flag, still unanswered

## Review

*(filled in when the section closes)*
