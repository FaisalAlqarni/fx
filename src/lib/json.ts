// The one JSON.parse call in src/ (scripts/check-ts-escapes enforces it), so
// every parsed value enters as unknown and is narrowed by its caller.
export function parseJson(text: string): unknown {
  return JSON.parse(text);
}
