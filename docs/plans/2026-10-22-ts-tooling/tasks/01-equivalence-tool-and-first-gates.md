# 01: Equivalence tool, process helper, first two gates

**Status:** ready-for-agent
**Blocked by:** None in this plan. Sub-projects 1, 2 and 3 must be complete (plan.md ruling).
**Phase:** MVP

**What to build:** after this task a contributor can prove a migrated script behaves like the one it replaces: `node scripts/equiv record` captures the old script's output on fixed cases, and `node scripts/equiv check` compares the new script against that record using Node alone; `check-all` runs the check. Two bash gates, `check-reference-leaves` and `check-tool-names`, are the first migrated through it. Every later task spawns processes through one helper and writes ASCII JSON through one function. `.gitattributes` keeps every text file LF, and the build compiles any node-shebang script source to an extensionless executable without a list.

**Design:** Implementation Decisions > 2; Implementation Decisions > 4; Implementation Decisions > 5; Implementation Decisions > 7; Implementation Decisions > 10; Testing Decisions

**Files:**
- Create: `src/lib/proc.ts` (built to `lib/proc.js`), `src/lib/proc.test.ts`
- Modify: `src/lib/json.ts` (add `stringifyAscii`), `src/lib/json.test.ts` (create if absent)
- Create: `src/scripts/equiv.ts` (built to `scripts/equiv`), `src/scripts/equiv.test.ts`
- Create: `src/scripts/check-reference-leaves.ts`, `src/scripts/check-tool-names.ts` (built over the bash files at the same paths)
- Create: `tests/equivalence/check-reference-leaves.json`, `tests/equivalence/check-tool-names.json` and their `.golden.json`
- Create: `.gitattributes`
- Modify: `scripts/build` (still bash here: the shebang rule replaces the list of three extensionless files)
- Modify: `src/scripts/test-scope.ts` and `src/scripts/test-scope.test.ts` (test-scope's own list of extensionless outputs is replaced by the same shebang rule)
- Modify: `scripts/check-all` (still bash: run `node scripts/check-reference-leaves`, `node scripts/check-tool-names`; add rows `equiv.test.js`, `proc.test.js`, `json.test.js`, and `equivalence` running `node scripts/equiv check tests/equivalence` after `check-generated`)
- Delete: nothing (the two gates are overwritten in place by their generated JavaScript)

**Interfaces:**
- Produces: `run(cmd: string, args: readonly string[], opts?: RunOptions) -> RunResult` in `lib/proc`, where `RunOptions = { cwd?: string; env?: Readonly<Record<string, string | undefined>>; input?: string; timeoutMs?: number; stdio?: 'pipe' | 'inherit'; platform?: NodeJS.Platform; spawn?: typeof import('node:child_process').spawnSync }` and `RunResult = { status: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }`. Never `shell: true`, except on win32 for a bare command resolving on `PATH` to `.cmd` or `.bat`; there it wraps every argument in double quotes, and throws `Error('proc: unsafe argument for a .cmd shim: <arg>')` if an argument holds `"`, `%`, `^`, `&`, `|`, `<`, `>`, `\r` or `\n`. `platform` defaults to `process.platform`; an optional `spawn` (default `child_process.spawnSync`) exists for tests.
- Produces: `runNode(script: string, args: readonly string[], opts?: RunOptions) -> RunResult`: `run(process.execPath, [script, ...args], opts)`.
- Produces: `toPosixRel(root: string, p: string) -> string`: `path.relative(root, p)` with every separator as `/`.
- Produces: `stringifyAscii(value: unknown, indent?: number) -> string` in `lib/json`: `JSON.stringify(value, null, indent)` with every UTF-16 unit from U+0080 up written as `\uXXXX` in lowercase hex, which equals Python's `json.dumps(value, indent=indent)`.
- Produces: `scripts/equiv <compare|record|check> <cases.json|dir>` and `scripts/equiv record --from-new <cases.json> <case>` (re-records one case from the new script; only under a ledger Ruling, plan.md). A dir means every `*.json` in it not ending `.golden.json`. Exit 0 printing `equiv: <file>: <n> case(s) identical` per file; exit 1 printing `DIFF <file> <case>: <exit|stdout|stderr|tree>` then `  old: <first differing line>` and `  new: <first differing line>`; exit 1 with `FAIL: <golden> missing: run equiv record` when `check` has no golden; exit 2 with `usage: equiv <compare|record|check> <cases.json|dir>`; exit 2 with `equiv: <file>: no case <case>` for `--from-new` with an unknown case.
- Produces: the cases file type (from `src/scripts/equiv.ts`, exported for tests):

```ts
type EquivCases = {
  old: { rev: string; path: string; argv: string[] }; // argv names old.path as the repo-relative path it runs at
  new: { argv: string[]; tool: string[] };              // tool: working-tree paths (the new script, built libs it requires) copied into the new root only
  cases: Array<{
    name: string;
    copy: string[];                    // globs over git ls-tree -r old.rev, read with git show old.rev:<path>; live cases glob the working tree
    write?: Record<string, string>;    // path -> content, written after copy
    remove?: string[];
    link?: string[];                   // repo paths linked into the scratch root (junction on win32), e.g. node_modules
    args?: string[];                   // appended to both argv; "{root}" is the scratch root
    env?: Record<string, string>;      // "{root}" substituted; the env starts empty apart from PATH and LC_ALL=C
    tree?: string;                     // directory under the scratch root to snapshot
    sortLines?: boolean;               // sort stdout and stderr lines of both before comparing (tools printing in find order)
    git?: boolean;                     // after writes: git init -q, git add -A (no commit), for tools reading git ls-files
    setup?: string[][];                // argv lists run with the case env in the scratch root after git, before old and new
    live?: boolean;                    // copy the working tree, implies git; compare only, never recorded
  }>;
};
```

  Old and new each get their own fresh scratch root. The old root holds the copied inputs, with `old.path` itself taken from `old.rev` at its real path and mode 755, so the script's own file name in its messages is unchanged; the new root holds the same inputs plus `new.tool` from the working tree. Every command runs with its scratch root as cwd. Both the root's given path and its `fs.realpathSync` form (macOS `/private/var/...`) are replaced by `<ROOT>` in stdout, stderr and link targets before comparing. A tree snapshot is one line per path, sorted by code point: `<rel> <d|f|l> <sha256 or link target> <x|->`; a path with a `.git` segment is listed as `<rel> <d|f> - -` and never hashed or descended into. Cases and golden files are written with `stringifyAscii(..., 2)` plus a newline.
- Produces: build rule: a source under `src/scripts/` or `src/skills/<skill>/scripts/`, not ending `.test.ts`, whose line 1 is `#!/usr/bin/env node`, builds to the same path without `.ts`, mode `100755`. Sub-project 1's three extensionless sources must match it; the build fails with `scripts/build: <path> is extensionless output but has no node shebang` for a previously listed file that does not.

**Seam:** `scripts/check-all`; `equiv check` is the permanent equivalence row.

**Tests:**
- `equiv.test`: two node scripts that print the same text: `compare` exits 0 and prints `equiv: <file>: 1 case(s) identical`.
- `equiv.test`: new prints `b` where old prints `a`: `compare` exits 1 and prints `DIFF <file> one: stdout`, `  old: a`, `  new: b`.
- `equiv.test`: same output, exit 0 versus 1: `DIFF <file> one: exit`.
- `equiv.test`: case with `tree: "out"` where new writes `out/x` mode 644 and old mode 755: `DIFF <file> one: tree`.
- `equiv.test`: `record` then `check` with the same new script: exit 0; golden file exists and is pure ASCII when the output held U+00E9.
- `equiv.test`: `check` with no golden: exit 1, `FAIL: <golden> missing: run equiv record`.
- `equiv.test`: a `live` case is skipped by `record` and `check` (count excludes it) and run by `compare`.
- `equiv.test`: output containing the scratch root's path is compared as `<ROOT>`, and so is its real path when the root sits under a symlinked temp directory (simulated with a symlink in the test's own scratch dir).
- `equiv.test`: a recorded case copying `a.txt` keeps its golden when `a.txt` changes in the working tree after recording (inputs come from `old.rev`).
- `equiv.test`: an old script that prints `process.argv[1]`'s base name prints its real name, not a renamed copy.
- `equiv.test`: a case setting nothing sees no `HOME` in its environment.
- `equiv.test`: `sortLines: true` with old printing `b\na` and new `a\nb`: identical.
- `equiv.test`: a tree holding `.git/HEAD` with different contents in old and new: identical.
- `equiv.test`: `record --from-new` on case `one` rewrites only that case's golden entry.
- `equiv.test`: a case with `git: true` whose new argv runs `git ls-files` prints the written file names.
- `equiv.test`: a case with `setup: [["git","-c","user.name=t","-c","user.email=t@t","commit","-qm","a"]]` and new argv `git rev-list --count HEAD` prints `1`. Old and new each get their own fresh scratch root, so a script that writes cannot affect the other.
- `proc.test`: `runNode` of a script printing `process.argv.slice(2)` with args `['a b', '"q"']` returns stdout `["a b","\"q\""]`.
- `proc.test`: `run('git', ['--version'])` returns status 0 and stdout starting `git version`.
- `proc.test`: `platform: 'win32'` with a fake `PATH` holding `x.cmd` and arg `a&b` throws `proc: unsafe argument for a .cmd shim: a&b`.
- `proc.test`: `platform: 'win32'`, same fake `PATH`, args `['a b', 'c']`: the command line handed to the shell is `x "a b" "c"` (asserted through the spawn function the helper takes for tests).
- test-scope: `--built-path src/scripts/equiv.ts` prints `scripts/equiv`; `--built-path src/scripts/equiv.test.ts` prints `scripts/equiv.test.js`.
- `proc.test`: `toPosixRel('/r', '/r/a/b')` is `a/b`.
- `json.test`: `stringifyAscii` of an object with key `a` holding the two characters U+00E9 and U+1F600, and key `b` holding an empty array, indent 2, is the text `{`, newline, `  "a": "\u00e9\ud83d\ude00",`, newline, `  "b": []`, newline, `}` (each `\` a single backslash), which is what Python's `json.dumps(..., indent=2)` prints for the same value.
- Gate equivalence, each recorded then checked: check-reference-leaves cases `clean` (one reference citing a skill file: prints `OK: no reference links to another reference`, exit 0), `leaf-link` (a reference naming another existing reference `.md`: prints `  references/a.md -> b.md`, `FAIL: 1 reference-to-reference link(s)`, exit 1), `two-links-sorted`; check-tool-names cases `clean` (`check-tool-names: OK`), `backticked-tool`, `call-form` (a tool name followed directly by an opening parenthesis), `the-x-tool`, `fenced-is-exempt`, `prompt-file` (`*-prompt.md`), and one case per argument form the bash script accepts.
- check-tool-names walks files in `find` order without sorting, so each of its cases with findings holds exactly one finding file. Every case input is written by the case (`write`), never copied from the working tree.
- Live compare for both gates on the whole repo, check-tool-names with `sortLines: true`: identical; recorded in the ledger.
- Build rule: `scripts/build --out <tmp>` yields `scripts/equiv` mode `100755` with shebang on line 1 and the generated header on line 2, and still yields sub-project 1's three extensionless files.

**Risks:** `grep -E` with `\b` is GNU ERE; JavaScript's `\b` is ASCII-only, as is GNU grep's in the C locale, which is why recording uses `LC_ALL=C`. Applying `.gitattributes` can renormalize a tracked CRLF file: run `git ls-files --eol | grep 'i/crlf'` first; any hit is test data and gets `-text` in `.gitattributes` instead.

**Testing:** unit tests for equiv, proc and json; recorded equivalence; `check-all`.

## Acceptance criteria
- [ ] `node scripts/equiv check tests/equivalence` prints two `identical` lines and exits 0; `check` mode spawns only `node` (asserted in `equiv.test` by a case whose old argv names a missing interpreter).
- [ ] `equiv compare` with a live case over the repo is identical for both gates; ledger has the output.
- [ ] `scripts/check-reference-leaves` and `scripts/check-tool-names` are generated files with the header on line 2 and mode `100755`.
- [ ] `bash scripts/check-all` prints `ALL GREEN` (it becomes Node in task 02).
- [ ] `git grep -nE "(python3?|bash|sh) [^ ]*scripts/check-(reference-leaves|tool-names)"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `git rev-parse HEAD` as `old.rev` in the ledger**
- [ ] **3. Write the unit tests the Tests field names**
- [ ] **4. Run them: verify RED**

Run: `scripts/build && node scripts/equiv.test.js; node lib/proc.test.js; node lib/json.test.js`
Expected: each fails because the module is missing.

- [ ] **5. Implement `lib/proc`, `stringifyAscii`, `scripts/equiv` and the build rule**
- [ ] **6. Run the unit tests: verify GREEN**
- [ ] **7. Write both cases files and record goldens from the old bash gates**

Run: `scripts/build && node scripts/equiv record tests/equivalence`

- [ ] **8. Port both gates; run `node scripts/equiv check tests/equivalence` and the live compare: verify identical**
- [ ] **9. Run the scope**

Run: `bash scripts/check-all` (tracked background command)

- [ ] **10. Commit by path**

```
git add .gitattributes src/lib/proc.ts src/lib/proc.test.ts lib/proc.js lib/proc.test.js src/lib/json.ts src/lib/json.test.ts lib/json.js lib/json.test.js src/scripts/equiv.ts src/scripts/equiv.test.ts scripts/equiv scripts/equiv.test.js src/scripts/check-reference-leaves.ts src/scripts/check-tool-names.ts scripts/check-reference-leaves scripts/check-tool-names tests/equivalence scripts/build scripts/check-all src/scripts/test-scope.ts scripts/test-scope src/scripts/test-scope.test.ts scripts/test-scope.test.js
git commit -m "build: equivalence tool and process helper; two gates on Node"
```
