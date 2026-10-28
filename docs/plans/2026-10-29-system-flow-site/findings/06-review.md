### Spec Compliance

- ✅ Spec compliant. Every listed file has its hunk (site template, sf-page, sf-build, page-template restore, visual-kit gate, site-template gate, check-all line, page test, fixture-site, page-check). Rulings C3 (lead, bullet text compared with tags stripped, system-flow-page.test.ts "Chapter head" block), C10 (`lang="en" dir="ltr"` and `data-group` on each `section.chapter`) and C15 (`../_assets/` loads and the verbatim `fx-tokens-1.css` line, site-template.test.ts:50-58) are met.
- ✅ `references/visual/page-template.html` sha256 is `062f21b4...e8924d` for both `git show main:` and the working file (checked by running both).
- ⚠️ Cannot verify from the diff: the `::details-content` desktop path. I checked it myself, see Checks run. It works; `page-check.js` itself still cannot run on it (Minor 5).
- Judgement on the three reported items:
  - `::details-content` untested: acceptable for the commit, and now covered by my probe on Chrome 145.
  - `reference lib="dom"` dropped: correct. `tests/gates/ts-toolchain.test.sh:156-163` fails a Node source that type-checks a DOM global, so the brief line would have broken the gate. The module-local `declare const` shims (page-check.ts:1085-1106) keep DOM types out of the shared program. The brief line must be fixed before task 11 copies it.
  - `system-flow-diagrams.test.ts:310`: real but harmless today, see Minor 1.
- Browser checks in `page-check.ts`, each read against the brief:
  - `menuSticky` (1160): scrolls to bottom at 1440x900; top within 1 px of 0, width 230-250, `#menu` visible. Matches.
  - `scrollSpy` (1163-1186): three chapters, 500 ms wait, `aria-current="location"`, `scrollY` equal to the set value; then 1440x400 with `menuFull > menuH`, `menuTop` changes between ch-01 and ch-05-s1, link inside `#menu`, `scrollY` unchanged. Matches. It puts the chapter top at 30% of the window rather than centring it; the 40%-45% band lies inside the chapter, so the assertion is valid.
  - `phoneBar` (1207-1221): closed at load, summary top 0 after scrolling, theme within 8 px of the summary, summary click opens, link click closes and focus is on the summary. Matches.
  - `resize` (1230-1238): 390 closed, 1440 open with the link visible within 500 ms (10 x 50 ms), back to 390 closed. Matches.
  - `noScript` (1245-1259): 1440 link visible or summary then click; 390 link hidden then summary click shows it. Matches; "closed" is tested as link not visible because `.open` cannot be read with JavaScript off. Equivalent.
  - `pageWidth`, `console` (errors gathered at 1440, 390 and the resize context), `themeToggle`, `evidenceAll`: match.

### Strengths

- The DOM contract is followed to the letter: `#side` holds name, sub line, `button#theme` as a sibling of `#menu-bar`, then `<details id="menu-bar">` with no `open` and only `#menu` after the summary (site-template.html:646-656). The page test pins the whole sequence in one regex (system-flow-page.test.ts "menu column").
- Colours are tokens only, logical properties throughout, and the gate checks both on the CSS rule bodies rather than the whole file.
- The narrow-bar panel (`inset-block-start:100%`, `max-block-size:calc(100vh - 100%)`) is simple and works with `#side` as the positioned ancestor.
- Focus return uses `setTimeout(0)` with a comment saying why; the failure that drove it is in the report.
- Real RED runs for the two gates and the page test, with valid causes (missing template, kit not main, no `section.group`); page-check's two first-run failures drove real fixes.
- Repository strings still go through `t`/`escapeHtml`; `meta.name` is escaped once and reused for menu and legend; slot replacements use functions, so `$&` in repo text is safe.
- `group()` (sf-page.ts) and `evGroup` rename avoid a shadowing bug; no duplicate of an existing helper found.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. src/scripts/system-flow-diagrams.test.ts:310 · reads the theme key from `references/visual/page-template.html`, but index.html is now built from the site template; the test comment says "the key the page template writes". Today both say `fx-theme`, and site-template.test.ts:40 pins the literal, so nothing escapes. Point it at `references/system-flow/site-template.html` (one line) in this task or the next that touches it.
2. src/lib/sf-page.ts header (about 1465-1468) with site-template.html:661 · the page reads intro, then roots/date/count, then the fixed how-to-read paragraph. The design excerpt orders it intro, how to read, roots, date, count. Move the roots line after the template paragraph, or split HEADER, so the order matches.
3. site-template.html:649 · `button#theme` has `aria-label="Change theme"` while its visible text is `Theme: dark` or `Theme: light` (paint(), line 683). The accessible name does not contain the visible label (WCAG 2.5.3 label in name). Drop the `aria-label`, or make it start with the visible text.
4. site-template.html:646-655 with sf-page.ts menu · the menu's group `h2`s ("Start here", "How it works", "Reference") come before the page `h1` in the DOM, so a screen reader's heading list opens with three h2 and no h1. Render the group titles as `p.group-title` with `aria-labelledby` on the `section`, or accept it.
5. src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts:1150 · `chromium.launch()` takes no executable path, so on a machine whose bundled Chromium is 130 the `@supports selector(::details-content)` path (the default path for every current browser) can never run through `page-check`. `/usr/bin/google-chrome` 145 exists here. Read an optional `PAGE_CHECK_CHROME` env into `launch({ executablePath })`, and update the brief/plan text for task 11 about the dropped `reference lib="dom"` line.

### Assessment

**Task quality:** Approved
**Reasoning:** The shell, DOM contract, gates and all seven named browser checks match the brief, the kit template is byte-identical to main, and the supported `::details-content` path works in a real current Chrome. Only polish items remain.

### Checks run

- sha256 of `git show main:references/visual/page-template.html` and of the working file: equal.
- Ran `fixture-site.js` (goodSet, build --prefer cheap) and a scratch probe (in /tmp/claude-1000/sf2-build/review06/probe.js, outside the worktree) with Playwright from `<PW>` driving `/usr/bin/google-chrome` 145.0.7632.75 on that site:
  - 1440x900 JS on: `CSS.supports('selector(::details-content)')` true; summary hidden; link visible; `#side` x 130, width 240, height 900; `#menu` overflow auto.
  - 1440x900 JS off: summary hidden, `ch-01-start-what` link visible with no click (the CSS-only path works).
  - 1440x400 JS on: `#menu` client 245 of scroll 426, so it scrolls inside `#side` (the percent height resolves through `::details-content`).
  - 390x844 JS off and on: link hidden, summary visible (closed).
  - Not run on Chrome 145: the full `page-check.js` (cannot choose the executable), so the scroll spy, resize and focus checks were not repeated there. Their code does not depend on the details path.
- Read `tests/gates/ts-toolchain.test.sh:156-163` to confirm the reported reason for dropping the DOM reference line.
- Did not re-run the suites; did not run commands from docs (the diff adds none).

## Ledger lines

Task 06: minor (deferred): system-flow-diagrams.test.ts:310 reads the theme key from the kit page template; point it at the site template.
Task 06: minor (deferred): header order is intro, roots/date/count, then how-to-read; the design puts how-to-read before roots.
Task 06: minor (deferred): button#theme aria-label "Change theme" does not contain its visible text "Theme: dark/light".
Task 06: minor (deferred): menu group h2s precede the page h1 in DOM order, so the heading list has no h1 first.
Task 06: minor (deferred): page-check.ts launches bundled Chromium only; add an optional executable path so the ::details-content path can run, and fix the brief's dom-reference line for task 11.
