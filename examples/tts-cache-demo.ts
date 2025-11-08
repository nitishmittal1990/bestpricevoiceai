import { TTSService } from '../src/services/TTSService';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Demo script to showcase TTS caching functionality
 * 
 * This script demonstrates:
 * 1. Basic TTS synthesis with automatic caching
 * 2. Cache hit performance improvement
 * 3. Pre-warming cache with common phrases
 * 4. Cache statistics and monitoring
 */
async function main() {
  console.log('🎤 TTS Cache Demo\n');

  // Initialize TTS service with caching enabled
  const ttsService = new TTSService(true, 50, 24 * 60 * 60 * 1000); // 50 entries, 24h TTL

  // Test 1: First synthesis (cache miss)
  console.log('Test 1: First synthesis (cache miss)');
  const text1 = 'Hello! I am your shopping assistant.';
  const start1 = Date.now();
  const audio1 = await ttsService.synthesize(text1);
  const duration1 = Date.now() - start1;
  console.log(`  ✓ Synthesized in ${duration1}ms`);
  console.log(`  Audio size: ${audio1.data.length} bytes\n`);

  // Test 2: Same text again (cache hit)
  console.log('Test 2: Same text again (cache hit)');
  const start2 = Date.now();
  const audio2 = await ttsService.synthesize(text1);
  const duration2 = Date.now() - start2;
  console.log(`  ✓ Retrieved from cache in ${duration2}ms`);
  console.log(`  Speed improvement: ${Math.round((duration1 / duration2) * 100) / 100}x faster\n`);

  // Test 3: Different text (cache miss)
  console.log('Test 3: Different text (cache miss)');
  const text2 = 'I found the best prices for you.';
  const start3 = Date.now();
  await ttsService.synthesize(text2);
  const duration3 = Date.now() - start3;
  console.log(`  ✓ Synthesized in ${duration3}ms\n`);

  // Test 4: Cache statistics
  console.log('Test 4: Cache statistics');
  const stats = ttsService.getCacheStats();
  console.log(`  Cache hits: ${stats.hits}`);
  console.log(`  Cache misses: ${stats.misses}`);
  console.log(`  Hit rate: ${stats.hitRate}%`);
  console.log(`  Cache size: ${stats.size} entries`);
  console.log(`  Memory usage: ${Math.round(ttsService.getCacheMemoryUsage() / 1024)} KB\n`);

  // Test 5: Pre-warming cache
  console.log('Test 5: Pre-warming cache with common phrases');
  const prewarmStart = Date.now();
  const warmed = await ttsService.prewarmCache();
  const prewarmDuration = Date.now() - prewarmStart;
  console.log(`  ✓ Pre-warmed ${warmed} phrases in ${prewarmDuration}ms`);

  const statsAfterPrewarm = ttsService.getCacheStats();
  console.log(`  Cache size after pre-warming: ${statsAfterPrewarm.size} entries\n`);

  // Test 6: Using pre-warmed cache
  console.log('Test 6: Using pre-warmed cache');
  const commonPhrase = 'Could you please repeat that?';
  const start4 = Date.now();
  await ttsService.synthesize(commonPhrase);
  const duration4 = Date.now() - start4;
  console.log(`  ✓ Retrieved common phrase in ${duration4}ms (from pre-warmed cache)\n`);

  // Test 7: Cache invalidation
  console.log('Test 7: Cache invalidation');
  const invalidated = ttsService.invalidateCache(text1);
  console.log(`  ✓ Invalidated cache entry: ${invalidated}`);
  
  const statsAfterInvalidation = ttsService.getCacheStats();
  console.log(`  Cache size after invalidation: ${statsAfterInvalidation.size} entries\n`);

  // Test 8: Different voices (separate cache entries)
  console.log('Test 8: Different voices create separate cache entries');
  const text3 = 'Testing different voices';
  await ttsService.synthesize(text3, { voice: 'voice1' });
  await ttsService.synthesize(text3, { voice: 'voice2' });
  
  const statsAfterVoices = ttsService.getCacheStats();
  console.log(`  ✓ Cached same text with 2 different voices`);
  console.log(`  Cache size: ${statsAfterVoices.size} entries\n`);

  // Final statistics
  console.log('Final Cache Statistics:');
  const finalStats = ttsService.getCacheStats();
  console.log(`  Total hits: ${finalStats.hits}`);
  console.log(`  Total misses: ${finalStats.misses}`);
  console.log(`  Overall hit rate: ${finalStats.hitRate}%`);
  console.log(`  Cache entries: ${finalStats.size}`);
  console.log(`  Memory usage: ${Math.round(ttsService.getCacheMemoryUsage() / 1024)} KB`);

  // Save a sample audio file
  console.log('\n💾 Saving sample audio file...');
  const sampleText = 'The lowest price is rupees 1,99,900 on Flipkart.';
  const sampleAudio = await ttsService.synthesize(sampleText);
  const outputPath = join(__dirname, 'tts-cache-demo-output.mp3');
  writeFileSync(outputPath, sampleAudio.data);
  console.log(`  ✓ Saved to: ${outputPath}`);

  console.log('\n✅ Demo completed successfully!');
}

main().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
