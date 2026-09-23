
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b);
else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(s.list().filter((n) => s.load(n).toLowerCase().includes(String(a).toLowerCase())).join('\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
