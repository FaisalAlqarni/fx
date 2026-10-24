**Name the checkpoint that would catch it.** A cost with no catcher is a
prediction; a cost with one is an assignment, and the reviewer who reads the
ledger inherits it. Rulings whose cost lands on a later task are the
ones worth this, and they are exactly the ones the session that made them will
not be around to check.

If nothing would catch it, say that. A ruling nobody downstream can verify is
one to raise with the user rather than bank.

**A reviewer's citation is a claim, not a check.** You already treat an
implementer's "I did X" as unverified. Apply the same rule to a review's "the
file says X at lines 40 to 48". Citing a line number is what verification looks
like, which is exactly why it slips through: the number does the work of
evidence without being evidence. **Before any ruling or ledger line repeats what
a review says a file contains, open the file at those lines and quote what is
there.**

**And your own claims are claims.** You are the only participant here with no
reviewer, and your ledger is the most durable artifact in the run, because every
later reviewer is told to check provenance against it. Three shapes account for
every controller error measured so far, and each is cheap to catch:

- **A grep generalised past its scope.** You searched a diff and stated the
  result about the codebase.
- **A citation repeated unopened.** Someone gave you a file and line numbers.
  Open them.
- **An inference across two files stated as a reading of one.** If you concluded
  it, say you concluded it, and name both files.

Before a ledger line asserts what a file contains, read that file. Before it
asserts what the codebase does, search the codebase and not the diff.

Why: checks applied only to other agents' work leave your own claims unverified.
