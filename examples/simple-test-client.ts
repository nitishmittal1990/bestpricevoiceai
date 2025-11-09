/**
 * Simple Test Client (No Audio Required)
 * 
 * A simplified test client that demonstrates API usage without requiring
 * actual audio files. Useful for quick testing and development.
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

class SimpleTestClient {
  private apiClient: AxiosInstance;
  private sessionId: string | null = null;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
      timeout: 30000,
    });
  }

  async startSession(): Promise<string> {
    console.log('🚀 Starting new session...');
    const response = await this.apiClient.post('/api/session/start');
    this.sessionId = response.data.sessionId;
    console.log(`✅ Session started: ${this.sessionId}\n`);
    return this.sessionId;
  }

  async getSessionState(): Promise<any> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    console.log('📊 Fetching session state...');
    const response = await this.apiClient.get(`/api/session/${this.sessionId}/state`);
    console.log('✅ Session state retrieved\n');
    return response.data.state;
  }

  async endSession(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    console.log('🛑 Ending session...');
    await this.apiClient.delete(`/api/session/${this.sessionId}`);
    console.log(`✅ Session ${this.sessionId} ended\n`);
    this.sessionId = null;
  }

  printState(state: any): void {
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 SESSION STATE');
    console.log('═══════════════════════════════════════════════════');
    console.log(JSON.stringify(state, null, 2));
    console.log('═══════════════════════════════════════════════════\n');
  }
}

async function runSimpleTest() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Simple Test Client Demo                        ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const client = new SimpleTestClient();

  try {
    // Test 1: Session lifecycle
    console.log('--- Test 1: Session Lifecycle ---\n');
    await client.startSession();
    const state = await client.getSessionState();
    client.printState(state);
    await client.endSession();

    // Test 2: Multiple sessions
    console.log('--- Test 2: Multiple Sessions ---\n');
    const session1 = await client.startSession();
    console.log(`Session 1: ${session1}`);
    
    const client2 = new SimpleTestClient();
    const session2 = await client2.startSession();
    console.log(`Session 2: ${session2}\n`);

    await client.endSession();
    await client2.endSession();

    console.log('✅ All tests passed!\n');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API Error:', error.response?.data || error.message);
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

// Example curl commands
function printCurlExamples() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Curl Command Examples                          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const authHeader = API_KEY ? `-H "Authorization: Bearer ${API_KEY}"` : '';

  console.log('1️⃣  Start a session:');
  console.log(`   curl -X POST ${API_BASE_URL}/api/session/start ${authHeader}\n`);

  console.log('2️⃣  Send audio message:');
  console.log(`   curl -X POST ${API_BASE_URL}/api/session/{SESSION_ID}/message \\`);
  console.log(`        ${authHeader} \\`);
  console.log('        -F "audio=@path/to/audio.mp3" \\');
  console.log('        --output response.mp3\n');

  console.log('3️⃣  Get session state:');
  console.log(`   curl -X GET ${API_BASE_URL}/api/session/{SESSION_ID}/state ${authHeader}\n`);

  console.log('4️⃣  End session:');
  console.log(`   curl -X DELETE ${API_BASE_URL}/api/session/{SESSION_ID} ${authHeader}\n`);
}

if (require.main === module) {
  console.log('\n📝 Note: Make sure the API server is running.');
  console.log('   Start with: npm run dev\n');
  
  printCurlExamples();
  runSimpleTest().catch(console.error);
}

export { SimpleTestClient };
