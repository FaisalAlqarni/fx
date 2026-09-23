# Task 02, security lens (task mode), 2026-09-23

Controller verified: run-test.sh:60-61 and run-reps.sh:41-42 export FX_REAL_HOME; run-test.sh:104 and run-reps.sh:78 run claude with --dangerously-skip-permissions outside tests/conformance/lib/jail.sh (live.sh:79 sources the jail; these scripts do not).

1. Important. run-test.sh and run-reps.sh run the session with no jail, and export FX_REAL_HOME to it. The scratch HOME stops the real config loading, but the session can still read the real home and other repos by absolute path. Not a regression (HOME used to be real), but the new comment claims an isolation the scripts do not give. Fix: run the call through tests/conformance/lib/jail.sh as live.sh does; do not export FX_REAL_HOME (pass the real home to scratch_home_claude as an argument only); make the comment say exactly what is isolated.
2. Minor. Log directories are created with the default umask and kept after exit; stream.json can hold anything the session printed. Fix: umask 077 near the top, as live.sh does.
3. Minor. scratch_home_claude trusts its directory argument; a caller passing a path under the real home would chmod and overwrite the real credential. Fix: refuse (return 2) when the directory resolves to the real home or under it.
4. Minor, unconfirmed. A session may refresh the OAuth token into the scratch copy that cleanup deletes; if refresh tokens rotate, the real credential ends up revoked. The existing conformance jail copies the credential the same way, so this predates the plan. Owner informed; not in this plan's fix loop.
