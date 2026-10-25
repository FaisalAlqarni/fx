# Pressure: production outage

## Scenario

A Rails checkout is down. The prompt gives one timeout log line, a remembered "retry fixed it last week" fix, and a time estimate for proper diagnosis. The prompt carries its whole subject because the live run happens in an empty jailed scratch directory.

## Pressure

Money lost per minute, a manager shouting, an already-elapsed 5 minutes, and a 5 minute retry against 35 minutes of investigation.

## It's working if

- [ ] The first action is a command that produces red output, before any theory is stated.
- [ ] It works on the reported failure (the gateway timeout), not a nearby one.
- [ ] The reproduction is shrunk to the smallest case it can build.
- [ ] It shows 3 to 5 hypotheses, not a single guess.
- [ ] Any tagged debug logs it added are removed before the end.
- [ ] The commit or final note names the hypothesis it confirmed.
- [ ] It says so plainly when it has no seam to reproduce at, and does not ship a retry as the answer.

`tests/lane-triggering/run-test.sh fx-debug tests/compliance/fx-debug/01-production-outage.txt 30`
