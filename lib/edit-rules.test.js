// generated from src/lib/edit-rules.test.ts by scripts/build: edit there, not here
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
var import_edit_rules = require("./edit-rules.js");
const EM = "\u2014";
const globs = [
  ["**/*.{md,mdx}", "README.md", true],
  ["**/*.{md,mdx}", "docs/a/b.mdx", true],
  ["**/*.{md,mdx}", "src/a.ts", false],
  ["db/migrate/*.rb", "db/migrate/1_x.rb", true],
  ["db/migrate/*.rb", "db/migrate/old/1_x.rb", false],
  ["src/**", "src/a/b.ts", true],
  ["?.ts", "a.ts", true],
  ["?.ts", "ab.ts", false],
  ["a.b", "axb", false]
];
for (const [glob, rel, want] of globs) assert.strictEqual((0, import_edit_rules.globMatch)(glob, rel), want, `${glob} ${rel}`);
assert.strictEqual((0, import_edit_rules.globMatch)("{a", "{a"), true, "an unclosed brace is literal");
assert.strictEqual((0, import_edit_rules.globMatch)("src/**/x.ts", "src/x.ts"), true, "**/ spans zero directories");
assert.strictEqual((0, import_edit_rules.globMatch)("src/**/x.ts", "src/a/b/x.ts"), true);
assert.strictEqual((0, import_edit_rules.globMatch)("*/x", "a/b/x"), false);
{
  const started = Date.now();
  assert.strictEqual((0, import_edit_rules.globMatch)(`${"*".repeat(150)}x`, "a".repeat(40)), false);
  assert.strictEqual((0, import_edit_rules.globMatch)(`${"**/".repeat(60)}x`, `${"a/".repeat(40)}b`), false);
  assert.ok(Date.now() - started < 100, `${Date.now() - started} ms`);
}
assert.deepStrictEqual(import_edit_rules.BUILTIN_RULES.map((r) => r.id), ["no-dashes", "no-secrets", "no-conflict-markers"]);
assert.deepStrictEqual(import_edit_rules.BUILTIN_RULES.filter((r) => (0, import_edit_rules.globMatch)(r.glob, "docs/a.md")).map((r) => r.id), ["no-dashes", "no-secrets", "no-conflict-markers"]);
assert.deepStrictEqual(import_edit_rules.BUILTIN_RULES.filter((r) => (0, import_edit_rules.globMatch)(r.glob, "src/a.ts")).map((r) => r.id), ["no-secrets", "no-conflict-markers"]);
assert.strictEqual((0, import_edit_rules.addedLines)("a\nb\nc", "a\nX\nb\nc"), "X");
assert.strictEqual((0, import_edit_rules.addedLines)("a\na", "a\na\na"), "a");
assert.strictEqual((0, import_edit_rules.addedLines)("", "x\ny"), "x\ny");
assert.strictEqual((0, import_edit_rules.addedLines)("x\ny", "y"), "");
assert.strictEqual((0, import_edit_rules.addedLines)("a\r\nb", "a\nb\nc"), "c", "a CRLF file on disk, LF content");
assert.strictEqual((0, import_edit_rules.addedLines)("a\nb", "a\r\nb\r\nc"), "c", "and the reverse");
assert.strictEqual((0, import_edit_rules.addedLines)('  alt=""\nk1\nk2', 'k1\nk2\n<img\n  src={logo}\n  alt=""\n/>'), '<img\n  src={logo}\n  alt=""\n/>');
assert.strictEqual((0, import_edit_rules.addedLines)("a\nb", "b\na"), "a", "a moved line counts as added");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-dashes", `a ${EM} b`), true);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-dashes", "a \u2013 b"), true, "an en dash");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-dashes", "a - b"), false);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-dashes", `a fix ${EM} b`, `a typo ${EM} b`), false, "a dash the replaced line already held");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-dashes", `a ${EM} b ${EM}`, `a ${EM} b`), true, "one more dash than it replaces");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-conflict-markers", "<<<<<<< HEAD"), true);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-conflict-markers", "x\n>>>>>>> main"), true);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-conflict-markers", "Title\n======="), false, "a setext underline");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-conflict-markers", "<<<<<<<<"), false, "eight is not a marker");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", "export OPENAI_API_KEY=sk-proj-1234567890abcdef"), true);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", "const x = 1"), false);
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", "the log shows [REDACTED] here"), false, "a marker already present is not a secret");
const PEM_LINE = (word) => `${"-".repeat(5)}${word} RSA PRIVATE KEY${"-".repeat(5)}`;
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", `${PEM_LINE("BEGIN")}
MIIEowIBAAKCAQEA
${PEM_LINE("END")}`), true, "a PEM private key block");
assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", `token = "${"ghp"}_${"a1B2".repeat(9)}"`), true, "a vendor-prefixed key");
for (const line of [
  "<li key={item.id}>",
  'password: "Password"',
  `Fixed in ${"0123456789abcdef0123456789abcdef01234567"} last week.`,
  "app/controllers/admin/organizations/subscriptions/billing",
  `"integrity": "sha512-${"Zm9vYmFyYmF6".repeat(7)}=="`,
  "let(:user) { create(:user, password: 'password123') }"
]) assert.strictEqual((0, import_edit_rules.builtinBreach)("no-secrets", line), false, line);
assert.strictEqual((0, import_edit_rules.builtinBreach)("fk-index", `a ${EM} b`), false, "not a built-in");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-edit-rules-"));
process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
fs.mkdirSync(path.join(dir, "docs"));
fs.writeFileSync(path.join(dir, "docs", "a.md"), `old ${EM} line
`);
fs.writeFileSync(path.join(dir, "a.md"), "p\nq");
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "Write", { file_path: "docs/a.md", content: `old ${EM} line
new clean line
` }, dir),
  [{ path: path.join(dir, "docs", "a.md"), added: "new clean line", removed: "" }]
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "Write", { file_path: path.join(dir, "new.md"), content: "x\n" }, "/elsewhere"),
  [{ path: path.join(dir, "new.md"), added: "x", removed: "" }],
  "an absolute path, a new file"
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "MultiEdit", { file_path: "a.md", edits: [{ old_string: "p", new_string: "x" }, { old_string: "q", new_string: "y" }] }, dir),
  [{ path: path.join(dir, "a.md"), added: "x\ny", removed: "p\nq" }]
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "MultiEdit", { file_path: "a.md", edits: [{ old_string: "p", new_string: "x" }, { old_string: "z", new_string: "y" }] }, dir),
  [{ path: path.join(dir, "a.md"), added: "x\ny", removed: "p\nz" }]
);
fs.writeFileSync(path.join(dir, "b.md"), "a a");
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "Edit", { file_path: "b.md", old_string: "a", new_string: `a
b ${EM}` }, dir),
  [{ path: path.join(dir, "b.md"), added: `b ${EM}`, removed: "" }]
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "Edit", { file_path: "b.md", old_string: "nope", new_string: "x" }, dir),
  [{ path: path.join(dir, "b.md"), added: "x", removed: "nope" }],
  "the file does not hold old_string"
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("claude-code", "NotebookEdit", { notebook_path: "n.ipynb", new_source: "print(1)" }, dir),
  [{ path: path.join(dir, "n.ipynb"), added: "print(1)", removed: "" }]
);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("claude-code", "Read", { file_path: "a" }, "/w"), []);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("claude-code", "Write", { file_path: 3, content: "x" }, "/w"), [], "a non-string path");
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("claude-code", "Write", null, "/w"), []);
const PATCH = `*** Begin Patch
*** Add File: docs/c.md
+one ${EM}
*** End Patch`;
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("codex", "apply_patch", { command: PATCH }, dir),
  [{ path: path.join(dir, "docs", "c.md"), added: `one ${EM}`, removed: "" }]
);
for (const tool of ["Bash", "exec_command"]) {
  assert.deepStrictEqual(
    (0, import_edit_rules.changedFiles)("codex", tool, { command: `apply_patch <<'PATCH'
${PATCH}
PATCH` }, dir).map((f) => f.added),
    [`one ${EM}`],
    tool
  );
}
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("codex", "Bash", { command: "ls" }, dir), []);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("opencode", "write", { filePath: "a.md", content: "p\nq\nr" }, dir),
  [{ path: path.join(dir, "a.md"), added: "r", removed: "" }]
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("opencode", "edit", { filePath: "a.md", oldString: "q", newString: "q2" }, dir),
  [{ path: path.join(dir, "a.md"), added: "q2", removed: "q" }]
);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("opencode", "apply_patch", { patchText: PATCH }, dir).map((f) => f.path), [path.join(dir, "docs", "c.md")]);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("opencode-v2", "edit", { path: "a.md", oldString: "a", newString: "x" }, "/w"),
  [{ path: path.join("/w", "a.md"), added: "x", removed: "a" }]
);
assert.deepStrictEqual(
  (0, import_edit_rules.changedFiles)("opencode-v2", "write", { path: "a.md", content: "p\nq\nr" }, dir),
  [{ path: path.join(dir, "a.md"), added: "r", removed: "" }]
);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("opencode-v2", "patch", { patchText: PATCH }, dir).map((f) => f.path), [path.join(dir, "docs", "c.md")]);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("opencode-v2", "edit", { filePath: "a.md", oldString: "a", newString: "x" }, "/w"), []);
assert.deepStrictEqual((0, import_edit_rules.changedFiles)("opencode-v2", "apply_patch", { patchText: PATCH }, dir), []);
{
  const repo = path.join(dir, "builtins");
  fs.mkdirSync(repo);
  assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo }).status, 0);
  const input = (content) => ({ harness: "opencode", sessionId: "s", cwd: repo, toolName: "write", toolInput: { filePath: "docs/a.md", content }, now: Date.now() });
  const refused = (0, import_edit_rules.checkBuiltins)(input(`a ${EM} b
`));
  assert.ok(!(refused instanceof Promise), "not a promise");
  assert.deepStrictEqual(refused, { action: "refuse", reason: "[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)" });
  assert.deepStrictEqual((0, import_edit_rules.checkBuiltins)(input("clean\n")), { action: "allow", reason: null });
}
async function repoRulesIgnored() {
  const repo = path.join(dir, "repo");
  fs.mkdirSync(repo);
  assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo }).status, 0);
  fs.writeFileSync(path.join(repo, ".fx.json"), JSON.stringify({ rules: [{ id: "no-todo", glob: "**/*.rb", rule: "No TODO comments." }] }));
  const state = path.join(dir, "state");
  Object.assign(process.env, { XDG_STATE_HOME: state, LOCALAPPDATA: state });
  const d = await (0, import_edit_rules.checkEdit)({ harness: "claude-code", sessionId: null, cwd: repo, toolName: "Write", toolInput: { file_path: "a.rb", content: "# TODO\n" }, now: Date.now() });
  assert.deepStrictEqual(d, { action: "allow", reason: null });
  assert.ok(!fs.existsSync(path.join(state, "fx", "decisions.jsonl")), "no log line");
}
repoRulesIgnored().then(() => console.log("edit-rules.test.js: ok"), (e) => {
  console.error(e);
  process.exit(1);
});
