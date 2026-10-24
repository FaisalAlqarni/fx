// Every threshold of the hooks in one place, so a recalibration edits this
// file and nothing else.

export const REPEAT_FAILURES = 3;
export const PASSIVE_READS = 12;
export const UNVERIFIED_EDITS = 10;
export const JOURNAL_MAX_AGE_MS = 604800000;
// Design decision 3: one journal line, and a command inside it.
export const JOURNAL_LINE_BYTES = 2048;
export const JOURNAL_COMMAND_CHARS = 500;
// A journal past this is cut to its newest half; readers read no more than this tail.
export const JOURNAL_MAX_BYTES = 262144;
export const LOG_ROTATE_BYTES = 5242880;
