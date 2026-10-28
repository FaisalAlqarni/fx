// The cost estimate from the planning pass's plan file, and the depth block a build reports.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { validate } from './sf-schema.js';
import type { Item, Model, Problem } from './sf-model.js';

// Refit on 2026-10-28 from proof runs (a) (Shamel.Backend: 3 areas, 83 files, 24 figures, 12,813,063 tokens, 20.3 min)
// and (b) (four Advantage roots: 12 areas, 617 files, 77 figures, 49,415,523 tokens, 52.7 min). The controller's
// tokens scale by area count (run (b): 25,209,303 over 12 areas). Two runs cannot split per-file from per-figure cost,
// so that split keeps run (a)'s ratio and is unproven; both runs land within 12% of tokens and 2% of minutes.
// archify runs one call at a time after the areas: 145 receipts in about 28 minutes on run (b)'s rebuild.
export const ESTIMATE = { calibrated: true, measuredOn: '2026-10-28', tokensPerFile: 37000, tokensPerFigure: 93000, controllerTokensPerArea: 2100000, minutesPerFile: 0.2, minutesPerFigure: 0.7, controllerMinutes: 9.4, archifyMinutesPerPage: 0.2, parallel: 4 };
export type Plan = { areas: { id: string; root: string; files: number; filesToRead: number; levels: number; diagrams: number; sequences: number; storeFlows: number }[]; chapters: number };

const count = { type: 'integer', minimum: 0 };
const PLAN_SCHEMA = {
  type: 'object', required: ['areas', 'chapters'],
  properties: {
    chapters: count,
    areas: {
      type: 'array',
      items: {
        type: 'object', required: ['id', 'root', 'files', 'filesToRead', 'levels', 'diagrams', 'sequences', 'storeFlows'],
        properties: { id: { type: 'string', minLength: 1 }, root: { type: 'string', minLength: 1 }, files: count, filesToRead: count, levels: { type: 'integer', minimum: 1, maximum: 3 }, diagrams: count, sequences: count, storeFlows: count },
      },
    },
  },
};

// A problem with no file (unreadable, not JSON) has file ''; the CLI prints it in the `system-flow: estimate:` form.
export function readPlan(file: string, label = file): { plan: Plan | null; problems: Problem[] } {
  const bad = (pointer: string, message: string, f = label): { plan: null; problems: Problem[] } => ({ plan: null, problems: [{ file: f, pointer, message, level: 'error' }] });
  let text: string;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return bad('', `cannot read ${label}`, ''); }
  let data: unknown;
  try { data = parseJson(text); } catch (e) { return bad('', `invalid JSON: ${(e as Error).message}`); }
  const errors = validate(PLAN_SCHEMA, data);
  if (errors.length > 0) return { plan: null, problems: errors.map((e) => ({ file: label, pointer: e.pointer, message: e.message, level: 'error' as const })) };
  return { plan: data as Plan, problems: [] };
}

export function estimate(plan: Plan) {
  const c = ESTIMATE;
  const areas = plan.areas.map((a) => {
    const figures = a.diagrams + a.sequences + a.storeFlows;
    return { id: a.id, tokens: a.filesToRead * c.tokensPerFile + figures * c.tokensPerFigure, minutes: a.filesToRead * c.minutesPerFile + figures * c.minutesPerFigure };
  });
  const sum = (f: (a: { tokens: number; minutes: number }) => number): number => areas.reduce((n, a) => n + f(a), 0);
  const lanes = Math.max(1, Math.min(c.parallel, areas.length));
  const round = (n: number): number => Math.round(n * 10) / 10;
  // One page per figure at least; a long sequence or flow adds pages the plan does not count.
  const archifyMinutes = round(plan.areas.reduce((n, a) => n + a.diagrams + a.sequences + a.storeFlows, 0) * c.archifyMinutesPerPage);
  return {
    areas: areas.map((a) => ({ ...a, minutes: round(a.minutes) })),
    total: { tokens: sum((a) => a.tokens) + c.controllerTokensPerArea * plan.areas.length, minutes: round(c.controllerMinutes + sum((a) => a.minutes) / lanes + archifyMinutes), archifyMinutes },
    constants: c,
    note: c.calibrated ? `constants measured on ${c.measuredOn} from proof runs (a) and (b); the split between per-file and per-figure cost is unproven` : 'constants are guesses until proof run (a) calibrates them',
    warnings: plan.areas.filter((a) => a.files > 400).map((a) => `area ${a.id} has ${a.files} files; split it into sub-areas of at most 400`),
  };
}

export type Depth = { levels: number; diagramsPerLevel: [number, number, number, number]; diagrams: number; primaryNodes: number; contextNodes: number; edges: number; sequences: number; messages: number; storeRows: number; flows: number; chapters: number; evidence: number; filesCited: number };

const STORE = new Set(['sql', 'cache', 'memory', 'files', 'client']);

// `in` says whether a fragment file is counted; `origin` (task 02) names the file of each diagram, sequence, flow and section.
function count_(model: Model, items: Item[], origin: Map<string, { file: string }>, inFile: (file: string) => boolean): Depth {
  const has = (handle: string): boolean => inFile(origin.get(handle)?.file ?? '');
  const diagrams = model.levels.diagrams.filter((d) => has(`diagram:${d.id}`));
  const sequences = model.sequences.filter((q) => has(`seq:${q.id}`));
  const mine = items.filter((i) => inFile(i.file));
  const perLevel: [number, number, number, number] = [0, 0, 0, 0];
  for (const d of diagrams) perLevel[d.level] += 1;
  const cited = new Set<string>();
  let evidence = 0;
  for (const i of mine) {
    for (const e of i.evidence) {
      if (!('path' in e)) continue;
      evidence += 1;
      cited.add(JSON.stringify([e.root ?? '', e.path]));
    }
  }
  return {
    levels: new Set(diagrams.map((d) => d.level)).size, diagramsPerLevel: perLevel, diagrams: diagrams.length,
    primaryNodes: diagrams.reduce((n, d) => n + d.nodes.filter((x) => x.primary !== false).length, 0),
    contextNodes: diagrams.reduce((n, d) => n + d.nodes.filter((x) => x.primary === false).length, 0),
    edges: diagrams.reduce((n, d) => n + d.edges.length, 0),
    sequences: sequences.length, messages: sequences.reduce((n, q) => n + q.messages.length, 0),
    storeRows: mine.filter((i) => STORE.has(i.kind)).length,
    flows: model.storeFlows.filter((f) => has(`flow:${f.id}`)).length,
    chapters: model.sections.filter((s) => has(`section:${s.id}`)).length,
    evidence, filesCited: cited.size,
  };
}

export function depth(model: Model, items: Item[], plan: Plan | null, origin: Map<string, { file: string }>) {
  const stem = (file: string): string => path.basename(file, '.json');
  return {
    total: count_(model, items, origin, () => true),
    areas: (plan?.areas ?? []).map((a) => ({
      id: a.id,
      planned: { levels: a.levels, diagrams: a.diagrams, sequences: a.sequences, storeFlows: a.storeFlows },
      built: count_(model, items, origin, (file) => file !== '' && stem(file) === a.id),
    })),
  };
}
