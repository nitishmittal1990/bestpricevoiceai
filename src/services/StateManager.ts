import { SessionState, ConversationState, Message, ProductQuery } from '../types';
import { logger } from '../utils/logger';

/**
 * StateManager handles conversation state persistence and session lifecycle management.
 * Uses in-memory storage for development/testing. Can be extended to use Redis or other
 * persistent storage for production.
 */
export class StateManager {
  private sessions: Map<string, SessionState>;
  private readonly defaultSessionTimeout: number;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(sessionTimeoutMs: number = 30 * 60 * 1000) {
    // Default 30 minutes
    this.sessions = new Map();
    this.defaultSessionTimeout = sessionTimeoutMs;
    
    // Start cleanup interval (run every 5 minutes)
    this.startCleanupInterval();
    
    logger.info('StateManager initialized', {
      sessionTimeout: sessionTimeoutMs,
    });
  }

  /**
   * Create a new session with initial state
   */
  createSession(sessionId: string): SessionState {
    const state: SessionState = {
      sessionId,
      conversationHistory: [],
      conversationState: ConversationState.INITIAL,
      lastActivity: new Date(),
      status: 'active',
    };

    this.sessions.set(sessionId, state);
    
    logger.info('Session created', { sessionId });
    
    return state;
  }

  /**
   * Save session state
   */
  async saveState(sessionId: string, state: SessionState): Promise<void> {
    try {
      // Update last activity timestamp
      state.lastActivity = new Date();
      
      this.sessions.set(sessionId, state);
      
      logger.debug('Session state saved', {
        sessionId,
        conversationState: state.conversationState,
        messageCount: state.conversationHistory.length,
      });
    } catch (error) {
      logger.error('Failed to save session state', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to save session state: ${error}`);
    }
  }

  /**
   * Load session state
   */
  async loadState(sessionId: string): Promise<SessionState | null> {
    try {
      const state = this.sessions.get(sessionId);
      
      if (!state) {
        logger.debug('Session not found', { sessionId });
        return null;
      }

      // Check if session has expired
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - state.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.defaultSessionTimeout) {
        logger.info('Session expired', {
          sessionId,
          timeSinceLastActivity,
        });
        await this.deleteState(sessionId);
        return null;
      }

      logger.debug('Session state loaded', {
        sessionId,
        conversationState: state.conversationState,
      });
      
      return state;
    } catch (error) {
      logger.error('Failed to load session state', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to load session state: ${error}`);
    }
  }

  /**
   * Delete session state
   */
  async deleteState(sessionId: string): Promise<void> {
    try {
      const deleted = this.sessions.delete(sessionId);
      
      if (deleted) {
        logger.info('Session deleted', { sessionId });
      } else {
        logger.debug('Session not found for deletion', { sessionId });
      }
    } catch (error) {
      logger.error('Failed to delete session state', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to delete session state: ${error}`);
    }
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(maxAge?: number): Promise<number> {
    const maxAgeMs = maxAge || this.defaultSessionTimeout;
    const now = new Date();
    let cleanedCount = 0;

    try {
      for (const [sessionId, state] of this.sessions.entries()) {
        const timeSinceLastActivity = now.getTime() - state.lastActivity.getTime();
        
        if (timeSinceLastActivity > maxAgeMs) {
          await this.deleteState(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Expired sessions cleaned up', {
          count: cleanedCount,
          maxAge: maxAgeMs,
        });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to cleanup expired sessions: ${error}`);
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions().catch((error) => {
        logger.error('Cleanup interval error', { error });
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automatic cleanup interval (useful for testing and graceful shutdown)
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
      logger.debug('Cleanup interval stopped');
    }
  }

  /**
   * Get session count (useful for monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clearAllSessions(): void {
    this.sessions.clear();
    logger.info('All sessions cleared');
  }

  // ============================================================================
  // Conversation Context Tracking Methods
  // ============================================================================

  /**
   * Add a message to conversation history
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const message: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    state.conversationHistory.push(message);
    await this.saveState(sessionId, state);

    logger.debug('Message added to conversation history', {
      sessionId,
      role,
      messageLength: content.length,
      totalMessages: state.conversationHistory.length,
    });
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<Message[]> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return state.conversationHistory;
  }

  /**
   * Update the current product query being discussed
   */
  async updateProductQuery(
    sessionId: string,
    productQuery: ProductQuery
  ): Promise<void> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    state.currentProduct = productQuery;
    await this.saveState(sessionId, state);

    logger.debug('Product query updated', {
      sessionId,
      productName: productQuery.productName,
      category: productQuery.category,
      specsCount: Object.keys(productQuery.specifications).length,
    });
  }

  /**
   * Get the current product query
   */
  async getCurrentProduct(sessionId: string): Promise<ProductQuery | undefined> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return state.currentProduct;
  }

  /**
   * Update conversation state (e.g., INITIAL -> GATHERING_SPECS)
   */
  async updateConversationState(
    sessionId: string,
    conversationState: ConversationState
  ): Promise<void> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const previousState = state.conversationState;
    state.conversationState = conversationState;
    await this.saveState(sessionId, state);

    logger.info('Conversation state updated', {
      sessionId,
      previousState,
      newState: conversationState,
    });
  }

  /**
   * Get current conversation state
   */
  async getConversationState(sessionId: string): Promise<ConversationState> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return state.conversationState;
  }

  /**
   * Update session status (active, waiting, completed)
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'waiting' | 'completed'
  ): Promise<void> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    state.status = status;
    await this.saveState(sessionId, state);

    logger.debug('Session status updated', {
      sessionId,
      status,
    });
  }

  /**
   * Get specification gathering progress
   * Returns information about which specs are collected and which are missing
   */
  async getSpecificationProgress(sessionId: string): Promise<{
    hasProduct: boolean;
    hasCategory: boolean;
    specificationCount: number;
    specifications: string[];
  }> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const product = state.currentProduct;
    
    if (!product) {
      return {
        hasProduct: false,
        hasCategory: false,
        specificationCount: 0,
        specifications: [],
      };
    }

    return {
      hasProduct: !!product.productName,
      hasCategory: !!product.category,
      specificationCount: Object.keys(product.specifications).length,
      specifications: Object.keys(product.specifications),
    };
  }

  /**
   * Clear current product query (useful when starting a new search)
   */
  async clearCurrentProduct(sessionId: string): Promise<void> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    state.currentProduct = undefined;
    await this.saveState(sessionId, state);

    logger.debug('Current product cleared', { sessionId });
  }

  /**
   * Get conversation summary (useful for debugging/monitoring)
   */
  async getConversationSummary(sessionId: string): Promise<{
    sessionId: string;
    messageCount: number;
    conversationState: ConversationState;
    status: string;
    hasCurrentProduct: boolean;
    lastActivity: Date;
  }> {
    const state = await this.loadState(sessionId);
    
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      sessionId: state.sessionId,
      messageCount: state.conversationHistory.length,
      conversationState: state.conversationState,
      status: state.status,
      hasCurrentProduct: !!state.currentProduct,
      lastActivity: state.lastActivity,
    };
  }
}
