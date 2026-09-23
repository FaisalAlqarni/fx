
const fs = require('fs'); const path = require('path');
const dir = () => path.resolve(process.env.NOTES_DIR || './notes');
function file(name) {
  const f = path.resolve(dir(), name);
  if (path.dirname(f) !== dir()) { const e = new Error('bad name'); e.code = 'EBADNAME'; throw e; }
  return f;
}
exports.save = (n, t) => { const f = file(n); fs.mkdirSync(dir(), { recursive: true }); fs.writeFileSync(f, t); };
exports.load = (n) => { const f = file(n); if (!fs.existsSync(f)) return ''; return fs.readFileSync(f, 'utf8'); };
exports.list = () => (fs.existsSync(dir()) ? fs.readdirSync(dir()).sort() : []);
