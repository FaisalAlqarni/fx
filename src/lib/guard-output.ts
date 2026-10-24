// What a PreToolUse hook prints for a shell guard decision, per harness.
import type { GuardDecision } from './types.js';

export function claudeGuardOutput(d: GuardDecision): { stdout: string; stderr: string; exitCode: 0 | 2 } {
  const reason = d.reason ?? '';
  switch (d.action) {
    case 'allow': return { stdout: '', stderr: '', exitCode: 0 };
    case 'warn': return { stdout: JSON.stringify({ systemMessage: reason, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: reason } }), stderr: '', exitCode: 0 };
    case 'ask': return { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason } }), stderr: '', exitCode: 0 };
    case 'deny': return { stdout: '', stderr: `${reason}\n`, exitCode: 2 };
  }
}

// Codex fails a hook run that returns ask and lets the call through, so an ask is a warned run.
export function codexGuardOutput(d: GuardDecision): { stdout: string; stderr: string; exitCode: 0 | 2 } {
  return claudeGuardOutput(d.action === 'ask' ? { ...d, action: 'warn' } : d);
}
