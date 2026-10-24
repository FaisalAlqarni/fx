import * as assert from 'assert';
import { fxConfigDir, fxStateDir } from './fx-paths.js';
import type { FxEnv } from './env.js';

const none: FxEnv = { codexHome: undefined, xdgConfigHome: undefined, xdgStateHome: undefined, appData: undefined, localAppData: undefined };

assert.strictEqual(fxConfigDir('linux', { ...none, xdgConfigHome: '/x' }, '/h'), '/x/fx');
assert.strictEqual(fxConfigDir('linux', none, '/h'), '/h/.config/fx');
assert.strictEqual(fxConfigDir('darwin', none, '/h'), '/h/.config/fx');
assert.strictEqual(fxConfigDir('win32', { ...none, appData: 'C:\\Users\\u\\AppData\\Roaming' }, 'C:\\Users\\u'), 'C:\\Users\\u\\AppData\\Roaming\\fx');
assert.strictEqual(fxConfigDir('win32', none, 'C:\\Users\\u'), 'C:\\Users\\u\\AppData\\Roaming\\fx');

assert.strictEqual(fxStateDir('linux', { ...none, xdgStateHome: '/s' }, '/h'), '/s/fx');
assert.strictEqual(fxStateDir('linux', none, '/h'), '/h/.local/state/fx');
assert.strictEqual(fxStateDir('darwin', none, '/h'), '/h/.local/state/fx');
assert.strictEqual(fxStateDir('win32', { ...none, localAppData: 'C:\\L' }, 'C:\\Users\\u'), 'C:\\L\\fx');
assert.strictEqual(fxStateDir('win32', none, 'C:\\Users\\u'), 'C:\\Users\\u\\AppData\\Local\\fx');

// The XDG spec says a relative value is invalid and must be ignored.
assert.strictEqual(fxConfigDir('linux', { ...none, xdgConfigHome: 'rel/config' }, '/h'), '/h/.config/fx');
assert.strictEqual(fxStateDir('darwin', { ...none, xdgStateHome: './state' }, '/h'), '/h/.local/state/fx');
