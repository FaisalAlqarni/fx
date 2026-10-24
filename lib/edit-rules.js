// generated from src/lib/edit-rules.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var edit_rules_exports = {};
__export(edit_rules_exports, {
  BUILTIN_RULES: () => BUILTIN_RULES,
  addedLines: () => addedLines,
  builtinBreach: () => builtinBreach,
  changedFiles: () => changedFiles,
  checkBuiltins: () => checkBuiltins,
  checkEdit: () => checkEdit,
  globMatch: () => globMatch,
  lineDiff: () => lineDiff,
  logEditRuleError: () => logEditRuleError
});
module.exports = __toCommonJS(edit_rules_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_decision_log = require("./decision-log.js");
var import_patch_paths = require("./patch-paths.js");
var import_redact = require("./redact.js");
var import_repo_config = require("./repo-config.js");
const BUILTIN_RULES = [
  { id: "no-dashes", glob: "**/*.{md,mdx}", rule: "Prose uses no em dash (U+2014) or en dash (U+2013) characters." },
  { id: "no-secrets", glob: "**/*", rule: "The added lines hold no private key block and no API key with a known vendor prefix." },
  { id: "no-conflict-markers", glob: "**/*", rule: "The added lines hold no merge-conflict marker line starting <<<<<<< or >>>>>>>." }
];
function builtinBreach(id, added, removed = "") {
  const dashes = (t) => t.match(/[\u2013\u2014]/g)?.length ?? 0;
  if (id === "no-dashes") return dashes(added) > dashes(removed);
  if (id === "no-conflict-markers") return added.split("\n").some((l) => /^(<{7}|>{7})( |$)/.test(l));
  if (id === "no-secrets") return added.search(import_redact.PRIVATE_KEY_BLOCK) >= 0 || added.search(import_redact.VENDOR_KEY) >= 0;
  return false;
}
const LCS_MAX_CELLS = 4e6;
function lineDiff(before, after) {
  const lines = (t) => t.split("\n").map((l) => l.endsWith("\r") ? l.slice(0, -1) : l);
  const a = lines(before);
  const b = lines(after);
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const A = a.slice(s, a.length - e);
  const B = b.slice(s, b.length - e);
  if (A.length * B.length > LCS_MAX_CELLS) return { added: B.join("\n"), removed: A.join("\n") };
  const w = B.length + 1;
  const L = new Uint32Array((A.length + 1) * w);
  const at = (i2, j2) => L[i2 * w + j2] ?? 0;
  for (let i2 = A.length - 1; i2 >= 0; i2--) {
    for (let j2 = B.length - 1; j2 >= 0; j2--) L[i2 * w + j2] = A[i2] === B[j2] ? at(i2 + 1, j2 + 1) + 1 : Math.max(at(i2 + 1, j2), at(i2, j2 + 1));
  }
  const added = [];
  const removed = [];
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) removed.push(A[i++] ?? "");
    else added.push(B[j++] ?? "");
  }
  return { added: [...added, ...B.slice(j)].join("\n"), removed: [...removed, ...A.slice(i)].join("\n") };
}
const addedLines = (before, after) => lineDiff(before, after).added;
function globTokens(glob) {
  const out = [];
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] ?? "";
    const close = c === "{" ? glob.indexOf("}", i) : -1;
    if (glob.startsWith("**/", i)) {
      out.push({ kind: "dirs" });
      i += 2;
    } else if (glob.startsWith("**", i)) {
      out.push({ kind: "any" });
      i += 1;
    } else if (c === "*") out.push({ kind: "star" });
    else if (c === "?") out.push({ kind: "one" });
    else if (close > i) {
      out.push({ kind: "text", options: glob.slice(i + 1, close).split(",") });
      i = close;
    } else out.push({ kind: "text", options: [c] });
  }
  return out;
}
function globMatch(glob, relPath) {
  const n = relPath.length;
  let reach = Array.from({ length: n + 1 }, (_, i) => i === 0);
  for (const t of globTokens(glob)) {
    const next = new Array(n + 1).fill(false);
    if (t.kind === "text" || t.kind === "one") {
      for (let i = 0; i <= n; i++) {
        if (!reach[i]) continue;
        if (t.kind === "text") {
          for (const o of t.options) if (relPath.startsWith(o, i)) next[i + o.length] = true;
        } else if (i < n && relPath[i] !== "/") next[i + 1] = true;
      }
    } else if (t.kind === "dirs") {
      let open = false;
      for (let i = 0; i <= n; i++) {
        if (reach[i]) next[i] = true;
        if (next[i]) open = true;
        if (i < n && relPath[i] === "/") {
          if (open) next[i + 1] = true;
          open = false;
        }
      }
    } else {
      for (let i = 0; i <= n; i++) next[i] = Boolean(reach[i]) || i > 0 && Boolean(next[i - 1]) && (t.kind === "any" || relPath[i - 1] !== "/");
    }
    reach = next;
  }
  return Boolean(reach[n]);
}
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v) => typeof v === "string" ? v : null;
function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
function written(file, content) {
  return { path: file, ...lineDiff(readText(file) ?? "", content) };
}
function edited(file, oldS, newS) {
  return { path: file, ...lineDiff(oldS, newS) };
}
function patched(cwd, patch) {
  return (0, import_patch_paths.extractPatchAdditions)(patch).map((f) => ({ path: path.resolve(cwd, f.path), added: f.text, removed: f.removed }));
}
function changedFiles(harness, toolName, toolInput, cwd) {
  if (!isRecord(toolInput)) return [];
  const ti = toolInput;
  if (harness === "codex") {
    const command = str(ti.command);
    if (toolName === "apply_patch") return patched(cwd, command);
    if ((toolName === "Bash" || toolName === "exec_command") && command?.includes("apply_patch")) return patched(cwd, command);
    return [];
  }
  if (harness === "claude-code") {
    const p2 = str(ti.file_path) ?? str(ti.notebook_path);
    if (p2 === null) return [];
    const file2 = path.resolve(cwd, p2);
    const content2 = str(ti.content);
    const oldS2 = str(ti.old_string);
    const newS2 = str(ti.new_string);
    if (toolName === "Write" && content2 !== null) return [written(file2, content2)];
    if (toolName === "Edit" && oldS2 !== null && newS2 !== null) return [edited(file2, oldS2, newS2)];
    if (toolName === "MultiEdit" && Array.isArray(ti.edits)) {
      const diffs = ti.edits.flatMap((e) => {
        const o = isRecord(e) ? str(e.old_string) : null;
        const n = isRecord(e) ? str(e.new_string) : null;
        return o !== null && n !== null ? [lineDiff(o, n)] : [];
      });
      return [{ path: file2, added: diffs.map((d) => d.added).join("\n"), removed: diffs.map((d) => d.removed).join("\n") }];
    }
    const source = str(ti.new_source);
    if (toolName === "NotebookEdit" && source !== null) return [{ path: file2, added: source, removed: "" }];
    return [];
  }
  const v2 = harness === "opencode-v2";
  if (toolName === (v2 ? "patch" : "apply_patch")) return patched(cwd, ti.patchText);
  const p = str(v2 ? ti.path : ti.filePath);
  if (p === null) return [];
  const file = path.resolve(cwd, p);
  const content = str(ti.content);
  const oldS = str(ti.oldString);
  const newS = str(ti.newString);
  if (toolName === "write" && content !== null) return [written(file, content)];
  if (toolName === "edit" && oldS !== null && newS !== null) return [edited(file, oldS, newS)];
  return [];
}
const ALLOW = { action: "allow", reason: null };
const refusal = (rule, rel) => ({ action: "refuse", reason: `[fx] rule ${rule.id}: ${rule.rule} (${rel})` });
const messageOf = (e) => e instanceof Error ? e.message : String(e);
function logEditRuleError(input, message, text = "") {
  try {
    (0, import_decision_log.logDecision)({ ts: new Date(input.now).toISOString(), harness: input.harness, event: "edit-rule", session: input.sessionId, cwd: input.cwd, text, source: "error", action: "allow", unavailable: message });
  } catch {
  }
}
function failed(input, e) {
  const m = messageOf(e);
  try {
    process.stderr.write(`[fx] edit rules off: ${m}
`);
  } catch {
  }
  logEditRuleError(input, m);
  return ALLOW;
}
function checkBuiltins(input) {
  const { harness, sessionId, cwd, toolName, toolInput, now } = input;
  try {
    if (!(0, import_repo_config.readRepoConfig)(cwd).hooks.editRules) return ALLOW;
    const root = (0, import_repo_config.repoRoot)(cwd);
    const files = changedFiles(harness, toolName, toolInput, cwd).flatMap((f) => {
      const rel = path.relative(root, f.path).split(path.sep).join("/");
      return rel === "" || rel === ".." || rel.startsWith("../") || path.isAbsolute(rel) ? [] : [{ ...f, rel }];
    });
    for (const rule of BUILTIN_RULES) {
      for (const f of files) {
        if (!globMatch(rule.glob, f.rel) || !builtinBreach(rule.id, f.added, f.removed)) continue;
        (0, import_decision_log.logDecision)({ ts: new Date(now).toISOString(), harness, event: "edit-rule", session: sessionId, cwd, text: `${f.rel} ${rule.id}`, source: "hard-rule", action: "refuse" });
        return refusal(rule, f.rel);
      }
    }
    return ALLOW;
  } catch (e) {
    return failed(input, e);
  }
}
async function checkEdit(input) {
  return checkBuiltins(input);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BUILTIN_RULES,
  addedLines,
  builtinBreach,
  changedFiles,
  checkBuiltins,
  checkEdit,
  globMatch,
  lineDiff,
  logEditRuleError
});
