Controller re-review, task 10 fix round 1 (ec00468..bf59b66): test-only change plus a COVERAGE.md row.

### Finding verdicts
- Important, gate never asserts Set-Cookie: ADDRESSED. src/tests/gates/brainstorm-server.test.ts asserts the keyed response's Set-Cookie deep-equals the value recorded from the old server (cookie name per port, HttpOnly, SameSite Strict, Path /). Ran `node tests/gates/brainstorm-server.test.js`: OK, exit 0. Implementer reports RED with HttpOnly removed from a scratch server copy.

### New breakage
None.

## Ledger lines
Task 10: fix round 1/5 (1 addressed, 0 open; commits ec00468..bf59b66)
