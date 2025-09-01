// Test the simplified orphan prevention
import { HistoryService } from './dist/src/services/history/HistoryService.js';

console.log('Testing SIMPLIFIED orphan prevention...\n');

const hs = new HistoryService('simple-test');

// Step 1: User asks for something
console.log('1. User asks for something');
hs.addUserMessage('Search for TypeScript files');

// Step 2: Model responds with tool call
console.log('2. Model responds with tool call');
hs.addModelMessage('Let me search for TypeScript files', {
  originalContent: {
    role: 'model',
    parts: [
      { text: 'Let me search for TypeScript files' },
      {
        functionCall: {
          id: 'search-1',
          name: 'FindFiles',
          args: { pattern: '*.ts' },
        },
      },
    ],
  },
});

console.log('   Messages after model response:', hs.getMessages().length);
console.log('   Pending tool calls:', hs.getPendingToolCalls().length);

// Step 3: User cancels by typing something else
console.log('\n3. User types a new message (cancellation)');
hs.addUserMessage('Actually, never mind, just show me the main file');

console.log('   Messages after user cancellation:', hs.getMessages().length);

// Check the messages
const messages = hs.getMessages();
console.log('\nFinal message structure:');
messages.forEach((msg, i) => {
  console.log(`  ${i}: ${msg.role} - ${msg.content.substring(0, 50)}`);
  if (msg.metadata?.synthetic) {
    console.log('     ^ SYNTHETIC RESPONSE (automatically created)');
  }
});

// Verify the synthetic response was created in the right place
const syntheticMsg = messages[2];
if (syntheticMsg && syntheticMsg.metadata?.synthetic) {
  console.log('\n✓ SUCCESS: Synthetic response was automatically created');
  console.log('  Position: Between model message and user cancellation');
  const originalContent = syntheticMsg.metadata.originalContent;
  if (originalContent?.parts?.[0]?.functionResponse) {
    console.log('  Format: Proper functionResponse structure');
    console.log('  Tool ID:', originalContent.parts[0].functionResponse.id);
  }
} else {
  console.log('\n✗ FAIL: No synthetic response was created');
}
