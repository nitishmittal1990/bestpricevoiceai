import request from 'supertest';
import express from 'express';
import { ConversationOrchestrator } from '../../services/ConversationOrchestrator';
import sessionRoutes, { initializeRoutes } from '../session.routes';
import { ConversationState } from '../../types';

// Mock the ConversationOrchestrator
jest.mock('../../services/ConversationOrchestrator');

describe('Session Routes', () => {
  let app: express.Application;
  let mockOrchestrator: jest.Mocked<ConversationOrchestrator>;

  beforeEach(() => {
    // Create mock orchestrator
    mockOrchestrator = {
      startSession: jest.fn(),
      endSession: jest.fn(),
      getSessionState: jest.fn(),
      handleUserInput: jest.fn(),
    } as any;

    // Create Express app
    app = express();
    app.use(express.json());
    
    // Initialize routes with mock orchestrator
    initializeRoutes(mockOrchestrator);
    app.use('/api/session', sessionRoutes);
  });

  describe('POST /api/session/start', () => {
    it('should start a new session', async () => {
      const sessionId = 'test-session-id';
      mockOrchestrator.startSession.mockResolvedValue(sessionId);

      const response = await request(app)
        .post('/api/session/start')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        sessionId,
        message: 'Session started successfully',
      });
      expect(mockOrchestrator.startSession).toHaveBeenCalled();
    });

    it('should handle errors when starting session', async () => {
      mockOrchestrator.startSession.mockRejectedValue(new Error('Failed to start'));

      const response = await request(app)
        .post('/api/session/start')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to start session');
    });
  });

  describe('DELETE /api/session/:id', () => {
    it('should end a session', async () => {
      const sessionId = 'test-session-id';
      mockOrchestrator.endSession.mockResolvedValue();

      const response = await request(app)
        .delete(`/api/session/${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Session ended successfully',
      });
      expect(mockOrchestrator.endSession).toHaveBeenCalledWith(sessionId);
    });

    it('should handle errors when ending session', async () => {
      const sessionId = 'test-session-id';
      mockOrchestrator.endSession.mockRejectedValue(new Error('Failed to end'));

      const response = await request(app)
        .delete(`/api/session/${sessionId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to end session');
    });
  });

  describe('GET /api/session/:id/state', () => {
    it('should get session state', async () => {
      const sessionId = 'test-session-id';
      const mockState = {
        sessionId,
        conversationHistory: [],
        status: 'active' as const,
        lastActivity: new Date(),
        conversationState: ConversationState.INITIAL,
      };
      mockOrchestrator.getSessionState.mockResolvedValue(mockState);

      const response = await request(app)
        .get(`/api/session/${sessionId}/state`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state).toBeDefined();
      expect(mockOrchestrator.getSessionState).toHaveBeenCalledWith(sessionId);
    });

    it('should return 404 when session not found', async () => {
      const sessionId = 'non-existent-session';
      mockOrchestrator.getSessionState.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/session/${sessionId}/state`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Session not found');
    });

    it('should handle errors when getting session state', async () => {
      const sessionId = 'test-session-id';
      mockOrchestrator.getSessionState.mockRejectedValue(new Error('Failed to get state'));

      const response = await request(app)
        .get(`/api/session/${sessionId}/state`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get session state');
    });
  });
});
