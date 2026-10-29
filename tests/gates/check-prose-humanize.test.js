// generated from src/tests/gates/check-prose-humanize.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("node:assert"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const root = path.join(__dirname, "..", "..");
const EM = String.fromCharCode(8212), EN = String.fromCharCode(8211);
const script = path.join(root, "scripts", "check-prose");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-prose-humanize-"));
const run = (args, cwd = root) => {
  const r = (0, import_child_process.spawnSync)("python3", ["-I", script, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
};
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text);
  return p;
};
const hit = (out, file, line, pattern) => out.split("\n").some((l) => l.includes(`${file}:${line}: ${pattern}`));
try {
  const md = write("note.md", [
    "A plain sentence.",
    // 1
    `A dash ${EM} here and ${EN} there.`,
    // 2
    "We delve into the tapestry.",
    // 3
    "It is not a bug, but a feature.",
    // 4
    "It's not a cache, it's a log.",
    // 5
    "Here's the thing: it works.",
    // 6
    "This is setting the stage for later.",
    // 7
    "I hope this helps.",
    // 8
    "```js",
    // 9
    `const s = "delve ${EM} tapestry"; // I hope this helps`,
    // 10
    "```",
    // 11
    ""
  ].join("\n"));
  const m = run([md]);
  assert.strictEqual(m.status, 1, `a Markdown file with hits exits 1:
${m.out}`);
  for (const [line, pattern] of [
    [2, "dash"],
    [3, "stock word"],
    [4, "not X but Y"],
    [5, "not X but Y"],
    [6, "filler opener"],
    [7, "inflated phrase"],
    [8, "chatbot artifact"]
  ]) {
    assert.ok(hit(m.out, md, line, pattern), `Markdown line ${line} flagged as ${pattern}:
${m.out}`);
  }
  assert.ok(m.out.includes("We delve into the tapestry."), `a hit quotes its excerpt:
${m.out}`);
  assert.ok(!m.out.includes(`${md}:1:`), `a clean line is not flagged:
${m.out}`);
  assert.ok(!m.out.includes(`${md}:10:`), `a fenced code block is not read:
${m.out}`);
  const code = [
    ["a.js", 'const s = "delve";\nfetch("https://x.example/delve");\n// we delve here\n', 3],
    ["b.ts", "let a = 1;\n/* first line\n   and we delve here */\nlet b = 2;\n", 3],
    ["c.cs", 'var s = "I hope this helps";\n// I hope this helps\n', 2],
    ["d.css", ".delve { color: red; }\n/* a tapestry of rules */\n", 2],
    ["e.rb", 'color = "#delve"\nx = 1 # we delve here\n', 2],
    ["f.py", 'x = "delve"\ndef f():\n    """Docstring.\n\n    We delve here.\n    """\n', 5],
    ["g.sh", "echo delve\n# we delve here\n", 2],
    ["h.yml", "key: delve\n# we delve here\n", 2],
    ["i.html", "<p>delve</p>\n<!-- a note\n     on the tapestry -->\n", 3],
    ["j.erb", "<%= delve %>\n<!-- I hope this helps -->\n", 2]
  ];
  for (const [name, text, line] of code) {
    const p = write(name, text);
    const r = run([p]);
    assert.strictEqual(r.status, 1, `${name}: a comment hit exits 1:
${r.out}`);
    assert.ok(r.out.includes(`${p}:${line}: `), `${name}: line ${line} flagged:
${r.out}`);
    const lines = r.out.split("\n").filter((l) => l.startsWith(`${p}:`));
    assert.ok(lines.every((l) => l.startsWith(`${p}:${line}: `)), `${name}: only the comment is flagged:
${r.out}`);
  }
  const clean = write("clean.js", `const s = "delve ${EM} I hope this helps";
// Adds two numbers.
`);
  const c = run([clean]);
  assert.strictEqual(c.status, 0, `a clean file exits 0:
${c.out}`);
  const cleanMd = write("clean.md", "# Title\n\nA plain sentence.\n");
  assert.strictEqual(run([cleanMd]).status, 0, "a clean Markdown file exits 0");
  const repo = path.join(dir, "repo");
  fs.mkdirSync(repo);
  const g = (...a) => (0, import_child_process.execFileSync)("git", ["-c", "user.name=fx", "-c", "user.email=fx@example.invalid", ...a], { cwd: repo });
  g("init", "-q");
  fs.writeFileSync(path.join(repo, "old.md"), "An old line with a tapestry.\n");
  g("add", ".");
  g("commit", "-qm", "base");
  fs.writeFileSync(path.join(repo, "old.md"), "An old line with a tapestry.\nA new line we delve into.\n");
  fs.writeFileSync(path.join(repo, "new.py"), "x = 1  # I hope this helps\n");
  const d = run(["--diff", "HEAD"], repo);
  assert.strictEqual(d.status, 1, `--diff with added hits exits 1:
${d.out}`);
  assert.ok(d.out.includes("old.md:2: stock word"), `--diff flags the added line:
${d.out}`);
  assert.ok(!d.out.includes("old.md:1:"), `--diff skips the line that was already there:
${d.out}`);
  assert.ok(d.out.includes("new.py:1: chatbot artifact"), `--diff reads an untracked file:
${d.out}`);
  g("add", ".");
  g("commit", "-qm", "next");
  assert.strictEqual(run(["--diff", "HEAD"], repo).status, 0, "--diff with nothing added exits 0");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\s+/g, " ");
const finalReview = read("skills/fx-implement/references/final-review.md");
assert.ok(finalReview.includes("## Humanize pass"), "final review has a Humanize pass section");
assert.ok(
  finalReview.includes("`docs: humanize pass`") && finalReview.includes("fx-humanize"),
  "final review names the single humanize pass commit and fx-humanize"
);
assert.ok(
  read("skills/fx-implement/references/completion.md").includes("humanize pass"),
  "completion names the humanize pass"
);
assert.ok(
  read("skills/fx-implement/implementer-prompt.md").includes("check-prose --diff HEAD"),
  "the implementer runs the prose gate on its task before committing"
);
assert.ok(
  read("skills/fx-implement/references/exit-gate.md").includes("check-prose --diff <MERGE_BASE>"),
  "the exit gate runs the prose gate on the branch"
);
for (const f of ["skills/fx-docs/SKILL.md", "skills/fx-adr/SKILL.md"]) {
  assert.ok(read(f).toLowerCase().includes("invoke the fx-humanize lane"), `${f} invokes the fx-humanize lane before committing`);
}
console.log("check-prose humanize gate: all passed");
