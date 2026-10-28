// The system-flow test fixture: two git roots (host, guide), one plain folder
// and a scratch HOME under os.tmpdir(). Nothing here deletes anything.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

type RootName = 'host' | 'guide' | 'plain';
type GitRoot = 'host' | 'guide';

const CLI = path.join(__dirname, '..', '..', 'scripts', 'system-flow');
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];

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
  const goodSet = (): void => {
    fragment('meta', { schemaVersion: 1, meta: { roots: [{ id: 'backend' }] } });
    fragment('level0', {
      levels: {
        root: 'system',
        diagrams: [{
          id: 'system', level: 0, title: 'System', summary: 'The whole system.', groups: [],
          nodes: [
            { id: 'link', label: 'Link', kind: 'backend', role: 'Expires links', evidence: ev('app/x.rb', '1-4', 'Link#expired?') },
            { id: 'db', label: 'Database', kind: 'database', role: 'Stores links', evidence: ev('app/y.rb', '1-2', 'Y') },
          ],
          edges: [{ from: 'link', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') }],
        }],
      },
    });
    fragment('chapters', {
      sections: [{ id: 's1', title: 'Links', question: 'Where do links expire?', bullets: [{ id: 'b1', text: 'Link#expired? decides.', evidence: ev('app/x.rb', '4', 'expired?') }] }],
    });
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

  return { base, ...dirs, home, put, git, commit, fragment, fxJson, goodSet, env, run };
}
