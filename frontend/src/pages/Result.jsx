import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, kzt, fmtDate } from '../api.js';

// Halyk sends the customer back here. We never trust the URL: the server asks Halyk for the real status.
export default function Result() {
  const [params] = useSearchParams();
  const id = params.get('order');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return setError('This link is missing an order number.');
    let stop = false;
    (async () => {
      for (let i = 0; i < 8 && !stop; i++) {
        try {
          const o = await api(`/orders/${id}`);
          setOrder(o);
          if (o.status !== 'pending') return;
        } catch (e) { return setError(e.message); }
        await new Promise((ok) => setTimeout(ok, 3000));
      }
    })();
    return () => { stop = true; };
  }, [id]);

  if (error) return <section className="panel result"><h1>We couldn’t find this payment</h1><p className="err">{error}</p><Link className="btn" to="/">Back to plans</Link></section>;
  if (!order) return <section className="panel result"><h1>Checking your payment…</h1></section>;

  if (order.status === 'paid') {
    return (
      <section className="panel result ok" aria-live="polite">
        <div className="crumb">Receipt</div>
        <h1>Payment received</h1>
        <p>Thank you, {order.name}. HomeSync Premium is yours until {fmtDate(order.validUntil)}.</p>
        <div className="code-box">
          <span className="muted sm">Your activation code</span>
          <code>{order.activationCode}</code>
          <button className="btn sec sm" onClick={() => navigator.clipboard?.writeText(order.activationCode)}>Copy code</button>
        </div>
        <dl className="rc">
          <dt>Order</dt><dd>#{order.invoiceId}</dd>
          <dt>Plan</dt><dd>Premium</dd>
          <dt>Amount</dt><dd>{kzt(order.amount)}{order.env !== 'prod' && ' (test, not charged)'}</dd>
          <dt>Paid</dt><dd>{fmtDate(order.paidAt)}</dd>
          <dt>Email</dt><dd>{order.email}</dd>
        </dl>
        <p className="muted sm">Keep this page or the code: it is your proof of payment.</p>
        <div className="actions noprint">
          <button className="btn" onClick={() => window.print()}>Print receipt</button>
          <Link className="btn sec" to="/">Back to plans</Link>
        </div>
      </section>
    );
  }
  if (order.status === 'failed') {
    return (
      <section className="panel result" aria-live="polite">
        <h1>Payment didn’t go through</h1>
        <p className="muted">No money was taken. You can try again whenever you’re ready.</p>
        <p className="muted sm">Order #{order.invoiceId}</p>
        <Link className="btn" to="/">Try again</Link>
      </section>
    );
  }
  return (
    <section className="panel result" aria-live="polite">
      <h1>Still processing</h1>
      <p className="muted">The bank hasn’t confirmed yet. This page keeps checking, and you can safely refresh it later.</p>
      <p className="muted sm">Order #{order.invoiceId}</p>
    </section>
  );
}
