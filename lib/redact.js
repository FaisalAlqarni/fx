// generated from src/lib/redact.ts by scripts/build: edit there, not here
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
var redact_exports = {};
__export(redact_exports, {
  CAP_COMMAND: () => CAP_COMMAND,
  CAP_PROMPT: () => CAP_PROMPT,
  PRIVATE_KEY_BLOCK: () => PRIVATE_KEY_BLOCK,
  VENDOR_KEY: () => VENDOR_KEY,
  redact: () => redact
});
module.exports = __toCommonJS(redact_exports);
const CAP_COMMAND = 2e3;
const CAP_PROMPT = 1500;
const R = "[REDACTED]";
const ci = (word) => word.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);
const words = (list) => `(?:${list.map(ci).join("|")})`;
const SECRET = [
  "key",
  "token",
  "secret",
  "password",
  "passwd",
  "pwd",
  "pass",
  "passphrase",
  "passcode",
  "credential",
  "cred",
  "cookie",
  "session",
  "sessionid",
  "authorization"
];
const END = "(?:(?<=[a-z])(?![a-z])|(?<=[A-Z])(?![A-Z]))";
const START = "(?:(?<![A-Za-z])|(?<=[a-z])(?=[A-Z]))";
const RUN_ON = `(?<=[A-Z])(?:${SECRET.map((w) => w.toUpperCase()).join("|")})(?=[A-Z])`;
const nameWith = (list) => `[\\w.-]*?(?:(?:${START}${words(list)}[sS]?|${words(list)})${END}|${RUN_ON})[\\w.-]*`;
const NAME = nameWith([...SECRET, "auth"]);
const isSecretName = (name) => new RegExp(`^${NAME}$`).test(name);
const isAuthOnly = (name) => !new RegExp(`^${nameWith(SECRET)}$`).test(name);
const VAL = `(?!\\[REDACTED\\])(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s"';|&<>()\`]+)`;
const COLON_VAL = `(?!\\[REDACTED\\])(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s"';|&<>()\`,}\\]]+)`;
const SCHEMES = words(["bearer", "basic", "token", "digest", "negotiate", "ntlm", "hoba", "mutual", "aws4-hmac-sha256", "scram-sha-1", "scram-sha-256", "vapid"]);
const SCHEME = new RegExp(`^(${SCHEMES}\\s+)`);
const UNTIL = "[^\\n;|&]*?";
const re = (source) => new RegExp(source, "g");
const authValue = (name, value) => {
  const scheme = /authorization$/i.test(name) ? SCHEME.exec(value)?.[1] ?? "" : "";
  return `${scheme}${R}`;
};
const SPECIAL = /^(?:https?|wss?|ftp|file)$/i;
const urlUserinfo = (m, scheme = "", rest = "") => {
  const cut = SPECIAL.test(scheme) ? rest.indexOf("\\") : -1;
  const authority = cut < 0 ? rest : rest.slice(0, cut);
  const at = authority.lastIndexOf("@");
  if (at < 0) return m;
  const redacted = `${scheme}://${R}@${rest.slice(at + 1)}`;
  try {
    const url = new URL(`${scheme}://${authority}`);
    return url.username || url.password ? redacted : m;
  } catch {
    return redacted;
  }
};
const colonRule = (before, value) => [
  re(`${before}\\b(${NAME})(\\s*:\\s*)(?!(?:${SCHEMES}\\s+)?\\[REDACTED\\])((?:${SCHEMES}\\s+)?)${value}`),
  (m, name = "", sep = "", scheme = "") => isAuthOnly(name) && !/:\s/.test(sep) ? m : `${name}${sep}${/authorization$/i.test(name) ? scheme : ""}${R}`
];
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;
const VENDOR_KEY = /\b(?:sk-[\w-]{10,}|[sr]k_(?:live|test)_\w{10,}|gh[pousr]_\w{20,}|github_pat_\w{20,}|glpat-[\w-]{10,}|npm_\w{20,}|hf_\w{20,}|xox[abpe]-[\w-]+|xapp-[\w-]+|AKIA[0-9A-Z]{16}|AIza[\w-]{20,}|SK[0-9a-fA-F]{32}|eyJ[\w-]+\.[\w-]+\.[\w-]*)/g;
const RULES = [
  [PRIVATE_KEY_BLOCK, R],
  [/\b([a-z][a-z0-9+.-]*):\/\/([^\s/?#"'<>]*)/gi, urlUserinfo],
  // scp style: user:token@host:path.
  [/(^|[\s"'=])[^\s@/:"']+:[^\s@/"']+@(?=[\w.-]+:)/g, `$1${R}@`],
  // curl -u / --user user:pass, attached or not, quoted or not. Before the
  // name: value rule, which would read `-u token:` as a pair.
  [re(`(\\bcurl\\b${UNTIL}\\s(?:-u\\s*|--user(?:\\s+|=)))("[^"]*:[^"]*"|'[^']*:[^']*'|[^\\s"';|&<>]*:[^\\s"';|&<>]*)`), `$1${R}`],
  // A JSON or dict key: "password": "x", 'token': 1.
  [
    re(`(["'])(${NAME})\\1(\\s*[:=]\\s*)("(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s,}\\]"';|&]+)`),
    (_m, q = "", name = "", sep = "", value = "") => {
      const vq = value.startsWith('"') || value.startsWith("'") ? value[0] : "";
      return `${q}${name}${q}${sep}${vq}${R}${vq}`;
    }
  ],
  // A header inside a curl or wget -H argument: redact to the closing quote.
  [
    /(-H\s*|--header[=\s]\s*)(["'])\s*([\w-]+)(\s*:\s*)((?:(?!\2)[^\n])+)/g,
    (m, flag = "", q = "", name = "", sep = "", value = "") => isSecretName(name) ? `${flag}${q}${name}${sep}${authValue(name, value)}` : m
  ],
  // A bare name: value pair (a header outside quotes, YAML, a log line, an
  // object literal). Outside braces the value runs to the end of the word.
  colonRule("(?<=[{,[]\\s*)", COLON_VAL),
  colonRule("", VAL),
  // Flags: --password x, --token=x, --cookie x.
  [re(`(--${NAME})(\\s+|=)${VAL}`), `$1$2${R}`],
  // KEY=value.
  [re(`\\b(${NAME}=)${VAL}`), `$1${R}`],
  [re(`(\\bcurl\\b${UNTIL}\\s-b\\s*)${VAL}`), `$1${R}`],
  // -p<secret> or -p <secret> for tools where -p is a password.
  [re(`(\\b(?:mysql|mysqldump|mysqladmin|mariadb|mysqlsh)\\b${UNTIL}\\s-p)(?=[^\\s-])${VAL}`), `$1${R}`],
  // sshpass takes -p only among its own options, before the command it runs
  // (sshpass -e ssh h -p 2222 is a port).
  [re(`(\\bsshpass(?:\\s+-[^\\sp]\\S*)*\\s+-p\\s*)${VAL}`), `$1${R}`],
  [re(`(\\b(?:(?:docker|podman|helm|oras|skopeo|buildah)\\b${UNTIL}\\blogin|mongosh|mongo)\\b${UNTIL}\\s-p\\s*)${VAL}`), `$1${R}`],
  [re(`(\\bredis-cli\\b${UNTIL}\\s-a\\s*)${VAL}`), `$1${R}`],
  [re(`(\\bldap\\w+\\b${UNTIL}\\s-w\\s*)${VAL}`), `$1${R}`],
  [re(`(\\bsmbclient\\b${UNTIL}\\s(?:-U\\s*|--user(?:=|\\s+))[^\\s%"';|&<>]+%)${VAL}`), `$1${R}`],
  [re(`(-pass(?:in|out)\\s+pass:)${VAL}`), `$1${R}`],
  [re(`(\\b(?:zip|7z)\\b${UNTIL}\\s-P\\s*)${VAL}`), `$1${R}`],
  [VENDOR_KEY, R]
];
const RUNS = [
  [/[A-Za-z0-9+/]{40,}={0,2}/g, R],
  [/[A-Za-z0-9_-]{40,}/g, R]
];
const continuations = (t) => {
  const found = [];
  const heredocs = [];
  let sq = false;
  let dq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (sq) {
      sq = c !== "'";
      continue;
    }
    if (c === "\\") {
      const n = /^\r?\n/.exec(t.slice(i + 1))?.[0].length ?? 0;
      if (n) found.push([i, n + 1]);
      i += n || 1;
    } else if (dq) {
      dq = c !== '"';
    } else if (c === "'") {
      sq = true;
    } else if (c === '"') {
      dq = true;
    } else if (c === "#" && (i === 0 || /[\s;&|(]/.test(t[i - 1] ?? ""))) {
      while (i + 1 < t.length && t[i + 1] !== "\n") i++;
    } else if (t.startsWith("<<<", i)) {
      i += 2;
    } else if (t.startsWith("<<", i)) {
      const m = /^<<(-?)\s*(?:'([^']*)'|"([^"]*)"|\\?([\w.-]+))/.exec(t.slice(i));
      if (m) {
        heredocs.push([m[2] ?? m[3] ?? m[4] ?? "", m[1] === "-"]);
        i += m[0].length - 1;
      }
    } else if (c === "\n" && heredocs.length) {
      for (const [word, tabs] of heredocs.splice(0)) {
        while (i < t.length) {
          const end = t.indexOf("\n", i + 1) < 0 ? t.length : t.indexOf("\n", i + 1);
          const line = t.slice(i + 1, end).replace(/\r$/, "");
          i = end;
          if ((tabs ? line.replace(/^\t+/, "") : line) === word) break;
        }
      }
    }
  }
  return found;
};
const apply = (cur, pattern, to) => {
  let text = "";
  const from = [];
  let last = 0;
  const keep = (a, b) => {
    text += cur.text.slice(a, b);
    from.push(...cur.from.slice(a, b));
  };
  for (const m of cur.text.matchAll(pattern)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    const out = typeof to === "string" ? to.replace(/\$(\d)/g, (_x, n) => m[Number(n)] ?? "") : to(m[0], ...m.slice(1).map((g) => g ?? ""));
    const fits = (r2) => m[0].startsWith(out.slice(0, r2)) && m[0].slice(r2).endsWith(out.slice(r2 + R.length));
    let r = out.indexOf(R);
    while (r >= 0 && !fits(r)) r = out.indexOf(R, r + 1);
    const a = at + r;
    const b = end - (out.length - r - R.length);
    if (out === m[0] || r < 0 || a >= b) continue;
    keep(last, a);
    const span = [cur.from[a]?.[0] ?? 0, cur.from[b - 1]?.[1] ?? 0];
    text += R;
    for (let k = 0; k < R.length; k++) from.push(span);
    last = b;
  }
  keep(last, cur.text.length);
  return { text, from };
};
function redact(text, cap, runs = true) {
  let cur = { text: "", from: [] };
  let i = 0;
  for (const [at, n] of [...continuations(text), [text.length, 0]]) {
    for (; i < at; i++) {
      cur.text += text[i];
      cur.from.push([i, i + 1]);
    }
    i = at + n;
  }
  for (const [pattern, to] of runs ? [...RULES, ...RUNS] : RULES) cur = apply(cur, pattern, to);
  let out = "";
  let pos = 0;
  for (let k = 0; k < cur.text.length; k++) {
    const span = cur.from[k];
    if (!span || span !== cur.from[k + 1] || !cur.text.startsWith(R, k)) continue;
    out += text.slice(pos, span[0]) + R;
    pos = Math.max(pos, span[1]);
    k += R.length - 1;
  }
  out += text.slice(pos);
  return out.length > cap ? `${out.slice(0, cap)}[...]` : out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CAP_COMMAND,
  CAP_PROMPT,
  PRIVATE_KEY_BLOCK,
  VENDOR_KEY,
  redact
});
