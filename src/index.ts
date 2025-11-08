import express from 'express';
import { config } from './config';
import logger from './utils/logger';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder for API routes
app.get('/', (_req, res) => {
  res.json({
    message: 'Voice Price Comparison Agent API',
    version: '1.0.0',
  });
});

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
});

export default app;
