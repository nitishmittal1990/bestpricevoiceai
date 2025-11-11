import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config';
import {
  ProductQuery,
  SearchResult,
  ConversationState,
  Message,
  ProductCategory,
  Specifications,
} from '../types';
import { logger, logApiCall, logApiResponse, PerformanceTimer } from '../utils/logger';

/**
 * Context for LLM conversation processing
 */
export interface ConversationContext {
  history: Message[];
  currentProduct?: ProductQuery;
  searchResults?: SearchResult[];
  conversationState: ConversationState;
}

/**
 * Agent action types
 */
export type AgentActionType = 'search' | 'clarify' | 'compare' | 'end';

/**
 * Agent action with parameters
 */
export interface AgentAction {
  type: AgentActionType;
  parameters?: Record<string, any>;
}

/**
 * Response from LLM agent
 */
export interface AgentResponse {
  message: string;
  action?: AgentAction;
  requiresUserInput: boolean;
  updatedProduct?: ProductQuery;
  conversationState?: ConversationState;
}

/**
 * Product information extraction result
 */
export interface ProductInfo {
  productName?: string;
  category?: ProductCategory;
  brand?: string;
  specifications: Specifications;
}

/**
 * Specification validation result
 */
export interface ValidationResult {
  isComplete: boolean;
  missingSpecs: string[];
  clarifyingQuestion?: string;
}

/**
 * Tool definition for function calling
 */
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * LLM Agent service for processing user messages and orchestrating tools
 */
export class LLMAgent {
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private provider: 'anthropic' | 'openai';
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.provider = config.llm.provider;
    this.model = config.llm.model;
    this.maxTokens = config.llm.maxTokens;
    this.temperature = config.llm.temperature;

    if (this.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: config.llm.apiKey,
      });
    } else if (this.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: config.llm.apiKey,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }

    logger.info('LLMAgent initialized', {
      provider: this.provider,
      model: this.model,
    });
  }

  /**
   * System prompt for the shopping assistant
   */
  private getSystemPrompt(): string {
    return `You are a helpful voice-based shopping assistant that helps users find the best prices for products across multiple e-commerce platforms in India.

Your responsibilities:
1. Extract product information from user queries (product name, brand, specifications)
2. Ask clarifying questions to gather all necessary specifications before searching
3. Use the search_product_prices tool to find prices across platforms
4. Compare results and present the best options clearly and concisely
5. Format responses for voice output - be conversational, clear, and concise

Important guidelines:
- Always confirm all specifications before searching (model, RAM, storage, color, size, etc.)
- Only compare products with matching specifications
- Present prices in Indian Rupees (₹)
- Mention the top 3 lowest-priced options when available
- If price differences are less than 5%, mention this to the user
- Be conversational and natural - you're speaking, not writing
- Keep responses concise for voice interaction
- Ask one question at a time when gathering specifications
- Recognize when the user wants to end the conversation (goodbye, exit, stop, etc.)

Supported platforms: Flipkart, Amazon India, Myntra, Meesho, Instamart, Blinkit, Zepto, Snapdeal, Tata Cliq, Croma, Reliance Digital, Vijay Sales

Product categories you handle: laptops, phones, tablets, desktops, monitors, headphones, cameras, and other electronics.`;
  }

  /**
   * Get tools available for function calling (Anthropic format)
   */
  private getTools(): Tool[] {
    return [
      {
        name: 'search_product_prices',
        description: 'Search for product prices across multiple e-commerce platforms. Only call this when you have all necessary specifications for the product.',
        input_schema: {
          type: 'object',
          properties: {
            productName: {
              type: 'string',
              description: 'The full product name including brand and model',
            },
            category: {
              type: 'string',
              enum: Object.values(ProductCategory),
              description: 'The product category',
            },
            brand: {
              type: 'string',
              description: 'The product brand name',
            },
            specifications: {
              type: 'object',
              description: 'Product specifications as key-value pairs (e.g., {"ram": "16GB", "storage": "512GB", "processor": "M3 Pro"})',
            },
            platforms: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional list of specific platforms to search. If not provided, searches all supported platforms.',
            },
          },
          required: ['productName', 'specifications'],
        },
      },
      {
        name: 'clarify_specifications',
        description: 'Ask the user for missing product specifications. Use this when you need more information before searching.',
        input_schema: {
          type: 'object',
          properties: {
            missingSpecs: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of specification names that are missing',
            },
            productCategory: {
              type: 'string',
              description: 'The product category to determine which specs are needed',
            },
            question: {
              type: 'string',
              description: 'The clarifying question to ask the user (should be conversational and voice-friendly)',
            },
          },
          required: ['missingSpecs', 'question'],
        },
      },
    ];
  }

  /**
   * Convert tools to OpenAI function format
   */
  private getOpenAIFunctions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const tools = this.getTools();
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  /**
   * Process user message with conversation context
   */
  async processUserMessage(
    message: string,
    context: ConversationContext
  ): Promise<AgentResponse> {
    const timer = new PerformanceTimer('LLMAgent.processUserMessage', undefined, {
      messageLength: message.length,
      conversationState: context.conversationState,
    });

    const providerName = this.provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI';
    
    try {
      logApiCall(providerName, 'processUserMessage', {
        messageLength: message.length,
        historyLength: context.history.length,
        conversationState: context.conversationState,
      });

      // Add context about current product if available
      let systemPrompt = this.getSystemPrompt();
      if (context.currentProduct) {
        systemPrompt += `\n\nCurrent product being discussed: ${JSON.stringify(context.currentProduct)}`;
      }
      if (context.searchResults && context.searchResults.length > 0) {
        systemPrompt += `\n\nSearch results available: ${context.searchResults.length} results found`;
      }

      if (this.provider === 'anthropic') {
        // Anthropic API call
        const messages: Anthropic.MessageParam[] = [
          ...context.history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user' as const,
            content: message,
          },
        ];

        const response = await this.anthropicClient!.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: systemPrompt,
          messages,
          tools: this.getTools(),
        });

        const duration = timer.end();
        logApiResponse(providerName, 'processUserMessage', true, duration);

        logger.info('Received LLM response', {
          stopReason: response.stop_reason,
          contentBlocks: response.content.length,
        });

        return this.processAnthropicResponse(response, context);
      } else {
        // OpenAI API call
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...context.history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user',
            content: message,
          },
        ];

        const response = await this.openaiClient!.chat.completions.create({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          messages,
          tools: this.getOpenAIFunctions(),
          tool_choice: 'auto',
        });

        const duration = timer.end();
        logApiResponse(providerName, 'processUserMessage', true, duration);

        logger.info('Received LLM response', {
          finishReason: response.choices[0]?.finish_reason,
          messageRole: response.choices[0]?.message.role,
        });

        return this.processOpenAIResponse(response, context);
      }
    } catch (error) {
      const duration = timer.end();
      logApiResponse(
        providerName,
        'processUserMessage',
        false,
        duration,
        error instanceof Error ? error : new Error('Unknown error')
      );
      throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Anthropic response and extract action/message
   */
  private processAnthropicResponse(
    response: Anthropic.Message,
    _context: ConversationContext
  ): AgentResponse {
    let message = '';
    let action: AgentAction | undefined;
    let requiresUserInput = true;
    let updatedProduct: ProductQuery | undefined;
    let conversationState: ConversationState | undefined;

    // Process content blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        message += block.text;
      } else if (block.type === 'tool_use') {
        // Handle tool calls
        action = this.processAnthropicToolCall(block, _context);
        requiresUserInput = action.type === 'clarify';
      }
    }

    return this.buildAgentResponse(message, action, requiresUserInput, updatedProduct, conversationState);
  }

  /**
   * Process OpenAI response and extract action/message
   */
  private processOpenAIResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    _context: ConversationContext
  ): AgentResponse {
    const choice = response.choices[0];
    if (!choice) {
      return {
        message: 'I apologize, but I did not receive a valid response.',
        requiresUserInput: true,
      };
    }

    const messageContent = choice.message.content || '';
    let action: AgentAction | undefined;
    let requiresUserInput = true;
    let updatedProduct: ProductQuery | undefined;
    let conversationState: ConversationState | undefined;

    // Check for tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      action = this.processOpenAIToolCall(toolCall, _context);
      requiresUserInput = action.type === 'clarify';
    }

    return this.buildAgentResponse(messageContent, action, requiresUserInput, updatedProduct, conversationState);
  }

  /**
   * Build agent response from components
   */
  private buildAgentResponse(
    message: string,
    action: AgentAction | undefined,
    requiresUserInput: boolean,
    updatedProduct: ProductQuery | undefined,
    conversationState: ConversationState | undefined
  ): AgentResponse {
    // Determine conversation state based on action
    if (action) {
      switch (action.type) {
        case 'search':
          conversationState = ConversationState.SEARCHING;
          requiresUserInput = false;
          break;
        case 'clarify':
          conversationState = ConversationState.GATHERING_SPECS;
          requiresUserInput = true;
          break;
        case 'compare':
          conversationState = ConversationState.PRESENTING_RESULTS;
          requiresUserInput = true;
          break;
        case 'end':
          conversationState = ConversationState.ENDED;
          requiresUserInput = false;
          break;
      }
    }

    return {
      message: message.trim(),
      action,
      requiresUserInput,
      updatedProduct,
      conversationState,
    };
  }

  /**
   * Process Anthropic tool call
   */
  private processAnthropicToolCall(
    toolUse: Anthropic.ToolUseBlock,
    _context: ConversationContext
  ): AgentAction {
    const { name, input } = toolUse;
    return this.processToolCall(name, input as Record<string, any>);
  }

  /**
   * Process OpenAI tool call
   */
  private processOpenAIToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
    _context: ConversationContext
  ): AgentAction {
    // Type guard to ensure we have a function tool call
    if (toolCall.type !== 'function' || !('function' in toolCall)) {
      throw new Error('Invalid tool call type');
    }
    
    const name = toolCall.function.name;
    let input: Record<string, any> = {};
    try {
      input = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      logger.warn('Failed to parse tool call arguments', { error, arguments: toolCall.function.arguments });
    }
    return this.processToolCall(name, input);
  }

  /**
   * Process tool call from LLM (common logic)
   */
  private processToolCall(
    name: string,
    input: Record<string, any>
  ): AgentAction {
    logger.info('Processing tool call', { toolName: name, input });

    switch (name) {
      case 'search_product_prices':
        return {
          type: 'search',
          parameters: input as Record<string, any>,
        };

      case 'clarify_specifications':
        return {
          type: 'clarify',
          parameters: input as Record<string, any>,
        };

      default:
        logger.warn('Unknown tool call', { toolName: name });
        return {
          type: 'clarify',
          parameters: { question: 'I need more information to help you.' },
        };
    }
  }

  /**
   * Extract product information from user query
   * Uses LLM to parse natural language and identify product details
   */
  async extractProductInfo(message: string): Promise<ProductInfo> {
    try {
      logger.info('Extracting product info from message', {
        messageLength: message.length,
      });

      const extractionPrompt = `Extract product information from the following user query. Identify:
1. Product name (full name if mentioned)
2. Brand name (if mentioned)
3. Product category (laptop, phone, tablet, desktop, monitor, headphones, camera, or other)
4. Any specifications mentioned (RAM, storage, processor, color, size, model, etc.)

User query: "${message}"

Respond in JSON format:
{
  "productName": "extracted product name or null",
  "brand": "extracted brand or null",
  "category": "category or null",
  "specifications": {
    "key": "value"
  }
}

Only include fields that are explicitly mentioned or can be clearly inferred. Use null for missing information.`;

      let responseText = '';
      if (this.provider === 'anthropic') {
        const response = await this.anthropicClient!.messages.create({
          model: this.model,
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent extraction
          messages: [
            {
              role: 'user',
              content: extractionPrompt,
            },
          ],
        });

        // Extract text response
        for (const block of response.content) {
          if (block.type === 'text') {
            responseText += block.text;
          }
        }
      } else {
        const response = await this.openaiClient!.chat.completions.create({
          model: this.model,
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent extraction
          messages: [
            {
              role: 'user',
              content: extractionPrompt,
            },
          ],
        });

        responseText = response.choices[0]?.message.content || '';
      }

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Failed to extract JSON from response', { responseText });
        return { specifications: {} };
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Map category string to enum
      let category: ProductCategory | undefined;
      if (extracted.category) {
        const categoryLower = extracted.category.toLowerCase();
        category = Object.values(ProductCategory).find(
          (cat) => cat === categoryLower
        ) as ProductCategory | undefined;
      }

      const productInfo: ProductInfo = {
        productName: extracted.productName || undefined,
        brand: extracted.brand || undefined,
        category,
        specifications: extracted.specifications || {},
      };

      logger.info('Extracted product info', productInfo);

      return productInfo;
    } catch (error) {
      logger.error('Error extracting product info', { error });
      // Return empty info on error rather than throwing
      return { specifications: {} };
    }
  }

  /**
   * Get required specifications for a product category
   */
  private getRequiredSpecifications(category: ProductCategory): string[] {
    const specsByCategory: Record<ProductCategory, string[]> = {
      [ProductCategory.LAPTOP]: ['processor', 'ram', 'storage', 'screen_size'],
      [ProductCategory.PHONE]: ['model', 'storage', 'ram', 'color'],
      [ProductCategory.TABLET]: ['model', 'storage', 'screen_size'],
      [ProductCategory.DESKTOP]: ['processor', 'ram', 'storage'],
      [ProductCategory.MONITOR]: ['screen_size', 'resolution', 'refresh_rate'],
      [ProductCategory.HEADPHONES]: ['model', 'type'],
      [ProductCategory.CAMERA]: ['model', 'type', 'megapixels'],
      [ProductCategory.OTHER]: [],
    };

    return specsByCategory[category] || [];
  }

  /**
   * Validate product specifications and identify missing ones
   */
  async validateSpecifications(product: ProductQuery): Promise<ValidationResult> {
    try {
      logger.info('Validating specifications', {
        productName: product.productName,
        category: product.category,
        specsCount: Object.keys(product.specifications).length,
      });

      // If no category, we need to determine it first
      if (!product.category) {
        return {
          isComplete: false,
          missingSpecs: ['category'],
          clarifyingQuestion: `What type of product is the ${product.productName}? For example, is it a laptop, phone, tablet, or something else?`,
        };
      }

      // Get required specs for this category
      const requiredSpecs = this.getRequiredSpecifications(product.category);
      
      // Check which specs are missing
      const providedSpecs = Object.keys(product.specifications).map(k => k.toLowerCase());
      const missingSpecs = requiredSpecs.filter(
        (spec) => !providedSpecs.some(provided => 
          provided.includes(spec.replace('_', ' ')) || 
          spec.replace('_', ' ').includes(provided)
        )
      );

      if (missingSpecs.length === 0) {
        logger.info('All specifications complete');
        return {
          isComplete: true,
          missingSpecs: [],
        };
      }

      // Generate clarifying question using LLM
      const clarifyingQuestion = await this.generateClarifyingQuestion(
        product,
        missingSpecs
      );

      logger.info('Specifications incomplete', {
        missingSpecs,
        clarifyingQuestion,
      });

      return {
        isComplete: false,
        missingSpecs,
        clarifyingQuestion,
      };
    } catch (error) {
      logger.error('Error validating specifications', { error });
      throw new Error(`Failed to validate specifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a natural clarifying question for missing specifications
   */
  private async generateClarifyingQuestion(
    product: ProductQuery,
    missingSpecs: string[]
  ): Promise<string> {
    try {
      // Create a context-aware prompt
      const prompt = `You are a voice shopping assistant. Generate a natural, conversational question to ask the user about missing product specifications.

Product: ${product.productName}
Category: ${product.category}
Brand: ${product.brand || 'not specified'}
Current specifications: ${JSON.stringify(product.specifications)}
Missing specifications: ${missingSpecs.join(', ')}

Generate ONE clear, conversational question to ask about the MOST IMPORTANT missing specification. The question should:
- Be natural and voice-friendly
- Ask about only ONE specification at a time (the most important one)
- Provide examples or options when helpful
- Be concise and easy to understand when spoken

Respond with just the question, nothing else.`;

      let question = '';
      if (this.provider === 'anthropic') {
        const response = await this.anthropicClient!.messages.create({
          model: this.model,
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        // Extract text response
        for (const block of response.content) {
          if (block.type === 'text') {
            question += block.text;
          }
        }
      } else {
        const response = await this.openaiClient!.chat.completions.create({
          model: this.model,
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        question = response.choices[0]?.message.content || '';
      }

      return question.trim();
    } catch (error) {
      logger.error('Error generating clarifying question', { error });
      // Fallback to a generic question
      const specName = missingSpecs[0].replace('_', ' ');
      return `Could you tell me the ${specName} for the ${product.productName}?`;
    }
  }

  /**
   * Execute a tool based on the action
   * This method should be called by the orchestrator with the actual tool implementations
   */
  async executeToolAction(
    action: AgentAction,
    toolImplementations: {
      searchProductPrices?: (query: ProductQuery) => Promise<SearchResult[]>;
      clarifySpecifications?: (params: any) => Promise<string>;
    }
  ): Promise<ToolExecutionResult> {
    try {
      logger.info('Executing tool action', { actionType: action.type });

      switch (action.type) {
        case 'search': {
          if (!toolImplementations.searchProductPrices) {
            throw new Error('Search tool implementation not provided');
          }

          const params = action.parameters!;
          const query: ProductQuery = {
            productName: params.productName,
            category: params.category as ProductCategory,
            brand: params.brand,
            specifications: params.specifications || {},
            priceRange: params.priceRange,
          };

          const results = await toolImplementations.searchProductPrices(query);

          return {
            toolName: 'search_product_prices',
            success: true,
            result: results,
          };
        }

        case 'clarify': {
          // Clarification doesn't need external tool execution
          // The question is already in the action parameters
          return {
            toolName: 'clarify_specifications',
            success: true,
            result: action.parameters,
          };
        }

        case 'compare': {
          // Compare action is handled by the result comparison logic
          return {
            toolName: 'compare_results',
            success: true,
            result: action.parameters,
          };
        }

        case 'end': {
          // End action doesn't need tool execution
          return {
            toolName: 'end_conversation',
            success: true,
          };
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error('Error executing tool action', { error, action });
      return {
        toolName: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process tool execution result and generate follow-up response
   * This allows the LLM to see the tool results and respond appropriately
   */
  async processToolResult(
    toolResult: ToolExecutionResult,
    _originalMessage: string,
    _context: ConversationContext
  ): Promise<AgentResponse> {
    try {
      logger.info('Processing tool result', {
        toolName: toolResult.toolName,
        success: toolResult.success,
      });

      if (!toolResult.success) {
        // Handle tool execution failure
        return {
          message: `I encountered an error while ${toolResult.toolName === 'search_product_prices' ? 'searching for prices' : 'processing your request'}. ${toolResult.error || 'Please try again.'}`,
          requiresUserInput: true,
          conversationState: ConversationState.FOLLOW_UP,
        };
      }

      // For search results, we'll process them in the comparison logic
      if (toolResult.toolName === 'search_product_prices') {
        return {
          message: '', // Will be filled by comparison logic
          requiresUserInput: true,
          conversationState: ConversationState.PRESENTING_RESULTS,
        };
      }

      // For clarification, return the question
      if (toolResult.toolName === 'clarify_specifications') {
        return {
          message: toolResult.result.question || 'Could you provide more details?',
          requiresUserInput: true,
          conversationState: ConversationState.GATHERING_SPECS,
        };
      }

      // Default response
      return {
        message: 'How else can I help you?',
        requiresUserInput: true,
        conversationState: ConversationState.FOLLOW_UP,
      };
    } catch (error) {
      logger.error('Error processing tool result', { error });
      throw new Error(`Failed to process tool result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare search results and generate summary
   */
  async compareAndSummarize(
    product: ProductQuery,
    searchResults: SearchResult[]
  ): Promise<string> {
    try {
      logger.info('Comparing and summarizing results', {
        productName: product.productName,
        resultsCount: searchResults.length,
      });

      if (searchResults.length === 0) {
        return `I couldn't find any results for ${product.productName} with the specifications you mentioned. Would you like to try a different product or modify the specifications?`;
      }

      // Filter only in-stock items
      const inStockResults = searchResults.filter(
        (r) => r.availability === 'in_stock'
      );

      if (inStockResults.length === 0) {
        return `I found some listings for ${product.productName}, but unfortunately none of them are currently in stock. Would you like me to search for a similar product?`;
      }

      // Sort by price (lowest first)
      const sortedResults = [...inStockResults].sort((a, b) => a.price - b.price);

      // Get top 3 results
      const topResults = sortedResults.slice(0, 3);
      const lowestPrice = topResults[0];

      // Check if prices are similar (within 5%)
      const pricesAreSimilar = topResults.length > 1 && 
        ((topResults[1].price - lowestPrice.price) / lowestPrice.price) < 0.05;

      // Generate summary using LLM for natural voice output
      const summaryPrompt = `Generate a concise, natural voice response summarizing these price comparison results.

Product: ${product.productName}
Specifications: ${JSON.stringify(product.specifications)}

Results (sorted by price):
${topResults.map((r, i) => `${i + 1}. ${r.platform}: ₹${r.price.toLocaleString('en-IN')}`).join('\n')}

${pricesAreSimilar ? 'Note: The top prices are very similar (less than 5% difference).' : ''}

Guidelines:
- Start by stating the lowest price and platform
- Mention the top 2-3 options clearly
- If prices are similar (< 5% difference), mention this
- Keep it conversational and concise for voice output
- Use Indian Rupees format (₹)
- End by asking if they want to search for another product
- Be enthusiastic but professional

Generate only the voice response, nothing else.`;

      let summary = '';
      if (this.provider === 'anthropic') {
        const response = await this.anthropicClient!.messages.create({
          model: this.model,
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
        });

        // Extract text response
        for (const block of response.content) {
          if (block.type === 'text') {
            summary += block.text;
          }
        }
      } else {
        const response = await this.openaiClient!.chat.completions.create({
          model: this.model,
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
        });

        summary = response.choices[0]?.message.content || '';
      }

      logger.info('Generated comparison summary', {
        summaryLength: summary.length,
        lowestPrice: lowestPrice.price,
        lowestPlatform: lowestPrice.platform,
      });

      return summary.trim();
    } catch (error) {
      logger.error('Error comparing and summarizing results', { error });
      
      // Fallback to simple summary
      const sortedResults = [...searchResults]
        .filter((r) => r.availability === 'in_stock')
        .sort((a, b) => a.price - b.price);

      if (sortedResults.length === 0) {
        return `I found some results but none are currently in stock. Would you like to search for something else?`;
      }

      const lowest = sortedResults[0];
      const summary = `I found the ${product.productName} for ₹${lowest.price.toLocaleString('en-IN')} on ${lowest.platform}`;
      
      if (sortedResults.length > 1) {
        const second = sortedResults[1];
        return `${summary}, and ₹${second.price.toLocaleString('en-IN')} on ${second.platform}. Would you like to search for another product?`;
      }

      return `${summary}. Would you like to search for another product?`;
    }
  }

  /**
   * Identify the lowest price and top options from search results
   */
  getTopPriceOptions(searchResults: SearchResult[]): {
    lowestPrice: SearchResult | null;
    topThree: SearchResult[];
    pricesAreSimilar: boolean;
  } {
    // Filter in-stock items
    const inStockResults = searchResults.filter(
      (r) => r.availability === 'in_stock'
    );

    if (inStockResults.length === 0) {
      return {
        lowestPrice: null,
        topThree: [],
        pricesAreSimilar: false,
      };
    }

    // Sort by price
    const sorted = [...inStockResults].sort((a, b) => a.price - b.price);

    // Get top 3
    const topThree = sorted.slice(0, 3);
    const lowestPrice = topThree[0];

    // Check if prices are similar (within 5%)
    const pricesAreSimilar = topThree.length > 1 &&
      ((topThree[1].price - lowestPrice.price) / lowestPrice.price) < 0.05;

    logger.info('Identified top price options', {
      lowestPrice: lowestPrice.price,
      lowestPlatform: lowestPrice.platform,
      topThreeCount: topThree.length,
      pricesAreSimilar,
    });

    return {
      lowestPrice,
      topThree,
      pricesAreSimilar,
    };
  }
}
