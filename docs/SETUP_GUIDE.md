# Setup Guide

Complete guide for setting up and configuring the Voice Price Comparison Agent.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [API Key Configuration](#api-key-configuration)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Testing the Setup](#testing-the-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For cloning the repository

Check your versions:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher
```

### Required API Keys

You'll need API keys from the following services:

1. **ElevenLabs** (Speech-to-Text and Text-to-Speech)
   - Sign up at: https://elevenlabs.io/
   - Navigate to Profile → API Keys
   - Create a new API key
   - Free tier: 10,000 characters/month

2. **Anthropic Claude** (LLM for conversation)
   - Sign up at: https://console.anthropic.com/
   - Navigate to API Keys
   - Create a new API key
   - Free tier: Limited credits for testing

3. **SerpAPI** (Web search for prices)
   - Sign up at: https://serpapi.com/
   - Navigate to Dashboard → API Key
   - Free tier: 100 searches/month

4. **Tavily API** (Fallback search)
   - Sign up at: https://tavily.com/
   - Get your API key from the dashboard
   - Free tier: 1,000 searches/month

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd voice-price-comparison-agent
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express (API server)
- ElevenLabs SDK (voice services)
- Anthropic SDK (LLM)
- SerpAPI client (search)
- Winston (logging)
- And other dependencies

### 3. Verify Installation

```bash
npm run build
```

If the build succeeds, your installation is complete.

## API Key Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2: Edit .env File

Open the `.env` file in your text editor and add your API keys:

```env
# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# LLM Configuration (Anthropic Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Search API Configuration
SERPAPI_API_KEY=your_serpapi_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# Optional: API Server Configuration
PORT=3000
NODE_ENV=development

# Optional: API Authentication
# Uncomment and set to enable API key authentication
# API_KEY=your_secret_api_key_for_clients

# Optional: CORS Configuration
# CORS_ORIGIN=*

# Optional: Session Configuration
# SESSION_TIMEOUT_MS=1800000  # 30 minutes
# SESSION_CLEANUP_INTERVAL_MS=300000  # 5 minutes

# Optional: Rate Limiting
# RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
# RATE_LIMIT_MAX_REQUESTS=100
```

### Step 3: Verify Configuration

Run the configuration check:

```bash
npx ts-node -e "require('dotenv').config(); console.log('ElevenLabs:', process.env.ELEVENLABS_API_KEY ? '✅' : '❌'); console.log('Anthropic:', process.env.ANTHROPIC_API_KEY ? '✅' : '❌'); console.log('SerpAPI:', process.env.SERPAPI_API_KEY ? '✅' : '❌'); console.log('Tavily:', process.env.TAVILY_API_KEY ? '✅' : '❌');"
```

You should see ✅ for all required keys.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key for STT/TTS | `sk_abc123...` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` |
| `SERPAPI_API_KEY` | SerpAPI key for web search | `abc123...` |
| `TAVILY_API_KEY` | Tavily API key for fallback search | `tvly-abc123...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `API_KEY` | API authentication key | None (disabled) |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `SESSION_TIMEOUT_MS` | Session timeout | `1800000` (30 min) |
| `SESSION_CLEANUP_INTERVAL_MS` | Cleanup interval | `300000` (5 min) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### ElevenLabs Voice Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ELEVENLABS_VOICE_ID` | Voice ID for TTS | `21m00Tcm4TlvDq8ikWAM` |
| `ELEVENLABS_MODEL_ID` | TTS model | `eleven_multilingual_v2` |

## Running the Application

### Development Mode

Start the server with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

You should see:
```
Server started on port 3000
Environment: development
CORS enabled for: *
```

### Production Mode

Build and run in production:

```bash
npm run build
npm start
```

### Running Tests

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

## Testing the Setup

### 1. Health Check

Test if the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Start a Session

Test session creation:

```bash
curl -X POST http://localhost:3000/api/session/start
```

Expected response:
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Session started successfully"
}
```

### 3. Run Simple Test Client

Test the complete flow:

```bash
npx ts-node examples/simple-test-client.ts
```

This will:
- Start a session
- Retrieve session state
- End the session

### 4. Generate Sample Audio

Create test audio files:

```bash
npx ts-node examples/generate-sample-audio.ts
```

This creates sample audio files in `examples/sample-audio/`.

### 5. Run Full Voice Test

Test with actual voice interaction:

```bash
npx ts-node examples/voice-agent-test-client.ts
```

This runs comprehensive test scenarios with voice input/output.

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: "ELEVENLABS_API_KEY is not defined"

**Solution:**
1. Check that `.env` file exists in the project root
2. Verify the API key is set correctly in `.env`
3. Restart the server after changing `.env`

### Issue: "Port 3000 is already in use"

**Solution:**
```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm run dev
```

### Issue: "Unauthorized" when calling API

**Solution:**
- If `API_KEY` is set in `.env`, you must include it in requests:
  ```bash
  curl -H "Authorization: Bearer YOUR_API_KEY" ...
  ```
- Or remove `API_KEY` from `.env` to disable authentication

### Issue: "Rate limit exceeded"

**Solution:**
- Wait 15 minutes for the rate limit to reset
- Or increase rate limits in `.env`:
  ```env
  RATE_LIMIT_MAX_REQUESTS=200
  ```

### Issue: "Audio file too large"

**Solution:**
- Ensure audio files are under 10MB
- Compress audio files if needed
- Use MP3 format for smaller file sizes

### Issue: "Session not found"

**Solution:**
- Sessions expire after 30 minutes of inactivity
- Create a new session if yours has expired
- Check that you're using the correct session ID

### Issue: TypeScript compilation errors

**Solution:**
```bash
# Rebuild TypeScript
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.x
```

### Issue: Tests failing

**Solution:**
```bash
# Ensure all dependencies are installed
npm install

# Run tests with verbose output
npm test -- --verbose

# Check if server is running (it shouldn't be for tests)
# Tests use their own test server
```

## Next Steps

After successful setup:

1. **Read the API Documentation**: See [docs/API.md](API.md) for endpoint details
2. **Explore Examples**: Check [examples/README.md](../examples/README.md) for usage examples
3. **Review Architecture**: See [docs/API_SERVER_IMPLEMENTATION.md](API_SERVER_IMPLEMENTATION.md)
4. **Understand Logging**: Read [docs/LOGGING.md](LOGGING.md) for monitoring
5. **Build Your Client**: Use the examples as templates for your own implementation

## Getting Help

If you encounter issues not covered here:

1. Check the logs in the console output
2. Review the [API documentation](API.md)
3. Look at the [example implementations](../examples/)
4. Check the test files for usage patterns

## Production Deployment

For production deployment, see:
- Set `NODE_ENV=production`
- Enable `API_KEY` authentication
- Configure appropriate rate limits
- Set up proper logging and monitoring
- Use a process manager (PM2, systemd)
- Set up HTTPS/SSL
- Configure CORS for your domain
- Use a production-grade database for session storage (Redis)

## Security Checklist

Before deploying to production:

- [ ] Set strong `API_KEY` for authentication
- [ ] Configure `CORS_ORIGIN` to your domain (not `*`)
- [ ] Enable HTTPS/SSL
- [ ] Set appropriate rate limits
- [ ] Secure API keys (use secrets manager)
- [ ] Enable request logging
- [ ] Set up monitoring and alerts
- [ ] Regular security updates (`npm audit`)
- [ ] Implement request validation
- [ ] Add input sanitization
