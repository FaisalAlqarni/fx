// The shell guard's hard rules and read-only allowlist (design decision 5,
// steps 1 and 2). Pure: the hook loads this file fail-closed, so a broken
// guard module never drops a hard rule (lens I10).
//
// The rules read the command through one quote-aware lexer, so a separator,
// a `#` or a `<<` inside quotes is an argument, a heredoc body that no shell
// reads is data, and a command hidden in a substitution, a shell's `-c`
// string, `eval` or a wrapper is checked as a command of its own.
import { machinePaths } from './fx-paths.js';

export type ShellClass = { kind: 'hard-deny'; rule: string; reason: string } | { kind: 'read-only' } | { kind: 'grey' };

const RULES: Record<string, string> = {
  'rm-root': 'rm -r on a root, home or system directory cannot be undone.',
  'find-root': 'find deleting from a root, home or system directory cannot be undone.',
  disk: 'formatting or overwriting a disk destroys its data.',
  'fork-bomb': 'a fork bomb exhausts the machine.',
  'perms-root': 'recursive chmod or chown on a root or home directory breaks the system.',
  'pipe-to-shell': 'running a download as a shell script runs code nobody has read.',
  power: 'shutting down or rebooting ends every session on this machine.',
  'win-wipe': 'recursive deletion of a drive root or home directory cannot be undone.',
  'fx-state': 'the fx state and config directories hold the decision log, session journals and fx config, which only fx writes.',
};

export const hardReason = (rule: string) => `[fx] refused: ${RULES[rule]} This rule has no override.`;

// --- the lexer --------------------------------------------------------------

// One simple command. `words` have their quotes removed; a substitution stays
// as written in its word and its content is also in `subs` (`procs` for <(...)).
// `spans` and `bodies` are where each word and each heredoc body sit in the source.
type Cmd = {
  words: string[]; spans: [number, number][]; subs: string[]; procs: string[]; redirs: { op: string; target: string }[];
  heredocs: string[]; bodies: [number, number][]; herestrings: string[]; list: number; stage: number; start: number; rest: string;
};
type Parsed = { cmds: Cmd[]; comments: [number, number][]; bare: string; src: string; posix: boolean; cmd: boolean };

// The index of the `)` closing the `(` at `open`, skipping quotes.
function closeParen(src: string, open: number): number {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (c === '\\') k++;
    else if (c === "'") { const e = src.indexOf("'", k + 1); k = e < 0 ? src.length : e; }
    else if (c === '"') { for (k++; k < src.length && src[k] !== '"'; k++) if (src[k] === '\\') k++; }
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return k;
  }
  return src.length;
}

const closeBrace = (src: string, open: number): number => {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return k;
  }
  return src.length;
};

const REDIRECT = /^(?:<<<|<<-|<<|<>|<&|>>|>\||>&|&>>|&>|<|>)/;

// Three readings. bash (`posix`). PowerShell (`posix: false`): a backslash is
// a path separator, a backtick escapes the next character or continues the
// line, and `<# ... #>` is a comment; for strings handed to powershell, pwsh
// or iex, and for Codex's top level on Windows. cmd (`posix: false, cmd`): a
// backslash is a path separator, `^` escapes the next character, and a
// backtick, `#`, `<#` and `'` are plain characters; for strings handed to cmd.
function parse(src: string, posix: boolean, cmd = false): Parsed {
  const ps = !posix && !cmd;
  const cmds: Cmd[] = [];
  const comments: [number, number][] = [];
  let bare = '';
  let list = 0;
  let stage = 0;
  const fresh = (): Cmd => ({ words: [], spans: [], subs: [], procs: [], redirs: [], heredocs: [], bodies: [], herestrings: [], list, stage, start: -1, rest: '' });
  let cur = fresh();
  let w = '';
  let inWord = false;
  let redir: string | null = null;
  // Where the current word began, and the character being read: a word always ends before it.
  let wordStart = 0;
  let pos = 0;
  const pending: { delim: string; dash: boolean; cmd: Cmd }[] = [];
  const begin = (at: number) => { if (!inWord) wordStart = at; inWord = true; if (cur.start < 0) cur.start = at; };
  const endWord = () => {
    if (!inWord) return;
    if (redir === null) { cur.words.push(w); cur.spans.push([wordStart, pos]); }
    else if (redir === '<<' || redir === '<<-') pending.push({ delim: w, dash: redir === '<<-', cmd: cur });
    else if (redir === '<<<') cur.herestrings.push(w);
    else cur.redirs.push({ op: redir, target: w });
    redir = null;
    w = '';
    inWord = false;
  };
  const endCmd = () => {
    endWord();
    redir = null;
    if (cur.start >= 0) cmds.push(cur);
    cur = fresh();
  };
  const endList = (at: number) => {
    endCmd();
    for (const c of cmds) if (c.list === list && c.rest === '') c.rest = src.slice(c.start, at);
    list++;
    stage = 0;
    cur = fresh();
  };
  // `$(...)`, `$((...))` and backticks: the content is a command of its own.
  // Arithmetic is kept as one too: bash reads `$((cmd))` as commands when it is not arithmetic.
  const substitution = (i: number): number => {
    if (src[i] === '`') {
      let k = i + 1;
      while (k < src.length && src[k] !== '`') k += src[k] === '\\' ? 2 : 1;
      cur.subs.push(src.slice(i + 1, k));
      w += src.slice(i, k + 1);
      return k;
    }
    if (src[i + 1] === '{') {
      const k = closeBrace(src, i + 1);
      w += src.slice(i, k + 1);
      return k;
    }
    const k = closeParen(src, i + 1);
    cur.subs.push(src[i + 2] === '(' ? src.slice(i + 3, k - 1) : src.slice(i + 2, k));
    w += src.slice(i, k + 1);
    return k;
  };
  const special = (i: number) => (src[i] === '$' && (src[i + 1] === '(' || src[i + 1] === '{')) || (posix && src[i] === '`');

  for (let i = 0; i < src.length; i++) {
    pos = i;
    const c = src[i] ?? '';
    const next = src[i + 1];
    if (c === '\n') {
      endList(i);
      bare += '\n';
      if (pending.length > 0) {
        let k = i + 1;
        for (const h of pending) {
          const lines: string[] = [];
          const bodyStart = Math.min(k, src.length);
          let bodyEnd = bodyStart;
          while (k <= src.length) {
            const e = src.indexOf('\n', k);
            const end = e < 0 ? src.length : e;
            const line = src.slice(k, end);
            k = end + 1;
            if ((h.dash ? line.replace(/^\t+/, '') : line) === h.delim) break;
            lines.push(line);
            bodyEnd = end;
            if (e < 0) break;
          }
          h.cmd.heredocs.push(lines.join('\n'));
          h.cmd.bodies.push([bodyStart, bodyEnd]);
        }
        pending.length = 0;
        i = k - 1;
      }
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') { endWord(); bare += c; continue; }
    if (c === '#' && !inWord && !cmd) {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? src.length : e;
      comments.push([i, end]);
      i = end - 1;
      continue;
    }
    if (c === '<' && next === '#' && ps) {
      endWord();
      const e = src.indexOf('#>', i + 2);
      const end = e < 0 ? src.length : e + 2;
      comments.push([i, end]);
      bare += ' ';
      i = end - 1;
      continue;
    }
    if (c === '^' && cmd) {
      begin(i);
      w += next ?? '';
      bare += next ?? '';
      i++;
      continue;
    }
    if (c === '`' && ps) {
      if (next === '\n') { i++; continue; }
      if (next === '\r' && src[i + 2] === '\n') { i += 2; continue; }
      begin(i);
      w += next ?? '';
      bare += next ?? '';
      i++;
      continue;
    }
    if (c === '\\' && posix) {
      if (next === '\n') { i++; continue; }  // a line continuation joins lines and starts no word
      begin(i);
      w += next ?? '\\';
      bare += next ?? '';
      i++;
      continue;
    }
    if ((c === "'" && !cmd) || (posix && c === '$' && next === "'")) {
      begin(i);
      let k = c === '$' ? i + 2 : i + 1;
      for (; k < src.length && src[k] !== "'"; k++) {
        // $'...' reads backslash escapes, so \' does not close it.
        if (c === '$' && src[k] === '\\') { const n = src[++k]; w += n === 'n' ? '\n' : n === 't' ? '\t' : (n ?? ''); }
        else w += src[k];
      }
      bare += '_';
      i = k;
      continue;
    }
    if (c === '"') {
      begin(i);
      let k = i + 1;
      for (; k < src.length && src[k] !== '"'; k++) {
        const d = src[k] ?? '';
        if (d === '`' && ps) {
          w += src[k + 1] ?? '';
          k++;
        } else if (d === '\\' && posix) {
          const n = src[k + 1] ?? '';
          if (n === '\n') { k++; continue; }
          if ('$`"\\'.includes(n)) { w += n; k++; continue; }
          w += d;
        } else if (special(k)) k = substitution(k);
        else w += d;
      }
      bare += '_';
      i = k;
      continue;
    }
    if (special(i)) { begin(i); i = substitution(i); bare += '_'; continue; }
    if ((c === '<' || c === '>') && next === '(') {
      endWord();
      begin(i);
      const k = closeParen(src, i + 1);
      cur.procs.push(src.slice(i + 2, k));
      cur.subs.push(src.slice(i + 2, k));
      w += src.slice(i, k + 1);
      bare += '_';
      i = k;
      continue;
    }
    if (c === '(' && next === '(' && !inWord && cur.words.length === 0) {
      // `(( ... ))`: arithmetic, kept as a command the way $((...)) is.
      const k = closeParen(src, i);
      if (cur.start < 0) cur.start = i;
      cur.subs.push(src.slice(i + 2, k - 1));
      bare += '_';
      i = k;
      continue;
    }
    const op = REDIRECT.exec(src.slice(i));
    if (op && (c !== '&' || next === '>')) {
      if (inWord && /^\d+$/.test(w)) { w = ''; inWord = false; } else endWord();
      if (cur.start < 0) cur.start = i;
      redir = op[0];
      bare += op[0];
      i += op[0].length - 1;
      continue;
    }
    if (c === '|' || c === '&' || c === ';') {
      bare += c;
      if (c === '|' && next !== '|') {
        endCmd();
        stage++;
        cur = fresh();
        if (next === '&') { i++; bare += '&'; }
        continue;
      }
      if ((c === '|' || c === '&') && next === c) { i++; bare += c; }
      endList(i);
      continue;
    }
    if (c === '(' || c === ')') { endCmd(); bare += c; continue; }
    begin(i);
    w += c;
    bare += c;
  }
  pos = src.length;
  endList(src.length);
  return { cmds, comments, bare, src, posix, cmd };
}

// --- comments ---------------------------------------------------------------

export function stripComments(command: string, posix = true): string {
  let out = '';
  let pos = 0;
  for (const [s, e] of parse(command, posix).comments) { out += command.slice(pos, s); pos = e; }
  return out + command.slice(pos);
}

// --- the hard rules ---------------------------------------------------------

// Words that come before a command without being one.
const RESERVED = new Set(['!', '{', '}', 'if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until']);
// Wrappers that run their argument, each with the options that take a value.
const WRAPPERS: Record<string, string[]> = {
  sudo: ['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-U', '-T'],
  doas: ['-u', '-C'],
  env: ['-u', '-C'],
  command: [],
  builtin: [],
  nice: ['-n'],
  nohup: [],
  setsid: [],
  time: ['-f', '-o'],
  timeout: ['-s', '-k'],
  exec: ['-a'],
  xargs: ['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a'],
  stdbuf: ['-i', '-o', '-e'],
  busybox: [],
};
const ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*=/;
// Programs whose string argument is read the PowerShell or cmd way.
const WINDOWS_SHELLS = new Set(['powershell', 'pwsh', 'cmd', 'iex', 'invoke-expression']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'ash', 'mksh']);
const PIPE_SINKS = new Set([...SHELLS, 'source', '.', 'iex', 'invoke-expression', 'powershell', 'pwsh']);
// An interpreter with no script, code or module argument reads its program from stdin.
const INTERPRETER = /^(?:python[\d.]*|perl|ruby|node|php)$/;
const runsStdin = (r: Resolved | undefined): boolean =>
  r !== undefined && INTERPRETER.test(r.prog) && r.args.every((a) => a === '-' || (a.startsWith('-') && !/^-[A-Za-z]*[cmerE]|^--(?:eval|print)/.test(a)));
const LISTERS = ['get-childitem', 'gci', 'ls', 'dir'];
const REMOVERS = ['remove-item', 'ri', 'rm', 'del', 'erase', 'rd', 'rmdir'];
const DOWNLOADERS = new Set(['curl', 'wget', 'iwr', 'irm', 'invoke-webrequest', 'invoke-restmethod']);
const DOWNLOAD_TEXT = /downloadstring|downloadfile|net\.webclient/i;
const DOWNLOAD_WORD = /(?:^|[^\w-])(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)(?:$|[^\w-])|downloadstring|downloadfile|net\.webclient/i;
const SYSTEM = 'bin|boot|dev|etc|home|lib|lib64|opt|proc|root|sbin|srv|sys|usr|var|Users|System|Library|Applications|private';
const ROOT_OR_HOME = /^(?:\/\*?|~(?:\/\*?)?|\$(?:HOME|\{HOME\})(?:\/\*?)?|\/(?:home|Users)\/[^/\s]+(?:\/\*?)?)$/;
const SYSTEM_DIR = new RegExp(`^/(?:${SYSTEM})(?:/\\*?)?$`);
const DRIVE_ROOT = /^[A-Za-z]:[\\/]\*?$/;
// A drive root or home directory as PowerShell spells it, with or without `\*` or `/*`.
const PS_WIPE_TARGET = /^(?:[a-z]:[\\/]\*?|(?:~|\$home|\$\{home\}|\$env:userprofile)(?:[\\/]\*?)?)$/i;
const PS_RECURSE = /^-r(?:e(?:c(?:u(?:r(?:s(?:e)?)?)?)?)?)?(?::\$true)?$/i;
const BLOCK_DEVICE = /^\/dev\/(?:sd|nvme|hd|vd|disk|mmcblk)/;
const FORK_BOMB = [/:\s*\(\s*\)\s*\{/, /([A-Za-z_]\w*)\s*\(\s*\)\s*\{[^}]*\b\1\s*\|\s*\1\s*&/];

// `/bin/rm`, `C:\Windows\cmd.exe` and `RM` (a case-insensitive file system) name rm and cmd.
const baseName = (word: string) => (word.split(/[\\/]/).pop() ?? '').toLowerCase().replace(/\.exe$/, '');

type Resolved = { prog: string; args: string[]; inner: string[] };

// The program and its arguments past reserved words, assignments, known
// variables and wrappers, plus any command strings it runs (`inner`).
function resolve(words: string[], vars: Map<string, string>): Resolved {
  const w = [...words];
  const inner: string[] = [];
  let i = 0;
  for (let guard = 0; guard < 50; guard++) {
    while (i < w.length && (ASSIGN.test(w[i] ?? '') || RESERVED.has(w[i] ?? ''))) i++;
    const v = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/.exec(w[i] ?? '');
    const value = v?.[1] === undefined ? undefined : vars.get(v[1]);
    if (value !== undefined) { w.splice(i, 1, ...value.split(/\s+/).filter(Boolean)); continue; }
    const name = baseName(w[i] ?? '');
    const opts = Object.hasOwn(WRAPPERS, name) ? WRAPPERS[name] : undefined;
    if (!opts) break;
    i++;
    while (i < w.length && (w[i] ?? '').startsWith('-')) {
      const o = w[i] ?? '';
      // `env -S 'a b'` splits its string into a command.
      if (name === 'env' && /^(?:-S|--split-string)/.test(o)) {
        const attached = o.startsWith('--split-string=') ? o.slice(15) : o.slice(2);
        inner.push([attached || w[++i] || '', ...w.slice(i + 1)].join(' '));
        return { prog: '', args: [], inner };
      }
      i += opts.includes(o) ? 2 : 1;
    }
    if (name === 'timeout') i++;  // the duration
  }
  const prog = baseName(w[i] ?? '');
  const args = w.slice(i + 1);
  if (SHELLS.has(prog)) {
    // `bash -x -c 'cmd' name args`: the string is the first word that is not an option.
    let c = false;
    for (let k = 0; k < args.length; k++) {
      const a = args[k] ?? '';
      if (a === '--') continue;
      if (/^[-+]o$/.test(a)) { k++; continue; }
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(a)) { c = true; continue; }
      if (a.startsWith('-') || a.startsWith('+')) continue;
      if (c) inner.push(a);
      break;
    }
  } else if (prog === 'eval') inner.push(args.join(' '));
  else if (prog === 'su') {
    const k = args.findIndex((a) => a === '-c' || a === '--command');
    const attached = args.find((a) => a.startsWith('--command='));
    if (k >= 0 && args[k + 1] !== undefined) inner.push(args[k + 1] ?? '');
    else if (attached) inner.push(attached.slice(10));
  } else if (prog === 'powershell' || prog === 'pwsh') {
    const k = args.findIndex((a) => /^-c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i.test(a));
    if (k >= 0) inner.push(args.slice(k + 1).join(' '));
    // -EncodedCommand (-e, -ec, any prefix): base64 of UTF-16LE text.
    const e = args.findIndex((a) => a.toLowerCase() === '-ec' || (a.length >= 2 && '-encodedcommand'.startsWith(a.toLowerCase())));
    if (e >= 0 && args[e + 1] !== undefined) inner.push(Buffer.from(args[e + 1] ?? '', 'base64').toString('utf16le'));
  } else if (prog === 'iex' || prog === 'invoke-expression') {
    inner.push(args.filter((a) => !/^-c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i.test(a)).join(' '));
  } else if (prog === 'cmd') {
    const k = args.findIndex((a) => /^\/[ck]$/i.test(a));
    if (k >= 0) inner.push(args.slice(k + 1).join(' '));
  }
  return { prog, args, inner };
}

const downloads = (text: string, vars = new Map<string, string>()): boolean =>
  DOWNLOAD_TEXT.test(text) || parse(text, true).cmds.some((c) => DOWNLOADERS.has(resolve(c.words, vars).prog));
// Does the text substitute a download's output into itself? (`"$(curl x)"`)
const substitutesDownload = (text: string): boolean => parse(text, true).cmds.some((c) => c.subs.some((s) => downloads(s)));

// `find` past its -H, -L, -P, -D and -O options: its starting points, then a deleting action.
function findWipes(args: string[]): boolean {
  let i = 0;
  while (/^-(?:[HLP]|D|O\d*)$/.test(args[i] ?? '')) i += args[i] === '-D' ? 2 : 1;
  const starts: string[] = [];
  for (; i < args.length && !/^[-(!]/.test(args[i] ?? ''); i++) starts.push(args[i] ?? '');
  const deletes = args.some((a, k) => a === '-delete' || (/^-(?:exec|execdir|ok|okdir)$/.test(a) && baseName(args[k + 1] ?? '') === 'rm'));
  return deletes && starts.some((a) => ROOT_OR_HOME.test(a) || SYSTEM_DIR.test(a));
}

function commandRule(r: Resolved, c: Cmd): string | null {
  const { prog, args } = r;
  const plain = args.filter((a) => !a.startsWith('-'));
  const recursive = (flag: RegExp) => args.some((a) => a === '--recursive' || flag.test(a));
  if (prog === 'rm' && recursive(/^-[^-]*[rR]/) && plain.some((a) => ROOT_OR_HOME.test(a) || SYSTEM_DIR.test(a))) return 'rm-root';
  if (/^mkfs(?:\.\w+)?$/.test(prog) || (prog === 'dd' && args.some((a) => a.startsWith('of=/dev/')))) return 'disk';
  if (c.redirs.some((d) => /^(?:>|>>|>\||&>|&>>|<>)$/.test(d.op) && BLOCK_DEVICE.test(d.target))) return 'disk';
  if ((prog === 'chmod' || prog === 'chown') && recursive(/^-[^-]*R/) && plain.some((a) => ROOT_OR_HOME.test(a))) return 'perms-root';
  if (prog === 'find' && findWipes(args)) return 'find-root';
  if (['shutdown', 'reboot', 'halt', 'poweroff'].includes(prog)) return 'power';
  if (prog === 'systemctl' && ['reboot', 'poweroff', 'halt', 'kexec'].includes(plain[0] ?? '')) return 'power';
  if ((prog === 'init' || prog === 'telinit') && (args[0] === '0' || args[0] === '6')) return 'power';
  if (prog === 'format' && args.some((a) => /^[A-Za-z]:$/.test(a))) return 'win-wipe';
  const lower = args.map((a) => a.toLowerCase());
  // rd, rmdir and erase are Remove-Item aliases in PowerShell; -r is any prefix of -Recurse.
  if (['remove-item', 'rm', 'del', 'ri', 'rd', 'rmdir', 'erase'].includes(prog) && args.some((a) => PS_RECURSE.test(a))
      && plain.some((a) => PS_WIPE_TARGET.test(a))) return 'win-wipe';
  if ((prog === 'rd' || prog === 'rmdir') && lower.includes('/s') && plain.some((a) => DRIVE_ROOT.test(a) || a.toUpperCase() === '%USERPROFILE%')) return 'win-wipe';
  if (prog === 'del' && lower.includes('/s') && plain.some((a) => DRIVE_ROOT.test(a))) return 'win-wipe';
  // A download run as code: by process substitution, a substitution in a
  // shell's string or here-string, or an expression evaluator's argument.
  if (SHELLS.has(prog) || prog === 'source' || prog === '.') {
    if (c.procs.some((s) => downloads(s)) || [...r.inner, ...c.herestrings].some(substitutesDownload)) return 'pipe-to-shell';
  }
  if (prog === 'eval' && c.subs.some((s) => downloads(s))) return 'pipe-to-shell';
  if ((prog === 'iex' || prog === 'invoke-expression') && DOWNLOAD_WORD.test(c.rest)) return 'pipe-to-shell';
  return null;
}

function rulesOf(p: Parsed, depth: number): string | null {
  if (FORK_BOMB.some((re) => re.test(p.bare))) return 'fork-bomb';
  const vars = new Map<string, string>();
  const resolved = new Map<Cmd, Resolved>();
  for (const c of p.cmds) {
    for (const s of c.subs) {
      const r = hardRule(s, depth + 1, p.posix, p.cmd);
      if (r) return r;
    }
    // `X=rm` alone (or after export, local, declare) names a program for a later `$X`.
    const decl = ['export', 'local', 'declare', 'readonly', 'typeset'].includes(c.words[0] ?? '') ? c.words.slice(1) : c.words;
    if (decl.length > 0 && decl.every((x) => ASSIGN.test(x))) {
      for (const x of decl) vars.set(x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1));
    }
    const r = resolve(c.words, vars);
    resolved.set(c, r);
    const rule = commandRule(r, c);
    if (rule) return rule;
    // What powershell, pwsh or cmd receive is read their way: a backslash is a
    // path separator there, and only there (N1). Bash runs everything else.
    // The exception is a command naming a drive path, read the PowerShell way too (DRIVE_PATH, classifyShell).
    // Both the string bash passes after its own unquoting and the raw text are
    // checked, since either reading can be the one that holds the command (N4).
    // The raw text is read as PowerShell, the shell that would hand it over;
    // the string cmd receives is read the cmd way.
    const windows = WINDOWS_SHELLS.has(r.prog);
    const first = windows && p.posix ? parse(p.src.slice(c.start), false).cmds[0] : undefined;
    const inner = [...r.inner, ...(first ? resolve(first.words, vars).inner : [])];
    for (const s of inner) {
      const x = hardRule(s, depth + 1, !windows, r.prog === 'cmd');
      if (x) return x;
    }
  }
  for (const c of p.cmds) {
    const pipeline = p.cmds.filter((d) => d.list === c.list);
    const fed = (d: Cmd) => PIPE_SINKS.has(resolved.get(d)?.prog ?? '') || resolved.get(d)?.prog === 'eval';
    // A heredoc or here-string read by a shell is commands, not data.
    if ((c.heredocs.length > 0 || c.herestrings.length > 0) && (fed(c) || pipeline.some((d) => d.stage > c.stage && fed(d)))) {
      for (const body of [...c.heredocs, ...c.herestrings]) {
        const x = hardRule(body, depth + 1, p.posix, p.cmd);
        if (x) return x;
      }
    }
    // A download piped into a shell.
    const prog = resolved.get(c)?.prog ?? '';
    if (DOWNLOADERS.has(prog) || DOWNLOAD_TEXT.test(c.words.join(' '))) {
      if (pipeline.some((d) => d.stage > c.stage && (PIPE_SINKS.has(resolved.get(d)?.prog ?? '') || runsStdin(resolved.get(d))))) return 'pipe-to-shell';
    }
    // A listing of a drive root or home piped into a deletion.
    if (LISTERS.includes(prog) && (resolved.get(c)?.args ?? []).some((a) => !a.startsWith('-') && PS_WIPE_TARGET.test(a))
        && pipeline.some((d) => d.stage > c.stage && REMOVERS.includes(resolved.get(d)?.prog ?? ''))) return 'win-wipe';
  }
  return null;
}

function hardRule(command: string, depth = 0, posix = true, cmd = false): string | null {
  return depth > 6 ? null : rulesOf(parse(command, posix, cmd), depth);
}

// The agent never touches fx's own state: a forged journal line there would
// change what the Stop check and the nudges see (lens I8).
// Only fx's own directory is refused (N3); another mention of a state
// directory is never read-only (STATE_MENTION).
const FX_STATE = /(?:\.local[\\/]+state|\$\{?XDG_STATE_HOME\}?|%LOCALAPPDATA%|\$env:LOCALAPPDATA|\$\{?LOCALAPPDATA\}?|AppData[\\/]+Local)[\\/]+fx(?![\w.-])/i;
const STATE_MENTION = /\.local[\\/]+state|XDG_STATE_HOME|LOCALAPPDATA/i;
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// fx's config directory is fx's alone, like its state directory (final review, lens I2).
const FX_CONFIG = /(?:\.config|\$\{?XDG_CONFIG_HOME\}?|%APPDATA%|\$env:APPDATA|\$\{?APPDATA\}?|AppData[\\/]+Roaming)[\\/]+fx(?![\w.-])/i;

export function namesFxState(text: string): boolean {
  const { stateDir, configDir } = machinePaths();
  return [stateDir, configDir].some((dir) => new RegExp(`${escapeRe(dir)}(?![\\w.-])`).test(text)) || FX_STATE.test(text) || FX_CONFIG.test(text);
}

// --- the read-only allowlist ------------------------------------------------

// Shell words with their quotes removed. Not a shell parser; the allowlist
// refuses any text with an operator in it before it gets here.
function words(segment: string): string[] {
  return (segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []).map((w) => w.replace(/"([^"]*)"|'([^']*)'/g, '$1$2'));
}

const SECRETS = ['.env', 'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa', '.ssh/', '.pem', '.key', '.p12', '.pfx', 'credentials',
  '.aws/', '.kube/config', '.docker/config.json', '.git-credentials', '.npmrc', '.netrc', '.pgpass'];
const PLAIN = new Set(['ls', 'pwd', 'cat', 'head', 'tail', 'wc', 'grep', 'stat', 'file', 'du', 'df', 'which', 'type', 'echo',
  'date', 'whoami', 'uname', 'get-childitem', 'get-content', 'get-location', 'dir']);
const FIND_ACTIONS = ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'];
const BRANCH_WRITES = ['--delete', '--move', '--copy', '--force', '--set-upstream-to', '--unset-upstream', '--edit-description'];
const flagged = (args: string[], flags: string[]) => args.some((a) => flags.some((f) => a === f || a.startsWith(`${f}=`)));

function readOnly(command: string, posix = true): boolean {
  const text = command.trim();
  if (/[;&|><`\n\r]|\$\(/.test(text)) return false;
  // PowerShell runs `(...)`, `@(...)` and `{...}` in argument mode.
  if (!posix && /[({]/.test(text)) return false;
  const [prog = '', ...args] = words(text);
  if (args.some((a) => SECRETS.some((s) => a.replace(/\\/g, '/').includes(s)))) return false;
  if (STATE_MENTION.test(text)) return false;
  const p = prog.toLowerCase();
  if (PLAIN.has(p)) return true;
  if (p === 'rg') return !flagged(args, ['--pre', '--pre-glob']);
  if (p === 'find') return !args.some((a) => FIND_ACTIONS.includes(a));
  if (p === 'tree') return !args.some((a) => a.startsWith('-o'));
  if (p === 'node') return args.length === 1 && (args[0] === '--version' || args[0] === '-v');
  if (p === 'npm') return args[0] === 'ls';
  if (p !== 'git') return false;
  const [sub = '', ...rest] = args;
  if (['status', 'log', 'diff', 'show'].includes(sub)) return !flagged(rest, ['--output', '--ext-diff']);
  if (sub === 'branch') return !flagged(rest, BRANCH_WRITES) && !rest.some((a) => /^-[^-]*[dDmMcCfu]/.test(a));
  if (sub === 'remote') return rest.length === 1 && rest[0] === '-v';
  return ['rev-parse', 'ls-files', 'blame'].includes(sub);
}

// `posix: false` is a top level PowerShell runs (Codex on Windows). Both
// readings are checked there, since either can hold the command (N4).
// bash reads the backslash of `C:\ ` as an escape, so a command naming a drive path is read the PowerShell way too.
const DRIVE_PATH = /(?:^|[^\w])[A-Za-z]:\\/;
export function classifyShell(command: string, posix = true): ShellClass {
  const rule = namesFxState(command) ? 'fx-state' : hardRule(command) ?? (posix && !DRIVE_PATH.test(command) ? null : hardRule(command, 0, false));
  if (rule) return { kind: 'hard-deny', rule, reason: hardReason(rule) };
  return readOnly(stripComments(command, posix), posix) ? { kind: 'read-only' } : { kind: 'grey' };
}
