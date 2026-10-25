// Reads the evidence lines of one Markdown doc (the format fx-docs writes).
// Lines inside fenced code blocks are never read.

export type Evidence =
  | { type: 'path'; path: string; start: number | null; end: number | null; symbol: string | null }
  | { type: 'owner'; date: string };
export type Claim = { doc: string; line: number; text: string; kind: 'doc' | 'adr'; status: 'current' | 'superseded'; evidence: Evidence[] };
export type Problem = { doc: string; line: number; message: string };

const EVIDENCE_LINE = /^\s*(?:>\s?)?Evidence:\s*(.*)$/;
const PATH_ITEM = /^`([^`\s]+?)(?::(\d+)(?:-(\d+))?)?`(?: `([^`]+)`)?$/;
const OWNER_ITEM = /^owner, (\d{4}-\d{2}-\d{2})$/;
const MARKER = /<!--\s*fx-docs verified:\s*([0-9a-f]{40})\s*-->/;
const FENCE = /^\s*(```|~~~)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;

function parseItem(item: string): Evidence | null {
  const o = OWNER_ITEM.exec(item);
  if (o) return { type: 'owner', date: o[1] ?? '' };
  const m = PATH_ITEM.exec(item);
  if (!m) return null;
  const start = m[2] === undefined ? null : Number(m[2]);
  const end = m[3] !== undefined ? Number(m[3]) : start;
  return { type: 'path', path: m[1] ?? '', start, end, symbol: m[4] ?? null };
}

// A status line in any of the three accepted forms; null when the ADR has none.
function statusText(lines: string[], fenced: boolean[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const m = /^\s*(?:-\s*\*\*Status:\*\*|Status:)\s*(.*)$/i.exec(lines[i] ?? '');
    if (m) return m[1] ?? '';
    if (/^##\s+Status\s*$/i.test(lines[i] ?? '')) {
      for (let j = i + 1; j < lines.length; j++) if ((lines[j] ?? '').trim() !== '') return lines[j] ?? '';
    }
  }
  return null;
}

// An ADR is a doc under a folder named adr or decisions.
export const isAdrPath = (doc: string): boolean => doc.split('/').slice(0, -1).some((s) => s === 'adr' || s === 'decisions');

export function parseDoc(doc: string, text: string): { claims: Claim[]; problems: Problem[]; verified: string | null } {
  const lines = text.split('\n');
  // A fence line counts as fenced, so claims never run across or into one.
  const fenced: boolean[] = [];
  let fence: string | null = null;
  for (const l of lines) {
    const f = FENCE.exec(l);
    if (fence === null) { fenced.push(f !== null); if (f) fence = f[1] ?? null; }
    else { fenced.push(true); if (f && f[1] === fence) fence = null; }
  }
  const kind = isAdrPath(doc) ? 'adr' : 'doc';
  // Only a status that opens with Superseded, Deprecated or Ignored takes the whole ADR out of
  // force; "Partly superseded by" leaves its other decisions live.
  const status = kind === 'adr' && /^\W*(superseded|deprecated|ignored)\b/i.test(statusText(lines, fenced) ?? '') ? 'superseded' : 'current';

  const claims: Claim[] = [];
  const problems: Problem[] = [];
  let verified: string | null = null;
  lines.forEach((raw, i) => {
    if (fenced[i]) return;
    const marker = MARKER.exec(raw);
    if (marker && verified === null) verified = marker[1] ?? null;
    const m = EVIDENCE_LINE.exec(raw);
    if (!m) return;
    const rest = m[1] ?? '';
    const claim = claimAbove(lines, fenced, i);
    const items = rest.split('; ').map((s) => parseItem(s.trim()));
    if (claim === '' || items.some((e) => e === null)) {
      problems.push({ doc, line: i + 1, message: `malformed evidence line: ${raw.trim()}` });
      return;
    }
    claims.push({ doc, line: i + 1, text: claim, kind, status, evidence: items.filter((e): e is Evidence => e !== null) });
  });
  return { claims, problems, verified };
}

// The paragraph or list item directly above line i, joined with single spaces; '' when none.
function claimAbove(lines: string[], fenced: boolean[], i: number): string {
  const block: string[] = [];
  for (let j = i - 1; j >= 0 && !fenced[j]; j--) {
    const l = lines[j] ?? '';
    if (l.trim() === '' || /^#{1,6}\s/.test(l) || EVIDENCE_LINE.test(l)) break;
    const bare = l.replace(/^\s*>\s?/, '');
    block.unshift(bare.trim());
    if (LIST_ITEM.test(bare)) break;
  }
  return block.join(' ');
}
