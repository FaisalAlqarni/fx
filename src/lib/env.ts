// The one place fx reads the process environment. Every field is undefined
// when its variable is unset or empty, so callers fall back to a default.
export interface FxEnv {
  // Falls back to ~/.codex.
  codexHome: string | undefined;
  // The per-machine config and state directories (src/lib/fx-paths.ts).
  xdgConfigHome: string | undefined;
  xdgStateHome: string | undefined;
  appData: string | undefined;
  localAppData: string | undefined;
}

export function parseFxEnv(env: NodeJS.ProcessEnv): FxEnv {
  return {
    codexHome: env.CODEX_HOME || undefined,
    xdgConfigHome: env.XDG_CONFIG_HOME || undefined,
    xdgStateHome: env.XDG_STATE_HOME || undefined,
    appData: env.APPDATA || undefined,
    localAppData: env.LOCALAPPDATA || undefined,
  };
}
