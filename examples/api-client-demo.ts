/**
 * Example API Client Demo
 * 
 * This demonstrates how to interact with the Voice Price Comparison Agent API
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

// Configure axios with API key if provided
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
});

async function demoApiUsage() {
  try {
    console.log('=== Voice Price Comparison Agent API Demo ===\n');

    // Step 1: Start a new session
    console.log('1. Starting a new session...');
    const startResponse = await apiClient.post('/api/session/start');
    const sessionId = startResponse.data.sessionId;
    console.log(`   Session started: ${sessionId}\n`);

    // Step 2: Send an audio message
    console.log('2. Sending audio message...');
    
    // In a real scenario, you would have an actual audio file
    // For this demo, we'll show how to send it
    const audioFilePath = path.join(__dirname, 'sample-audio.mp3');
    
    if (fs.existsSync(audioFilePath)) {
      const audioBuffer = fs.readFileSync(audioFilePath);
      const formData = new FormData();
      formData.append('audio', new Blob([audioBuffer]), 'audio.mp3');

      const messageResponse = await apiClient.post(
        `/api/session/${sessionId}/message`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'arraybuffer', // Expect audio response
        }
      );

      // Save the audio response
      const responseAudioPath = path.join(__dirname, 'response-audio.mp3');
      fs.writeFileSync(responseAudioPath, Buffer.from(messageResponse.data));
      console.log(`   Audio response saved to: ${responseAudioPath}\n`);
    } else {
      console.log('   (Skipping audio message - sample audio file not found)\n');
    }

    // Step 3: Get session state
    console.log('3. Getting session state...');
    const stateResponse = await apiClient.get(`/api/session/${sessionId}/state`);
    console.log('   Session state:', JSON.stringify(stateResponse.data.state, null, 2));
    console.log();

    // Step 4: End the session
    console.log('4. Ending session...');
    await apiClient.delete(`/api/session/${sessionId}`);
    console.log('   Session ended successfully\n');

    console.log('=== Demo completed successfully ===');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

// Example: Using the API with curl commands
function printCurlExamples() {
  console.log('\n=== Curl Examples ===\n');

  console.log('1. Start a session:');
  console.log(`curl -X POST ${API_BASE_URL}/api/session/start \\`);
  if (API_KEY) {
    console.log(`  -H "Authorization: Bearer ${API_KEY}" \\`);
  }
  console.log('  -H "Content-Type: application/json"\n');

  console.log('2. Send audio message:');
  console.log(`curl -X POST ${API_BASE_URL}/api/session/{SESSION_ID}/message \\`);
  if (API_KEY) {
    console.log(`  -H "Authorization: Bearer ${API_KEY}" \\`);
  }
  console.log('  -F "audio=@path/to/audio.mp3" \\');
  console.log('  --output response.mp3\n');

  console.log('3. Get session state:');
  console.log(`curl -X GET ${API_BASE_URL}/api/session/{SESSION_ID}/state \\`);
  if (API_KEY) {
    console.log(`  -H "Authorization: Bearer ${API_KEY}"`);
  }
  console.log();

  console.log('4. End session:');
  console.log(`curl -X DELETE ${API_BASE_URL}/api/session/{SESSION_ID} \\`);
  if (API_KEY) {
    console.log(`  -H "Authorization: Bearer ${API_KEY}"`);
  }
  console.log();
}

// Run the demo
if (require.main === module) {
  console.log('Note: Make sure the API server is running before executing this demo.\n');
  console.log('Start the server with: npm run dev\n');
  
  printCurlExamples();
  
  // Uncomment to run the actual demo
  // demoApiUsage();
}

export { demoApiUsage, printCurlExamples };
