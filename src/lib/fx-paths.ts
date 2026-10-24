// Where fx keeps per-machine files: the config directory and the state directory
// (decision log, session journals). Pure functions of platform, environment
// and home directory, so every platform is testable on any platform.
import * as os from 'os';
import * as path from 'path';
import { parseFxEnv, type FxEnv } from './env.js';

// The XDG spec says a relative value is invalid and must be ignored.
const xdg = (value: string | undefined) => (value && path.posix.isAbsolute(value) ? value : undefined);

// Linux and macOS share the XDG layout, as opencode already does on macOS.
export function fxConfigDir(platform: NodeJS.Platform, env: FxEnv, home: string): string {
  if (platform === 'win32') return path.win32.join(env.appData ?? path.win32.join(home, 'AppData', 'Roaming'), 'fx');
  return path.posix.join(xdg(env.xdgConfigHome) ?? path.posix.join(home, '.config'), 'fx');
}

export function fxStateDir(platform: NodeJS.Platform, env: FxEnv, home: string): string {
  if (platform === 'win32') return path.win32.join(env.localAppData ?? path.win32.join(home, 'AppData', 'Local'), 'fx');
  return path.posix.join(xdg(env.xdgStateHome) ?? path.posix.join(home, '.local', 'state'), 'fx');
}

export function machinePaths(): { configDir: string; stateDir: string } {
  const env = parseFxEnv(process.env);
  const configDir = fxConfigDir(process.platform, env, os.homedir());
  return { configDir, stateDir: fxStateDir(process.platform, env, os.homedir()) };
}
