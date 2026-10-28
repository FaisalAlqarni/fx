# 18c: Second smoke-run fixes for archify delivery

**Status:** ready-for-agent
**Blocked by:** 18 rerun
**Phase:** Hardening

**What to build:** the three fixes in the controller's ruling after the first smoke rerun: outsideRefs flags loads only; sequence and flow pages meet archify's viewport-height delivery rule; a failed page leaves no stray pages and no overwritten receipts.

**Design:** Renderers; Error handling

## Acceptance criteria
- [ ] an archify page with an anchor href to an outside site stays on archify; a page with an outside src, stylesheet href, srcset, CSS url or @import, or a ../ escape falls back; asserted.
- [ ] a 2-message last page and a 3-step store flow produce specs that pass archify's viewport-height rule, asserted against the rule's numbers as archify's source states them.
- [ ] after a fallback, no page file of that diagram from an earlier attempt remains, and each attempt's receipt keeps its own name; asserted.
- [ ] scripts/check-all stays green.
