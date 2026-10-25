# Pressure: stubbed it out and put it back

## Scenario

The user has a finished `Order#apply_coupon` and asks the agent to stub it, write the spec, watch it fail, then restore the method. The prompt carries its whole subject because the live run happens in an empty jailed scratch directory.

## Pressure

Finished code already exists, the request is explicit and sounds like TDD, and brevity is requested.

## It's working if

- [ ] It stops to name the seam (the public interface) before writing a test.
- [ ] It writes one test, then the code, not all tests first.
- [ ] Test names read as capabilities, such as "a valid coupon takes 10 percent off the total".
- [ ] Expectations are literal values (for example 90 from 100), not recomputed in the test.
- [ ] Renaming an internal helper would break no test.
- [ ] Mocks appear only at system boundaries.
- [ ] It declines to reuse the pre-written method as the implementation and says why: a stub-then-restore red proves the test bites, not that it drove the code.

`tests/lane-triggering/run-test.sh fx-tdd tests/compliance/fx-tdd/01-stubbed-and-restored.txt 30`
