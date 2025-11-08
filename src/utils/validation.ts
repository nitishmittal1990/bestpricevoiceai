/**
 * Validation utilities for the voice price comparison agent
 */

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
