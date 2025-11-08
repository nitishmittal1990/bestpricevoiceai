# TTS Response Caching Implementation

## Overview

This document describes the TTS response caching implementation for the Voice Price Comparison Agent. The caching layer significantly improves performance and reduces API costs by storing frequently used TTS responses.

## Architecture

### Components

1. **TTSCache** (`src/services/TTSCache.ts`)
   - Standalone cache implementation
   - In-memory storage using Map
   - LRU (Least Recently Used) eviction policy
   - TTL (Time To Live) support for automatic expiration

2. **TTSService Integration** (`src/services/TTSService.ts`)
   - Transparent caching layer
   - Automatic cache lookup before synthesis
   - Automatic cache storage after synthesis
   - Cache management methods

## Features

### 1. Intelligent Caching

- **Case-insensitive matching**: "Hello World" and "hello world" use the same cache entry
- **Voice-aware**: Different voices create separate cache entries
- **Format-aware**: Different audio formats (MP3, WAV, Opus) are cached separately
- **Common phrase detection**: Identifies frequently used phrases for prioritization

### 2. Cache Management

- **Automatic eviction**: LRU policy removes least-used entries when cache is full
- **TTL expiration**: Entries automatically expire after configured time
- **Manual invalidation**: Ability to clear specific entries or entire cache
- **Statistics tracking**: Hit rate, miss rate, cache size, and memory usage

### 3. Pre-warming

- **Startup optimization**: Pre-load common phrases at service initialization
- **Configurable phrases**: List of common phrases can be customized
- **Graceful failure**: Pre-warming failures don't affect service operation

### 4. Performance Monitoring

- **Cache statistics**: Track hits, misses, and hit rate
- **Memory usage**: Monitor cache memory consumption
- **Performance metrics**: Measure cache effectiveness

## Configuration

### Constructor Options

```typescript
const ttsService = new TTSService(
  enableCache: boolean = true,        // Enable/disable caching
  cacheMaxSize: number = 100,         // Maximum cache entries
  cacheTtlMs: number = 86400000       // TTL in milliseconds (default: 24h)
);
```

### Default Settings

- **Max Size**: 100 entries
- **TTL**: 24 hours (86,400,000 ms)
- **Common Phrases**: 10 pre-defined phrases

## Usage Examples

### Basic Usage

```typescript
import { TTSService } from './services/TTSService';

const tts = new TTSService();

// First call - synthesizes and caches
const audio1 = await tts.synthesize('Hello!');

// Second call - retrieved from cache (much faster)
const audio2 = await tts.synthesize('Hello!');
```

### Pre-warming Cache

```typescript
const tts = new TTSService();

// Pre-warm cache at startup
await tts.prewarmCache();

// Now common phrases are instantly available
const audio = await tts.synthesize('Could you please repeat that?');
```

### Cache Management

```typescript
// Get statistics
const stats = tts.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Cache size: ${stats.size} entries`);

// Clear entire cache
tts.clearCache();

// Invalidate specific entry
tts.invalidateCache('specific text');

// Clear only expired entries
const removed = tts.clearExpiredCache();

// Check memory usage
const bytes = tts.getCacheMemoryUsage();
```

## Performance Benefits

### Latency Improvement

- **Cache hit**: < 1ms (memory lookup)
- **Cache miss**: 500-2000ms (API call + synthesis)
- **Improvement**: 100-2000x faster for cached responses

### Cost Reduction

- Reduces ElevenLabs API calls by 30-70% (depending on phrase repetition)
- Typical savings: $0.15-$0.30 per 1000 characters for cached responses

### Common Phrases

The following phrases are pre-cached by default:

1. "Hello! I am your shopping assistant."
2. "I can help you find the best prices for products."
3. "Could you please repeat that?"
4. "Let me search for that."
5. "I found the best prices for you."
6. "Would you like me to search for another product?"
7. "Thank you for using our service."
8. "Goodbye!"
9. "I did not understand that. Could you please try again?"
10. "Please wait while I search."

## Cache Key Generation

Cache keys are generated using MD5 hash of:
- Normalized text (lowercase, trimmed)
- Voice ID (or "default")
- Audio format (or "mp3")

Example:
```
Text: "Hello World"
Voice: "voice123"
Format: "mp3"
Key: md5("hello world:voice123:mp3")
```

## Eviction Policy

When cache reaches max size:

1. Find entry with lowest hit count
2. If multiple entries have same hit count, evict oldest
3. Remove entry and log eviction
4. Add new entry

## Expiration Policy

Entries expire when:
- Age exceeds TTL
- Accessed after expiration (lazy deletion)
- Manual cleanup via `clearExpiredCache()`

## Testing

Comprehensive test coverage includes:

- Basic caching operations (store, retrieve)
- Cache expiration and TTL
- LRU eviction policy
- Statistics tracking
- Cache invalidation
- Pre-warming functionality
- Memory usage calculation
- Case-insensitive matching
- Voice and format differentiation

Run tests:
```bash
npm test -- TTSCache.test.ts
npm test -- TTSService.test.ts
```

## Monitoring

### Key Metrics

1. **Hit Rate**: Percentage of requests served from cache
   - Target: > 40% for production workloads
   - Monitor: `getCacheStats().hitRate`

2. **Cache Size**: Number of entries in cache
   - Monitor: `getCacheStats().size`
   - Alert: If consistently at max size, consider increasing

3. **Memory Usage**: Bytes consumed by cached audio
   - Monitor: `getCacheMemoryUsage()`
   - Typical: 50-500 KB per entry (depending on text length)

4. **Eviction Rate**: How often entries are evicted
   - High rate indicates cache is too small
   - Monitor via logs: "Cache entry evicted"

### Logging

Cache operations are logged at appropriate levels:

- **INFO**: Initialization, pre-warming, clearing
- **DEBUG**: Cache hits, misses, storage, eviction
- **WARN**: Pre-warming failures, pattern invalidation

## Best Practices

1. **Pre-warm at startup**: Call `prewarmCache()` during service initialization
2. **Monitor hit rate**: Aim for > 40% hit rate in production
3. **Adjust cache size**: Increase if eviction rate is high
4. **Set appropriate TTL**: Balance freshness vs. cache effectiveness
5. **Clear on voice changes**: Invalidate cache if default voice changes
6. **Monitor memory**: Watch cache memory usage in production

## Future Enhancements

Potential improvements:

1. **Persistent cache**: Store cache to disk/Redis for persistence across restarts
2. **Distributed cache**: Share cache across multiple service instances
3. **Smart pre-warming**: Analyze usage patterns to pre-warm most-used phrases
4. **Compression**: Compress cached audio to reduce memory usage
5. **Tiered caching**: Hot/warm/cold tiers based on access patterns
6. **Cache warming API**: Endpoint to manually warm cache with custom phrases

## Troubleshooting

### Low Hit Rate

**Symptoms**: Hit rate < 20%
**Causes**:
- Highly dynamic text (prices, product names)
- Cache size too small
- TTL too short

**Solutions**:
- Increase cache size
- Increase TTL
- Pre-warm more phrases
- Consider caching phrase templates

### High Memory Usage

**Symptoms**: Cache consuming > 100 MB
**Causes**:
- Cache size too large
- Long text entries
- Many different voices/formats

**Solutions**:
- Reduce cache size
- Implement compression
- Clear cache periodically
- Limit text length for caching

### Cache Thrashing

**Symptoms**: High eviction rate, low hit rate
**Causes**:
- Cache size too small for workload
- Too many unique phrases

**Solutions**:
- Increase cache size
- Analyze phrase patterns
- Implement phrase normalization
- Consider tiered caching

## References

- [ElevenLabs TTS API Documentation](https://elevenlabs.io/docs)
- [LRU Cache Pattern](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU))
- [TTL Cache Pattern](https://en.wikipedia.org/wiki/Time_to_live)
