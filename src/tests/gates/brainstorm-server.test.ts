// The brainstorm companion server, started for real on scratch directories and
// asked over real HTTP on 127.0.0.1: the keyed bootstrap page, the cookie
// route that serves the helper, the refusal without a key, the screen-added
// event, and shutdown when the owner process dies. The server and the owner
// are killed and the scratch tree removed on every exit path.
//
//     node tests/gates/brainstorm-server.test.js
import * as assert from 'assert';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SHIPPED = path.join(ROOT, 'skills', 'fx-brainstorm', 'scripts');

// Recorded from the hand-written server.cjs before the port.
const bootstrap = (token: string): string => `<!DOCTYPE html>
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
const setCookie = (port: number, token: string): string =>
  `brainstorm-key-${port}=${token}; HttpOnly; SameSite=Strict; Path=/`;

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-brainstorm-gate-'));
const children: ChildProcess[] = [];
function cleanup(): void {
  for (const c of children) if (c.exitCode === null && c.signalCode === null) c.kill('SIGKILL');
  fs.rmSync(scratch, { recursive: true, force: true });
}
process.on('exit', cleanup);

// The server runs from a scratch copy whose helper.js holds $&, $' and $`, so a
// string replacement that expands them shows up in the injected helper.
const SCRIPTS = path.join(scratch, 'scripts');
fs.mkdirSync(SCRIPTS);
for (const f of ['server.cjs', 'frame-template.html', 'helper.js']) fs.copyFileSync(path.join(SHIPPED, f), path.join(SCRIPTS, f));
fs.appendFileSync(path.join(SCRIPTS, 'helper.js'), "\n// replacement sequences: $& $' $`\n");
const SERVER = path.join(SCRIPTS, 'server.cjs');
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => process.exit(1));

const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

async function waitFor<T>(what: string, ms: number, probe: () => T | null): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = probe();
    if (v !== null) return v;
    if (Date.now() > end) throw new Error(`timed out after ${ms}ms waiting for ${what}`);
    await delay(50);
  }
}

function get(port: number, urlPath: string, cookie?: string): Promise<{ status: number; body: string; setCookie: string[] }> {
  return new Promise((resolve, reject) => {
    const headers: http.OutgoingHttpHeaders = cookie ? { Cookie: cookie } : {};
    http.get({ host: '127.0.0.1', port, path: urlPath, headers }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, setCookie: res.headers['set-cookie'] ?? [] }));
    }).on('error', reject);
  });
}

function readIfPresent(file: string): string | null {
  try { const s = fs.readFileSync(file, 'utf8').trim(); return s === '' ? null : s; } catch { return null; }
}

async function main(): Promise<void> {
  const session = path.join(scratch, 'session');
  const state = path.join(scratch, 'state');
  const portFile = path.join(scratch, 'port');
  const tokenFile = path.join(scratch, 'token');

  const owner = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  children.push(owner);

  // Only the variables the gate sets reach the server: no inherited BRAINSTORM_*.
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? '' };
  Object.assign(env, {
    BRAINSTORM_DIR: session,
    BRAINSTORM_STATE_DIR: state,
    BRAINSTORM_HOST: '127.0.0.1',
    BRAINSTORM_OWNER_PID: String(owner.pid),
    BRAINSTORM_PORT_FILE: portFile,
    BRAINSTORM_TOKEN_FILE: tokenFile,
    BRAINSTORM_OPEN: '0',
    // The server treats any non-empty BRAINSTORM_OPEN as on; this keeps a browser shut.
    BRAINSTORM_OPEN_CMD: 'true',
    BRAINSTORM_LIFECYCLE_CHECK_MS: '200',
  });
  const server = spawn(process.execPath, [SERVER, '--brainstorm-server-id=gate'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  let stdout = '';
  let stderr = '';
  server.stdout?.setEncoding('utf8').on('data', (c: string) => { stdout += c; });
  server.stderr?.setEncoding('utf8').on('data', (c: string) => { stderr += c; });
  const lineWith = (type: string): string | null =>
    stdout.split('\n').find(l => l.includes(`"type":"${type}"`)) ?? null;

  await waitFor('server-started', 5000, () => lineWith('server-started'));
  const port = Number(await waitFor('the port file', 2000, () => readIfPresent(portFile)));
  const token = await waitFor('the token file', 2000, () => readIfPresent(tokenFile));
  assert.ok(Number.isInteger(port) && port > 0, `port file holds a port: ${port}`);

  const keyed = await get(port, `/?key=${token}`);
  assert.strictEqual(keyed.status, 200, 'GET /?key=<token> is 200');
  assert.strictEqual(keyed.body, bootstrap(token), 'GET /?key=<token> serves the recorded bootstrap page');
  assert.deepStrictEqual(keyed.setCookie, [setCookie(port, token)], 'GET /?key=<token> sets the recorded HttpOnly, SameSite=Strict cookie');
  console.log('ok: keyed request gets the bootstrap page and the session cookie');

  const withCookie = await get(port, '/', `brainstorm-key-${port}=${token}`);
  assert.strictEqual(withCookie.status, 200, 'GET / with the cookie is 200');
  const helper = fs.readFileSync(path.join(SCRIPTS, 'helper.js'), 'utf8');
  assert.ok(withCookie.body.includes(`<script>\n${helper}\n</script>`), 'GET / with the cookie injects helper.js byte for byte');
  console.log('ok: cookie request gets a page with the helper script');

  const bare = await get(port, '/');
  assert.strictEqual(bare.status, REFUSAL_STATUS, `GET / without key or cookie is ${REFUSAL_STATUS}`);
  console.log('ok: request without key or cookie is refused');

  fs.writeFileSync(path.join(session, 'content', 'first.html'), '<p>first screen</p>\n');
  const added = await waitFor('a screen-added line', 3000, () => lineWith('screen-added'));
  assert.ok(added.includes('first.html'), `screen-added names the file: ${added}`);
  console.log('ok: a new screen file emits screen-added');

  // String.replace expands $&, $' and $` in a string replacement; the served page must not.
  const literal = "<p id=\"lit\">price $' and match $& and pre $` here</p>";
  fs.writeFileSync(path.join(session, 'content', 'literal.html'), literal + '\n');
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(session, 'content', 'literal.html'), later, later); // newest screen wins
  const page = (await get(port, '/', `brainstorm-key-${port}=${token}`)).body;
  assert.ok(page.includes(literal), 'served page holds the content byte for byte');
  assert.strictEqual(page.split('<div class="header">').length - 1, 1, 'frame markup appears once');
  console.log('ok: dollar sequences in a screen are served literally');

  owner.kill('SIGKILL');
  const killedAt = Date.now();
  await waitFor('the server to exit', 2000, () => (server.exitCode !== null ? server.exitCode : null));
  assert.ok(lineWith('server-stopped') !== null, 'server-stopped is printed');
  console.log(`ok: owner death stops the server in ${Date.now() - killedAt}ms`);
  assert.strictEqual(stderr, '', 'server wrote nothing to stderr');
}

// Cleanup runs as soon as main settles: a live server's stdout pipe would
// otherwise keep this process waiting forever after a failed assertion.
main().then(
  () => console.log('brainstorm-server: OK'),
  (e: unknown) => {
    console.error('FAIL:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  },
).finally(cleanup);
