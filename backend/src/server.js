import { app } from './app.js';
import { connectDb } from './db.js';
import { config } from './config.js';

if (config.halyk.env === 'mock') {
  const { startFakeHalyk } = await import('../mock/fakeHalyk.js');
  await startFakeHalyk(config.halyk.mockPort);
}

await connectDb();
app.listen(config.port, () => console.log(`API on :${config.port} · Halyk: ${config.halyk.env} · pages: ${config.frontendUrl}`));
