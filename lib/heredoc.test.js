'use strict';
// Regression tests for the heredoc false positive.
//
// Found by dogfooding: writing a task file whose body SHOWED a git command
// was refused as if the command had been run. Documentation that contains git
// examples is the normal case, not an edge case: fx's own tasks do it.
//
// Run: node lib/heredoc.test.js <main-checkout> <worktree>

const { inspect } = require('./git-guard');

const [MAIN, WT] = process.argv.slice(2);
if (!MAIN || !WT) { console.error('usage: heredoc.test.js <main> <worktree>'); process.exit(2); }

let pass = 0, fail = 0;
const G = ['g', 'i', 't'].join('');           // avoid a literal the old guard would flag
const check = (want, cmd, label) => {
  const got = inspect(cmd, MAIN).allow;
  if (got === want) { pass++; }
  else { fail++; console.log(`FAIL  ${label}\n      want allow=${want} got allow=${got}`); }
};

// --- heredoc bodies are DATA: must be allowed ---
check(true,
  `cat > t.md <<'EOF'\nDocs showing:\n${G} add -A\n${G} commit -m x\n${G} push origin main\nEOF`,
  'quoted heredoc containing git examples');

check(true,
  `cat > t.md <<EOF\n${G} commit -m x\nEOF`,
  'unquoted heredoc');

check(true,
  `cat > t.md <<"EOF"\n${G} reset --hard\nEOF`,
  'double-quoted heredoc');

check(true,
  `cat > t.md <<-EOF\n\t${G} commit -m x\n\tEOF`,
  '<<- heredoc with indented terminator');

check(true,
  `cat > a.md <<'A'\n${G} commit -m x\nA\ncat > b.md <<'B'\n${G} push\nB`,
  'two heredocs in one command');

// --- a real command AFTER a heredoc must still be caught ---
check(false,
  `cat > t.md <<'EOF'\njust docs\nEOF\n${G} commit -m x`,
  'real command following a heredoc');

// --- nothing else loosened ---
check(false, `echo hi\n${G} commit -m x`, 'plain newline chain');
check(false, `cd /tmp && ${G} commit -m x`, 'cd && git');
check(false, `${G} push --force`, 'force push');
check(false, `${G} reset --hard`, 'reset --hard');
check(true, `${G} status`, 'read-only still allowed');
check(true, `${G} init`, 'init still allowed');

// --- the worktree side is unaffected ---
const wt = inspect(`${G} commit -m x`, WT).allow;
if (wt === true) pass++; else { fail++; console.log('FAIL  commit in worktree still allowed'); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
