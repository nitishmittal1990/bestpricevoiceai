import { SearchTool } from '../src/services/SearchTool';
import { ProductQuery, ProductCategory } from '../src/types';

/**
 * Example demonstrating the SearchTool service
 * 
 * This example shows how to:
 * 1. Create a product query with specifications
 * 2. Search for prices across multiple platforms
 * 3. Filter and rank results
 */
async function main() {
  const searchTool = new SearchTool();

  // Example 1: Search for a MacBook Pro
  const macbookQuery: ProductQuery = {
    productName: 'MacBook Pro 14',
    category: ProductCategory.LAPTOP,
    brand: 'Apple',
    specifications: {
      chip: 'M3 Pro',
      ram: '18GB',
      storage: '512GB',
    },
  };

  console.log('Searching for:', macbookQuery.productName);
  console.log('Specifications:', macbookQuery.specifications);
  console.log('\nSearching across Indian e-commerce platforms...\n');

  try {
    // Search for product prices
    const results = await searchTool.searchProductPrices(macbookQuery);
    
    console.log(`Found ${results.length} raw results`);

    // Filter and rank results
    const filteredResults = searchTool.filterAndRankResults(
      results,
      macbookQuery.specifications,
      0.6 // Minimum 60% specification match
    );

    console.log(`\nFiltered to ${filteredResults.length} matching results:\n`);

    // Display results
    filteredResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.platform}`);
      console.log(`   Price: ₹${result.price.toLocaleString('en-IN')}`);
      console.log(`   Match Confidence: ${(result.matchConfidence * 100).toFixed(0)}%`);
      console.log(`   Availability: ${result.availability}`);
      console.log(`   URL: ${result.url}`);
      console.log('');
    });

    if (filteredResults.length > 0) {
      const lowest = filteredResults[0];
      console.log(`\n✓ Best price: ₹${lowest.price.toLocaleString('en-IN')} on ${lowest.platform}`);
    }

  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
