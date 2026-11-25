
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { run } from '@openai/agents';

import { homeSyncManager } from './homeSyncManager.js';
import { asyncH, HttpError } from '../middleware/errors.js';

const router = Router();

const messageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

const aiLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', aiLimit, asyncH(async (req, res) => {
  const validation = messageSchema.safeParse(req.body);

  if (!validation.success) {
    throw new HttpError(
      400,
      'Message is required and must not exceed 4000 characters.'
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new HttpError(503, 'AI service is not configured.');
  }

  const { message } = validation.data;

  const result = await run(homeSyncManager, message);

  res.status(200).json({
    success: true,
    reply: result.finalOutput,
  });
}));

export default router;
