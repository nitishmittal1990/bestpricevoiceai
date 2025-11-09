import { ConversationOrchestrator } from '../src/services/ConversationOrchestrator';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Demo script showing how to use the ConversationOrchestrator
 * 
 * This demonstrates the complete conversation flow:
 * 1. Start a session
 * 2. Handle user audio input
 * 3. Get audio response
 * 4. End session
 */

async function main() {
  try {
    logger.info('=== Conversation Orchestrator Demo ===');

    // Initialize the orchestrator
    // In production, you would inject configured services
    const orchestrator = new ConversationOrchestrator();

    // Step 1: Start a new session
    logger.info('Starting new conversation session...');
    const sessionId = await orchestrator.startSession();
    logger.info(`Session started with ID: ${sessionId}`);

    // Step 2: Get session state
    const initialState = await orchestrator.getSessionState(sessionId);
    logger.info('Initial session state:', {
      conversationState: initialState?.conversationState,
      status: initialState?.status,
      messageCount: initialState?.conversationHistory.length,
    });

    // Step 3: Simulate user audio input
    // In a real application, this would be actual audio data from a microphone
    // For demo purposes, we'll use a placeholder buffer
    logger.info('\n--- Simulating User Input ---');
    logger.info('Note: In production, you would provide actual audio data');
    logger.info('Example: User says "I want to buy a MacBook Pro"');

    // Load a sample audio file if available, otherwise use placeholder
    let audioInput: Buffer;
    const sampleAudioPath = path.join(__dirname, 'sample-audio.wav');
    
    if (fs.existsSync(sampleAudioPath)) {
      logger.info(`Loading sample audio from: ${sampleAudioPath}`);
      audioInput = fs.readFileSync(sampleAudioPath);
    } else {
      logger.info('No sample audio file found, using placeholder');
      logger.info('To test with real audio, place a WAV file at: examples/sample-audio.wav');
      audioInput = Buffer.from('placeholder audio data');
    }

    // Step 4: Handle user input
    // This will:
    // - Transcribe the audio to text
    // - Process with LLM agent
    // - Execute any actions (search, clarify, etc.)
    // - Generate audio response
    logger.info('\nProcessing user input...');
    
    try {
      const audioResponse = await orchestrator.handleUserInput(sessionId, audioInput);
      
      logger.info('Received audio response:', {
        format: audioResponse.format,
        size: audioResponse.data.length,
        duration: audioResponse.duration,
      });

      // Save the response audio to a file
      const outputPath = path.join(__dirname, 'response-audio.mp3');
      fs.writeFileSync(outputPath, audioResponse.data);
      logger.info(`Audio response saved to: ${outputPath}`);
    } catch (error) {
      logger.error('Error processing user input:', error);
      logger.info('This is expected in demo mode without real audio/API keys');
    }

    // Step 5: Check session state after interaction
    const updatedState = await orchestrator.getSessionState(sessionId);
    if (updatedState) {
      logger.info('\nUpdated session state:', {
        conversationState: updatedState.conversationState,
        status: updatedState.status,
        messageCount: updatedState.conversationHistory.length,
      });

      // Show conversation history
      if (updatedState.conversationHistory.length > 0) {
        logger.info('\nConversation history:');
        updatedState.conversationHistory.forEach((msg, index) => {
          logger.info(`  ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}...`);
        });
      }
    }

    // Step 6: Check if session is idle
    const isIdle = await orchestrator.isSessionIdle(sessionId);
    logger.info(`\nSession idle status: ${isIdle}`);

    if (isIdle) {
      logger.info('Handling idle timeout...');
      const timeoutResponse = await orchestrator.handleIdleTimeout(sessionId);
      if (timeoutResponse) {
        logger.info('Idle timeout message sent');
      }
    }

    // Step 7: End the session
    logger.info('\nEnding conversation session...');
    await orchestrator.endSession(sessionId);
    logger.info('Session ended successfully');

    // Verify session is deleted
    const deletedState = await orchestrator.getSessionState(sessionId);
    logger.info(`Session state after deletion: ${deletedState ? 'Still exists' : 'Deleted'}`);

    logger.info('\n=== Demo Complete ===');
    logger.info('\nKey Features Demonstrated:');
    logger.info('✓ Session lifecycle management (start, get state, end)');
    logger.info('✓ Audio input processing (STT → LLM → TTS)');
    logger.info('✓ Conversation state tracking');
    logger.info('✓ Idle detection and timeout handling');
    logger.info('✓ Error handling and recovery');

    logger.info('\nNext Steps:');
    logger.info('1. Configure API keys in .env file');
    logger.info('2. Provide real audio input for testing');
    logger.info('3. Integrate with your application (web server, voice interface, etc.)');

  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };
