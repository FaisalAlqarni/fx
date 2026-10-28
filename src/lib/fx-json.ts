// Parses the .fx.json keys fx reads. Each key is checked on its own: a bad key
// is left out of `value` and listed in `problems`, so it breaks only the code
// that reads that key.

import type { FxJson, FxJsonResult } from './types.js';

type CommandKey = 'test_one' | 'test_scope' | 'test_all' | 'setup' | 'lint' | 'coverage';
const COMMANDS: CommandKey[] = ['test_one', 'test_scope', 'test_all', 'setup', 'lint', 'coverage'];

const SWITCHES: (keyof FxJson['hooks'])[] = ['stop_check', 'loop_nudge', 'edit_rules'];

export function parseFxJson(raw: unknown): FxJsonResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: '.fx.json is not an object' };
  const input = new Map(Object.entries(raw));
  const value: Partial<FxJson> = {};
  const problems: { key: string; reason: string }[] = [];

  const stacks = input.get('stacks');
  if (stacks !== undefined) {
    if (Array.isArray(stacks) && stacks.every((s) => typeof s === 'string')) value.stacks = stacks;
    else problems.push({ key: 'stacks', reason: 'stacks must be an array of strings' });
  }

  for (const key of COMMANDS) {
    const v = input.get(key);
    if (v === undefined) continue;
    if (typeof v === 'string' || v === null) value[key] = v;
    else problems.push({ key, reason: `${key} must be a string or null` });
  }

  const floor = input.get('coverage_floor');
  if (floor !== undefined) {
    if (typeof floor === 'number' || floor === null) value.coverage_floor = floor;
    else problems.push({ key: 'coverage_floor', reason: 'coverage_floor must be a number or null' });
  }

  const companions = input.get('companions');
  if (companions !== undefined) {
    if (typeof companions === 'string') value.companions = companions;
    else problems.push({ key: 'companions', reason: 'companions must be a string' });
  }

  const rename = input.get('glossary_rename');
  if (rename !== undefined) {
    if (rename === 'declined') value.glossary_rename = rename;
    else problems.push({ key: 'glossary_rename', reason: 'glossary_rename must be "declined"' });
  }

  const scratch = input.get('scratch_migrate');
  if (scratch !== undefined) {
    if (scratch === 'declined') value.scratch_migrate = scratch;
    else problems.push({ key: 'scratch_migrate', reason: 'scratch_migrate must be "declined"' });
  }

  const firstRun = input.get('docs_first_run');
  if (firstRun !== undefined) {
    if (firstRun === 'declined') value.docs_first_run = firstRun;
    else problems.push({ key: 'docs_first_run', reason: 'docs_first_run must be "declined"' });
  }

  const hooks = input.get('hooks');
  if (hooks !== undefined) {
    if (typeof hooks === 'object' && hooks !== null && !Array.isArray(hooks)) {
      const switches = new Map(Object.entries(hooks));
      const out: NonNullable<FxJson['hooks']> = {};
      for (const name of SWITCHES) {
        const v = switches.get(name);
        if (v === undefined) continue;
        if (typeof v === 'boolean') out[name] = v;
        else problems.push({ key: `hooks.${name}`, reason: `hooks.${name} must be a boolean` });
      }
      value.hooks = out;
    } else problems.push({ key: 'hooks', reason: 'hooks must be an object' });
  }

  const sf = input.get('system_flow');
  if (sf !== undefined) {
    const parsed = parseSystemFlow(sf, problems);
    if (parsed) value.system_flow = parsed;
  }

  return { ok: true, value, problems };
}

type SystemFlow = NonNullable<FxJson['system_flow']>;
type ThemeKind = NonNullable<SystemFlow['theme']>['kind'];
const THEME_KINDS: ThemeKind[] = ['docs-css', 'mkdocs-material', 'tailwind', 'app-css', 'brand', 'fx'];
const themeKind = (v: unknown): ThemeKind | undefined => THEME_KINDS.find((k) => k === v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// A bad part is dropped and listed; the good parts stay.
function parseSystemFlow(sf: unknown, problems: { key: string; reason: string }[]): SystemFlow | null {
  if (!isObj(sf)) {
    problems.push({ key: 'system_flow', reason: 'system_flow must be an object with output, theme, roots and diagrams' });
    return null;
  }
  const out: SystemFlow = {};
  const bad = (key: string, reason: string): void => { problems.push({ key: `system_flow.${key}`, reason }); };
  const { output, theme, roots, diagrams } = sf;
  if (output !== undefined) {
    if (isObj(output) && typeof output.site === 'string' && typeof output.markdown === 'string') out.output = { site: output.site, markdown: output.markdown };
    else bad('output', 'output must have site and markdown strings');
  }
  if (theme !== undefined) {
    const kind = isObj(theme) ? themeKind(theme.kind) : undefined;
    if (isObj(theme) && typeof theme.source === 'string' && kind) out.theme = { source: theme.source, kind };
    else bad('theme', `theme must have a source string and a kind of ${THEME_KINDS.join(', ')}`);
  }
  if (roots !== undefined) {
    if (isObj(roots)) {
      out.roots = {};
      for (const [id, p] of Object.entries(roots)) {
        if (typeof p === 'string') out.roots[id] = p;
        else bad(`roots.${id}`, 'a root path must be a string');
      }
    } else bad('roots', 'roots must be an object');
  }
  if (diagrams !== undefined) {
    if (isObj(diagrams)) {
      const d: NonNullable<SystemFlow['diagrams']> = {};
      if (diagrams.prefer !== undefined) {
        if (diagrams.prefer === 'cheap' || diagrams.prefer === 'fast' || diagrams.prefer === 'detailed') d.prefer = diagrams.prefer;
        else bad('diagrams.prefer', 'prefer must be cheap, fast or detailed');
      }
      if (diagrams.archify !== undefined) {
        if (typeof diagrams.archify === 'string') d.archify = diagrams.archify;
        else bad('diagrams.archify', 'archify must be a string');
      }
      if (diagrams.svg !== undefined) {
        if (Array.isArray(diagrams.svg) && diagrams.svg.every((s) => typeof s === 'string')) d.svg = diagrams.svg;
        else bad('diagrams.svg', 'svg must be an array of strings');
      }
      if (diagrams.pageLimits !== undefined) {
        if (isObj(diagrams.pageLimits)) {
          d.pageLimits = {};
          for (const [name, n] of Object.entries(diagrams.pageLimits)) {
            if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 8) d.pageLimits[name] = n;
            else bad(`diagrams.pageLimits.${name}`, 'a page limit must be an integer from 1 to 8');
          }
        } else bad('diagrams.pageLimits', 'pageLimits must be an object');
      }
      out.diagrams = d;
    } else bad('diagrams', 'diagrams must be an object');
  }
  return out;
}
