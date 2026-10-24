// generated from src/tests/gates/ci-pins.test.ts by scripts/build: edit there, not here
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
var import_preamble = require("../../lib/preamble.js");
const root = path.join(__dirname, "..", "..");
const wf = path.join(root, ".github", "workflows", "conformance-nightly.yml");
assert.ok(fs.existsSync(wf), "the nightly workflow exists");
const lines = fs.readFileSync(wf, "utf8").split("\n").filter((l) => !/^\s*#/.test(l));
const y = lines.join("\n");
assert.match(y, /^\s*schedule:\s*$/m, "runs on a schedule");
assert.match(y, /^\s*-\s*cron:\s*['"][^'"]+['"]\s*$/m, "has a cron line");
assert.match(y, /^\s*workflow_dispatch:/m, "can be run by hand");
assert.match(y, /^\s*fail-fast:\s*false\s*$/m, "a red @latest never cancels the floor");
assert.ok(!/\bsecrets\s*[.\[]/.test(y), "needs no secrets: the free rows make no model calls");
assert.ok(!/\bgithub\.token\b/.test(y), "needs no token: nothing here writes to GitHub");
assert.match(y, /^\s*run:\s*\$\{\{\s*matrix\.install\s*\}\}\s*$/m, "the install step runs the entry's install line");
assert.match(
  y,
  /^\s*run:\s*bash tests\/conformance\/run\.sh \$\{\{\s*matrix\.harness\s*\}\} --free\s*$/m,
  "each entry runs its free rows"
);
const entries = [];
for (const l of lines) {
  const h = l.match(/^\s*-\s*harness:\s*([a-z0-9-]+)\s*$/);
  if (h && h[1] !== void 0) {
    entries.push({ harness: h[1], install: null });
    continue;
  }
  const i = l.match(/^\s*install:\s*npm install -g (\S+)\s*$/);
  const last = entries[entries.length - 1];
  if (i && i[1] !== void 0 && last !== void 0 && last.install === null) last.install = i[1];
}
const PKG = { "claude-code": "@anthropic-ai/claude-code", codex: "@openai/codex", opencode: "opencode-ai", "opencode-v2": "opencode-ai" };
const FLOOR = { "claude-code": "2.1.278", codex: "0.155.1", opencode: "1.18.25", "opencode-v2": "2.0.18" };
const LATEST = { "claude-code": "latest", codex: "latest", opencode: "1", "opencode-v2": "latest" };
for (const h of import_preamble.HARNESSES) {
  assert.ok(PKG[h] && FLOOR[h], `a package and a floor are defined for ${h}`);
  const mine = entries.filter((e) => e.harness === h);
  assert.ok(mine.length > 0, `${h} has a real matrix entry`);
  for (const e of mine) {
    assert.ok(e.install, `${h} entry has an install line`);
    assert.ok(e.install.startsWith(`${PKG[h]}@`), `${h} installs ${PKG[h]}, not ${e.install}`);
  }
  const versions = mine.map((e) => (e.install ?? "").slice(PKG[h].length + 1));
  assert.ok(versions.includes(FLOOR[h]), `${h} is installed at the floor ${PKG[h]}@${FLOOR[h]}`);
  assert.ok(versions.includes(LATEST[h]), `${h} is installed at ${PKG[h]}@${LATEST[h]}`);
  assert.deepStrictEqual(
    [...versions].sort(),
    [FLOOR[h], LATEST[h]].sort(),
    `${h} is installed at exactly ${FLOOR[h]} and ${LATEST[h]}, once each, not ${versions.join(", ")}`
  );
}
const KNOWN = import_preamble.HARNESSES;
for (const e of entries) assert.ok(KNOWN.includes(e.harness), `matrix entry ${e.harness} is a known harness`);
console.log("ci-pins: passed");
