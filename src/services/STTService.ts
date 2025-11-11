import OpenAI from 'openai';
import { config } from '../config';
import { TranscribeOptions, TranscriptionResult } from '../types';
import { logger, logApiCall, logApiResponse, PerformanceTimer } from '../utils/logger';
import { Readable } from 'stream';
import { File } from 'buffer';

/**
 * Speech-to-Text Service using OpenAI Whisper API
 * Handles audio transcription with support for multiple formats
 */
export class STTService {
  private client: OpenAI;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.7;
  private readonly SUPPORTED_FORMATS = ['wav', 'mp3', 'webm', 'ogg', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga'];

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.llm.apiKey,
    });
    logger.info('STTService initialized with OpenAI Whisper API');
  }

  /**
   * Transcribe audio buffer to text
   * @param audioBuffer - Audio data as Buffer
   * @param options - Transcription options
   * @returns Transcription result with text, confidence, and metadata
   */
  async transcribe(
    audioBuffer: Buffer,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult> {
    const timer = new PerformanceTimer('STT.transcribe', undefined, {
      bufferSize: audioBuffer.length,
    });

    try {
      logApiCall('ElevenLabs STT', 'transcribe', {
        bufferSize: audioBuffer.length,
        options,
      });

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty or invalid');
      }

      // Detect audio format from buffer
      const format = this.detectAudioFormat(audioBuffer);
      logger.info(`Detected audio format: ${format}`);

      // Validate format is supported
      if (format === 'unknown') {
        throw new Error('Unsupported audio format. Please use WAV, MP3, WebM, OGG, FLAC, M4A, MP4, MPEG, or MPGA.');
      }

      // Convert buffer to readable stream for ElevenLabs API
      const audioStream = Readable.from(audioBuffer);

      // Call ElevenLabs Speech-to-Text API
      const response = await this.client.speechToText.convert({
        file: audioStream,
        modelId: options?.model || 'scribe_v1',
        languageCode: options?.language,
        enableLogging: false,
      });

      // Handle response - ElevenLabs returns different response types
      // For synchronous requests, we get SpeechToTextChunkResponseModel
      let text = '';
      let languageCode = options?.language || 'en';
      let confidence = 0.85; // Default confidence

      if ('text' in response && typeof response.text === 'string') {
        text = response.text;
        if ('languageCode' in response) {
          languageCode = response.languageCode as string;
        }
        if ('languageProbability' in response && typeof response.languageProbability === 'number') {
          confidence = response.languageProbability;
        }
      } else {
        throw new Error('Unexpected response format from ElevenLabs API');
      }
      
      if (!text || text.trim().length === 0) {
        logger.warn('Transcription returned empty text');
        throw new Error('No speech detected in audio');
      }

      // Enhance confidence score with quality indicators
      const enhancedConfidence = this.enhanceConfidence(confidence, text, audioBuffer.length);

      const duration = timer.end();

      const result: TranscriptionResult = {
        text: text.trim(),
        confidence: enhancedConfidence,
        language: languageCode,
        duration,
      };

      logApiResponse('ElevenLabs STT', 'transcribe', true, duration);
      logger.info('Transcription completed successfully', {
        textLength: result.text.length,
        confidence: result.confidence,
        duration: result.duration,
      });

      // Check if confidence is below threshold
      if (confidence < this.MIN_CONFIDENCE_THRESHOLD) {
        logger.warn('Transcription confidence below threshold', {
          confidence,
          threshold: this.MIN_CONFIDENCE_THRESHOLD,
        });
      }

      return result;
    } catch (error) {
      const duration = timer.end();
      logApiResponse(
        'ElevenLabs STT',
        'transcribe',
        false,
        duration,
        error instanceof Error ? error : new Error('Unknown error')
      );

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid ElevenLabs API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('audio format')) {
          throw new Error('Unsupported audio format. Please use WAV, MP3, or WebM.');
        }
      }

      throw new Error(`Speech-to-text transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Detect audio format from buffer magic bytes
   * @param buffer - Audio buffer
   * @returns Detected format or 'unknown'
   */
  private detectAudioFormat(buffer: Buffer): string {
    if (buffer.length < 12) {
      return 'unknown';
    }

    // Check magic bytes for common audio formats
    const header = buffer.slice(0, 12);

    // WAV format (RIFF....WAVE)
    if (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x41 &&
      header[10] === 0x56 &&
      header[11] === 0x45
    ) {
      return 'wav';
    }

    // MP3 format (ID3 or 0xFF 0xFB)
    if (
      (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
    ) {
      return 'mp3';
    }

    // WebM format
    if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
      return 'webm';
    }

    // OGG format
    if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
      return 'ogg';
    }

    // FLAC format
    if (header[0] === 0x66 && header[1] === 0x4c && header[2] === 0x61 && header[3] === 0x43) {
      return 'flac';
    }

    // M4A/MP4 format (ftyp)
    if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
      // Check for M4A or MP4 specific markers
      if (header[8] === 0x4d && header[9] === 0x34 && header[10] === 0x41) {
        return 'm4a';
      }
      return 'mp4';
    }

    // MPEG format
    if ((header[0] === 0xff && (header[1] & 0xf0) === 0xf0)) {
      return 'mpeg';
    }

    return 'unknown';
  }

  /**
   * Enhance confidence score with quality indicators
   * ElevenLabs provides languageProbability, but we can enhance it with text quality checks
   * @param baseConfidence - Base confidence from API
   * @param text - Transcribed text
   * @param audioLength - Length of audio buffer
   * @returns Enhanced confidence score between 0 and 1
   */
  private enhanceConfidence(baseConfidence: number, text: string, audioLength: number): number {
    let confidence = baseConfidence;

    // Reduce confidence for very short text (likely incomplete)
    if (text.length < 10) {
      confidence *= 0.85;
    }

    // Reduce confidence for very long text from short audio (likely noise)
    const textToAudioRatio = text.length / audioLength;
    if (textToAudioRatio > 0.1) {
      confidence *= 0.9;
    }

    // Check for quality indicators
    const hasProperCapitalization = /[A-Z]/.test(text);
    const hasExcessiveSpecialChars = (text.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length > text.length * 0.1;

    if (!hasProperCapitalization && text.length > 20) {
      confidence *= 0.95;
    }

    if (hasExcessiveSpecialChars) {
      confidence *= 0.9;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Stream transcribe audio in real-time with chunked processing
   * Provides lower latency by processing audio chunks as they arrive
   * @param audioStream - Readable stream of audio data
   * @param options - Transcription options
   * @returns Async iterator yielding transcription chunks
   */
  async *streamTranscribe(
    audioStream: Readable,
    options?: TranscribeOptions
  ): AsyncIterableIterator<TranscriptionResult> {
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks for optimal processing
    const CHUNK_TIMEOUT = 5000; // 5 second timeout per chunk
    
    try {
      logger.info('Starting streaming transcription', { options });

      let buffer = Buffer.alloc(0);
      let chunkCount = 0;

      // Process audio stream in chunks
      for await (const chunk of audioStream) {
        try {
          // Accumulate audio data
          buffer = Buffer.concat([buffer, chunk]);
          
          // Process when we have enough data
          if (buffer.length >= CHUNK_SIZE) {
            chunkCount++;
            logger.debug(`Processing audio chunk ${chunkCount}`, {
              bufferSize: buffer.length,
            });

            // Extract chunk to process
            const chunkToProcess = buffer.subarray(0, CHUNK_SIZE);
            buffer = buffer.subarray(CHUNK_SIZE);

            // Transcribe the chunk with timeout
            const transcriptionPromise = this.transcribeChunk(
              chunkToProcess,
              options,
              chunkCount
            );

            const timeoutPromise = new Promise<TranscriptionResult>((_, reject) => {
              setTimeout(() => reject(new Error('Chunk transcription timeout')), CHUNK_TIMEOUT);
            });

            try {
              const result = await Promise.race([transcriptionPromise, timeoutPromise]);
              
              // Only yield if we got meaningful text
              if (result.text && result.text.trim().length > 0) {
                yield result;
              }
            } catch (error) {
              logger.warn(`Chunk ${chunkCount} transcription failed`, {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Continue processing next chunks even if one fails
              continue;
            }
          }
        } catch (error) {
          logger.error('Error processing audio chunk', {
            error: error instanceof Error ? error.message : 'Unknown error',
            chunkCount,
          });
          // Continue processing despite errors
          continue;
        }
      }

      // Process any remaining buffer data
      if (buffer.length > 0) {
        chunkCount++;
        logger.debug(`Processing final audio chunk ${chunkCount}`, {
          bufferSize: buffer.length,
        });

        try {
          const result = await this.transcribeChunk(buffer, options, chunkCount);
          if (result.text && result.text.trim().length > 0) {
            yield result;
          }
        } catch (error) {
          logger.warn('Final chunk transcription failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Streaming transcription completed', {
        totalChunks: chunkCount,
      });
    } catch (error) {
      logger.error('Streaming transcription failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Streaming transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Transcribe a single audio chunk
   * @param chunkBuffer - Audio chunk buffer
   * @param options - Transcription options
   * @param chunkNumber - Chunk sequence number for logging
   * @returns Transcription result for the chunk
   */
  private async transcribeChunk(
    chunkBuffer: Buffer,
    options?: TranscribeOptions,
    chunkNumber?: number
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      // Validate chunk buffer
      if (!chunkBuffer || chunkBuffer.length === 0) {
        throw new Error('Audio chunk is empty');
      }

      // Detect audio format
      const format = this.detectAudioFormat(chunkBuffer);
      
      // For chunks, we may not always have complete headers
      // If format is unknown but we have data, assume it's a continuation
      if (format === 'unknown' && chunkNumber && chunkNumber > 1) {
        logger.debug(`Chunk ${chunkNumber} has no header, assuming continuation`);
      }

      // Convert buffer to readable stream
      const chunkStream = Readable.from(chunkBuffer);

      // Call ElevenLabs Speech-to-Text API
      const response = await this.client.speechToText.convert({
        file: chunkStream,
        modelId: options?.model || 'scribe_v1',
        languageCode: options?.language,
        enableLogging: false,
      });

      // Extract transcription result
      let text = '';
      let languageCode = options?.language || 'en';
      let confidence = 0.85;

      if ('text' in response && typeof response.text === 'string') {
        text = response.text;
        if ('languageCode' in response) {
          languageCode = response.languageCode as string;
        }
        if ('languageProbability' in response && typeof response.languageProbability === 'number') {
          confidence = response.languageProbability;
        }
      }

      const duration = Date.now() - startTime;

      const result: TranscriptionResult = {
        text: text.trim(),
        confidence,
        language: languageCode,
        duration,
      };

      logger.debug(`Chunk ${chunkNumber || 'unknown'} transcribed`, {
        textLength: result.text.length,
        confidence: result.confidence,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Chunk ${chunkNumber || 'unknown'} transcription error`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Return empty result instead of throwing to allow stream to continue
      return {
        text: '',
        confidence: 0,
        language: options?.language || 'en',
        duration,
      };
    }
  }

  /**
   * Check if transcription confidence is acceptable
   * @param result - Transcription result
   * @returns True if confidence meets threshold
   */
  isConfidenceAcceptable(result: TranscriptionResult): boolean {
    return result.confidence >= this.MIN_CONFIDENCE_THRESHOLD;
  }

  /**
   * Get supported audio formats
   * @returns Array of supported format extensions
   */
  getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }
}
