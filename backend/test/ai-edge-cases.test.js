
import { run } from '@openai/agents';
import { homeSyncManager } from '../src/ai/homeSyncManager.js';

async function main() {
  console.log('Testing HomeSync with incomplete information...');

  const result = await run(
    homeSyncManager,
    `In our household, Anna sometimes cooks dinner.
    Mark usually takes care of shopping.
    We have not recorded how often these tasks happen
    or how long they take.
    We also do not know who plans meals,
    remembers household needs or coordinates chores.

    Analyze the responsibilities and explain what
    information is missing. Do not invent frequency,
    duration or task ownership. Do not calculate
    unsupported weekly hours.`
  );

  console.log('\nHomeSync Manager response:\n');
  console.log(result.finalOutput);

  console.log('\nSpecialist agent tool calls:');

  for (const item of result.newItems) {
    if (item.type === 'tool_call_item') {
      console.log(item.rawItem.name, item.rawItem.status);
    }
  }
}

main().catch((error) => {
  console.error('Edge case test failed:', error);
  process.exitCode = 1;
});
