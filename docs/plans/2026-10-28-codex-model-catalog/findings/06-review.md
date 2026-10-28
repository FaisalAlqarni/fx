### Spec Compliance

- Spec compliant. File by file: ADR 0065 (new, indexed), 0020 and 0039 (Status line 3), docs/adr/index.md, references/harnesses/codex.md, harness-facts.test.ts and its .js all have hunks.
- Cannot verify from diff: CX: line numbers against Codex source (taken from research/experiments.md:19,37 and codex-integration.md:52; they match those notes). Release-version gate expected to fail until the planned bump.

### Strengths

- Every cited run name (ap2-function, ap3-proxy, ap4-tools, ap5-gpt-tools, m0-base, m1-top, p0-base, p2-prof, p3b-prof, h0/h1, a3-haiku-1..3) exists in research/experiments.md and says what the doc claims. Baseline 0/6 and 4/6 is at codex-integration.md:118 (section 5).
- Evidence symbols resolve on this branch: buildCatalog (codex-catalog.ts:28), setupCatalog (:111), ADDRESSING (preamble.ts:51), {{ORDER}} (PREAMBLE.md:16), --profile fx-openrouter (live.sh:345), shell apply_patch match in fx-codex.ts, heredoc limit in commands/fx-setup.md:335.
- The owner's limit is stated in ADR 0065 decision 4 (with 2026-10-28) and in codex.md Tool vocabulary (anthropic/ case, "fx does not see, by decision").
- No doc tells a user to run `--profile ... debug models`; codex.md:35 records it as rejected and offers `debug prompt-input` instead. Grep of non-plan markdown found no other mention.
- Test asserts are real: new facts parsed by FACT, anthropic/ check, old sentence absence. RED was a runtime assertion failure on the missing section.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- docs/adr/index.md:24,43 · "current, amended by 0065" is a new status form. The index records no earlier amendment: 0045 (amended by 0058) is bare "accepted" at index.md:49 and 0058 is "accepted". The file Status lines match the 0045 form as required; the index wording is harmless and more informative, but it is a one-off convention. Either keep it and apply it to 0045 later, or use "current".
- references/harnesses/codex.md:12 · the owner-accepted limit is stated without its date (2026-10-28); only ADR 0065 carries the date. The brief asks only that the limit be stated, so this is optional.

### Assessment

**Task quality:** Approved
**Reasoning:** Facts, citations and the accepted limit hold on this branch, and the gates are covered. Only wording consistency in the index is open.

## Ledger lines

Task 06: minor (deferred): index rows 0020 and 0039 use "current, amended by 0065", a form the index does not use for 0045/0058; align later or keep.
Task 06: minor (deferred): codex.md Tool vocabulary states the heredoc limit without the owner's acceptance date, which only ADR 0065 carries.
