import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate limiter for session creation
 * Limits: 10 sessions per IP per 15 minutes
 */
export const sessionCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 session creations per windowMs
  message: {
    success: false,
    error: 'Too many sessions created',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded for session creation', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many sessions created',
      message: 'Please try again later',
    });
  },
});

/**
 * Rate limiter for message sending
 * Limits: 60 messages per session per minute
 */
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each session to 60 messages per minute
  keyGenerator: (req: Request) => {
    // Use session ID as the key for rate limiting
    return req.params.id || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: 'Too many messages',
    message: 'Please slow down and try again',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded for messages', {
      sessionId: req.params.id,
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many messages',
      message: 'Please slow down and try again',
    });
  },
});

/**
 * General API rate limiter
 * Limits: 100 requests per IP per 15 minutes
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Please try again later',
    });
  },
});
