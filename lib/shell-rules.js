// generated from src/lib/shell-rules.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var shell_rules_exports = {};
__export(shell_rules_exports, {
  classifyShell: () => classifyShell,
  hardReason: () => hardReason,
  namesFxState: () => namesFxState,
  stripComments: () => stripComments
});
module.exports = __toCommonJS(shell_rules_exports);
var import_fx_paths = require("./fx-paths.js");
const RULES = {
  "rm-root": "rm -r on a root, home or system directory cannot be undone.",
  "find-root": "find deleting from a root, home or system directory cannot be undone.",
  disk: "formatting or overwriting a disk destroys its data.",
  "fork-bomb": "a fork bomb exhausts the machine.",
  "perms-root": "recursive chmod or chown on a root or home directory breaks the system.",
  "pipe-to-shell": "running a download as a shell script runs code nobody has read.",
  power: "shutting down or rebooting ends every session on this machine.",
  "win-wipe": "recursive deletion of a drive root or home directory cannot be undone.",
  "fx-state": "the fx state and config directories hold the decision log, session journals and fx config, which only fx writes."
};
const hardReason = (rule) => `[fx] refused: ${RULES[rule]} This rule has no override.`;
function closeParen(src, open) {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (c === "\\") k++;
    else if (c === "'") {
      const e = src.indexOf("'", k + 1);
      k = e < 0 ? src.length : e;
    } else if (c === '"') {
      for (k++; k < src.length && src[k] !== '"'; k++) if (src[k] === "\\") k++;
    } else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return k;
  }
  return src.length;
}
const closeBrace = (src, open) => {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}" && --depth === 0) return k;
  }
  return src.length;
};
const REDIRECT = /^(?:<<<|<<-|<<|<>|<&|>>|>\||>&|&>>|&>|<|>)/;
function parse(src, posix, cmd = false) {
  const ps = !posix && !cmd;
  const cmds = [];
  const comments = [];
  let bare = "";
  let list = 0;
  let stage = 0;
  const fresh = () => ({ words: [], spans: [], subs: [], procs: [], redirs: [], heredocs: [], bodies: [], herestrings: [], list, stage, start: -1, rest: "" });
  let cur = fresh();
  let w = "";
  let inWord = false;
  let redir = null;
  let wordStart = 0;
  let pos = 0;
  const pending = [];
  const begin = (at) => {
    if (!inWord) wordStart = at;
    inWord = true;
    if (cur.start < 0) cur.start = at;
  };
  const endWord = () => {
    if (!inWord) return;
    if (redir === null) {
      cur.words.push(w);
      cur.spans.push([wordStart, pos]);
    } else if (redir === "<<" || redir === "<<-") pending.push({ delim: w, dash: redir === "<<-", cmd: cur });
    else if (redir === "<<<") cur.herestrings.push(w);
    else cur.redirs.push({ op: redir, target: w });
    redir = null;
    w = "";
    inWord = false;
  };
  const endCmd = () => {
    endWord();
    redir = null;
    if (cur.start >= 0) cmds.push(cur);
    cur = fresh();
  };
  const endList = (at) => {
    endCmd();
    for (const c of cmds) if (c.list === list && c.rest === "") c.rest = src.slice(c.start, at);
    list++;
    stage = 0;
    cur = fresh();
  };
  const substitution = (i) => {
    if (src[i] === "`") {
      let k2 = i + 1;
      while (k2 < src.length && src[k2] !== "`") k2 += src[k2] === "\\" ? 2 : 1;
      cur.subs.push(src.slice(i + 1, k2));
      w += src.slice(i, k2 + 1);
      return k2;
    }
    if (src[i + 1] === "{") {
      const k2 = closeBrace(src, i + 1);
      w += src.slice(i, k2 + 1);
      return k2;
    }
    const k = closeParen(src, i + 1);
    cur.subs.push(src[i + 2] === "(" ? src.slice(i + 3, k - 1) : src.slice(i + 2, k));
    w += src.slice(i, k + 1);
    return k;
  };
  const special = (i) => src[i] === "$" && (src[i + 1] === "(" || src[i + 1] === "{") || posix && src[i] === "`";
  for (let i = 0; i < src.length; i++) {
    pos = i;
    const c = src[i] ?? "";
    const next = src[i + 1];
    if (c === "\n") {
      endList(i);
      bare += "\n";
      if (pending.length > 0) {
        let k = i + 1;
        for (const h of pending) {
          const lines = [];
          const bodyStart = Math.min(k, src.length);
          let bodyEnd = bodyStart;
          while (k <= src.length) {
            const e = src.indexOf("\n", k);
            const end = e < 0 ? src.length : e;
            const line = src.slice(k, end);
            k = end + 1;
            if ((h.dash ? line.replace(/^\t+/, "") : line) === h.delim) break;
            lines.push(line);
            bodyEnd = end;
            if (e < 0) break;
          }
          h.cmd.heredocs.push(lines.join("\n"));
          h.cmd.bodies.push([bodyStart, bodyEnd]);
        }
        pending.length = 0;
        i = k - 1;
      }
      continue;
    }
    if (c === " " || c === "	" || c === "\r") {
      endWord();
      bare += c;
      continue;
    }
    if (c === "#" && !inWord && !cmd) {
      const e = src.indexOf("\n", i);
      const end = e < 0 ? src.length : e;
      comments.push([i, end]);
      i = end - 1;
      continue;
    }
    if (c === "<" && next === "#" && ps) {
      endWord();
      const e = src.indexOf("#>", i + 2);
      const end = e < 0 ? src.length : e + 2;
      comments.push([i, end]);
      bare += " ";
      i = end - 1;
      continue;
    }
    if (c === "^" && cmd) {
      begin(i);
      w += next ?? "";
      bare += next ?? "";
      i++;
      continue;
    }
    if (c === "`" && ps) {
      if (next === "\n") {
        i++;
        continue;
      }
      if (next === "\r" && src[i + 2] === "\n") {
        i += 2;
        continue;
      }
      begin(i);
      w += next ?? "";
      bare += next ?? "";
      i++;
      continue;
    }
    if (c === "\\" && posix) {
      if (next === "\n") {
        i++;
        continue;
      }
      begin(i);
      w += next ?? "\\";
      bare += next ?? "";
      i++;
      continue;
    }
    if (c === "'" && !cmd || posix && c === "$" && next === "'") {
      begin(i);
      let k = c === "$" ? i + 2 : i + 1;
      for (; k < src.length && src[k] !== "'"; k++) {
        if (c === "$" && src[k] === "\\") {
          const n = src[++k];
          w += n === "n" ? "\n" : n === "t" ? "	" : n ?? "";
        } else w += src[k];
      }
      bare += "_";
      i = k;
      continue;
    }
    if (c === '"') {
      begin(i);
      let k = i + 1;
      for (; k < src.length && src[k] !== '"'; k++) {
        const d = src[k] ?? "";
        if (d === "`" && ps) {
          w += src[k + 1] ?? "";
          k++;
        } else if (d === "\\" && posix) {
          const n = src[k + 1] ?? "";
          if (n === "\n") {
            k++;
            continue;
          }
          if ('$`"\\'.includes(n)) {
            w += n;
            k++;
            continue;
          }
          w += d;
        } else if (special(k)) k = substitution(k);
        else w += d;
      }
      bare += "_";
      i = k;
      continue;
    }
    if (special(i)) {
      begin(i);
      i = substitution(i);
      bare += "_";
      continue;
    }
    if ((c === "<" || c === ">") && next === "(") {
      endWord();
      begin(i);
      const k = closeParen(src, i + 1);
      cur.procs.push(src.slice(i + 2, k));
      cur.subs.push(src.slice(i + 2, k));
      w += src.slice(i, k + 1);
      bare += "_";
      i = k;
      continue;
    }
    if (c === "(" && next === "(" && !inWord && cur.words.length === 0) {
      const k = closeParen(src, i);
      if (cur.start < 0) cur.start = i;
      cur.subs.push(src.slice(i + 2, k - 1));
      bare += "_";
      i = k;
      continue;
    }
    const op = REDIRECT.exec(src.slice(i));
    if (op && (c !== "&" || next === ">")) {
      if (inWord && /^\d+$/.test(w)) {
        w = "";
        inWord = false;
      } else endWord();
      if (cur.start < 0) cur.start = i;
      redir = op[0];
      bare += op[0];
      i += op[0].length - 1;
      continue;
    }
    if (c === "|" || c === "&" || c === ";") {
      bare += c;
      if (c === "|" && next !== "|") {
        endCmd();
        stage++;
        cur = fresh();
        if (next === "&") {
          i++;
          bare += "&";
        }
        continue;
      }
      if ((c === "|" || c === "&") && next === c) {
        i++;
        bare += c;
      }
      endList(i);
      continue;
    }
    if (c === "(" || c === ")") {
      endCmd();
      bare += c;
      continue;
    }
    begin(i);
    w += c;
    bare += c;
  }
  pos = src.length;
  endList(src.length);
  return { cmds, comments, bare, src, posix, cmd };
}
function stripComments(command, posix = true) {
  let out = "";
  let pos = 0;
  for (const [s, e] of parse(command, posix).comments) {
    out += command.slice(pos, s);
    pos = e;
  }
  return out + command.slice(pos);
}
const RESERVED = /* @__PURE__ */ new Set(["!", "{", "}", "if", "then", "else", "elif", "fi", "do", "done", "while", "until"]);
const WRAPPERS = {
  sudo: ["-u", "-g", "-C", "-D", "-h", "-p", "-r", "-t", "-U", "-T"],
  doas: ["-u", "-C"],
  env: ["-u", "-C"],
  command: [],
  builtin: [],
  nice: ["-n"],
  nohup: [],
  setsid: [],
  time: ["-f", "-o"],
  timeout: ["-s", "-k"],
  exec: ["-a"],
  xargs: ["-I", "-n", "-P", "-L", "-d", "-E", "-s", "-a"],
  stdbuf: ["-i", "-o", "-e"],
  busybox: []
};
const ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const WINDOWS_SHELLS = /* @__PURE__ */ new Set(["powershell", "pwsh", "cmd", "iex", "invoke-expression"]);
const SHELLS = /* @__PURE__ */ new Set(["sh", "bash", "zsh", "dash", "ksh", "fish", "ash", "mksh"]);
const PIPE_SINKS = /* @__PURE__ */ new Set([...SHELLS, "source", ".", "iex", "invoke-expression", "powershell", "pwsh"]);
const INTERPRETER = /^(?:python[\d.]*|perl|ruby|node|php)$/;
const runsStdin = (r) => r !== void 0 && INTERPRETER.test(r.prog) && r.args.every((a) => a === "-" || a.startsWith("-") && !/^-[A-Za-z]*[cmerE]|^--(?:eval|print)/.test(a));
const LISTERS = ["get-childitem", "gci", "ls", "dir"];
const REMOVERS = ["remove-item", "ri", "rm", "del", "erase", "rd", "rmdir"];
const DOWNLOADERS = /* @__PURE__ */ new Set(["curl", "wget", "iwr", "irm", "invoke-webrequest", "invoke-restmethod"]);
const DOWNLOAD_TEXT = /downloadstring|downloadfile|net\.webclient/i;
const DOWNLOAD_WORD = /(?:^|[^\w-])(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)(?:$|[^\w-])|downloadstring|downloadfile|net\.webclient/i;
const SYSTEM = "bin|boot|dev|etc|home|lib|lib64|opt|proc|root|sbin|srv|sys|usr|var|Users|System|Library|Applications|private";
const ROOT_OR_HOME = /^(?:\/\*?|~(?:\/\*?)?|\$(?:HOME|\{HOME\})(?:\/\*?)?|\/(?:home|Users)\/[^/\s]+(?:\/\*?)?)$/;
const SYSTEM_DIR = new RegExp(`^/(?:${SYSTEM})(?:/\\*?)?$`);
const DRIVE_ROOT = /^[A-Za-z]:[\\/]\*?$/;
const PS_WIPE_TARGET = /^(?:[a-z]:[\\/]\*?|(?:~|\$home|\$\{home\}|\$env:userprofile)(?:[\\/]\*?)?)$/i;
const PS_RECURSE = /^-r(?:e(?:c(?:u(?:r(?:s(?:e)?)?)?)?)?)?(?::\$true)?$/i;
const BLOCK_DEVICE = /^\/dev\/(?:sd|nvme|hd|vd|disk|mmcblk)/;
const FORK_BOMB = [/:\s*\(\s*\)\s*\{/, /([A-Za-z_]\w*)\s*\(\s*\)\s*\{[^}]*\b\1\s*\|\s*\1\s*&/];
const baseName = (word) => (word.split(/[\\/]/).pop() ?? "").toLowerCase().replace(/\.exe$/, "");
function resolve(words2, vars) {
  const w = [...words2];
  const inner = [];
  let i = 0;
  for (let guard = 0; guard < 50; guard++) {
    while (i < w.length && (ASSIGN.test(w[i] ?? "") || RESERVED.has(w[i] ?? ""))) i++;
    const v = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/.exec(w[i] ?? "");
    const value = v?.[1] === void 0 ? void 0 : vars.get(v[1]);
    if (value !== void 0) {
      w.splice(i, 1, ...value.split(/\s+/).filter(Boolean));
      continue;
    }
    const name = baseName(w[i] ?? "");
    const opts = Object.hasOwn(WRAPPERS, name) ? WRAPPERS[name] : void 0;
    if (!opts) break;
    i++;
    while (i < w.length && (w[i] ?? "").startsWith("-")) {
      const o = w[i] ?? "";
      if (name === "env" && /^(?:-S|--split-string)/.test(o)) {
        const attached = o.startsWith("--split-string=") ? o.slice(15) : o.slice(2);
        inner.push([attached || w[++i] || "", ...w.slice(i + 1)].join(" "));
        return { prog: "", args: [], inner };
      }
      i += opts.includes(o) ? 2 : 1;
    }
    if (name === "timeout") i++;
  }
  const prog = baseName(w[i] ?? "");
  const args = w.slice(i + 1);
  if (SHELLS.has(prog)) {
    let c = false;
    for (let k = 0; k < args.length; k++) {
      const a = args[k] ?? "";
      if (a === "--") continue;
      if (/^[-+]o$/.test(a)) {
        k++;
        continue;
      }
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(a)) {
        c = true;
        continue;
      }
      if (a.startsWith("-") || a.startsWith("+")) continue;
      if (c) inner.push(a);
      break;
    }
  } else if (prog === "eval") inner.push(args.join(" "));
  else if (prog === "su") {
    const k = args.findIndex((a) => a === "-c" || a === "--command");
    const attached = args.find((a) => a.startsWith("--command="));
    if (k >= 0 && args[k + 1] !== void 0) inner.push(args[k + 1] ?? "");
    else if (attached) inner.push(attached.slice(10));
  } else if (prog === "powershell" || prog === "pwsh") {
    const k = args.findIndex((a) => /^-c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i.test(a));
    if (k >= 0) inner.push(args.slice(k + 1).join(" "));
    const e = args.findIndex((a) => a.toLowerCase() === "-ec" || a.length >= 2 && "-encodedcommand".startsWith(a.toLowerCase()));
    if (e >= 0 && args[e + 1] !== void 0) inner.push(Buffer.from(args[e + 1] ?? "", "base64").toString("utf16le"));
  } else if (prog === "iex" || prog === "invoke-expression") {
    inner.push(args.filter((a) => !/^-c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i.test(a)).join(" "));
  } else if (prog === "cmd") {
    const k = args.findIndex((a) => /^\/[ck]$/i.test(a));
    if (k >= 0) inner.push(args.slice(k + 1).join(" "));
  }
  return { prog, args, inner };
}
const downloads = (text, vars = /* @__PURE__ */ new Map()) => DOWNLOAD_TEXT.test(text) || parse(text, true).cmds.some((c) => DOWNLOADERS.has(resolve(c.words, vars).prog));
const substitutesDownload = (text) => parse(text, true).cmds.some((c) => c.subs.some((s) => downloads(s)));
function findWipes(args) {
  let i = 0;
  while (/^-(?:[HLP]|D|O\d*)$/.test(args[i] ?? "")) i += args[i] === "-D" ? 2 : 1;
  const starts = [];
  for (; i < args.length && !/^[-(!]/.test(args[i] ?? ""); i++) starts.push(args[i] ?? "");
  const deletes = args.some((a, k) => a === "-delete" || /^-(?:exec|execdir|ok|okdir)$/.test(a) && baseName(args[k + 1] ?? "") === "rm");
  return deletes && starts.some((a) => ROOT_OR_HOME.test(a) || SYSTEM_DIR.test(a));
}
function commandRule(r, c) {
  const { prog, args } = r;
  const plain = args.filter((a) => !a.startsWith("-"));
  const recursive = (flag) => args.some((a) => a === "--recursive" || flag.test(a));
  if (prog === "rm" && recursive(/^-[^-]*[rR]/) && plain.some((a) => ROOT_OR_HOME.test(a) || SYSTEM_DIR.test(a))) return "rm-root";
  if (/^mkfs(?:\.\w+)?$/.test(prog) || prog === "dd" && args.some((a) => a.startsWith("of=/dev/"))) return "disk";
  if (c.redirs.some((d) => /^(?:>|>>|>\||&>|&>>|<>)$/.test(d.op) && BLOCK_DEVICE.test(d.target))) return "disk";
  if ((prog === "chmod" || prog === "chown") && recursive(/^-[^-]*R/) && plain.some((a) => ROOT_OR_HOME.test(a))) return "perms-root";
  if (prog === "find" && findWipes(args)) return "find-root";
  if (["shutdown", "reboot", "halt", "poweroff"].includes(prog)) return "power";
  if (prog === "systemctl" && ["reboot", "poweroff", "halt", "kexec"].includes(plain[0] ?? "")) return "power";
  if ((prog === "init" || prog === "telinit") && (args[0] === "0" || args[0] === "6")) return "power";
  if (prog === "format" && args.some((a) => /^[A-Za-z]:$/.test(a))) return "win-wipe";
  const lower = args.map((a) => a.toLowerCase());
  if (["remove-item", "rm", "del", "ri", "rd", "rmdir", "erase"].includes(prog) && args.some((a) => PS_RECURSE.test(a)) && plain.some((a) => PS_WIPE_TARGET.test(a))) return "win-wipe";
  if ((prog === "rd" || prog === "rmdir") && lower.includes("/s") && plain.some((a) => DRIVE_ROOT.test(a) || a.toUpperCase() === "%USERPROFILE%")) return "win-wipe";
  if (prog === "del" && lower.includes("/s") && plain.some((a) => DRIVE_ROOT.test(a))) return "win-wipe";
  if (SHELLS.has(prog) || prog === "source" || prog === ".") {
    if (c.procs.some((s) => downloads(s)) || [...r.inner, ...c.herestrings].some(substitutesDownload)) return "pipe-to-shell";
  }
  if (prog === "eval" && c.subs.some((s) => downloads(s))) return "pipe-to-shell";
  if ((prog === "iex" || prog === "invoke-expression") && DOWNLOAD_WORD.test(c.rest)) return "pipe-to-shell";
  return null;
}
function rulesOf(p, depth) {
  if (FORK_BOMB.some((re) => re.test(p.bare))) return "fork-bomb";
  const vars = /* @__PURE__ */ new Map();
  const resolved = /* @__PURE__ */ new Map();
  for (const c of p.cmds) {
    for (const s of c.subs) {
      const r2 = hardRule(s, depth + 1, p.posix, p.cmd);
      if (r2) return r2;
    }
    const decl = ["export", "local", "declare", "readonly", "typeset"].includes(c.words[0] ?? "") ? c.words.slice(1) : c.words;
    if (decl.length > 0 && decl.every((x) => ASSIGN.test(x))) {
      for (const x of decl) vars.set(x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1));
    }
    const r = resolve(c.words, vars);
    resolved.set(c, r);
    const rule = commandRule(r, c);
    if (rule) return rule;
    const windows = WINDOWS_SHELLS.has(r.prog);
    const first = windows && p.posix ? parse(p.src.slice(c.start), false).cmds[0] : void 0;
    const inner = [...r.inner, ...first ? resolve(first.words, vars).inner : []];
    for (const s of inner) {
      const x = hardRule(s, depth + 1, !windows, r.prog === "cmd");
      if (x) return x;
    }
  }
  for (const c of p.cmds) {
    const pipeline = p.cmds.filter((d) => d.list === c.list);
    const fed = (d) => PIPE_SINKS.has(resolved.get(d)?.prog ?? "") || resolved.get(d)?.prog === "eval";
    if ((c.heredocs.length > 0 || c.herestrings.length > 0) && (fed(c) || pipeline.some((d) => d.stage > c.stage && fed(d)))) {
      for (const body of [...c.heredocs, ...c.herestrings]) {
        const x = hardRule(body, depth + 1, p.posix, p.cmd);
        if (x) return x;
      }
    }
    const prog = resolved.get(c)?.prog ?? "";
    if (DOWNLOADERS.has(prog) || DOWNLOAD_TEXT.test(c.words.join(" "))) {
      if (pipeline.some((d) => d.stage > c.stage && (PIPE_SINKS.has(resolved.get(d)?.prog ?? "") || runsStdin(resolved.get(d))))) return "pipe-to-shell";
    }
    if (LISTERS.includes(prog) && (resolved.get(c)?.args ?? []).some((a) => !a.startsWith("-") && PS_WIPE_TARGET.test(a)) && pipeline.some((d) => d.stage > c.stage && REMOVERS.includes(resolved.get(d)?.prog ?? ""))) return "win-wipe";
  }
  return null;
}
function hardRule(command, depth = 0, posix = true, cmd = false) {
  return depth > 6 ? null : rulesOf(parse(command, posix, cmd), depth);
}
const FX_STATE = /(?:\.local[\\/]+state|\$\{?XDG_STATE_HOME\}?|%LOCALAPPDATA%|\$env:LOCALAPPDATA|\$\{?LOCALAPPDATA\}?|AppData[\\/]+Local)[\\/]+fx(?![\w.-])/i;
const STATE_MENTION = /\.local[\\/]+state|XDG_STATE_HOME|LOCALAPPDATA/i;
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FX_CONFIG = /(?:\.config|\$\{?XDG_CONFIG_HOME\}?|%APPDATA%|\$env:APPDATA|\$\{?APPDATA\}?|AppData[\\/]+Roaming)[\\/]+fx(?![\w.-])/i;
function namesFxState(text) {
  const { stateDir, configDir } = (0, import_fx_paths.machinePaths)();
  return [stateDir, configDir].some((dir) => new RegExp(`${escapeRe(dir)}(?![\\w.-])`).test(text)) || FX_STATE.test(text) || FX_CONFIG.test(text);
}
function words(segment) {
  return (segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []).map((w) => w.replace(/"([^"]*)"|'([^']*)'/g, "$1$2"));
}
const SECRETS = [
  ".env",
  "id_rsa",
  "id_ed25519",
  "id_ecdsa",
  "id_dsa",
  ".ssh/",
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  "credentials",
  ".aws/",
  ".kube/config",
  ".docker/config.json",
  ".git-credentials",
  ".npmrc",
  ".netrc",
  ".pgpass"
];
const PLAIN = /* @__PURE__ */ new Set([
  "ls",
  "pwd",
  "cat",
  "head",
  "tail",
  "wc",
  "grep",
  "stat",
  "file",
  "du",
  "df",
  "which",
  "type",
  "echo",
  "date",
  "whoami",
  "uname",
  "get-childitem",
  "get-content",
  "get-location",
  "dir"
]);
const FIND_ACTIONS = ["-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint", "-fprint0", "-fprintf", "-fls"];
const BRANCH_WRITES = ["--delete", "--move", "--copy", "--force", "--set-upstream-to", "--unset-upstream", "--edit-description"];
const flagged = (args, flags) => args.some((a) => flags.some((f) => a === f || a.startsWith(`${f}=`)));
function readOnly(command, posix = true) {
  const text = command.trim();
  if (/[;&|><`\n\r]|\$\(/.test(text)) return false;
  if (!posix && /[({]/.test(text)) return false;
  const [prog = "", ...args] = words(text);
  if (args.some((a) => SECRETS.some((s) => a.replace(/\\/g, "/").includes(s)))) return false;
  if (STATE_MENTION.test(text)) return false;
  const p = prog.toLowerCase();
  if (PLAIN.has(p)) return true;
  if (p === "rg") return !flagged(args, ["--pre", "--pre-glob"]);
  if (p === "find") return !args.some((a) => FIND_ACTIONS.includes(a));
  if (p === "tree") return !args.some((a) => a.startsWith("-o"));
  if (p === "node") return args.length === 1 && (args[0] === "--version" || args[0] === "-v");
  if (p === "npm") return args[0] === "ls";
  if (p !== "git") return false;
  const [sub = "", ...rest] = args;
  if (["status", "log", "diff", "show"].includes(sub)) return !flagged(rest, ["--output", "--ext-diff"]);
  if (sub === "branch") return !flagged(rest, BRANCH_WRITES) && !rest.some((a) => /^-[^-]*[dDmMcCfu]/.test(a));
  if (sub === "remote") return rest.length === 1 && rest[0] === "-v";
  return ["rev-parse", "ls-files", "blame"].includes(sub);
}
const DRIVE_PATH = /(?:^|[^\w])[A-Za-z]:\\/;
function classifyShell(command, posix = true) {
  const rule = namesFxState(command) ? "fx-state" : hardRule(command) ?? (posix && !DRIVE_PATH.test(command) ? null : hardRule(command, 0, false));
  if (rule) return { kind: "hard-deny", rule, reason: hardReason(rule) };
  return readOnly(stripComments(command, posix), posix) ? { kind: "read-only" } : { kind: "grey" };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  classifyShell,
  hardReason,
  namesFxState,
  stripComments
});
