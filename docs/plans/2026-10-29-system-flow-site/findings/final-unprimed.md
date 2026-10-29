# Final review: unprimed devil's advocate (code mode, 95ff86e..edc4970)

9 findings, recorded by the controller.

1. Important. src/lib/sf-migrate.ts:62, sf-model.ts loadFragments: an area fragment without schemaVersion under a v2 meta.json is skipped by migrate and fails check with bare schema errors and no hint. Fix: run the idempotent upgrade() on every fragment, write only changed ones, hint any fragment whose node or participant lacks look.
2. Important. src/lib/sf-rules.ts:130, :137-141, :145: the ADR decision check (b5b542d) can fail existing rules; the heading regex catches MADR "Decision Outcome" and deeper subsections; migrate's owed list (sf-migrate.ts:69) uses checkProse only; results.md:114 and system-flow-migrate.test.ts:65 claim owed equals check errors, stale since b5b542d. Fix: owed from the full checkModel list; limit decisionNumbers to the heading's own section and skip fences; rerun the migration proof.
3. Important. src/lib/sf-diagrams.ts:404-414 (from :426): authorCanvas returns silently on validate failure or its fixed 60 s timeout; page ships the auto canvas. Fix: return a reason and append it to the diagram reason; pass timeoutS.
4. Minor. references/system-flow/site-template.html:38 with :259: the menu number is a CSS counter, so filtering renumbers chapters. Fix: render numbers in markup and drop the counter.
5. Minor. src/lib/sf-page.ts:205, sf-markdown.ts:220: a rule's decision renders as a bare number. Fix: "decision N".
6. Minor. src/lib/sf-diagrams.ts:119: comment says no viewBox while authorCanvas now writes one. Fix the comment.
7. Minor. sf-markdown.ts:136-137, :571-574 vs sf-page.ts:74-75: page and Markdown disagree on a chapter's sequences and on empty store kinds. Fix: shared helpers; filter empty store kinds.
8. Minor. scripts/check-prose:199, :204: --diff skips quoted paths (non-ASCII, trailing tab). Fix: -c core.quotePath=false, strip a trailing tab, ls-files -z.
9. Minor. src/lib/sf-estimate.ts:13: comment claims within 10% while the 10-29 run (b) was 32% over. Fix: state the measured error, or report a range.
