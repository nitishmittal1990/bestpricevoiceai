# Implementation Plan

- [x] 1. Set up project structure and configuration
  - Create TypeScript project with proper tsconfig.json
  - Set up package.json with required dependencies (ElevenLabs SDK, Anthropic SDK or OpenAI SDK, SerpAPI client, Tavily client, Express)
  - Create environment configuration for API keys (ElevenLabs, LLM, Search APIs)
  - Set up directory structure: src/services, src/models, src/utils, src/config
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement core data models and types
  - [x] 2.1 Create TypeScript interfaces for data models
    - Write ProductQuery, Specifications, SearchResult, ComparisonResult interfaces
    - Create ConversationState, SessionState, Message types
    - Define ProductCategory enum and ConversationState enum
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 4.1_
  
  - [x] 2.2 Create validation utilities for data models
    - Write validation functions for ProductQuery completeness
    - Implement specification relevance validation by product category
    - Create price and currency validation utilities
    - _Requirements: 2.3, 3.2_

- [x] 3. Implement Speech-to-Text service
  - [x] 3.1 Create STTService class with ElevenLabs Speech-to-Text integration
    - Implement transcribe() method with audio buffer handling
    - Add support for multiple audio formats (WAV, MP3, WebM)
    - Implement confidence scoring and language detection
    - Add error handling for low confidence and service failures
    - Configure ElevenLabs API client with proper authentication
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 3.2 Add streaming transcription support
    - Implement streamTranscribe() for real-time audio processing
    - Add chunked audio handling for lower latency
    - _Requirements: 1.1_

- [-] 4. Implement Text-to-Speech service
  - [x] 4.1 Create TTSService class with ElevenLabs TTS integration
    - Implement synthesize() method for text-to-audio conversion
    - Add voice selection from ElevenLabs voice library (choose natural Indian English voice)
    - Configure audio format options (MP3, WAV)
    - Implement proper pronunciation for Indian currency (₹) and platform names
    - Add error handling and retry logic
    - Configure ElevenLabs API client with proper authentication
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.2 Implement response caching for common phrases
    - Create cache layer for frequently used TTS responses
    - Add cache invalidation logic
    - _Requirements: 5.1_

- [x] 5. Implement Search Tool service
  - [x] 5.1 Create SearchTool class with SerpAPI integration
    - Implement searchProductPrices() method with query construction
    - Add support for Indian e-commerce platforms (Flipkart, Amazon India, Myntra, etc.)
    - Configure SerpAPI for Google Shopping and e-commerce searches
    - Implement parallel search across multiple platforms
    - Parse and structure search results into SearchResult objects
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 5.2 Implement specification matching and validation
    - Create verifySpecificationMatch() to compare product specs
    - Filter results to only include exact specification matches
    - Calculate match confidence scores
    - _Requirements: 3.2, 3.5_
  
  - [x] 5.3 Add result ranking and filtering
    - Implement price-based ranking (lowest to highest)
    - Filter out out-of-stock products
    - Identify lowest price per platform
    - _Requirements: 3.4, 3.5, 3.6, 4.1_
  
  - [x] 5.4 Implement fallback search provider (Tavily API)
    - Add Tavily API as secondary search option
    - Implement automatic fallback on SerpAPI failure
    - _Requirements: 6.1_

- [x] 6. Implement LLM Agent service
  - [x] 6.1 Create LLMAgent class with Claude/GPT-4 integration
    - Implement processUserMessage() with conversation context
    - Create system prompt for shopping assistant role
    - Add conversation history management
    - _Requirements: 2.1, 7.1, 7.2_
  
  - [x] 6.2 Implement product information extraction
    - Create extractProductInfo() to parse user queries
    - Extract product name, brand, and mentioned specifications
    - Identify product category automatically
    - _Requirements: 1.2, 2.1_
  
  - [x] 6.3 Implement specification gathering logic
    - Create validateSpecifications() to check for missing specs
    - Generate clarifying questions for incomplete specifications
    - Implement category-specific specification requirements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 6.4 Implement function calling for tools
    - Define search_product_prices function tool
    - Define clarify_specifications function tool
    - Implement tool execution and result processing
    - _Requirements: 3.1, 2.2_
  
  - [x] 6.5 Implement result comparison and summary generation
    - Create logic to identify lowest price and top 3 options
    - Generate natural language summaries of price comparisons
    - Detect minimal price differences (< 5%) and mention to user
    - Format responses for voice output (concise, clear)
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [ ] 7. Implement Conversation State Manager
  - [x] 7.1 Create StateManager class with in-memory storage
    - Implement saveState() and loadState() methods
    - Create session lifecycle management (create, retrieve, delete)
    - Add session expiration and cleanup logic
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 7.2 Implement conversation context tracking
    - Store and retrieve conversation history
    - Track current product query state
    - Maintain specification gathering progress
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Implement Conversation Orchestrator
  - [x] 8.1 Create ConversationOrchestrator class
    - Implement handleUserInput() to coordinate all services
    - Create startSession() and endSession() methods
    - Add session state retrieval
    - _Requirements: All requirements_
  
  - [x] 8.2 Implement conversation flow coordination
    - Route audio input through STT service
    - Pass transcribed text to LLM agent with context
    - Execute search when specifications are complete
    - Route LLM responses through TTS service
    - Update session state after each interaction
    - _Requirements: 1.1, 1.2, 2.5, 3.1, 5.1, 7.1_
  
  - [x] 8.3 Implement error handling and recovery
    - Add retry logic for STT failures with user prompts
    - Implement search failure handling with fallback
    - Add TTS fallback mechanisms
    - Handle network errors gracefully
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 8.4 Implement conversation exit and idle detection
    - Detect exit phrases ("goodbye", "exit", "stop")
    - Implement idle timeout (30 seconds) with user prompt
    - Clean up session on exit
    - _Requirements: 7.4, 7.5_

- [ ] 9. Create API endpoints and server
  - [ ] 9.1 Set up Express server with routes
    - Create POST /api/session/start endpoint
    - Create POST /api/session/:id/message endpoint (accepts audio)
    - Create DELETE /api/session/:id endpoint
    - Create GET /api/session/:id/state endpoint
    - _Requirements: All requirements_
  
  - [ ] 9.2 Implement request/response handling
    - Add multipart form data handling for audio uploads
    - Implement audio format validation
    - Return audio responses with proper content-type
    - Add request logging and error responses
    - _Requirements: 1.1, 5.1_
  
  - [ ] 9.3 Add middleware for security and validation
    - Implement API key validation
    - Add rate limiting per session
    - Add request size limits for audio uploads
    - Implement CORS configuration
    - _Requirements: 6.1_

- [ ] 10. Create configuration and environment management
  - [ ] 10.1 Implement configuration loader
    - Create config module to load environment variables
    - Add validation for required API keys (ElevenLabs, Anthropic/OpenAI, SerpAPI, Tavily)
    - Set default values for optional configurations
    - _Requirements: All requirements_
  
  - [ ] 10.2 Create platform configuration
    - Define list of supported Indian e-commerce platforms
    - Add platform-specific search query templates
    - Configure platform priority for search
    - _Requirements: 3.1_

- [ ] 11. Implement logging and monitoring
  - [ ] 11.1 Set up structured logging
    - Create logger utility with Winston or similar
    - Add log levels (info, warn, error)
    - Log all API calls and responses
    - Log conversation flow transitions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 11.2 Add performance monitoring
    - Track STT latency
    - Track LLM response time
    - Track search API response time
    - Track TTS latency
    - Track end-to-end response time
    - _Requirements: All requirements (performance target < 2s)_

- [ ] 12. Create example client and documentation
  - [ ] 12.1 Create simple test client
    - Write Node.js script to test voice agent flow
    - Add example audio file for testing
    - Create script to simulate multi-turn conversation
    - _Requirements: All requirements_
  
  - [ ] 12.2 Write API documentation
    - Document all API endpoints with request/response examples
    - Create setup guide with API key configuration
    - Add example conversation flows
    - Document supported platforms and product categories
    - _Requirements: All requirements_
  
  - [ ] 12.3 Create README with quick start guide
    - Add installation instructions
    - Document environment variable setup
    - Provide example usage
    - Add troubleshooting section
    - _Requirements: All requirements_
