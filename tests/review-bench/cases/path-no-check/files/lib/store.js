
const fs = require('fs'); const path = require('path');
const dir = () => path.resolve(process.env.NOTES_DIR || './notes');
function file(name) {
  const f = path.resolve(dir(), name);
  
  return f;
}
exports.save = (n, t) => { const f = file(n); fs.mkdirSync(dir(), { recursive: true }); fs.writeFileSync(f, t); };
exports.load = (n) => { const f = file(n); if (!fs.existsSync(f)) { const e = new Error('no note'); e.code = 'ENOTE'; throw e; } return fs.readFileSync(f, 'utf8'); };
exports.list = () => (fs.existsSync(dir()) ? fs.readdirSync(dir()).sort() : []);
