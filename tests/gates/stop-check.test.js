// generated from src/tests/gates/stop-check.test.ts by scripts/build: edit there, not here
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
var import_hook_env = require("../helpers/hook-env.js");
var import_json = require("../../lib/json.js");
const ROOT = path.join(__dirname, "..", "..");
const turn = path.join(ROOT, "hooks", "fx-turn.js");
const context = path.join(ROOT, "hooks", "fx-context.js");
const codex = path.join(ROOT, "hooks", "fx-codex.js");
const reason = (hint) => `[fx] This turn edited files and no check has passed since the last edit. Run ${hint} and report the result before you finish. If you cannot run it, say so plainly.`;
const BLOCK = reason("`make test`");
const MESSAGE = "I changed a.ts but could not run the tests.";
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
async function main() {
  const cleanups = [];
  let n = 0;
  const scratch = (opts = { fxJson: { test_all: "make test" } }) => {
    const e = (0, import_hook_env.scratchHookEnv)();
    cleanups.push(e.cleanup);
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "fx-stop-cwd-"));
    cleanups.push(() => fs.rmSync(cwd, { recursive: true, force: true }));
    if (opts.fxJson !== void 0) fs.writeFileSync(path.join(cwd, ".fx.json"), JSON.stringify(opts.fxJson));
    const session = `s${++n}`;
    const base = { session_id: session, cwd };
    const send = async (file, payload) => {
      const r = await (0, import_hook_env.runHook)(file, { ...base, ...payload }, e.env);
      assert.strictEqual(r.code, 0, r.err);
      return r;
    };
    return { ...e, cwd, session, send };
  };
  const claude = (s) => ({
    start: () => s.send(turn, { hook_event_name: "UserPromptSubmit", prompt: "fix it" }),
    edit: (file, extra = {}) => s.send(turn, { hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: path.join(s.cwd, file) }, tool_response: {}, ...extra }),
    bash: (command, stdout = "") => s.send(turn, { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, tool_response: { stdout, stderr: "" } }),
    stop: (extra = {}) => s.send(turn, { hook_event_name: "Stop", stop_hook_active: false, ...extra })
  });
  const blocked = (out, text = BLOCK) => {
    const o = (0, import_json.parseJson)(out);
    assert.deepStrictEqual(Object.keys(o).sort(), ["decision", "reason"], out);
    assert.strictEqual(get(o, "decision"), "block");
    assert.strictEqual(get(o, "reason"), text);
  };
  try {
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      blocked((await c.stop()).out);
      const log = (0, import_hook_env.readDecisionLog)(s.dirs);
      assert.strictEqual(log.length, 1);
      assert.strictEqual(get(log[0], "event"), "stop");
      assert.strictEqual(get(log[0], "action"), "block");
      assert.strictEqual((await c.stop({ stop_hook_active: true })).out, "", "stop_hook_active");
      assert.strictEqual((await c.stop()).out, "", "no new prompt: the journal holds the block");
      await c.start();
      await c.edit("b.ts");
      blocked((await c.stop()).out);
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      await c.bash("make test");
      assert.strictEqual((await c.stop()).out, "", "make test");
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      await c.bash("npm test", "Tests: 3 passed, 3 total");
      assert.strictEqual((await c.stop()).out, "", "a pass summary");
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      await c.bash("make test");
      await c.edit("b.ts");
      blocked((await c.stop()).out);
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("docs/plan.md");
      assert.strictEqual((await c.stop()).out, "", "documentation only");
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      assert.strictEqual((await c.stop()).out, "", "no edits");
    }
    {
      const s = scratch({ fxJson: { hooks: { stop_check: false } } });
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      assert.strictEqual((await c.stop()).out, "", "stop_check false");
    }
    {
      const s = scratch({});
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      blocked((await c.stop()).out, reason("the project's tests"));
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit("a.ts");
      blocked((await c.stop({ last_assistant_message: MESSAGE })).out);
      const log = (0, import_hook_env.readDecisionLog)(s.dirs);
      assert.deepStrictEqual(log.map((l) => [get(l, "source"), get(l, "action")]), [["evidence", "block"]]);
      assert.ok(!JSON.stringify(log).includes(MESSAGE), "the final message is not logged");
    }
    {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await s.send(context, { hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "general-purpose" });
      await c.edit("a.ts", { agent_id: "a1" });
      blocked((await s.send(turn, { hook_event_name: "SubagentStop", agent_id: "a1", stop_hook_active: false })).out);
      assert.strictEqual((await c.stop()).out, "", "the root made no edits");
    }
    const journalText = (s) => fs.readFileSync(path.join(s.dirs.state, "sessions", `${s.session}.jsonl`), "utf8");
    const LONG_PATHS = ["engines/measurement/app/models/measurement/campaign.rb", `src/${"d".repeat(111)}/a.ts`];
    assert.strictEqual(LONG_PATHS[1]?.length, 120);
    for (const file of LONG_PATHS) {
      const s = scratch();
      const c = claude(s);
      await c.start();
      await c.edit(file);
      await c.bash("echo abcdef1234567890abcdef1234567890abcdef12");
      blocked((await c.stop()).out);
      assert.strictEqual((await c.stop()).out, "", `${file}: once`);
      const text = journalText(s);
      assert.ok(text.includes(`"path":"${file}"`), text);
      assert.ok(!text.includes("abcdef1234567890"), "a token in a command stays redacted");
    }
    for (const [label, stub] of [["not a function", "exports.decideStop = 'x';\n"], ["load failure", "throw new Error('stub load failure');\n"]]) {
      for (const [hook, event] of [["fx-turn.js", "Stop"], ["fx-turn.js", "SubagentStop"], ["fx-codex.js", "Stop"], ["fx-codex.js", "SubagentStop"]]) {
        const s = scratch();
        const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fx-stop-copy-"));
        cleanups.push(() => fs.rmSync(copy, { recursive: true, force: true }));
        for (const d of ["hooks", "lib", "codex"]) if (fs.existsSync(path.join(ROOT, d))) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
        fs.writeFileSync(path.join(copy, "lib", "stop-check.js"), stub);
        const r = await (0, import_hook_env.runHook)(path.join(copy, "hooks", hook), { hook_event_name: event, session_id: s.session, cwd: s.cwd, agent_id: "a1", stop_hook_active: false }, s.env);
        const where = `${label} ${hook} ${event}`;
        assert.strictEqual(r.code, 0, `${where}: ${r.err}`);
        assert.strictEqual(r.out, "", where);
        const log = (0, import_hook_env.readDecisionLog)(s.dirs);
        assert.strictEqual(log.length, 1, `${where}: one log line`);
        assert.strictEqual(get(log[0], "event"), "stop", where);
        assert.strictEqual(get(log[0], "action"), "allow", where);
        assert.strictEqual(get(log[0], "source"), "stop-error", where);
        assert.ok(String(get(log[0], "unavailable")).length > 0, where);
      }
    }
    const PATCH = "*** Begin Patch\n*** Update File: a.ts\n@@\n-a\n+b\n*** End Patch";
    const cx = (s) => ({
      start: () => s.send(codex, { hook_event_name: "UserPromptSubmit", turn_id: "t", prompt: "fix it" }),
      patch: () => s.send(codex, { hook_event_name: "PostToolUse", turn_id: "t", tool_name: "apply_patch", tool_input: { command: PATCH }, tool_response: "Success" }),
      bash: (response) => s.send(codex, { hook_event_name: "PostToolUse", turn_id: "t", tool_name: "Bash", tool_input: { command: "make test" }, tool_response: response }),
      stop: (active = false) => s.send(codex, { hook_event_name: "Stop", turn_id: "t", stop_hook_active: active, last_assistant_message: null })
    });
    {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await c.patch();
      blocked((await c.stop()).out);
      assert.strictEqual((await c.stop(true)).out, "", "codex: stop_hook_active");
    }
    {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await c.patch();
      await c.bash("Exit code: 0\nOutput:\nok");
      assert.strictEqual((await c.stop()).out, "", "codex: a passing check");
    }
    {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await c.patch();
      await c.bash("no code");
      blocked((await c.stop()).out);
    }
    {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await c.patch();
      assert.strictEqual((await c.stop(true)).out, "", "codex: active flag first");
    }
    {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await s.send(codex, { hook_event_name: "SubagentStart", turn_id: "t", agent_id: "a1", agent_type: "general-purpose" });
      await s.send(codex, { hook_event_name: "PostToolUse", turn_id: "t", agent_id: "a1", tool_name: "apply_patch", tool_input: { command: PATCH }, tool_response: "Success" });
      const sub = () => s.send(codex, { hook_event_name: "SubagentStop", turn_id: "t", agent_id: "a1", agent_type: "general-purpose", stop_hook_active: false, last_assistant_message: null });
      blocked((await sub()).out);
      assert.strictEqual((await sub()).out, "", "codex SubagentStop: once");
      assert.strictEqual((await c.stop()).out, "", "codex: the root made no edits");
    }
    for (const file of LONG_PATHS) {
      const s = scratch();
      const c = cx(s);
      await c.start();
      await s.send(codex, { hook_event_name: "PostToolUse", turn_id: "t", tool_name: "apply_patch", tool_input: { command: PATCH.replace("a.ts", file) }, tool_response: "Success" });
      blocked((await c.stop()).out);
      assert.strictEqual((await c.stop()).out, "", `codex ${file}: once`);
      assert.ok(journalText(s).includes(`"path":"${file}"`), journalText(s));
    }
  } finally {
    for (const f of cleanups) f();
  }
  console.log("stop-check.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
