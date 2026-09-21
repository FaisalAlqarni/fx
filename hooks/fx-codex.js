#!/usr/bin/env node
'use strict';
// Codex: SessionStart, SubagentStart, and PreToolUse.
//
// ONE ENTRY POINT, ROUTED ON hook_event_name, THEN ON tool_name
//
// The two context events still just emit the rendered preamble, mirroring
// hooks/fx-context.js addressed for Codex instead of Claude Code. PreToolUse
// mirrors hooks/fx-pretooluse.js: same fail-closed guard, same fail-open
// lane check, on the same stdin-JSON/exit-code contract Codex measures as
// identical to Claude Code's. See fx-pretooluse.js's header for why one
// entry point routed on tool_name is what lets the same script serve both
// runtimes.
//
// Codex has no Write/Edit tool: it edits through apply_patch. So the lane
// check here follows apply_patch, where on Claude Code it follows
// Write/Edit/MultiEdit/NotebookEdit. Routing only the shell would leave the
// check absent while looking present, which is the failure this plan exists
// to stop.
//
// FAIL CLOSED on the guard, FAIL OPEN on the lane check — same split as
// fx-pretooluse.js, for the same reason: the guard prevents irreversible
// damage, so a broken guard must refuse; the lane check is advice, so a
// broken one must not wedge the session.

const path = require('path');
const { render } = require('../lib/preamble');

// Read-only agents (task 06): identity from SubagentStart, enforcement here.
// See lib/plant-roles.js's header for the full reasoning; this file only
// routes to it.
let plantRoles, recordAgentIdentity, lookupAgentIdentity, isReadOnlyAgent, isWritingToolCall;
try {
  ({ plantRoles, recordAgentIdentity, lookupAgentIdentity, isReadOnlyAgent, isWritingToolCall } =
    require('../lib/plant-roles'));
} catch {
  // Loaded lazily below with guards at each call site: a broken require here
  // must not stop SessionStart from rendering the preamble, and must not
  // stop the guard/lane checks PreToolUse already performs (ADR 0019: the
  // read-only guarantee is belt-and-braces, not the only thing this hook
  // does).
}

// Codex's apply_patch carries its whole payload as raw text under `command`
// — the SAME key Bash uses. Measured live against Codex CLI 0.155.1 (fix
// round 1):
//
//   tool_name='apply_patch'  tool_input keys=['command']
//     command = '*** Begin Patch\n*** Update File: target.js\n@@\n' +
//                '-const b = 2;\n+const b = 3;\n*** End Patch'
//
// This is why routing on tool_name, not on the presence of tool_input.command,
// is load-bearing: a hook that dispatched on "does tool_input have a command
// field" would hand raw patch text to the git guard and have it inspected as
// a shell command. Nothing here does that — tool_name is checked first, and
// only 'Bash' ever reaches inspect().
//
// The header lines this parses (V4A patch format):
//   *** Update File: <path>
//   *** Add File: <path>
//   *** Delete File: <path>
//   *** Move to: <path>        (rename; follows an Update File line)
// A patch can touch several files; every path found is checked. Anything
// that does not parse — a header this regex does not recognise, a string
// that is not patch text at all — yields no paths, which means no checks
// and an allow: never a throw. The lane check is advice, so failing to
// parse must fail open exactly like a laneCheck throw does.
function extractPatchPaths(command) {
  if (typeof command !== 'string') return [];
  const paths = [];
  for (const line of command.split('\n')) {
    const m = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/)
      || line.match(/^\*\*\* Move to: (.+)$/);
    if (m) paths.push(m[1].trim());
  }
  return paths;
}

let inspect, guardLoadError;
try {
  ({ inspect } = require('../lib/git-guard'));
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  guardLoadError = e;                // deferred: only PreToolUse needs the guard
}
let laneCheck;
try {
  ({ laneCheck } = require('../lib/lane-check'));
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}

function deny(reason) {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

function handlePreToolUse(input) {
  process.on('uncaughtException', (e) =>
    deny(`hook crashed (${e.message}). Denying rather than assuming this is safe.`));

  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();
  const agentId = input.agent_id;

  // Read-only agents. A subagent's own tool calls carry agent_id; the
  // controller's do not (ADR 0019), so no agent_id means this check is not
  // this call's business at all. `agent_type` on THIS payload is never
  // consulted: it is undocumented here, so the only identity trusted is
  // whatever SubagentStart recorded for this agent_id. Unrecorded ==
  // unclassifiable == refused on a write, same as a classified lens.
  if (agentId && lookupAgentIdentity && isWritingToolCall) {
    let known = null;
    try { known = lookupAgentIdentity(agentId); } catch { known = null; }
    const mustRefuseWrites = known === null ? true : isReadOnlyAgent(known);
    let writes = false;
    try { writes = isWritingToolCall(tool, ti); } catch { writes = false; }
    if (mustRefuseWrites && writes) {
      deny(known
        ? `${known} is read-only and must not write (blocked: ${tool}).`
        : `subagent ${agentId} was never recorded at SubagentStart, so its role cannot be verified; refusing the write rather than assuming it is safe.`);
    }
  }

  if (tool === 'Bash') {
    const command = ti.command;
    if (!command) process.exit(0);
    if (guardLoadError) {
      deny(`git guard failed to load (${guardLoadError.message}). Denying every command until the plugin is repaired.`);
    }
    let verdict;
    try {
      verdict = inspect(command, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    process.exit(0);
  }

  if (tool === 'apply_patch') {
    let paths;
    try {
      paths = extractPatchPaths(ti.command);
    } catch {
      paths = [];                    // unparseable: fail open, same as a laneCheck throw
    }
    for (const p of paths) {
      let reason = null;
      try {
        reason = laneCheck(path.resolve(cwd, p), cwd);
      } catch {
        reason = null;                 // advice: a bug here must not block an edit
      }
      if (reason) deny(reason);        // refuse on the FIRST offending path; its own
    }                                   // reason already names which one
    process.exit(0);
  }

  process.exit(0);
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  if (input.hook_event_name === 'PreToolUse') {
    handlePreToolUse(input);
    return;
  }

  const cwd = input.cwd || process.cwd();

  // Plant the read-only roles on every session. Never lets a planting
  // failure stop the session: Codex also skips a plugin's hooks until the
  // user trusts them, so the setup lane and the installer are the other two
  // callers of the same plantRoles (design.md: "one function does the
  // planting and three callers invoke it").
  if (input.hook_event_name === 'SessionStart' && plantRoles) {
    try { plantRoles(); } catch { /* the session must start regardless */ }
  }

  // Record which role this subagent is, at the event where agent_type is
  // documented, so PreToolUse never has to trust it on its own undocumented
  // appearance there.
  if (input.hook_event_name === 'SubagentStart' && recordAgentIdentity) {
    try { recordAgentIdentity({ agentId: input.agent_id, agentType: input.agent_type }); } catch { /* best effort */ }
  }

  let text;
  try {
    text = render({ harness: 'codex', cwd });
  } catch {
    // Say so rather than starting a session that silently has no rules.
    text = '[fx] PREAMBLE.md could not be read. The fx routing table and '
         + 'non-negotiables are NOT loaded in this session. Do not commit, '
         + 'and tell the user the plugin is misinstalled.';
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: text,
    },
  }));
});
