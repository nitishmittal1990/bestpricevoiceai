/**
 * Additional type definitions and interfaces
 */

export interface ErrorContext {
  sessionId?: string;
  operation: string;
  timestamp: Date;
}

export interface ErrorResponse {
  userMessage: string;
  shouldRetry: boolean;
  fallbackAction?: string;
  logLevel: 'info' | 'warn' | 'error';
}

export interface TranscribeOptions {
  language?: string;
  model?: string;
  enableNoiseReduction?: boolean;
}

export interface SynthesizeOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'opus';
}
