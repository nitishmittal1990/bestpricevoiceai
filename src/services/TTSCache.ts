import { AudioBuffer } from './TTSService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Cache entry for TTS responses
 */
interface CacheEntry {
  audioBuffer: AudioBuffer;
  timestamp: number;
  hitCount: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * TTS Response Cache
 * Caches frequently used TTS responses to reduce API calls and improve latency
 */
export class TTSCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  // Common phrases that should be cached
  private readonly COMMON_PHRASES = [
    'Hello! I am your shopping assistant.',
    'I can help you find the best prices for products.',
    'Could you please repeat that?',
    'Let me search for that.',
    'I found the best prices for you.',
    'Would you like me to search for another product?',
    'Thank you for using our service.',
    'Goodbye!',
    'I did not understand that. Could you please try again?',
    'Please wait while I search.',
  ];

  constructor(maxSize: number = 100, ttlMs: number = 24 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs; // Default: 24 hours

    logger.info('TTSCache initialized', {
      maxSize: this.maxSize,
      ttlHours: this.ttlMs / (60 * 60 * 1000),
    });
  }

  /**
   * Generate cache key from text and options
   * @param text - Text to synthesize
   * @param voice - Voice ID
   * @param format - Audio format
   * @returns Cache key
   */
  private generateKey(text: string, voice?: string, format?: string): string {
    const normalizedText = text.trim().toLowerCase();
    const keyString = `${normalizedText}:${voice || 'default'}:${format || 'mp3'}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Get cached audio buffer if available
   * @param text - Text to synthesize
   * @param voice - Voice ID
   * @param format - Audio format
   * @returns Cached audio buffer or null
   */
  get(text: string, voice?: string, format?: string): AudioBuffer | null {
    const key = this.generateKey(text, voice, format);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      logger.debug('Cache miss', { text: text.substring(0, 50) });
      return null;
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      logger.debug('Cache entry expired', {
        text: text.substring(0, 50),
        ageHours: age / (60 * 60 * 1000),
      });
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    this.hits++;

    logger.debug('Cache hit', {
      text: text.substring(0, 50),
      hitCount: entry.hitCount,
    });

    return entry.audioBuffer;
  }

  /**
   * Store audio buffer in cache
   * @param text - Text that was synthesized
   * @param audioBuffer - Synthesized audio buffer
   * @param voice - Voice ID used
   * @param format - Audio format used
   */
  set(text: string, audioBuffer: AudioBuffer, voice?: string, format?: string): void {
    const key = this.generateKey(text, voice, format);

    // Check if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry = {
      audioBuffer,
      timestamp: Date.now(),
      hitCount: 0,
    };

    this.cache.set(key, entry);

    logger.debug('Cache entry stored', {
      text: text.substring(0, 50),
      audioSize: audioBuffer.data.length,
    });
  }

  /**
   * Evict least recently used entry when cache is full
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastHitCount = Infinity;
    let oldestTimestamp = Infinity;

    // Find entry with lowest hit count, or oldest if tied
    for (const [key, entry] of this.cache.entries()) {
      if (
        entry.hitCount < leastHitCount ||
        (entry.hitCount === leastHitCount && entry.timestamp < oldestTimestamp)
      ) {
        leastUsedKey = key;
        leastHitCount = entry.hitCount;
        oldestTimestamp = entry.timestamp;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      logger.debug('Cache entry evicted', {
        hitCount: leastHitCount,
      });
    }
  }

  /**
   * Clear all expired entries from cache
   * @returns Number of entries removed
   */
  clearExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('Cleared expired cache entries', { count: removed });
    }

    return removed;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Invalidate specific cache entry
   * @param text - Text to invalidate
   * @param voice - Voice ID
   * @param format - Audio format
   * @returns True if entry was found and removed
   */
  invalidate(text: string, voice?: string, format?: string): boolean {
    const key = this.generateKey(text, voice, format);
    const existed = this.cache.has(key);

    if (existed) {
      this.cache.delete(key);
      logger.debug('Cache entry invalidated', {
        text: text.substring(0, 50),
      });
    }

    return existed;
  }

  /**
   * Invalidate all entries matching a pattern
   * @param pattern - Regular expression pattern to match text
   * @returns Number of entries invalidated
   */
  invalidatePattern(pattern: RegExp): number {
    let removed = 0;

    // We need to reconstruct text from keys, which is not ideal
    // For now, we'll clear all entries when pattern invalidation is needed
    // In production, consider storing text alongside entries
    logger.warn('Pattern invalidation clears entire cache', {
      pattern: pattern.toString(),
    });

    this.clear();
    removed = this.cache.size;

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
    };
  }

  /**
   * Check if a phrase is commonly used and should be cached
   * @param text - Text to check
   * @returns True if text matches common phrases
   */
  isCommonPhrase(text: string): boolean {
    const normalizedText = text.trim().toLowerCase();

    return this.COMMON_PHRASES.some(phrase => {
      const normalizedPhrase = phrase.toLowerCase();
      return (
        normalizedText === normalizedPhrase ||
        normalizedText.includes(normalizedPhrase) ||
        normalizedPhrase.includes(normalizedText)
      );
    });
  }

  /**
   * Pre-warm cache with common phrases
   * Should be called with a TTS service instance after initialization
   * @param synthesizeFunc - Function to synthesize text
   * @param voice - Voice ID to use
   * @param format - Audio format to use
   */
  async prewarm(
    synthesizeFunc: (text: string, voice?: string, format?: string) => Promise<AudioBuffer>,
    voice?: string,
    format?: string
  ): Promise<number> {
    logger.info('Pre-warming cache with common phrases', {
      phraseCount: this.COMMON_PHRASES.length,
    });

    let warmed = 0;

    for (const phrase of this.COMMON_PHRASES) {
      try {
        const audioBuffer = await synthesizeFunc(phrase, voice, format);
        this.set(phrase, audioBuffer, voice, format);
        warmed++;
      } catch (error) {
        logger.warn('Failed to pre-warm cache entry', {
          phrase: phrase.substring(0, 50),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Cache pre-warming completed', {
      warmed,
      total: this.COMMON_PHRASES.length,
    });

    return warmed;
  }

  /**
   * Get memory usage estimate in bytes
   * @returns Estimated memory usage
   */
  getMemoryUsage(): number {
    let totalBytes = 0;

    for (const entry of this.cache.values()) {
      totalBytes += entry.audioBuffer.data.length;
    }

    return totalBytes;
  }
}
