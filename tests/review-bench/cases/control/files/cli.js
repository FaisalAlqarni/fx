
const s = require('./lib/store'); const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'add') s.save(a, b); else if (cmd === 'show') console.log(s.load(a));
else if (cmd === 'search') console.log(require('./lib/search').search(a).join('\n'));
else if (cmd === 'export') process.stdout.write(require('./lib/export').exportAll());
