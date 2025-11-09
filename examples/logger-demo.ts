/**
 * Logger Demonstration
 * 
 * This script demonstrates the structured logging capabilities
 * of the voice price comparison agent.
 */

import {
  logger,
  logApiCall,
  logApiResponse,
  logConversationTransition,
  logConversationEvent,
  logPerformance,
  PerformanceTimer,
} from '../src/utils/logger';

async function demonstrateLogging() {
  console.log('\n=== Logger Demonstration ===\n');

  // 1. Basic logging with different levels
  console.log('1. Basic logging levels:');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.debug('This is a debug message (only visible in development)');

  // 2. Structured API call logging
  console.log('\n2. API call logging:');
  logApiCall('ElevenLabs TTS', 'synthesize', {
    textLength: 150,
    voice: 'Rachel',
    format: 'mp3',
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));

  logApiResponse('ElevenLabs TTS', 'synthesize', true, 123);

  // 3. API call with error
  console.log('\n3. API call with error:');
  logApiCall('SerpAPI', 'search', {
    query: 'MacBook Pro',
    platforms: ['Amazon', 'Flipkart'],
  });

  await new Promise(resolve => setTimeout(resolve, 50));

  logApiResponse(
    'SerpAPI',
    'search',
    false,
    78,
    new Error('Rate limit exceeded')
  );

  // 4. Conversation flow logging
  console.log('\n4. Conversation flow logging:');
  const sessionId = 'demo-session-123';

  logConversationEvent(sessionId, 'session_started');

  logConversationTransition(
    sessionId,
    'INITIAL',
    'GATHERING_SPECS',
    'User mentioned product'
  );

  logConversationEvent(sessionId, 'specification_collected', {
    specification: 'RAM',
    value: '16GB',
  });

  logConversationTransition(
    sessionId,
    'GATHERING_SPECS',
    'SEARCHING',
    'All specifications collected'
  );

  logConversationEvent(sessionId, 'search_completed', {
    resultsCount: 5,
    lowestPrice: 1999,
  });

  // 5. Performance monitoring
  console.log('\n5. Performance monitoring:');

  // Manual performance logging
  logPerformance({
    operation: 'STT transcription',
    duration: 450,
    sessionId,
    metadata: {
      audioSize: 1024000,
      format: 'mp3',
    },
  });

  // Using PerformanceTimer
  const timer = new PerformanceTimer('LLM processing', sessionId, {
    messageLength: 250,
    model: 'claude-3-5-sonnet',
  });

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 200));

  timer.end();

  // 6. Slow operation warning
  console.log('\n6. Slow operation warning (> 2s):');
  logPerformance({
    operation: 'Search with fallback',
    duration: 2500,
    sessionId,
    metadata: {
      primaryFailed: true,
      fallbackUsed: 'Tavily',
    },
  });

  // 7. Sensitive data sanitization
  console.log('\n7. Sensitive data sanitization:');
  logApiCall('External API', 'authenticate', {
    username: 'user@example.com',
    apiKey: 'secret-key-12345',
    password: 'super-secret',
    token: 'bearer-token-xyz',
  });

  // 8. Complex structured data
  console.log('\n8. Complex structured logging:');
  logger.info('Product search completed', {
    sessionId,
    query: {
      productName: 'MacBook Pro 14"',
      specifications: {
        chip: 'M3 Pro',
        ram: '18GB',
        storage: '512GB',
      },
    },
    results: [
      { platform: 'Flipkart', price: 199900, inStock: true },
      { platform: 'Amazon', price: 204900, inStock: true },
      { platform: 'Croma', price: 209900, inStock: false },
    ],
    metadata: {
      searchDuration: 1234,
      platformsSearched: 3,
      resultsFound: 2,
    },
  });

  console.log('\n=== Logger Demonstration Complete ===\n');
}

// Run the demonstration
demonstrateLogging().catch(error => {
  logger.error('Demo failed', { error: error.message });
  process.exit(1);
});
