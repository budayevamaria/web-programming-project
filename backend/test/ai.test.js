
import { run } from '@openai/agents';
import { homeSyncManager } from '../src/ai/homeSyncManager.js';

async function main() {
  console.log('Testing HomeSync AI...');

  const result = await run(
    homeSyncManager,
    'A family has two members. Anna cooks dinner every day for 40 minutes. Mark washes dishes every day for 15 minutes. Identify these household tasks and distinguish physical work from mental load. Do not invent missing information.'
  );

  console.log('\nHomeSync Manager response:\n');
  console.log(result.finalOutput);
}

main().catch((error) => {
  console.error('AI test failed:', error.message);
  process.exitCode = 1;
});
