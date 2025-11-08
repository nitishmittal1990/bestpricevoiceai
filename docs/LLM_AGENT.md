# LLM Agent Service

The LLM Agent service is the intelligence core of the voice price comparison agent. It uses Claude (Anthropic) to understand user intent, extract product information, validate specifications, and orchestrate the conversation flow.

## Features

- **Natural Language Understanding**: Extracts product information from conversational queries
- **Specification Validation**: Ensures all required specifications are gathered before searching
- **Function Calling**: Uses Claude's tool calling to trigger searches and clarifications
- **Result Comparison**: Analyzes search results and generates natural voice summaries
- **Conversation Management**: Maintains context and manages conversation state

## Installation

The LLM Agent requires the Anthropic SDK:

```bash
npm install @anthropic-ai/sdk
```

## Configuration

Set the following environment variables:

```bash
# LLM Configuration
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_api_key_here
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7
```

## Usage

### Basic Initialization

```typescript
import { LLMAgent } from './services/LLMAgent';

const agent = new LLMAgent();
```

### Extract Product Information

Extract product details from natural language queries:

```typescript
const userQuery = "I'm looking for a MacBook Pro 14 inch with M3 Pro chip";
const productInfo = await agent.extractProductInfo(userQuery);

console.log(productInfo);
// {
//   productName: "MacBook Pro 14 inch",
//   brand: "Apple",
//   category: "laptop",
//   specifications: {
//     processor: "M3 Pro"
//   }
// }
```

### Validate Specifications

Check if all required specifications are present:

```typescript
const product = {
  productName: 'MacBook Pro 14 inch',
  category: ProductCategory.LAPTOP,
  brand: 'Apple',
  specifications: {
    processor: 'M3 Pro',
    ram: '18GB',
    // Missing: storage, screen_size
  },
};

const validation = await agent.validateSpecifications(product);

if (!validation.isComplete) {
  console.log(`Missing: ${validation.missingSpecs.join(', ')}`);
  console.log(`Question: ${validation.clarifyingQuestion}`);
}
```

### Process User Messages

Handle conversational interactions with context:

```typescript
import { ConversationContext, ConversationState } from './types';

const context: ConversationContext = {
  history: [
    { role: 'user', content: 'I want to buy a laptop', timestamp: new Date() },
    { role: 'assistant', content: 'What brand are you interested in?', timestamp: new Date() },
  ],
  conversationState: ConversationState.GATHERING_SPECS,
};

const response = await agent.processUserMessage('Apple MacBook', context);

console.log(response.message); // Agent's response
console.log(response.action); // Action to take (search, clarify, etc.)
console.log(response.requiresUserInput); // Whether to wait for user
```

### Execute Tool Actions

Execute actions identified by the LLM:

```typescript
import { SearchTool } from './services/SearchTool';

const searchTool = new SearchTool();

const toolResult = await agent.executeToolAction(
  response.action,
  {
    searchProductPrices: (query) => searchTool.searchProductPrices(query),
  }
);

if (toolResult.success) {
  console.log('Search results:', toolResult.result);
}
```

### Compare and Summarize Results

Generate natural language summaries of price comparisons:

```typescript
const searchResults = [
  {
    platform: 'Flipkart',
    price: 199900,
    availability: 'in_stock',
    // ... other fields
  },
  {
    platform: 'Amazon India',
    price: 204900,
    availability: 'in_stock',
    // ... other fields
  },
];

const summary = await agent.compareAndSummarize(product, searchResults);

console.log(summary);
// "I found the best prices for you. The lowest price is ₹1,99,900 on Flipkart,
// followed by ₹2,04,900 on Amazon India. Would you like to search for another product?"
```

### Get Top Price Options

Analyze results to find the best deals:

```typescript
const topOptions = agent.getTopPriceOptions(searchResults);

console.log(`Lowest: ₹${topOptions.lowestPrice.price} on ${topOptions.lowestPrice.platform}`);
console.log(`Top 3 options: ${topOptions.topThree.length}`);
console.log(`Prices similar: ${topOptions.pricesAreSimilar}`);
```

## API Reference

### LLMAgent Class

#### Constructor

```typescript
constructor()
```

Initializes the LLM agent with configuration from environment variables.

#### Methods

##### processUserMessage

```typescript
async processUserMessage(
  message: string,
  context: ConversationContext
): Promise<AgentResponse>
```

Process a user message with conversation context and return the agent's response.

**Parameters:**
- `message`: The user's message text
- `context`: Conversation context including history and current state

**Returns:** `AgentResponse` with message, action, and state information

##### extractProductInfo

```typescript
async extractProductInfo(message: string): Promise<ProductInfo>
```

Extract product information from a natural language query.

**Parameters:**
- `message`: The user's query

**Returns:** `ProductInfo` with extracted product details

##### validateSpecifications

```typescript
async validateSpecifications(product: ProductQuery): Promise<ValidationResult>
```

Validate that all required specifications are present for a product.

**Parameters:**
- `product`: The product query to validate

**Returns:** `ValidationResult` indicating completeness and missing specs

##### executeToolAction

```typescript
async executeToolAction(
  action: AgentAction,
  toolImplementations: {
    searchProductPrices?: (query: ProductQuery) => Promise<SearchResult[]>;
    clarifySpecifications?: (params: any) => Promise<string>;
  }
): Promise<ToolExecutionResult>
```

Execute a tool action identified by the LLM.

**Parameters:**
- `action`: The action to execute
- `toolImplementations`: Object with tool implementation functions

**Returns:** `ToolExecutionResult` with success status and result

##### compareAndSummarize

```typescript
async compareAndSummarize(
  product: ProductQuery,
  searchResults: SearchResult[]
): Promise<string>
```

Generate a natural language summary of price comparison results.

**Parameters:**
- `product`: The product being compared
- `searchResults`: Array of search results

**Returns:** Natural language summary string

##### getTopPriceOptions

```typescript
getTopPriceOptions(searchResults: SearchResult[]): {
  lowestPrice: SearchResult | null;
  topThree: SearchResult[];
  pricesAreSimilar: boolean;
}
```

Analyze search results to identify the best price options.

**Parameters:**
- `searchResults`: Array of search results

**Returns:** Object with lowest price, top 3 options, and similarity flag

## Types

### ConversationContext

```typescript
interface ConversationContext {
  history: Message[];
  currentProduct?: ProductQuery;
  searchResults?: SearchResult[];
  conversationState: ConversationState;
}
```

### AgentResponse

```typescript
interface AgentResponse {
  message: string;
  action?: AgentAction;
  requiresUserInput: boolean;
  updatedProduct?: ProductQuery;
  conversationState?: ConversationState;
}
```

### AgentAction

```typescript
interface AgentAction {
  type: 'search' | 'clarify' | 'compare' | 'end';
  parameters?: Record<string, any>;
}
```

### ProductInfo

```typescript
interface ProductInfo {
  productName?: string;
  category?: ProductCategory;
  brand?: string;
  specifications: Specifications;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isComplete: boolean;
  missingSpecs: string[];
  clarifyingQuestion?: string;
}
```

## Required Specifications by Category

The agent validates specifications based on product category:

- **Laptop**: processor, ram, storage, screen_size
- **Phone**: model, storage, ram, color
- **Tablet**: model, storage, screen_size
- **Desktop**: processor, ram, storage
- **Monitor**: screen_size, resolution, refresh_rate
- **Headphones**: model, type
- **Camera**: model, type, megapixels

## Function Calling Tools

The agent uses two tools for function calling:

### search_product_prices

Searches for product prices across platforms when all specifications are complete.

**Parameters:**
- `productName`: Full product name
- `category`: Product category
- `brand`: Brand name
- `specifications`: Specification object
- `platforms`: Optional array of specific platforms

### clarify_specifications

Asks the user for missing specifications.

**Parameters:**
- `missingSpecs`: Array of missing specification names
- `productCategory`: Product category
- `question`: The clarifying question to ask

## Error Handling

The agent handles errors gracefully:

```typescript
try {
  const response = await agent.processUserMessage(message, context);
  // Handle response
} catch (error) {
  console.error('Error processing message:', error);
  // Provide fallback response to user
}
```

## Best Practices

1. **Maintain Context**: Always pass conversation history for better understanding
2. **Validate Before Searching**: Use `validateSpecifications` before triggering searches
3. **Handle Tool Results**: Process tool execution results appropriately
4. **Voice-Friendly Output**: The agent generates concise, conversational responses
5. **Error Recovery**: Implement fallback responses for API failures

## Example: Complete Conversation Flow

```typescript
import { LLMAgent, SearchTool } from './services';
import { ConversationContext, ConversationState } from './types';

const agent = new LLMAgent();
const searchTool = new SearchTool();

// Initialize context
const context: ConversationContext = {
  history: [],
  conversationState: ConversationState.INITIAL,
};

// User's first message
let response = await agent.processUserMessage(
  "I want to buy a MacBook",
  context
);

console.log(response.message); // "I'd be happy to help..."

// Update context
context.history.push(
  { role: 'user', content: "I want to buy a MacBook", timestamp: new Date() },
  { role: 'assistant', content: response.message, timestamp: new Date() }
);

// User provides more details
response = await agent.processUserMessage(
  "MacBook Pro 14 inch with M3 Pro, 18GB RAM, and 512GB storage",
  context
);

// If action is search, execute it
if (response.action?.type === 'search') {
  const toolResult = await agent.executeToolAction(response.action, {
    searchProductPrices: (query) => searchTool.searchProductPrices(query),
  });

  if (toolResult.success) {
    const summary = await agent.compareAndSummarize(
      response.action.parameters as ProductQuery,
      toolResult.result
    );
    console.log(summary);
  }
}
```

## Testing

Run the test suite:

```bash
npm test -- LLMAgent.test.ts
```

Run the demo:

```bash
npm run dev examples/llm-agent-demo.ts
```

## Limitations

- Currently only supports Anthropic Claude (OpenAI support planned)
- Requires API key with sufficient credits
- Response time depends on LLM API latency
- Specification extraction accuracy depends on query clarity

## Future Enhancements

- [ ] OpenAI GPT-4 support
- [ ] Streaming responses for lower latency
- [ ] Custom specification requirements per category
- [ ] Multi-language support
- [ ] Conversation memory persistence
- [ ] Fine-tuned models for better extraction
