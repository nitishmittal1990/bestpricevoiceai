import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.server.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Structured logging helpers for API calls
export const logApiCall = (
  service: string,
  method: string,
  params?: Record<string, any>
) => {
  logger.info('API call initiated', {
    service,
    method,
    params: params ? sanitizeParams(params) : undefined,
    timestamp: new Date().toISOString(),
  });
};

export const logApiResponse = (
  service: string,
  method: string,
  success: boolean,
  duration: number,
  error?: Error
) => {
  if (success) {
    logger.info('API call completed', {
      service,
      method,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error('API call failed', {
      service,
      method,
      duration,
      success: false,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

// Structured logging for conversation flow
export const logConversationTransition = (
  sessionId: string,
  fromState: string,
  toState: string,
  reason?: string
) => {
  logger.info('Conversation state transition', {
    sessionId,
    fromState,
    toState,
    reason,
    timestamp: new Date().toISOString(),
  });
};

export const logConversationEvent = (
  sessionId: string,
  event: string,
  details?: Record<string, any>
) => {
  logger.info('Conversation event', {
    sessionId,
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Performance monitoring helpers
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export const logPerformance = (metrics: PerformanceMetrics) => {
  const level = metrics.duration > 2000 ? 'warn' : 'info';
  logger.log(level, 'Performance metric', {
    ...metrics,
    timestamp: new Date().toISOString(),
  });
};

// Helper to sanitize sensitive data from logs
const sanitizeParams = (params: Record<string, any>): Record<string, any> => {
  const sanitized = { ...params };
  const sensitiveKeys = ['apiKey', 'api_key', 'password', 'token', 'secret'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Timer utility for measuring operation duration
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private sessionId?: string;
  private metadata?: Record<string, any>;

  constructor(operation: string, sessionId?: string, metadata?: Record<string, any>) {
    this.operation = operation;
    this.sessionId = sessionId;
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    logPerformance({
      operation: this.operation,
      duration,
      sessionId: this.sessionId,
      metadata: this.metadata,
    });
    return duration;
  }
}

export default logger;
