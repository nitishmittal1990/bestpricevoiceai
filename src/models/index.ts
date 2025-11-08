// Core data models and types for the voice price comparison agent

export enum ProductCategory {
  LAPTOP = 'laptop',
  PHONE = 'phone',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  MONITOR = 'monitor',
  HEADPHONES = 'headphones',
  CAMERA = 'camera',
  OTHER = 'other',
}

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

export enum ConversationStateEnum {
  INITIAL = 'initial',
  GATHERING_SPECS = 'gathering_specs',
  SEARCHING = 'searching',
  PRESENTING_RESULTS = 'presenting_results',
  FOLLOW_UP = 'follow_up',
  ENDED = 'ended',
}

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
  state: ConversationStateEnum;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
}

export interface AudioBuffer {
  data: Buffer;
  format: string;
  duration: number;
}
