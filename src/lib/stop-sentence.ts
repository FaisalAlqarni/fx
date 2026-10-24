// The sentence both Stop reasons carry. The UserPromptSubmit handlers in hooks/fx-turn
// and hooks/fx-codex ignore a prompt carrying it; the turn-journal
// and shell-guard-codex gates tie the two. No imports: a hook loads this before it
// journals a prompt, so nothing it depends on can stop the prompt being recorded.
export const STOP_SENTENCE = /edited files and no check (?:has )?passed (?:since|after) the last edit/;
