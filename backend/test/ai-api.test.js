
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';

test('POST /api/ai should return an AI response', async (t) => {
  const server = app.listen(0);

  await once(server, 'listening');

  t.after(() => {
    server.close();
  });

  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message:
        'Anna cooks dinner every day for 40 minutes. Mark washes dishes every day for 15 minutes. Identify the tasks and explain the difference between physical work and mental load.',
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(typeof data.reply, 'string');
  assert.ok(data.reply.length > 0);

  console.log('\nAI API response:\n');
  console.log(data.reply);
});
