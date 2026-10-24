// generated from src/tests/review-bench/build-case.test.ts by scripts/build: edit there, not here
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
var import_build_case = require("./build-case.js");
const FX = path.join(__dirname, "..", "..");
const GOOD_DIR = path.join(__dirname, "good");
const CASES_DIR = path.join(__dirname, "cases");
const TRAPS = path.join(FX, "tests/fixture-build/hidden/traps.test.js");
const SEED = path.join(FX, "tests/fixture-build/repo");
const ALL_TRUE = { "path-escape": true, "missing-note-error": true, "readme-example": true, "export-order": true, "search-case": true, "cli-wiring": true };
const EXPECTED = {
  "path-no-check": { ...ALL_TRUE, "path-escape": false },
  "path-dotdot-only": { ...ALL_TRUE, "path-escape": false },
  "missing-returns-empty": { ...ALL_TRUE, "missing-note-error": false },
  "empty-throws": { ...ALL_TRUE, "missing-note-error": false },
  "search-case-sensitive": { ...ALL_TRUE, "search-case": false },
  "search-query-only": { ...ALL_TRUE, "search-case": false },
  "readme-binary": { ...ALL_TRUE, "readme-example": false },
  "cli-inline-search": { ...ALL_TRUE, "cli-wiring": false },
  control: { ...ALL_TRUE }
};
let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    failures++;
    console.error(`not ok - ${name}
  ${e instanceof Error ? e.message : String(e)}`);
  }
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-build-case-"));
for (const caseName of fs.readdirSync(CASES_DIR)) {
  const caseDir = path.join(CASES_DIR, caseName);
  const dest = path.join(root, caseName);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(SEED, dest, { recursive: true });
  const owned = (0, import_build_case.ownedFiles)(path.join(caseDir, "files"));
  test(`${caseName}: owned files match the case's own files/`, () => {
    const expectedOwned = [];
    (function walk(dir, rel) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(path.join(dir, entry.name), childRel);
        else expectedOwned.push(childRel);
      }
    })(path.join(caseDir, "files"), "");
    assert.deepStrictEqual(owned.slice().sort(), expectedOwned.sort());
    assert.strictEqual(owned.length, 2, `each of this bench's cases owns its implementation file and its test file, got ${JSON.stringify(owned)}`);
    assert.ok(owned.some((f) => f.startsWith("test/")), `case ${caseName} must own a test/*.test.js file (review Ruling S)`);
  });
  const ownedTestFile = owned.find((f) => f.startsWith("test/"));
  if (ownedTestFile === void 0) throw new Error(`case ${caseName} must own a test/*.test.js file (review Ruling S)`);
  test(`${caseName}: the owned test file does not exist before the case's own files are overlaid`, () => {
    assert.ok(!fs.existsSync(path.join(dest, ownedTestFile)), `${ownedTestFile} must not exist at base: it is this case's own deliverable`);
  });
  const actualOwned = (0, import_build_case.buildBase)(caseDir, GOOD_DIR, dest);
  test(`${caseName}: base carries every module except the owned file(s)`, () => {
    for (const f of import_build_case.MODULE_FILES) {
      const p = path.join(dest, f);
      if (actualOwned.includes(f)) {
        assert.ok(!fs.existsSync(p), `${f} is this case's own file: must not exist at base`);
      } else {
        assert.ok(fs.existsSync(p), `${f} is not owned by this case: must exist at base`);
        assert.strictEqual(fs.readFileSync(p, "utf8"), fs.readFileSync(path.join(GOOD_DIR, f), "utf8"), `${f} at base must be the good reference verbatim`);
      }
    }
  });
  fs.cpSync(path.join(caseDir, "files"), dest, { recursive: true });
  test(`${caseName}: head contains the owned test file with the case's content`, () => {
    assert.ok(fs.existsSync(path.join(dest, ownedTestFile)), `${ownedTestFile} must exist at head`);
    assert.strictEqual(
      fs.readFileSync(path.join(dest, ownedTestFile), "utf8"),
      fs.readFileSync(path.join(caseDir, "files", ownedTestFile), "utf8")
    );
  });
  test(`${caseName}: head scores the expected trap, and only that one`, () => {
    const out = JSON.parse((0, import_child_process.execFileSync)("node", [TRAPS, dest], { encoding: "utf8" }));
    assert.deepStrictEqual(out, EXPECTED[caseName]);
  });
  test(`${caseName}: the task's own given test at head`, () => {
    let passed = true;
    try {
      (0, import_child_process.execFileSync)("node", ["--test", ownedTestFile], { cwd: dest, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      passed = false;
    }
    assert.strictEqual(passed, true, `${caseName}'s given test (${ownedTestFile}) must pass at head: the planted defect is not what it checks`);
  });
}
test("path-no-check (a task-01 case): head contains test/store.test.js", () => {
  const dest = path.join(root, "path-no-check");
  assert.ok(fs.existsSync(path.join(dest, "test/store.test.js")));
});
fs.rmSync(root, { recursive: true, force: true });
if (failures) {
  console.error(`build-case.test.js: ${failures} failure(s)`);
  process.exit(1);
}
console.log("build-case.test.js: ok");
