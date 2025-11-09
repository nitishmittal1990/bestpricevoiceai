/**
 * Standalone Logger Demonstration
 * 
 * This script demonstrates the structured logging capabilities
 * without requiring full configuration.
 */

import winston from 'winston';

// Create a standalone logger for demonstration
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Structured logging helpers
const logApiCall = (
  service: string,
  method: string,
  params?: Record<string, any>
) => {
  logger.info('API call initiated', {
    service,
    method,
    params,
    timestamp: new Date().toISOString(),
  });
};

const logApiResponse = (
  service: string,
  method: string,
  success: boolean,
  duration: number,
  error?: Error
) => {
  if (success) {
    logger.info('API call completed', {
      service,
      method,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error('API call failed', {
      service,
      method,
      duration,
      success: false,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

const logConversationTransition = (
  sessionId: string,
  fromState: string,
  toState: string,
  reason?: string
) => {
  logger.info('Conversation state transition', {
    sessionId,
    fromState,
    toState,
    reason,
    timestamp: new Date().toISOString(),
  });
};

const logConversationEvent = (
  sessionId: string,
  event: string,
  details?: Record<string, any>
) => {
  logger.info('Conversation event', {
    sessionId,
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

async function demonstrateLogging() {
  console.log('\n=== Structured Logger Demonstration ===\n');

  // 1. Basic logging with different levels
  console.log('1. Basic logging levels:');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.debug('This is a debug message');

  // 2. Structured API call logging
  console.log('\n2. API call logging:');
  logApiCall('ElevenLabs TTS', 'synthesize', {
    textLength: 150,
    voice: 'Rachel',
    format: 'mp3',
  });

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
  logger.info('Performance metric', {
    operation: 'STT transcription',
    duration: 450,
    sessionId,
    metadata: {
      audioSize: 1024000,
      format: 'mp3',
    },
  });

  // 6. Slow operation warning
  console.log('\n6. Slow operation warning (> 2s):');
  logger.warn('Performance metric', {
    operation: 'Search with fallback',
    duration: 2500,
    sessionId,
    metadata: {
      primaryFailed: true,
      fallbackUsed: 'Tavily',
    },
  });

  // 7. Complex structured data
  console.log('\n7. Complex structured logging:');
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
