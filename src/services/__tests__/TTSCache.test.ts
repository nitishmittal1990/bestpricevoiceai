import { TTSCache } from '../TTSCache';
import { AudioBuffer } from '../TTSService';

describe('TTSCache', () => {
  let cache: TTSCache;

  beforeEach(() => {
    cache = new TTSCache(5, 1000); // Small cache with 1 second TTL for testing
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic caching operations', () => {
    it('should store and retrieve audio buffer', () => {
      const text = 'Hello world';
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set(text, audioBuffer);
      const retrieved = cache.get(text);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.data.toString()).toBe('audio data');
      expect(retrieved?.format).toBe('mp3');
    });

    it('should return null for cache miss', () => {
      const retrieved = cache.get('non-existent text');
      expect(retrieved).toBeNull();
    });

    it('should differentiate between different voices', () => {
      const text = 'Hello';
      const audioBuffer1: AudioBuffer = {
        data: Buffer.from('voice1'),
        format: 'mp3',
        duration: 100,
      };
      const audioBuffer2: AudioBuffer = {
        data: Buffer.from('voice2'),
        format: 'mp3',
        duration: 100,
      };

      cache.set(text, audioBuffer1, 'voice1');
      cache.set(text, audioBuffer2, 'voice2');

      const retrieved1 = cache.get(text, 'voice1');
      const retrieved2 = cache.get(text, 'voice2');

      expect(retrieved1?.data.toString()).toBe('voice1');
      expect(retrieved2?.data.toString()).toBe('voice2');
    });

    it('should differentiate between different formats', () => {
      const text = 'Hello';
      const audioBuffer1: AudioBuffer = {
        data: Buffer.from('mp3 data'),
        format: 'mp3',
        duration: 100,
      };
      const audioBuffer2: AudioBuffer = {
        data: Buffer.from('wav data'),
        format: 'wav',
        duration: 100,
      };

      cache.set(text, audioBuffer1, undefined, 'mp3');
      cache.set(text, audioBuffer2, undefined, 'wav');

      const retrieved1 = cache.get(text, undefined, 'mp3');
      const retrieved2 = cache.get(text, undefined, 'wav');

      expect(retrieved1?.data.toString()).toBe('mp3 data');
      expect(retrieved2?.data.toString()).toBe('wav data');
    });
  });

  describe('Cache expiration', () => {
    it('should expire entries after TTL', async () => {
      const text = 'Expiring text';
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set(text, audioBuffer);

      // Should be available immediately
      expect(cache.get(text)).not.toBeNull();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get(text)).toBeNull();
    });

    it('should clear expired entries', async () => {
      const text1 = 'Text 1';
      const text2 = 'Text 2';
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set(text1, audioBuffer);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 600));

      cache.set(text2, audioBuffer);

      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 600));

      const removed = cache.clearExpired();

      expect(removed).toBe(1);
      expect(cache.get(text1)).toBeNull();
      expect(cache.get(text2)).not.toBeNull();
    });
  });

  describe('Cache eviction', () => {
    it('should evict least used entry when cache is full', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      // Fill cache to max size (5)
      for (let i = 0; i < 5; i++) {
        cache.set(`text${i}`, audioBuffer);
      }

      // Access some entries to increase hit count
      cache.get('text1');
      cache.get('text1');
      cache.get('text2');

      // Add new entry, should evict text0 (least used)
      cache.set('text5', audioBuffer);

      expect(cache.get('text0')).toBeNull();
      expect(cache.get('text1')).not.toBeNull();
      expect(cache.get('text5')).not.toBeNull();
    });
  });

  describe('Cache statistics', () => {
    it('should track hits and misses', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set('text1', audioBuffer);

      cache.get('text1'); // hit
      cache.get('text1'); // hit
      cache.get('text2'); // miss
      cache.get('text3'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
      expect(stats.size).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set('text1', audioBuffer);

      for (let i = 0; i < 7; i++) {
        cache.get('text1'); // 7 hits
      }

      for (let i = 0; i < 3; i++) {
        cache.get('nonexistent'); // 3 misses
      }

      const stats = cache.getStats();

      expect(stats.hitRate).toBe(70); // 7/10 = 70%
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate specific entry', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set('text1', audioBuffer);
      cache.set('text2', audioBuffer);

      const invalidated = cache.invalidate('text1');

      expect(invalidated).toBe(true);
      expect(cache.get('text1')).toBeNull();
      expect(cache.get('text2')).not.toBeNull();
    });

    it('should return false when invalidating non-existent entry', () => {
      const invalidated = cache.invalidate('nonexistent');
      expect(invalidated).toBe(false);
    });

    it('should clear all entries', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set('text1', audioBuffer);
      cache.set('text2', audioBuffer);

      cache.clear();

      expect(cache.get('text1')).toBeNull();
      expect(cache.get('text2')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('Common phrases', () => {
    it('should identify common phrases', () => {
      expect(cache.isCommonPhrase('Hello! I am your shopping assistant.')).toBe(true);
      expect(cache.isCommonPhrase('Could you please repeat that?')).toBe(true);
      expect(cache.isCommonPhrase('This is a unique phrase')).toBe(false);
    });

    it('should match common phrases case-insensitively', () => {
      expect(cache.isCommonPhrase('HELLO! I AM YOUR SHOPPING ASSISTANT.')).toBe(true);
      expect(cache.isCommonPhrase('could you please repeat that?')).toBe(true);
    });

    it('should match partial common phrases', () => {
      expect(cache.isCommonPhrase('I am your shopping assistant')).toBe(true);
      expect(cache.isCommonPhrase('please repeat that')).toBe(true);
    });
  });

  describe('Pre-warming', () => {
    it('should pre-warm cache with common phrases', async () => {
      const mockSynthesize = jest.fn(async (text: string) => ({
        data: Buffer.from(`audio for ${text}`),
        format: 'mp3',
        duration: 100,
      }));

      const warmed = await cache.prewarm(mockSynthesize);

      expect(warmed).toBeGreaterThan(0);
      expect(mockSynthesize).toHaveBeenCalled();

      // Check that some common phrases are now cached
      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle pre-warming failures gracefully', async () => {
      const mockSynthesize = jest.fn(async () => {
        throw new Error('Synthesis failed');
      });

      const warmed = await cache.prewarm(mockSynthesize);

      expect(warmed).toBe(0);
    });
  });

  describe('Memory usage', () => {
    it('should calculate memory usage', () => {
      const audioBuffer1: AudioBuffer = {
        data: Buffer.from('12345'), // 5 bytes
        format: 'mp3',
        duration: 100,
      };
      const audioBuffer2: AudioBuffer = {
        data: Buffer.from('1234567890'), // 10 bytes
        format: 'mp3',
        duration: 100,
      };

      cache.set('text1', audioBuffer1);
      cache.set('text2', audioBuffer2);

      const memoryUsage = cache.getMemoryUsage();

      expect(memoryUsage).toBe(15); // 5 + 10 bytes
    });
  });

  describe('Case sensitivity', () => {
    it('should treat text as case-insensitive for caching', () => {
      const audioBuffer: AudioBuffer = {
        data: Buffer.from('audio data'),
        format: 'mp3',
        duration: 100,
      };

      cache.set('Hello World', audioBuffer);

      const retrieved1 = cache.get('hello world');
      const retrieved2 = cache.get('HELLO WORLD');
      const retrieved3 = cache.get('Hello World');

      expect(retrieved1).not.toBeNull();
      expect(retrieved2).not.toBeNull();
      expect(retrieved3).not.toBeNull();
    });
  });
});
