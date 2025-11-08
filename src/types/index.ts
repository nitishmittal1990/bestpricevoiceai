/**
 * Additional type definitions and interfaces
 */

// ============================================================================
// Enums
// ============================================================================

export enum ProductCategory {
  LAPTOP = 'laptop',
  PHONE = 'phone',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  MONITOR = 'monitor',
  HEADPHONES = 'headphones',
  CAMERA = 'camera',
  OTHER = 'other'
}

export enum ConversationState {
  INITIAL = 'initial',
  GATHERING_SPECS = 'gathering_specs',
  SEARCHING = 'searching',
  PRESENTING_RESULTS = 'presenting_results',
  FOLLOW_UP = 'follow_up',
  ENDED = 'ended'
}

// ============================================================================
// Core Data Models
// ============================================================================

export interface Specifications {
  [key: string]: string | number;
}

export interface ProductQuery {
  productName: string;
  category?: ProductCategory;
  brand?: string;
  specifications: Specifications;
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface SearchResult {
  platform: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  availability: 'in_stock' | 'out_of_stock' | 'unknown';
  specifications: Specifications;
  matchConfidence: number;
}

export interface ComparisonResult {
  product: ProductQuery;
  results: SearchResult[];
  lowestPrice: SearchResult;
  summary: string;
  timestamp: Date;
}

// ============================================================================
// Conversation Management
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SessionState {
  sessionId: string;
  conversationHistory: Message[];
  currentProduct?: ProductQuery;
  lastActivity: Date;
  status: 'active' | 'waiting' | 'completed';
  conversationState: ConversationState;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ErrorContext {
  sessionId?: string;
  operation: string;
  timestamp: Date;
}

export interface ErrorResponse {
  userMessage: string;
  shouldRetry: boolean;
  fallbackAction?: string;
  logLevel: 'info' | 'warn' | 'error';
}

// ============================================================================
// Service Options
// ============================================================================

export interface TranscribeOptions {
  language?: string;
  model?: string;
  enableNoiseReduction?: boolean;
}

export interface SynthesizeOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'opus';
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence?: number;
}
