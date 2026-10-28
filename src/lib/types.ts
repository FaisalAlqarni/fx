// Types shared across fx modules; later migration steps add to this file.

// The lane marks src/lib/lane-check.ts writes under .fx/ (`.lane-<name>`).
export type LaneName = 'design' | 'tdd';

// An Agent tool input, as hooks/fx-pretooluse.js passes it to dispatch-route.
export type DispatchInput = Record<string, unknown>;

// What route returns: a new tool input with `model` set, or null to leave the call alone.
export type DispatchRoute = DispatchInput | null;

// What src/lib/git-guard.ts inspect returns for a shell command: allowed, or
// refused with the reason the hook shows.
export type GuardVerdict = { allow: true } | { allow: false; reason: string };

// The harnesses src/lib/preamble.ts renders for.
export type Harness = 'claude-code' | 'opencode' | 'codex' | 'opencode-v2';

// One unfinished plan under docs/plans, as src/lib/plan-state.ts scans it.
export interface PlanState {
  slug: string;
  tasks: number;
  taskDir: string;
  hasState: boolean;
}

// The .fx.json keys fx reads. A null command means "none configured".
export interface FxJson {
  stacks: string[];
  test_one: string | null;
  test_scope: string | null;
  test_all: string | null;
  setup: string | null;
  lint: string | null;
  coverage: string | null;
  coverage_floor: number | null;
  companions: string;
  glossary_rename: 'declined';
  scratch_migrate: 'declined';
  docs_first_run: 'declined';
  hooks: { stop_check?: boolean; loop_nudge?: boolean; edit_rules?: boolean };
  system_flow?: {
    output?: { site: string; markdown: string };
    theme?: { source: string; kind: 'docs-css' | 'mkdocs-material' | 'tailwind' | 'app-css' | 'brand' | 'fx' };
    roots?: Record<string, string>;
    diagrams?: { prefer?: 'cheap' | 'fast' | 'detailed'; pageLimits?: Record<string, number>; svg?: string[] };
  };
}

// What src/lib/fx-json.ts parseFxJson returns: a bad key is dropped from `value`
// and listed in `problems`; only a non-object input fails outright.
export type FxJsonResult =
  | { ok: false; reason: string }
  | { ok: true; value: Partial<FxJson>; problems: { key: string; reason: string }[] };

// One generated role file under codex/agents (`<name>.toml`), as
// scripts/gen-codex-agents writes it and src/lib/plant-roles.ts plants it.
export interface CodexRole {
  name: string;
  description: string;
  sandbox_mode: 'read-only';
  developer_instructions: string;
}

// What src/lib/plant-roles.ts plantRoles reports, as lists of destination paths.
export interface PlantReport {
  written: string[];
  skipped: string[];
  stale: string[];
  kept: string[];
}

// What src/lib/plant-roles.ts auditRoles reports, without writing anything.
export interface AuditReport {
  present: string[];
  missing: string[];
  stale: string[];
}

// The Claude Code hook payload fields the hooks read, as src/lib/hook-input.ts
// parses them. hook_event_name stays as sent, because the context hook echoes
// it. tool_input is {} for a falsy value and null for any other non-object,
// which is how the hooks' `tool_input || {}` read reached dispatch routing.
export interface ClaudeHookInput {
  hook_event_name: unknown;
  tool_name: string | undefined;
  tool_input: Record<string, unknown> | null;
  // PostToolUse: the tool's result as sent; PostToolUseFailure: the error string.
  tool_response: unknown;
  error: string | undefined;
  is_interrupt: boolean | undefined;
  cwd: string | undefined;
  transcript_path: string | undefined;
  session_id: string | undefined;
  prompt: string | undefined;
  agent_id: unknown;
  agent_type: string | undefined;
  // Stop and SubagentStop: true only when the payload says so; the final message, or null.
  stop_hook_active: boolean;
  last_assistant_message: string | null;
}

// The Codex hook payload fields hooks/fx-codex.js reads. tool_name and
// agent_id stay as sent: refusals echo them, and any truthy agent_id turns the
// read-only check on.
export interface CodexHookInput {
  hook_event_name: unknown;
  tool_name: unknown;
  tool_input: Record<string, unknown> | null;
  // The shell command: set only for Bash with a string tool_input.command.
  command: string | undefined;
  // PostToolUse: the tool's result as sent (a string or an object).
  tool_response: unknown;
  cwd: string | undefined;
  session_id: string | undefined;
  prompt: string | undefined;
  agent_id: unknown;
  agent_type: string | undefined;
  // Stop and SubagentStop, as for ClaudeHookInput.
  stop_hook_active: boolean;
  last_assistant_message: string | null;
}

// What a PreToolUse hook decides for one call: allow it, or refuse it with the
// reason the hook prints before exiting 2.
export type HookDecision = GuardVerdict;

export type HookInputResult<T> = { ok: true; value: T } | { ok: false; reason: string };

// What hooks/fx-context.js prints. hookEventName echoes the payload's
// hook_event_name, whatever its type, or SessionStart when it is missing.
export interface ClaudeContextOutput {
  hookSpecificOutput: { hookEventName: unknown; additionalContext: string };
  systemMessage?: string;
}

// What hooks/fx-pretooluse.js prints for an Agent dispatch: the routed input,
// or the notice that routing is off. Allow and deny print nothing; deny is exit 2.
export type ClaudePreToolUseOutput =
  | { hookSpecificOutput: { hookEventName: 'PreToolUse'; updatedInput?: DispatchInput; additionalContext?: string } }
  | { systemMessage: string };

// What hooks/fx-codex.js prints on SessionStart and SubagentStart.
export interface CodexHookOutput {
  hookSpecificOutput: { hookEventName: unknown; additionalContext: string };
  systemMessage?: string;
}

// The fields the opencode plugins read from a tool call. v1 splits a call over
// (input, output): the tool on input, the arguments on output. v2 hands one
// event carrying the ids and the tool's input.
export interface OpencodeToolEvent {
  tool: string | undefined;
  args: Record<string, unknown>;
  input: Record<string, unknown>;
  sessionID: string | undefined;
  messageID: string | undefined;
  id: string | undefined;
}

// What a finished tool call tells the loop tracker, from either major's execute.after.
export interface OpencodeToolResult {
  tool: string | undefined;
  sessionID: string | undefined;
  args: Record<string, unknown>;
  outcome: 'ok' | 'fail' | 'unknown';
  output: string;
  // The call was killed: partial output proves nothing.
  interrupted?: boolean;
}

export type OpencodeEventResult = { ok: true; value: OpencodeToolEvent } | { ok: false; reason: string };

// A permission.evaluate event (v2): the request fx may rewrite into a denial.
export interface OpencodePermissionEvent {
  action?: unknown;
  agent?: unknown;
  effect?: string;
  message?: string;
  resources?: unknown;
  sessionID?: unknown;
  source?: { messageID?: unknown; id?: unknown };
}

// The opencode 1.x config object the plugin's config hook edits in place.
export interface OpencodeV1Config {
  permission?: unknown;
  skills?: { paths?: string[] };
  agent?: Record<string, unknown>;
  subagent_depth?: number;
  command?: Record<string, unknown>;
}

// An opencode 2.x agent as the agent.transform editor hands it over.
export interface OpencodeV2Agent {
  id: string;
  system?: string;
  permissions: { action: string; resource: string; effect: string }[];
}

// The slice of the opencode 2.x plugin context that fx calls.
export interface OpencodeV2Ctx {
  location: { directory: string };
  permission: { hook(name: 'evaluate', fn: (ev: OpencodePermissionEvent) => void): unknown };
  tool: { hook(name: 'execute.before' | 'execute.after', fn: (ev: unknown) => void | Promise<void>): unknown };
  session: {
    hook(name: 'context', fn: (ev: { system: unknown[] }) => void): unknown;
    hook(name: 'prompt', fn: (ev: unknown) => void): unknown;
    prompt(args: { sessionID: unknown; text: string }): Promise<unknown>;
  };
  agent: {
    transform(fn: (editor: {
      list(): { id: string }[];
      update(id: string, fn: (a: OpencodeV2Agent) => void): unknown;
    }) => void): unknown;
  };
  command: {
    transform(fn: (editor: {
      add(c: {
        name: string;
        description: string;
        execute(input: { sessionID: unknown; prompt?: { text?: string } }): Promise<void>;
      }): void;
    }) => void): Promise<unknown> | unknown;
  };
}

// One built-in edit rule (src/lib/edit-rules.ts): a stable id, a file glob and the sentence a refusal quotes.
export interface EditRule { id: string; glob: string; rule: string }

// How a tool call is classified for the session journal.
export type ToolKind = 'edit' | 'read' | 'shell' | 'other';

// The three advisory nudges.
export type NudgeSignal = 'repeat-failure' | 'passive-stall' | 'unverified-writes';

// One line of a session journal (src/lib/journal.ts); `t` is epoch milliseconds.
export type JournalEvent =
  | { t: number; kind: 'prompt'; text: string | null; agentType?: string | null }
  | { t: number; kind: 'tool'; tool: ToolKind; command: string | null; outcome: 'ok' | 'fail' | 'unknown'; verified: boolean }
  | { t: number; kind: 'edit'; path: string }
  | { t: number; kind: 'nudge'; signal: NudgeSignal }
  | { t: number; kind: 'stop-block' }
  // The SHA-256 of the top-level .fx.json's hooks, as this session last saw them.
  | { t: number; kind: 'fx-json-hooks'; hash: string };

// Where a shell guard decision came from (src/lib/shell-guard.ts).
export type GuardSource =
  | 'hard-rule' | 'read-only' | 'repo-command' | 'grey' | 'guard-error';

// What the shell guard decides for one command, already in the harness's form.
export type GuardDecision = { action: 'allow' | 'warn' | 'ask' | 'deny'; reason: string | null; source: GuardSource };
