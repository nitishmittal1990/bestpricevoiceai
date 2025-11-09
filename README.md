# Voice Price Comparison Agent

A voice-enabled AI agent that helps users find the best prices for products across multiple Indian e-commerce platforms through natural conversation.

## 🎯 Overview

The Voice Price Comparison Agent is an intelligent conversational AI system that:
- Understands natural voice queries about products
- Gathers specifications through interactive dialogue
- Searches across 8+ major Indian e-commerce platforms
- Compares prices and presents the best deals
- Responds with natural-sounding voice output

Perfect for hands-free shopping, accessibility needs, or anyone who prefers voice interaction over typing.

## ✨ Features

- **Voice-First Interaction**: Complete voice-based interface using ElevenLabs STT/TTS
- **Intelligent Conversations**: Natural dialogue powered by Claude/GPT-4
- **Smart Specification Gathering**: Asks clarifying questions to get exact product details
- **Multi-Platform Search**: Searches Flipkart, Amazon India, Croma, Myntra, and more
- **Accurate Price Comparison**: Ensures specification matching before comparing prices
- **Real-Time Results**: Fast response times (< 2 seconds target)
- **Comprehensive Logging**: Structured logging with Winston for monitoring and debugging
- **RESTful API**: Easy integration with any client application

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **API Keys** from:
  - [ElevenLabs](https://elevenlabs.io/) - Voice services (STT/TTS)
  - [Anthropic](https://console.anthropic.com/) - Claude LLM
  - [SerpAPI](https://serpapi.com/) - Web search
  - [Tavily](https://tavily.com/) - Fallback search

### Installation

1. **Clone and install**:
```bash
git clone <repository-url>
cd voice-price-comparison-agent
npm install
```

2. **Configure API keys**:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Start the server**:
```bash
npm run dev
```

4. **Test the API**:
```bash
curl http://localhost:3000/health
```

You should see: `{"status":"ok","timestamp":"..."}`

### Your First Voice Query

1. **Start a session**:
```bash
SESSION_ID=$(curl -X POST http://localhost:3000/api/session/start | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"
```

2. **Send an audio query** (requires audio file):
```bash
curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
  -F "audio=@your-query.mp3" \
  --output response.mp3
```

3. **Check the session state**:
```bash
curl http://localhost:3000/api/session/$SESSION_ID/state | jq
```

4. **End the session**:
```bash
curl -X DELETE http://localhost:3000/api/session/$SESSION_ID
```

### Using the Test Client

For easier testing without audio files:

```bash
# Simple test (no audio required)
npx ts-node examples/simple-test-client.ts

# Generate sample audio files
npx ts-node examples/generate-sample-audio.ts

# Full voice test with audio
npx ts-node examples/voice-agent-test-client.ts
```

## 📖 Documentation

### Getting Started
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete setup and configuration instructions
- **[API Documentation](docs/API.md)** - Detailed API reference with examples
- **[Examples](examples/README.md)** - Test clients and usage examples

### Understanding the System
- **[Conversation Flows](docs/CONVERSATION_FLOWS.md)** - Example conversations and patterns
- **[Platforms & Categories](docs/PLATFORMS_AND_CATEGORIES.md)** - Supported platforms and products
- **[Architecture](docs/API_SERVER_IMPLEMENTATION.md)** - Technical implementation details

### Advanced Topics
- **[Logging System](docs/LOGGING.md)** - Structured logging and monitoring
- **[TTS Caching](docs/TTS_CACHING.md)** - Performance optimization with caching
- **[LLM Agent](docs/LLM_AGENT.md)** - Conversation intelligence details

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│   Voice     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         API Server (Express)            │
│  ┌────────────────────────────────┐    │
│  │  Conversation Orchestrator     │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   STT    │   │   LLM    │   │  Search  │   │   TTS    │
│ Service  │   │  Agent   │   │   Tool   │   │ Service  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ElevenLabs│   │  Claude  │   │ SerpAPI  │   │ElevenLabs│
│   API    │   │   API    │   │  Tavily  │   │   API    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

### Run Specific Examples
```bash
# Conversation orchestrator demo
npx ts-node examples/conversation-orchestrator-demo.ts

# LLM agent demo
npx ts-node examples/llm-agent-demo.ts

# Search tool demo
npx ts-node examples/search-demo.ts

# TTS with caching demo
npx ts-node examples/tts-cache-demo.ts

# Logging demo
npx ts-node examples/logger-standalone-demo.ts
```

## 🌐 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session/start` | Start a new conversation session |
| `POST` | `/api/session/:id/message` | Send audio message, receive audio response |
| `GET` | `/api/session/:id/state` | Get current session state |
| `DELETE` | `/api/session/:id` | End a session |
| `GET` | `/health` | Health check endpoint |

### Authentication

Optional API key authentication:

```env
API_KEY=your_secret_api_key_here
```

Include in requests:
```bash
curl -H "Authorization: Bearer your_api_key" ...
```

### Rate Limits

- **Session creation**: 10 per IP per 15 minutes
- **Message sending**: 60 per session per minute
- **General API**: 100 requests per IP per 15 minutes

### Example: Complete Workflow

```bash
# 1. Start session
SESSION_ID=$(curl -X POST http://localhost:3000/api/session/start | jq -r '.sessionId')

# 2. Send audio query
curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
  -F "audio=@query.mp3" \
  --output response.mp3

# 3. Check state
curl http://localhost:3000/api/session/$SESSION_ID/state | jq

# 4. Continue conversation
curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
  -F "audio=@followup.mp3" \
  --output response2.mp3

# 5. End session
curl -X DELETE http://localhost:3000/api/session/$SESSION_ID
```

See [API Documentation](docs/API.md) for complete details.

## 📁 Project Structure

```
voice-price-comparison-agent/
├── src/
│   ├── config/              # Configuration and environment setup
│   ├── middleware/          # Express middleware (auth, rate limiting, validation)
│   ├── models/              # TypeScript interfaces and data models
│   ├── routes/              # API route handlers
│   ├── services/            # Core service implementations
│   │   ├── STTService.ts              # Speech-to-Text (ElevenLabs)
│   │   ├── TTSService.ts              # Text-to-Speech (ElevenLabs)
│   │   ├── TTSCache.ts                # TTS response caching
│   │   ├── LLMAgent.ts                # Conversation intelligence (Claude)
│   │   ├── SearchTool.ts              # Product search & price comparison
│   │   ├── StateManager.ts            # Session state management
│   │   ├── ConversationOrchestrator.ts # Main orchestration logic
│   │   └── __tests__/                 # Service unit tests
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions (logger, validation)
│   └── index.ts             # Application entry point
├── examples/                # Example clients and demos
├── docs/                    # Documentation
├── .env.example             # Environment variables template
└── package.json             # Dependencies and scripts
```

## 🛍️ Supported Platforms

The agent searches across 8+ major Indian e-commerce platforms:

| Platform | Categories | Best For |
|----------|-----------|----------|
| **Flipkart** | Electronics, Fashion, General | Competitive pricing, wide range |
| **Amazon India** | Electronics, Fashion, General | Prime benefits, fast delivery |
| **Croma** | Electronics, Appliances | In-store support, demos |
| **Reliance Digital** | Electronics, Appliances | Physical stores, warranties |
| **Vijay Sales** | Electronics | Competitive pricing |
| **Myntra** | Fashion, Accessories | Fashion-focused, exclusive brands |
| **Tata Cliq** | Electronics, Fashion, Luxury | Authentic products, Tata trust |
| **Snapdeal** | General | Budget-friendly options |

See [Platforms & Categories](docs/PLATFORMS_AND_CATEGORIES.md) for complete details.

## 📦 Product Categories

Supported product categories with intelligent specification gathering:

- **Laptops** - Brand, model, processor, RAM, storage, screen size
- **Phones** - Brand, model, storage, color
- **Tablets** - Brand, model, size, storage, connectivity
- **Headphones** - Brand, model, type, connectivity
- **Monitors** - Brand, model, size, resolution
- **Cameras** - Brand, model, type
- **Desktops** - Brand, model, processor, RAM, storage
- **Smartwatches** - Brand, model, size

## 🔧 Configuration

### Environment Variables

Required:
```env
ELEVENLABS_API_KEY=your_elevenlabs_key
ANTHROPIC_API_KEY=your_anthropic_key
SERPAPI_API_KEY=your_serpapi_key
TAVILY_API_KEY=your_tavily_key
```

Optional:
```env
PORT=3000
NODE_ENV=development
API_KEY=your_api_key              # Enable API authentication
CORS_ORIGIN=*                     # CORS configuration
SESSION_TIMEOUT_MS=1800000        # 30 minutes
RATE_LIMIT_MAX_REQUESTS=100       # Rate limit
```

See [Setup Guide](docs/SETUP_GUIDE.md) for complete configuration options.

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Service tests
npm test -- STTService
npm test -- TTSService
npm test -- LLMAgent
npm test -- SearchTool
npm test -- ConversationOrchestrator

# API tests
npm test -- session.routes
```

### Test Coverage
```bash
npm test -- --coverage
```

## 🎭 Example Conversations

### Complete Specification
```
User: "Find me the cheapest MacBook Pro 14 inch with M3 Pro chip, 18GB RAM, and 512GB storage"
Agent: "Let me search for that..."
Agent: "The lowest price is ₹1,99,900 on Flipkart, followed by ₹2,04,900 on Amazon India."
```

### Progressive Specification
```
User: "I want to buy a laptop"
Agent: "Which brand are you interested in?"
User: "Apple"
Agent: "MacBook Air or MacBook Pro?"
User: "MacBook Pro"
Agent: "What screen size? 14-inch or 16-inch?"
... (continues until all specs gathered)
```

See [Conversation Flows](docs/CONVERSATION_FLOWS.md) for more examples.

## 🚨 Troubleshooting

### Common Issues

**"Cannot find module" errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Port 3000 already in use"**
```bash
PORT=3001 npm run dev
```

**"API key not defined"**
- Check `.env` file exists and has correct keys
- Restart server after changing `.env`

**"Session not found"**
- Sessions expire after 30 minutes
- Create a new session

See [Setup Guide](docs/SETUP_GUIDE.md) for more troubleshooting tips.

## 📊 Performance

Target metrics:
- **End-to-end response**: < 2 seconds
- **STT transcription**: ~500ms
- **LLM processing**: ~800ms
- **Search**: ~1-2 seconds
- **TTS synthesis**: ~500ms (or instant with cache)

## 🔒 Security

- Optional API key authentication
- Rate limiting per IP and session
- Input validation and sanitization
- CORS configuration
- Secure API key storage
- Request logging

See [Setup Guide](docs/SETUP_GUIDE.md) for production security checklist.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- [ElevenLabs](https://elevenlabs.io/) - Voice services
- [Anthropic Claude](https://www.anthropic.com/) - Conversational AI
- [SerpAPI](https://serpapi.com/) - Web search
- [Tavily](https://tavily.com/) - AI search
- [Express](https://expressjs.com/) - Web framework
- [Winston](https://github.com/winstonjs/winston) - Logging

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Examples**: [examples/](examples/)
- **Issues**: GitHub Issues
- **API Reference**: [docs/API.md](docs/API.md)
