import { Router, Request, Response } from 'express';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { logger } from '../utils/logger';
import multer from 'multer';
import { validateAudioFile } from '../middleware/audioValidation';
import { sessionCreationLimiter, messageRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Initialize orchestrator (will be injected via middleware)
let orchestrator: ConversationOrchestrator;

export function initializeRoutes(orch: ConversationOrchestrator): Router {
  orchestrator = orch;
  return router;
}

/**
 * POST /api/session/start
 * Start a new conversation session
 */
router.post('/start', sessionCreationLimiter, async (_req: Request, res: Response) => {
  try {
    logger.info('Starting new session');
    
    const sessionId = await orchestrator.startSession();
    
    res.status(201).json({
      success: true,
      sessionId,
      message: 'Session started successfully',
    });
  } catch (error) {
    logger.error('Failed to start session', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to start session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/session/:id/message
 * Send audio message to session
 */
router.post('/:id/message', messageRateLimiter, upload.single('audio'), validateAudioFile, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
      return;
    }
    
    logger.info('Processing message', {
      sessionId,
      audioSize: req.file.size,
      mimeType: req.file.mimetype,
    });
    
    const audioBuffer = req.file.buffer;
    const audioResponse = await orchestrator.handleUserInput(sessionId, audioBuffer);
    
    // Set appropriate headers for audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioResponse.data.length);
    
    res.send(audioResponse.data);
  } catch (error) {
    logger.error('Failed to process message', {
      sessionId: req.params.id,
      error,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/session/:id
 * End a conversation session
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    
    logger.info('Ending session', { sessionId });
    
    await orchestrator.endSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    logger.error('Failed to end session', {
      sessionId: req.params.id,
      error,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/session/:id/state
 * Get current session state
 */
router.get('/:id/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    
    logger.info('Getting session state', { sessionId });
    
    const state = await orchestrator.getSessionState(sessionId);
    
    if (!state) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }
    
    res.json({
      success: true,
      state,
    });
  } catch (error) {
    logger.error('Failed to get session state', {
      sessionId: req.params.id,
      error,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get session state',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
