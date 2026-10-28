// The harness facts the hooks branch on are recorded in
// references/harnesses/, each as one MEASURED, READ or UNVERIFIED paragraph
// with the date, the tool and its version, under the heading that owns it.
// READ marks a fact taken from the installed binary's text, not from a run.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const dir = path.join(__dirname, '..', '..', 'references', 'harnesses');
const FACT = /^(MEASURED|READ|UNVERIFIED) 2026-10-\d\d on .+ \d+\.\d+\.\d+:/;

// The text under `## <heading>` up to the next `## `.
function section(file: string, heading: string): string {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const start = text.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `${file} has a "${heading}" section`);
  const rest = text.slice(start + heading.length + 5);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}

function fact(file: string, heading: string): string {
  const paragraphs = section(file, heading).split(/\n\s*\n/).map((p) => p.trim());
  const found = paragraphs.find((p) => FACT.test(p));
  assert.ok(found, `${file} "${heading}" holds a MEASURED, READ or UNVERIFIED paragraph with date, tool and version`);
  return found;
}

fact('claude-code.md', 'Model tiers');
fact('codex.md', 'Subagent dispatch');
// The UserPromptSubmit output fact came from `strings` of the binary's schema (final review U9).
assert.ok(fact('codex.md', 'User prompts').startsWith('READ '), 'the Codex prompt output fact is READ, not MEASURED');
fact('codex.md', 'Skill trigger rules');
fact('codex.md', 'Model catalog and profiles');
fact('codex.md', 'Hook trust');
assert.ok(fact('codex.md', 'Tool vocabulary').includes('anthropic/'), 'the Codex Tool vocabulary fact names the anthropic/ case');
assert.ok(!fs.readFileSync(path.join(dir, 'codex.md'), 'utf8').includes('Edits go through `apply_patch`.'),
  'codex.md no longer says every edit goes through apply_patch');
fact('opencode.md', 'Subagent dispatch');
fact('opencode-v2.md', 'Subagent dispatch');
const guard = fact('opencode-v2.md', 'Shell guard');

// Task 04 reads one of these two phrases (ruling C6).
assert.ok(/execute\.before is (not )?awaited/.test(guard), 'the Shell guard fact says whether execute.before is awaited');
assert.ok(!/openrouter/i.test(guard), 'the Shell guard fact never names OpenRouter');

const v2 = fs.readFileSync(path.join(dir, 'opencode-v2.md'), 'utf8');
assert.ok(!v2.includes('Measured against OpenCode 2.0.18') || v2.includes('2.1.4'),
  'opencode-v2.md names 2.1.4 wherever it still cites 2.0.18');

console.log('harness-facts: ok');
