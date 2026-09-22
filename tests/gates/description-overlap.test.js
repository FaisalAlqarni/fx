'use strict';
// Run: node tests/gates/description-overlap.test.js
//
// Routing lives in the skill descriptions (design amendment 2, B2; ADR 0021).
// The model matches a prompt against ONE description, the one that reads
// closest, so when two lanes both claim a trigger, the redirect has to sit in
// whichever description the model happened to match. That is why this gate
// asks for mutual naming: each side of an overlap names the other lane.
//
// An overlap is either
//   - automatic: the same quoted trigger phrase in two descriptions, or
//   - declared: a pair the lane-overlap audit found claiming the same work in
//     different words. Word matching cannot see "Add a helper" in both "a
//     feature" and "creating a feature"; the audit can. Each declared pair
//     carries the text in each description that makes the claim, so the
//     table fails loudly when a description stops saying it.
// Lanes hidden from the model (disable-model-invocation) never compete.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');

const DECLARED = [
  { lanes: ['fx-tdd', 'fx-brainstorm'], trigger: 'new code: a feature, a helper',
    evidence: { 'fx-tdd': /\ba feature\b/, 'fx-brainstorm': /\bcreating a feature\b/ } },
  { lanes: ['fx-tdd', 'fx-debug'], trigger: 'a bug',
    evidence: { 'fx-tdd': /\ba bug fix\b/, 'fx-debug': /\bany bug\b/ } },
  { lanes: ['fx-humanize', 'fx-authoring'], trigger: 'editing a document',
    evidence: { 'fx-humanize': /\bediting or reviewing prose\b/, 'fx-authoring': /\bany document an agent consumes\b/ } },
  { lanes: ['fx-brainstorm', 'fx-design'], trigger: 'a new page or component',
    evidence: { 'fx-brainstorm': /\bbuilding a component\b/, 'fx-design': /\bany new screen, page\b/ } },
  { lanes: ['fx-review', 'fx-architecture'], trigger: 'checking code',
    evidence: { 'fx-review': /\bchanged code needs checking\b/, 'fx-architecture': /\bEXISTING code\b/ } },
];

function descriptions() {
  const out = {};
  for (const name of fs.readdirSync(path.join(root, 'skills'))) {
    const file = path.join(root, 'skills', name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const head = (fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n/) || [])[1];
    assert.ok(head, `${name}: no frontmatter`);
    if (/^disable-model-invocation:\s*true$/m.test(head)) continue;
    // A block scalar: every indented line after `description:`.
    const m = head.match(/^description:\s*[>|]?[-+]?\s*\n((?:[ \t]+.*\n?)*)/m)
           || head.match(/^description:\s*(.+)$/m);
    assert.ok(m, `${name}: no description`);
    out[name] = m[1].split('\n').map((l) => l.trim()).join(' ').replace(/\s+/g, ' ').trim();
  }
  return out;
}

const names = (desc, lane) => new RegExp(`(^|[^a-z0-9-])${lane}([^a-z0-9-]|$)`).test(desc);
const quoted = (desc) => new Set((desc.match(/"[^"]+"/g) || []).map((q) => q.toLowerCase()));

function overlapErrors(descs, declared = DECLARED) {
  const errors = [];
  const pairs = [];
  const lanes = Object.keys(descs).sort();
  for (let i = 0; i < lanes.length; i++) {
    for (let j = i + 1; j < lanes.length; j++) {
      const [a, b] = [lanes[i], lanes[j]];
      const qb = quoted(descs[b]);
      const shared = [...quoted(descs[a])].filter((q) => qb.has(q));
      if (shared.length) pairs.push({ lanes: [a, b], trigger: shared.join(', ') });
    }
  }
  for (const d of declared) {
    for (const lane of d.lanes) {
      if (!(lane in descs)) { errors.push(`declared overlap names ${lane}, which has no model-visible description`); continue; }
      if (!d.evidence[lane].test(descs[lane])) {
        errors.push(`${lane} no longer claims "${d.trigger}" (${d.evidence[lane]}): update the declared overlap`);
      }
    }
    pairs.push(d);
  }
  for (const { lanes: [a, b], trigger } of pairs) {
    if (!(a in descs) || !(b in descs)) continue;
    if (!names(descs[a], b)) errors.push(`${a} and ${b} both claim "${trigger}", and ${a}'s description does not name ${b}`);
    if (!names(descs[b], a)) errors.push(`${a} and ${b} both claim "${trigger}", and ${b}'s description does not name ${a}`);
  }
  return errors;
}

const descs = descriptions();
for (const lane of ['fx-tdd', 'fx-brainstorm', 'fx-debug', 'fx-review']) {
  assert.ok(descs[lane], `${lane}: description read`);
}
assert.ok(!('fx-grill' in descs), 'a lane hidden from the model is not a competitor');

const errors = overlapErrors(descs);
assert.deepStrictEqual(errors, [], `description overlaps without a redirect:\n  ${errors.join('\n  ')}`);

// The gate bites: drop fx-tdd's clause naming fx-brainstorm, and it fails.
{
  const cut = { ...descs, 'fx-tdd': descs['fx-tdd'].replace(/[^.]*fx-brainstorm[^.]*\./g, '') };
  assert.ok(!names(cut['fx-tdd'], 'fx-brainstorm'), 'the mutation removed the clause');
  const e = overlapErrors(cut);
  assert.ok(e.some((m) => m.includes("fx-tdd's description does not name fx-brainstorm")),
    `removing the fx-tdd clause must fail the gate, got: ${JSON.stringify(e)}`);
}
// A shared quoted phrase is found without being declared.
{
  const e = overlapErrors({ x: 'Also on "ship it".', y: 'Use on "ship it".' }, []);
  assert.strictEqual(e.length, 2, `a shared quoted trigger with no redirect fails both ways: ${JSON.stringify(e)}`);
}

console.log('description-overlap.test.js: OK');
