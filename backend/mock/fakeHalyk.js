// A tiny fake of Halyk ePay for local testing: token endpoint, widget script,
// a payment page with Pay / Decline buttons, postLink notification and status API.
// No real money, no credentials, works offline. It mimics the real flow, not the real bank.
import http from 'http';
import crypto from 'crypto';

export function startFakeHalyk(port = 4100) {
  const tokens = new Map(); // access_token -> { invoiceId, amount } | {}
  const txs = new Map(); // invoiceId -> { statusName, amount, reference }
  const base = `http://localhost:${port}`;

  const send = (res, code, body, type = 'application/json') => {
    res.writeHead(code, { 'Content-Type': type });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const widgetJs = `window.halyk={pay:function(o){
    var d={invoiceId:o.invoiceId,amount:o.amount,currency:o.currency,description:o.description,backLink:o.backLink,failureBackLink:o.failureBackLink,postLink:o.postLink,failurePostLink:o.failurePostLink,token:o.auth&&o.auth.access_token};
    location.href='${base}/pay?o='+encodeURIComponent(btoa(JSON.stringify(d)));}};`;

  const payPage = (o, raw) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Halyk ePay (fake test page)</title>
<style>body{font:16px/1.5 system-ui,sans-serif;background:#f4f4f1;margin:0;display:grid;place-items:center;min-height:100vh}
.c{background:#fff;border-radius:20px;padding:28px;width:min(400px,92vw);display:flex;flex-direction:column;gap:12px}
.t{background:#fff4d6;border-radius:12px;padding:10px 14px;font-size:14px}
input{padding:11px 14px;border:1px solid #ddd;border-radius:12px;font:inherit}button{font:inherit;border:0;border-radius:999px;padding:12px;cursor:pointer}
.ok{background:#1b7f4b;color:#fff}.no{background:#eee}</style>
<form class="c" method="post" action="/pay/confirm"><h2 style="margin:0">Halyk ePay</h2>
<div class="t"><b>Fake test page.</b> This is the built-in Halyk simulator. No real card or money.</div>
<div>${esc(o.description || 'Payment')}<br><b style="font-size:24px">${esc(o.amount)} ${esc(o.currency)}</b><br><small>Order ${esc(o.invoiceId)}</small></div>
<input value="4111 1111 1111 1111" aria-label="Test card number" readonly><input value="12/30   123" aria-label="Test expiry and CVC" readonly>
<input type="hidden" name="o" value="${esc(raw)}">
<button class="ok" name="action" value="pay">Pay ${esc(o.amount)} ${esc(o.currency)}</button>
<button class="no" name="action" value="decline">Decline (simulate failed payment)</button></form>`;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, base);
    try {
      if (req.method === 'POST' && url.pathname === '/oauth2/token') {
        const f = new URLSearchParams(await readBody(req));
        if (f.get('grant_type') !== 'client_credentials' || !f.get('client_secret')) return send(res, 400, { error: 'invalid_request' });
        const access_token = crypto.randomBytes(16).toString('hex');
        tokens.set(access_token, f.get('scope') === 'payment' ? { invoiceId: f.get('invoiceID'), amount: Number(f.get('amount')) } : {});
        return send(res, 200, { access_token, expires_in: 7200, refresh_token: '', scope: f.get('scope'), token_type: 'Bearer' });
      }
      if (req.method === 'GET' && url.pathname === '/payform/payment-api.js') return send(res, 200, widgetJs, 'application/javascript');
      if (req.method === 'GET' && url.pathname === '/pay') {
        const raw = url.searchParams.get('o') || '';
        const o = JSON.parse(Buffer.from(raw, 'base64').toString());
        const t = tokens.get(o.token);
        if (!t || t.invoiceId !== o.invoiceId || t.amount !== Number(o.amount)) return send(res, 400, 'Invalid or expired payment token', 'text/plain');
        return send(res, 200, payPage(o, raw), 'text/html; charset=utf-8');
      }
      if (req.method === 'POST' && url.pathname === '/pay/confirm') {
        const f = new URLSearchParams(await readBody(req));
        const raw = f.get('o') || '';
        const o = JSON.parse(Buffer.from(raw, 'base64').toString());
        const t = tokens.get(o.token);
        if (!t || t.invoiceId !== o.invoiceId) return send(res, 400, 'Invalid payment token', 'text/plain');
        const ok = f.get('action') === 'pay';
        txs.set(o.invoiceId, { statusName: ok ? 'CHARGE' : 'FAILED', amount: Number(o.amount), reference: ok ? String(Math.floor(1e11 + Math.random() * 9e11)) : '' });
        const hook = ok ? o.postLink : o.failurePostLink || o.postLink;
        // like the real system: notify the shop server, then send the customer back
        fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: ok ? 'ok' : 'error', invoiceId: o.invoiceId, amount: Number(o.amount), currency: o.currency, reference: txs.get(o.invoiceId).reference }) }).catch(() => {});
        res.writeHead(302, { Location: ok ? o.backLink : o.failureBackLink });
        return res.end();
      }
      const m = url.pathname.match(/^\/api\/check-status\/payment\/transaction\/(\d+)$/);
      if (req.method === 'GET' && m) {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        if (!tokens.has(token)) return send(res, 401, { error: 'unauthorized' });
        const tx = txs.get(m[1]);
        if (!tx) return send(res, 404, { resultCode: '102', resultMessage: 'invoice not found', transaction: null });
        if (tx.statusName === 'FAILED') return send(res, 200, { resultCode: '101', resultMessage: 'reject', transaction: { statusName: 'FAILED', amount: tx.amount } });
        return send(res, 200, { resultCode: '100', resultMessage: 'SUCCESS', transaction: { invoiceID: m[1], ...tx } });
      }
      send(res, 404, { error: 'not found' });
    } catch (e) {
      send(res, 400, { error: e.message });
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, () => { console.log(`Fake Halyk ePay (test simulator) on ${base}`); ok(server); });
  });
}
