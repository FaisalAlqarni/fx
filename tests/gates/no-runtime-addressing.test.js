// generated from src/tests/gates/no-runtime-addressing.test.ts by scripts/build: edit there, not here
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
const DIRS = ["skills", "references", "agents", "commands"];
const MARKER = "prose-gate: quoting";
const LANES = fs.readdirSync(path.join(root, "skills")).filter((n) => fs.existsSync(path.join(root, "skills", n, "SKILL.md")));
const AGENTS = fs.readdirSync(path.join(root, "agents")).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3));
const alt = (names) => names.join("|");
const runtimeForm = new RegExp(
  `(^|[^/\\w])(fx:(${alt([...LANES, ...AGENTS])})|\\$(${alt(LANES)}))(?![\\w-])`
);
const RESOLVES = /\b(may|might)\s+not\s+resolve/i;
function mdFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}
function offences(rel, text) {
  const errors2 = [];
  const lines = text.split("\n");
  let start = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i < lines.length && (lines[i] ?? "").trim() !== "") continue;
    const para = lines.slice(start, i).join("\n");
    if (para && !para.includes(MARKER)) {
      const form = runtimeForm.test(para);
      if (form || RESOLVES.test(para)) {
        errors2.push(`${rel}:${start + 1}: ${form ? "runtime form of a lane or agent name" : "resolution claim"}`);
      }
    }
    start = i + 1;
  }
  return errors2;
}
const errors = [];
for (const d of DIRS) {
  for (const f of mdFiles(path.join(root, d))) {
    errors.push(...offences(path.relative(root, f), fs.readFileSync(f, "utf8")));
  }
}
assert.deepStrictEqual(
  errors,
  [],
  `shared skill text must name a lane or agent without a runtime form ("invoke the fx-tdd lane"):
  ${errors.join("\n  ")}`
);
assert.strictEqual(offences("x", "**Invoke `fx:fx-tdd` before writing any code.**").length, 1, "the Claude Code form fails");
assert.strictEqual(offences("x", "Invoke `$fx:fx-tdd` first.").length, 1, "the Codex form fails");
assert.strictEqual(offences("x", "Invoke `$fx-tdd` first.").length, 1, "the bare Codex form fails too");
assert.strictEqual(
  offences("x", "Use the addressable name,\nsince a bare `fx-tdd` may\nnot resolve at all.").length,
  1,
  "a resolution claim fails across a line break"
);
assert.deepStrictEqual(offences("x", "Invoke the fx-tdd lane before writing any code."), [], "the lane name passes");
assert.deepStrictEqual(offences("x", "The ref does not resolve: stop and ask."), [], "a git ref that does not resolve is not a claim");
assert.deepStrictEqual(offences("x", "# /fx:fx-setup\n\nInvoke it as `/fx:fx-grill`."), [], "a slash command is not a lane form");
assert.strictEqual(offences("x", "Dispatch `fx:fx-lens-pipeline` on the file set.").length, 1, "the Claude Code agent form fails");
assert.strictEqual(offences("x", "Use `fx:fx-tdd` for RED.").length, 1, "the form fails without the word invoke");
assert.strictEqual(offences("x", "The `$fx-review` lane runs next.").length, 1, "the Codex form fails without the word invoke");
assert.deepStrictEqual(offences("x", 'Never write "invoke `fx:fx-tdd`" here.\n(prose-gate: quoting)'), [], "a marked quote passes");
console.log("no-runtime-addressing.test.js: OK");
