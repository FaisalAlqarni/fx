// The system-flow test fixture: two git roots (host, guide), one plain folder
// and a scratch HOME under os.tmpdir(). Nothing here deletes anything.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseJson } from '../../lib/json.js';
import { sentences, words as countWords } from '../../lib/sf-prose.js';

type RootName = 'host' | 'guide' | 'plain';
type GitRoot = 'host' | 'guide';

const CLI = path.join(__dirname, '..', '..', 'scripts', 'system-flow');
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];
const LINK = ev('app/x.rb', '1-4', 'Link');

// Prose at exact word counts for the prose floor; every word is a plain token, so words() counts it as written.
const FILL = ['the', 'service', 'reads', 'each', 'row', 'from', 'the', 'store', 'and', 'writes', 'one', 'reply', 'to', 'the', 'client', 'before', 'the', 'job', 'runs', 'again'];
export const words = (n: number): string => Array.from({ length: n }, (_, i) => FILL[i % FILL.length]).join(' ');
export const sentence = (n: number): string => { const w = words(n); return `${w.charAt(0).toUpperCase()}${w.slice(1)}.`; };
const LEAD = `${sentence(20)} ${sentence(20)}`;
const S1_LEAD = 'Each link expires on its date and the service reads the row from the store before it answers the client. The job checks every link once a day and marks the old rows as expired so the page shows them.';
const INTRO = 'The fixture system keeps short links. A job expires old links every day. A page shows what the service holds.';

type Proof = { evidence: { path: string; lines: string; symbol: string }[] } | { unconfirmed: true };
const EVIDENCED: Proof = { evidence: LINK };
// What floor() adds carries no evidence, so it adds no stamp and no stale item to a test about something else.
const UNCONFIRMED: Proof = { unconfirmed: true };

// A section at the floor: a lead of 2 sentences of 20 words if it has none, and 20-word bullets up to 4.
function floorSection<T extends { id: string; lead?: string; bullets?: object[] }>(s: T, proof: Proof = EVIDENCED): T & { lead: string; bullets: object[] } {
  const bullets = [...(s.bullets ?? [])];
  for (let k = bullets.length + 1; bullets.length < 4; k++) bullets.push({ id: `${s.id}-b${k}`, text: sentence(20), ...proof });
  return { ...s, lead: s.lead ?? LEAD, bullets };
}
// The four Start here sections, in role order; start-what carries 2 not-owned bullets of 10 words.
const startHere = (proof: Proof = EVIDENCED, root = 'system'): object[] => [
  floorSection({ id: 'start-what', title: 'What it is', question: 'What does this system do?', folder: 'start-here', role: 'what', notOwned: [1, 2].map((k) => ({ id: `not-${k}`, text: sentence(10), ...proof })) }, proof),
  floorSection({ id: 'start-parts', title: 'The parts', question: 'What are its parts?', folder: 'start-here', role: 'parts', diagrams: [root] }, proof),
  floorSection({ id: 'start-request', title: 'One request', question: 'What happens on a request?', folder: 'start-here', role: 'request' }, proof),
  floorSection({ id: 'start-code', title: 'The code', question: 'Where is the code?', folder: 'start-here', role: 'code' }, proof),
];
// The request sequence: client, service, store and an external mailer; the fourth message calls the mailer, the fifth is its reply.
const turn = (): object => ({
  id: 'turn', title: 'A visit', chapter: 'start-request', summary: 'The client asks the service, which reads the store and sends mail.',
  participants: [['client', 'Client', 'client'], ['api', 'Service', 'service'], ['db', 'Store', 'store'], ['mail', 'Mailer', 'external']]
    .map(([id, label, look]) => ({ id, label, look, evidence: LINK })),
  messages: [['client', 'api', 'The client opens a link.'], ['api', 'db', 'The service reads the row.'], ['db', 'api', 'The store returns the row.'], ['api', 'mail', 'The service sends a mail.'], ['mail', 'api', 'The mailer accepts it.']]
    .map(([from, to, label], i) => ({ n: i + 1, from, to, label, ...(i === 4 ? { reply: true } : {}), evidence: LINK })),
});
const TERMS = ['expiry', 'store', 'service', 'client', 'mailer', 'row', 'job', 'reply', 'page', 'chapter', 'fragment', 'root', 'handle'];
// 15 terms: link (alias links), short-link (term short link) and 13 plain ones.
const glossary = (proof: Proof = EVIDENCED): object[] => [
  { id: 'link', term: 'Link', aliases: ['links'], tag: 'model', meaning: 'A short address that points at a long one.', ...proof },
  { id: 'short-link', term: 'short link', tag: 'concept', meaning: 'The address a visitor opens.', ...proof },
  ...TERMS.map((t) => ({ id: t, term: t, tag: 'concept', meaning: `The ${t} in this system.`, ...proof })),
];

export function sfFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  const dirs = { host: path.join(base, 'host'), guide: path.join(base, 'guide'), plain: path.join(base, 'plain') };
  const home = path.join(base, 'home');
  for (const d of [...Object.values(dirs), home]) fs.mkdirSync(d);

  const put = (root: RootName, rel: string, body: string): void => {
    const f = path.join(dirs[root], rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  };
  const git = (root: GitRoot, ...args: string[]): string => {
    const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dirs[root], encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} in ${root}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const commit = (root: GitRoot, message = 'change'): string => {
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', message);
    return git(root, 'rev-parse', 'HEAD');
  };
  const fragment = (name: string, data: unknown): void => put('host', `docs/system-flow/model/fragments/${name}.json`, `${JSON.stringify(data, null, 2)}\n`);
  const fxJson = (data: unknown): void => put('host', '.fx.json', `${JSON.stringify(data, null, 2)}\n`);
  // A model that meets the prose floor: the four Start here sections then s1, each at 120 words
  // (start-what 140 with its not-owned bullets), a request sequence, a 15-term glossary and a code map.
  const goodSet = (): void => {
    fragment('meta', { schemaVersion: 2, meta: { name: 'Fixture', title: 'Fixture system', intro: INTRO, roots: [{ id: 'backend' }], conventions: ['Store keys read table:column.'] } });
    fragment('level0', {
      levels: {
        root: 'system',
        diagrams: [{
          id: 'system', level: 0, title: 'System', summary: 'The link service reads and writes the database.', groups: [],
          nodes: [
            { id: 'link', label: 'Link', kind: 'backend', look: 'service', role: 'Expires links', evidence: ev('app/x.rb', '1-4', 'Link#expired?') },
            { id: 'db', label: 'Database', kind: 'database', look: 'store', role: 'Stores links', evidence: ev('app/y.rb', '1-2', 'Y') },
          ],
          edges: [{ from: 'link', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }],
        }],
      },
    });
    fragment('chapters', { sections: [...startHere(), floorSection({ id: 's1', title: 'Links', question: 'Where do links expire?', lead: S1_LEAD, bullets: [{ id: 'b1', text: sentence(20), evidence: ev('app/x.rb', '4', 'expired?') }] })] });
    fragment('app', {
      sequences: [turn()],
      stores: { sql: [{ id: 'sql-links', table: 'links', purpose: 'Holds every short link.', evidence: LINK }] },
      catalogue: [{ id: 'mailer', kind: 'integration', name: 'Mailer', evidence: LINK }],
      codeMap: [{ id: 'app', root: 'backend', path: 'app/', owns: 'The application code.', evidence: [{ path: 'app/' }, ...LINK] }],
    });
    fragment('glossary', { glossary: glossary() });
  };
  // Brings whatever a test wrote up to the prose floor, so a test about something else is not failed by it:
  // name and intro, the Start here sections (parts listing the level-0 diagram), each section padded to 4 bullets and 120 words, every caption one
  // sentence of 6 to 30 words, and in floor.json a request sequence, a glossary and a code map entry per cited root.
  // Deterministic, so calling it again after a test rewrites a fragment adds the same values.
  const floor = (): void => {
    const dir = path.join(dirs.host, 'docs/system-flow/model/fragments');
    type Frag = Record<string, any>; // ts-gate-ok: fragments are patched by key
    const frags = new Map<string, Frag>(fs.readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'floor.json')
      .map((n) => [n.slice(0, -5), parseJson(fs.readFileSync(path.join(dir, n), 'utf8')) as Frag]));
    const all = [...frags.values()];
    const meta = frags.get('meta') as Frag;
    meta.meta.name ??= 'Fixture';
    meta.meta.intro ??= INTRO;
    const root: string = all.find((f) => f.levels?.root)?.levels.root ?? 'system';
    const chapters = frags.get('chapters') ?? { sections: [] };
    frags.set('chapters', chapters);
    if (!chapters.sections.some((x: Frag) => x.role === 'what')) chapters.sections.unshift(...startHere(UNCONFIRMED, root));
    const parts = chapters.sections.find((x: Frag) => x.role === 'parts');
    if (parts && !(parts.diagrams ?? []).includes(root)) parts.diagrams = [root];
    for (const sec of chapters.sections as Frag[]) {
      if (sec.role !== undefined) continue;
      const parts = all.flatMap((f) => (f.sections ?? []).filter((x: Frag) => x.id === sec.id));
      const lead = parts.find((x: Frag) => x.lead !== undefined)?.lead;
      if (lead === undefined) sec.lead = LEAD;
      sec.bullets ??= [];
      let count = parts.reduce((n: number, x: Frag) => n + (x.bullets?.length ?? 0), 0);
      let w = countWords(lead ?? LEAD) + parts.reduce((n: number, x: Frag) => n + (x.bullets ?? []).reduce((m: number, b: Frag) => m + countWords(b.text), 0), 0);
      for (let k = 1; (count < 4 || w < 120) && count < 8; k++, count++, w += 20) sec.bullets.push({ id: `${sec.id}-f${k}`, text: sentence(20), ...UNCONFIRMED });
    }
    const caption = (o: Frag): void => { if (!o.summary || sentences(o.summary) !== 1 || countWords(o.summary) < 6 || countWords(o.summary) > 30) o.summary = `The ${o.id} figure shows how its parts connect.`; };
    for (const f of all) [...(f.levels?.diagrams ?? []), ...(f.sequences ?? []), ...(f.storeFlows ?? [])].forEach(caption);
    const extra: Frag = {};
    if (!all.some((f) => (f.sequences ?? []).some((q: Frag) => q.chapter === 'start-request'))) {
      extra.sequences = [{ id: 'floor-visit', title: 'A visit', chapter: 'start-request', summary: 'The client asks the service and the service answers it.',
        participants: [{ id: 'floor-client', label: 'Client', look: 'client', ...UNCONFIRMED }, { id: 'floor-api', label: 'Service', look: 'service', ...UNCONFIRMED }],
        messages: [{ n: 1, from: 'floor-client', to: 'floor-api', label: 'The client asks the service.', ...UNCONFIRMED }] }];
    }
    if (!all.some((f) => f.glossary)) extra.glossary = glossary(UNCONFIRMED);
    const host: string = meta.meta.roots[0].id;
    const cited = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object' && v !== null) for (const [k, c] of Object.entries(v)) if (k === 'evidence' && Array.isArray(c)) { for (const e of c as Frag[]) if (e.path !== undefined) cited.add(e.root ?? host); } else walk(c);
    };
    walk(all);
    const mapped = new Set(all.flatMap((f) => (f.codeMap ?? []).map((c: Frag) => c.root)));
    const codeMap = [...cited].filter((r) => !mapped.has(r)).map((r) => ({ id: `floor-${r}`, root: r, path: 'app/', owns: 'Code the fixture cites.', ...UNCONFIRMED }));
    if (codeMap.length) extra.codeMap = codeMap;
    for (const [name, data] of frags) fragment(name, data);
    if (Object.keys(extra).length) fragment('floor', extra);
  };
  const env = (extra: Record<string, string> = {}): Record<string, string> => {
    const e: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_CONFIG_DIR') e[k] = v;
    return { ...e, HOME: home, ...extra };
  };
  const run = (args: string[], extra?: Record<string, string>) => {
    const r = spawnSync(process.execPath, [CLI, '--root', dirs.host, ...args], { encoding: 'utf8', env: env(extra) });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  };

  git('host', 'init', '-q', '-b', 'main');
  git('guide', 'init', '-q', '-b', 'main');
  const pad = (n: number) => `  # pad ${n}`;
  put('host', 'app/x.rb', ['class Link', pad(2), pad(3), '  def expired?', '    true', pad(6), pad(7), pad(8), pad(9), pad(10)].join('\n') + '\n');
  put('host', 'app/y.rb', 'module Y\nend\n');
  commit('host', 'fixture');
  put('guide', 'README.md', '# Guide\n');
  commit('guide', 'fixture');
  put('plain', 'notes.txt', 'Plain\n');

  return { base, ...dirs, home, put, git, commit, fragment, fxJson, goodSet, floor, env, run };
}
