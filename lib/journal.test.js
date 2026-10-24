// generated from src/lib/journal.test.ts by scripts/build: edit there, not here
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
var import_journal = require("./journal.js");
var import_thresholds = require("./thresholds.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-journal-"));
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
const sessions = path.join(root, "sessions");
assert.strictEqual((0, import_journal.journalKey)("s/1", "a 1"), "s_1__a_1");
assert.strictEqual((0, import_journal.journalKey)("", "a"), null);
assert.strictEqual((0, import_journal.journalKey)(7), null);
assert.strictEqual((0, import_journal.journalKey)("s1"), "s1");
assert.strictEqual((0, import_journal.journalKey)("s1", ""), "s1", "an empty agent id adds nothing");
assert.strictEqual((0, import_journal.journalKey)("s1", 5), "s1", "a non-string agent id adds nothing");
const prompt = { t: 1, kind: "prompt", text: "hi" };
const edit = { t: 2, kind: "edit", path: "a.ts" };
const tool = { t: 3, kind: "tool", tool: "shell", command: "ls", outcome: "ok", verified: false };
assert.deepStrictEqual((0, import_journal.currentTurn)([tool, prompt, edit, tool]), [edit, tool]);
assert.deepStrictEqual((0, import_journal.currentTurn)([edit]), [edit]);
assert.deepStrictEqual((0, import_journal.currentTurn)([edit, prompt]), []);
(0, import_journal.appendEvent)("s0", prompt, root);
fs.appendFileSync(path.join(sessions, "s0.jsonl"), "garbage\n");
(0, import_journal.appendEvent)("s0", edit, root);
assert.deepStrictEqual((0, import_journal.readJournal)("s0", root), [prompt, edit]);
assert.deepStrictEqual((0, import_journal.readJournal)("missing", root), []);
if (process.platform !== "win32") assert.strictEqual(fs.statSync(path.join(sessions, "s0.jsonl")).mode & 511, 384);
(0, import_journal.appendEvent)("s1", { t: 1, kind: "tool", tool: "shell", command: "export TOKEN=abcdef1234567890abcdef1234567890abcdef12", outcome: "ok", verified: false }, root);
const stored = (0, import_journal.readJournal)("s1", root)[0];
assert.ok(stored && stored.kind === "tool");
assert.ok(stored.command?.includes("[REDACTED]"));
assert.ok(!stored.command?.includes("abcdef1234567890"));
(0, import_journal.appendEvent)("s1", { t: 2, kind: "prompt", text: "deploy with token=abc123def456ghi789" }, root);
assert.strictEqual((0, import_journal.lastUserPrompt)("s1", root), "deploy with token=[REDACTED]");
(0, import_journal.appendEvent)("s1", { t: 3, kind: "tool", tool: "shell", command: 'curl -H "Authorization: Bearer abc123" x', outcome: "ok", verified: false }, root);
assert.ok(!fs.readFileSync(path.join(sessions, "s1.jsonl"), "utf8").includes('abc123"'));
(0, import_journal.appendEvent)("s2", { t: 1, kind: "prompt", text: "one" }, root);
(0, import_journal.appendEvent)("s2", { t: 2, kind: "prompt", text: null }, root);
assert.strictEqual((0, import_journal.lastUserPrompt)("s2", root), null);
assert.strictEqual((0, import_journal.lastUserPrompt)("nothing", root), null);
(0, import_journal.appendEvent)("s3__a", { t: 1, kind: "prompt", text: "sub" }, root);
assert.strictEqual((0, import_journal.lastUserPrompt)("s3", root), null);
const now = Date.now();
const DAY = 864e5;
for (const [name, age] of [["old", 8], ["young", 6]]) {
  const f = path.join(sessions, `${name}.jsonl`);
  fs.writeFileSync(f, "");
  fs.utimesSync(f, new Date(now - age * DAY), new Date(now - age * DAY));
}
(0, import_journal.pruneJournals)(now, root);
assert.ok(!fs.existsSync(path.join(sessions, "old.jsonl")));
assert.ok(fs.existsSync(path.join(sessions, "young.jsonl")));
(0, import_journal.pruneJournals)(now, path.join(root, "nowhere"));
const blocked = path.join(root, "blocked");
fs.writeFileSync(blocked, "");
const written = [];
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk) => {
  written.push(String(chunk));
  return true;
};
try {
  (0, import_journal.appendEvent)("s9", prompt, blocked);
} finally {
  process.stderr.write = write;
}
assert.strictEqual(written.length, 1);
assert.ok(written[0]?.startsWith("[fx] journal: "));
assert.strictEqual((0, import_journal.journalCommand)("ab ".repeat(200)), `${"ab ".repeat(200).slice(0, 500)}[...]`);
(0, import_journal.appendEvent)("cap", { t: 1, kind: "tool", tool: "shell", command: "ab ".repeat(300), outcome: "ok", verified: false }, root);
(0, import_journal.appendEvent)("cap", { t: 2, kind: "prompt", text: "\xE9".repeat(1500) }, root);
(0, import_journal.appendEvent)("cap", { t: 3, kind: "prompt", text: '"'.repeat(1500) }, root);
const capLines = fs.readFileSync(path.join(sessions, "cap.jsonl"), "utf8").split("\n").filter(Boolean);
assert.strictEqual(capLines.length, 3);
for (const l of capLines) assert.ok(Buffer.byteLength(l) <= 2048, `a line of ${Buffer.byteLength(l)} bytes`);
const capEvents = (0, import_journal.readJournal)("cap", root);
assert.deepStrictEqual(capEvents[0], { t: 1, kind: "tool", tool: "shell", command: `${"ab ".repeat(300).slice(0, 500)}[...]`, outcome: "ok", verified: false });
assert.ok(capEvents[1]?.kind === "prompt" && capEvents[1].text?.startsWith("\xE9\xE9"), "a cut prompt keeps its start");
assert.strictEqual(import_thresholds.JOURNAL_MAX_BYTES, 262144);
(0, import_journal.appendEvent)("big", { t: 1, kind: "prompt", text: null, agentType: "fx-review" }, root);
for (let i = 0; i < 1e3; i++) (0, import_journal.appendEvent)("big", { t: 2, kind: "tool", tool: "shell", command: `old ${i} ${"o".repeat(100)}`, outcome: "ok", verified: false }, root);
(0, import_journal.appendEvent)("big", { t: 3, kind: "prompt", text: "current" }, root);
for (let i = 0; i < 2e3; i++) (0, import_journal.appendEvent)("big", { t: 4, kind: "edit", path: `/r/f${i}-${"p ".repeat(50)}.ts` }, root);
assert.ok(fs.statSync(path.join(sessions, "big.jsonl")).size <= import_thresholds.JOURNAL_MAX_BYTES, "the journal was cut back");
const big = (0, import_journal.readJournal)("big", root);
assert.deepStrictEqual(big[0], { t: 1, kind: "prompt", text: null, agentType: "fx-review" });
assert.ok(big.some((e) => e.kind === "prompt" && e.text === "current"), "the current turn keeps its prompt");
assert.ok(!big.some((e) => e.kind === "tool"), "the oldest events went");
const bigTurn = (0, import_journal.currentTurn)(big);
assert.deepStrictEqual(bigTurn.at(-1), { t: 4, kind: "edit", path: `/r/f1999-${"p ".repeat(50)}.ts` });
assert.ok(bigTurn.every((e) => e.kind === "edit"));
if (process.platform !== "win32") assert.strictEqual(fs.statSync(path.join(sessions, "big.jsonl")).mode & 511, 384);
(0, import_journal.appendEvent)("fxj", { t: 1, kind: "prompt", text: "go" }, root);
(0, import_journal.appendEvent)("fxj", { t: 1, kind: "fx-json-hooks", hash: "old" }, root);
(0, import_journal.appendEvent)("fxj", { t: 1, kind: "fx-json-hooks", hash: "newest" }, root);
for (let i = 0; i < 3e3; i++) (0, import_journal.appendEvent)("fxj", { t: 2, kind: "edit", path: `/r/f${i}-${"p ".repeat(50)}.ts` }, root);
assert.ok(fs.statSync(path.join(sessions, "fxj.jsonl")).size <= import_thresholds.JOURNAL_MAX_BYTES, "the journal was cut back");
assert.deepStrictEqual((0, import_journal.readJournal)("fxj", root).filter((e) => e.kind === "fx-json-hooks"), [{ t: 1, kind: "fx-json-hooks", hash: "newest" }]);
const raw = path.join(sessions, "raw.jsonl");
fs.writeFileSync(raw, `${JSON.stringify({ t: 1, kind: "prompt", text: "oldest" })}
`);
fs.appendFileSync(raw, `${JSON.stringify({ t: 2, kind: "edit", path: "q".repeat(400) })}
`.repeat(1e3));
fs.appendFileSync(raw, `${JSON.stringify({ t: 3, kind: "stop-block" })}
`);
const tail = (0, import_journal.readJournal)("raw", root);
assert.ok(!tail.some((e) => e.kind === "prompt"), "the head of the file was not read");
assert.deepStrictEqual(tail.at(-1), { t: 3, kind: "stop-block" });
assert.ok(tail.length < 1e3 && tail.length > 500);
console.log("journal.test.js: ok");
