# Voice Price Comparison Agent

A voice-enabled AI agent that helps users find the best prices for products across multiple Indian e-commerce platforms.

## Features

- Voice-first interaction using speech-to-text and text-to-speech
- Intelligent specification gathering through conversational AI
- Multi-platform price comparison across major Indian e-commerce sites
- Natural language understanding powered by Claude/GPT-4
- Real-time product search and price discovery

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

## Project Structure

```
src/
├── config/          # Configuration and environment setup
├── models/          # TypeScript interfaces and data models
├── services/        # Service implementations (STT, TTS, LLM, Search)
│   ├── STTService.ts    # Speech-to-Text using ElevenLabs
│   ├── TTSService.ts    # Text-to-Speech using ElevenLabs
│   └── __tests__/       # Service unit tests
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
└── index.ts         # Application entry point
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

Example usage:
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

### Speech-to-Text (STTService)

The STTService handles audio transcription using ElevenLabs Speech-to-Text API with support for multiple audio formats and real-time streaming.

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
