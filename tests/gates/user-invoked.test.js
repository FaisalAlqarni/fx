// generated from src/tests/gates/user-invoked.test.ts by scripts/build: edit there, not here
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
var import_user_invoked_lanes = require("../../lib/user-invoked-lanes.js");
const root = path.join(__dirname, "..", "..");
const frontmatter = (p) => {
  const t = fs.readFileSync(p, "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, `${p} has no frontmatter`);
  return { head: m[1] ?? "", body: m[2] ?? "" };
};
const HIDDEN = fs.readdirSync(path.join(root, "skills")).filter((d) => fs.existsSync(path.join(root, "skills", d, "SKILL.md")) && /^disable-model-invocation:\s*true$/m.test(frontmatter(path.join(root, "skills", d, "SKILL.md")).head)).sort();
assert.deepStrictEqual(HIDDEN, ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-pr", "fx-retro", "fx-setup", "fx-system-flow", "fx-what"], "nine lanes are user-invoked");
assert.deepStrictEqual(
  [...import_user_invoked_lanes.USER_INVOKED_LANES].sort(),
  HIDDEN,
  "the opencode plugins hide exactly the lanes whose frontmatter says disable-model-invocation"
);
{
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  const lanes = fs.readdirSync(path.join(root, "skills")).filter((d) => fs.existsSync(path.join(root, "skills", d, "SKILL.md")) && !HIDDEN.includes(d)).length;
  const said = `${WORDS[lanes - 2] ?? ""} of the ${WORDS[lanes] ?? ""} work on their own`;
  assert.ok(fs.readFileSync(path.join(root, "README.md"), "utf8").toLowerCase().includes(said), `README.md says "${said}"`);
}
for (const plugin of ["fx-opencode-v1.js", "fx-opencode-v2.js"]) {
  assert.ok(!/fx-critique/.test(fs.readFileSync(path.join(root, "plugins", plugin), "utf8")), `${plugin} imports the lane list, it keeps no copy`);
}
for (const name of HIDDEN) {
  const skill = path.join(root, "skills", name, "SKILL.md");
  const { head } = frontmatter(skill);
  assert.ok(
    /^disable-model-invocation:\s*true$/m.test(head),
    `${name}: Claude Code must not auto-select it`
  );
  const sidecar = path.join(root, "skills", name, "agents", "openai.yaml");
  const yaml = fs.readFileSync(sidecar, "utf8");
  assert.ok(
    /allow_implicit_invocation:\s*false/.test(yaml),
    `${name}: Codex must not auto-select it`
  );
}
const deepen = (s) => s.replace(/\.\.\/(references|agents)\//g, "../../$1/");
for (const name of ["fx-critique", "fx-grill", "fx-handoff", "fx-pr", "fx-retro", "fx-setup", "fx-what"]) {
  const cmd = frontmatter(path.join(root, "commands", `${name}.md`));
  const skill = frontmatter(path.join(root, "skills", name, "SKILL.md"));
  assert.strictEqual(
    skill.body.trim(),
    deepen(cmd.body).trim(),
    `${name}: skill body has drifted from the command body`
  );
  assert.ok(
    !/(?<!\.\.\/)\.\.\/(references|agents)\//.test(skill.body),
    `${name}: a one-level citation in a skill body breaks check-paths`
  );
}
{
  const dir = path.join(root, "skills", "fx-system-flow");
  const lane = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
  assert.ok(/^disable-model-invocation:\s*true$/m.test(frontmatter(path.join(dir, "SKILL.md")).head), "fx-system-flow is user-invoked");
  for (const s of [
    "system-flow estimate",
    "system-flow check --fragment",
    "detect --repo",
    "--archify",
    "at most 4",
    "It never commits; the owner runs git.",
    "questions. Answer one at a time, skip, or take the recommended answer for every question."
  ]) {
    assert.ok(lane.includes(s), `fx-system-flow SKILL.md says ${s}`);
  }
  const sidecar = {
    "planning.md": ["filesToRead", "levels", "meta.roots"],
    "area-brief.md": ["level 3", "8 to 12 primary nodes", "context nodes"],
    "fragment-guide.md": ["starts with its area id", "<kind>:<id>"],
    "interview.md": ["Every question carries a recommended answer"],
    "check-and-report.md": ["depth", "planned"]
  };
  for (const [file, needs] of Object.entries(sidecar)) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const s of needs) assert.ok(text.includes(s), `fx-system-flow ${file} says ${s}`);
  }
}
{
  const adr = path.join(root, "skills", "fx-adr", "SKILL.md");
  assert.ok(fs.existsSync(adr), "skills/fx-adr/SKILL.md exists");
  assert.ok(!/^disable-model-invocation:/m.test(frontmatter(adr).head), "fx-adr is model-selectable");
}
{
  const docs = path.join(root, "skills", "fx-docs", "SKILL.md");
  assert.ok(fs.existsSync(docs), "skills/fx-docs/SKILL.md exists");
  assert.ok(!/^disable-model-invocation:/m.test(frontmatter(docs).head), "fx-docs is model-selectable");
}
for (const dir of fs.readdirSync(path.join(root, "skills"))) {
  if (HIDDEN.includes(dir)) continue;
  const p = path.join(root, "skills", dir, "SKILL.md");
  if (!fs.existsSync(p)) continue;
  assert.ok(
    !/^disable-model-invocation:/m.test(frontmatter(p).head),
    `${dir}: only user-invoked lanes are hidden`
  );
}
for (const name of ["fx-critique", "fx-grill", "fx-handoff", "fx-pr", "fx-retro", "fx-setup", "fx-what"]) {
  const cmd = frontmatter(path.join(root, "commands", `${name}.md`));
  const m = cmd.head.match(/^description:[ \t]*(.+)$/m);
  assert.ok(m, `${name}: commands/${name}.md has no single-line description field`);
  const value = (m[1] ?? "").trim();
  const quoted = /^"([^"\\]|\\.)*"$/.test(value) || /^'([^']|'')*'$/.test(value);
  assert.ok(
    !quoted && /: /.test(value),
    `${name}: description has no unquoted colon-space, so Codex's own command-to-skill auto-migration will not skip it, and the lane ships unhidden as source-command-${name}`
  );
}
for (const name of ["fx-critique", "fx-grill", "fx-handoff", "fx-pr", "fx-retro"]) {
  const cmd = frontmatter(path.join(root, "commands", `${name}.md`));
  const m = cmd.head.match(/^argument-hint:[ \t]*(.+)$/m);
  assert.ok(m, `${name}: commands/${name}.md has no argument-hint field`);
  const value = (m[1] ?? "").trim();
  const quoted = /^"([^"\\]|\\.)*"$/.test(value) || /^'([^']|'')*'$/.test(value);
  assert.ok(quoted, `${name}: argument-hint must be a quoted string, got ${value}`);
  const skill = frontmatter(path.join(root, "skills", name, "SKILL.md"));
  const sm = skill.head.match(/^argument-hint:[ \t]*(.+)$/m);
  assert.ok(sm, `${name}: generated skills/${name}/SKILL.md has no argument-hint field`);
  assert.strictEqual(
    (sm[1] ?? "").trim(),
    value,
    `${name}: generated argument-hint has drifted from the command's`
  );
}
{
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8"));
  assert.deepStrictEqual(
    manifest.commands,
    [],
    "the Claude Code manifest declares no command paths, so commands/ is not registered beside the generated skills"
  );
  for (const file of fs.readdirSync(path.join(root, "commands")).filter((f) => f.endsWith(".md"))) {
    const { head } = frontmatter(path.join(root, "commands", file));
    assert.ok(/^disable-model-invocation:\s*true$/m.test(head), `commands/${file}: the model must not invoke it`);
    const name = file.slice(0, -3);
    assert.ok(
      fs.existsSync(path.join(root, "skills", name, "SKILL.md")),
      `commands/${file} has no generated skills/${name}/SKILL.md, so with commands: [] it is unreachable`
    );
  }
}
const pr = fs.readFileSync(path.join(root, "skills", "fx-pr", "SKILL.md"), "utf8");
const prTemplate = fs.readFileSync(path.join(root, "references", "templates", "pr-template.md"), "utf8");
assert.ok(pr.includes("references/templates/pr-template.md"), "fx-pr names its template");
for (const h of ["## What and why", "## Changes", "## Evidence", "## Merge danger"]) assert.ok(prTemplate.includes(`
${h}
`), `the PR template has the ${h} section`);
assert.ok(pr.includes("Never run `git push`"), "fx-pr never pushes");
assert.ok(prTemplate.includes("`Not run:`"), "the PR template ends its evidence with a Not run: line");
const retro = fs.readFileSync(path.join(root, "skills", "fx-retro", "SKILL.md"), "utf8").replace(/\s+/g, " ");
assert.ok(retro.includes("**Citation or drop.**"), "fx-retro drops a candidate without a citation");
assert.ok(
  retro.includes("Never quote a credential, token, key or personal data from a transcript") && retro.includes("`[redacted]`"),
  "fx-retro redacts credentials and personal data"
);
console.log("user-invoked.test.js: OK");
