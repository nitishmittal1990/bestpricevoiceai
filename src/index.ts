import express from 'express';
import cors from 'cors';
import { config } from './config';
import logger from './utils/logger';
import { ConversationOrchestrator } from './services/ConversationOrchestrator';
import sessionRoutes, { initializeRoutes } from './routes/session.routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { generalRateLimiter } from './middleware/rateLimiter';

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);
app.use(generalRateLimiter);

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Voice Price Comparison Agent API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      startSession: 'POST /api/session/start',
      sendMessage: 'POST /api/session/:id/message',
      endSession: 'DELETE /api/session/:id',
      getSessionState: 'GET /api/session/:id/state',
    },
  });
});

// Initialize services
const orchestrator = new ConversationOrchestrator();

// Initialize and mount API routes
initializeRoutes(orchestrator);
app.use('/api/session', apiKeyAuth, sessionRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`CORS enabled for: ${corsOptions.origin}`);
});

export default app;
