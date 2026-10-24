Controller re-review, task 04 fix round 1 (0fbd23c..fb0eacf), 2 production lines plus a new test and 12 expected-output files.

### Fixed
- Important 1, equivalence not provable from the repo: src/lib/preamble-equivalence.test.ts compares the eight renders and four describePlans outputs with committed expected files recorded from the JavaScript baseline; ran `node lib/preamble-equivalence.test.js`: ok, exit 0. Implementer reports RED by altering an expected file.
- Important 2, fixture (d) mode: the test applies mode 000 at run time (line 27), restores it in a finally block (line 38), and skips the case as root (line 24).
- Minors in src/lib/preamble.ts fixed: typed replacement callback parameters, doubled blank line removed.

### New issues
None. The expected files have no regeneration flag; ruled below.
