
import { run } from '@openai/agents';
import { homeSyncManager } from '../src/ai/homeSyncManager.js';

async function main() {
  console.log('Testing HomeSync AI...');

  const result = await run(
    homeSyncManager,
   'Analyze the household responsibilities and suggest a fairer distribution between Anna and Mark. Anna cooks dinner every day for 40 minutes. Mark washes dishes every day for 15 minutes. Consider physical workload and mental load. Suggest practical alternatives, but do not change assignments automatically.'
  );

  console.log('\nHomeSync Manager response:\n');
  console.log(result.finalOutput);
  console.log('\nSpecialist agent tool calls:');

for (const item of result.newItems) {
  if (item.type === 'tool_call_item') {
    console.log(JSON.stringify(item, null, 2));
  }
}
}

main().catch((error) => {
  console.error('AI test failed:', error.message);
  process.exitCode = 1;
});
