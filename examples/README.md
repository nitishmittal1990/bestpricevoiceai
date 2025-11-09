# Examples

This directory contains example scripts and test clients for the Voice Price Comparison Agent.

## Available Examples

### Test Clients

#### 1. Simple Test Client (`simple-test-client.ts`)
A lightweight test client that demonstrates basic API usage without requiring audio files.

**Usage:**
```bash
npx ts-node examples/simple-test-client.ts
```

**Features:**
- Session lifecycle management
- State retrieval
- Curl command examples
- No audio files required

#### 2. Voice Agent Test Client (`voice-agent-test-client.ts`)
A comprehensive test client that simulates real voice interactions with multi-turn conversations.

**Usage:**
```bash
npx ts-node examples/voice-agent-test-client.ts
```

**Features:**
- Text-to-speech conversion for queries
- Multi-turn conversation simulation
- Multiple test scenarios
- Audio file generation and management

**Test Scenarios:**
- Complete specification provided upfront
- Multi-turn conversation with specification gathering
- Different product categories (phones, laptops, etc.)

#### 3. API Client Demo (`api-client-demo.ts`)
Basic demonstration of API endpoints with curl examples.

**Usage:**
```bash
npx ts-node examples/api-client-demo.ts
```

### Service Demos

#### 4. Conversation Orchestrator Demo (`conversation-orchestrator-demo.ts`)
Demonstrates the conversation orchestrator service.

#### 5. LLM Agent Demo (`llm-agent-demo.ts`)
Shows how the LLM agent processes user messages and extracts product information.

#### 6. Search Demo (`search-demo.ts`)
Demonstrates product search and price comparison functionality.

#### 7. TTS Demo (`tts-demo.ts`)
Shows text-to-speech synthesis capabilities.

#### 8. TTS Cache Demo (`tts-cache-demo.ts`)
Demonstrates TTS caching for improved performance.

#### 9. Logger Demo (`logger-demo.ts` and `logger-standalone-demo.ts`)
Shows the structured logging system in action.

### Utilities

#### 10. Generate Sample Audio (`generate-sample-audio.ts`)
Generates sample audio files for testing using ElevenLabs TTS.

**Usage:**
```bash
npx ts-node examples/generate-sample-audio.ts
```

**Output:**
Creates audio files in `examples/sample-audio/` directory:
- `sample-laptop-complete.mp3` - Complete laptop specification
- `sample-laptop-vague.mp3` - Vague laptop query
- `sample-phone-complete.mp3` - Complete phone specification
- `sample-phone-partial.mp3` - Partial phone specification
- `sample-headphones.mp3` - Headphones query
- `sample-followup-*.mp3` - Follow-up responses
- `sample-goodbye.mp3` - Exit conversation

## Prerequisites

### Required Environment Variables

All examples require these environment variables (set in `.env`):

```env
ELEVENLABS_API_KEY=your_elevenlabs_key
ANTHROPIC_API_KEY=your_anthropic_key
SERPAPI_API_KEY=your_serpapi_key
TAVILY_API_KEY=your_tavily_key
```

### Optional Environment Variables

```env
API_BASE_URL=http://localhost:3000  # Default API URL
API_KEY=your_api_key                # Optional API authentication
```

## Running Examples

### 1. Start the API Server

First, make sure the API server is running:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### 2. Run Test Clients

In a separate terminal, run any of the test clients:

```bash
# Simple test (no audio required)
npx ts-node examples/simple-test-client.ts

# Full voice test (requires ElevenLabs API key)
npx ts-node examples/voice-agent-test-client.ts

# Generate sample audio files first
npx ts-node examples/generate-sample-audio.ts
```

## Test Scenarios

### Scenario 1: Complete Specification

User provides all details upfront:
```
"Find me the cheapest MacBook Pro 14 inch with M3 Pro chip, 18GB RAM, and 512GB storage"
```

Expected flow:
1. Extract complete product information
2. Perform search immediately
3. Return price comparison results

### Scenario 2: Multi-turn Conversation

User provides details incrementally:
```
User: "I want to buy a laptop"
Agent: "Which brand and model are you interested in?"
User: "Apple MacBook"
Agent: "MacBook Air or MacBook Pro? What screen size?"
User: "MacBook Pro 14 inch"
... (continues until all specs gathered)
```

Expected flow:
1. Initial vague query
2. Agent asks clarifying questions
3. User provides specifications one by one
4. Search performed when complete
5. Results returned

### Scenario 3: Different Product Categories

Test with various product types:
- Laptops (MacBook, Dell, HP)
- Phones (iPhone, Samsung, OnePlus)
- Headphones (Sony, Bose, Apple)
- Tablets (iPad, Samsung Tab)

## Output Files

Test clients create output files in:
- `examples/test-output/` - Test client audio files
- `examples/sample-audio/` - Generated sample audio files

## Troubleshooting

### "No active session" Error
Make sure to call `startSession()` before sending messages.

### "ELEVENLABS_API_KEY is required" Error
Set the ElevenLabs API key in your `.env` file.

### "Connection refused" Error
Ensure the API server is running on the correct port.

### Rate Limiting Errors
The API has rate limits:
- 10 session starts per IP per 15 minutes
- 60 messages per session per minute

Wait a few minutes and try again.

## Tips

1. **Use Simple Test Client First**: Start with `simple-test-client.ts` to verify API connectivity without audio complexity.

2. **Generate Sample Audio**: Run `generate-sample-audio.ts` once to create reusable test audio files.

3. **Check Logs**: The server logs provide detailed information about request processing.

4. **Monitor Performance**: Use the logger demos to understand performance characteristics.

5. **Test Incrementally**: Start with simple scenarios before testing complex multi-turn conversations.

## Next Steps

After running the examples:
1. Review the API documentation in `docs/API.md`
2. Check implementation details in `docs/API_SERVER_IMPLEMENTATION.md`
3. Explore the logging system in `docs/LOGGING.md`
4. Build your own client using these examples as templates
