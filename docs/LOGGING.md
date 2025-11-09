# Logging Documentation

## Overview

The Voice Price Comparison Agent uses **Winston** for structured logging throughout the application. The logging system provides comprehensive tracking of API calls, conversation flows, performance metrics, and errors.

## Features

- **Structured Logging**: All logs are structured with JSON format for easy parsing and analysis
- **Multiple Log Levels**: Support for `debug`, `info`, `warn`, and `error` levels
- **API Call Tracking**: Automatic logging of all external API calls and responses
- **Conversation Flow Tracking**: Track state transitions and events in user conversations
- **Performance Monitoring**: Built-in performance tracking with automatic warnings for slow operations
- **Sensitive Data Protection**: Automatic sanitization of API keys, passwords, and tokens
- **Colorized Console Output**: Easy-to-read colored output in development mode
- **Timestamp Support**: All logs include ISO 8601 timestamps

## Logger Configuration

The logger is configured in `src/utils/logger.ts` and automatically adjusts based on the environment:

- **Development**: `debug` level with colorized console output
- **Production**: `info` level with JSON format

## Basic Usage

### Import the Logger

```typescript
import { logger } from '../utils/logger';
```

### Log Levels

```typescript
// Debug - detailed information for debugging
logger.debug('Detailed debug information', { variable: value });

// Info - general informational messages
logger.info('Operation completed successfully', { result: data });

// Warn - warning messages for potentially problematic situations
logger.warn('Operation took longer than expected', { duration: 2500 });

// Error - error messages with stack traces
logger.error('Operation failed', { error: error.message, stack: error.stack });
```

## Structured Logging Helpers

### API Call Logging

Track external API calls with automatic timing and error handling:

```typescript
import { logApiCall, logApiResponse } from '../utils/logger';

// Log API call initiation
logApiCall('ElevenLabs TTS', 'synthesize', {
  textLength: text.length,
  voice: 'Rachel',
  format: 'mp3',
});

// Log successful API response
logApiResponse('ElevenLabs TTS', 'synthesize', true, 123);

// Log failed API response
logApiResponse(
  'ElevenLabs TTS',
  'synthesize',
  false,
  78,
  new Error('Rate limit exceeded')
);
```

**Output:**
```
2025-11-09 13:22:31 [info]: API call initiated {"service":"ElevenLabs TTS","method":"synthesize","params":{"textLength":150,"voice":"Rachel","format":"mp3"}}
2025-11-09 13:22:31 [info]: API call completed {"service":"ElevenLabs TTS","method":"synthesize","duration":123,"success":true}
```

### Conversation Flow Logging

Track conversation state transitions and events:

```typescript
import { logConversationTransition, logConversationEvent } from '../utils/logger';

// Log state transition
logConversationTransition(
  sessionId,
  'GATHERING_SPECS',
  'SEARCHING',
  'All specifications collected'
);

// Log conversation event
logConversationEvent(sessionId, 'specification_collected', {
  specification: 'RAM',
  value: '16GB',
});
```

**Output:**
```
2025-11-09 13:22:31 [info]: Conversation state transition {"sessionId":"demo-session-123","fromState":"GATHERING_SPECS","toState":"SEARCHING","reason":"All specifications collected"}
2025-11-09 13:22:31 [info]: Conversation event {"sessionId":"demo-session-123","event":"specification_collected","details":{"specification":"RAM","value":"16GB"}}
```

### Performance Monitoring

Track operation performance with automatic warnings for slow operations:

```typescript
import { logPerformance, PerformanceTimer } from '../utils/logger';

// Manual performance logging
logPerformance({
  operation: 'STT transcription',
  duration: 450,
  sessionId: 'session-123',
  metadata: {
    audioSize: 1024000,
    format: 'mp3',
  },
});

// Using PerformanceTimer (recommended)
const timer = new PerformanceTimer('LLM processing', sessionId, {
  messageLength: 250,
  model: 'claude-3-5-sonnet',
});

// ... perform operation ...

timer.end(); // Automatically logs performance
```

**Output:**
```
2025-11-09 13:22:31 [info]: Performance metric {"operation":"STT transcription","duration":450,"sessionId":"session-123","metadata":{"audioSize":1024000,"format":"mp3"}}
2025-11-09 13:22:31 [warn]: Performance metric {"operation":"Search with fallback","duration":2500,"sessionId":"session-123"}
```

> **Note:** Operations taking longer than 2000ms are automatically logged at `warn` level.

## Usage in Services

### STTService Example

```typescript
import { logger, logApiCall, logApiResponse, PerformanceTimer } from '../utils/logger';

async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const timer = new PerformanceTimer('STT transcription');

  try {
    logApiCall('ElevenLabs STT', 'transcribe', {
      bufferSize: audioBuffer.length,
    });

    const result = await this.client.transcribe(audioBuffer);
    
    const duration = timer.end();
    logApiResponse('ElevenLabs STT', 'transcribe', true, duration);

    logger.info('Transcription completed successfully', {
      textLength: result.text.length,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    const duration = timer.end();
    logApiResponse('ElevenLabs STT', 'transcribe', false, duration, error);
    throw error;
  }
}
```

### ConversationOrchestrator Example

```typescript
import { 
  logger, 
  logConversationTransition, 
  logConversationEvent,
  PerformanceTimer 
} from '../utils/logger';

async handleUserInput(sessionId: string, audioInput: Buffer): Promise<Buffer> {
  const timer = new PerformanceTimer('user_input_handling', sessionId);

  try {
    logConversationEvent(sessionId, 'user_input_received', {
      audioSize: audioInput.length,
    });

    // ... process input ...

    const currentState = sessionState.conversationState;
    if (currentState !== newState) {
      logConversationTransition(
        sessionId,
        currentState,
        newState,
        'User provided specifications'
      );
    }

    const duration = timer.end();
    logConversationEvent(sessionId, 'user_input_handled', {
      duration,
      conversationState: newState,
    });

    return audioResponse;
  } catch (error) {
    logger.error('Failed to handle user input', { sessionId, error });
    throw error;
  }
}
```

## Sensitive Data Protection

The logger automatically sanitizes sensitive information from logs:

```typescript
logApiCall('External API', 'authenticate', {
  username: 'user@example.com',
  apiKey: 'secret-key-12345',      // Will be [REDACTED]
  password: 'super-secret',         // Will be [REDACTED]
  token: 'bearer-token-xyz',        // Will be [REDACTED]
});
```

**Output:**
```
{"service":"External API","method":"authenticate","params":{"username":"user@example.com","apiKey":"[REDACTED]","password":"[REDACTED]","token":"[REDACTED]"}}
```

Protected keys include:
- `apiKey`, `api_key`
- `password`
- `token`
- `secret`

## Log Format

### Development Mode
Colorized, human-readable format:
```
2025-11-09 13:22:31 [info]: API call completed {"service":"ElevenLabs TTS","method":"synthesize","duration":123,"success":true}
```

### Production Mode
JSON format for log aggregation tools:
```json
{
  "timestamp": "2025-11-09T13:22:31.000Z",
  "level": "info",
  "message": "API call completed",
  "service": "ElevenLabs TTS",
  "method": "synthesize",
  "duration": 123,
  "success": true
}
```

## Best Practices

### 1. Use Appropriate Log Levels

- **debug**: Detailed information for debugging (e.g., variable values, intermediate states)
- **info**: General operational messages (e.g., successful operations, state changes)
- **warn**: Potentially problematic situations (e.g., slow operations, fallback usage)
- **error**: Error conditions that need attention (e.g., API failures, exceptions)

### 2. Include Context

Always include relevant context in your logs:

```typescript
// Good
logger.info('Search completed', {
  sessionId,
  query: productQuery,
  resultsCount: results.length,
  duration,
});

// Bad
logger.info('Search completed');
```

### 3. Use Structured Helpers

Prefer the structured logging helpers over raw logger calls:

```typescript
// Good
logApiCall('SerpAPI', 'search', { query });
logApiResponse('SerpAPI', 'search', true, duration);

// Less ideal
logger.info('Calling SerpAPI search', { query });
logger.info('SerpAPI search completed', { duration });
```

### 4. Use PerformanceTimer

For operations that need timing, use `PerformanceTimer`:

```typescript
// Good
const timer = new PerformanceTimer('operation_name', sessionId);
// ... do work ...
timer.end();

// Less ideal
const start = Date.now();
// ... do work ...
const duration = Date.now() - start;
logPerformance({ operation: 'operation_name', duration, sessionId });
```

### 5. Log Errors with Context

When logging errors, include the error object and relevant context:

```typescript
try {
  // ... operation ...
} catch (error) {
  logger.error('Operation failed', {
    sessionId,
    operation: 'search',
    error: error.message,
    stack: error.stack,
  });
  throw error;
}
```

## Testing

Run the logger demonstration to see all features in action:

```bash
npx ts-node examples/logger-standalone-demo.ts
```

## Integration with Monitoring Tools

The structured JSON logs can be easily integrated with monitoring and log aggregation tools:

- **CloudWatch**: Use CloudWatch Logs for AWS deployments
- **Datadog**: Forward logs to Datadog for analysis and alerting
- **ELK Stack**: Parse JSON logs with Logstash
- **Splunk**: Ingest JSON logs for searching and visualization

## Performance Considerations

- Logs are written asynchronously to avoid blocking operations
- Sensitive data sanitization has minimal performance impact
- JSON formatting is optimized for production use
- Console output is colorized only in development mode

## Future Enhancements

Potential improvements for the logging system:

- File-based logging with rotation
- Remote log shipping to centralized logging service
- Custom log levels for specific components
- Log sampling for high-volume operations
- Metrics aggregation and reporting
