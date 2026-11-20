import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true }, // unguessable id used in the customer's links
    invoiceId: { type: String, required: true, unique: true }, // digits only, 6-15 chars (Halyk rule)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    plan: { type: String, default: 'premium' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KZT' },
    periodDays: { type: Number, default: 30 },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    halykStatus: { type: String, default: '' }, // CHARGE, FAILED, ...
    reference: { type: String, default: '' },
    activationCode: { type: String, default: undefined, index: { unique: true, sparse: true } },
    validUntil: { type: Date, default: null },
    env: { type: String, default: 'test' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model('Order', schema);
