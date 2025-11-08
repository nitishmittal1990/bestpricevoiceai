# SearchTool Service

The SearchTool service provides product price comparison across multiple Indian e-commerce platforms using SerpAPI as the primary search provider and Tavily API as a fallback.

## Features

- **Multi-Platform Search**: Searches across 8+ Indian e-commerce platforms including Flipkart, Amazon India, Myntra, Croma, and more
- **Parallel Queries**: Executes searches across all platforms simultaneously for faster results
- **Specification Matching**: Validates that search results match required product specifications
- **Intelligent Filtering**: Filters out low-confidence matches and out-of-stock products
- **Price Ranking**: Automatically ranks results by price (lowest first)
- **Platform Deduplication**: Keeps only the lowest price per platform
- **Automatic Fallback**: Falls back to Tavily API if SerpAPI fails or returns no results

## Supported Platforms

1. Flipkart
2. Amazon India
3. Myntra
4. Croma
5. Reliance Digital
6. Vijay Sales
7. Tata Cliq
8. Snapdeal

## Usage

### Basic Search

```typescript
import { SearchTool } from './services/SearchTool';
import { ProductQuery, ProductCategory } from './types';

const searchTool = new SearchTool();

const query: ProductQuery = {
  productName: 'MacBook Pro 14',
  category: ProductCategory.LAPTOP,
  brand: 'Apple',
  specifications: {
    chip: 'M3 Pro',
    ram: '18GB',
    storage: '512GB',
  },
};

// Search for prices
const results = await searchTool.searchProductPrices(query);
```

### Filter and Rank Results

```typescript
// Filter results by specification match and rank by price
const filteredResults = searchTool.filterAndRankResults(
  results,
  query.specifications,
  0.6 // Minimum 60% specification match confidence
);

// Display results
filteredResults.forEach(result => {
  console.log(`${result.platform}: ₹${result.price}`);
  console.log(`Match: ${(result.matchConfidence * 100).toFixed(0)}%`);
});
```

### Verify Specification Match

```typescript
// Manually verify if a result matches specifications
const confidence = searchTool.verifySpecificationMatch(
  searchResult,
  requiredSpecifications
);

console.log(`Match confidence: ${(confidence * 100).toFixed(0)}%`);
```

## API Reference

### `searchProductPrices(query: ProductQuery): Promise<SearchResult[]>`

Searches for product prices across all supported platforms.

**Parameters:**
- `query`: ProductQuery object containing product name, category, brand, and specifications

**Returns:**
- Array of SearchResult objects with pricing and availability information

**Behavior:**
1. Attempts search with SerpAPI first
2. Falls back to Tavily API if SerpAPI fails or returns no results
3. Executes parallel searches across all platforms
4. Parses and structures results into SearchResult objects

### `verifySpecificationMatch(result: SearchResult, requiredSpecs: Specifications): number`

Calculates how well a search result matches the required specifications.

**Parameters:**
- `result`: SearchResult to verify
- `requiredSpecs`: Required specifications to match against

**Returns:**
- Match confidence score between 0 and 1
  - 1.0 = Perfect match
  - 0.5 = Partial match
  - 0.0 = No match

### `filterAndRankResults(results: SearchResult[], requiredSpecs: Specifications, minConfidence?: number): SearchResult[]`

Filters and ranks search results based on specification match and price.

**Parameters:**
- `results`: Raw search results to filter
- `requiredSpecs`: Required specifications for filtering
- `minConfidence`: Minimum match confidence (default: 0.6)

**Returns:**
- Filtered and ranked array of SearchResult objects

**Filtering Logic:**
1. Updates match confidence for all results
2. Filters out results below minimum confidence threshold
3. Filters out out-of-stock products
4. Keeps only lowest price per platform
5. Sorts by price (lowest first)

## Configuration

The SearchTool requires the following environment variables:

```bash
# SerpAPI (primary search provider)
SERPAPI_API_KEY=your_serpapi_key

# Tavily API (fallback search provider)
TAVILY_API_KEY=your_tavily_key
```

## Data Models

### ProductQuery

```typescript
interface ProductQuery {
  productName: string;
  category?: ProductCategory;
  brand?: string;
  specifications: Specifications;
  priceRange?: {
    min?: number;
    max?: number;
  };
}
```

### SearchResult

```typescript
interface SearchResult {
  platform: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  availability: 'in_stock' | 'out_of_stock' | 'unknown';
  specifications: Specifications;
  matchConfidence: number;
}
```

### Specifications

```typescript
interface Specifications {
  [key: string]: string | number;
}
```

## Examples

See `examples/search-demo.ts` for a complete working example.

## Error Handling

The SearchTool handles errors gracefully:

- **SerpAPI Failure**: Automatically falls back to Tavily API
- **No Results**: Returns empty array instead of throwing
- **Parse Errors**: Logs warnings and continues with other results
- **Network Errors**: Logs errors and attempts fallback

## Performance

- **Parallel Execution**: All platform searches run simultaneously
- **Typical Response Time**: 2-5 seconds for complete search
- **Result Limit**: Up to 10 results per platform (configurable)

## Limitations

- Requires valid API keys for SerpAPI and Tavily
- Search accuracy depends on product listing quality
- Specification extraction is basic (can be enhanced with LLM)
- Price information may not be real-time
- Some platforms may block automated searches

## Future Enhancements

- [ ] Add more e-commerce platforms
- [ ] Improve specification extraction with LLM
- [ ] Add caching for recent searches
- [ ] Support for price history tracking
- [ ] Add product image extraction
- [ ] Support for user reviews and ratings
