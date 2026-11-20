import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { config } from '../config.js';
import { checkStatus } from './halyk.js';

// 12 digits (Halyk accepts digits only, 6-15 characters), unique per order
export async function createOrder({ name, email }) {
  for (let i = 0; i < 5; i++) {
    try {
      return await Order.create({
        publicId: crypto.randomUUID(),
        invoiceId: String(Date.now()).slice(-9) + String(crypto.randomInt(0, 1000)).padStart(3, '0'),
        name,
        email,
        plan: 'premium',
        amount: config.premium.priceKzt,
        currency: 'KZT',
        periodDays: config.premium.periodDays,
        env: config.halyk.env,
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  }
  throw new Error('Could not allocate an invoice id');
}

const newCode = () => 'HS-' + crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g).join('-');
const FAILED = new Set(['FAILED', 'CANCEL', 'CANCEL_OLD', '3D']);

// Idempotent: safe from the postLink, from the result page and from retries.
export async function verifyAndActivate(invoiceId) {
  const order = await Order.findOne({ invoiceId });
  if (!order || order.status !== 'pending') return order;

  const s = await checkStatus(invoiceId);
  order.halykStatus = s.statusName;

  const amountOk = s.amount === undefined || Number(s.amount) === order.amount;
  if (s.resultCode === '100' && s.statusName === 'CHARGE' && amountOk) {
    const now = new Date();
    // atomic flip: two parallel calls cannot pay the same order twice
    const paid = await Order.findOneAndUpdate(
      { _id: order._id, status: 'pending' },
      {
        status: 'paid',
        paidAt: now,
        halykStatus: s.statusName,
        reference: s.reference,
        activationCode: newCode(),
        validUntil: new Date(now.getTime() + order.periodDays * 86400000),
      },
      { new: true }
    );
    return paid || Order.findOne({ invoiceId });
  }
  if (FAILED.has(s.statusName) || s.resultCode === '101') order.status = 'failed';
  await order.save();
  return order;
}

// What the customer is allowed to see. The activation code only appears once paid.
export const publicView = (o) => ({
  publicId: o.publicId,
  invoiceId: o.invoiceId,
  status: o.status,
  plan: o.plan,
  amount: o.amount,
  currency: o.currency,
  name: o.name,
  email: o.email,
  createdAt: o.createdAt,
  paidAt: o.paidAt,
  validUntil: o.status === 'paid' ? o.validUntil : null,
  activationCode: o.status === 'paid' ? o.activationCode : null,
  env: o.env,
});
