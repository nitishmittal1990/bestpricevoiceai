# Voice Price Comparison Agent API Documentation

## Overview

The Voice Price Comparison Agent API provides endpoints for creating voice-based conversation sessions to search and compare product prices across multiple e-commerce platforms.

## Base URL

```
http://localhost:3000
```

## Authentication

API requests can be optionally protected with an API key. If `API_KEY` is set in the environment variables, all requests to `/api/session/*` endpoints must include an Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

If `API_KEY` is not configured, authentication is disabled (useful for development).

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Session Creation**: 10 sessions per IP per 15 minutes
- **Message Sending**: 60 messages per session per minute
- **General API**: 100 requests per IP per 15 minutes

Rate limit information is included in response headers:
- `RateLimit-Limit`: Maximum number of requests
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Endpoints

### 1. Health Check

Check if the API server is running.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Start Session

Create a new conversation session.

**Endpoint:** `POST /api/session/start`

**Authentication:** Required (if configured)

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Session started successfully"
}
```

**Status Codes:**
- `201`: Session created successfully
- `401`: Unauthorized (invalid or missing API key)
- `429`: Too many sessions created
- `500`: Internal server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/session/start \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

---

### 3. Send Message

Send an audio message to an existing session and receive an audio response.

**Endpoint:** `POST /api/session/:id/message`

**Authentication:** Required (if configured)

**Parameters:**
- `id` (path): Session ID

**Request Body:** `multipart/form-data`
- `audio` (file): Audio file (MP3, WAV, WebM, OGG, FLAC)
  - Maximum size: 10MB
  - Supported formats: audio/mpeg, audio/wav, audio/webm, audio/ogg, audio/flac

**Response:** Audio file (audio/mpeg)

**Status Codes:**
- `200`: Message processed successfully, audio response returned
- `400`: Invalid request (no audio file, unsupported format, file too large)
- `401`: Unauthorized
- `404`: Session not found
- `413`: Audio file too large
- `429`: Too many messages sent
- `500`: Internal server error

**Error Response (JSON):**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/session/550e8400-e29b-41d4-a716-446655440000/message \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "audio=@user-query.mp3" \
  --output agent-response.mp3
```

---

### 4. Get Session State

Retrieve the current state of a conversation session.

**Endpoint:** `GET /api/session/:id/state`

**Authentication:** Required (if configured)

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "success": true,
  "state": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "conversationHistory": [
      {
        "role": "user",
        "content": "I'm looking for a MacBook Pro",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "I'd be happy to help you find the best price...",
        "timestamp": "2024-01-15T10:30:02.000Z"
      }
    ],
    "currentProduct": {
      "productName": "MacBook Pro",
      "category": "laptop",
      "specifications": {
        "screenSize": "14 inch",
        "chip": "M3 Pro",
        "ram": "18GB",
        "storage": "512GB"
      }
    },
    "status": "active",
    "conversationState": "gathering_specs",
    "lastActivity": "2024-01-15T10:30:02.000Z"
  }
}
```

**Status Codes:**
- `200`: Session state retrieved successfully
- `401`: Unauthorized
- `404`: Session not found
- `500`: Internal server error

**Example:**
```bash
curl -X GET http://localhost:3000/api/session/550e8400-e29b-41d4-a716-446655440000/state \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 5. End Session

End a conversation session and clean up resources.

**Endpoint:** `DELETE /api/session/:id`

**Authentication:** Required (if configured)

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

**Status Codes:**
- `200`: Session ended successfully
- `401`: Unauthorized
- `404`: Session not found
- `500`: Internal server error

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/session/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Conversation States

Sessions progress through different conversation states:

- `initial`: Session just started
- `gathering_specs`: Agent is collecting product specifications
- `searching`: Searching for product prices
- `presenting_results`: Presenting price comparison results
- `follow_up`: Handling follow-up questions
- `ended`: Session has ended

## Session Status

- `active`: Session is currently processing a request
- `waiting`: Session is waiting for user input
- `completed`: Session has been completed and ended

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Common error types:
- `Unauthorized`: Missing or invalid API key
- `No audio file provided`: Audio file missing from request
- `Unsupported audio format`: Audio format not supported
- `Audio file too large`: File exceeds 10MB limit
- `Session not found`: Invalid session ID
- `Too many requests`: Rate limit exceeded
- `Internal server error`: Unexpected server error

## CORS

The API supports Cross-Origin Resource Sharing (CORS). Configure allowed origins using the `CORS_ORIGIN` environment variable (defaults to `*`).

## Example Workflow

1. **Start a session**
   ```bash
   SESSION_ID=$(curl -X POST http://localhost:3000/api/session/start \
     -H "Authorization: Bearer YOUR_API_KEY" | jq -r '.sessionId')
   ```

2. **Send audio query**
   ```bash
   curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "audio=@query1.mp3" \
     --output response1.mp3
   ```

3. **Check session state**
   ```bash
   curl -X GET http://localhost:3000/api/session/$SESSION_ID/state \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

4. **Continue conversation**
   ```bash
   curl -X POST http://localhost:3000/api/session/$SESSION_ID/message \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "audio=@query2.mp3" \
     --output response2.mp3
   ```

5. **End session**
   ```bash
   curl -X DELETE http://localhost:3000/api/session/$SESSION_ID \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## Client Libraries

### Node.js/TypeScript

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { Authorization: 'Bearer YOUR_API_KEY' }
});

// Start session
const { data } = await client.post('/api/session/start');
const sessionId = data.sessionId;

// Send audio
const formData = new FormData();
formData.append('audio', fs.createReadStream('query.mp3'));
const response = await client.post(
  `/api/session/${sessionId}/message`,
  formData,
  { responseType: 'arraybuffer' }
);
fs.writeFileSync('response.mp3', response.data);

// End session
await client.delete(`/api/session/${sessionId}`);
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000'
API_KEY = 'YOUR_API_KEY'
headers = {'Authorization': f'Bearer {API_KEY}'}

# Start session
response = requests.post(f'{API_BASE}/api/session/start', headers=headers)
session_id = response.json()['sessionId']

# Send audio
with open('query.mp3', 'rb') as audio_file:
    files = {'audio': audio_file}
    response = requests.post(
        f'{API_BASE}/api/session/{session_id}/message',
        headers=headers,
        files=files
    )
    with open('response.mp3', 'wb') as f:
        f.write(response.content)

# End session
requests.delete(f'{API_BASE}/api/session/{session_id}', headers=headers)
```

## Performance

- Target response time: < 2 seconds for end-to-end voice interaction
- Audio transcription: ~500ms
- LLM processing: ~800ms
- Search (when needed): ~1-2 seconds
- TTS synthesis: ~500ms

## Troubleshooting

### "Unauthorized" error
- Ensure API_KEY is set in your environment if authentication is enabled
- Check that the Authorization header is correctly formatted

### "Unsupported audio format" error
- Verify your audio file is in a supported format (MP3, WAV, WebM, OGG, FLAC)
- Check the file's MIME type

### "Session not found" error
- Verify the session ID is correct
- Sessions may expire after 30 minutes of inactivity

### "Too many requests" error
- Wait for the rate limit window to reset
- Check rate limit headers in the response

### Audio response is empty or corrupted
- Ensure you're saving the response as binary data
- Check that the Content-Type header is set correctly

## Additional Documentation

- **Setup Guide**: [docs/SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup and configuration instructions
- **Conversation Flows**: [docs/CONVERSATION_FLOWS.md](CONVERSATION_FLOWS.md) - Example conversations and flow patterns
- **Platforms & Categories**: [docs/PLATFORMS_AND_CATEGORIES.md](PLATFORMS_AND_CATEGORIES.md) - Supported platforms and product categories
- **Implementation Details**: [docs/API_SERVER_IMPLEMENTATION.md](API_SERVER_IMPLEMENTATION.md) - Technical implementation details
- **Logging System**: [docs/LOGGING.md](LOGGING.md) - Structured logging and monitoring
- **Examples**: [examples/README.md](../examples/README.md) - Test clients and usage examples
