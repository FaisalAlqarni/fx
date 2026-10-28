# Humanize gate: check prose fx writes for people

**Date:** 2026-10-29
**Status:** ready-for-agent
**Approved:** 2026-10-29

## Problem Statement

fx tells every writer to avoid AI prose tells, and `scripts/check-prose` enforces a few of them, but only on fx's own Markdown. Prose fx writes in a target repository (code comments, docs, ADRs, the completion report) goes through `fx-humanize` only when a lane remembers to invoke it. The owner wants every changed file checked by default, without running the full lane on every task.

## Decision

Three layers, cheapest first.

1. **Mechanical gate.** `scripts/check-prose` grows; no second script. It already owns the dash and stock-word rules, the fence handling, the `prose-gate: quoting` marker and the exemption list, and a second script would split one rule set across two files that drift. New:
   - `--diff <ref>`: check only the lines added since `<ref>` (`git diff -U0 <ref>` in the current directory, plus untracked files in full). `--diff HEAD` is a task's uncommitted work; `--diff <merge-base>` is the branch.
   - Code files: only comment text is read. `#` (Ruby, Python, shell, YAML, Dockerfile), `//` and `/* */` (JS, TS, C#, CSS), `<!-- -->` (HTML, ERB, Razor), Python docstrings. A comment marker must start the line or follow whitespace, so `https://` and `"#fff"` are not comments.
   - Patterns a regex catches with few false positives, picked from `fx-humanize`: em and en dashes; stock AI words (the existing list plus tapestry, meticulous, intricate, interplay, garner, bolstered, vibrant, showcase); "not X, but Y" and "it's not X, it's Y"; filler openers ("let's dive in", "here's the thing", "it's worth noting"); inflated phrases ("stands as a testament", "plays a crucial role", "setting the stage for"); chatbot artifacts ("I hope this helps", "great question", "let me know if").
   - Output: `file:line: pattern: excerpt`, exit 1 on any hit.
2. **One humanize pass per branch.** In `fx-implement`'s final review, after the fix wave, one Sonnet subagent invokes `fx-humanize` on the prose the branch added and commits once as `docs: humanize pass`. The scoped re-review covers that commit.
3. **The full lane where prose is the product.** `fx-docs` and `fx-adr` invoke `fx-humanize` on what they write before committing. `fx-brainstorm` already does this for design docs.

## Wiring

- Implementer prompt, test step: run `check-prose --diff HEAD` before committing.
- Exit gate: run `check-prose --diff <merge-base>` beside `test_all`.
- `scripts/check-all` already runs `check-prose` over fx's own files, so it picks up the new patterns there with no new line.

## Testing

A gate test drives `check-prose` on fixture files in a temporary directory: each pattern in Markdown and in each comment syntax is flagged, code outside comments and fenced code blocks is ignored, a clean file exits 0, and `--diff` reports only added lines. A second assertion set reads the skill text: final review names the single humanize pass, and `fx-docs` and `fx-adr` name `fx-humanize`.
