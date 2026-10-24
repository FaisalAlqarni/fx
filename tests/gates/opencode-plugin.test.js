// generated from src/tests/gates/opencode-plugin.test.ts by scripts/build: edit there, not here
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
var os = __toESM(require("os"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_plant_roles = require("../../lib/plant-roles.js");
var import_user_invoked_lanes = require("../../lib/user-invoked-lanes.js");
var import_opencode_commands = require("../../lib/opencode-commands.js");
var import_hook_env = require("../helpers/hook-env.js");
const loadFx = async (file) => (await import(file)).fx;
const agentOf = (c, name) => {
  const a = c.agent?.[name];
  if (a === void 0) throw new Error(`no agent ${name} in the config`);
  return a;
};
const permOf = (c, name) => {
  const p = agentOf(c, name).permission;
  if (typeof p !== "object") throw new Error(`agent ${name} has no permission block`);
  return p;
};
const skillBlock = (c) => {
  const skill = typeof c.permission === "object" ? c.permission.skill : void 0;
  return typeof skill === "object" ? skill : void 0;
};
const skillRule = (c, name) => skillBlock(c)?.[name];
const root = path.join(__dirname, "..", "..");
assert.ok(!fs.existsSync(path.join(root, "plugins", "fx.js")), "the v1 plugin source is named for its runtime");
assert.ok(fs.existsSync(path.join(root, "plugins", "fx-opencode-v1.js")), "plugins/fx-opencode-v1.js exists");
const scratchEnv = (0, import_hook_env.applyScratchEnv)();
(async () => {
  const fx = await loadFx(path.join(root, "plugins", "fx-opencode-v1.js"));
  const hooks = await fx({ directory: root });
  assert.deepStrictEqual(
    Object.keys(hooks).sort(),
    ["chat.message", "config", "experimental.chat.system.transform", "tool.execute.after", "tool.execute.before"],
    "exactly four hooks, and permission.ask is dead in 1.18.25"
  );
  const config = { subagent_depth: 1 };
  await hooks.config(config);
  const paths = config.skills?.paths;
  assert.strictEqual(paths?.length, 1, "one skills path");
  await hooks.config(config);
  assert.strictEqual(config.skills?.paths.length, 1, "registering twice must not duplicate");
  const registered = import_plant_roles.READ_ONLY_AGENTS.filter((n) => config.agent?.[n]);
  assert.deepStrictEqual(
    registered.sort(),
    [...import_plant_roles.READ_ONLY_AGENTS].sort(),
    "every read-only agent must be registered, including fx-devils-advocate"
  );
  for (const name of registered) {
    const a = agentOf(config, name);
    assert.strictEqual(a.mode, "subagent");
    assert.strictEqual(permOf(config, name).edit, "deny", `${name} must not be able to edit`);
    assert.ok(a.description && a.prompt, `${name} needs a description and a prompt`);
  }
  const wildcard = (input, pattern) => new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "s").test(input);
  const effective = (perm, permission, pattern = "*") => {
    let action = "allow";
    for (const [key, value] of Object.entries(perm)) {
      const pairs = typeof value === "string" ? [["*", value]] : Object.entries(value);
      for (const [p, a] of pairs) {
        if (wildcard(permission, key) && wildcard(pattern, p)) action = a;
      }
    }
    return action;
  };
  const refs = path.join(root, "references");
  for (const name of import_plant_roles.READ_ONLY_AGENTS) {
    const perm = permOf(config, name);
    assert.strictEqual(Object.keys(perm)[0], "*", `${name}: the deny-all rule goes first, since the last match wins`);
    for (const denied of ["webfetch", "websearch", "task", "todowrite", "edit", "bash", "skill", "ctx7_query"]) {
      assert.strictEqual(effective(perm, denied), "deny", `${name} must not use ${denied}`);
    }
    for (const allowed of ["read", "grep", "glob", "list"]) {
      assert.strictEqual(effective(perm, allowed), "allow", `${name} must be able to ${allowed}`);
    }
    assert.strictEqual(
      effective(perm, "external_directory", `${refs}/vocab/*`),
      "allow",
      `${name} must be able to read fx's references`
    );
    assert.strictEqual(
      effective(perm, "external_directory", "/etc/*"),
      "deny",
      `${name} must not read outside the project and fx's references`
    );
  }
  const generalPerm = config.agent?.general?.permission;
  assert.strictEqual(typeof generalPerm === "object" ? generalPerm.task : void 0, "allow", "general can dispatch");
  {
    const user = { agent: { general: { model: "x/y", permission: { task: "ask" } } } };
    await hooks.config(user);
    assert.deepStrictEqual(user.agent.general, { model: "x/y", permission: { task: "ask" } }, "user setting kept");
    const partial = { agent: { general: { model: "x/y", permission: { bash: "ask" } } } };
    await hooks.config(partial);
    assert.deepStrictEqual(
      partial.agent.general,
      { model: "x/y", permission: { bash: "ask", task: "allow" } },
      "task merged into the users general block, nothing else touched"
    );
    const bare = { agent: { general: { permission: "ask" } } };
    await hooks.config(bare);
    assert.strictEqual(bare.agent.general.permission, "ask", "a string permission is left as it was");
    for (const action of ["ask", "deny"]) {
      const wild = { agent: { general: { permission: { "*": action } } } };
      await hooks.config(wild);
      assert.deepStrictEqual(
        wild.agent.general,
        { permission: { "*": action } },
        `a users "*": "${action}" is left as it was`
      );
    }
    const again = JSON.parse(JSON.stringify(config));
    await hooks.config(again);
    assert.deepStrictEqual(again, config, "a second config() run changes nothing");
  }
  assert.ok((config.subagent_depth ?? 0) >= 2, "an implementer must be able to dispatch a reviewer");
  const high = { subagent_depth: 5 };
  await hooks.config(high);
  assert.strictEqual(high.subagent_depth, 5, "never lower a users higher setting");
  const skillRules = Object.keys(skillBlock(config) ?? {});
  assert.strictEqual(skillRules[0], "*", "the broad rule goes first: last match wins");
  assert.strictEqual(skillRule(config, "fx-audit"), "deny");
  {
    const userInvoked = fs.readdirSync(path.join(root, "skills")).filter((n) => {
      const f = path.join(root, "skills", n, "SKILL.md");
      return fs.existsSync(f) && /^disable-model-invocation:\s*true\s*$/m.test(fs.readFileSync(f, "utf8"));
    }).sort();
    assert.strictEqual(userInvoked.length, 5, "five user-invoked lanes");
    assert.deepStrictEqual(
      Object.keys(config.command || {}).sort(),
      userInvoked,
      "one command per user-invoked lane, and nothing else"
    );
    for (const name of userInvoked) {
      assert.strictEqual(skillRule(config, name), "deny", `${name} stays hidden from the model`);
    }
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-install-"));
    try {
      (0, import_child_process.execFileSync)(
        "python3",
        [path.join(root, "scripts", "fx-opencode-install"), "--major", "1", "--dest", dest],
        { stdio: "pipe" }
      );
      for (const name of userInvoked) {
        const file = fs.readFileSync(path.join(dest, "commands", `${name}.md`), "utf8");
        const m = file.match(/^---\ndescription: (".*")\n---\n([\s\S]*)$/);
        assert.ok(m, `${name}: the installer's command has its documented form`);
        const template = (m[2] ?? "").replace(/^<!-- generated by .*-->\n/m, "").split(dest).join(root).trim();
        assert.deepStrictEqual(
          config.command?.[name],
          { description: JSON.parse(m[1] ?? ""), template },
          // ts-gate-ok: the test parses the installer's own quoted description
          `${name}: the plugin registers the text the installer writes`
        );
      }
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    const before2 = JSON.stringify(config.command);
    await hooks.config(config);
    assert.strictEqual(JSON.stringify(config.command), before2, "a second config() run adds no command");
    const mine = { command: { "fx-audit": { template: "mine" } } };
    await hooks.config(mine);
    assert.deepStrictEqual(mine.command["fx-audit"], { template: "mine" }, "an existing command is left alone");
  }
  const out = { system: [] };
  await hooks["experimental.chat.system.transform"]({ model: {} }, out);
  assert.strictEqual(out.system.length, 1);
  assert.ok(out.system[0]?.includes("fx-tdd"));
  assert.ok(!out.system[0]?.includes("fx:fx-tdd"), "no plugin prefix on opencode");
  assert.ok(!out.system[0]?.includes("{{"));
  const scratchDirs = [];
  function freshScratch({ withDesign = false } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-"));
    scratchDirs.push(dir);
    if (withDesign) {
      fs.mkdirSync(path.join(dir, "docs", "plans", "probe"), { recursive: true });
      fs.writeFileSync(path.join(dir, "docs", "plans", "probe", "design.md"), "# design\n");
    }
    return dir;
  }
  const scratch = freshScratch();
  fs.mkdirSync(path.join(scratch, "docs/plans/2026-01-01-probe/tasks"), { recursive: true });
  fs.writeFileSync(path.join(scratch, "docs/plans/2026-01-01-probe/plan.md"), "# probe\n");
  fs.writeFileSync(path.join(scratch, "docs/plans/2026-01-01-probe/tasks/01-probe.md"), "# task\n");
  fs.writeFileSync(path.join(scratch, "repo.md"), "# repo\n");
  const scoped = await fx({ directory: scratch });
  const out2 = { system: [] };
  await scoped["experimental.chat.system.transform"]({ model: {} }, out2);
  assert.ok(out2.system[0]?.includes("repo.md"), "the repo note must reach opencode");
  assert.ok(
    /2026-01-01-probe/.test(out2.system[0] ?? ""),
    "the plan-state block must reach opencode: it never has"
  );
  const before = hooks["tool.execute.before"];
  await assert.rejects(
    () => before({ tool: "bash" }, { args: { command: "git branch -D x" } }),
    /\[fx\]/,
    "an absolute must be refused by throwing"
  );
  await before({ tool: "bash" }, { args: { command: "git status" } });
  const evilCommand = { toString() {
    throw new Error("boom");
  } };
  await assert.rejects(
    () => before({ tool: "bash" }, { args: { command: evilCommand } }),
    /\[fx\]/,
    "a guard evaluation failure must throw rather than allow"
  );
  const scopedBefore = scoped["tool.execute.before"];
  await assert.rejects(
    () => scopedBefore({ tool: "edit" }, { args: { filePath: path.join(scratch, "app.js") } }),
    /\[fx\]/,
    "the lane check must be able to refuse a write, not just be called"
  );
  await scopedBefore({ tool: "edit" }, { args: { filePath: 42 } });
  await scopedBefore({ tool: "edit" }, { args: { filePath: path.join(scratch, "README.md") } });
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    await assert.rejects(
      () => scopedHooks["tool.execute.before"]({ tool: "write" }, { args: { filePath: path.join(dir, "app.js") } }),
      /\[fx\]/,
      "write must be refused the same way edit is"
    );
  }
  {
    const dir = freshScratch({ withDesign: true });
    const scopedHooks = await fx({ directory: dir });
    await scopedHooks["tool.execute.before"]({ tool: "write" }, { args: { filePath: path.join(dir, "app.js") } });
  }
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    const patchText = "*** Begin Patch\n*** Update File: app.js\n*** End Patch\n";
    await assert.rejects(
      () => scopedHooks["tool.execute.before"]({ tool: "apply_patch" }, { args: { patchText } }),
      /\[fx\]/,
      "apply_patch must be refused the same way edit is"
    );
  }
  {
    const dir = freshScratch({ withDesign: true });
    const scopedHooks = await fx({ directory: dir });
    const patchText = "*** Begin Patch\n*** Update File: app.js\n*** End Patch\n";
    await scopedHooks["tool.execute.before"]({ tool: "apply_patch" }, { args: { patchText } });
  }
  {
    const dir = freshScratch();
    const scopedHooks = await fx({ directory: dir });
    const patchText = "*** Begin Patch\n*** Add File: notes.md\n*** Update File: app.js\n*** End Patch\n";
    await assert.rejects(
      () => scopedHooks["tool.execute.before"]({ tool: "apply_patch" }, { args: { patchText } }),
      /app\.js/,
      "a later path in the same patch must still be checked, not just the first"
    );
  }
  {
    const broken = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-broken-"));
    scratchDirs.push(broken);
    for (const d of ["plugins", "lib", "agents", "commands"]) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(broken, "PREAMBLE.md"));
    fs.writeFileSync(path.join(broken, "lib", "plant-roles.js"), "throw new Error('stubbed plant-roles failure');\n");
    const brokenFx = await loadFx(path.join(broken, "plugins", "fx-opencode-v1.js"));
    const bh = await brokenFx({ directory: root });
    const errors = [];
    const realError = console.error;
    console.error = (...a) => errors.push(a.join(" "));
    try {
      await bh.config({});
    } finally {
      console.error = realError;
    }
    assert.ok(errors.some((e) => /plant-roles/.test(e)), "the config failure is reported on stderr");
    const out3 = { system: [] };
    await bh["experimental.chat.system.transform"]({}, out3);
    assert.ok(out3.system.join("\n").includes("stubbed plant-roles failure"), "and the model is told, so it can tell the user");
    await assert.rejects(
      () => bh["tool.execute.before"]({ tool: "bash" }, { args: { command: "git branch -D fx-guard-probe" } }),
      /\[fx\]/,
      "the git guard still refuses"
    );
  }
  for (const [label, body] of [["an empty export", "module.exports = {};\n"], ["a non-function export", "module.exports = { parseOpencodeV1Call: 1 };\n"]]) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-noparse-"));
    scratchDirs.push(d);
    for (const sub of ["plugins", "lib"]) fs.cpSync(path.join(root, sub), path.join(d, sub), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(d, "PREAMBLE.md"));
    fs.writeFileSync(path.join(d, "lib", "opencode-input.js"), body);
    const h = await (await loadFx(path.join(d, "plugins", "fx-opencode-v1.js")))({ directory: root });
    await assert.rejects(
      () => h["tool.execute.before"]({ tool: "bash" }, { args: { command: "git status" } }),
      /\[fx\] opencode input parser failed to load \(parseOpencodeV1Call is not a function\)/,
      `${label}: every tool call is refused, naming the missing export`
    );
  }
  {
    const noRefs = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-norefs-"));
    scratchDirs.push(noRefs);
    for (const d of ["plugins", "lib", "agents", "commands", "codex", "skills"]) fs.cpSync(path.join(root, d), path.join(noRefs, d), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(noRefs, "PREAMBLE.md"));
    const nrFx = await loadFx(path.join(noRefs, "plugins", "fx-opencode-v1.js"));
    const nh = await nrFx({ directory: root });
    const errs = [];
    const realError = console.error;
    console.error = (...a) => errs.push(a.join(" "));
    try {
      await nh.config({});
    } finally {
      console.error = realError;
    }
    assert.ok(errs.some((e) => /references/.test(e)), "a missing references directory is reported");
    await assert.rejects(
      () => nh["tool.execute.before"]({ tool: "bash" }, { args: { command: "git branch -D fx-guard-probe" } }),
      /\[fx\]/,
      "and the guard still refuses"
    );
  }
  {
    const breaks = {
      "plant-roles throws": (d) => fs.writeFileSync(path.join(d, "lib", "plant-roles.js"), "throw new Error('stubbed');\n"),
      "an agent file is missing": (d) => fs.rmSync(path.join(d, "agents", "fx-lens-security.md")),
      "references is missing": () => {
      }
    };
    for (const [label, breakIt] of Object.entries(breaks)) {
      const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-deny-"));
      scratchDirs.push(d);
      for (const sub of ["plugins", "lib", "agents", "commands", "codex", "skills"]) fs.cpSync(path.join(root, sub), path.join(d, sub), { recursive: true });
      fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(d, "PREAMBLE.md"));
      if (label !== "references is missing") fs.cpSync(path.join(root, "references"), path.join(d, "references"), { recursive: true });
      breakIt(d);
      const dFx = await loadFx(path.join(d, "plugins", "fx-opencode-v1.js"));
      const dh = await dFx({ directory: root });
      const config2 = {};
      const errs = [];
      const realError = console.error;
      console.error = (...a) => errs.push(a.join(" "));
      try {
        await dh.config(config2);
      } finally {
        console.error = realError;
      }
      assert.ok(errs.length > 0, `${label}: the config step did fail`);
      for (const name of import_user_invoked_lanes.USER_INVOKED_LANES) {
        assert.strictEqual(
          skillRule(config2, name),
          "deny",
          `${label}: ${name} is still hidden from the model`
        );
      }
    }
  }
  {
    const pFx = await loadFx(path.join(root, "plugins", "fx-opencode-v1.js"));
    const ph = await pFx({ directory: root });
    const cases = [
      [{ permission: { skill: "allow" } }, "allow"],
      [{ permission: { skill: "ask" } }, "ask"],
      [{ permission: "allow" }, "allow"]
    ];
    for (const [config2, star] of cases) {
      const label = JSON.stringify(config2);
      const errs = [];
      const realError = console.error;
      console.error = (...a) => errs.push(a.join(" "));
      try {
        await ph.config(config2);
      } finally {
        console.error = realError;
      }
      assert.deepStrictEqual(errs, [], `${label}: the config step does not fail`);
      assert.strictEqual(skillRule(config2, "*"), star, `${label}: the user's rule is kept as "*"`);
      for (const name of import_user_invoked_lanes.USER_INVOKED_LANES) {
        assert.strictEqual(skillRule(config2, name), "deny", `${label}: ${name} is hidden`);
      }
      if (label === '{"permission":"allow"}') assert.strictEqual(typeof config2.permission === "object" ? config2.permission["*"] : void 0, "allow", 'the whole-block rule is kept as "*"');
    }
  }
  {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-cmd-"));
    scratchDirs.push(bad);
    for (const d of ["commands", "skills", "references", "agents"]) fs.cpSync(path.join(root, d), path.join(bad, d), { recursive: true });
    fs.writeFileSync(path.join(bad, "commands", "fx-broken.md"), "no frontmatter here\n");
    assert.throws(() => (0, import_opencode_commands.opencodeCommands)(bad, bad), /fx-broken\.md/, "a malformed command is an error naming it");
    fs.rmSync(path.join(bad, "commands", "fx-broken.md"));
    const skill = path.join(bad, "skills", "fx-audit", "SKILL.md");
    fs.writeFileSync(skill, fs.readFileSync(skill, "utf8").replace(/^---\n/, ""));
    assert.throws(() => (0, import_opencode_commands.opencodeCommands)(bad, bad), /fx-audit/, "a malformed SKILL.md is an error naming it");
  }
  for (const dir of scratchDirs) fs.rmSync(dir, { recursive: true, force: true });
  scratchEnv.restore();
  console.log("opencode-plugin.test.js: OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
