export interface PlatformConfig {
  name: string;
  domain: string;
  priority: number;
  searchTemplate: string;
}

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
  },
  {
    name: 'Croma',
    domain: 'croma.com',
    priority: 4,
    searchTemplate: 'site:croma.com {productName} {specifications}',
  },
  {
    name: 'Reliance Digital',
    domain: 'reliancedigital.in',
    priority: 5,
    searchTemplate: 'site:reliancedigital.in {productName} {specifications}',
  },
  {
    name: 'Vijay Sales',
    domain: 'vijaysales.com',
    priority: 6,
    searchTemplate: 'site:vijaysales.com {productName} {specifications}',
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
];

export function getPlatformByDomain(domain: string): PlatformConfig | undefined {
  return INDIAN_ECOMMERCE_PLATFORMS.find(p => domain.includes(p.domain));
}

export function getPlatformsByPriority(): PlatformConfig[] {
  return [...INDIAN_ECOMMERCE_PLATFORMS].sort((a, b) => a.priority - b.priority);
}
