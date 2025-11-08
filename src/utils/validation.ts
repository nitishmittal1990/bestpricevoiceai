/**
 * Validation utilities for the voice price comparison agent
 */

import { ProductQuery, ProductCategory, Specifications } from '../types';

// ============================================================================
// API and Environment Validation
// ============================================================================

export function validateApiKeys(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // This will be implemented once dependencies are installed
  // For now, just export the interface
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

export function validateEnvironment(): boolean {
  // Placeholder for environment validation
  return true;
}

// ============================================================================
// ProductQuery Validation
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Validates if a ProductQuery has all required information for searching
 */
export function validateProductQueryCompleteness(query: ProductQuery): ValidationResult {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Check product name
  if (!query.productName || query.productName.trim().length === 0) {
    missingFields.push('productName');
    errors.push('Product name is required');
  }

  // Check if specifications exist
  if (!query.specifications || Object.keys(query.specifications).length === 0) {
    missingFields.push('specifications');
    errors.push('At least one specification is required for accurate comparison');
  }

  // Validate category-specific required specifications
  if (query.category) {
    const categoryValidation = validateCategorySpecifications(query.category, query.specifications);
    missingFields.push(...categoryValidation.missingFields);
    errors.push(...categoryValidation.errors);
  }

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}

/**
 * Validates if specifications are relevant for the given product category
 */
export function validateSpecificationRelevance(
  category: ProductCategory,
  specifications: Specifications
): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  
  const relevantSpecs = getRelevantSpecsForCategory(category);
  const providedSpecs = Object.keys(specifications);

  // Check for irrelevant specifications
  const irrelevantSpecs = providedSpecs.filter(spec => 
    !relevantSpecs.includes(spec.toLowerCase())
  );

  if (irrelevantSpecs.length > 0) {
    errors.push(`Irrelevant specifications for ${category}: ${irrelevantSpecs.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    missingFields,
    errors,
  };
}

/**
 * Validates category-specific required specifications
 */
function validateCategorySpecifications(
  category: ProductCategory,
  specifications: Specifications
): ValidationResult {
  const missingFields: string[] = [];
  const errors: string[] = [];

  const requiredSpecs = getRequiredSpecsForCategory(category);
  const providedSpecs = Object.keys(specifications).map(k => k.toLowerCase());

  for (const requiredSpec of requiredSpecs) {
    if (!providedSpecs.includes(requiredSpec.toLowerCase())) {
      missingFields.push(requiredSpec);
      errors.push(`Missing required specification for ${category}: ${requiredSpec}`);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

/**
 * Returns required specifications for a product category
 */
function getRequiredSpecsForCategory(category: ProductCategory): string[] {
  const requiredSpecs: Record<ProductCategory, string[]> = {
    [ProductCategory.LAPTOP]: ['model', 'ram', 'storage'],
    [ProductCategory.PHONE]: ['model', 'storage'],
    [ProductCategory.TABLET]: ['model', 'storage'],
    [ProductCategory.DESKTOP]: ['processor', 'ram', 'storage'],
    [ProductCategory.MONITOR]: ['size', 'resolution'],
    [ProductCategory.HEADPHONES]: ['model'],
    [ProductCategory.CAMERA]: ['model', 'megapixels'],
    [ProductCategory.OTHER]: [],
  };

  return requiredSpecs[category] || [];
}

/**
 * Returns all relevant specifications for a product category
 */
function getRelevantSpecsForCategory(category: ProductCategory): string[] {
  const relevantSpecs: Record<ProductCategory, string[]> = {
    [ProductCategory.LAPTOP]: [
      'model', 'brand', 'processor', 'chip', 'ram', 'storage', 'screen_size', 
      'display', 'graphics', 'gpu', 'color', 'weight', 'battery'
    ],
    [ProductCategory.PHONE]: [
      'model', 'brand', 'storage', 'ram', 'color', 'screen_size', 
      'camera', 'battery', '5g', 'processor'
    ],
    [ProductCategory.TABLET]: [
      'model', 'brand', 'storage', 'ram', 'screen_size', 'display', 
      'color', 'wifi', 'cellular', 'processor'
    ],
    [ProductCategory.DESKTOP]: [
      'model', 'brand', 'processor', 'ram', 'storage', 'graphics', 
      'gpu', 'motherboard', 'power_supply', 'case'
    ],
    [ProductCategory.MONITOR]: [
      'model', 'brand', 'size', 'resolution', 'refresh_rate', 'panel_type', 
      'response_time', 'ports', 'hdr', 'curved'
    ],
    [ProductCategory.HEADPHONES]: [
      'model', 'brand', 'type', 'wireless', 'noise_cancelling', 
      'battery_life', 'color', 'driver_size'
    ],
    [ProductCategory.CAMERA]: [
      'model', 'brand', 'megapixels', 'sensor_size', 'lens', 
      'video_resolution', 'iso_range', 'type'
    ],
    [ProductCategory.OTHER]: [],
  };

  return relevantSpecs[category] || [];
}

// ============================================================================
// Price and Currency Validation
// ============================================================================

/**
 * Validates if a price value is valid
 */
export function validatePrice(price: number): ValidationResult {
  const errors: string[] = [];

  if (typeof price !== 'number') {
    errors.push('Price must be a number');
  } else if (price < 0) {
    errors.push('Price cannot be negative');
  } else if (!isFinite(price)) {
    errors.push('Price must be a finite number');
  } else if (price === 0) {
    errors.push('Price cannot be zero');
  }

  return {
    isValid: errors.length === 0,
    missingFields: [],
    errors,
  };
}

/**
 * Validates if a currency code is supported
 */
export function validateCurrency(currency: string): ValidationResult {
  const errors: string[] = [];
  const supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP'];

  if (!currency || currency.trim().length === 0) {
    errors.push('Currency is required');
  } else if (!supportedCurrencies.includes(currency.toUpperCase())) {
    errors.push(`Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    missingFields: [],
    errors,
  };
}

/**
 * Validates price range in ProductQuery
 */
export function validatePriceRange(priceRange?: { min?: number; max?: number }): ValidationResult {
  const errors: string[] = [];

  if (!priceRange) {
    return { isValid: true, missingFields: [], errors: [] };
  }

  if (priceRange.min !== undefined) {
    const minValidation = validatePrice(priceRange.min);
    errors.push(...minValidation.errors);
  }

  if (priceRange.max !== undefined) {
    const maxValidation = validatePrice(priceRange.max);
    errors.push(...maxValidation.errors);
  }

  if (priceRange.min !== undefined && priceRange.max !== undefined) {
    if (priceRange.min > priceRange.max) {
      errors.push('Minimum price cannot be greater than maximum price');
    }
  }

  return {
    isValid: errors.length === 0,
    missingFields: [],
    errors,
  };
}
