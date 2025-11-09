/**
 * Generate Sample Audio Files
 * 
 * This script generates sample audio files for testing the Voice Price Comparison Agent.
 * It uses ElevenLabs TTS to create realistic voice queries.
 */

import { ElevenLabsClient } from 'elevenlabs';
import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY is required');
  console.error('   Set it in your .env file or environment variables');
  process.exit(1);
}

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Sample queries for different scenarios
const sampleQueries = [
  {
    filename: 'sample-laptop-complete.mp3',
    text: 'Find me the cheapest MacBook Pro 14 inch with M3 Pro chip, 18GB RAM, and 512GB storage',
    description: 'Complete laptop specification',
  },
  {
    filename: 'sample-laptop-vague.mp3',
    text: 'I want to buy a laptop',
    description: 'Vague laptop query',
  },
  {
    filename: 'sample-phone-complete.mp3',
    text: 'Find me the best price for iPhone 15 Pro 256GB in Natural Titanium',
    description: 'Complete phone specification',
  },
  {
    filename: 'sample-phone-partial.mp3',
    text: 'I need an iPhone 15',
    description: 'Partial phone specification',
  },
  {
    filename: 'sample-headphones.mp3',
    text: 'Show me prices for Sony WH-1000XM5 wireless headphones in black',
    description: 'Headphones query',
  },
  {
    filename: 'sample-followup-brand.mp3',
    text: 'Apple MacBook',
    description: 'Follow-up: brand specification',
  },
  {
    filename: 'sample-followup-model.mp3',
    text: 'MacBook Pro 14 inch',
    description: 'Follow-up: model specification',
  },
  {
    filename: 'sample-followup-ram.mp3',
    text: '18GB RAM',
    description: 'Follow-up: RAM specification',
  },
  {
    filename: 'sample-followup-storage.mp3',
    text: '512GB storage',
    description: 'Follow-up: storage specification',
  },
  {
    filename: 'sample-goodbye.mp3',
    text: 'Thank you, goodbye',
    description: 'Exit conversation',
  },
];

async function generateAudioFile(text: string, filename: string): Promise<void> {
  console.log(`🎤 Generating: ${filename}`);
  console.log(`   Text: "${text}"`);

  try {
    const audio = await client.textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
      text,
      model_id: 'eleven_multilingual_v2',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    const outputDir = path.join(__dirname, 'sample-audio');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, audioBuffer);
    
    console.log(`✅ Saved: ${filepath}\n`);
  } catch (error) {
    console.error(`❌ Failed to generate ${filename}:`, error);
    throw error;
  }
}

async function generateAllSamples() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Sample Audio Generator                         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log(`📁 Output directory: examples/sample-audio/\n`);

  for (const sample of sampleQueries) {
    console.log(`📝 ${sample.description}`);
    await generateAudioFile(sample.text, sample.filename);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   ✅ All sample audio files generated!           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log('📂 Sample files created:');
  sampleQueries.forEach(sample => {
    console.log(`   - ${sample.filename}`);
  });
  console.log('\n💡 Use these files with the test clients or API endpoints.\n');
}

if (require.main === module) {
  generateAllSamples().catch(error => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });
}

export { generateAudioFile, generateAllSamples };
