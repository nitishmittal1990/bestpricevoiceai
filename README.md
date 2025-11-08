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
├── utils/           # Utility functions and helpers
└── index.ts         # Application entry point
```

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
