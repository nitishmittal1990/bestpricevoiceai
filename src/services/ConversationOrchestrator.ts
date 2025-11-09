import { STTService } from './STTService';
import { TTSService, AudioBuffer } from './TTSService';
import { LLMAgent, ConversationContext } from './LLMAgent';
import { SearchTool } from './SearchTool';
import { StateManager } from './StateManager';
import { SessionState, ConversationState, ProductQuery } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * ConversationOrchestrator coordinates all services to handle voice-based
 * product price comparison conversations
 */
export class ConversationOrchestrator {
  private sttService: STTService;
  private ttsService: TTSService;
  private llmAgent: LLMAgent;
  private searchTool: SearchTool;
  private stateManager: StateManager;

  private readonly IDLE_TIMEOUT_MS = 30000; // 30 seconds
  private readonly EXIT_PHRASES = ['goodbye', 'exit', 'stop', 'quit', 'bye', 'end'];

  constructor(
    sttService?: STTService,
    ttsService?: TTSService,
    llmAgent?: LLMAgent,
    searchTool?: SearchTool,
    stateManager?: StateManager
  ) {
    this.sttService = sttService || new STTService();
    this.ttsService = ttsService || new TTSService();
    this.llmAgent = llmAgent || new LLMAgent();
    this.searchTool = searchTool || new SearchTool();
    this.stateManager = stateManager || new StateManager();

    logger.info('ConversationOrchestrator initialized');
  }

  /**
   * Start a new conversation session
   * @returns Session ID for the new session
   */
  async startSession(): Promise<string> {
    try {
      const sessionId = uuidv4();
      
      // Create new session state
      this.stateManager.createSession(sessionId);
      
      logger.info('New session started', { sessionId });
      
      return sessionId;
    } catch (error) {
      logger.error('Failed to start session', { error });
      throw new Error(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End a conversation session
   * @param sessionId - Session ID to end
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      logger.info('Ending session', { sessionId });
      
      // Update session status to completed
      await this.stateManager.updateSessionStatus(sessionId, 'completed');
      
      // Update conversation state to ended
      await this.stateManager.updateConversationState(sessionId, ConversationState.ENDED);
      
      // Delete session state
      await this.stateManager.deleteState(sessionId);
      
      logger.info('Session ended successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to end session', { sessionId, error });
      throw new Error(`Failed to end session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current session state
   * @param sessionId - Session ID to retrieve
   * @returns Session state or null if not found
   */
  async getSessionState(sessionId: string): Promise<SessionState | null> {
    try {
      const state = await this.stateManager.loadState(sessionId);
      
      if (!state) {
        logger.warn('Session not found', { sessionId });
        return null;
      }
      
      return state;
    } catch (error) {
      logger.error('Failed to get session state', { sessionId, error });
      throw new Error(`Failed to get session state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle user input (audio) and return audio response
   * This is the main entry point for processing user interactions
   * @param sessionId - Session ID
   * @param audioInput - Audio buffer from user
   * @returns Audio response buffer
   */
  async handleUserInput(sessionId: string, audioInput: Buffer): Promise<AudioBuffer> {
    const startTime = Date.now();
    
    try {
      logger.info('Handling user input', {
        sessionId,
        audioSize: audioInput.length,
      });

      // Load session state
      const sessionState = await this.stateManager.loadState(sessionId);
      if (!sessionState) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Update session status to active
      await this.stateManager.updateSessionStatus(sessionId, 'active');

      // Step 1: Transcribe audio to text
      const transcription = await this.transcribeWithRetry(audioInput, sessionId);
      
      // Add user message to conversation history
      await this.stateManager.addMessage(sessionId, 'user', transcription.text);

      // Check for exit phrases
      if (this.isExitPhrase(transcription.text)) {
        const exitMessage = 'Goodbye! Feel free to come back anytime you need help finding the best prices.';
        await this.stateManager.addMessage(sessionId, 'assistant', exitMessage);
        await this.endSession(sessionId);
        
        const audioResponse = await this.ttsService.synthesize(exitMessage);
        
        logger.info('User input handled (exit)', {
          sessionId,
          duration: Date.now() - startTime,
        });
        
        return audioResponse;
      }

      // Step 2: Process with LLM agent
      const context = await this.buildConversationContext(sessionId);
      const agentResponse = await this.llmAgent.processUserMessage(transcription.text, context);

      // Step 3: Handle agent action if present
      let responseMessage = agentResponse.message;
      
      if (agentResponse.action) {
        const actionResult = await this.handleAgentAction(
          agentResponse.action,
          sessionId,
          context
        );
        
        // If action produced a message, use it
        if (actionResult.message) {
          responseMessage = actionResult.message;
        }
      }

      // Update conversation state if changed
      if (agentResponse.conversationState) {
        await this.stateManager.updateConversationState(sessionId, agentResponse.conversationState);
      }

      // Add assistant message to conversation history
      await this.stateManager.addMessage(sessionId, 'assistant', responseMessage);

      // Step 4: Convert response to speech
      const audioResponse = await this.synthesizeWithFallback(responseMessage, sessionId);

      // Update session status based on whether we need user input
      if (agentResponse.requiresUserInput) {
        await this.stateManager.updateSessionStatus(sessionId, 'waiting');
      }

      logger.info('User input handled successfully', {
        sessionId,
        duration: Date.now() - startTime,
        conversationState: agentResponse.conversationState,
      });

      return audioResponse;
    } catch (error) {
      logger.error('Failed to handle user input', { sessionId, error });
      
      // Generate error response
      const errorMessage = 'I apologize, but I encountered an error processing your request. Could you please try again?';
      
      try {
        await this.stateManager.addMessage(sessionId, 'assistant', errorMessage);
        return await this.ttsService.synthesize(errorMessage);
      } catch (ttsError) {
        logger.error('Failed to generate error response audio', { ttsError });
        throw new Error(`Failed to handle user input: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Build conversation context from session state
   */
  private async buildConversationContext(sessionId: string): Promise<ConversationContext> {
    const sessionState = await this.stateManager.loadState(sessionId);
    
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      history: sessionState.conversationHistory,
      currentProduct: sessionState.currentProduct,
      conversationState: sessionState.conversationState,
    };
  }

  /**
   * Handle agent action (search, clarify, etc.)
   */
  private async handleAgentAction(
    action: any,
    sessionId: string,
    _context: ConversationContext
  ): Promise<{ message?: string }> {
    logger.info('Handling agent action', {
      sessionId,
      actionType: action.type,
    });

    try {
      switch (action.type) {
        case 'search': {
          // Execute search
          const productQuery: ProductQuery = {
            productName: action.parameters.productName,
            category: action.parameters.category,
            brand: action.parameters.brand,
            specifications: action.parameters.specifications || {},
            priceRange: action.parameters.priceRange,
          };

          // Update current product in session
          await this.stateManager.updateProductQuery(sessionId, productQuery);

          // Perform search
          const searchResults = await this.searchTool.searchProductPrices(productQuery);

          // Filter and rank results
          const filteredResults = this.searchTool.filterAndRankResults(
            searchResults,
            productQuery.specifications
          );

          // Generate comparison summary
          const summary = await this.llmAgent.compareAndSummarize(productQuery, filteredResults);

          return { message: summary };
        }

        case 'clarify': {
          // Return clarifying question
          return { message: action.parameters.question };
        }

        case 'compare': {
          // This is handled by the search action
          return {};
        }

        case 'end': {
          // End conversation
          await this.endSession(sessionId);
          return { message: 'Thank you for using our service. Goodbye!' };
        }

        default:
          logger.warn('Unknown action type', { actionType: action.type });
          return {};
      }
    } catch (error) {
      logger.error('Error handling agent action', { sessionId, action, error });
      throw error;
    }
  }

  /**
   * Check if text contains an exit phrase
   */
  private isExitPhrase(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    return this.EXIT_PHRASES.some(phrase => lowerText.includes(phrase));
  }

  /**
   * Transcribe audio with retry logic
   */
  private async transcribeWithRetry(
    audioInput: Buffer,
    sessionId: string,
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('Transcription attempt', { sessionId, attempt, maxRetries });

        const result = await this.sttService.transcribe(audioInput);

        // Check confidence
        if (!this.sttService.isConfidenceAcceptable(result)) {
          logger.warn('Low confidence transcription', {
            sessionId,
            confidence: result.confidence,
            attempt,
          });

          if (attempt < maxRetries) {
            // For low confidence, we'll still try to process but log the warning
            logger.info('Proceeding with low confidence transcription');
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn('Transcription attempt failed', {
          sessionId,
          attempt,
          error: lastError.message,
        });

        if (attempt >= maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        await this.sleep(1000 * Math.pow(2, attempt - 1));
      }
    }

    // If all retries failed, throw error
    throw new Error(`Transcription failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Synthesize text to speech with fallback
   */
  private async synthesizeWithFallback(
    text: string,
    sessionId: string,
    maxRetries: number = 2
  ): Promise<AudioBuffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('TTS synthesis attempt', { sessionId, attempt, maxRetries });

        const result = await this.ttsService.synthesize(text);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn('TTS synthesis attempt failed', {
          sessionId,
          attempt,
          error: lastError.message,
        });

        if (attempt >= maxRetries) {
          break;
        }

        // Wait before retrying
        await this.sleep(1000 * attempt);
      }
    }

    // If all retries failed, throw error
    throw new Error(`TTS synthesis failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get idle timeout in milliseconds
   */
  getIdleTimeout(): number {
    return this.IDLE_TIMEOUT_MS;
  }

  /**
   * Check if session is idle
   */
  async isSessionIdle(sessionId: string): Promise<boolean> {
    const state = await this.stateManager.loadState(sessionId);
    
    if (!state) {
      return true;
    }

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - state.lastActivity.getTime();
    
    return timeSinceLastActivity > this.IDLE_TIMEOUT_MS;
  }

  /**
   * Handle idle timeout for a session
   */
  async handleIdleTimeout(sessionId: string): Promise<AudioBuffer | null> {
    try {
      const isIdle = await this.isSessionIdle(sessionId);
      
      if (!isIdle) {
        return null;
      }

      logger.info('Session idle timeout detected', { sessionId });

      const timeoutMessage = 'Are you still there? Let me know if you need help finding product prices.';
      
      await this.stateManager.addMessage(sessionId, 'assistant', timeoutMessage);
      
      const audioResponse = await this.ttsService.synthesize(timeoutMessage);
      
      return audioResponse;
    } catch (error) {
      logger.error('Failed to handle idle timeout', { sessionId, error });
      return null;
    }
  }
}
