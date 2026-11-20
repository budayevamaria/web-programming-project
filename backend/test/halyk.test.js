// End-to-end test of the Halyk flow against the built-in simulator. No database needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

process.env.HALYK_ENV = 'mock';
process.env.HALYK_MOCK_PORT = '4199';
process.env.PUBLIC_API_URL = 'http://localhost:4198';
process.env.HALYK_POSTLINK_SECRET = 'sekret';

const { startFakeHalyk } = await import('../mock/fakeHalyk.js');
const { buildPaymentObject, checkStatus } = await import('../src/services/halyk.js');

const received = [];
const shop = http.createServer((req, res) => {
  let d = ''; req.on('data', (c) => (d += c));
  req.on('end', () => { received.push({ url: req.url, body: JSON.parse(d || '{}') }); res.end('OK'); });
});
const fake = await startFakeHalyk(4199);
await new Promise((ok) => shop.listen(4198, ok));
test.after(() => { fake.close(); shop.close(); });

const order = (id) => ({ invoiceId: id, publicId: 'pub-' + id, amount: 2990, currency: 'KZT', email: 'a@b.kz' });

async function confirm(obj, action) {
  const raw = Buffer.from(JSON.stringify({ ...obj, token: obj.auth.access_token })).toString('base64');
  const r = await fetch('http://localhost:4199/pay/confirm', {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ o: raw, action }),
  });
  return r;
}

test('payment object has everything the widget needs', async () => {
  const o = await buildPaymentObject(order('123456789001'));
  assert.equal(o.invoiceId, '123456789001');
  assert.equal(o.amount, 2990);
  assert.ok(o.auth.access_token);
  assert.match(o.postLink, /\/api\/halyk\/postlink\?s=sekret$/);
  assert.match(o.backLink, /\/result\?order=pub-123456789001$/);
});

test('successful payment: redirect back, postLink sent, status is CHARGE', async () => {
  const o = await buildPaymentObject(order('123456789002'));
  const r = await confirm(o, 'pay');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), o.backLink);
  await new Promise((ok) => setTimeout(ok, 100));
  assert.ok(received.some((x) => x.body.invoiceId === '123456789002' && x.url.includes('s=sekret')));
  const s = await checkStatus('123456789002');
  assert.equal(s.resultCode, '100');
  assert.equal(s.statusName, 'CHARGE');
  assert.equal(s.amount, 2990);
});

test('declined payment: failure link and not CHARGE', async () => {
  const o = await buildPaymentObject(order('123456789003'));
  const r = await confirm(o, 'decline');
  assert.equal(r.headers.get('location'), o.failureBackLink);
  const s = await checkStatus('123456789003');
  assert.notEqual(s.statusName, 'CHARGE');
});

test('unpaid or unknown invoice is never reported as paid', async () => {
  const s = await checkStatus('999999999999');
  assert.equal(s.resultCode, '102');
  assert.notEqual(s.statusName, 'CHARGE');
});

test('forged token for another amount is rejected by the payment page', async () => {
  const o = await buildPaymentObject(order('123456789004'));
  const raw = Buffer.from(JSON.stringify({ ...o, amount: 1, token: o.auth.access_token })).toString('base64');
  const r = await fetch(`http://localhost:4199/pay?o=${encodeURIComponent(raw)}`);
  assert.equal(r.status, 400);
});
