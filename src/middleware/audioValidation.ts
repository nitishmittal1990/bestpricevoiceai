import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Supported audio formats
const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
];

// Maximum audio file size (10MB)
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

/**
 * Middleware to validate audio file format and size
 */
export function validateAudioFile(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'No audio file provided',
      message: 'Please upload an audio file',
    });
    return;
  }

  const { mimetype, size } = req.file;

  // Validate file format
  if (!SUPPORTED_AUDIO_FORMATS.includes(mimetype)) {
    logger.warn('Unsupported audio format', { mimetype });
    
    res.status(400).json({
      success: false,
      error: 'Unsupported audio format',
      message: `Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`,
      receivedFormat: mimetype,
    });
    return;
  }

  // Validate file size
  if (size > MAX_AUDIO_SIZE) {
    logger.warn('Audio file too large', { size, maxSize: MAX_AUDIO_SIZE });
    
    res.status(413).json({
      success: false,
      error: 'Audio file too large',
      message: `Maximum file size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB`,
      receivedSize: size,
    });
    return;
  }

  logger.debug('Audio file validated', { mimetype, size });
  next();
}
