import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { notFound, errorHandler } from './middleware/errors.js';
import api from './routes/api.js';

const widget = new URL(config.halyk.widgetUrl).origin;
const halyk = [widget, 'https://*.homebank.kz', 'https://*.epayment.kz'];

export const app = express();
app.set('trust proxy', 1); // correct client IPs for rate limiting behind a proxy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...halyk],
        connectSrc: ["'self'", ...halyk],
        frameSrc: halyk,
        formAction: ["'self'", ...halyk],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, halyk: config.halyk.env }));
app.use('/api', api);
app.use('/api', notFound);

// Production: serve the built React app
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);
