import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from '../config';
import { SynthesizeOptions } from '../types';
import { logger } from '../utils/logger';
import { Readable } from 'stream';
import { TTSCache } from './TTSCache';

/**
 * Audio buffer interface for TTS output
 */
export interface AudioBuffer {
  data: Buffer;
  format: string;
  duration: number;
}

/**
 * Text-to-Speech Service using ElevenLabs TTS API
 * Handles text-to-audio conversion with support for multiple voices and formats
 */
export class TTSService {
  private client: ElevenLabsClient;
  private readonly DEFAULT_VOICE_ID: string;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly SUPPORTED_FORMATS = ['mp3', 'wav', 'opus'];
  private cache: TTSCache;
  
  // Indian e-commerce platform names for proper pronunciation
  private readonly PLATFORM_PRONUNCIATIONS: Record<string, string> = {
    'Flipkart': 'Flipkart',
    'Amazon India': 'Amazon India',
    'Myntra': 'Myntra',
    'Meesho': 'Meesho',
    'Instamart': 'Instamart',
    'Blinkit': 'Blinkit',
    'Zepto': 'Zepto',
    'Snapdeal': 'Snapdeal',
    'Tata Cliq': 'Tata Cliq',
    'Croma': 'Croma',
    'Reliance Digital': 'Reliance Digital',
    'Vijay Sales': 'Vijay Sales',
  };

  constructor(enableCache: boolean = true, cacheMaxSize?: number, cacheTtlMs?: number) {
    this.client = new ElevenLabsClient({
      apiKey: config.elevenlabs.apiKey,
    });
    
    // Use configured voice ID or default to a natural Indian English voice
    // ElevenLabs voice IDs for Indian English:
    // - "pNInz6obpgDQGcFmaJgB" (Adam - clear, neutral)
    // - "21m00Tcm4TlvDq8ikWAM" (Rachel - warm, friendly)
    this.DEFAULT_VOICE_ID = config.elevenlabs.defaultVoiceId || 'pNInz6obpgDQGcFmaJgB';
    
    // Initialize cache
    this.cache = new TTSCache(cacheMaxSize, cacheTtlMs);
    
    logger.info('TTSService initialized with ElevenLabs TTS API', {
      voiceId: this.DEFAULT_VOICE_ID,
      model: config.elevenlabs.ttsModel,
      cacheEnabled: enableCache,
    });
  }

  /**
   * Synthesize text to audio
   * @param text - Text to convert to speech
   * @param options - Synthesis options
   * @returns Audio buffer with synthesized speech
   */
  async synthesize(
    text: string,
    options?: SynthesizeOptions
  ): Promise<AudioBuffer> {
    const startTime = Date.now();

    try {
      logger.info('Starting text-to-speech synthesis', {
        textLength: text.length,
        options,
      });

      // Validate input text
      if (!text || text.trim().length === 0) {
        throw new Error('Text is empty or invalid');
      }

      // Validate format
      const format = options?.format || 'mp3';
      if (!this.SUPPORTED_FORMATS.includes(format)) {
        throw new Error(`Unsupported audio format: ${format}. Use mp3, wav, or opus.`);
      }

      // Check cache first
      const cachedAudio = this.cache.get(text, options?.voice, format);
      if (cachedAudio) {
        logger.info('Text-to-speech synthesis served from cache', {
          textLength: text.length,
          audioSize: cachedAudio.data.length,
          duration: Date.now() - startTime,
        });
        return cachedAudio;
      }

      // Preprocess text for better pronunciation
      const processedText = this.preprocessText(text);

      // Synthesize with retry logic
      const audioData = await this.synthesizeWithRetry(
        processedText,
        options
      );

      const duration = Date.now() - startTime;

      const result: AudioBuffer = {
        data: audioData,
        format,
        duration,
      };

      // Cache the result (especially for common phrases)
      this.cache.set(text, result, options?.voice, format);

      logger.info('Text-to-speech synthesis completed successfully', {
        textLength: text.length,
        audioSize: audioData.length,
        duration: result.duration,
        cached: this.cache.isCommonPhrase(text),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Text-to-speech synthesis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid ElevenLabs API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('voice')) {
          throw new Error('Invalid voice ID or voice not available.');
        }
      }

      throw new Error(
        `Text-to-speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Synthesize text with retry logic
   * @param text - Preprocessed text
   * @param options - Synthesis options
   * @returns Audio buffer
   */
  private async synthesizeWithRetry(
    text: string,
    options?: SynthesizeOptions
  ): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        logger.debug(`Synthesis attempt ${attempt}/${this.MAX_RETRIES}`);

        // Call ElevenLabs TTS API
        const audioStream = await this.client.textToSpeech.convert(
          options?.voice || this.DEFAULT_VOICE_ID,
          {
            text,
            modelId: config.elevenlabs.ttsModel,
            voiceSettings: {
              stability: 0.5,
              similarityBoost: 0.75,
              style: 0.0,
              useSpeakerBoost: true,
            },
            outputFormat: this.mapFormatToElevenLabs(options?.format || 'mp3'),
          }
        );

        // Convert stream to buffer
        const audioBuffer = await this.streamToBuffer(audioStream as any);

        logger.debug(`Synthesis successful on attempt ${attempt}`);
        return audioBuffer;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Synthesis attempt ${attempt} failed`, {
          error: lastError.message,
        });

        // Don't retry on certain errors
        if (
          lastError.message.includes('API key') ||
          lastError.message.includes('voice') ||
          lastError.message.includes('invalid')
        ) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.debug(`Waiting ${delay}ms before retry`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Synthesis failed after all retries');
  }

  /**
   * Preprocess text for better pronunciation
   * Handles Indian currency symbols and platform names
   * @param text - Original text
   * @returns Processed text with pronunciation improvements
   */
  private preprocessText(text: string): string {
    let processed = text;

    // Replace Indian Rupee symbol with spoken form
    processed = processed.replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (_match, amount) => {
      // Remove commas from amount for cleaner pronunciation
      const cleanAmount = amount.replace(/,/g, '');
      return `rupees ${cleanAmount}`;
    });

    // Handle platform names for proper pronunciation
    Object.entries(this.PLATFORM_PRONUNCIATIONS).forEach(([platform, pronunciation]) => {
      const regex = new RegExp(platform, 'gi');
      processed = processed.replace(regex, pronunciation);
    });

    // Add pauses for better pacing in long responses
    // Add slight pause after sentences
    processed = processed.replace(/\.\s+/g, '. ');
    
    // Add pause after commas in lists
    processed = processed.replace(/,\s+/g, ', ');

    // Ensure proper spacing around numbers
    processed = processed.replace(/(\d+)([a-zA-Z])/g, '$1 $2');
    processed = processed.replace(/([a-zA-Z])(\d+)/g, '$1 $2');

    return processed.trim();
  }

  /**
   * Map format option to ElevenLabs format string
   * @param format - Format option
   * @returns ElevenLabs format string
   */
  private mapFormatToElevenLabs(format: string): 'mp3_44100_128' | 'pcm_44100' | undefined {
    const formatMap: Record<string, 'mp3_44100_128' | 'pcm_44100'> = {
      'mp3': 'mp3_44100_128',
      'wav': 'pcm_44100',
      'opus': 'mp3_44100_128', // Fallback to mp3 for opus
    };

    return formatMap[format] || 'mp3_44100_128';
  }

  /**
   * Convert readable stream to buffer
   * @param stream - Readable stream
   * @returns Buffer containing all stream data
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get supported audio formats
   * @returns Array of supported format strings
   */
  getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * Get available voices from ElevenLabs
   * @returns List of available voice IDs and names
   */
  async getAvailableVoices(): Promise<Array<{ id: string; name: string }>> {
    try {
      const voices = await this.client.voices.getAll();
      
      return voices.voices.map(voice => ({
        id: voice.voiceId,
        name: voice.name || 'Unknown',
      }));
    } catch (error) {
      logger.error('Failed to fetch available voices', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to fetch available voices');
    }
  }

  /**
   * Test voice synthesis with a sample text
   * Useful for testing voice quality and configuration
   * @param voiceId - Voice ID to test
   * @returns Audio buffer with test synthesis
   */
  async testVoice(voiceId?: string): Promise<AudioBuffer> {
    const testText = 'Hello! I am your shopping assistant. I can help you find the best prices for products across multiple platforms in India.';
    
    return this.synthesize(testText, {
      voice: voiceId || this.DEFAULT_VOICE_ID,
      format: 'mp3',
    });
  }

  /**
   * Pre-warm cache with common phrases
   * Useful to call during service initialization
   * @param voice - Voice ID to use for pre-warming
   * @param format - Audio format to use
   * @returns Number of phrases successfully cached
   */
  async prewarmCache(voice?: string, format?: string): Promise<number> {
    const synthesizeFunc = async (text: string, v?: string, f?: string) => {
      // Bypass cache for pre-warming
      const processedText = this.preprocessText(text);
      const audioData = await this.synthesizeWithRetry(processedText, {
        voice: v,
        format: f as 'mp3' | 'wav' | 'opus',
      });

      return {
        data: audioData,
        format: f || 'mp3',
        duration: 0,
      };
    };

    return this.cache.prewarm(synthesizeFunc, voice || this.DEFAULT_VOICE_ID, format || 'mp3');
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hit rate and size
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   * @returns Number of entries removed
   */
  clearExpiredCache(): number {
    return this.cache.clearExpired();
  }

  /**
   * Invalidate specific cached response
   * @param text - Text to invalidate
   * @param voice - Voice ID
   * @param format - Audio format
   * @returns True if entry was found and removed
   */
  invalidateCache(text: string, voice?: string, format?: string): boolean {
    return this.cache.invalidate(text, voice, format);
  }

  /**
   * Get cache memory usage estimate
   * @returns Memory usage in bytes
   */
  getCacheMemoryUsage(): number {
    return this.cache.getMemoryUsage();
  }
}
