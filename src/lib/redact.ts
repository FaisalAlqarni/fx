// Removes secrets from a string before it enters a log line or a journal
// line, then caps its length. Over-redaction is accepted (a git SHA is 40 hex
// characters and goes too): it only costs a reader some context.
// Under-redaction leaves a secret on disk.
//
// A redaction never changes what a command does: an unquoted value stops at
// whitespace or a shell separator, so whatever the command does next stays
// visible in the log, and a URL keeps the host it really contacts.

export const CAP_COMMAND = 2000;
export const CAP_PROMPT = 1500;

const R = '[REDACTED]';

// Matches a word in either case without the i flag, so the boundary below
// can still tell lowercase from uppercase.
const ci = (word: string) => word.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);
const words = (list: string[]) => `(?:${list.map(ci).join('|')})`;
const SECRET = ['key', 'token', 'secret', 'password', 'passwd', 'pwd', 'pass', 'passphrase', 'passcode',
  'credential', 'cred', 'cookie', 'session', 'sessionid', 'authorization'];
// A word ends where its case run ends: before a digit, a separator, or a
// change of case (accessToken, TOKEN2, api_keys). So author, keyboard,
// tokenizer and GIT_AUTHOR_NAME are not secret names.
const END = '(?:(?<=[a-z])(?![a-z])|(?<=[A-Z])(?![A-Z]))';
// A plural s only where the word also starts a case run (apiKeys, API_KEYS,
// passwords), so monkeys and turkeys are not keys.
const START = '(?:(?<![A-Za-z])|(?<=[a-z])(?=[A-Z]))';
// In an uppercase run, a secret word after another word counts whatever
// follows (ACCESSTOKENVALUE); auth is left out so XAUTHORITY stays a path.
const RUN_ON = `(?<=[A-Z])(?:${SECRET.map((w) => w.toUpperCase()).join('|')})(?=[A-Z])`;
const nameWith = (list: string[]) =>
  `[\\w.-]*?(?:(?:${START}${words(list)}[sS]?|${words(list)})${END}|${RUN_ON})[\\w.-]*`;
const NAME = nameWith([...SECRET, 'auth']);
const isSecretName = (name: string) => new RegExp(`^${NAME}$`).test(name);
// `auth` alone before a colon is a secret only with a space after the colon
// (X-Auth: v); auth:login is a script name.
const isAuthOnly = (name: string) => !new RegExp(`^${nameWith(SECRET)}$`).test(name);

// One shell word: quoted, or unquoted up to whitespace or a separator. A value
// already redacted by an earlier rule is skipped.
const VAL = `(?!\\[REDACTED\\])(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s"';|&<>()\`]+)`;
// Inside braces or brackets a colon value also stops at , } and ], as in {token:1}.
const COLON_VAL = `(?!\\[REDACTED\\])(?:"(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s"';|&<>()\`,}\\]]+)`;
// An Authorization scheme word kept in front of the redacted credentials.
const SCHEMES = words(['bearer', 'basic', 'token', 'digest', 'negotiate', 'ntlm', 'hoba', 'mutual', 'aws4-hmac-sha256', 'scram-sha-1', 'scram-sha-256', 'vapid']);
const SCHEME = new RegExp(`^(${SCHEMES}\\s+)`);
// A word that runs up to the next separator on the same command line.
const UNTIL = '[^\\n;|&]*?';

const re = (source: string) => new RegExp(source, 'g');
const authValue = (name: string, value: string) => {
  const scheme = /authorization$/i.test(name) ? SCHEME.exec(value)?.[1] ?? '' : '';
  return `${scheme}${R}`;
};

type Rule = [RegExp, string | ((m: string, ...g: string[]) => string)];

// WHATWG special schemes, where a backslash ends the authority like a slash.
const SPECIAL = /^(?:https?|wss?|ftp|file)$/i;
// URL userinfo, read the way fetch reads it (WHATWG URL): the authority ends
// at / ? # (and \ for special schemes), and the userinfo runs to its last @.
// Only that userinfo is replaced, so the log shows the host fetch contacts.
const urlUserinfo = (m: string, scheme = '', rest = '') => {
  const cut = SPECIAL.test(scheme) ? rest.indexOf('\\') : -1;
  const authority = cut < 0 ? rest : rest.slice(0, cut);
  const at = authority.lastIndexOf('@');
  if (at < 0) return m;
  const redacted = `${scheme}://${R}@${rest.slice(at + 1)}`;
  try {
    const url = new URL(`${scheme}://${authority}`);
    return url.username || url.password ? redacted : m;
  } catch {
    // Unparsable, so fetch contacts nothing; the text after @ stays as written.
    return redacted;
  }
};

const colonRule = (before: string, value: string): Rule => [
  re(`${before}\\b(${NAME})(\\s*:\\s*)(?!(?:${SCHEMES}\\s+)?\\[REDACTED\\])((?:${SCHEMES}\\s+)?)${value}`),
  (m, name = '', sep = '', scheme = '') => (isAuthOnly(name) && !/:\s/.test(sep) ? m
    : `${name}${sep}${/authorization$/i.test(name) ? scheme : ''}${R}`)];

// The two shapes that are a secret on sight; the edit rule no-secrets refuses on these alone.
export const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;
export const VENDOR_KEY = /\b(?:sk-[\w-]{10,}|[sr]k_(?:live|test)_\w{10,}|gh[pousr]_\w{20,}|github_pat_\w{20,}|glpat-[\w-]{10,}|npm_\w{20,}|hf_\w{20,}|xox[abpe]-[\w-]+|xapp-[\w-]+|AKIA[0-9A-Z]{16}|AIza[\w-]{20,}|SK[0-9a-fA-F]{32}|eyJ[\w-]+\.[\w-]+\.[\w-]*)/g;

// Applied in order: a later rule never sees what an earlier one removed.
const RULES: Rule[] = [
  [PRIVATE_KEY_BLOCK, R],
  [/\b([a-z][a-z0-9+.-]*):\/\/([^\s/?#"'<>]*)/gi, urlUserinfo],
  // scp style: user:token@host:path.
  [/(^|[\s"'=])[^\s@/:"']+:[^\s@/"']+@(?=[\w.-]+:)/g, `$1${R}@`],
  // curl -u / --user user:pass, attached or not, quoted or not. Before the
  // name: value rule, which would read `-u token:` as a pair.
  [re(`(\\bcurl\\b${UNTIL}\\s(?:-u\\s*|--user(?:\\s+|=)))("[^"]*:[^"]*"|'[^']*:[^']*'|[^\\s"';|&<>]*:[^\\s"';|&<>]*)`), `$1${R}`],
  // A JSON or dict key: "password": "x", 'token': 1.
  [re(`(["'])(${NAME})\\1(\\s*[:=]\\s*)("(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^\\s,}\\]"';|&]+)`),
    (_m, q = '', name = '', sep = '', value = '') => {
      const vq = value.startsWith('"') || value.startsWith("'") ? value[0] : '';
      return `${q}${name}${q}${sep}${vq}${R}${vq}`;
    }],
  // A header inside a curl or wget -H argument: redact to the closing quote.
  [/(-H\s*|--header[=\s]\s*)(["'])\s*([\w-]+)(\s*:\s*)((?:(?!\2)[^\n])+)/g,
    (m, flag = '', q = '', name = '', sep = '', value = '') =>
      (isSecretName(name) ? `${flag}${q}${name}${sep}${authValue(name, value)}` : m)],
  // A bare name: value pair (a header outside quotes, YAML, a log line, an
  // object literal). Outside braces the value runs to the end of the word.
  colonRule('(?<=[{,[]\\s*)', COLON_VAL),
  colonRule('', VAL),
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
  [VENDOR_KEY, R],
];

// Any unbroken base64, base64url or hex run of 40 characters or more. The
// two alphabets stay apart: mixed, they would swallow any long path.
const RUNS: Rule[] = [
  [/[A-Za-z0-9+/]{40,}={0,2}/g, R],
  [/[A-Za-z0-9_-]{40,}/g, R],
];

// The start and length of each real line continuation: a backslash-newline
// where the backslash is not itself escaped, outside single quotes and
// heredoc bodies (where the shell keeps both characters).
const continuations = (t: string): [number, number][] => {
  const found: [number, number][] = [];
  const heredocs: [string, boolean][] = [];
  let sq = false;
  let dq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (sq) { sq = c !== "'"; continue; }
    if (c === '\\') {
      const n = /^\r?\n/.exec(t.slice(i + 1))?.[0].length ?? 0;
      if (n) found.push([i, n + 1]);
      i += n || 1;
    } else if (dq) {
      dq = c !== '"';
    } else if (c === "'") {
      sq = true;
    } else if (c === '"') {
      dq = true;
    } else if (c === '#' && (i === 0 || /[\s;&|(]/.test(t[i - 1] ?? ''))) {
      while (i + 1 < t.length && t[i + 1] !== '\n') i++;
    } else if (t.startsWith('<<<', i)) {
      i += 2;
    } else if (t.startsWith('<<', i)) {
      const m = /^<<(-?)\s*(?:'([^']*)'|"([^"]*)"|\\?([\w.-]+))/.exec(t.slice(i));
      if (m) { heredocs.push([m[2] ?? m[3] ?? m[4] ?? '', m[1] === '-']); i += m[0].length - 1; }
    } else if (c === '\n' && heredocs.length) {
      // Skip each pending body, up to and including its delimiter line.
      for (const [word, tabs] of heredocs.splice(0)) {
        while (i < t.length) {
          const end = t.indexOf('\n', i + 1) < 0 ? t.length : t.indexOf('\n', i + 1);
          const line = t.slice(i + 1, end).replace(/\r$/, '');
          i = end;
          if ((tabs ? line.replace(/^\t+/, '') : line) === word) break;
        }
      }
    }
  }
  return found;
};

// Text being redacted, with the span of the original text behind each
// character, so a redaction found on a joined copy lands on the original.
type Spans = { text: string; from: [number, number][] };

const apply = (cur: Spans, pattern: RegExp, to: Rule[1]): Spans => {
  let text = '';
  const from: [number, number][] = [];
  let last = 0;
  const keep = (a: number, b: number) => { text += cur.text.slice(a, b); from.push(...cur.from.slice(a, b)); };
  for (const m of cur.text.matchAll(pattern)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    const out = typeof to === 'string'
      ? to.replace(/\$(\d)/g, (_x, n: string) => m[Number(n)] ?? '')
      : to(m[0], ...m.slice(1).map((g) => g ?? ''));
    // Each replacement is the match with one middle part swapped for R.
    const fits = (r: number) => m[0].startsWith(out.slice(0, r)) && m[0].slice(r).endsWith(out.slice(r + R.length));
    let r = out.indexOf(R);
    while (r >= 0 && !fits(r)) r = out.indexOf(R, r + 1);
    const a = at + r;
    const b = end - (out.length - r - R.length);
    if (out === m[0] || r < 0 || a >= b) continue;
    keep(last, a);
    // One shared span for all of R's characters marks them as a redaction.
    const span: [number, number] = [cur.from[a]?.[0] ?? 0, cur.from[b - 1]?.[1] ?? 0];
    text += R;
    for (let k = 0; k < R.length; k++) from.push(span);
    last = b;
  }
  keep(last, cur.text.length);
  return { text, from };
};

// `runs: false` skips the 40-character runs, for a value known to be a path
// (a log line's cwd), which a long run of letters and slashes would hide.
export function redact(text: string, cap: number, runs = true): string {
  // Secrets are found on a copy with real continuations joined, as the shell
  // reads it; the output is the original text with only the secrets replaced.
  let cur: Spans = { text: '', from: [] };
  let i = 0;
  for (const [at, n] of [...continuations(text), [text.length, 0] as [number, number]]) {
    for (; i < at; i++) { cur.text += text[i]; cur.from.push([i, i + 1]); }
    i = at + n;
  }
  for (const [pattern, to] of runs ? [...RULES, ...RUNS] : RULES) cur = apply(cur, pattern, to);
  let out = '';
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
