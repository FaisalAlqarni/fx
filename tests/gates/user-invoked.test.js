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
assert.deepStrictEqual(HIDDEN, ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-pr", "fx-retro", "fx-setup", "fx-what"], "eight lanes are user-invoked");
assert.deepStrictEqual(
  [...import_user_invoked_lanes.USER_INVOKED_LANES].sort(),
  HIDDEN,
  "the opencode plugins hide exactly the lanes whose frontmatter says disable-model-invocation"
);
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
console.log("user-invoked.test.js: OK");
