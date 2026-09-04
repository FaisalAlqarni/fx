# Coverage — humanizer

**Verbatim copy. No adaptation.**

Source: `humanizer@humanizer` v2.11.2 — `SKILL.md`, 456 lines.
Upstream repo: `github.com/blader/humanizer`
Copied: 2026-09-01. Verified by `diff` against the installed 2.11.2: **one
line** differs — the `name:` change below. `LICENSE` is byte-identical.

## Why verbatim, when every other lane was rewritten

The other lanes needed adaptation because they carry **project-specific
coupling**: test commands, file paths, the `docs/plans/<slug>/` layout, the
worktree and commit rules, the offline rule, stack profiles. Their upstream
text was wrong for this setup in concrete ways — ECC's TDD called
`npm run test:coverage` on a Rails repo, superpowers' worktree setup ran
`pip install`, the RED rule rejected valid compile-time RED on C#.

`humanizer` has **none of that**. It is 35 prose patterns derived from
Wikipedia's "Signs of AI writing", plus a false-positives list and a rewrite
process. Nothing in it references a stack, a path, a runner, or a workflow.
Rewriting it would have produced drift with no benefit.

**Coverage is therefore 355/355 by construction** — no claim table needed.

## The one local modification

**`name: humanizer` → `name: fx-humanize`.** One line. Everything else is
byte-identical to upstream 2.11.2.

Naming consistency across the plugin won over a perfectly clean copy.

Its `description` still opens with what the skill *does* rather than a pure
trigger list, which `fx-authoring` forbids. Left as upstream wrote it, to keep
the modification at one line. If it proves hard to trigger in practice, that is
the first thing to change — and it costs a second modified line.

## What was NOT copied

Upstream directory also contains:

| File | Verdict |
|---|---|
| `LICENSE` | **Copy** — MIT. Required; the skill declares `license: MIT` in its frontmatter |
| `README.md` | Skip — repo-level docs, not skill content, unreferenced by `SKILL.md` |
| `AGENTS.md` | Skip — contribution conventions for the humanizer repo. Its Plain Language section is the one portable part, and it is carried in `PREAMBLE.md` rather than here, because it governs every output rather than this skill |
| `agents/openai.yaml` | Skip — an OpenAI packaging manifest, unreferenced |
| `scripts/validate-package.py` | Skip — the upstream repo's own packaging check |

`SKILL.md`'s only outbound links are two external Wikipedia URLs and one
internal anchor. It points at no local file, so there are no sidecars to carry.

## Relationship to the always-on preamble

The preamble carries a ~120-token version of this: no inflated claims, no
"it's not X, it's Y", no stock AI vocabulary, no vague attribution, no sales
register. That applies to **every** output — chat, commit messages, ADRs,
`CONTEXT.md` edits.

This skill is the **full pass**, invoked when a specific document needs
rewriting. The split is by frequency, not by importance: the thin rule prevents
drift continuously; the skill repairs a document on demand.

## Not tracked upstream

fx is a fork. If `humanizer` ships something worth having, that is a deliberate
read, not a scheduled reconciliation.
