import { StateManager } from '../StateManager';
import { ConversationState, ProductCategory } from '../../types';

describe('StateManager', () => {
  let stateManager: StateManager;
  const testSessionId = 'test-session-123';

  beforeEach(() => {
    // Create a new StateManager with short timeout for testing
    stateManager = new StateManager(1000); // 1 second timeout
    stateManager.clearAllSessions();
  });

  afterEach(() => {
    stateManager.clearAllSessions();
    stateManager.stopCleanupInterval();
  });

  describe('Session Lifecycle Management', () => {
    test('should create a new session', () => {
      const state = stateManager.createSession(testSessionId);

      expect(state.sessionId).toBe(testSessionId);
      expect(state.conversationHistory).toEqual([]);
      expect(state.conversationState).toBe(ConversationState.INITIAL);
      expect(state.status).toBe('active');
      expect(state.currentProduct).toBeUndefined();
    });

    test('should save and load session state', async () => {
      const state = stateManager.createSession(testSessionId);
      state.conversationState = ConversationState.GATHERING_SPECS;

      await stateManager.saveState(testSessionId, state);
      const loadedState = await stateManager.loadState(testSessionId);

      expect(loadedState).not.toBeNull();
      expect(loadedState?.conversationState).toBe(ConversationState.GATHERING_SPECS);
    });

    test('should return null for non-existent session', async () => {
      const state = await stateManager.loadState('non-existent-session');
      expect(state).toBeNull();
    });

    test('should delete session state', async () => {
      stateManager.createSession(testSessionId);
      await stateManager.deleteState(testSessionId);

      const state = await stateManager.loadState(testSessionId);
      expect(state).toBeNull();
    });

    test('should check if session exists', async () => {
      stateManager.createSession(testSessionId);
      
      const exists = await stateManager.sessionExists(testSessionId);
      expect(exists).toBe(true);

      await stateManager.deleteState(testSessionId);
      const existsAfterDelete = await stateManager.sessionExists(testSessionId);
      expect(existsAfterDelete).toBe(false);
    });

    test('should get active sessions', () => {
      stateManager.createSession('session-1');
      stateManager.createSession('session-2');
      stateManager.createSession('session-3');

      const activeSessions = stateManager.getActiveSessions();
      expect(activeSessions).toHaveLength(3);
      expect(activeSessions).toContain('session-1');
      expect(activeSessions).toContain('session-2');
      expect(activeSessions).toContain('session-3');
    });

    test('should get session count', () => {
      expect(stateManager.getSessionCount()).toBe(0);

      stateManager.createSession('session-1');
      stateManager.createSession('session-2');

      expect(stateManager.getSessionCount()).toBe(2);
    });
  });

  describe('Session Expiration', () => {
    test('should return null for expired session', async () => {
      const state = stateManager.createSession(testSessionId);
      await stateManager.saveState(testSessionId, state);

      // Wait for session to expire (1 second + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const loadedState = await stateManager.loadState(testSessionId);
      expect(loadedState).toBeNull();
    });

    test('should cleanup expired sessions', async () => {
      stateManager.createSession('session-1');
      stateManager.createSession('session-2');

      expect(stateManager.getSessionCount()).toBe(2);

      // Wait for sessions to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const cleanedCount = await stateManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(2);
      expect(stateManager.getSessionCount()).toBe(0);
    });

    test('should not cleanup active sessions', async () => {
      stateManager.createSession('session-1');
      
      // Immediately cleanup (session should not be expired)
      const cleanedCount = await stateManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
      expect(stateManager.getSessionCount()).toBe(1);
    });
  });

  describe('Conversation Context Tracking', () => {
    beforeEach(() => {
      stateManager.createSession(testSessionId);
    });

    test('should add message to conversation history', async () => {
      await stateManager.addMessage(testSessionId, 'user', 'Hello');
      await stateManager.addMessage(testSessionId, 'assistant', 'Hi there!');

      const history = await stateManager.getConversationHistory(testSessionId);
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('Hi there!');
    });

    test('should throw error when adding message to non-existent session', async () => {
      await expect(
        stateManager.addMessage('non-existent', 'user', 'Hello')
      ).rejects.toThrow('Session not found');
    });

    test('should update and get product query', async () => {
      const productQuery = {
        productName: 'MacBook Pro',
        category: ProductCategory.LAPTOP,
        specifications: {
          ram: '16GB',
          storage: '512GB',
        },
      };

      await stateManager.updateProductQuery(testSessionId, productQuery);
      const currentProduct = await stateManager.getCurrentProduct(testSessionId);

      expect(currentProduct).toEqual(productQuery);
    });

    test('should update conversation state', async () => {
      await stateManager.updateConversationState(
        testSessionId,
        ConversationState.GATHERING_SPECS
      );

      const conversationState = await stateManager.getConversationState(testSessionId);
      expect(conversationState).toBe(ConversationState.GATHERING_SPECS);
    });

    test('should update session status', async () => {
      await stateManager.updateSessionStatus(testSessionId, 'waiting');

      const state = await stateManager.loadState(testSessionId);
      expect(state?.status).toBe('waiting');
    });

    test('should get specification progress', async () => {
      // Initially no product
      let progress = await stateManager.getSpecificationProgress(testSessionId);
      expect(progress.hasProduct).toBe(false);
      expect(progress.hasCategory).toBe(false);
      expect(progress.specificationCount).toBe(0);

      // Add product with specs
      await stateManager.updateProductQuery(testSessionId, {
        productName: 'iPhone 15',
        category: ProductCategory.PHONE,
        specifications: {
          storage: '256GB',
          color: 'Blue',
        },
      });

      progress = await stateManager.getSpecificationProgress(testSessionId);
      expect(progress.hasProduct).toBe(true);
      expect(progress.hasCategory).toBe(true);
      expect(progress.specificationCount).toBe(2);
      expect(progress.specifications).toContain('storage');
      expect(progress.specifications).toContain('color');
    });

    test('should clear current product', async () => {
      await stateManager.updateProductQuery(testSessionId, {
        productName: 'Test Product',
        specifications: {},
      });

      let product = await stateManager.getCurrentProduct(testSessionId);
      expect(product).toBeDefined();

      await stateManager.clearCurrentProduct(testSessionId);
      product = await stateManager.getCurrentProduct(testSessionId);
      expect(product).toBeUndefined();
    });

    test('should get conversation summary', async () => {
      await stateManager.addMessage(testSessionId, 'user', 'Hello');
      await stateManager.addMessage(testSessionId, 'assistant', 'Hi!');
      await stateManager.updateConversationState(
        testSessionId,
        ConversationState.GATHERING_SPECS
      );
      await stateManager.updateProductQuery(testSessionId, {
        productName: 'Test',
        specifications: {},
      });

      const summary = await stateManager.getConversationSummary(testSessionId);

      expect(summary.sessionId).toBe(testSessionId);
      expect(summary.messageCount).toBe(2);
      expect(summary.conversationState).toBe(ConversationState.GATHERING_SPECS);
      expect(summary.status).toBe('active');
      expect(summary.hasCurrentProduct).toBe(true);
      expect(summary.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when loading state for non-existent session in context methods', async () => {
      await expect(
        stateManager.getConversationHistory('non-existent')
      ).rejects.toThrow('Session not found');

      await expect(
        stateManager.getCurrentProduct('non-existent')
      ).rejects.toThrow('Session not found');

      await expect(
        stateManager.getConversationState('non-existent')
      ).rejects.toThrow('Session not found');
    });
  });
});
