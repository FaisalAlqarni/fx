#!/usr/bin/env bash
# Obvious vanity: a config layer over one env var, a strategy interface with one
# strategy, a hand-rolled formatter for something Intl does, and a factory.
mkdir -p src
cat > src/config.js <<'JS'
class ConfigurationProviderFactory {
  static create(kind) {
    if (kind === 'env') return new EnvConfigurationProvider();
    throw new Error('unsupported provider: ' + kind);
  }
}
class AbstractConfigurationProvider {
  get(key) { throw new Error('not implemented'); }
}
class EnvConfigurationProvider extends AbstractConfigurationProvider {
  get(key) { return process.env[key]; }
}
module.exports = { ConfigurationProviderFactory };
JS
cat > src/format.js <<'JS'
const MONTHS = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];
function formatDate(d) {
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function formatMoney(cents) {
  const s = String(Math.round(cents / 100));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return '$' + out;
}
module.exports = { formatDate, formatMoney };
JS
# Also a large hard-to-test file, so the other fx-architecture prompt has a subject.
mkdir -p app/services
python3 - <<'PY'
open('app/services/billing_service.rb','w').write(
 "class BillingService\n" +
 "".join(f"  def step_{i}(order)\n    Net::HTTP.get(URI(ENV['BILLING_URL']))\n    order.update(state: {i})\n  end\n\n" for i in range(1,40)) +
 "end\n")
PY
