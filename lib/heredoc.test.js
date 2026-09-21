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
  `cat > t.md <<'EOF'\njust docs\nEOF\n${G} push origin main`,
  'real command following a heredoc');

// --- nothing else loosened ---
check(false, `echo hi\n${G} push origin main`, 'plain newline chain');
check(false, `cd /tmp && ${G} push origin main`, 'cd && git');
check(false, `${G} push --force`, 'force push');
check(false, `${G} reset --hard`, 'reset --hard');
check(true, `${G} status`, 'read-only still allowed');
check(true, `${G} init`, 'init still allowed');

// --- the worktree side is unaffected ---
const wt = inspect(`${G} commit -m x`, WT).allow;
if (wt === true) pass++; else { fail++; console.log('FAIL  commit in worktree still allowed'); }

// --- a heredoc fed to a SHELL is commands, not data: must be refused ---
// Amendment A7. These take a cwd, unlike check() above, which always uses MAIN.
const expect = (want, cmd, cwd, label) => {
  const got = inspect(cmd, cwd).allow;
  if (got === want) { pass++; }
  else { fail++; console.log(`FAIL  ${label}\n      want allow=${want} got allow=${got}`); }
};
const blocked = (cmd, cwd, label) => expect(false, cmd, cwd, label);
const allowed = (cmd, cwd, label) => expect(true, cmd, cwd, label);

blocked(`bash <<EOF\n${G} branch -D x\nEOF`, WT, 'bash reading a heredoc');
blocked(`sh <<'EOF'\n${G} branch -D x\nEOF`, WT, 'sh reading a quoted heredoc');
blocked(`/bin/bash -s <<EOF\n${G} branch -D x\nEOF`, WT, 'absolute bash -s');
blocked(`sudo bash <<EOF\n${G} push --force origin x\nEOF`, WT, 'sudo bash');
// Any consumer in the heredoc's pipeline being a shell makes the body commands.
blocked(`cat <<EOF | bash\n${G} branch -D x\nEOF`, WT, 'heredoc piped into bash');
blocked(`bash <<< "${G} branch -D x"`, WT, 'here-string fed to bash');
blocked(`timeout 5 bash <<EOF\n${G} branch -D x\nEOF`, WT, 'timeout wrapping bash');
blocked(`nohup bash <<EOF\n${G} branch -D x\nEOF`, WT, 'nohup wrapping bash');
blocked(`exec bash <<EOF\n${G} branch -D x\nEOF`, WT, 'exec bash');
allowed(`cat > t.md <<EOF\n${G} branch -D x\nEOF`, WT, 'cat writing an example is still data');
allowed(`tee notes.md <<'EOF'\n${G} push origin main\nEOF`, MAIN, 'tee writing an example is still data');
allowed(`cat <<EOF | grep git\n${G} branch -D x\nEOF`, WT, 'a pipeline with no shell keeps the body as data');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
