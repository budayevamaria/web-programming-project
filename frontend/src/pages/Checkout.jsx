import { useEffect, useState } from 'react';
import { api, kzt } from '../api.js';

// Loads Halyk's payment widget script once
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.halyk && document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the Halyk payment widget. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}

export default function Checkout() {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api('/plans').then(setInfo).catch((e) => setError(e.message)); }, []);
  const premium = info?.plans.find((p) => p.id === 'premium');

  // Create the order on the server, then open Halyk ePay with the one-time token.
  async function pay(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { widgetUrl, paymentObject } = await api('/orders', { method: 'POST', body: f });
      await loadScript(widgetUrl);
      window.halyk.pay(paymentObject); // the customer is taken to Halyk's payment page
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <div className="crumb">Plans</div>
        <h1>Choose your plan</h1>
        <p className="lead">Start free, upgrade to Premium when you want deeper analytics and AI help.</p>
      </header>

      {info && info.env !== 'prod' && (
        <div className="test"><b>Test mode{info.env === 'mock' ? ' (built-in Halyk simulator)' : ' (Halyk ePay test environment)'}.</b> No real money is charged.</div>
      )}
      {error && !open && <p className="err" role="alert">{error}</p>}

      <section className="plans" aria-label="Plans">
        {info?.plans.map((p) => (
          <article key={p.id} className={`plan ${p.id}`}>
            <h2>{p.name}</h2>
            <div className="price">{kzt(p.priceKzt)} <small>/ month</small></div>
            <ul>{p.features.map((x) => <li key={x}>{x}</li>)}</ul>
            {p.id === 'premium' && !open && <button className="btn" onClick={() => setOpen(true)}>Upgrade to Premium</button>}
          </article>
        ))}
      </section>

      {open && premium && (
        <form className="panel checkout" onSubmit={pay}>
          <div>
            <h3>Order summary</h3>
            <div className="sum">
              <div><span>HomeSync Premium, {premium.periodDays} days</span><span>{kzt(premium.priceKzt)}</span></div>
              <div><span>Total</span><span>{kzt(premium.priceKzt)}</span></div>
            </div>
          </div>
          <div>
            <h3>Your details</h3>
            <div className="f"><label htmlFor="name">Name</label><input id="name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
            <div className="f"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
            <p className="muted sm">You’ll enter your card on Halyk ePay’s secure page. We never see your card details.</p>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="actions">
              <button className="btn" disabled={busy}>{busy ? 'Opening Halyk ePay…' : `Pay ${kzt(premium.priceKzt)} with Halyk ePay`}</button>
              <button type="button" className="btn sec" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
