import * as assert from 'assert';
import { parseFxEnv } from './env.js';

assert.strictEqual(parseFxEnv({ CODEX_HOME: '/h' }).codexHome, '/h');
assert.strictEqual(parseFxEnv({ CODEX_HOME: '' }).codexHome, undefined);
assert.strictEqual(parseFxEnv({}).codexHome, undefined);

// The per-machine config and state paths: an empty value counts as unset.
const xdg = parseFxEnv({ XDG_CONFIG_HOME: '/c', XDG_STATE_HOME: '/s', APPDATA: 'C:\\A', LOCALAPPDATA: 'C:\\L' });
assert.deepStrictEqual(
  [xdg.xdgConfigHome, xdg.xdgStateHome, xdg.appData, xdg.localAppData],
  ['/c', '/s', 'C:\\A', 'C:\\L'],
);
assert.strictEqual(parseFxEnv({ XDG_CONFIG_HOME: '' }).xdgConfigHome, undefined);
const empty = parseFxEnv({ XDG_STATE_HOME: '', APPDATA: '', LOCALAPPDATA: '' });
assert.deepStrictEqual([empty.xdgStateHome, empty.appData, empty.localAppData], [undefined, undefined, undefined]);
