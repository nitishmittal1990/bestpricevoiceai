import { LLMAgent, ConversationContext } from '../src/services';
import { ConversationState, ProductCategory } from '../src/types';

/**
 * Demo script for LLMAgent service
 * Shows how to use the LLM agent for product information extraction,
 * specification validation, and conversation management
 */

async function main() {
  console.log('=== LLM Agent Demo ===\n');

  // Initialize the LLM Agent
  const agent = new LLMAgent();

  // Demo 1: Extract product information from user query
  console.log('Demo 1: Product Information Extraction');
  console.log('---------------------------------------');
  
  const userQuery = "I'm looking for a MacBook Pro 14 inch with M3 Pro chip and 18GB RAM";
  console.log(`User query: "${userQuery}"\n`);
  
  const productInfo = await agent.extractProductInfo(userQuery);
  console.log('Extracted product info:');
  console.log(JSON.stringify(productInfo, null, 2));
  console.log();

  // Demo 2: Validate specifications
  console.log('\nDemo 2: Specification Validation');
  console.log('----------------------------------');
  
  const incompleteProduct = {
    productName: 'MacBook Pro 14 inch',
    category: ProductCategory.LAPTOP,
    brand: 'Apple',
    specifications: {
      processor: 'M3 Pro',
      ram: '18GB',
      // Missing: storage, screen_size
    },
  };
  
  console.log('Product with incomplete specs:');
  console.log(JSON.stringify(incompleteProduct, null, 2));
  console.log();
  
  const validation = await agent.validateSpecifications(incompleteProduct);
  console.log('Validation result:');
  console.log(`Is complete: ${validation.isComplete}`);
  console.log(`Missing specs: ${validation.missingSpecs.join(', ')}`);
  if (validation.clarifyingQuestion) {
    console.log(`Clarifying question: "${validation.clarifyingQuestion}"`);
  }
  console.log();

  // Demo 3: Process user message with conversation context
  console.log('\nDemo 3: Process User Message');
  console.log('------------------------------');
  
  const context: ConversationContext = {
    history: [],
    conversationState: ConversationState.INITIAL,
  };
  
  const userMessage = "I want to buy an iPhone";
  console.log(`User: "${userMessage}"\n`);
  
  const response = await agent.processUserMessage(userMessage, context);
  console.log('Agent response:');
  console.log(`Message: "${response.message}"`);
  console.log(`Requires user input: ${response.requiresUserInput}`);
  if (response.action) {
    console.log(`Action type: ${response.action.type}`);
    console.log(`Action parameters:`, response.action.parameters);
  }
  if (response.conversationState) {
    console.log(`New conversation state: ${response.conversationState}`);
  }
  console.log();

  // Demo 4: Compare and summarize search results
  console.log('\nDemo 4: Compare and Summarize Results');
  console.log('---------------------------------------');
  
  const mockSearchResults = [
    {
      platform: 'Flipkart',
      productName: 'MacBook Pro 14" M3 Pro 18GB 512GB',
      price: 199900,
      currency: 'INR',
      url: 'https://flipkart.com/...',
      availability: 'in_stock' as const,
      specifications: { processor: 'M3 Pro', ram: '18GB', storage: '512GB' },
      matchConfidence: 0.95,
    },
    {
      platform: 'Amazon India',
      productName: 'MacBook Pro 14" M3 Pro 18GB 512GB',
      price: 204900,
      currency: 'INR',
      url: 'https://amazon.in/...',
      availability: 'in_stock' as const,
      specifications: { processor: 'M3 Pro', ram: '18GB', storage: '512GB' },
      matchConfidence: 0.93,
    },
    {
      platform: 'Croma',
      productName: 'MacBook Pro 14" M3 Pro 18GB 512GB',
      price: 209900,
      currency: 'INR',
      url: 'https://croma.com/...',
      availability: 'in_stock' as const,
      specifications: { processor: 'M3 Pro', ram: '18GB', storage: '512GB' },
      matchConfidence: 0.90,
    },
  ];
  
  const completeProduct = {
    productName: 'MacBook Pro 14 inch',
    category: ProductCategory.LAPTOP,
    brand: 'Apple',
    specifications: {
      processor: 'M3 Pro',
      ram: '18GB',
      storage: '512GB',
    },
  };
  
  console.log('Search results:');
  mockSearchResults.forEach((result, i) => {
    console.log(`${i + 1}. ${result.platform}: ₹${result.price.toLocaleString('en-IN')}`);
  });
  console.log();
  
  const summary = await agent.compareAndSummarize(completeProduct, mockSearchResults);
  console.log('Generated summary:');
  console.log(`"${summary}"`);
  console.log();

  // Demo 5: Get top price options
  console.log('\nDemo 5: Get Top Price Options');
  console.log('-------------------------------');
  
  const topOptions = agent.getTopPriceOptions(mockSearchResults);
  console.log(`Lowest price: ₹${topOptions.lowestPrice?.price.toLocaleString('en-IN')} on ${topOptions.lowestPrice?.platform}`);
  console.log(`Top 3 options: ${topOptions.topThree.length}`);
  console.log(`Prices are similar: ${topOptions.pricesAreSimilar}`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run the demo
main().catch((error) => {
  console.error('Error running demo:', error);
  process.exit(1);
});
