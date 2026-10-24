// generated from src/lib/git-guard.ts by scripts/build: edit there, not here
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
var git_guard_exports = {};
__export(git_guard_exports, {
  expandShellC: () => expandShellC,
  inspect: () => inspect,
  parseGit: () => parseGit,
  splitSegments: () => splitSegments,
  stripHeredocs: () => stripHeredocs
});
module.exports = __toCommonJS(git_guard_exports);
var path = __toESM(require("path"));
const BASE_BRANCH = /^\+?(?:[\w./-]*:)?(?:refs\/heads\/)?(?:main|master|trunk)$/;
const ATTRIBUTION = [
  /co-authored-by/i,
  /claude-session/i,
  /generated with/i,
  /🤖/u
];
function stripHeredocs(command) {
  const lines = String(command).split("\n");
  const out = [];
  let terminator = null;
  let keep = false;
  for (const line of lines) {
    if (terminator !== null) {
      if (line.trim() === terminator) terminator = null;
      else if (keep) out.push(line);
      continue;
    }
    out.push(line);
    const m = line.match(/(?<!<)<<(?!<)-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/);
    if (m) {
      terminator = m[1] || m[2] || m[3];
      keep = fedToShell(line, m.index);
    }
    const h = line.match(/<<<\s*(?:'([^']*)'|"([^"]*)"|(\S+))/);
    if (h && fedToShell(line, h.index)) out.push(h[1] ?? h[2] ?? h[3] ?? "");
  }
  return out.join("\n");
}
const WRAPPERS = {
  sudo: ["-u", "-g", "-C", "-D", "-h", "-p", "-r", "-t", "-U", "-T"],
  env: ["-u", "-C", "-S"],
  timeout: ["-s", "-k"],
  nohup: [],
  exec: ["-a"],
  command: [],
  eval: [],
  nice: ["-n"]
};
const STDIN_FILES = /* @__PURE__ */ new Set(["/dev/stdin", "/dev/fd/0", "-"]);
function shellReadsStdin(args) {
  let script = false;
  let skip = false;
  for (const a of args) {
    if (a === "-s" || /^-[a-zA-Z]*s[a-zA-Z]*$/.test(a) && !a.startsWith("--")) return true;
    if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(a)) return false;
    if (a === "-") return true;
    if (/^[-+][oO]$/.test(a)) {
      skip = true;
      continue;
    }
    if (skip) {
      skip = false;
      continue;
    }
    if (!a.startsWith("-") && !a.startsWith("+")) {
      script = true;
      break;
    }
  }
  return !script;
}
function fedToShell(line, at) {
  const LIST = /\|\||&&|;|(?<![<>&])&(?![>&])/;
  const pipeline = line.slice(0, at).split(LIST).pop() + line.slice(at).split(LIST)[0];
  return pipeline.split("|").some((cmd) => {
    const t = cmd.replace(/<<<\s*(?:'[^']*'|"[^"]*"|\S+)/g, " ").replace(/<<-?\s*(?:'[^']*'|"[^"]*"|\S+)/g, " ").replace(/\d*[<>]+&?\s*\S+/g, " ").trim().split(/\s+/);
    let i = 0;
    for (; ; ) {
      while (i < t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i])) i++;
      const w = path.basename(t[i] || "");
      if (w === "source" || w === ".") return STDIN_FILES.has(t[i + 1]);
      if (!Object.hasOwn(WRAPPERS, w)) return SHELLS.has(w) && shellReadsStdin(t.slice(i + 1));
      i++;
      while (i < t.length && t[i].startsWith("-")) i += WRAPPERS[w].includes(t[i]) ? 2 : 1;
      if (w === "timeout") i++;
    }
  });
}
function splitSegments(command) {
  return stripHeredocs(command).split(/\|\||&&|[;\n|&]/).map((s) => s.trim()).filter(Boolean);
}
const SHELLS = /* @__PURE__ */ new Set(["sh", "bash", "zsh", "dash", "ksh", "fish"]);
function expandShellC(segment) {
  const m = segment.match(/^\s*(?:\S*\/)?(sh|bash|zsh|dash|ksh|fish)\s+(-[a-zA-Z]*c[a-zA-Z]*)\s+(.+)$/);
  if (!m) return null;
  const arg = m[3].trim();
  const q = arg[0];
  return q === '"' || q === "'" ? arg.slice(1, arg.lastIndexOf(q)) : arg;
}
function parseGit(segment) {
  const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  if (i >= tokens.length) return null;
  const bin = path.basename(tokens[i].replace(/^["']|["']$/g, ""));
  if (bin !== "git") return null;
  i++;
  let dir = null;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    const t = tokens[i];
    if (t === "-C" && tokens[i + 1]) {
      dir = strip(tokens[i + 1]);
      i += 2;
      continue;
    }
    if (t.startsWith("--git-dir=") || t.startsWith("--work-tree=")) {
      dir = strip(t.split("=")[1]);
      i++;
      continue;
    }
    if ((t === "-c" || t === "--namespace") && tokens[i + 1]) {
      i += 2;
      continue;
    }
    i++;
  }
  if (i >= tokens.length) return null;
  return { sub: strip(tokens[i]), args: tokens.slice(i + 1).map(strip), dir, raw: segment };
}
const strip = (s) => String(s).replace(/^["']|["']$/g, "");
const has = (args, ...flags) => args.some((a) => flags.includes(a));
function alwaysBlocked({ sub, args }, fullCommand) {
  if (sub === "push" && args.some((a) => a === "-f" || a.startsWith("--force"))) {
    return "force push rewrites history that has already left the machine.";
  }
  if (sub === "push" && (has(args, "--delete", "-d") || args.some((a) => a.startsWith(":")))) {
    return "deleting a remote branch destroys work for everyone who has it, and no reflog reaches it.";
  }
  if (sub === "push" && args.some((a) => BASE_BRANCH.test(a))) {
    return "that push targets the base branch. Push a feature branch; the base branch is the user's to move.";
  }
  if (sub === "push") {
    const refs = args.filter((a) => !a.startsWith("-"));
    if (refs.length < 2 || refs.some((a) => /^HEAD$/i.test(a))) {
      return "name the branch you are pushing. A bare push follows the current branch, which may be the base branch.";
    }
  }
  if (has(args, "--no-verify", "-n") && (sub === "commit" || sub === "push")) {
    return "--no-verify skips the hooks the repo installed on purpose.";
  }
  if (sub === "reset" && has(args, "--hard")) {
    return "reset --hard destroys uncommitted work irreversibly.";
  }
  if (sub === "clean" && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === "--force")) {
    return "clean -f deletes untracked files, including ones never shown to the user.";
  }
  if (sub === "branch" && (has(args, "-D") || has(args, "-d") && has(args, "--force"))) {
    return "branch -D force-deletes a branch that may hold unmerged commits.";
  }
  if ((sub === "checkout" || sub === "restore") && args.some((a) => a === "." || a === "./")) {
    return `${sub} . discards every uncommitted change in the tree.`;
  }
  if (sub === "stash" && (has(args, "drop") || has(args, "clear"))) {
    return "stash drop/clear destroys stashed work with no reflog to recover it.";
  }
  if (sub === "tag" && (has(args, "-d") || has(args, "--delete"))) {
    return "deleting a tag rewrites released history.";
  }
  if (sub === "commit" || sub === "merge" || sub === "tag") {
    for (const re of ATTRIBUTION) {
      if (re.test(fullCommand)) {
        return 'attribution trailers are never added: no Co-Authored-By, no Claude-Session, no "Generated with".';
      }
    }
  }
  if (sub === "commit" && args.some((a) => a.startsWith("--trailer"))) {
    return "trailers are not added to commit messages.";
  }
  return null;
}
function inspect(command, cwd) {
  if (!command || !/\bgit\b/.test(`${command}`)) return { allow: true };
  const segments = [];
  for (const seg of splitSegments(command)) {
    segments.push(seg);
    const inner = expandShellC(seg);
    if (inner) segments.push(...splitSegments(inner));
  }
  for (const segment of segments) {
    const g = parseGit(segment);
    if (!g) continue;
    const always = alwaysBlocked(g, `${command}`);
    if (always) return { allow: false, reason: always };
  }
  return { allow: true };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  expandShellC,
  inspect,
  parseGit,
  splitSegments,
  stripHeredocs
});
