// generated from src/tests/fixture-build/hidden/implementer-heads.test.ts by scripts/build: edit there, not here
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
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const BIN = path.join(__dirname, "implementer-heads.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-heads-"));
const ts = (s) => new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();
const user = (t, text) => ({ type: "user", timestamp: ts(t), message: { content: text } });
const metaUser = (t, text) => ({ type: "user", timestamp: ts(t), isMeta: true, message: { content: text } });
const asst = (t, text) => ({ type: "assistant", timestamp: ts(t), message: { content: [{ type: "text", text }] } });
const write = (file, recs) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join("\n") + "\n");
};
const ctl = path.join(root, "sess.jsonl");
write(ctl, [user(0, "build it"), asst(1, "dispatching")]);
const sub = path.join(root, "sess", "subagents");
write(path.join(sub, "a-fixer.jsonl"), [
  user(50, "You are implementing task 01: store. If this is a fix round, append to the report."),
  asst(60, "Fixed. Commits 1111111..2222222")
]);
write(path.join(sub, "b-implementer.jsonl"), [
  user(10, [{ type: "text", text: "You are implementing task 01: store" }]),
  asst(20, "Working from base abcdef0, will commit next."),
  asst(30, "Status: DONE. Commits 3333333..4444444abc, see report.")
]);
write(path.join(sub, "c-reviewer.jsonl"), [
  user(5, "You are reviewing one task's implementation: task 01"),
  asst(7, "Reviewed 5555555. Clean.")
]);
write(path.join(sub, "d-implementer.jsonl"), [
  user(70, "You are implementing task 02: cli add and show"),
  asst(80, "Status: BLOCKED, nothing committed.")
]);
const toolResult = (t, id) => ({ type: "user", timestamp: ts(t), message: { content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } });
write(path.join(sub, "e-implementer.jsonl"), [
  user(90, "You are implementing task 03: readme"),
  asst(91, "Reading the task file."),
  toolResult(92, "tool-1"),
  asst(93, "Status: DONE. Commits aaaaaaa..bbbbbbb, see report."),
  user(94, "Task 03, fix round 1 of 5"),
  asst(95, "Fixed. Commits ccccccc..ddddddd, see report.")
]);
write(path.join(sub, "f-real-shape.jsonl"), [
  user(200, "You are implementing task 05: sentinel"),
  asst(201, "Loading the skill."),
  metaUser(202, "Base directory for this skill: /some/path/skills/fx-tdd\n\n# fx-tdd\n..."),
  asst(203, "Status: DONE. Commits eeeeeee..fffffff, see report."),
  metaUser(204, "The coordinator sent a message while you were working:\nTask 05, fix round 1 of 5"),
  asst(205, "Fixed. Commits 1212121..3434343, see report.")
]);
write(path.join(sub, "g-implementer.jsonl"), [
  user(300, "You are implementing task 06: paths"),
  asst(301, "Status: DONE\nCommits: 1a2b3c4..5d6e7f8\nReport: /tmp/claude-1000/41c30690-f980-4e40-a682-fd0bcbf989cf/reports/06.md")
]);
write(path.join(sub, "h-implementer.jsonl"), [
  user(310, "You are implementing task 07: fallback"),
  asst(311, "Status: DONE at head 9abcdef.")
]);
assert.deepStrictEqual(
  JSON.parse((0, import_child_process.execFileSync)("node", [BIN, ctl], { encoding: "utf8" })),
  // ts-gate-ok: the test parses output it just produced
  { "01": "4444444abc", "03": "bbbbbbb", "05": "fffffff", "06": "5d6e7f8", "07": "9abcdef" }
);
const p = (0, import_child_process.spawnSync)("node", [BIN], { encoding: "utf8" });
assert.strictEqual(p.status, 2, "no argument exits 2");
fs.rmSync(root, { recursive: true, force: true });
console.log("implementer-heads test: ok");
