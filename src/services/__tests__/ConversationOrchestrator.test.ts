import { ConversationOrchestrator } from '../ConversationOrchestrator';
import { STTService } from '../STTService';
import { TTSService } from '../TTSService';
import { LLMAgent } from '../LLMAgent';
import { SearchTool } from '../SearchTool';
import { StateManager } from '../StateManager';
import { ConversationState } from '../../types';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock all services
jest.mock('../STTService');
jest.mock('../TTSService');
jest.mock('../LLMAgent');
jest.mock('../SearchTool');
jest.mock('../StateManager');

describe('ConversationOrchestrator', () => {
    let orchestrator: ConversationOrchestrator;
    let mockSTTService: jest.Mocked<STTService>;
    let mockTTSService: jest.Mocked<TTSService>;
    let mockLLMAgent: jest.Mocked<LLMAgent>;
    let mockSearchTool: jest.Mocked<SearchTool>;
    let mockStateManager: jest.Mocked<StateManager>;

    beforeEach(() => {
        // Create mock instances
        mockSTTService = new STTService() as jest.Mocked<STTService>;
        mockTTSService = new TTSService() as jest.Mocked<TTSService>;
        mockLLMAgent = new LLMAgent() as jest.Mocked<LLMAgent>;
        mockSearchTool = new SearchTool() as jest.Mocked<SearchTool>;
        mockStateManager = new StateManager() as jest.Mocked<StateManager>;

        // Create orchestrator with mocked services
        orchestrator = new ConversationOrchestrator(
            mockSTTService,
            mockTTSService,
            mockLLMAgent,
            mockSearchTool,
            mockStateManager
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startSession', () => {
        it('should create a new session and return session ID', async () => {
            mockStateManager.createSession = jest.fn().mockReturnValue({
                sessionId: 'test-session-id',
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: new Date(),
                status: 'active',
            });

            const sessionId = await orchestrator.startSession();

            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe('string');
            expect(mockStateManager.createSession).toHaveBeenCalledWith(sessionId);
        });

        it('should handle errors when creating session', async () => {
            mockStateManager.createSession = jest.fn().mockImplementation(() => {
                throw new Error('Failed to create session');
            });

            await expect(orchestrator.startSession()).rejects.toThrow('Failed to start session');
        });
    });

    describe('endSession', () => {
        it('should end session and clean up state', async () => {
            const sessionId = 'test-session-id';

            mockStateManager.updateSessionStatus = jest.fn().mockResolvedValue(undefined);
            mockStateManager.updateConversationState = jest.fn().mockResolvedValue(undefined);
            mockStateManager.deleteState = jest.fn().mockResolvedValue(undefined);

            await orchestrator.endSession(sessionId);

            expect(mockStateManager.updateSessionStatus).toHaveBeenCalledWith(sessionId, 'completed');
            expect(mockStateManager.updateConversationState).toHaveBeenCalledWith(sessionId, ConversationState.ENDED);
            expect(mockStateManager.deleteState).toHaveBeenCalledWith(sessionId);
        });

        it('should handle errors when ending session', async () => {
            const sessionId = 'test-session-id';

            mockStateManager.updateSessionStatus = jest.fn().mockRejectedValue(new Error('State update failed'));

            await expect(orchestrator.endSession(sessionId)).rejects.toThrow('Failed to end session');
        });
    });

    describe('getSessionState', () => {
        it('should return session state when session exists', async () => {
            const sessionId = 'test-session-id';
            const mockState = {
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: new Date(),
                status: 'active' as const,
            };

            mockStateManager.loadState = jest.fn().mockResolvedValue(mockState);

            const state = await orchestrator.getSessionState(sessionId);

            expect(state).toEqual(mockState);
            expect(mockStateManager.loadState).toHaveBeenCalledWith(sessionId);
        });

        it('should return null when session does not exist', async () => {
            const sessionId = 'non-existent-session';

            mockStateManager.loadState = jest.fn().mockResolvedValue(null);

            const state = await orchestrator.getSessionState(sessionId);

            expect(state).toBeNull();
        });
    });

    describe('handleUserInput', () => {
        const sessionId = 'test-session-id';
        const audioInput = Buffer.from('test audio data');

        beforeEach(() => {
            // Setup common mocks
            mockStateManager.loadState = jest.fn().mockResolvedValue({
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: new Date(),
                status: 'active',
            });
            mockStateManager.updateSessionStatus = jest.fn().mockResolvedValue(undefined);
            mockStateManager.addMessage = jest.fn().mockResolvedValue(undefined);
            mockStateManager.updateConversationState = jest.fn().mockResolvedValue(undefined);
        });

        it('should handle user input and return audio response', async () => {
            const transcription = {
                text: 'I want to buy a MacBook Pro',
                confidence: 0.95,
                language: 'en',
                duration: 1000,
            };

            const agentResponse = {
                message: 'Great! Which model would you like?',
                requiresUserInput: true,
                conversationState: ConversationState.GATHERING_SPECS,
            };

            const audioResponse = {
                data: Buffer.from('audio response'),
                format: 'mp3',
                duration: 2000,
            };

            mockSTTService.transcribe = jest.fn().mockResolvedValue(transcription);
            mockSTTService.isConfidenceAcceptable = jest.fn().mockReturnValue(true);
            mockLLMAgent.processUserMessage = jest.fn().mockResolvedValue(agentResponse);
            mockTTSService.synthesize = jest.fn().mockResolvedValue(audioResponse);

            const result = await orchestrator.handleUserInput(sessionId, audioInput);

            expect(result).toEqual(audioResponse);
            expect(mockSTTService.transcribe).toHaveBeenCalledWith(audioInput);
            expect(mockLLMAgent.processUserMessage).toHaveBeenCalled();
            expect(mockTTSService.synthesize).toHaveBeenCalledWith(agentResponse.message);
            expect(mockStateManager.addMessage).toHaveBeenCalledTimes(2); // User and assistant messages
        });

        it('should handle exit phrases', async () => {
            const transcription = {
                text: 'goodbye',
                confidence: 0.95,
                language: 'en',
                duration: 500,
            };

            const audioResponse = {
                data: Buffer.from('goodbye audio'),
                format: 'mp3',
                duration: 1000,
            };

            mockSTTService.transcribe = jest.fn().mockResolvedValue(transcription);
            mockSTTService.isConfidenceAcceptable = jest.fn().mockReturnValue(true);
            mockTTSService.synthesize = jest.fn().mockResolvedValue(audioResponse);
            mockStateManager.updateSessionStatus = jest.fn().mockResolvedValue(undefined);
            mockStateManager.updateConversationState = jest.fn().mockResolvedValue(undefined);
            mockStateManager.deleteState = jest.fn().mockResolvedValue(undefined);

            const result = await orchestrator.handleUserInput(sessionId, audioInput);

            expect(result).toEqual(audioResponse);
            expect(mockStateManager.deleteState).toHaveBeenCalledWith(sessionId);
        });

        it('should handle transcription errors with retry', async () => {
            mockSTTService.transcribe = jest.fn()
                .mockRejectedValueOnce(new Error('Transcription failed'))
                .mockResolvedValueOnce({
                    text: 'Test message',
                    confidence: 0.9,
                    language: 'en',
                    duration: 1000,
                });
            mockSTTService.isConfidenceAcceptable = jest.fn().mockReturnValue(true);
            mockLLMAgent.processUserMessage = jest.fn().mockResolvedValue({
                message: 'Response',
                requiresUserInput: true,
            });
            mockTTSService.synthesize = jest.fn().mockResolvedValue({
                data: Buffer.from('audio'),
                format: 'mp3',
                duration: 1000,
            });

            const result = await orchestrator.handleUserInput(sessionId, audioInput);

            expect(result).toBeDefined();
            expect(mockSTTService.transcribe).toHaveBeenCalledTimes(2);
        });

        it('should handle search action', async () => {
            const transcription = {
                text: 'Find MacBook Pro 14 inch with M3 Pro and 18GB RAM',
                confidence: 0.95,
                language: 'en',
                duration: 2000,
            };

            const agentResponse = {
                message: '',
                action: {
                    type: 'search',
                    parameters: {
                        productName: 'MacBook Pro 14 inch',
                        specifications: { processor: 'M3 Pro', ram: '18GB' },
                    },
                },
                requiresUserInput: true,
                conversationState: ConversationState.SEARCHING,
            };

            const searchResults = [
                {
                    platform: 'Flipkart',
                    productName: 'MacBook Pro 14"',
                    price: 199900,
                    currency: 'INR',
                    url: 'https://flipkart.com/test',
                    availability: 'in_stock' as const,
                    specifications: { processor: 'M3 Pro', ram: '18GB' },
                    matchConfidence: 0.9,
                },
            ];

            mockSTTService.transcribe = jest.fn().mockResolvedValue(transcription);
            mockSTTService.isConfidenceAcceptable = jest.fn().mockReturnValue(true);
            mockLLMAgent.processUserMessage = jest.fn().mockResolvedValue(agentResponse);
            mockSearchTool.searchProductPrices = jest.fn().mockResolvedValue(searchResults);
            mockSearchTool.filterAndRankResults = jest.fn().mockReturnValue(searchResults);
            mockLLMAgent.compareAndSummarize = jest.fn().mockResolvedValue('Found best price on Flipkart');
            mockTTSService.synthesize = jest.fn().mockResolvedValue({
                data: Buffer.from('audio'),
                format: 'mp3',
                duration: 3000,
            });
            mockStateManager.updateProductQuery = jest.fn().mockResolvedValue(undefined);

            const result = await orchestrator.handleUserInput(sessionId, audioInput);

            expect(result).toBeDefined();
            expect(mockSearchTool.searchProductPrices).toHaveBeenCalled();
            expect(mockLLMAgent.compareAndSummarize).toHaveBeenCalled();
        });
    });

    describe('isSessionIdle', () => {
        it('should return true for idle session', async () => {
            const sessionId = 'test-session-id';
            const oldDate = new Date(Date.now() - 60000); // 60 seconds ago

            mockStateManager.loadState = jest.fn().mockResolvedValue({
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: oldDate,
                status: 'waiting',
            });

            const isIdle = await orchestrator.isSessionIdle(sessionId);

            expect(isIdle).toBe(true);
        });

        it('should return false for active session', async () => {
            const sessionId = 'test-session-id';
            const recentDate = new Date(Date.now() - 5000); // 5 seconds ago

            mockStateManager.loadState = jest.fn().mockResolvedValue({
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: recentDate,
                status: 'active',
            });

            const isIdle = await orchestrator.isSessionIdle(sessionId);

            expect(isIdle).toBe(false);
        });

        it('should return true for non-existent session', async () => {
            const sessionId = 'non-existent';

            mockStateManager.loadState = jest.fn().mockResolvedValue(null);

            const isIdle = await orchestrator.isSessionIdle(sessionId);

            expect(isIdle).toBe(true);
        });
    });

    describe('handleIdleTimeout', () => {
        it('should send timeout message for idle session', async () => {
            const sessionId = 'test-session-id';
            const oldDate = new Date(Date.now() - 60000);

            mockStateManager.loadState = jest.fn().mockResolvedValue({
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.FOLLOW_UP,
                lastActivity: oldDate,
                status: 'waiting',
            });
            mockStateManager.addMessage = jest.fn().mockResolvedValue(undefined);
            mockTTSService.synthesize = jest.fn().mockResolvedValue({
                data: Buffer.from('timeout audio'),
                format: 'mp3',
                duration: 2000,
            });

            const result = await orchestrator.handleIdleTimeout(sessionId);

            expect(result).toBeDefined();
            expect(mockStateManager.addMessage).toHaveBeenCalled();
            expect(mockTTSService.synthesize).toHaveBeenCalled();
        });

        it('should return null for active session', async () => {
            const sessionId = 'test-session-id';
            const recentDate = new Date(Date.now() - 5000);

            mockStateManager.loadState = jest.fn().mockResolvedValue({
                sessionId,
                conversationHistory: [],
                conversationState: ConversationState.INITIAL,
                lastActivity: recentDate,
                status: 'active',
            });

            const result = await orchestrator.handleIdleTimeout(sessionId);

            expect(result).toBeNull();
        });
    });

    describe('getIdleTimeout', () => {
        it('should return idle timeout value', () => {
            const timeout = orchestrator.getIdleTimeout();

            expect(timeout).toBe(30000); // 30 seconds
        });
    });
});
