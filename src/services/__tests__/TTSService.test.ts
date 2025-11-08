import { TTSService } from '../TTSService';

// Mock the ElevenLabs client
jest.mock('@elevenlabs/elevenlabs-js', () => {
  return {
    ElevenLabsClient: jest.fn().mockImplementation(() => ({
      textToSpeech: {
        convert: jest.fn().mockResolvedValue({
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('mock audio data');
          },
        }),
      },
      voices: {
        getAll: jest.fn().mockResolvedValue({
          voices: [
            { voiceId: 'voice1', name: 'Test Voice 1' },
            { voiceId: 'voice2', name: 'Test Voice 2' },
          ],
        }),
      },
    })),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TTSService', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    jest.clearAllMocks();
    ttsService = new TTSService();
  });

  describe('synthesize', () => {
    it('should synthesize text to audio successfully', async () => {
      const text = 'Hello, this is a test';
      const result = await ttsService.synthesize(text);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.format).toBe('mp3');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for empty text', async () => {
      await expect(ttsService.synthesize('')).rejects.toThrow('Text is empty or invalid');
    });

    it('should handle custom format option', async () => {
      const text = 'Test with custom format';
      const result = await ttsService.synthesize(text, { format: 'wav' });

      expect(result.format).toBe('wav');
    });

    it('should throw error for unsupported format', async () => {
      const text = 'Test with invalid format';
      await expect(
        ttsService.synthesize(text, { format: 'invalid' as any })
      ).rejects.toThrow('Unsupported audio format');
    });

    it('should preprocess Indian currency correctly', async () => {
      const text = 'The price is ₹1,99,900';
      const result = await ttsService.synthesize(text);

      expect(result).toBeDefined();
      // The preprocessing should convert ₹1,99,900 to "rupees 199900"
    });

    it('should handle platform names correctly', async () => {
      const text = 'Available on Flipkart and Amazon India';
      const result = await ttsService.synthesize(text);

      expect(result).toBeDefined();
    });
  });

  describe('getAvailableVoices', () => {
    it('should fetch available voices', async () => {
      const voices = await ttsService.getAvailableVoices();

      expect(voices).toHaveLength(2);
      expect(voices[0]).toEqual({ id: 'voice1', name: 'Test Voice 1' });
      expect(voices[1]).toEqual({ id: 'voice2', name: 'Test Voice 2' });
    });
  });

  describe('testVoice', () => {
    it('should test voice with sample text', async () => {
      const result = await ttsService.testVoice();

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should test specific voice ID', async () => {
      const result = await ttsService.testVoice('custom-voice-id');

      expect(result).toBeDefined();
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = ttsService.getSupportedFormats();

      expect(formats).toEqual(['mp3', 'wav', 'opus']);
    });
  });

  describe('caching', () => {
    it('should cache synthesized audio', async () => {
      const text = 'Hello world';

      // First call - should synthesize
      const result1 = await ttsService.synthesize(text);

      // Second call - should use cache
      const result2 = await ttsService.synthesize(text);

      expect(result1.data.toString()).toBe(result2.data.toString());

      const stats = ttsService.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should cache different voices separately', async () => {
      const text = 'Hello';

      await ttsService.synthesize(text, { voice: 'voice1' });
      await ttsService.synthesize(text, { voice: 'voice2' });

      const stats = ttsService.getCacheStats();
      expect(stats.size).toBe(2);
    });

    it('should clear cache', async () => {
      await ttsService.synthesize('Test 1');
      await ttsService.synthesize('Test 2');

      ttsService.clearCache();

      const stats = ttsService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate specific cache entry', async () => {
      const text = 'Test text';

      await ttsService.synthesize(text);
      const invalidated = ttsService.invalidateCache(text);

      expect(invalidated).toBe(true);

      const stats = ttsService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear expired cache entries', async () => {
      // Create service with very short TTL for testing
      const shortTtlService = new TTSService(true, 100, 100);

      await shortTtlService.synthesize('Test');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = shortTtlService.clearExpiredCache();
      expect(removed).toBe(1);
    });

    it('should report cache memory usage', async () => {
      await ttsService.synthesize('Test 1');
      await ttsService.synthesize('Test 2');

      const memoryUsage = ttsService.getCacheMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
    });

    it('should get cache statistics', async () => {
      await ttsService.synthesize('Test 1');
      await ttsService.synthesize('Test 1'); // cache hit
      await ttsService.synthesize('Test 2');

      const stats = ttsService.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('prewarmCache', () => {
    it('should pre-warm cache with common phrases', async () => {
      const warmed = await ttsService.prewarmCache();

      expect(warmed).toBeGreaterThan(0);

      const stats = ttsService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should use specified voice and format for pre-warming', async () => {
      const warmed = await ttsService.prewarmCache('custom-voice', 'wav');

      expect(warmed).toBeGreaterThan(0);
    });
  });
});
