import { getJson } from 'google-search-results-nodejs';
import axios from 'axios';
import { config } from '../config';
import { INDIAN_ECOMMERCE_PLATFORMS, getPlatformByDomain } from '../config/platforms';
import { ProductQuery, SearchResult, Specifications } from '../types';
import { logger, logApiCall, logApiResponse, PerformanceTimer } from '../utils/logger';

/**
 * SearchTool service for finding product prices across multiple e-commerce platforms
 * Uses SerpAPI as primary search provider with Tavily as fallback
 */
export class SearchTool {
  private serpApiKey: string;
  private tavilyApiKey: string;

  constructor() {
    this.serpApiKey = config.search.serpapi.apiKey;
    this.tavilyApiKey = config.search.tavily.apiKey;
  }

  /**
   * Search for product prices across multiple platforms
   * @param query Product query with specifications
   * @returns Array of search results with pricing information
   */
  async searchProductPrices(query: ProductQuery): Promise<SearchResult[]> {
    const timer = new PerformanceTimer('SearchTool.searchProductPrices', undefined, {
      productName: query.productName,
    });

    logApiCall('SearchTool', 'searchProductPrices', {
      productName: query.productName,
      specifications: query.specifications,
    });

    try {
      // Attempt search with Tavily first (primary)
      const results = await this.searchWithTavily(query);
      
      const duration = timer.end();
      
      if (results.length === 0) {
        logger.warn('No results from Tavily, trying SerpAPI fallback');
        return await this.searchWithSerpAPI(query);
      }

      logApiResponse('SearchTool', 'searchProductPrices', true, duration);
      return results;
    } catch (error) {
      const duration = timer.end();
      logger.error('Tavily search failed, falling back to SerpAPI', { error });
      logApiResponse(
        'SearchTool',
        'searchProductPrices',
        false,
        duration,
        error instanceof Error ? error : new Error('Unknown error')
      );
      return await this.searchWithSerpAPI(query);
    }
  }

  /**
   * Search using SerpAPI with parallel queries across platforms
   */
  private async searchWithSerpAPI(query: ProductQuery): Promise<SearchResult[]> {
    const searchPromises = INDIAN_ECOMMERCE_PLATFORMS.map(platform => 
      this.searchPlatformWithSerpAPI(query, platform.name, platform.domain)
    );

    const platformResults = await Promise.allSettled(searchPromises);
    
    const allResults: SearchResult[] = [];
    platformResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        logger.warn(`Search failed for platform ${INDIAN_ECOMMERCE_PLATFORMS[index].name}`, {
          error: result.reason
        });
      }
    });

    return allResults;
  }

  /**
   * Search a specific platform using SerpAPI
   */
  private async searchPlatformWithSerpAPI(
    query: ProductQuery,
    platformName: string,
    domain: string
  ): Promise<SearchResult[]> {
    const searchQuery = this.constructSearchQuery(query, domain);
    
    logger.info(`Searching ${platformName}`, { query: searchQuery });

    try {
      const response = await getJson({
        engine: 'google',
        q: searchQuery,
        api_key: this.serpApiKey,
        gl: 'in', // India
        hl: 'en', // English
        num: 10, // Number of results
      });

      return this.parseSerpAPIResults(response, platformName);
    } catch (error) {
      logger.error(`SerpAPI search failed for ${platformName}`, { error });
      throw error;
    }
  }

  /**
   * Construct search query from product query and platform domain
   */
  private constructSearchQuery(query: ProductQuery, domain: string): string {
    const parts: string[] = [`site:${domain}`, query.productName];

    if (query.brand) {
      parts.push(query.brand);
    }

    // Add key specifications to search query
    Object.entries(query.specifications).forEach(([, value]) => {
      parts.push(`${value}`);
    });

    return parts.join(' ');
  }

  /**
   * Parse SerpAPI response into SearchResult objects
   */
  private parseSerpAPIResults(
    response: any,
    platformName: string
  ): SearchResult[] {
    const results: SearchResult[] = [];

    // Parse organic results
    if (response.organic_results) {
      for (const item of response.organic_results) {
        const result = this.extractSearchResult(item, platformName);
        if (result) {
          results.push(result);
        }
      }
    }

    // Parse shopping results if available
    if (response.shopping_results) {
      for (const item of response.shopping_results) {
        const result = this.extractShoppingResult(item, platformName);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Extract search result from organic result item
   */
  private extractSearchResult(
    item: any,
    platformName: string
  ): SearchResult | null {
    try {
      // Extract price from snippet or title
      const priceMatch = (item.snippet || item.title || '').match(/₹\s*([0-9,]+)/);
      
      if (!priceMatch) {
        return null;
      }

      const price = parseFloat(priceMatch[1].replace(/,/g, ''));

      // Determine availability from snippet
      const availability = this.determineAvailability(item.snippet || '');

      return {
        platform: platformName,
        productName: item.title || '',
        price,
        currency: 'INR',
        url: item.link || '',
        availability,
        specifications: this.extractSpecifications(item.title + ' ' + item.snippet),
        matchConfidence: 0.5, // Will be updated by verifySpecificationMatch
      };
    } catch (error) {
      logger.warn('Failed to extract search result', { error, item });
      return null;
    }
  }

  /**
   * Extract search result from shopping result item
   */
  private extractShoppingResult(
    item: any,
    platformName: string
  ): SearchResult | null {
    try {
      const price = parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0');
      
      if (price === 0) {
        return null;
      }

      return {
        platform: platformName,
        productName: item.title || '',
        price,
        currency: 'INR',
        url: item.link || '',
        availability: item.delivery ? 'in_stock' : 'unknown',
        specifications: this.extractSpecifications(item.title),
        matchConfidence: 0.5,
      };
    } catch (error) {
      logger.warn('Failed to extract shopping result', { error, item });
      return null;
    }
  }

  /**
   * Determine product availability from text
   */
  private determineAvailability(text: string): 'in_stock' | 'out_of_stock' | 'unknown' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('out of stock') || lowerText.includes('unavailable')) {
      return 'out_of_stock';
    }
    
    if (lowerText.includes('in stock') || lowerText.includes('available')) {
      return 'in_stock';
    }
    
    return 'unknown';
  }

  /**
   * Extract specifications from text (basic implementation)
   */
  private extractSpecifications(text: string): Specifications {
    const specs: Specifications = {};
    
    // Extract RAM
    const ramMatch = text.match(/(\d+)\s*GB\s*RAM/i);
    if (ramMatch) {
      specs.ram = `${ramMatch[1]}GB`;
    }
    
    // Extract storage
    const storageMatch = text.match(/(\d+)\s*(GB|TB)\s*(SSD|Storage|ROM)/i);
    if (storageMatch) {
      specs.storage = `${storageMatch[1]}${storageMatch[2]}`;
    }
    
    // Extract screen size
    const screenMatch = text.match(/(\d+\.?\d*)\s*(inch|")/i);
    if (screenMatch) {
      specs.screenSize = `${screenMatch[1]} inch`;
    }
    
    return specs;
  }

  /**
   * Search using Tavily API as fallback
   */
  private async searchWithTavily(query: ProductQuery): Promise<SearchResult[]> {
    logger.info('Searching with Tavily API', { productName: query.productName });

    const searchQuery = this.constructTavilyQuery(query);
    
    try {
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query: searchQuery,
          search_depth: 'advanced',
          include_domains: INDIAN_ECOMMERCE_PLATFORMS.map(p => p.domain),
          max_results: 20,
        }
      );

      return this.parseTavilyResults(response.data);
    } catch (error) {
      logger.error('Tavily search failed', { error });
      return [];
    }
  }

  /**
   * Construct Tavily search query
   */
  private constructTavilyQuery(query: ProductQuery): string {
    const parts: string[] = [];
    
    // Add brand if available
    if (query.brand) {
      parts.push(query.brand);
    }
    
    // Add product name
    parts.push(query.productName);

    // Add specifications
    Object.entries(query.specifications).forEach(([, value]) => {
      parts.push(`${value}`);
    });

    // Add search context
    parts.push('buy online India price');

    const searchQuery = parts.join(' ');
    logger.info(`Constructed Tavily query: ${searchQuery}`);
    
    return searchQuery;
  }

  /**
   * Parse Tavily API response
   */
  private parseTavilyResults(
    response: any
  ): SearchResult[] {
    const results: SearchResult[] = [];

    if (!response.results) {
      logger.warn('No results field in Tavily response');
      return results;
    }

    logger.info(`Parsing ${response.results.length} Tavily results`);

    for (const item of response.results) {
      try {
        const url = new URL(item.url);
        const platform = getPlatformByDomain(url.hostname);
        
        if (!platform) {
          logger.debug(`Skipping result - domain not recognized: ${url.hostname}`);
          continue;
        }

        // Try multiple price patterns
        const combinedText = `${item.title || ''} ${item.content || ''}`;
        
        // Pattern 1: ₹ symbol with numbers
        let priceMatch = combinedText.match(/₹\s*([0-9,]+(?:\.\d{2})?)/);
        
        // Pattern 2: Rs or INR with numbers
        if (!priceMatch) {
          priceMatch = combinedText.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i);
        }
        
        // Pattern 3: Price: followed by numbers
        if (!priceMatch) {
          priceMatch = combinedText.match(/price[:\s]+([0-9,]+(?:\.\d{2})?)/i);
        }

        if (!priceMatch) {
          logger.debug(`No price found in result: ${item.title}`);
          continue;
        }

        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        
        if (price === 0 || isNaN(price)) {
          logger.debug(`Invalid price extracted: ${priceMatch[1]}`);
          continue;
        }

        logger.info(`Found result: ${platform.name} - ₹${price} - ${item.title}`);

        results.push({
          platform: platform.name,
          productName: item.title || '',
          price,
          currency: 'INR',
          url: item.url,
          availability: this.determineAvailability(item.content || ''),
          specifications: this.extractSpecifications(combinedText),
          matchConfidence: 0.5,
        });
      } catch (error) {
        logger.warn('Failed to parse Tavily result', { error, item });
      }
    }

    logger.info(`Successfully parsed ${results.length} results from Tavily`);
    return results;
  }

  /**
   * Verify if a search result matches the required specifications
   * @param result Search result to verify
   * @param requiredSpecs Required specifications
   * @returns Match confidence score (0-1)
   */
  verifySpecificationMatch(
    result: SearchResult,
    requiredSpecs: Specifications
  ): number {
    let matchCount = 0;
    let totalSpecs = 0;

    for (const [key, requiredValue] of Object.entries(requiredSpecs)) {
      totalSpecs++;
      const resultValue = result.specifications[key];

      if (resultValue) {
        // Normalize values for comparison
        const normalizedRequired = String(requiredValue).toLowerCase().replace(/\s+/g, '');
        const normalizedResult = String(resultValue).toLowerCase().replace(/\s+/g, '');

        if (normalizedRequired === normalizedResult) {
          matchCount++;
        } else if (normalizedResult.includes(normalizedRequired) || 
                   normalizedRequired.includes(normalizedResult)) {
          matchCount += 0.5; // Partial match
        }
      }
    }

    return totalSpecs > 0 ? matchCount / totalSpecs : 0;
  }

  /**
   * Filter and rank search results
   * @param results Raw search results
   * @param requiredSpecs Required specifications for filtering
   * @param minConfidence Minimum match confidence (default 0.6)
   * @returns Filtered and ranked results
   */
  filterAndRankResults(
    results: SearchResult[],
    requiredSpecs: Specifications,
    minConfidence: number = 0.6
  ): SearchResult[] {
    // If no specifications are required, accept all results (set confidence to 1.0)
    const hasRequiredSpecs = Object.keys(requiredSpecs).length > 0;
    
    // Update match confidence for all results
    const resultsWithConfidence = results.map(result => ({
      ...result,
      matchConfidence: hasRequiredSpecs 
        ? this.verifySpecificationMatch(result, requiredSpecs)
        : 1.0, // Accept all results when no specs are specified
    }));

    logger.info(`Filtering results: ${resultsWithConfidence.length} total, hasRequiredSpecs: ${hasRequiredSpecs}, minConfidence: ${minConfidence}`);

    // Filter by confidence and availability
    const filtered = resultsWithConfidence.filter(
      result => 
        result.matchConfidence >= minConfidence &&
        result.availability !== 'out_of_stock'
    );
    
    logger.info(`After filtering: ${filtered.length} results remaining`);

    // Group by platform and keep lowest price per platform
    const platformMap = new Map<string, SearchResult>();
    
    for (const result of filtered) {
      const existing = platformMap.get(result.platform);
      if (!existing || result.price < existing.price) {
        platformMap.set(result.platform, result);
      }
    }

    // Convert back to array and sort by price
    const uniqueResults = Array.from(platformMap.values());
    uniqueResults.sort((a, b) => a.price - b.price);

    return uniqueResults;
  }
}
