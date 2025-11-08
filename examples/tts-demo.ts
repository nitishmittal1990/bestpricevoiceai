/**
 * Demo script for TTSService
 * Shows how to use the Text-to-Speech service with ElevenLabs
 */

import { TTSService } from '../src/services/TTSService';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🎤 TTSService Demo\n');

  // Initialize the service
  const ttsService = new TTSService();

  // Example 1: Basic synthesis
  console.log('1. Basic text synthesis...');
  const basicText = 'Hello! I am your shopping assistant. How can I help you today?';
  const basicResult = await ttsService.synthesize(basicText);
  writeFileSync(join(__dirname, 'output-basic.mp3'), basicResult.data);
  console.log(`✓ Generated audio: ${basicResult.data.length} bytes, ${basicResult.duration}ms\n`);

  // Example 2: Price comparison result with Indian currency
  console.log('2. Price comparison with Indian Rupees...');
  const priceText = 'I found the best prices for you. The lowest price is ₹1,99,900 on Flipkart, followed by ₹2,04,900 on Amazon India, and ₹2,09,900 on Croma.';
  const priceResult = await ttsService.synthesize(priceText);
  writeFileSync(join(__dirname, 'output-price.mp3'), priceResult.data);
  console.log(`✓ Generated audio: ${priceResult.data.length} bytes, ${priceResult.duration}ms\n`);

  // Example 3: WAV format
  console.log('3. Synthesis with WAV format...');
  const wavText = 'This is a test of WAV audio format.';
  const wavResult = await ttsService.synthesize(wavText, { format: 'wav' });
  writeFileSync(join(__dirname, 'output-wav.wav'), wavResult.data);
  console.log(`✓ Generated audio: ${wavResult.data.length} bytes, ${wavResult.duration}ms\n`);

  // Example 4: Get available voices
  console.log('4. Fetching available voices...');
  try {
    const voices = await ttsService.getAvailableVoices();
    console.log(`✓ Found ${voices.length} voices:`);
    voices.slice(0, 5).forEach(voice => {
      console.log(`  - ${voice.name} (${voice.id})`);
    });
    console.log();
  } catch (error) {
    console.log('⚠ Could not fetch voices (API key may be required)\n');
  }

  // Example 5: Test voice
  console.log('5. Testing default voice...');
  const testResult = await ttsService.testVoice();
  writeFileSync(join(__dirname, 'output-test.mp3'), testResult.data);
  console.log(`✓ Generated test audio: ${testResult.data.length} bytes\n`);

  // Example 6: Complex shopping scenario
  console.log('6. Complex shopping scenario...');
  const complexText = `Great! Let me search for the MacBook Pro 14-inch with M3 Pro chip, 18GB RAM, and 512GB storage across multiple platforms. 
  
  I found the best prices for you. The lowest price is ₹1,99,900 on Flipkart, followed by ₹2,04,900 on Amazon India, and ₹2,09,900 on Croma. All three have it in stock. 
  
  Would you like me to search for another product?`;
  const complexResult = await ttsService.synthesize(complexText);
  writeFileSync(join(__dirname, 'output-complex.mp3'), complexResult.data);
  console.log(`✓ Generated audio: ${complexResult.data.length} bytes, ${complexResult.duration}ms\n`);

  console.log('✅ Demo completed! Check the examples/ directory for generated audio files.');
}

// Run the demo
main().catch(error => {
  console.error('❌ Demo failed:', error.message);
  process.exit(1);
});
