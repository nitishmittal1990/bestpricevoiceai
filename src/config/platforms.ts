/**
 * Platform configuration for Indian e-commerce platforms
 */
export interface PlatformConfig {
  name: string;
  domain: string;
  priority: number;
  searchTemplate: string;
  category?: string[]; // Optional: specific categories this platform specializes in
}

/**
 * List of supported Indian e-commerce platforms
 * Ordered by priority for search operations
 */
export const INDIAN_ECOMMERCE_PLATFORMS: PlatformConfig[] = [
  {
    name: 'Flipkart',
    domain: 'flipkart.com',
    priority: 1,
    searchTemplate: 'site:flipkart.com {productName} {specifications}',
  },
  {
    name: 'Amazon India',
    domain: 'amazon.in',
    priority: 2,
    searchTemplate: 'site:amazon.in {productName} {specifications}',
  },
  {
    name: 'Myntra',
    domain: 'myntra.com',
    priority: 3,
    searchTemplate: 'site:myntra.com {productName} {specifications}',
    category: ['fashion', 'lifestyle', 'clothing', 'footwear', 'accessories'],
  },
  {
    name: 'Croma',
    domain: 'croma.com',
    priority: 4,
    searchTemplate: 'site:croma.com {productName} {specifications}',
    category: ['electronics', 'appliances', 'laptop', 'phone', 'camera'],
  },
  {
    name: 'Reliance Digital',
    domain: 'reliancedigital.in',
    priority: 5,
    searchTemplate: 'site:reliancedigital.in {productName} {specifications}',
    category: ['electronics', 'appliances', 'laptop', 'phone', 'camera'],
  },
  {
    name: 'Vijay Sales',
    domain: 'vijaysales.com',
    priority: 6,
    searchTemplate: 'site:vijaysales.com {productName} {specifications}',
    category: ['electronics', 'appliances', 'laptop', 'phone', 'camera'],
  },
  {
    name: 'Tata Cliq',
    domain: 'tatacliq.com',
    priority: 7,
    searchTemplate: 'site:tatacliq.com {productName} {specifications}',
  },
  {
    name: 'Snapdeal',
    domain: 'snapdeal.com',
    priority: 8,
    searchTemplate: 'site:snapdeal.com {productName} {specifications}',
  },
  {
    name: 'Meesho',
    domain: 'meesho.com',
    priority: 9,
    searchTemplate: 'site:meesho.com {productName} {specifications}',
    category: ['fashion', 'lifestyle', 'home', 'budget'],
  },
  {
    name: 'Instamart',
    domain: 'swiggy.com/instamart',
    priority: 10,
    searchTemplate: 'site:swiggy.com/instamart {productName} {specifications}',
    category: ['groceries', 'essentials', 'quick-commerce'],
  },
  {
    name: 'Blinkit',
    domain: 'blinkit.com',
    priority: 11,
    searchTemplate: 'site:blinkit.com {productName} {specifications}',
    category: ['groceries', 'essentials', 'quick-commerce'],
  },
  {
    name: 'Zepto',
    domain: 'zepto.com',
    priority: 12,
    searchTemplate: 'site:zepto.com {productName} {specifications}',
    category: ['groceries', 'essentials', 'quick-commerce'],
  },
];

/**
 * Finds a platform configuration by domain name
 * @param domain - The domain to search for (can be partial)
 * @returns The platform configuration if found, undefined otherwise
 */
export function getPlatformByDomain(domain: string): PlatformConfig | undefined {
  return INDIAN_ECOMMERCE_PLATFORMS.find(p => domain.includes(p.domain));
}

/**
 * Returns all platforms sorted by priority (lowest priority number first)
 * @returns Array of platform configurations sorted by priority
 */
export function getPlatformsByPriority(): PlatformConfig[] {
  return [...INDIAN_ECOMMERCE_PLATFORMS].sort((a, b) => a.priority - b.priority);
}

/**
 * Filters platforms by product category
 * @param category - The product category to filter by
 * @returns Array of platforms that specialize in the given category, or all platforms if no match
 */
export function getPlatformsByCategory(category: string): PlatformConfig[] {
  const categoryLower = category.toLowerCase();
  const filtered = INDIAN_ECOMMERCE_PLATFORMS.filter(
    p => !p.category || p.category.some(c => c.toLowerCase().includes(categoryLower))
  );
  
  // If no platforms match the category, return all platforms
  return filtered.length > 0 ? filtered : INDIAN_ECOMMERCE_PLATFORMS;
}

/**
 * Builds a search query from a template by replacing placeholders
 * @param template - The search template with placeholders
 * @param productName - The product name to search for
 * @param specifications - Optional specifications to include in the search
 * @returns The formatted search query
 */
export function buildSearchQuery(
  template: string,
  productName: string,
  specifications?: string
): string {
  return template
    .replace('{productName}', productName)
    .replace('{specifications}', specifications || '');
}
