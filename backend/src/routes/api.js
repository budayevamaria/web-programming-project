import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { config } from '../config.js';
import { asyncH, HttpError } from '../middleware/errors.js';
import { buildPaymentObject } from '../services/halyk.js';
import { createOrder, verifyAndActivate, publicView } from '../services/orders.js';

const r = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limit = (n) => rateLimit({ windowMs: 15 * 60 * 1000, limit: n, standardHeaders: true, legacyHeaders: false });

const orderSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email').max(120),
});

r.get('/plans', (_req, res) => {
  res.json({
    env: config.halyk.env,
    plans: [
      { id: 'free', name: 'Free', priceKzt: 0, features: ['Basic tasks', 'Family groups', 'Reminders', 'Statistics'] },
      { id: 'premium', name: 'Premium', priceKzt: config.premium.priceKzt, periodDays: config.premium.periodDays, features: ['Advanced analytics', 'AI recommendations', 'Report exports'] },
    ],
  });
});

// Step 1: create the order and the Halyk token. The page then calls halyk.pay(paymentObject).
r.post('/orders', limit(30), asyncH(async (req, res) => {
  const { name, email } = orderSchema.parse(req.body);
  const order = await createOrder({ name, email });
  try {
    const paymentObject = await buildPaymentObject(order);
    res.status(201).json({ publicId: order.publicId, widgetUrl: config.halyk.widgetUrl, paymentObject, env: config.halyk.env });
  } catch (e) {
    order.status = 'failed';
    await order.save();
    console.error('checkout failed:', e.message);
    throw new HttpError(502, 'The payment provider is not available right now. Try again in a minute.');
  }
}));

// Step 2: after the customer returns, confirm with Halyk (idempotent). Works only with the unguessable publicId.
r.get('/orders/:publicId', limit(300), asyncH(async (req, res) => {
  if (!UUID.test(req.params.publicId)) throw new HttpError(404, 'Order not found');
  let order = await Order.findOne({ publicId: req.params.publicId });
  if (!order) throw new HttpError(404, 'Order not found');
  try { order = (await verifyAndActivate(order.invoiceId)) || order; } catch (e) { console.error('status check failed:', e.message); }
  res.json(publicView(order));
}));

// Lets the main HomeSync app check an activation code
r.get('/activation/:code', limit(60), asyncH(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const o = /^HS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code) ? await Order.findOne({ activationCode: code, status: 'paid' }) : null;
  if (!o) return res.json({ valid: false });
  res.json({ valid: o.validUntil > new Date(), plan: o.plan, validUntil: o.validUntil });
}));

// Public: Halyk posts the payment result here (postLink and failurePostLink).
// The body is NOT trusted. We take only the invoiceId and ask Halyk for the real status.
r.post('/halyk/postlink', asyncH(async (req, res) => {
  if (!config.halyk.postlinkSecret || req.query.s !== config.halyk.postlinkSecret) return res.status(403).end();
  const invoiceId = String(req.body?.invoiceId || req.body?.invoiceID || '');
  if (/^\d{6,15}$/.test(invoiceId)) {
    try { await verifyAndActivate(invoiceId); } catch (e) { console.error('postlink verify failed:', e.message); }
  }
  res.status(200).send('OK');
}));

export default r;
