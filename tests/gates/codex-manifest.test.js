// generated from src/tests/gates/codex-manifest.test.ts by scripts/build: edit there, not here
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
var import_hook_env = require("../helpers/hook-env.js");
const root = path.join(__dirname, "..", "..");
const testCodexHome = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-manifest-home-"));
const scratch = (0, import_hook_env.scratchHookEnv)();
process.on("exit", () => scratch.cleanup());
const testEnv = { ...scratch.env, CODEX_HOME: testCodexHome, TMPDIR: testCodexHome };
const codex = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
const claude = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
assert.strictEqual(codex.hooks, "./hooks.json", "the Codex manifest names its own hooks file");
const cxHooks = JSON.parse(fs.readFileSync(path.join(root, "hooks.json"), "utf8")).hooks;
const groupsOf = (ev) => {
  const groups = cxHooks[ev];
  if (groups === void 0) throw new Error(`hooks.json wires no ${ev}`);
  return groups;
};
for (const ev of ["SessionStart", "SubagentStart", "PreToolUse", "UserPromptSubmit"]) {
  const cmds = groupsOf(ev).flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(cmds.every((c) => c.includes("hooks/fx-codex.js")), `${ev} runs fx-codex.js`);
}
for (const ev of ["SessionStart", "SubagentStart"]) {
  for (const g of groupsOf(ev)) for (const h of g.hooks) {
    assert.strictEqual(h.additionalContextLimit, 0, `${ev} never truncates the preamble`);
  }
}
for (const ev of ["SessionStart", "SubagentStart", "PreToolUse", "UserPromptSubmit"]) {
  for (const g of groupsOf(ev)) for (const h of g.hooks) {
    assert.ok(!("timeout" in h), `${ev}: an explicit timeout (${h.timeout}s) only shortens Codex's 600s default, and a timed-out Codex hook fails open`);
  }
}
for (const g of groupsOf("SessionStart")) {
  assert.ok(String(g.matcher).split("|").includes("fork"), "SessionStart fires on fork");
}
assert.ok(!("agents" in codex), "no agents key exists in the Codex manifest");
assert.strictEqual(typeof codex.skills, "string", "skills is a single path string");
assert.strictEqual(codex.skills, "./skills/");
assert.strictEqual(codex.version, claude.version, "manifest versions must match");
const cxMarket = JSON.parse(fs.readFileSync(path.join(root, ".agents/plugins/marketplace.json"), "utf8"));
const entry = cxMarket.plugins.find((p) => p.name === "fx");
assert.ok(entry, "fx must be listed in the Codex marketplace");
assert.strictEqual(entry.version, codex.version, "marketplace entry must match the manifest");
const hooks = JSON.parse(fs.readFileSync(path.join(root, "hooks.json"), "utf8"));
assert.ok(hooks.hooks, "events nest under a top-level hooks key");
assert.deepStrictEqual(
  Object.keys(hooks.hooks).sort(),
  ["PostToolUse", "PreToolUse", "SessionStart", "Stop", "SubagentStart", "SubagentStop", "UserPromptSubmit"],
  "the two context events, PreToolUse, UserPromptSubmit for the prompt record, PostToolUse for the stuck-loop tracker, and Stop and SubagentStop for the evidence check"
);
assert.deepStrictEqual(
  hooks.hooks.UserPromptSubmit,
  [{ hooks: [{ type: "command", command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/fx-codex.js"' }] }],
  "UserPromptSubmit runs fx-codex.js with no matcher and no timeout"
);
assert.match(hooks.description, /shell guard/, "the description names the shell guard");
assert.match(hooks.description, /prompt/, "the description names the prompt record");
assert.strictEqual(
  hooks.hooks.PreToolUse[0].matcher,
  "*",
  "PreToolUse matches every tool; fx-codex.js routes internally on tool_name"
);
const links = (0, import_child_process.execFileSync)(
  "bash",
  [
    "-c",
    `git ls-files -s | awk '$1=="120000" {print $4}'`
  ],
  { cwd: root, encoding: "utf8" }
).trim();
assert.strictEqual(links, "", `symlinks are dropped by the Codex installer: ${links}`);
const out = (0, import_child_process.execFileSync)("node", [path.join(root, "hooks/fx-codex.js")], {
  input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }),
  encoding: "utf8",
  env: testEnv
});
const parsed = JSON.parse(out);
const ctx = parsed.hookSpecificOutput.additionalContext;
assert.ok(ctx.includes("$fx:fx-tdd"), "Codex addressing must be rendered");
assert.ok(!ctx.includes("{{"), "no placeholder may survive");
assert.ok(!/(^|[^$])fx:fx-tdd/.test(ctx), "the Claude Code form without its leading $ is not Codex addressing");
const hook = path.join(root, "hooks/fx-codex.js");
const fire = (payload) => (0, import_child_process.spawnSync)("node", [hook], {
  input: JSON.stringify(payload),
  encoding: "utf8",
  env: testEnv
});
const refused = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  tool_name: "Bash",
  tool_input: { command: "git branch -D some-branch" }
});
assert.strictEqual(refused.status, 2, "an absolute must be refused");
assert.ok(refused.stderr.trim().length > 0, "a refusal must state its reason");
const allowed = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  tool_name: "Bash",
  tool_input: { command: "git status" }
});
assert.strictEqual(allowed.status, 0, "a benign command must pass");
assert.strictEqual(allowed.stderr.trim(), "", "a pass must be silent");
const garbage = (0, import_child_process.spawnSync)("node", [hook], { input: "not json", encoding: "utf8", env: testEnv });
assert.strictEqual(garbage.status, 2, "malformed input is refused");
assert.ok(garbage.stderr.trim().length > 0, "and the refusal states its reason");
const other = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  tool_name: "view_image",
  tool_input: {}
});
assert.strictEqual(other.status, 0);
const patch = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  tool_name: "apply_patch",
  tool_input: { file_path: path.join(root, "README.md") }
});
assert.ok(
  patch.status === 0 || patch.status === 2,
  "apply_patch must reach the lane check, not fall through unexamined"
);
function withScratch(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-lane-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
withScratch((scratch2) => {
  const command = "*** Begin Patch\n*** Update File: lib/widget.js\n@@\n-const b = 2;\n+const b = 3;\n*** End Patch";
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "apply_patch",
    tool_input: { command }
  });
  assert.strictEqual(
    result.status,
    2,
    "apply_patch on source code with no docs/plans/*/design.md must be refused"
  );
  assert.ok(
    result.stderr.includes("lib/widget.js"),
    "the reason must name the refused path"
  );
});
withScratch((scratch2) => {
  const command = "*** Begin Patch\n*** Update File: README.md\n@@\n-old\n+new\n*** Update File: lib/widget.js\n@@\n-const b = 2;\n+const b = 3;\n*** End Patch";
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "apply_patch",
    tool_input: { command }
  });
  assert.strictEqual(
    result.status,
    2,
    "a multi-file patch is refused when ANY of its paths is refused"
  );
  assert.ok(
    result.stderr.includes("lib/widget.js"),
    "the reason names the specific offending path"
  );
  assert.ok(
    !result.stderr.includes("README.md"),
    "the reason names the offender, not every path in the patch"
  );
});
withScratch((scratch2) => {
  const command = "*** Begin Patch\n*** Update File: README.md\n*** Move to: lib/renamed.js\n@@\n-old\n+new\n*** End Patch";
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "apply_patch",
    tool_input: { command }
  });
  assert.strictEqual(
    result.status,
    2,
    "the Move-to target is source code with no design doc and must be checked too"
  );
  assert.ok(
    result.stderr.includes("lib/renamed.js"),
    "the reason names the Move-to path"
  );
});
withScratch((scratch2) => {
  const command = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Add File: src/duration.js\n+x\n*** End Patch\nPATCH";
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "Bash",
    tool_input: { command }
  });
  assert.strictEqual(result.status, 2, "a shell apply_patch on source code with no design doc is refused");
  assert.ok(result.stderr.includes("src/duration.js"), "the reason names the path");
  assert.ok(fs.existsSync(path.join(scratch2, ".fx", ".lane-design")), "and the check leaves its marker");
});
const body = (indent) => ["*** Begin Patch", "*** Add File: src/duration.js", "+x", "*** End Patch"].map((l) => indent + l).join("\n");
const SHELL_FORMS = [
  ["bash -c", `bash -c "apply_patch <<'P'
${body("")}
P"`],
  ["sh -lc", `sh -lc 'apply_patch <<P
${body("")}
P'`],
  ["a subshell", `(apply_patch <<'P'
${body("")}
P
)`],
  ["a group", `{ apply_patch <<'P'
${body("")}
P
}`],
  ["a command substitution", `echo $(apply_patch <<'P'
${body("")}
P
)`],
  ["env", `env X=1 apply_patch <<'P'
${body("")}
P`],
  ["time", `time apply_patch <<'P'
${body("")}
P`],
  ["xargs", `printf x | xargs apply_patch <<'P'
${body("")}
P`],
  ["an indented heredoc body", `apply_patch <<-'P'
${body("    ")}
P`]
];
for (const [what, command] of SHELL_FORMS) withScratch((scratch2) => {
  const result = fire({ hook_event_name: "PreToolUse", cwd: scratch2, tool_name: "Bash", tool_input: { command } });
  assert.strictEqual(result.status, 2, `apply_patch through ${what} is lane-checked`);
  assert.ok(result.stderr.includes("src/duration.js"), `${what}: the reason names the path`);
});
withScratch((scratch2) => {
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "Bash",
    tool_input: { command: "apply_patch < /tmp/change.patch" }
  });
  assert.strictEqual(result.status, 0, "advice only: an unreadable patch is allowed");
  assert.match(result.stderr, /lane check could not read the paths of this apply_patch/, "and says so");
});
withScratch((scratch2) => {
  const result = fire({ hook_event_name: "PreToolUse", cwd: scratch2, tool_name: "Bash", tool_input: { command: "grep apply_patch README.md" } });
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stderr.trim(), "", "no notice for a grep");
});
withScratch((scratch2) => {
  const command = "echo '*** Add File: src/duration.js' > notes.txt";
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "Bash",
    tool_input: { command }
  });
  assert.strictEqual(result.status, 0, "a shell command that is not apply_patch is not lane-checked");
});
withScratch((scratch2) => {
  const result = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    tool_name: "apply_patch",
    tool_input: { command: "this is not a patch at all" }
  });
  assert.strictEqual(
    result.status,
    0,
    "a patch with no recognisable file header must be allowed, not wedge the session"
  );
  assert.strictEqual(result.stderr.trim(), "", "a pass must be silent");
});
const lensWrite = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  agent_id: "a1",
  agent_type: "fx-lens-security",
  tool_name: "Bash",
  tool_input: { command: "echo x > evidence.txt" }
});
assert.strictEqual(lensWrite.status, 2, "a lens must not be able to write");
const lensRead = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  agent_id: "a1",
  agent_type: "fx-lens-security",
  tool_name: "Bash",
  tool_input: { command: "grep -rn TODO ." }
});
assert.strictEqual(lensRead.status, 0, "a lens must still be able to read");
const controllerWrite = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  tool_name: "Bash",
  tool_input: { command: "echo x > evidence.txt" }
});
assert.strictEqual(controllerWrite.status, 0, "the controller is not a lens");
const lensPatch = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  agent_id: "a1",
  agent_type: "fx-lens-security",
  tool_name: "apply_patch",
  tool_input: {}
});
assert.strictEqual(lensPatch.status, 2, "apply_patch from a lens must be refused");
const noTypeWrite = fire({
  hook_event_name: "PreToolUse",
  cwd: root,
  agent_id: "a-no-type",
  tool_name: "Bash",
  tool_input: { command: "touch new-file.txt" }
});
assert.strictEqual(
  noTypeWrite.status,
  2,
  "an agent_id with no recorded identity and no agent_type is refused on write"
);
withScratch((scratch2) => {
  const startedAdvocate = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "advocate-1",
    agent_type: "fx-devils-advocate"
  });
  assert.strictEqual(startedAdvocate.status, 0);
  const advocateWrite = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "advocate-1",
    tool_name: "Bash",
    tool_input: { command: "echo x > evidence.txt" }
  });
  assert.strictEqual(
    advocateWrite.status,
    2,
    "fx-devils-advocate is read-only for the same reason the lenses are, and must be refused too"
  );
});
withScratch((scratch2) => {
  const started = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "lens-recorded",
    agent_type: "fx-lens-security"
  });
  assert.strictEqual(started.status, 0, "SubagentStart must not fail the session");
  const write = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "lens-recorded",
    tool_name: "Bash",
    tool_input: { command: "echo x > evidence.txt" }
  });
  assert.strictEqual(write.status, 2, "a recorded lens identity is still refused on write");
  const read = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "lens-recorded",
    tool_name: "Bash",
    tool_input: { command: "grep -rn TODO ." }
  });
  assert.strictEqual(read.status, 0, "a recorded lens identity can still read");
  const startedDefault = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "default-recorded",
    agent_type: "default"
  });
  assert.strictEqual(startedDefault.status, 0);
  const defaultWrite = fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "default-recorded",
    tool_name: "Bash",
    tool_input: { command: "echo x > evidence.txt" }
  });
  assert.strictEqual(defaultWrite.status, 0, "a non-lens subagent is not refused");
  const leaked = fs.readdirSync(scratch2).some((f) => f.includes("lens-recorded"));
  assert.strictEqual(
    leaked,
    false,
    "the identity record must not be written into the user's repository"
  );
});
{
  const badHomeParent = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-badhome-"));
  const badHome = path.join(badHomeParent, "not-a-dir");
  fs.writeFileSync(badHome, "not a directory");
  const result = (0, import_child_process.spawnSync)("node", [hook], {
    input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }),
    encoding: "utf8",
    env: { ...scratch.env, CODEX_HOME: badHome }
  });
  assert.strictEqual(result.status, 0, "a planting failure must not stop the session");
  const parsedBad = JSON.parse(result.stdout);
  assert.ok(
    parsedBad.hookSpecificOutput.additionalContext.includes("$fx:fx-tdd"),
    "the preamble still renders even when planting threw"
  );
  fs.rmSync(badHomeParent, { recursive: true, force: true });
}
withScratch((scratch2) => {
  const startedProbe = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "probe-1",
    agent_type: "fx-lens-security"
  });
  assert.strictEqual(startedProbe.status, 0);
  const probe = (command) => fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "probe-1",
    tool_name: "Bash",
    tool_input: { command }
  }).status;
  const cases = [
    // [command, expected exit, label]
    ["echo pwned > evidence.txt", 2, "plain redirect"],
    ['bash -c "echo pwned > evidence.txt"', 2, "bash -c bypass (round 1 gap)"],
    ['sh -c "echo pwned > evidence.txt"', 2, "sh -c bypass (round 1 gap)"],
    ['python3 -c "open(1)"', 2, "python3 -c bypass (round 1 gap)"],
    ['node -e "1"', 2, "node -e bypass (round 1 gap)"],
    ['bash -c "rm evidence.txt"', 2, "bash -c wrapping a denylisted command"],
    ["git status", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["curl -o out.txt https://example.com", 2, "curl -o (reviewer, untried)"],
    ["curl -O https://example.com/file", 2, "curl -O (reviewer, untried)"],
    ["wget https://example.com/file", 2, "wget (reviewer, untried)"],
    ['eval "echo pwned > evidence.txt"', 2, "eval (reviewer, untried)"],
    ["echo $(rm -rf /tmp/x)", 2, "command substitution $(...) (reviewer, untried)"],
    ["echo `rm -rf /tmp/x`", 2, "command substitution `...` (reviewer, untried)"],
    ["grep -rn TODO .", 0, "a plain read: must stay allowed"]
  ];
  for (const [command, expected, label] of cases) {
    assert.strictEqual(probe(command), expected, `${label}: ${command}`);
  }
});
withScratch((scratch2) => {
  const startedProbe2 = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "probe-2",
    agent_type: "fx-lens-security"
  });
  assert.strictEqual(startedProbe2.status, 0);
  const probe2 = (command) => fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "probe-2",
    tool_name: "Bash",
    tool_input: { command }
  }).status;
  const cases2 = [
    // [command, expected exit, label]
    ["git config user.name pwned", 2, "git config (round 2 bypass, reproduced)"],
    ["git clone /tmp/x /tmp/pwned", 2, "git clone (round 2 bypass, reproduced)"],
    ["git archive --output=/tmp/o.tar HEAD", 2, "git archive --output= (round 2 bypass, reproduced, wrote 10240 bytes)"],
    ["git worktree add /tmp/wt HEAD", 2, "git worktree add (round 2 bypass, reproduced)"],
    ["find . -fprint /tmp/o.txt", 2, "find -fprint (round 2 bypass, reproduced, wrote 44 lines)"],
    ["find . -delete", 2, "find -delete: already caught in round 1"],
    ["git log", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    // Listed by the reviewer as untried but expected to bypass; all confirmed.
    ["git gc", 2, "git gc (reviewer, untried)"],
    ["git reflog expire", 2, "git reflog expire (reviewer, untried)"],
    ["git update-ref refs/heads/x HEAD", 2, "git update-ref (reviewer, untried)"],
    ["git symbolic-ref HEAD", 2, "git symbolic-ref (reviewer, untried)"],
    ["git notes add", 2, "git notes (reviewer, untried)"],
    ["git replace", 2, "git replace (reviewer, untried)"],
    ["git commit-tree", 2, "git commit-tree (reviewer, untried)"],
    ["git hash-object -w file.txt", 2, "git hash-object -w (reviewer, untried)"],
    ["git submodule add /tmp/x sub", 2, "git submodule add (reviewer, untried)"],
    ["git credential approve", 2, "git credential approve (reviewer, untried)"],
    ["git filter-branch", 2, "git filter-branch (reviewer, untried)"],
    ["git sparse-checkout set x", 2, "git sparse-checkout (reviewer, untried)"],
    ["git maintenance run", 2, "git maintenance (reviewer, untried)"],
    ["git am /tmp/patch", 2, "git am (reviewer, untried)"],
    ["git bundle create /tmp/b.bundle HEAD", 2, "git bundle create (reviewer, untried)"],
    ["git format-patch -1", 2, "git format-patch (reviewer, untried)"],
    ["find . -fls /tmp/o.txt", 2, "find -fls (reviewer, untried)"],
    ["tree -o /tmp/o.txt", 2, "tree -o: tree dropped from ALLOWED_BINARIES entirely"],
    // Reads that must stay allowed.
    ["git log --oneline -5", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["git diff", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["git show HEAD", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["git status", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["grep -rn TODO .", 0, "a plain read: must stay allowed"],
    ['find . -name "*.rb"', 0, "find -name: must stay allowed"],
    ["cat README.md", 0, "cat: must stay allowed"]
  ];
  for (const [command, expected, label] of cases2) {
    assert.strictEqual(probe2(command), expected, `${label}: ${command}`);
  }
});
withScratch((scratch2) => {
  const startedProbe3 = fire({
    hook_event_name: "SubagentStart",
    cwd: scratch2,
    agent_id: "probe-3",
    agent_type: "fx-lens-security"
  });
  assert.strictEqual(startedProbe3.status, 0);
  const probe3 = (command) => fire({
    hook_event_name: "PreToolUse",
    cwd: scratch2,
    agent_id: "probe-3",
    tool_name: "Bash",
    tool_input: { command }
  }).status;
  const cases3 = [
    ["git diff --output=/tmp/pwned.diff", 2, "--output= on git diff (round 3 bypass, reproduced, wrote 83 bytes)"],
    ["git diff --output /tmp/x", 2, "--output space form on git diff"],
    ["git show --output=/tmp/x", 2, "--output= on git show"],
    ["git log --output=/tmp/x", 2, "--output= on git log"],
    ["git log --oneline -5", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["git diff", 2, "was cleared; task 14 round 5 takes git from read-only agents"],
    ["git status", 2, "was cleared; task 14 round 5 takes git from read-only agents"]
  ];
  for (const [command, expected, label] of cases3) {
    assert.strictEqual(probe3(command), expected, `${label}: ${command}`);
  }
});
fs.rmSync(testCodexHome, { recursive: true, force: true });
console.log("codex lens enforcement: OK");
console.log("codex guard: OK");
