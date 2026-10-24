// generated from src/tests/gates/description-overlap.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var assert = __toESM(require("assert"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const root = path.join(__dirname, "..", "..");
const DECLARED = [
  {
    lanes: ["fx-tdd", "fx-brainstorm"],
    trigger: "new code: a feature, a helper",
    evidence: { "fx-tdd": /\ba feature\b/, "fx-brainstorm": /\bcreating a feature\b/ }
  },
  {
    lanes: ["fx-tdd", "fx-debug"],
    trigger: "a bug",
    evidence: { "fx-tdd": /\ba bug fix\b/, "fx-debug": /\bany bug\b/ }
  },
  {
    lanes: ["fx-humanize", "fx-authoring"],
    trigger: "editing a document",
    evidence: { "fx-humanize": /\bediting or reviewing prose\b/, "fx-authoring": /\bany document an agent consumes\b/ }
  },
  {
    lanes: ["fx-brainstorm", "fx-design"],
    trigger: "a new page or component",
    evidence: { "fx-brainstorm": /\bbuilding a component\b/, "fx-design": /\bany new screen, page\b/ }
  },
  {
    lanes: ["prototype", "fx-design"],
    trigger: "variations of a screen",
    evidence: { prototype: /\btry a few variations of this screen\b/, "fx-design": /\bany new screen\b/ }
  },
  {
    lanes: ["fx-review", "fx-architecture"],
    trigger: "checking code",
    evidence: { "fx-review": /\bchanged code needs checking\b/, "fx-architecture": /\bEXISTING code\b/ }
  }
];
function descriptions() {
  const out = {};
  for (const name of fs.readdirSync(path.join(root, "skills"))) {
    const file = path.join(root, "skills", name, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const head = (fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/) || [])[1];
    assert.ok(head, `${name}: no frontmatter`);
    if (/^disable-model-invocation:\s*true$/m.test(head)) continue;
    const m = head.match(/^description:\s*[>|]?[-+]?\s*\n((?:[ \t]+.*\n?)*)/m) || head.match(/^description:\s*(.+)$/m);
    assert.ok(m, `${name}: no description`);
    out[name] = (m[1] ?? "").split("\n").map((l) => l.trim()).join(" ").replace(/\s+/g, " ").trim();
  }
  return out;
}
const names = (desc, lane) => new RegExp(`(^|[^a-z0-9-])${lane}([^a-z0-9-]|$)`).test(desc);
const quoted = (desc) => new Set((desc.match(/"[^"]+"/g) || []).map((q) => q.toLowerCase()));
function overlapErrors(descs2, declared = DECLARED) {
  const errors2 = [];
  const pairs = [];
  const lanes = Object.keys(descs2).sort();
  for (let i = 0; i < lanes.length; i++) {
    for (let j = i + 1; j < lanes.length; j++) {
      const a = lanes[i], b = lanes[j];
      if (a === void 0 || b === void 0) continue;
      const qb = quoted(descs2[b] ?? "");
      const shared = [...quoted(descs2[a] ?? "")].filter((q) => qb.has(q));
      if (shared.length) pairs.push({ lanes: [a, b], trigger: shared.join(", ") });
    }
  }
  for (const d of declared) {
    for (const lane of d.lanes) {
      if (!(lane in descs2)) {
        errors2.push(`declared overlap names ${lane}, which has no model-visible description`);
        continue;
      }
      if (!d.evidence[lane]?.test(descs2[lane] ?? "")) {
        errors2.push(`${lane} no longer claims "${d.trigger}" (${d.evidence[lane]}): update the declared overlap`);
      }
    }
    pairs.push(d);
  }
  for (const { lanes: [a, b], trigger } of pairs) {
    if (!(a in descs2) || !(b in descs2)) continue;
    if (!names(descs2[a] ?? "", b)) errors2.push(`${a} and ${b} both claim "${trigger}", and ${a}'s description does not name ${b}`);
    if (!names(descs2[b] ?? "", a)) errors2.push(`${a} and ${b} both claim "${trigger}", and ${b}'s description does not name ${a}`);
  }
  return errors2;
}
const descs = descriptions();
for (const lane of ["fx-tdd", "fx-brainstorm", "fx-debug", "fx-review"]) {
  assert.ok(descs[lane], `${lane}: description read`);
}
assert.ok(!("fx-grill" in descs), "a lane hidden from the model is not a competitor");
const errors = overlapErrors(descs);
assert.deepStrictEqual(errors, [], `description overlaps without a redirect:
  ${errors.join("\n  ")}`);
{
  const cut = { ...descs, "fx-tdd": (descs["fx-tdd"] ?? "").replace(/[^.]*fx-brainstorm[^.]*\./g, "") };
  assert.ok(!names(cut["fx-tdd"] ?? "", "fx-brainstorm"), "the mutation removed the clause");
  const e = overlapErrors(cut);
  assert.ok(
    e.some((m) => m.includes("fx-tdd's description does not name fx-brainstorm")),
    `removing the fx-tdd clause must fail the gate, got: ${JSON.stringify(e)}`
  );
}
{
  const e = overlapErrors({ x: 'Also on "ship it".', y: 'Use on "ship it".' }, []);
  assert.strictEqual(e.length, 2, `a shared quoted trigger with no redirect fails both ways: ${JSON.stringify(e)}`);
}
console.log("description-overlap.test.js: OK");
