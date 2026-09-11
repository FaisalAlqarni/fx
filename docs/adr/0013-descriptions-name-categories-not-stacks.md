# Agents and skills name categories, not stacks

`0003-three-layers-of-knowledge.md` keeps fx stack-general by giving ecosystem
knowledge its own home. `0011-describe-the-category-not-its-members.md` says to
describe a category rather than enumerate its members. Neither says whether
agents are bound by them. This record says they are.

**The rule.** The `description` and the body of every agent and every skill name
the category of work they apply to, never the stacks, frameworks, libraries or
file extensions that happen to belong to it in one project. A lens fires on
"code that enqueues, publishes, schedules or fans out work", not on a list of
job libraries. A trigger written as one project's tools tells an agent in any
other project that the file is not for it, and a description pays that cost on
every turn, because it is loaded on every turn. `fx-lens-pipeline` is the first
agent written under this rule.

## Deliberate exceptions

**`fx-lens-database`, `fx-lens-security`, `fx-lens-a11y` and
`fx-lens-silent-failure` break this rule and are not being migrated.** Their
descriptions name ActiveRecord, EF Core, Devise, Pundit, ASP.NET, `.erb`,
Stimulus and Sidekiq. Generalising a trigger set is a behaviour change, and it
has to be measured per lens: a rewritten trigger can stop a lens firing on the
diffs it catches today. Bundling four such rewrites into an unrelated change
would make a lens that stopped firing indistinguishable from something else in
that change breaking.

The four rows for these lenses in the trigger table of
`skills/fx-review/SKILL.md`, section 2, restate their triggers and are part of
the same exception.

**What a future author does.** Write a new agent or skill general from its first
draft. Migrate an old one only as a change of its own, with its firing measured
before and after as `0010-behaviour-is-measured-against-the-installed-plugin.md`
describes. A new file modelled on one of the four lenses above copies the
exception, not the rule.

## What does not change

Stack knowledge itself is unaffected: it stays in `references/stacks/`, and this
rule moves nothing out of it. Two loading rules exist, and the files state both.

- `fx-implement` and `fx-tdd` load one profile for each entry in the `stacks`
  list in `.fx.json`, and a name with no file loads nothing. A profile named for
  a framework therefore loads only when the machine facts name it, and an
  Angular repository never sees the Rails file.
- `web.md` loads on the work, not on `stacks`. `fx-design` reads it as the
  checklist under its quality floor, and `fx-review` adds it as a second baseline
  when a diff touches browser-delivered markup, styles or interface strings.
