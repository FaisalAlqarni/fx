// Run: node docs/plans/2026-10-29-system-flow-site/proof/fixture-site.js
// Builds the fixture model that meets the prose floor (goodSet) with --prefer cheap, under os.tmpdir(),
// and prints the site folder for page-check.js.
import * as path from 'path';
import { sfFixture } from '../../../../tests/helpers/sf-fixture.js';

const f = sfFixture();
f.fxJson({});
f.goodSet();
const r = f.run(['build', '--prefer', 'cheap']);
if (r.status !== 0) {
  process.stderr.write(`fixture-site: build exited ${r.status}\n${r.stdout}${r.stderr}`);
  process.exit(1);
}
console.log(path.join(f.host, 'docs', 'system-flow'));
