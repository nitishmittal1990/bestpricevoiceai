# Voice Price Comparison Agent

A voice-enabled AI agent that helps users find the best prices for products across multiple Indian e-commerce platforms.

## Features

- Voice-first interaction using speech-to-text and text-to-speech
- Intelligent specification gathering through conversational AI
- Multi-platform price comparison across major Indian e-commerce sites
- Natural language understanding powered by Claude/GPT-4
- Real-time product search and price discovery
- Comprehensive structured logging with Winston for monitoring and debugging

## Prerequisites

- Node.js 18+ and npm
- API keys for:
  - ElevenLabs (for voice services)
  - Anthropic Claude or OpenAI (for LLM)
  - SerpAPI (for web search)
  - Tavily API (for fallback search)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

4. Edit `.env` with your API keys

## Configuration

Edit the `.env` file with your API credentials:

```env
ELEVENLABS_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
SERPAPI_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

## Development

Run in development mode:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## Production

Start the production server:
```bash
npm start
```

## API Server

The Voice Price Comparison Agent provides a REST API for voice-based product price comparison.

### Quick Start

1. Start the server:
```bash
npm run dev
```

2. The API will be available at `http://localhost:3000`

### API Endpoints

- `POST /api/session/start` - Start a new conversation session
- `POST /api/session/:id/message` - Send audio message (accepts audio file, returns audio response)
- `GET /api/session/:id/state` - Get current session state
- `DELETE /api/session/:id` - End a session

### Example Usage

```bash
# Start a session
SESSION_ID=$(curl -X POST http://localhost:3000/api/session/start | jq -r '.sessionId')

# Send audio query
curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
  -F "audio=@query.mp3" \
  --output response.mp3

# Get session state
curl -X GET http://localhost:3000/api/session/$SESSION_ID/state

# End session
curl -X DELETE http://localhost:3000/api/session/$SESSION_ID
```

### Security

Optional API key authentication can be enabled by setting the `API_KEY` environment variable:

```env
API_KEY=your_secret_api_key_here
```

When enabled, include the API key in requests:
```bash
curl -H "Authorization: Bearer your_secret_api_key_here" ...
```

### Rate Limiting

- Session creation: 10 per IP per 15 minutes
- Message sending: 60 per session per minute
- General API: 100 requests per IP per 15 minutes

### Documentation

- Full API documentation: [docs/API.md](docs/API.md)
- Implementation details: [docs/API_SERVER_IMPLEMENTATION.md](docs/API_SERVER_IMPLEMENTATION.md)
- Logging system: [docs/LOGGING.md](docs/LOGGING.md)
- Example client: [examples/api-client-demo.ts](examples/api-client-demo.ts)

## Project Structure

```
src/
├── config/          # Configuration and environment setup
├── middleware/      # Express middleware (auth, rate limiting, validation)
├── models/          # TypeScript interfaces and data models
├── routes/          # API route handlers
│   └── session.routes.ts  # Session management endpoints
├── services/        # Service implementations (STT, TTS, LLM, Search)
│   ├── STTService.ts           # Speech-to-Text using ElevenLabs
│   ├── TTSService.ts           # Text-to-Speech using ElevenLabs
│   ├── TTSCache.ts             # TTS response caching
│   ├── LLMAgent.ts             # LLM-based conversation agent
│   ├── SearchTool.ts           # Product search and price comparison
│   ├── StateManager.ts         # Session state management
│   ├── ConversationOrchestrator.ts  # Main orchestration logic
│   └── __tests__/              # Service unit tests
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
└── index.ts         # Application entry point (Express server)
```

## Services

### Text-to-Speech (TTSService)

The TTSService provides natural-sounding voice synthesis using ElevenLabs TTS API with the following features:

- **Indian English Voice**: Optimized for Indian accent and pronunciation
- **Currency Handling**: Automatic conversion of ₹ symbol to spoken "rupees"
- **Platform Names**: Proper pronunciation of Indian e-commerce platforms
- **Multiple Formats**: Support for MP3, WAV, and Opus audio formats
- **Error Handling**: Automatic retry logic with exponential backoff
- **Voice Selection**: Access to ElevenLabs voice library
- **Response Caching**: Intelligent caching of frequently used phrases for improved performance
- **Cache Pre-warming**: Pre-load common phrases at startup for instant responses

#### Basic Usage

```typescript
import { TTSService } from './services/TTSService';

const tts = new TTSService();

// Basic synthesis
const result = await tts.synthesize('Hello, how can I help you?');

// With options
const result = await tts.synthesize(
  'The price is ₹1,99,900 on Flipkart',
  { format: 'wav', voice: 'custom-voice-id' }
);

// Get available voices
const voices = await tts.getAvailableVoices();
```

#### Caching Features

The TTSService includes an intelligent caching layer that significantly improves performance for repeated phrases:

```typescript
// Initialize with custom cache settings
const tts = new TTSService(
  true,              // Enable caching
  100,               // Max 100 cache entries
  24 * 60 * 60 * 1000 // 24 hour TTL
);

// Pre-warm cache with common phrases at startup
await tts.prewarmCache();

// Get cache statistics
const stats = tts.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Cache size: ${stats.size} entries`);

// Clear cache if needed
tts.clearCache();

// Invalidate specific entry
tts.invalidateCache('specific text to invalidate');

// Clear only expired entries
tts.clearExpiredCache();

// Check memory usage
const memoryBytes = tts.getCacheMemoryUsage();
```

**Cache Benefits:**
- Reduces API calls and costs
- Improves response latency (typically 10-100x faster for cached responses)
- Automatic eviction of least-used entries when cache is full
- Case-insensitive matching for better hit rates
- Separate caching for different voices and formats

### Speech-to-Text (STTService)

The STTService handles audio transcription using ElevenLabs Speech-to-Text API with support for multiple audio formats and real-time streaming.

### Logging System

The application uses Winston for comprehensive structured logging:

- **Structured JSON Logs**: All logs include structured metadata for easy parsing
- **Multiple Log Levels**: Debug, info, warn, and error levels
- **API Call Tracking**: Automatic logging of all external API calls with timing
- **Conversation Flow Tracking**: Track state transitions and events in conversations
- **Performance Monitoring**: Built-in performance tracking with warnings for slow operations (>2s)
- **Sensitive Data Protection**: Automatic sanitization of API keys and passwords
- **Colorized Output**: Easy-to-read colored console output in development

#### Quick Example

```typescript
import { logger, logApiCall, logApiResponse, PerformanceTimer } from './utils/logger';

// Basic logging
logger.info('Operation completed', { result: data });

// API call tracking
logApiCall('ElevenLabs TTS', 'synthesize', { textLength: 150 });
logApiResponse('ElevenLabs TTS', 'synthesize', true, 123);

// Performance monitoring
const timer = new PerformanceTimer('operation_name', sessionId);
// ... do work ...
timer.end(); // Automatically logs duration
```

#### Demo

Run the logging demonstration:
```bash
npx ts-node examples/logger-standalone-demo.ts
```

For complete documentation, see [docs/LOGGING.md](docs/LOGGING.md)

## Supported Platforms

- Flipkart
- Amazon India
- Myntra
- Croma
- Reliance Digital
- Vijay Sales
- Tata Cliq
- Snapdeal

## License

MIT
