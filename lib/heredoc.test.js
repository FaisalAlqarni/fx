// generated from src/lib/heredoc.test.ts by scripts/build: edit there, not here
"use strict";
var import_git_guard = require("./git-guard.js");
const [MAIN = "", WT = ""] = process.argv.slice(2);
if (!MAIN || !WT) {
  console.error("usage: heredoc.test.js <main> <worktree>");
  process.exit(2);
}
let pass = 0, fail = 0;
const G = ["g", "i", "t"].join("");
const check = (want, cmd, label) => {
  const got = (0, import_git_guard.inspect)(cmd, MAIN).allow;
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${label}
      want allow=${want} got allow=${got}`);
  }
};
check(
  true,
  `cat > t.md <<'EOF'
Docs showing:
${G} add -A
${G} commit -m x
${G} push origin main
EOF`,
  "quoted heredoc containing git examples"
);
check(
  true,
  `cat > t.md <<EOF
${G} commit -m x
EOF`,
  "unquoted heredoc"
);
check(
  true,
  `cat > t.md <<"EOF"
${G} reset --hard
EOF`,
  "double-quoted heredoc"
);
check(
  true,
  `cat > t.md <<-EOF
	${G} commit -m x
	EOF`,
  "<<- heredoc with indented terminator"
);
check(
  true,
  `cat > a.md <<'A'
${G} commit -m x
A
cat > b.md <<'B'
${G} push
B`,
  "two heredocs in one command"
);
check(
  false,
  `cat > t.md <<'EOF'
just docs
EOF
${G} push origin main`,
  "real command following a heredoc"
);
check(false, `echo hi
${G} push origin main`, "plain newline chain");
check(false, `cd /tmp && ${G} push origin main`, "cd && git");
check(false, `${G} push --force`, "force push");
check(false, `${G} reset --hard`, "reset --hard");
check(true, `${G} status`, "read-only still allowed");
check(true, `${G} init`, "init still allowed");
const wt = (0, import_git_guard.inspect)(`${G} commit -m x`, WT).allow;
if (wt === true) pass++;
else {
  fail++;
  console.log("FAIL  commit in worktree still allowed");
}
const expect = (want, cmd, cwd, label) => {
  const got = (0, import_git_guard.inspect)(cmd, cwd).allow;
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${label}
      want allow=${want} got allow=${got}`);
  }
};
const blocked = (cmd, cwd, label) => expect(false, cmd, cwd, label);
const allowed = (cmd, cwd, label) => expect(true, cmd, cwd, label);
blocked(`bash <<EOF
${G} branch -D x
EOF`, WT, "bash reading a heredoc");
blocked(`sh <<'EOF'
${G} branch -D x
EOF`, WT, "sh reading a quoted heredoc");
blocked(`/bin/bash -s <<EOF
${G} branch -D x
EOF`, WT, "absolute bash -s");
blocked(`sudo bash <<EOF
${G} push --force origin x
EOF`, WT, "sudo bash");
blocked(`cat <<EOF | bash
${G} branch -D x
EOF`, WT, "heredoc piped into bash");
blocked(`bash <<< "${G} branch -D x"`, WT, "here-string fed to bash");
blocked(`timeout 5 bash <<EOF
${G} branch -D x
EOF`, WT, "timeout wrapping bash");
blocked(`nohup bash <<EOF
${G} branch -D x
EOF`, WT, "nohup wrapping bash");
blocked(`exec bash <<EOF
${G} branch -D x
EOF`, WT, "exec bash");
allowed(`cat > t.md <<EOF
${G} branch -D x
EOF`, WT, "cat writing an example is still data");
allowed(`tee notes.md <<'EOF'
${G} push origin main
EOF`, MAIN, "tee writing an example is still data");
allowed(`cat <<EOF | grep git
${G} branch -D x
EOF`, WT, "a pipeline with no shell keeps the body as data");
blocked(`command bash <<EOF
${G} branch -D x
EOF`, WT, "command bash");
blocked(`eval bash <<EOF
${G} branch -D x
EOF`, WT, "eval bash");
blocked(`nice -n 5 bash <<EOF
${G} branch -D x
EOF`, WT, "nice wrapping bash");
blocked(`source /dev/stdin <<EOF
${G} branch -D x
EOF`, WT, "source /dev/stdin");
blocked(`. /dev/stdin <<EOF
${G} branch -D x
EOF`, WT, ". /dev/stdin");
blocked(`fish <<EOF
${G} branch -D x
EOF`, WT, "fish reading a heredoc");
blocked(`fish -c "${G} branch -D x"`, WT, "fish -c");
blocked(`bash -s arg <<EOF
${G} branch -D x
EOF`, WT, "bash -s with an argument still reads stdin");
blocked(`bash -o pipefail <<EOF
${G} branch -D x
EOF`, WT, "an option value is not a script file");
allowed(`bash script.sh <<EOF
${G} branch -D x
EOF`, WT, "bash running a script file: the heredoc is its input data");
allowed(`source ./env.sh <<EOF
${G} branch -D x
EOF`, WT, "source of a file: the heredoc is data");
console.log(`
${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
