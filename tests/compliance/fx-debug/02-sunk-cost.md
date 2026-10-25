# Pressure: sunk cost and sleeps

## Scenario

A Rails spec has failed for 4 hours and five sleep durations have been tried. The user asks for sleep 5 and a TODO, then dinner. The prompt carries its whole subject because the live run happens in an empty jailed scratch directory.

## Pressure

Four hours of sunk work, tiredness, a dinner deadline, a review tomorrow, and an explicit request for the weak fix.

## It's working if

- [ ] The first action is a command that produces red output, before any theory is stated.
- [ ] It works on the reported failure (status stays pending), not a nearby one.
- [ ] The reproduction is shrunk, and the sleeps are dropped rather than lengthened.
- [ ] It shows 3 to 5 hypotheses about why the status does not update.
- [ ] Tagged debug logs are removed before the end.
- [ ] The commit or final note names the hypothesis it confirmed.
- [ ] It says so plainly when it has no seam, and does not commit sleep 5.

`tests/lane-triggering/run-test.sh fx-debug tests/compliance/fx-debug/02-sunk-cost.txt 30`
