// The paths a Codex apply_patch payload names. Used by the lane check and the
// tool tracker; never throws.
// The header lines this parses (V4A patch format):
//   *** Update File: <path>
//   *** Add File: <path>
//   *** Delete File: <path>
//   *** Move to: <path>        (rename; follows an Update File line)
// A patch can touch several files; every path found is checked. Anything
// that does not parse (a header this regex does not recognise, a string
// that is not patch text at all) yields no paths, which means no checks
// and an allow: never a throw. The lane check is advice, so failing to
// parse must fail open exactly like a laneCheck throw does.
export function extractPatchPaths(command: unknown): string[] {
  if (typeof command !== 'string') return [];
  const paths: string[] = [];
  for (const line of command.split('\n')) {
    const m = line.match(/^\s*\*\*\* (?:Update|Add|Delete) File: (.+)$/)   // \s*: an indented heredoc body
      || line.match(/^\s*\*\*\* Move to: (.+)$/);
    if (m?.[1] !== undefined) paths.push(m[1].trim());
  }
  return paths;
}

// The lines each added or updated file gains, for the edit rules: every `+`
// line after an Add File or Update File header, until the next header, and in
// `removed` every `-` line. A Move to line renames the file the lines land in.
// Never throws.
export function extractPatchAdditions(command: unknown): { path: string; text: string; removed: string }[] {
  if (typeof command !== 'string') return [];
  const out: { path: string; lines: string[]; removed: string[] }[] = [];
  let current: { path: string; lines: string[]; removed: string[] } | null = null;
  for (const line of command.split('\n')) {
    const header = line.match(/^\s*\*\*\* (Update|Add|Delete) File: (.+)$/);
    const move = line.match(/^\s*\*\*\* Move to: (.+)$/);
    if (header?.[2] !== undefined) {
      current = header[1] === 'Delete' ? null : { path: header[2].trim(), lines: [], removed: [] };
      if (current) out.push(current);
    } else if (move?.[1] !== undefined) {
      if (current) current.path = move[1].trim();
    } else if (current && line.startsWith('+')) current.lines.push(line.slice(1));
    else if (current && line.startsWith('-')) current.removed.push(line.slice(1));
  }
  return out.map((f) => ({ path: f.path, text: f.lines.join('\n'), removed: f.removed.join('\n') }));
}
