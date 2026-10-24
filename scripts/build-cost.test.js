// generated from src/scripts/build-cost.test.ts by scripts/build: edit there, not here
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
const BIN = path.join(__dirname, "build-cost");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-build-cost-"));
const usage = (ctx, out) => ({ input_tokens: 0, cache_read_input_tokens: ctx, cache_creation_input_tokens: 0, output_tokens: out });
const asst = (t, req, ctx, content) => ({
  type: "assistant",
  timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, t)).toISOString(),
  requestId: req,
  message: { model: "claude-sonnet-5", usage: usage(ctx, 10), content }
});
const write = (file, recs) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r2) => JSON.stringify(r2)).join("\n") + "\n");
};
const bash = (cmd) => ({ type: "tool_use", name: "Bash", input: { command: cmd } });
const ctl = path.join(root, "s1.jsonl");
write(ctl, [
  { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "go" } },
  asst(1, "r1", 1e3, [{ type: "text", text: "thinking" }]),
  asst(1, "r1", 1e3, [bash("echo 'Task 01: complete (commits a..b, review clean)' >> state.md")]),
  asst(20, "q1", 2e3, [bash("grep 'Task 03: complete (commits' state.md")]),
  asst(25, "q2", 2500, [bash("echo 'Task 02: fix round 1/5 (2 addressed)' >> state.md; echo 'Task 02: fix round 2/5 (clean)' >> state.md")]),
  asst(30, "r2", 3e3, [bash("echo 'Task 02: complete (commits b..c, review clean)' >> state.md")]),
  { type: "assistant", timestamp: "2026-01-01T00:01:00.000Z", message: { id: "m3", usage: usage(5e3, 10), content: [bash("echo 'Task 03: complete (commits c..d, review clean)' >> state.md")] } }
]);
write(path.join(root, "s1", "subagents", "a.jsonl"), [
  { type: "user", timestamp: "2026-01-01T00:00:02.000Z", message: { content: "You are implementing task 01. If this is a fix round, append to the report." } },
  asst(2, "x1", 100, []),
  asst(12, "x2", 200, [])
]);
write(path.join(root, "s1", "subagents", "b.jsonl"), [
  { type: "user", timestamp: "2026-01-01T00:00:13.000Z", message: { content: "You are reviewing one task: 01" } },
  asst(13, "y1", 50, [])
]);
const r = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl, "--json"], { encoding: "utf8" }));
assert.strictEqual(r.controller.calls, 5, "r1 is one call despite two records");
assert.strictEqual(r.controller.tokens, 1010 + 2010 + 2510 + 3010 + 5010);
assert.strictEqual(r.controller.tasksCompleted, 3, "the grep that quotes Task 03 is not a ledger write");
assert.strictEqual(r.controller.ctxGrowthPerTask, (5e3 - 1e3) / 2);
assert.strictEqual(r.controller.fixRounds, 2);
assert.strictEqual(r.subagents.implementer.count, 1);
assert.strictEqual(r.subagents.implementer.tokens, 110 + 210);
assert.strictEqual(r.subagents.implementer.medianMs, 1e4);
assert.strictEqual(r.subagents.reviewer.count, 1);
assert.strictEqual(r.wallClockMs, 6e4);
for (const [label, file] of [["missing", path.join(root, "nope.jsonl")], ["empty", path.join(root, "empty.jsonl")], ["no usage", path.join(root, "nousage.jsonl")]]) {
  if (label === "empty") fs.writeFileSync(file, "");
  if (label === "no usage") write(file, [{ type: "assistant", timestamp: "2026-01-01T00:00:00.000Z", requestId: "z", message: { content: [] } }]);
  const p = (0, import_child_process.spawnSync)(BIN, [file, "--json"], { encoding: "utf8" });
  assert.strictEqual(p.status, 2, `${label}: exits 2`);
  assert.strictEqual(p.stdout, "", `${label}: prints no report`);
  assert.ok(p.stderr.trim().length > 0, `${label}: says why`);
}
{
  const badKeyFile = path.join(root, "badkey.jsonl");
  write(badKeyFile, [
    { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "go" } },
    { type: "assistant", timestamp: "2026-01-01T00:00:01.000Z", message: { usage: usage(10, 10), content: [] } }
  ]);
  const p = (0, import_child_process.spawnSync)(BIN, [badKeyFile, "--json"], { encoding: "utf8" });
  assert.strictEqual(p.status, 2, "no call key: exits 2");
  assert.strictEqual(p.stdout, "", "no call key: prints no report");
  assert.ok(p.stderr.includes(`${badKeyFile}:2`), "no call key: names the file and line number");
}
{
  const ctl2 = path.join(root, "s2.jsonl");
  write(ctl2, [asst(1, "r1", 100, [{ type: "text", text: "hi" }])]);
  const subDir2 = path.join(root, "s2", "subagents");
  fs.mkdirSync(subDir2, { recursive: true });
  fs.chmodSync(subDir2, 0);
  const p = (0, import_child_process.spawnSync)(BIN, [ctl2, "--json"], { encoding: "utf8" });
  fs.chmodSync(subDir2, 493);
  assert.strictEqual(p.status, 2, "unreadable subagents dir: exits 2");
  assert.strictEqual(p.stdout, "", "unreadable subagents dir: prints no report");
  assert.ok(p.stderr.includes(subDir2), "unreadable subagents dir: names the directory");
}
{
  const ctl3 = path.join(root, "s3.jsonl");
  write(ctl3, [
    { type: "assistant", timestamp: "2026-01-01T00:00:01.000Z", requestId: "r9", message: { content: [{ type: "text", text: "thinking" }] } },
    { type: "assistant", timestamp: "2026-01-01T00:00:01.000Z", requestId: "r9", message: { usage: usage(500, 10), content: [] } }
  ]);
  const r3 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl3, "--json"], { encoding: "utf8" }));
  assert.strictEqual(r3.controller.calls, 1, "usage backfill: still one call");
  assert.strictEqual(r3.controller.tokens, 510, "usage backfill: takes usage from the record that carries it");
}
{
  const ctl4 = path.join(root, "s4.jsonl");
  fs.writeFileSync(ctl4, [
    JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "go" } }),
    "not valid json"
  ].join("\n") + "\n");
  const p = (0, import_child_process.spawnSync)(BIN, [ctl4, "--json"], { encoding: "utf8" });
  assert.strictEqual(p.status, 2, "malformed line: exits 2");
  assert.strictEqual(p.stdout, "", "malformed line: prints no report");
  assert.ok(p.stderr.includes(`${ctl4}:2`), "malformed line: names the file and line number");
}
{
  const ctl5 = path.join(root, "s5.jsonl");
  write(ctl5, [asst(1, "r1", 100, [{ type: "text", text: "hi" }])]);
  const subDir5 = path.join(root, "s5", "subagents");
  fs.mkdirSync(subDir5, { recursive: true });
  fs.writeFileSync(path.join(subDir5, "empty.jsonl"), "");
  const badFile = path.join(subDir5, "noperm.jsonl");
  fs.writeFileSync(badFile, JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "x" } }) + "\n");
  fs.chmodSync(badFile, 0);
  const p = (0, import_child_process.spawnSync)(BIN, [ctl5, "--json"], { encoding: "utf8" });
  fs.chmodSync(badFile, 420);
  assert.strictEqual(p.status, 2, "unreadable subagent file: exits 2");
  assert.strictEqual(p.stdout, "", "unreadable subagent file: prints no report");
  assert.ok(p.stderr.includes(badFile), "unreadable subagent file: names it");
}
{
  const ctl6 = path.join(root, "s6.jsonl");
  write(ctl6, [asst(1, "r1", 100, [{ type: "text", text: "hi" }])]);
  const subDir6 = path.join(root, "s6", "subagents");
  fs.mkdirSync(subDir6, { recursive: true });
  fs.writeFileSync(path.join(subDir6, "empty.jsonl"), "");
  const r6 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl6, "--json"], { encoding: "utf8" }));
  assert.deepStrictEqual(r6.subagents, {}, "empty subagent file: legitimate skip, no error");
}
{
  const ctl7 = path.join(root, "s7.jsonl");
  const teeCmd = "sed -n '/^## Ledger lines/,/^## /p' findings/07-rereview-1.md | grep '^Task ' | tee -a state.md";
  const toolUseId = "toolu_tee7";
  const bashBlock = { type: "tool_use", id: toolUseId, name: "Bash", input: { command: teeCmd } };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(ctl7, [
    JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "go" } }),
    JSON.stringify(asst(1, "r1", 1e3, [bashBlock])),
    JSON.stringify({
      type: "user",
      timestamp: "2026-01-01T00:00:02.000Z",
      message: { content: [{ type: "tool_result", tool_use_id: toolUseId, content: "Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)\nTask 07: complete (commits a..b, review clean)" }] },
      toolUseResult: {
        stdout: "Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)\nTask 07: complete (commits a..b, review clean)",
        bashEditDiff: {
          files: [{
            filePath: "/work/docs/plans/x/state.md",
            hunks: [{ oldStart: 10, oldLines: 1, newStart: 10, newLines: 3, lines: [
              " Task 07: file check clean",
              "+Task 07: fix round 1/5 (1 addressed, 0 open: none; commits a..b)",
              "+Task 07: complete (commits a..b, review clean)"
            ] }]
          }]
        }
      }
    }) + "\n"
  ].join("\n") + "\n");
  const r7 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl7, "--json"], { encoding: "utf8" }));
  assert.strictEqual(r7.controller.tasksCompleted, 1, "tee -a copy form: completion line read from the bash edit diff");
  assert.strictEqual(r7.controller.fixRounds, 1, "tee -a copy form: fix round line read from the bash edit diff");
}
{
  const ctl8 = path.join(root, "s8.jsonl");
  write(ctl8, [asst(1, "r1", 100, [{ type: "text", text: "hi" }])]);
  const subDir8 = path.join(root, "s8", "subagents");
  const cases = [
    ["reviewer-a.jsonl", "reviewer", "Your operating rules are the task reviewer template at /x/reviewer-rules.md. Read it in full."],
    ["reviewer-b.jsonl", "reviewer", "Your operating rules are the branch reviewer template at /x/reviewer-rules.md. Read it in full."],
    ["reviewer-c.jsonl", "reviewer", "You are the broad whole-branch reviewer. Your standing instructions are in /x."],
    ["rereview-a.jsonl", "re-review", "Your operating rules are the re-review template at /x/rereview-rules.md. Read it in full."],
    ["rereview-b.jsonl", "re-review", "You are the scoped re-reviewer for task 07, fix round 1. Your standing instructions are the prompt block."],
    ["implementer-fixround.jsonl", "implementer", "You are the implementer for task 07 (Note store), fix round 1 of 5. A previous implementer built it."]
  ];
  for (const [file, , text] of cases) {
    write(path.join(subDir8, file), [
      { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: text } },
      asst(1, `x-${file}`, 10, [])
    ]);
  }
  const r8 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl8, "--json"], { encoding: "utf8" }));
  assert.strictEqual(r8.subagents.reviewer.count, 3, "reviewer wrapper phrasings all classify as reviewer");
  assert.strictEqual(r8.subagents["re-review"].count, 2, "re-review wrapper phrasings all classify as re-review");
  assert.strictEqual(r8.subagents.implementer.count, 1, "fix-round implementer phrasing classifies as implementer");
  assert.ok(!r8.subagents.other, "none of the six wrapper phrasings falls into other");
}
{
  const ctl9 = path.join(root, "s9.jsonl");
  write(ctl9, [
    asst(1, "r1", 1e3, [bash("printf 'Task 01: complete (commits a..b, review clean)\\n' | tee -a docs/plans/x/state.md")]),
    asst(2, "r2", 2e3, [bash("cat >> docs/plans/x/state.md <<'EOF'\nTask 02: fix round 1/5 (1 addressed)\nTask 02: complete (commits b..c, review clean)\nEOF")]),
    asst(3, "r3", 3e3, [bash("printf '%s\\n' 'Task 03: complete (commits c..d, review clean)' >> state.md")]),
    asst(4, "r4", 4e3, [bash("echo 'Task 04: complete (commits d..e, review clean)' | tee --append state.md >/dev/null")]),
    asst(5, "r5", 5e3, [bash("echo 'Task 05: complete (commits e..f, review clean)' | tee state.md.bak")])
  ]);
  const r9 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl9, "--json"], { encoding: "utf8" }));
  assert.strictEqual(r9.controller.tasksCompleted, 4, "tee -a, tee --append, cat >> and printf >> are ledger writes; tee to another file is not");
  assert.strictEqual(r9.controller.fixRounds, 1);
}
{
  const ctl10 = path.join(root, "s10.jsonl");
  write(ctl10, [asst(1, "r1", 100, [{ type: "text", text: "hi" }])]);
  const subDir10 = path.join(root, "s10", "subagents");
  const agents = [
    [
      "agent-a1",
      { agentType: "general-purpose", description: "Final-review fix wave" },
      "You are the implementer for the final-review fix wave. Findings: silent-failure lens, security lens."
    ],
    [
      "agent-a2",
      { agentType: "fx:fx-lens-security", description: "Security lens on task 01" },
      "Review the diff at /x/review/a..b.md and report what you find."
    ],
    [
      "agent-a3",
      { agentType: "fx:fx-lens-silent-failure", description: "Silent-failure lens on branch" },
      "Review the branch diff at /x/review/a..b.md."
    ],
    [
      "agent-a4",
      { agentType: "general-purpose", description: "Spec pass on branch" },
      "Spec review, read-only. Check the security section too."
    ]
  ];
  for (const [id, meta, text] of agents) {
    write(path.join(subDir10, `${id}.jsonl`), [
      { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: text } },
      asst(1, `x-${id}`, 10, [])
    ]);
    fs.writeFileSync(path.join(subDir10, `${id}.meta.json`), JSON.stringify(meta));
  }
  write(path.join(subDir10, "agent-a5.jsonl"), [
    { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { content: "Database lens: review the migration." } },
    asst(1, "x-a5", 10, [])
  ]);
  const r10 = JSON.parse((0, import_child_process.execFileSync)(BIN, [ctl10, "--json"], { encoding: "utf8" }));
  assert.strictEqual(r10.subagents.implementer.count, 1, "the fix-wave implementer is an implementer, not a lens");
  assert.strictEqual(r10.subagents.lens.count, 3, "two lenses by agentType, one by text with no meta file");
  assert.strictEqual(r10.subagents.other.count, 1, "a non-lens agentType never falls into lens on prose alone");
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-task-"));
  const ctlT = path.join(dir, "t1.jsonl");
  const at = (s) => `2026-10-21T10:${s}:00.000Z`;
  const rec = (id, ts, n, content = []) => ({ type: "assistant", timestamp: ts, message: { id, usage: { input_tokens: n, output_tokens: 0 }, content } });
  const user = (ts, text) => ({ type: "user", timestamp: ts, message: { content: text } });
  const ledger = (line) => [{ type: "tool_use", name: "Bash", input: { command: `echo '${line}' >> state.md` } }];
  write(ctlT, [rec("m0", at("00"), 1e3), rec("m1", at("10"), 150, ledger("Task 03: dispatched abc1234")), rec("m2", at("20"), 50)]);
  write(path.join(dir, "t1", "subagents", "impl.jsonl"), [
    user(at("11"), "You are implementing task 03: brief"),
    rec("s1", at("12"), 300, [{ type: "tool_use", name: "Skill", input: { skill: "fx:fx-tdd" } }])
  ]);
  write(path.join(dir, "t1", "subagents", "rev.jsonl"), [user(at("13"), "You are reviewing one task: 03"), rec("s2", at("14"), 200)]);
  write(path.join(dir, "t1", "subagents", "next.jsonl"), [user(at("15"), "You are implementing task 04: next"), rec("s3", at("16"), 9999)]);
  const r2 = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "03", "--since", at("10"), ctlT], { encoding: "utf8" });
  assert.strictEqual(r2.status, 0, r2.stderr);
  assert.strictEqual(r2.stdout, "Task 03: cost 700 tokens, 10 min, 2 dispatches, fx-tdd 1/1\n");
  const none = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "04", "--since", at("10")], { encoding: "utf8", cwd: dir });
  assert.strictEqual(none.status, 0, none.stderr);
  assert.strictEqual(none.stdout, "Task 04: cost unavailable (no transcript recorded)\n");
  fs.mkdirSync(path.join(dir, ".fx"));
  fs.writeFileSync(path.join(dir, ".fx", "transcript-path"), path.join(dir, "gone.jsonl") + "\n");
  const gone = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "04", "--since", at("10")], { encoding: "utf8", cwd: dir });
  assert.strictEqual(gone.stdout, `Task 04: cost unavailable (transcript not found: ${path.join(dir, "gone.jsonl")})
`);
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-fail-"));
  const at = (s) => `2026-10-21T10:${s}:00.000Z`;
  const rec = (id, ts, n) => ({ type: "assistant", timestamp: ts, message: { id, usage: { input_tokens: n, output_tokens: 0 }, content: [{ type: "tool_use", name: "Bash", input: { command: "echo 'Task 05: dispatched abc1234' >> state.md" } }] } });
  const task = (ctlFile) => (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "05", "--since", at("00"), ctlFile], { encoding: "utf8" });
  const c1 = path.join(dir, "a.jsonl");
  write(c1, [rec("m", at("01"), 10)]);
  fs.mkdirSync(path.join(dir, "a", "subagents", "x.jsonl"), { recursive: true });
  const r1 = task(c1);
  assert.strictEqual(r1.status, 0, r1.stderr);
  assert.strictEqual(r1.stdout, `Task 05: cost unavailable (cannot read subagent file: ${path.join(dir, "a", "subagents", "x.jsonl")})
`);
  const c2 = path.join(dir, "b.jsonl");
  write(c2, [rec("m", at("01"), 10)]);
  fs.mkdirSync(path.join(dir, "b"));
  fs.writeFileSync(path.join(dir, "b", "subagents"), "x");
  const r2 = task(c2);
  assert.strictEqual(r2.status, 0, r2.stderr);
  assert.strictEqual(r2.stdout, `Task 05: cost unavailable (cannot read subagents directory ${path.join(dir, "b", "subagents")}: ENOTDIR)
`);
  const c3 = path.join(dir, "c.jsonl");
  write(c3, [{ type: "assistant", message: { id: "m", usage: { input_tokens: 10, output_tokens: 0 }, content: [] } }]);
  const r3 = task(c3);
  assert.strictEqual(r3.status, 0, r3.stderr);
  assert.strictEqual(r3.stdout, `Task 05: cost unavailable (no timestamps in transcript: ${c3})
`);
  const c4 = path.join(dir, "d.jsonl");
  write(c4, [rec("m", at("01"), 10)]);
  fs.mkdirSync(path.join(dir, "d", "subagents"), { recursive: true });
  fs.writeFileSync(path.join(dir, "d", "subagents", "bad.jsonl"), "{not json\n");
  const r4 = task(c4);
  assert.strictEqual(r4.status, 0, r4.stderr);
  assert.strictEqual(r4.stdout, `Task 05: cost unavailable (malformed JSON: ${path.join(dir, "d", "subagents", "bad.jsonl")}:1)
`);
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-own-"));
  const at = (s) => `2026-10-21T10:${s}:00.000Z`;
  const ctlO = path.join(dir, "o.jsonl");
  write(ctlO, [{ type: "assistant", timestamp: at("01"), message: {
    id: "m",
    usage: { input_tokens: 10, output_tokens: 0 },
    content: [{ type: "tool_use", name: "Bash", input: { command: "echo 'Task 03: dispatched abc1234' >> state.md" } }]
  } }]);
  const r2 = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "07", "--since", at("00"), ctlO], { encoding: "utf8" });
  assert.strictEqual(r2.status, 0, r2.stderr);
  assert.strictEqual(r2.stdout, "Task 07: cost unavailable (transcript is another session's)\n");
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-win-"));
  const at = (s) => `2026-10-21T10:${s}:00.000Z`;
  const ledger = (line) => [{ type: "tool_use", name: "Bash", input: { command: `echo '${line}' >> state.md` } }];
  const rec = (id, ts, n, content = []) => ({ type: "assistant", timestamp: ts, message: { id, usage: { input_tokens: n, output_tokens: 0 }, content } });
  const user = (ts, text) => ({ type: "user", timestamp: ts, message: { content: text } });
  const run = (name, endLine, tailLine) => {
    const f = path.join(dir, `${name}.jsonl`);
    write(f, [
      rec("m1", at("10"), 100, ledger("Task 03: dispatched abc1234")),
      rec("m2", at("12"), 100),
      rec("m3", at("14"), 100, ledger(endLine)),
      rec("m4", at("30"), 5e3, tailLine ? ledger(tailLine) : [])
    ]);
    write(path.join(dir, name, "subagents", "in.jsonl"), [user(at("11"), "You are implementing task 03"), rec("s1", at("11"), 300)]);
    write(path.join(dir, name, "subagents", "late.jsonl"), [user(at("20"), "You are reviewing one task: 03"), rec("s2", at("21"), 7e3)]);
    const r2 = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--task", "03", "--since", at("10"), f], { encoding: "utf8" });
    assert.strictEqual(r2.status, 0, r2.stderr);
    return r2.stdout;
  };
  const want = "Task 03: cost 600 tokens, 4 min, 1 dispatches, fx-tdd 0/1\n";
  assert.strictEqual(run("next", "Task 04: dispatched def5678", null), want, "the next task dispatch cuts the window");
  assert.strictEqual(run("done", "Task 03: complete (commits a..b, review clean)", "Task 04: dispatched def5678"), want, "the task completion write cuts the window");
}
{
  const f = path.join(root, "null-ts.jsonl");
  write(f, [
    { type: "assistant", requestId: "a", timestamp: null, message: { usage: usage(1, 0) } },
    asst(50, "b", 1, [])
  ]);
  const out = JSON.parse((0, import_child_process.execFileSync)(BIN, [f, "--json"], { encoding: "utf8" }));
  assert.strictEqual(out.wallClockMs, 176722565e4, "null timestamp counts as the epoch");
  const n = path.join(root, "num.jsonl");
  fs.writeFileSync(n, "5\n");
  const p = (0, import_child_process.spawnSync)(BIN, [n], { encoding: "utf8" });
  assert.strictEqual(p.status, 2);
  assert.ok(p.stderr.includes(`malformed JSON: ${n}:1`), p.stderr);
}
fs.rmSync(root, { recursive: true, force: true });
console.log("build-cost: ok");
