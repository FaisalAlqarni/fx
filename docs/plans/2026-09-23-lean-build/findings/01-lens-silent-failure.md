# Task 01, silent-failure lens (task mode), 2026-09-23

Line numbers corrected by the controller against scripts/build-cost at 4bd8448 (the lens cited diff positions).

1. Critical per lens. scripts/build-cost:55 `if (key == null) continue;` in dedupCalls: an assistant record with no requestId, message.id or uuid is dropped with no count or warning; totals under-report and the run still exits 0.
2. Critical per lens. scripts/build-cost:203-206: readdirSync failure on the subagents directory is caught into an empty list, so an unreadable directory (EACCES) reads the same as no subagents.
3. Important. scripts/build-cost:58: a call's usage is taken from its first record only; if that record lacks usage and a later record with the same key carries it, the call counts as zero.
4. Important. scripts/build-cost:29: JSON.parse per line has no guard; one truncated line crashes with a stack trace instead of the documented exit 2 with a reason.
5. Important. scripts/build-cost:214: a subagent file that reads as empty or unreadable is skipped with no count of skipped files.

Controller verification: lines 29, 55, 58, 203-206 and 214 opened and match the descriptions (quoted in the ledger entry for task 01).
