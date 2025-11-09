# Conversation Orchestrator

The `ConversationOrchestrator` is the central component that coordinates all services to handle voice-based product price comparison conversations. It manages the complete conversation flow from audio input to audio output.

## Overview

The orchestrator integrates five core services:
- **STTService**: Speech-to-Text conversion
- **TTSService**: Text-to-Speech synthesis
- **LLMAgent**: Natural language understanding and response generation
- **SearchTool**: Product price search across e-commerce platforms
- **StateManager**: Conversation state persistence

## Architecture

```
User Audio Input
      ↓
[STTService] → Transcription
      ↓
[LLMAgent] → Intent & Action
      ↓
[SearchTool] → Price Data (if needed)
      ↓
[LLMAgent] → Response Generation
      ↓
[TTSService] → Audio Response
      ↓
User Audio Output
```

## Key Features

### 1. Session Management
- Create and manage conversation sessions
- Track session state and conversation history
- Handle session lifecycle (start, active, idle, end)

### 2. Conversation Flow Coordination
- Route audio through STT service
- Process transcribed text with LLM agent
- Execute actions (search, clarify, compare)
- Generate audio responses via TTS
- Update session state after each interaction

### 3. Error Handling & Recovery
- Retry logic for STT failures
- Fallback mechanisms for TTS
- Graceful error messages to users
- Network error handling

### 4. Exit & Idle Detection
- Recognize exit phrases ("goodbye", "exit", "stop")
- Detect idle sessions (30-second timeout)
- Send timeout prompts to inactive users
- Clean up expired sessions

## API Reference

### Constructor

```typescript
constructor(
  sttService?: STTService,
  ttsService?: TTSService,
  llmAgent?: LLMAgent,
  searchTool?: SearchTool,
  stateManager?: StateManager
)
```

Creates a new orchestrator instance. All services are optional and will be instantiated with defaults if not provided.

### Methods

#### `startSession(): Promise<string>`

Starts a new conversation session.

**Returns:** Session ID (UUID)

**Example:**
```typescript
const sessionId = await orchestrator.startSession();
console.log(`Session started: ${sessionId}`);
```

#### `endSession(sessionId: string): Promise<void>`

Ends a conversation session and cleans up state.

**Parameters:**
- `sessionId`: The session ID to end

**Example:**
```typescript
await orchestrator.endSession(sessionId);
```

#### `getSessionState(sessionId: string): Promise<SessionState | null>`

Retrieves the current state of a session.

**Parameters:**
- `sessionId`: The session ID to retrieve

**Returns:** Session state object or null if not found

**Example:**
```typescript
const state = await orchestrator.getSessionState(sessionId);
if (state) {
  console.log(`Conversation state: ${state.conversationState}`);
  console.log(`Messages: ${state.conversationHistory.length}`);
}
```

#### `handleUserInput(sessionId: string, audioInput: Buffer): Promise<AudioBuffer>`

Main entry point for processing user interactions. Handles the complete flow from audio input to audio response.

**Parameters:**
- `sessionId`: The session ID
- `audioInput`: Audio buffer from user (WAV, MP3, WebM, etc.)

**Returns:** Audio response buffer

**Example:**
```typescript
const audioInput = fs.readFileSync('user-audio.wav');
const audioResponse = await orchestrator.handleUserInput(sessionId, audioInput);
fs.writeFileSync('response.mp3', audioResponse.data);
```

**Flow:**
1. Transcribe audio to text (with retry)
2. Check for exit phrases
3. Process with LLM agent
4. Execute any actions (search, clarify)
5. Generate audio response
6. Update session state

#### `isSessionIdle(sessionId: string): Promise<boolean>`

Checks if a session has been idle for longer than the timeout period.

**Parameters:**
- `sessionId`: The session ID to check

**Returns:** True if session is idle

**Example:**
```typescript
const isIdle = await orchestrator.isSessionIdle(sessionId);
if (isIdle) {
  console.log('Session has been idle');
}
```

#### `handleIdleTimeout(sessionId: string): Promise<AudioBuffer | null>`

Handles idle timeout by sending a prompt to the user.

**Parameters:**
- `sessionId`: The session ID

**Returns:** Audio prompt or null if session is not idle

**Example:**
```typescript
const timeoutPrompt = await orchestrator.handleIdleTimeout(sessionId);
if (timeoutPrompt) {
  // Send prompt to user
  playAudio(timeoutPrompt.data);
}
```

#### `getIdleTimeout(): number`

Gets the idle timeout duration in milliseconds.

**Returns:** Timeout duration (default: 30000ms)

## Usage Examples

### Basic Conversation Flow

```typescript
import { ConversationOrchestrator } from './services/ConversationOrchestrator';
import * as fs from 'fs';

async function handleConversation() {
  const orchestrator = new ConversationOrchestrator();
  
  // Start session
  const sessionId = await orchestrator.startSession();
  
  // Process user input
  const audioInput = fs.readFileSync('user-query.wav');
  const response = await orchestrator.handleUserInput(sessionId, audioInput);
  
  // Save response
  fs.writeFileSync('response.mp3', response.data);
  
  // End session when done
  await orchestrator.endSession(sessionId);
}
```

### Multi-Turn Conversation

```typescript
async function multiTurnConversation() {
  const orchestrator = new ConversationOrchestrator();
  const sessionId = await orchestrator.startSession();
  
  try {
    // Turn 1: User asks about a product
    const input1 = fs.readFileSync('turn1.wav');
    const response1 = await orchestrator.handleUserInput(sessionId, input1);
    playAudio(response1.data);
    
    // Turn 2: User provides specifications
    const input2 = fs.readFileSync('turn2.wav');
    const response2 = await orchestrator.handleUserInput(sessionId, input2);
    playAudio(response2.data);
    
    // Turn 3: User asks for another product
    const input3 = fs.readFileSync('turn3.wav');
    const response3 = await orchestrator.handleUserInput(sessionId, input3);
    playAudio(response3.data);
    
  } finally {
    await orchestrator.endSession(sessionId);
  }
}
```

### With Custom Services

```typescript
import { STTService } from './services/STTService';
import { TTSService } from './services/TTSService';
import { LLMAgent } from './services/LLMAgent';
import { SearchTool } from './services/SearchTool';
import { StateManager } from './services/StateManager';

// Create custom service instances with specific configurations
const sttService = new STTService();
const ttsService = new TTSService(true, 100, 3600000); // Enable cache
const llmAgent = new LLMAgent();
const searchTool = new SearchTool();
const stateManager = new StateManager(1800000); // 30 min timeout

// Create orchestrator with custom services
const orchestrator = new ConversationOrchestrator(
  sttService,
  ttsService,
  llmAgent,
  searchTool,
  stateManager
);
```

### Error Handling

```typescript
async function handleWithErrors() {
  const orchestrator = new ConversationOrchestrator();
  const sessionId = await orchestrator.startSession();
  
  try {
    const audioInput = fs.readFileSync('user-audio.wav');
    const response = await orchestrator.handleUserInput(sessionId, audioInput);
    
    // Success - play response
    playAudio(response.data);
    
  } catch (error) {
    console.error('Error processing input:', error);
    
    // The orchestrator already generates an error message
    // and returns it as audio, so this catch is for logging
    // or additional error handling
    
  } finally {
    // Always clean up
    await orchestrator.endSession(sessionId);
  }
}
```

### Idle Detection

```typescript
async function monitorIdleSessions() {
  const orchestrator = new ConversationOrchestrator();
  const sessionId = await orchestrator.startSession();
  
  // Set up periodic idle check
  const idleCheckInterval = setInterval(async () => {
    const isIdle = await orchestrator.isSessionIdle(sessionId);
    
    if (isIdle) {
      console.log('Session is idle, sending prompt...');
      const prompt = await orchestrator.handleIdleTimeout(sessionId);
      
      if (prompt) {
        playAudio(prompt.data);
      }
      
      // Clear interval after sending prompt
      clearInterval(idleCheckInterval);
    }
  }, 10000); // Check every 10 seconds
  
  // Clean up on exit
  process.on('SIGINT', async () => {
    clearInterval(idleCheckInterval);
    await orchestrator.endSession(sessionId);
    process.exit(0);
  });
}
```

## Configuration

The orchestrator uses configuration from the underlying services:

### Environment Variables

```bash
# ElevenLabs (STT & TTS)
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_DEFAULT_VOICE_ID=voice_id
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2

# LLM (Anthropic Claude)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_api_key
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7

# Search APIs
SERPAPI_API_KEY=your_api_key
TAVILY_API_KEY=your_api_key
```

### Timeouts & Retries

The orchestrator has built-in retry logic:

- **STT Retries**: 3 attempts with exponential backoff
- **TTS Retries**: 2 attempts with linear backoff
- **Idle Timeout**: 30 seconds (configurable via StateManager)

## Conversation States

The orchestrator tracks conversation through these states:

- `INITIAL`: Session just started
- `GATHERING_SPECS`: Collecting product specifications
- `SEARCHING`: Performing price search
- `PRESENTING_RESULTS`: Showing search results
- `FOLLOW_UP`: Handling follow-up questions
- `ENDED`: Session terminated

## Exit Phrases

The orchestrator recognizes these phrases to end conversations:
- "goodbye"
- "exit"
- "stop"
- "quit"
- "bye"
- "end"

## Performance Considerations

### Response Time
Target: < 2 seconds end-to-end

Breakdown:
- STT: ~500-1000ms
- LLM: ~500-1000ms
- Search: ~500-1500ms (if needed)
- TTS: ~500-1000ms

### Optimization Tips

1. **Enable TTS Caching**: Cache common phrases
   ```typescript
   const ttsService = new TTSService(true, 100, 3600000);
   ```

2. **Pre-warm Cache**: Load common responses at startup
   ```typescript
   await ttsService.prewarmCache();
   ```

3. **Parallel Operations**: The orchestrator already parallelizes platform searches

4. **Session Cleanup**: StateManager automatically cleans up expired sessions

## Testing

Run the test suite:

```bash
npm test -- ConversationOrchestrator.test.ts
```

Run the demo:

```bash
npm run dev examples/conversation-orchestrator-demo.ts
```

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import multer from 'multer';
import { ConversationOrchestrator } from './services/ConversationOrchestrator';

const app = express();
const upload = multer();
const orchestrator = new ConversationOrchestrator();

// Start session
app.post('/api/session/start', async (req, res) => {
  try {
    const sessionId = await orchestrator.startSession();
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Handle message
app.post('/api/session/:id/message', upload.single('audio'), async (req, res) => {
  try {
    const { id } = req.params;
    const audioInput = req.file?.buffer;
    
    if (!audioInput) {
      return res.status(400).json({ error: 'No audio provided' });
    }
    
    const response = await orchestrator.handleUserInput(id, audioInput);
    
    res.set('Content-Type', `audio/${response.format}`);
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// End session
app.delete('/api/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await orchestrator.endSession(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Troubleshooting

### Common Issues

**Issue**: "Session not found" error
- **Cause**: Session expired or invalid session ID
- **Solution**: Check session timeout settings, ensure session ID is correct

**Issue**: Low transcription confidence
- **Cause**: Poor audio quality or background noise
- **Solution**: The orchestrator retries automatically, but improve audio input quality

**Issue**: Slow response times
- **Cause**: Network latency or API rate limits
- **Solution**: Enable caching, check API quotas, consider regional API endpoints

**Issue**: TTS synthesis fails
- **Cause**: Invalid API key or rate limits
- **Solution**: Check API key configuration, implement rate limiting

## Best Practices

1. **Always clean up sessions**: Use try-finally blocks to ensure `endSession()` is called

2. **Handle errors gracefully**: The orchestrator provides user-friendly error messages

3. **Monitor session activity**: Implement idle detection for better UX

4. **Use appropriate audio formats**: WAV for quality, MP3 for size

5. **Configure timeouts appropriately**: Balance between UX and resource usage

6. **Enable caching in production**: Significantly improves response times

7. **Log important events**: Use the built-in logger for debugging

## Related Documentation

- [STT Service](./STT_SERVICE.md)
- [TTS Service & Caching](./TTS_CACHING.md)
- [LLM Agent](./LLM_AGENT.md)
- [Search Tool](./SEARCH_TOOL.md)
- [State Manager](./STATE_MANAGER.md)
