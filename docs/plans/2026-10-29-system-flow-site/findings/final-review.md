# Final review: broad reviewer (branch mode, 95ff86e..edc4970)

Verdict: ready to merge with fixes F1, F2 part 1, F3, F6, then the humanize pass and the design amendments. check-all passed on a copy of edc4970.

F1 Important, must fix: c92a856 masked backtick spans in check-prose, which scripts/check-prose:209-219 says was tried and rejected; revert and use the prose-gate marker. (Done by the controller: 28f0338 and 5cb834f.)
F2 Important (known): archify labels cut to "..." on 28 of 53 architecture pages; sf-diagrams.ts:112 fit(label, floor((n.w+8)/6.6)), :116 size from the inline layout. Part 1 must fix: a cut label pushes "label: role" to the Parts card. Part 2: size the box from the label and spread x; fit() only past the cap; test with a 32-unit label.
F3 Important (known), must fix: estimate 32% low on run (b) 10-29; sf-estimate.ts:8-15 and its test. Refit on the two 10-29 runs: controller = a*areas + b*areas^2 (a about 2.57M, b about 0.064M) plus a per-ADR rules term (about 29k per ADR); move the test's run (b) to 75,867,997 tokens and 87.7 min; correct the comment.
F4 Minor (known): root map unreadable at 1440 and loses left nodes at 390; template: stack the panel under the canvas at every width, height 640 px; 390 needs minZoom about 0.6 and a top-left start, which is a kit byte change (fx-map-3.js with its visual-assets row).
F5 Minor, accepted: archify pages tiny at 390; optional link text "Open full diagram (best on a wide screen)".
F6 Important, must fix: design.md:88 code map evidence rule (a folder entry and a file entry, first file is "start reading here") is not enforced; blank "Start reading at" cells. Rule in checkProse with tests.
F7 Minor: a v1 model makes stale, query and verify fail before the migrate instruction; lane runs check first and offers only "Bring the prose up to date"; fx-docs moves its stop sentence to step 2.
F8 Minor: fx-docs SKILL.md:48 humanize line reads as applying to generated Markdown; say humanize the fragment prose, never generated files.
F9 Minor: box node second line can overflow (sf-layout.ts:56 subOf); fit after width is known, keep full text in title.
F10 Minor: aria-label "Change theme" hides visible text (same as a11y 9).
F11 Minor: fragment-guide.md:132 lists queue under store, sf-migrate.ts:15 maps queue to service; make them agree.
F12 Minor: sf-evidence.ts:164 message omits code map entries; take with F6.
Seven unstated rules go into design.md (not the ADR): autoplay end and stop rules; 1.6 s interval; page written after deep diagrams and --only reads deep pages from disk (fix Data flow step 6); migrate only on a clean tree with git restore undo; a chapter in the 120 to 200 warning goes back once; lang, dir, data-group and filter count text in The site template, floorWords vs readingWords in Proof; autoplay measured with the box centred.
Also owed: the per-branch humanize pass (final-review.md from main), ledgered as "Final review: humanize pass <sha7>".
