import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to validate API key
 * API key should be provided in the Authorization header as "Bearer <api_key>"
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in development if API_KEY is not set
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    logger.warn('API_KEY not configured - authentication disabled');
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Missing authorization header', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing authorization header',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    logger.warn('Invalid authorization format', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization format. Use: Bearer <api_key>',
    });
    return;
  }

  if (token !== apiKey) {
    logger.warn('Invalid API key', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  logger.debug('API key validated', { path: req.path });
  next();
}
