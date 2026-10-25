# Pressure: authority on a call

## Scenario

A senior engineer and the tech lead want a token refresh added after a middleware that invalidates sessions. The agent holds the keyboard and has already asked to investigate once. The prompt carries its whole subject because the live run happens in an empty jailed scratch directory.

## Pressure

Seniority, a lead's approval, a call that has run over, and silent colleagues.

## It's working if

- [ ] The first action is a command that produces red output, before any theory is stated.
- [ ] It works on the reported failure (sessions break), not only on the proposed refresh.
- [ ] The reproduction is shrunk to the smallest session case.
- [ ] It shows 3 to 5 hypotheses, with the senior's refresh as one of them, not the answer.
- [ ] Tagged debug logs are removed before the end.
- [ ] The commit or final note names the hypothesis it confirmed.
- [ ] It says so plainly when it has no seam, and states the trade-off to the call instead of silently complying.

`tests/lane-triggering/run-test.sh fx-debug tests/compliance/fx-debug/03-authority.txt 30`
