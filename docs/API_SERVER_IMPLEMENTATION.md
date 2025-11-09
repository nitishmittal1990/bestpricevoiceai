# API Server Implementation

## Overview

This document describes the implementation of the Express API server for the Voice Price Comparison Agent.

## Architecture

The API server follows a modular architecture with clear separation of concerns:

```
src/
├── index.ts                    # Main server entry point
├── routes/
│   ├── session.routes.ts       # Session management endpoints
│   └── __tests__/
│       └── session.routes.test.ts
├── middleware/
│   ├── apiKeyAuth.ts          # API key authentication
│   ├── rateLimiter.ts         # Rate limiting
│   ├── audioValidation.ts     # Audio file validation
│   ├── requestLogger.ts       # Request logging
│   └── errorHandler.ts        # Global error handling
└── services/
    └── ConversationOrchestrator.ts  # Core business logic
```

## Components

### 1. Main Server (src/index.ts)

The main server file initializes Express and configures all middleware:

- **CORS**: Configurable cross-origin resource sharing
- **Request Logging**: Logs all incoming requests and responses
- **Rate Limiting**: General rate limiting for all API endpoints
- **Authentication**: Optional API key authentication
- **Error Handling**: Global error handler for unhandled errors

### 2. Routes (src/routes/session.routes.ts)

Implements four main endpoints:

- `POST /api/session/start` - Create new session
- `POST /api/session/:id/message` - Send audio message
- `GET /api/session/:id/state` - Get session state
- `DELETE /api/session/:id` - End session

Each route includes:
- Input validation
- Error handling
- Logging
- Proper HTTP status codes

### 3. Middleware

#### API Key Authentication (src/middleware/apiKeyAuth.ts)
- Validates Bearer token in Authorization header
- Optional - disabled if API_KEY env var not set
- Returns 401 for invalid/missing keys

#### Rate Limiting (src/middleware/rateLimiter.ts)
Three rate limiters:
- **Session Creation**: 10 per IP per 15 minutes
- **Message Sending**: 60 per session per minute
- **General API**: 100 per IP per 15 minutes

#### Audio Validation (src/middleware/audioValidation.ts)
- Validates audio file format (MP3, WAV, WebM, OGG, FLAC)
- Enforces 10MB file size limit
- Returns descriptive error messages

#### Request Logger (src/middleware/requestLogger.ts)
- Logs all incoming requests
- Tracks request duration
- Logs response status codes

#### Error Handler (src/middleware/errorHandler.ts)
- Catches unhandled errors
- Logs error details
- Returns safe error responses (hides internals in production)

## Configuration

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Security (optional)
API_KEY=your_api_key_here
CORS_ORIGIN=*

# Service API Keys
ELEVENLABS_API_KEY=...
ANTHROPIC_API_KEY=...
SERPAPI_API_KEY=...
TAVILY_API_KEY=...
```

### Dependencies

New dependencies added for API server:
- `express` - Web framework
- `cors` - CORS middleware
- `express-rate-limit` - Rate limiting
- `multer` - Multipart form data handling
- `winston` - Logging

## Request/Response Flow

### 1. Start Session
```
Client → POST /api/session/start
       → Rate Limiter (10/15min)
       → API Key Auth
       → ConversationOrchestrator.startSession()
       → Response: { sessionId }
```

### 2. Send Message
```
Client → POST /api/session/:id/message (audio file)
       → Rate Limiter (60/min)
       → API Key Auth
       → Multer (parse multipart)
       → Audio Validation (format, size)
       → ConversationOrchestrator.handleUserInput()
       → Response: Audio file (MP3)
```

### 3. Get State
```
Client → GET /api/session/:id/state
       → Rate Limiter (100/15min)
       → API Key Auth
       → ConversationOrchestrator.getSessionState()
       → Response: { state }
```

### 4. End Session
```
Client → DELETE /api/session/:id
       → Rate Limiter (100/15min)
       → API Key Auth
       → ConversationOrchestrator.endSession()
       → Response: { success }
```

## Error Handling

All errors are handled consistently:

1. **Validation Errors** (400)
   - Missing audio file
   - Invalid audio format
   - File too large

2. **Authentication Errors** (401)
   - Missing API key
   - Invalid API key

3. **Not Found Errors** (404)
   - Session not found

4. **Rate Limit Errors** (429)
   - Too many requests

5. **Server Errors** (500)
   - Transcription failures
   - LLM errors
   - Search failures
   - TTS errors

## Security Features

1. **API Key Authentication**
   - Optional Bearer token authentication
   - Configurable via environment variable

2. **Rate Limiting**
   - Per-IP and per-session limits
   - Prevents abuse and DoS attacks

3. **Input Validation**
   - Audio format validation
   - File size limits
   - Request sanitization

4. **CORS Configuration**
   - Configurable allowed origins
   - Secure defaults

5. **Error Message Sanitization**
   - Production mode hides internal errors
   - Development mode shows full stack traces

## Testing

Unit tests cover all routes:
- Session creation
- Message sending
- State retrieval
- Session deletion
- Error scenarios

Run tests:
```bash
npm test -- src/routes/__tests__/session.routes.test.ts
```

## Performance Considerations

1. **Streaming**: Audio responses are streamed to reduce memory usage
2. **Connection Pooling**: Reuses HTTP connections for external APIs
3. **Caching**: TTS responses cached for common phrases
4. **Rate Limiting**: Prevents resource exhaustion
5. **Timeouts**: Configured timeouts for all external services

## Monitoring

The server logs:
- All incoming requests
- Request duration
- Response status codes
- Errors with stack traces
- Rate limit violations
- Authentication failures

Use Winston logger for structured logging:
```typescript
logger.info('Message', { metadata });
logger.warn('Warning', { metadata });
logger.error('Error', { error, metadata });
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker (future)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

## API Documentation

Full API documentation available in `docs/API.md`

## Examples

Example client code available in `examples/api-client-demo.ts`

## Future Enhancements

1. **WebSocket Support**: Real-time streaming audio
2. **Session Persistence**: Redis/DynamoDB for session storage
3. **Metrics**: Prometheus metrics endpoint
4. **Health Checks**: Detailed health check with dependency status
5. **API Versioning**: Support multiple API versions
6. **Request Validation**: JSON schema validation
7. **Compression**: Gzip compression for responses
8. **HTTPS**: TLS/SSL support
