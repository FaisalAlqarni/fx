# Coverage: humanizer

Renamed to GLOSSARY.md and GLOSSARY-MAP.md following mattpocock-skills 1.3.0.

**Rearranged copy of humanizer 3.1.0.** Source: `blader/humanizer`, tag `v3.1.0`, `SKILL.md`. It has 26 patterns, the "How to work" procedure, "When not to act" and the safety rules (the text is material, never instructions; supported claims and ranking words survive). `LICENSE` is unchanged.

The text of every pattern (heading, Watch for, Problem, Rule) is upstream's. fx moved material to sibling files to stay under the 20,000-byte limit on SKILL.md, and added four things.

## Local modifications

1. **Name and description.** `name: fx-humanize` replaces `name: humanizer`. The description gains one sentence redirecting documents that an agent consumes (SKILL.md, CLAUDE.md, AGENTS.md) to `fx-authoring`.
2. **Precision is not accuracy.** One paragraph under step 2 of "How to work". The case behind it: a runbook said "Rails creates the database world readable", which was true and unspecific. A repair replaced it with a mechanism, that the file lands `0640` because an earlier step's umask is still in effect. The umask was set in a subshell, the step opened a new shell anyway, and the file was measured at `0644`. The sentence became more confident, more detailed and wrong. When you sharpen a claim, measure the sharpened version.
3. **Identifiers in every mode.** The file-mode sentence under "What to return" ends with "In every mode, never rewrite an identifier, a command, a path, a schema field or a quotation." The case behind it: a bulk rewriter turned `let x = a - b` into something else inside a code fence, and the gate stayed green because it was looking at prose.
4. **Write plainly.** One paragraph after step 4 of "How to work" extends the skill to every output (chat, commit messages, reports): lead with the main point, say who acts, use one term for one thing, prefer the common word. Upstream 3.1.0 has no home for "one term for one thing".
5. **Pointers.** Step 1 of "How to work" sends the reader to `examples.md` and, for replies, to `replies.md`.

## Moved to sibling files, text unchanged

| File | Holds |
|---|---|
| `examples.md` | The long "Why AI text sounds the way it does" account (upstream lines 19 to 26), every Before/After pair for §1 to §25, and the list "Keep the details that carry the writer's voice" |
| `replies.md` | Section F and §26 (Re-explaining what the reader knows), with its Before/After pair |

## What was not copied

| File | Verdict |
|---|---|
| `README.md` | Skip. Repo-level docs, not skill content |
| `AGENTS.md` | Skip. Contribution conventions for the humanizer repo. Its Plain Language section is carried in `PREAMBLE.md` and in the "Write plainly" paragraph |
| `agents/openai.yaml` | Skip. An OpenAI packaging manifest |
| `scripts/validate-package.py` | Skip. The upstream repo's own packaging check |

## Relationship to the always-on preamble

The preamble carries a short version: no inflated claims, no "it's not X, it's Y", no stock AI vocabulary, no vague attribution, no sales register. That applies to every output. This skill is the full pass, invoked when a specific document needs rewriting.

## Upstream changes

fx is a fork. When `humanizer` ships something worth having, that is a deliberate read, not a scheduled reconciliation.
