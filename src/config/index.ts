import dotenv from 'dotenv';

dotenv.config();

interface Config {
  elevenlabs: {
    apiKey: string;
    defaultVoiceId: string;
    ttsModel: string;
  };
  llm: {
    provider: 'anthropic' | 'openai';
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  search: {
    serpapi: {
      apiKey: string;
    };
    tavily: {
      apiKey: string;
    };
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  session: {
    timeoutMs: number;
    cleanupIntervalMs: number;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: Config = {
  elevenlabs: {
    apiKey: getRequiredEnv('ELEVENLABS_API_KEY'),
    defaultVoiceId: getOptionalEnv('DEFAULT_VOICE_ID', ''),
    ttsModel: getOptionalEnv('TTS_MODEL', 'eleven_multilingual_v2'),
  },
  llm: {
    provider: (getOptionalEnv('LLM_PROVIDER', 'anthropic') as 'anthropic' | 'openai'),
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
    model: getOptionalEnv('LLM_MODEL', 'claude-3-5-sonnet-20241022'),
    maxTokens: parseInt(getOptionalEnv('LLM_MAX_TOKENS', '1024'), 10),
    temperature: parseFloat(getOptionalEnv('LLM_TEMPERATURE', '0.7')),
  },
  search: {
    serpapi: {
      apiKey: getRequiredEnv('SERPAPI_API_KEY'),
    },
    tavily: {
      apiKey: getRequiredEnv('TAVILY_API_KEY'),
    },
  },
  server: {
    port: parseInt(getOptionalEnv('PORT', '3000'), 10),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  },
  session: {
    timeoutMs: parseInt(getOptionalEnv('SESSION_TIMEOUT_MS', '1800000'), 10),
    cleanupIntervalMs: parseInt(getOptionalEnv('SESSION_CLEANUP_INTERVAL_MS', '300000'), 10),
  },
};

// Validate LLM API key
if (!config.llm.apiKey) {
  throw new Error('Missing LLM API key. Set either ANTHROPIC_API_KEY or OPENAI_API_KEY');
}
