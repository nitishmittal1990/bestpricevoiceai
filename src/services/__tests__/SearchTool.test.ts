import { SearchTool } from '../SearchTool';
import { SearchResult } from '../../types';

describe('SearchTool', () => {
  let searchTool: SearchTool;

  beforeEach(() => {
    searchTool = new SearchTool();
  });

  describe('verifySpecificationMatch', () => {
    it('should return 1.0 for exact specification match', () => {
      const result: SearchResult = {
        platform: 'Flipkart',
        productName: 'MacBook Pro 14',
        price: 199900,
        currency: 'INR',
        url: 'https://flipkart.com/test',
        availability: 'in_stock',
        specifications: {
          ram: '18GB',
          storage: '512GB',
          chip: 'M3 Pro',
        },
        matchConfidence: 0,
      };

      const requiredSpecs = {
        ram: '18GB',
        storage: '512GB',
        chip: 'M3 Pro',
      };

      const confidence = searchTool.verifySpecificationMatch(result, requiredSpecs);
      expect(confidence).toBe(1.0);
    });

    it('should return partial match for similar specifications', () => {
      const result: SearchResult = {
        platform: 'Amazon India',
        productName: 'MacBook Pro 14',
        price: 204900,
        currency: 'INR',
        url: 'https://amazon.in/test',
        availability: 'in_stock',
        specifications: {
          ram: '18 GB',
          storage: '512 GB',
        },
        matchConfidence: 0,
      };

      const requiredSpecs = {
        ram: '18GB',
        storage: '512GB',
      };

      const confidence = searchTool.verifySpecificationMatch(result, requiredSpecs);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should return low confidence for mismatched specifications', () => {
      const result: SearchResult = {
        platform: 'Croma',
        productName: 'MacBook Air',
        price: 99900,
        currency: 'INR',
        url: 'https://croma.com/test',
        availability: 'in_stock',
        specifications: {
          ram: '8GB',
          storage: '256GB',
        },
        matchConfidence: 0,
      };

      const requiredSpecs = {
        ram: '18GB',
        storage: '512GB',
      };

      const confidence = searchTool.verifySpecificationMatch(result, requiredSpecs);
      expect(confidence).toBeLessThan(0.6);
    });
  });

  describe('filterAndRankResults', () => {
    it('should filter out low confidence results', () => {
      const results: SearchResult[] = [
        {
          platform: 'Flipkart',
          productName: 'MacBook Pro 14',
          price: 199900,
          currency: 'INR',
          url: 'https://flipkart.com/test',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
        {
          platform: 'Amazon India',
          productName: 'MacBook Air',
          price: 99900,
          currency: 'INR',
          url: 'https://amazon.in/test',
          availability: 'in_stock',
          specifications: { ram: '8GB', storage: '256GB' },
          matchConfidence: 0.3,
        },
      ];

      const requiredSpecs = { ram: '18GB', storage: '512GB' };
      const filtered = searchTool.filterAndRankResults(results, requiredSpecs, 0.6);

      expect(filtered.length).toBe(1);
      expect(filtered[0].platform).toBe('Flipkart');
    });

    it('should filter out out-of-stock products', () => {
      const results: SearchResult[] = [
        {
          platform: 'Flipkart',
          productName: 'MacBook Pro 14',
          price: 199900,
          currency: 'INR',
          url: 'https://flipkart.com/test',
          availability: 'out_of_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
        {
          platform: 'Amazon India',
          productName: 'MacBook Pro 14',
          price: 204900,
          currency: 'INR',
          url: 'https://amazon.in/test',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
      ];

      const requiredSpecs = { ram: '18GB', storage: '512GB' };
      const filtered = searchTool.filterAndRankResults(results, requiredSpecs, 0.6);

      expect(filtered.length).toBe(1);
      expect(filtered[0].platform).toBe('Amazon India');
    });

    it('should rank results by price (lowest first)', () => {
      const results: SearchResult[] = [
        {
          platform: 'Croma',
          productName: 'MacBook Pro 14',
          price: 209900,
          currency: 'INR',
          url: 'https://croma.com/test',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
        {
          platform: 'Flipkart',
          productName: 'MacBook Pro 14',
          price: 199900,
          currency: 'INR',
          url: 'https://flipkart.com/test',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
        {
          platform: 'Amazon India',
          productName: 'MacBook Pro 14',
          price: 204900,
          currency: 'INR',
          url: 'https://amazon.in/test',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
      ];

      const requiredSpecs = { ram: '18GB', storage: '512GB' };
      const filtered = searchTool.filterAndRankResults(results, requiredSpecs, 0.6);

      expect(filtered.length).toBe(3);
      expect(filtered[0].platform).toBe('Flipkart');
      expect(filtered[0].price).toBe(199900);
      expect(filtered[1].platform).toBe('Amazon India');
      expect(filtered[2].platform).toBe('Croma');
    });

    it('should keep only lowest price per platform', () => {
      const results: SearchResult[] = [
        {
          platform: 'Flipkart',
          productName: 'MacBook Pro 14',
          price: 199900,
          currency: 'INR',
          url: 'https://flipkart.com/test1',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
        {
          platform: 'Flipkart',
          productName: 'MacBook Pro 14',
          price: 195900,
          currency: 'INR',
          url: 'https://flipkart.com/test2',
          availability: 'in_stock',
          specifications: { ram: '18GB', storage: '512GB' },
          matchConfidence: 0.9,
        },
      ];

      const requiredSpecs = { ram: '18GB', storage: '512GB' };
      const filtered = searchTool.filterAndRankResults(results, requiredSpecs, 0.6);

      expect(filtered.length).toBe(1);
      expect(filtered[0].price).toBe(195900);
    });
  });
});
