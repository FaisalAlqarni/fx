// generated from src/lib/preamble.test.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_preamble = require("./preamble.js");
var import_hook_env = require("../tests/helpers/hook-env.js");
const hookEnv = (0, import_hook_env.scratchHookEnv)();
process.on("exit", hookEnv.cleanup);
assert.deepStrictEqual(import_preamble.HARNESSES, ["claude-code", "opencode", "codex", "opencode-v2"]);
const cc = (0, import_preamble.render)({ harness: "claude-code" });
assert.ok(cc.includes("fx:fx-tdd"), "claude-code must address lanes as fx:fx-tdd");
const oc = (0, import_preamble.render)({ harness: "opencode" });
assert.ok(oc.includes("fx-tdd"), "opencode must name the lane");
assert.ok(!oc.includes("fx:fx-tdd"), "opencode must NOT carry the plugin prefix");
assert.ok(
  !/a plugin skill resolves as/i.test(oc),
  "opencode must not be told that a plugin prefix is required"
);
assert.ok(
  /will not resolve|no plugin prefix/i.test(oc),
  "opencode must be told which form fails"
);
{
  const v2 = (0, import_preamble.render)({ harness: "opencode-v2" });
  assert.ok(v2.includes("the `skill` tool"), "opencode-v2 names the skill tool");
  assert.ok(/`subagent` tool/.test(v2), "opencode-v2 dispatches through the subagent tool");
  assert.ok(!v2.includes("fx:fx-"), "opencode-v2 addresses lanes without a plugin prefix");
  console.log("opencode-v2 addressing: passed");
}
const cx = (0, import_preamble.render)({ harness: "codex" });
assert.ok(
  /addressed as `\$fx:fx-tdd`, with the plugin prefix/.test(cx),
  "codex must be told lanes carry a leading $ and the plugin prefix"
);
assert.ok(cx.includes("$fx:fx-tdd"), "codex must address lanes as $fx:fx-tdd (Codex 0.155.1 expands the plugin-qualified name, not $fx-tdd)");
assert.ok(!/\$fx-tdd/.test(cx), "codex must NOT carry the bare $fx-tdd form");
for (const harness of import_preamble.HARNESSES) {
  const text = (0, import_preamble.render)({ harness });
  assert.ok(!text.includes("{{"), `${harness}: unrendered placeholder survived`);
  assert.ok(text.length > 500, `${harness}: preamble looks truncated`);
}
const source = fs.readFileSync(path.join(__dirname, "..", "PREAMBLE.md"), "utf8");
const firstHeading = (s) => (s.match(/^## .*$/m) || [""])[0];
assert.strictEqual(
  firstHeading((0, import_preamble.render)({ harness: "claude-code" })),
  firstHeading(source),
  "the first section must not move"
);
assert.throws(() => (0, import_preamble.render)({ harness: "nope" }), /unknown harness/i);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-preamble-"));
fs.writeFileSync(path.join(dir, "repo.md"), "# repo\n");
assert.ok(
  (0, import_preamble.render)({ harness: "codex", cwd: dir }).includes("repo.md"),
  "a repo.md in cwd must be announced"
);
fs.rmSync(dir, { recursive: true, force: true });
const INTRO = "The single canonical preamble. Injected into every session **and every\ndispatched subagent**, on every runtime, from this one file.\n\nSubagents read neither `CLAUDE.md` nor memory. Anything that must hold for a\nsubagent has to be here: that is the whole reason this file exists, and the\nreason it stays short.";
{
  const { execFileSync: execFileSync2 } = require("child_process");
  const worst = fs.mkdtempSync(path.join(os.tmpdir(), "fx-worst-"));
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "fx-alone-"));
  fs.writeFileSync(path.join(empty, ".fx.json"), '{"companions": ""}');
  fs.writeFileSync(path.join(worst, "repo.md"), "# repo\n");
  const slugs = [
    "2026-09-21-a-rather-long-plan-slug",
    // 34
    "2026-09-21-another-quite-long-plan-slug-x",
    // 41 > the measured 38
    "2026-09-21-third-plan-slug-here"
    // 32
  ];
  for (const slug of slugs) {
    const dir2 = path.join(worst, "docs", "plans", slug);
    fs.mkdirSync(path.join(dir2, "tasks"), { recursive: true });
    const rulings = Array.from({ length: 10 }, (_, i) => `Ruling: r${i} ${"y".repeat(200 - 10)}`).join("\n");
    fs.writeFileSync(path.join(dir2, "state.md"), "# ledger\n");
    fs.writeFileSync(path.join(worst, "docs", "plans", "rulings.md"), `# Standing rulings

${rulings}
`);
    for (let i = 1; i <= 12; i++) fs.writeFileSync(path.join(dir2, "tasks", `${String(i).padStart(2, "0")}-t.md`), "# t\n");
  }
  try {
    for (const harness of import_preamble.HARNESSES) {
      const text = (0, import_preamble.render)({ harness, cwd: worst });
      for (const slug of slugs) assert.ok(text.includes(slug), `${harness}: worst fixture names ${slug}`);
      assert.ok(text.includes("repo.md"), `${harness}: worst fixture carries the repo.md note`);
      assert.strictEqual((text.match(/^- Ruling: r\d+ /gm) || []).length, 10, `${harness}: the worst fixture renders 10 rulings`);
      assert.ok(text.includes("### Standing rulings recorded in this repository"), `${harness}: the rulings block renders`);
      assert.ok(text.length < 9e3, `${harness}: worst-case render is ${text.length} chars, must be under 9,000`);
      const alone = (0, import_preamble.render)({ harness, cwd: empty });
      assert.ok(alone.length < 3700, `${harness}: the bootstrap alone is ${alone.length} chars, must be under 3,700`);
      assert.strictEqual(
        (text.match(/^## .*$/m) || [""])[0],
        "## Invoking a lane is not optional",
        `${harness}: the opening imperative is the first section`
      );
      assert.ok(
        text.startsWith(`# fx

${INTRO}

---

## Invoking a lane is not optional
`),
        `${harness}: the fixed intro is the only text above the opening imperative`
      );
      assert.match(text, /across 111 subagents/, `${harness}: the 111-subagents marker is present`);
      assert.match(text, /26 patterns with examples/, `${harness}: the 26-patterns marker is present`);
      assert.match(text, /Each lane's description says when it applies/, `${harness}: the bootstrap points at the descriptions`);
      assert.ok(
        !/^## (Routing|The ladder|Prose|Non-negotiables)$/m.test(text),
        `${harness}: a bootstrap, not a router: rules live in the lanes`
      );
      if (harness !== "claude-code") assert.ok(!text.replaceAll("$fx:", "").includes("fx:"), `${harness}: no Claude Code addressing (fx:) leaks through (Codex's own $fx: form aside)`);
    }
    fs.writeFileSync(path.join(worst, ".fx.json"), JSON.stringify({ companions: "c".repeat(400) }));
    for (const harness of import_preamble.HARNESSES) {
      const text = (0, import_preamble.render)({ harness, cwd: worst });
      assert.ok(text.includes("c".repeat(299) + "\u2026"), `${harness}: the custom line is capped`);
      assert.ok(text.length < 9e3, `${harness}: worst case with a 300-character custom line is ${text.length} chars`);
    }
    fs.rmSync(path.join(worst, ".fx.json"));
    const hook = path.join(__dirname, "..", "hooks", "fx-context.js");
    const payload = JSON.stringify({ hook_event_name: "SubagentStart", cwd: worst });
    const out = JSON.parse(execFileSync2("node", [hook], { input: payload, encoding: "utf8", env: hookEnv.env })).hookSpecificOutput;
    assert.strictEqual(out.hookEventName, "SubagentStart");
    assert.strictEqual(out.additionalContext, (0, import_preamble.render)({ harness: "claude-code", cwd: worst, subagent: true }), "the hook prints the whole render, without the plans block");
    const sessionPayload = JSON.stringify({ hook_event_name: "SessionStart", cwd: worst });
    const sessionOut = JSON.parse(execFileSync2("node", [hook], { input: sessionPayload, encoding: "utf8", env: hookEnv.env })).hookSpecificOutput;
    assert.strictEqual(sessionOut.hookEventName, "SessionStart");
    assert.strictEqual(sessionOut.additionalContext, (0, import_preamble.render)({ harness: "claude-code", cwd: worst }), "the hook prints the whole render, with the plans block");
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "fx-bare-"));
    try {
      fs.cpSync(__dirname, path.join(bare, "lib"), { recursive: true });
      fs.cpSync(path.dirname(hook), path.join(bare, "hooks"), { recursive: true });
      const said = JSON.parse(execFileSync2(
        "node",
        [path.join(bare, "hooks", "fx-context.js")],
        // ts-gate-ok: the test parses output it just produced
        { input: payload, encoding: "utf8", env: hookEnv.env }
      )).hookSpecificOutput.additionalContext;
      assert.match(said, /PREAMBLE\.md could not be read/, "the unreadable preamble is reported");
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(worst, { recursive: true, force: true });
    fs.rmSync(empty, { recursive: true, force: true });
  }
  const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "hooks", "hooks.json"), "utf8")).hooks;
  for (const ev of ["SessionStart", "SubagentStart"]) {
    const cmds = (hooks[ev] ?? []).flatMap((g) => g.hooks.map((h) => h.command)).filter((c) => c.includes("fx-context.js"));
    assert.strictEqual(cmds.length, 1, `${ev}: exactly one fx-context.js handler, found ${cmds.length}`);
    assert.ok(!cmds[0]?.includes("--part"), `${ev}: the handler prints the whole render`);
  }
  const lib = require("./preamble");
  assert.strictEqual(lib.renderParts, void 0, "the split machinery is gone");
  assert.strictEqual(lib.partForHandler, void 0, "the split machinery is gone");
  console.log("one hook: passed");
}
{
  const src = fs.readFileSync(path.join(__dirname, "..", "PREAMBLE.md"), "utf8");
  const openingLine = src.split("\n").find((l) => l.startsWith("## Invoking a lane is not optional"));
  assert.ok(openingLine, "PREAMBLE.md still opens with its canonical sentence");
  for (const harness of import_preamble.HARNESSES) {
    const count = (0, import_preamble.render)({ harness }).split(openingLine).length - 1;
    assert.strictEqual(count, 1, `${harness}: the opening line appears exactly once, found ${count}`);
  }
  console.log("literal replacement: passed");
}
{
  const { render: render2 } = require("./preamble");
  const cx2 = render2({ harness: "codex" });
  const cc2 = render2({ harness: "claude-code" });
  const oc2 = render2({ harness: "opencode" });
  for (const [h, t] of [["codex", cx2], ["claude-code", cc2], ["opencode", oc2]]) {
    assert.ok(!t.includes("{{DISPATCH}}"), `${h}: the dispatch placeholder is filled`);
  }
  assert.ok(cx2.includes("spawn_agent"), "Codex names its dispatch tool");
  assert.ok(/\bagent_type\b/.test(cx2), "Codex is told to pass agent_type");
  assert.ok(cx2.includes("fx-lens-security"), "Codex names a role the way agent_type takes it");
  for (const [h, t] of [["claude-code", cc2], ["opencode", oc2]]) {
    assert.ok(!/\bagent_type\b/.test(t) && !t.includes("spawn_agent"), `${h} gets its own wording, not Codex's`);
  }
  assert.ok(cc2.includes("fx:fx-lens-security"), "Claude Code names the agent with the plugin prefix");
  assert.ok(oc2.includes("fx-lens-security") && !oc2.includes("fx:fx-lens-security"), "opencode names it bare");
  const opening = (t) => t.split("\n")[0];
  assert.strictEqual(opening(cx2), opening(cc2), "nothing is added above the opening imperative");
  console.log("dispatch wording: passed");
}
{
  const cx2 = (0, import_preamble.render)({ harness: "codex" });
  assert.ok(!/Never\s+`?Read`?\s+a\s+`?SKILL\.md/i.test(cx2), "codex must not forbid reading SKILL.md");
  assert.match(cx2, /by reading the lane's `SKILL\.md` in full/, "codex is told to read the lane's SKILL.md in full");
  assert.ok(!/the `\$name` form/.test(cx2), "codex is not told to invoke with the user-only $name syntax");
  for (const harness of ["claude-code", "opencode"]) {
    assert.match((0, import_preamble.render)({ harness }), /Never `Read` a `SKILL\.md`/, `${harness}: the never-read rule stays where a Skill tool exists`);
  }
  for (const harness of import_preamble.HARNESSES) {
    const t = (0, import_preamble.render)({ harness });
    assert.ok(!/[.,]\s*[.,]/.test(t.replace(/\.\.\./g, "")), `${harness}: doubled punctuation`);
    assert.ok(!/\*\*Invoke[^*]*\*\* [a-z]/.test(t), `${harness}: the sentence after the bold lead starts in lower case`);
  }
  console.log("codex lane loading: passed");
}
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-planlane-"));
  fs.mkdirSync(path.join(d, "docs", "plans", "2026-01-01-x", "tasks"), { recursive: true });
  fs.writeFileSync(path.join(d, "docs", "plans", "2026-01-01-x", "tasks", "01-a.md"), "# a\n");
  try {
    assert.match((0, import_preamble.render)({ harness: "claude-code", cwd: d }), /`fx:fx-implement` owns this/);
    assert.match((0, import_preamble.render)({ harness: "codex", cwd: d }), /`\$fx:fx-implement` owns this/);
    assert.match((0, import_preamble.render)({ harness: "opencode", cwd: d }), /`fx-implement` owns this/);
    assert.match((0, import_preamble.render)({ harness: "claude-code", cwd: d }), /re-enter `fx:fx-implement`/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
  console.log("plan-state lane name: passed");
}
{
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "fx-preamble-sub-"));
  fs.mkdirSync(path.join(dir2, "docs", "plans", "p1", "tasks"), { recursive: true });
  fs.writeFileSync(path.join(dir2, "docs", "plans", "p1", "tasks", "01-a.md"), "# a\n");
  try {
    for (const harness of import_preamble.HARNESSES) {
      const session = (0, import_preamble.render)({ harness, cwd: dir2 });
      const sub = (0, import_preamble.render)({ harness, cwd: dir2, subagent: true });
      assert.match(session, /Unfinished plans in this repository/, `${harness}: a session still gets the plans block`);
      assert.doesNotMatch(sub, /Unfinished plans in this repository/, `${harness}: a subagent does not`);
      assert.ok(sub.startsWith(`# fx

${INTRO}

---

## Invoking a lane is not optional
`), `${harness}: subagent bootstrap intact`);
      assert.match(sub, /across 111 subagents/, `${harness}: subagent keeps the 111 marker`);
      assert.strictEqual(
        sub,
        (0, import_preamble.render)({ harness, cwd: fs.mkdtempSync(path.join(os.tmpdir(), "fx-empty-")) }),
        `${harness}: a subagent render equals the no-plans render`
      );
    }
  } finally {
    fs.rmSync(dir2, { recursive: true, force: true });
  }
  console.log("subagent skips plans block: passed");
}
{
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "fx-companions-"));
  for (const harness of import_preamble.HARNESSES) {
    for (const subagent of [false, true]) {
      const text = (0, import_preamble.render)({ harness, cwd: dir2, subagent });
      assert.ok(text.includes("Companion tools."), `${harness}${subagent ? " subagent" : ""}: default line present`);
      for (const tool of ["semble", "repowise", "ponytail", "caveman", "fx-humanize"]) {
        assert.ok(text.includes(tool), `${harness}: the line names ${tool}`);
      }
      const line = text.slice(text.indexOf("Companion tools."));
      assert.ok(line.indexOf("semble") < line.indexOf("repowise"), `${harness}: semble comes first, repowise is the fallback`);
    }
  }
  fs.writeFileSync(path.join(dir2, ".fx.json"), JSON.stringify({ companions: "Use tool X." }));
  let t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(t.includes("This repository's .fx.json adds: Use tool X.") && !t.includes("Companion tools."), "a string replaces the default, framed as repo content");
  fs.writeFileSync(path.join(dir2, ".fx.json"), JSON.stringify({ companions: "z".repeat(500) }));
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  const m = t.match(/adds: (z+…?)/);
  assert.ok(m && m[1]?.length === 300 && m[1].endsWith("\u2026"), "a custom line is capped at 300 characters with an ellipsis");
  fs.writeFileSync(path.join(dir2, ".fx.json"), JSON.stringify({ companions: "Use tool X." }));
  fs.writeFileSync(path.join(dir2, ".fx.json"), JSON.stringify({ companions: "" }));
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(!t.includes("Companion tools.") && !t.includes("Use tool X."), "an empty string turns it off");
  fs.writeFileSync(path.join(dir2, ".fx.json"), "{ not json");
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(t.includes("Companion tools."), "unparseable .fx.json falls back to the default");
  fs.rmSync(path.join(dir2, ".fx.json"));
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(t.includes("Companion tools.") && !t.includes("could not be read"), "a missing .fx.json renders the default with no sentence");
  fs.writeFileSync(path.join(dir2, ".fx.json"), "{ not json");
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.match(t, /Companion tools\..*\(\.fx\.json could not be read: not valid JSON; this is the default companions line, and any override there is not applied\.\)/s, "bad JSON renders the default plus the warning sentence");
  fs.writeFileSync(path.join(dir2, ".fx.json"), "hunter2-secret { nope");
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(!t.includes("hunter2") && t.includes("could not be read: not valid JSON;"), "a parse failure never quotes the file");
  fs.rmSync(path.join(dir2, ".fx.json"));
  fs.mkdirSync(path.join(dir2, ".fx.json"));
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(t.includes("Companion tools.") && t.includes("could not be read: EISDIR;"), "a directory named .fx.json (EISDIR) renders the default plus the warning");
  fs.rmdirSync(path.join(dir2, ".fx.json"));
  fs.writeFileSync(path.join(dir2, ".fx.json"), JSON.stringify({ companions: 42 }));
  t = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
  assert.ok(t.includes("Companion tools."), "a non-string value falls back to the default");
  fs.rmSync(dir2, { recursive: true, force: true });
  console.log("companions line: passed");
}
{
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "fx-glossary-render-"));
  (0, import_child_process.execFileSync)("git", ["init", "-q"], { cwd: dir2 });
  fs.writeFileSync(path.join(dir2, "CONTEXT.md"), "# c\n");
  try {
    const session = (0, import_preamble.render)({ harness: "claude-code", cwd: dir2 });
    assert.match(session.trimEnd().split("\n").pop() ?? "", /^This repository's glossary is still named CONTEXT\.md\./);
    assert.doesNotMatch((0, import_preamble.render)({ harness: "claude-code", cwd: dir2, subagent: true }), /still named/);
  } finally {
    fs.rmSync(dir2, { recursive: true, force: true });
  }
  console.log("glossary notice: passed");
}
console.log("preamble.test.js: OK");
{
  const cx2 = (0, import_preamble.render)({ harness: "codex" });
  assert.ok(!cx2.includes("before reading a single file"), "codex does not tell the model to invoke before reading any file");
  assert.ok(cx2.includes("That `SKILL.md` is the first file you read, before any\nfile in the repository."), "codex says the lane file is the first read");
  const m = /`([^`]*\/skills\/fx-brainstorm\/SKILL\.md)`/.exec(cx2);
  assert.ok(m, "codex names the fx-brainstorm SKILL.md path");
  const lanePath = m[1];
  assert.ok(path.isAbsolute(lanePath), `the lane path is absolute: ${lanePath}`);
  assert.ok(fs.existsSync(lanePath), `the named lane file exists: ${lanePath}`);
  assert.ok(cx2.includes("`$fx:fx-tdd`") && cx2.includes("The user types a lane as"), "codex keeps $fx:fx-tdd as the user syntax");
  for (const harness of import_preamble.HARNESSES) {
    const t = (0, import_preamble.render)({ harness });
    assert.strictEqual(t.split("\n")[0], "# fx", `${harness}: first line is unchanged`);
    assert.ok(!t.includes("{{"), `${harness}: no unrendered slot`);
  }
  for (const harness of ["claude-code", "opencode", "opencode-v2"]) {
    assert.ok((0, import_preamble.render)({ harness }).includes("including before\na clarifying question and before reading a single file."), `${harness}: ordering clause unchanged`);
  }
  console.log("codex ordering and paths: passed");
}
