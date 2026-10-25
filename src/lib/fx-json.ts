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

  return { ok: true, value, problems };
}
