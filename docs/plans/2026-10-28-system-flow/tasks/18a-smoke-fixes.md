# 18a: Smoke-run fixes for archify rendering

**Status:** ready-for-agent
**Blocked by:** 18
**Phase:** Hardening

**What to build:** the five fixes the controller's ruling after task 18 lists, so archify renders deep diagrams on a real repository: serial finalize calls, no root id as a repository URL, labels kept inside archify's measured limits, cp -rL in the proof prep, and the flow step actor rule in the fragment guide.

**Design:** Renderers; Error handling

## Acceptance criteria
- [ ] finalize calls never overlap, asserted by a test.
- [ ] a root with no remote produces a spec archify 3.2.0's schema accepts, asserted against the fixture schemas.
- [ ] long component sublabels and participant labels are fitted before the spec is written, and the change is named in diagrams[].reason.
- [ ] tasks 20 and 21 copy archify with cp -rL; fragment-guide.md states the actor rule.
- [ ] scripts/check-all stays green.
