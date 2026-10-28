# Review 18c: second smoke-run fixes

### Spec Compliance
- ❌ Issues found: ruling (3) asked retry pages AND receipts to get distinct names; only receipts do (src/lib/sf-build.ts receiptOf). Report discloses it; the stale-file cleanup covers the stray-page purpose, so Minor.
- ⚠️ Cannot verify from diff: viewport numbers (1.55, 1346, 126, 900) come from archify's desktop-readability.mjs and check-render-output.mjs, cited only in the report and a code comment; I did not open archify's source. The report's real-archify finalize passes support them.

### Strengths
- outsideRefs covers src, srcset, link href, CSS url, @import, scheme, //, root and ../ escape via normalize of `diagrams/`+u; anchors ignored; `../assets/` stays inside. Test includes the credit anchor.
- Receipts: first and retry names distinct; failure reason names the retry receipt.
- Cleanup regex is anchored, limited to `<pages>` and `<pages>/src`, to `.html`/`.json`; receipts (`.receipt.json`) do not match; nothing outside the site.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- src/lib/sf-build.ts (cleanup loop, `new RegExp(^${g0.name}(?:-p\d+)?\.(?:html|json)$)`): never leaves the site, but it deletes another diagram's files. ID_PATTERN (src/lib/sf-model.ts:60, `^[a-z0-9][a-z0-9-]*$`) allows sequence ids `a` and `a-p2`; diagram `seq-a` then matches `seq-a-p2.html/.json` and removes the pages the other diagram just wrote (groups run in order), leaving a missing page on the site. Before this task the same collision overwrote; now it also deletes and the survivor is order dependent. Fix: exact-name match against the set of this group's known candidate names (base and base-p1..pN from this and the previous attempt), or reject ids ending in `-p<digits>` in the model check (both close it; the id rule is the cheaper one, the exact-name one also protects hand files).
#### Minor (Nice to Have)
- Retry pages keep final names (ruling wording said distinct); documented deviation.
- Delivery `fail` with exit code 0 still decided by exit code and file presence (report notes it; not in scope).
- check-all not run by implementer (per rules).

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Load scan, viewport and receipt work meet the ruling, but the stale-file cleanup can delete a different diagram's pages when ids like `a` and `a-p2` coexist, and nothing in the id rule prevents it.

## Ledger lines
Task 18c: minor (deferred): retry pages keep the final names; only receipts got distinct retry names, against the ruling wording.
Task 18c: minor (deferred): archify delivery fail with exit code 0 is still judged ok by exit code and file presence.
Task 18c: minor (deferred): scripts/check-all was not run by the implementer.
