// fx package entry for git-spec plugin installs:
//
//   "plugin":  ["fx@git+https://github.com/FaisalAlqarni/fx.git"]   // opencode 1.x
//   "plugins": ["fx@git+https://github.com/FaisalAlqarni/fx.git"]   // opencode 2.x
//
// One `main` must serve every consumer, so the major is picked at load,
// the same way scripts/fx-opencode-install picks it:
//   - FX_OPENCODE_MAJOR=1|2 forces it (tests, dual-binary machines);
//   - else `opencode --version` on PATH;
//   - else 1: a host without an opencode binary speaks the 1.x plugin API.
//
// The two plugins have different load shapes: v1 exports a named `fx`
// factory, v2 default-exports `{ id, setup }` (its probe Q1: nothing else
// loads). This module re-exports exactly ONE default: a runtime that scans
// every export would register the plugin twice on a second export — the
// guard would run twice and the preamble would be pushed twice.
//
// No `"type"` field in package.json on purpose: lib/*.js is CommonJS and
// the repo's node tooling depends on .js staying CJS. The bun-based
// runtimes detect this file's ESM syntax on their own, which is how
// plugins/fx-opencode-v1.js already loads today without a package.json.
// Plain node loads the file only by reparsing it as ESM (it warns); that
// is pre-existing for the plugins/ files too, and nothing in the repo
// runs them through node.
import { spawnSync } from 'node:child_process';

function detectMajor() {
  const forced = process.env.FX_OPENCODE_MAJOR;
  if (forced === '1' || forced === '2') return Number(forced);
  try {
    const r = spawnSync('opencode', ['--version'], { timeout: 3000, encoding: 'utf8' });
    const m = r.status === 0 && r.stdout ? r.stdout.match(/\d+/) : null;
    return m && Number(m[0]) === 2 ? 2 : 1;
  } catch {
    return 1;
  }
}

const major = detectMajor();
const mod = major === 2
  ? await import('./plugins/fx-opencode-v2.js')
  : await import('./plugins/fx-opencode-v1.js');
const plugin = major === 2 ? mod.default : mod.fx;
if (!plugin) throw new Error(`fx: no plugin export found for major ${major}`);

export default plugin;
