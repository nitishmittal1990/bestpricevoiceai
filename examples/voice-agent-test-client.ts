/**
 * Voice Agent Test Client
 * 
 * A comprehensive test client for the Voice Price Comparison Agent
 * that simulates multi-turn conversations and tests the complete flow.
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { ElevenLabsClient } from 'elevenlabs';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

interface SessionState {
  sessionId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  currentProduct?: any;
  lastActivity: string;
  status: string;
}

class VoiceAgentTestClient {
  private apiClient: AxiosInstance;
  private elevenLabs: ElevenLabsClient;
  private sessionId: string | null = null;
  private outputDir: string;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
      timeout: 30000,
    });

    this.elevenLabs = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
    });

    this.outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Start a new conversation session
   */
  async startSession(): Promise<string> {
    console.log('🚀 Starting new session...');
    const response = await this.apiClient.post('/api/session/start');
    this.sessionId = response.data.sessionId;
    console.log(`✅ Session started: ${this.sessionId}\n`);
    return this.sessionId;
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(text: string, filename: string): Promise<string> {
    console.log(`🎤 Converting text to speech: "${text.substring(0, 50)}..."`);
    
    const audio = await this.elevenLabs.textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
      text,
      model_id: 'eleven_multilingual_v2',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, audioBuffer);
    
    console.log(`✅ Audio saved: ${filepath}\n`);
    return filepath;
  }

  /**
   * Send an audio message to the agent
   */
  async sendMessage(audioPath: string, messageNumber: number): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    console.log(`📤 Sending message ${messageNumber}...`);
    
    const audioBuffer = fs.readFileSync(audioPath);
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg',
    });

    const response = await this.apiClient.post(
      `/api/session/${this.sessionId}/message`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      }
    );

    const responseAudioPath = path.join(
      this.outputDir,
      `response-${messageNumber}.mp3`
    );
    fs.writeFileSync(responseAudioPath, Buffer.from(response.data));
    console.log(`✅ Response received: ${responseAudioPath}\n`);
    
    return responseAudioPath;
  }

  /**
   * Get current session state
   */
  async getSessionState(): Promise<SessionState> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    console.log('📊 Fetching session state...');
    const response = await this.apiClient.get(`/api/session/${this.sessionId}/state`);
    console.log('✅ Session state retrieved\n');
    return response.data.state;
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }

    console.log('🛑 Ending session...');
    await this.apiClient.delete(`/api/session/${this.sessionId}`);
    console.log(`✅ Session ${this.sessionId} ended\n`);
    this.sessionId = null;
  }

  /**
   * Print session state in a readable format
   */
  printSessionState(state: SessionState): void {
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 SESSION STATE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Session ID: ${state.sessionId}`);
    console.log(`Status: ${state.status}`);
    console.log(`Last Activity: ${state.lastActivity}`);
    
    if (state.currentProduct) {
      console.log('\n🛍️  Current Product:');
      console.log(JSON.stringify(state.currentProduct, null, 2));
    }
    
    console.log('\n💬 Conversation History:');
    state.conversationHistory.forEach((msg, idx) => {
      const icon = msg.role === 'user' ? '👤' : '🤖';
      console.log(`\n${icon} ${msg.role.toUpperCase()} [${msg.timestamp}]:`);
      console.log(`   ${msg.content}`);
    });
    console.log('═══════════════════════════════════════════════════\n');
  }
}

/**
 * Test Scenario 1: Complete specification provided upfront
 */
async function testCompleteSpecification() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  TEST SCENARIO 1: Complete Specification         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const client = new VoiceAgentTestClient();

  try {
    // Start session
    await client.startSession();

    // User provides complete specification
    const query = "Find me the cheapest MacBook Pro 14 inch with M3 Pro chip, 18GB RAM, and 512GB storage";
    const audioPath = await client.textToSpeech(query, 'query-complete-spec.mp3');
    
    // Send message
    await client.sendMessage(audioPath, 1);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get and print state
    const state = await client.getSessionState();
    client.printSessionState(state);

    // End session
    await client.endSession();

    console.log('✅ Test Scenario 1 completed successfully!\n');
  } catch (error) {
    console.error('❌ Test Scenario 1 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 2: Multi-turn conversation with specification gathering
 */
async function testMultiTurnConversation() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  TEST SCENARIO 2: Multi-turn Conversation        ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const client = new VoiceAgentTestClient();

  try {
    // Start session
    await client.startSession();

    // Turn 1: Initial vague query
    console.log('--- Turn 1: Initial Query ---');
    let query = "I want to buy a laptop";
    let audioPath = await client.textToSpeech(query, 'query-turn1.mp3');
    await client.sendMessage(audioPath, 1);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Turn 2: Provide brand
    console.log('--- Turn 2: Specify Brand ---');
    query = "I'm looking for a MacBook";
    audioPath = await client.textToSpeech(query, 'query-turn2.mp3');
    await client.sendMessage(audioPath, 2);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Turn 3: Provide model
    console.log('--- Turn 3: Specify Model ---');
    query = "MacBook Pro 14 inch";
    audioPath = await client.textToSpeech(query, 'query-turn3.mp3');
    await client.sendMessage(audioPath, 3);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Turn 4: Provide chip
    console.log('--- Turn 4: Specify Chip ---');
    query = "M3 Pro chip";
    audioPath = await client.textToSpeech(query, 'query-turn4.mp3');
    await client.sendMessage(audioPath, 4);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Turn 5: Provide RAM
    console.log('--- Turn 5: Specify RAM ---');
    query = "18GB RAM";
    audioPath = await client.textToSpeech(query, 'query-turn5.mp3');
    await client.sendMessage(audioPath, 5);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Turn 6: Provide storage
    console.log('--- Turn 6: Specify Storage ---');
    query = "512GB storage";
    audioPath = await client.textToSpeech(query, 'query-turn6.mp3');
    await client.sendMessage(audioPath, 6);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get final state
    const state = await client.getSessionState();
    client.printSessionState(state);

    // End session
    await client.endSession();

    console.log('✅ Test Scenario 2 completed successfully!\n');
  } catch (error) {
    console.error('❌ Test Scenario 2 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 3: Different product category (Phone)
 */
async function testPhoneSearch() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  TEST SCENARIO 3: Phone Search                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const client = new VoiceAgentTestClient();

  try {
    await client.startSession();

    const query = "Find me the best price for iPhone 15 Pro 256GB in Natural Titanium";
    const audioPath = await client.textToSpeech(query, 'query-phone.mp3');
    await client.sendMessage(audioPath, 1);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const state = await client.getSessionState();
    client.printSessionState(state);

    await client.endSession();

    console.log('✅ Test Scenario 3 completed successfully!\n');
  } catch (error) {
    console.error('❌ Test Scenario 3 failed:', error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║                                                   ║');
  console.log('║   Voice Price Comparison Agent Test Suite        ║');
  console.log('║                                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('⚙️  Configuration:');
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   API Key: ${API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   ElevenLabs Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('\n');

  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY is required for this test client.');
    console.error('   Set it in your .env file or environment variables.');
    process.exit(1);
  }

  try {
    // Run test scenarios
    await testCompleteSpecification();
    await testMultiTurnConversation();
    await testPhoneSearch();

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║   ✅ All tests completed successfully!            ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error) {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║   ❌ Tests failed!                                ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('\n');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  console.log('\n📝 Note: Make sure the API server is running before executing tests.');
  console.log('   Start the server with: npm run dev\n');
  
  runAllTests().catch(console.error);
}

export { VoiceAgentTestClient, testCompleteSpecification, testMultiTurnConversation, testPhoneSearch };
