// generated from src/tests/gates/brainstorm-server.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var assert = __toESM(require("assert"));
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var http = __toESM(require("http"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
const ROOT = path.join(__dirname, "..", "..");
const SHIPPED = path.join(ROOT, "skills", "fx-brainstorm", "scripts");
const bootstrap = (token) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Opening Brainstorm Companion</title></head>
<body>
<script>
try { sessionStorage.setItem('brainstorm-session-key', "${token}"); } catch (e) {}
location.replace('/');
</script>
</body>
</html>`;
const REFUSAL_STATUS = 403;
const setCookie = (port, token) => `brainstorm-key-${port}=${token}; HttpOnly; SameSite=Strict; Path=/`;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-brainstorm-gate-"));
const children = [];
function cleanup() {
  for (const c of children) if (c.exitCode === null && c.signalCode === null) c.kill("SIGKILL");
  fs.rmSync(scratch, { recursive: true, force: true });
}
process.on("exit", cleanup);
const SCRIPTS = path.join(scratch, "scripts");
fs.mkdirSync(SCRIPTS);
for (const f of ["server.cjs", "frame-template.html", "helper.js"]) fs.copyFileSync(path.join(SHIPPED, f), path.join(SCRIPTS, f));
fs.appendFileSync(path.join(SCRIPTS, "helper.js"), "\n// replacement sequences: $& $' $`\n");
const SERVER = path.join(SCRIPTS, "server.cjs");
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(what, ms, probe) {
  const end = Date.now() + ms;
  for (; ; ) {
    const v = probe();
    if (v !== null) return v;
    if (Date.now() > end) throw new Error(`timed out after ${ms}ms waiting for ${what}`);
    await delay(50);
  }
}
function get(port, urlPath, cookie) {
  return new Promise((resolve, reject) => {
    const headers = cookie ? { Cookie: cookie } : {};
    http.get({ host: "127.0.0.1", port, path: urlPath, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body, setCookie: res.headers["set-cookie"] ?? [] }));
    }).on("error", reject);
  });
}
function readIfPresent(file) {
  try {
    const s = fs.readFileSync(file, "utf8").trim();
    return s === "" ? null : s;
  } catch {
    return null;
  }
}
async function main() {
  const session = path.join(scratch, "session");
  const state = path.join(scratch, "state");
  const portFile = path.join(scratch, "port");
  const tokenFile = path.join(scratch, "token");
  const owner = (0, import_child_process.spawn)(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  children.push(owner);
  const env = { PATH: process.env.PATH ?? "" };
  Object.assign(env, {
    BRAINSTORM_DIR: session,
    BRAINSTORM_STATE_DIR: state,
    BRAINSTORM_HOST: "127.0.0.1",
    BRAINSTORM_OWNER_PID: String(owner.pid),
    BRAINSTORM_PORT_FILE: portFile,
    BRAINSTORM_TOKEN_FILE: tokenFile,
    BRAINSTORM_OPEN: "0",
    // The server treats any non-empty BRAINSTORM_OPEN as on; this keeps a browser shut.
    BRAINSTORM_OPEN_CMD: "true",
    BRAINSTORM_LIFECYCLE_CHECK_MS: "200"
  });
  const server = (0, import_child_process.spawn)(process.execPath, [SERVER, "--brainstorm-server-id=gate"], { env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(server);
  let stdout = "";
  let stderr = "";
  server.stdout?.setEncoding("utf8").on("data", (c) => {
    stdout += c;
  });
  server.stderr?.setEncoding("utf8").on("data", (c) => {
    stderr += c;
  });
  const lineWith = (type) => stdout.split("\n").find((l) => l.includes(`"type":"${type}"`)) ?? null;
  await waitFor("server-started", 5e3, () => lineWith("server-started"));
  const port = Number(await waitFor("the port file", 2e3, () => readIfPresent(portFile)));
  const token = await waitFor("the token file", 2e3, () => readIfPresent(tokenFile));
  assert.ok(Number.isInteger(port) && port > 0, `port file holds a port: ${port}`);
  const keyed = await get(port, `/?key=${token}`);
  assert.strictEqual(keyed.status, 200, "GET /?key=<token> is 200");
  assert.strictEqual(keyed.body, bootstrap(token), "GET /?key=<token> serves the recorded bootstrap page");
  assert.deepStrictEqual(keyed.setCookie, [setCookie(port, token)], "GET /?key=<token> sets the recorded HttpOnly, SameSite=Strict cookie");
  console.log("ok: keyed request gets the bootstrap page and the session cookie");
  const withCookie = await get(port, "/", `brainstorm-key-${port}=${token}`);
  assert.strictEqual(withCookie.status, 200, "GET / with the cookie is 200");
  const helper = fs.readFileSync(path.join(SCRIPTS, "helper.js"), "utf8");
  assert.ok(withCookie.body.includes(`<script>
${helper}
</script>`), "GET / with the cookie injects helper.js byte for byte");
  console.log("ok: cookie request gets a page with the helper script");
  const bare = await get(port, "/");
  assert.strictEqual(bare.status, REFUSAL_STATUS, `GET / without key or cookie is ${REFUSAL_STATUS}`);
  console.log("ok: request without key or cookie is refused");
  fs.writeFileSync(path.join(session, "content", "first.html"), "<p>first screen</p>\n");
  const added = await waitFor("a screen-added line", 3e3, () => lineWith("screen-added"));
  assert.ok(added.includes("first.html"), `screen-added names the file: ${added}`);
  console.log("ok: a new screen file emits screen-added");
  const literal = '<p id="lit">price $\' and match $& and pre $` here</p>';
  fs.writeFileSync(path.join(session, "content", "literal.html"), literal + "\n");
  const later = new Date(Date.now() + 5e3);
  fs.utimesSync(path.join(session, "content", "literal.html"), later, later);
  const page = (await get(port, "/", `brainstorm-key-${port}=${token}`)).body;
  assert.ok(page.includes(literal), "served page holds the content byte for byte");
  assert.strictEqual(page.split('<div class="header">').length - 1, 1, "frame markup appears once");
  console.log("ok: dollar sequences in a screen are served literally");
  owner.kill("SIGKILL");
  const killedAt = Date.now();
  await waitFor("the server to exit", 2e3, () => server.exitCode !== null ? server.exitCode : null);
  assert.ok(lineWith("server-stopped") !== null, "server-stopped is printed");
  console.log(`ok: owner death stops the server in ${Date.now() - killedAt}ms`);
  assert.strictEqual(stderr, "", "server wrote nothing to stderr");
}
main().then(
  () => console.log("brainstorm-server: OK"),
  (e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
).finally(cleanup);
