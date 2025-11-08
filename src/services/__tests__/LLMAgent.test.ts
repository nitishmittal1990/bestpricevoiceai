import { LLMAgent } from '../LLMAgent';
import { ProductCategory } from '../../types';
import type { AgentAction } from '../LLMAgent';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('LLMAgent', () => {
  let agent: LLMAgent;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with Anthropic client', () => {
      expect(() => {
        agent = new LLMAgent();
      }).not.toThrow();
    });
  });

  describe('getRequiredSpecifications', () => {
    beforeEach(() => {
      agent = new LLMAgent();
    });

    it('should return correct specs for laptop category', () => {
      // Access private method through type assertion for testing
      const requiredSpecs = (agent as any).getRequiredSpecifications(ProductCategory.LAPTOP);
      
      expect(requiredSpecs).toContain('processor');
      expect(requiredSpecs).toContain('ram');
      expect(requiredSpecs).toContain('storage');
      expect(requiredSpecs).toContain('screen_size');
    });

    it('should return correct specs for phone category', () => {
      const requiredSpecs = (agent as any).getRequiredSpecifications(ProductCategory.PHONE);
      
      expect(requiredSpecs).toContain('model');
      expect(requiredSpecs).toContain('storage');
      expect(requiredSpecs).toContain('ram');
      expect(requiredSpecs).toContain('color');
    });
  });

  describe('getTopPriceOptions', () => {
    beforeEach(() => {
      agent = new LLMAgent();
    });

    it('should identify lowest price and top 3 options', () => {
      const searchResults = [
        {
          platform: 'Platform A',
          productName: 'Product 1',
          price: 1000,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
        {
          platform: 'Platform B',
          productName: 'Product 1',
          price: 900,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
        {
          platform: 'Platform C',
          productName: 'Product 1',
          price: 1100,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
      ];

      const result = agent.getTopPriceOptions(searchResults);

      expect(result.lowestPrice?.price).toBe(900);
      expect(result.lowestPrice?.platform).toBe('Platform B');
      expect(result.topThree).toHaveLength(3);
      expect(result.topThree[0].price).toBe(900);
      expect(result.topThree[1].price).toBe(1000);
      expect(result.topThree[2].price).toBe(1100);
    });

    it('should detect similar prices (< 5% difference)', () => {
      const searchResults = [
        {
          platform: 'Platform A',
          productName: 'Product 1',
          price: 1000,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
        {
          platform: 'Platform B',
          productName: 'Product 1',
          price: 1030, // 3% difference
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
      ];

      const result = agent.getTopPriceOptions(searchResults);

      expect(result.pricesAreSimilar).toBe(true);
    });

    it('should filter out out-of-stock items', () => {
      const searchResults = [
        {
          platform: 'Platform A',
          productName: 'Product 1',
          price: 900,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'out_of_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
        {
          platform: 'Platform B',
          productName: 'Product 1',
          price: 1000,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
      ];

      const result = agent.getTopPriceOptions(searchResults);

      expect(result.lowestPrice?.price).toBe(1000);
      expect(result.lowestPrice?.platform).toBe('Platform B');
      expect(result.topThree).toHaveLength(1);
    });

    it('should return null when no in-stock items', () => {
      const searchResults = [
        {
          platform: 'Platform A',
          productName: 'Product 1',
          price: 900,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'out_of_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
      ];

      const result = agent.getTopPriceOptions(searchResults);

      expect(result.lowestPrice).toBeNull();
      expect(result.topThree).toHaveLength(0);
      expect(result.pricesAreSimilar).toBe(false);
    });
  });

  describe('executeToolAction', () => {
    beforeEach(() => {
      agent = new LLMAgent();
    });

    it('should execute search action', async () => {
      const mockSearchResults = [
        {
          platform: 'Test Platform',
          productName: 'Test Product',
          price: 1000,
          currency: 'INR',
          url: 'http://example.com',
          availability: 'in_stock' as const,
          specifications: {},
          matchConfidence: 0.9,
        },
      ];

      const mockSearchTool = jest.fn().mockResolvedValue(mockSearchResults);

      const action: AgentAction = {
        type: 'search',
        parameters: {
          productName: 'Test Product',
          category: ProductCategory.LAPTOP,
          specifications: { ram: '16GB' },
        },
      };

      const result = await agent.executeToolAction(action, {
        searchProductPrices: mockSearchTool,
      });

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('search_product_prices');
      expect(result.result).toEqual(mockSearchResults);
      expect(mockSearchTool).toHaveBeenCalledWith({
        productName: 'Test Product',
        category: ProductCategory.LAPTOP,
        brand: undefined,
        specifications: { ram: '16GB' },
        priceRange: undefined,
      });
    });

    it('should handle clarify action', async () => {
      const action: AgentAction = {
        type: 'clarify',
        parameters: {
          missingSpecs: ['storage'],
          question: 'What storage capacity do you need?',
        },
      };

      const result = await agent.executeToolAction(action, {});

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('clarify_specifications');
      expect(result.result).toEqual(action.parameters);
    });

    it('should handle end action', async () => {
      const action: AgentAction = {
        type: 'end',
      };

      const result = await agent.executeToolAction(action, {});

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('end_conversation');
    });

    it('should handle errors gracefully', async () => {
      const mockSearchTool = jest.fn().mockRejectedValue(new Error('Search failed'));

      const action: AgentAction = {
        type: 'search',
        parameters: {
          productName: 'Test Product',
          specifications: {},
        },
      };

      const result = await agent.executeToolAction(action, {
        searchProductPrices: mockSearchTool,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });
});
