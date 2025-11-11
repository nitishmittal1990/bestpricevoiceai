import dotenv from 'dotenv';

dotenv.config();

interface Config {
  elevenlabs: {
    apiKey: string;
    defaultVoiceId: string;
    ttsModel: string;
    sttModel: string;
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

/**
 * Retrieves a required environment variable
 * @throws {Error} If the environment variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your .env file or environment.`
    );
  }
  return value;
}

/**
 * Retrieves an optional environment variable with a default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Validates that the configuration is complete and correct
 * @throws {Error} If validation fails
 */
function validateConfig(config: Config): void {
  const errors: string[] = [];

  // Validate ElevenLabs configuration
  if (!config.elevenlabs.apiKey) {
    errors.push('ElevenLabs API key is required');
  }

  // Validate LLM configuration
  if (!config.llm.apiKey) {
    errors.push('LLM API key is required (set either ANTHROPIC_API_KEY or OPENAI_API_KEY)');
  }

  if (config.llm.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required when LLM_PROVIDER is set to "anthropic"');
  }

  if (config.llm.provider === 'openai' && !process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required when LLM_PROVIDER is set to "openai"');
  }

  // Validate search API configuration
  if (!config.search.serpapi.apiKey) {
    errors.push('SerpAPI API key is required');
  }

  if (!config.search.tavily.apiKey) {
    errors.push('Tavily API key is required');
  }

  // Validate numeric configurations
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.llm.maxTokens < 1) {
    errors.push('LLM_MAX_TOKENS must be greater than 0');
  }

  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    errors.push('LLM_TEMPERATURE must be between 0 and 2');
  }

  if (config.session.timeoutMs < 1000) {
    errors.push('SESSION_TIMEOUT_MS must be at least 1000ms (1 second)');
  }

  if (config.session.cleanupIntervalMs < 1000) {
    errors.push('SESSION_CLEANUP_INTERVAL_MS must be at least 1000ms (1 second)');
  }

  if (errors.length > 0) {
    throw new Error(
      'Configuration validation failed:\n' +
      errors.map(err => `  - ${err}`).join('\n') +
      '\n\nPlease check your .env file and ensure all required variables are set correctly.'
    );
  }
}

/**
 * Loads and validates the application configuration
 * @throws {Error} If required environment variables are missing or invalid
 */
function loadConfig(): Config {
  const config: Config = {
    elevenlabs: {
      apiKey: getRequiredEnv('ELEVENLABS_API_KEY'),
      defaultVoiceId: getOptionalEnv('DEFAULT_VOICE_ID', 'cgSgspJ2msm6clMCkdW9'),
      ttsModel: getOptionalEnv('TTS_MODEL', 'eleven_multilingual_v2'),
      sttModel: getOptionalEnv('STT_MODEL', 'whisper-1'),
    },
    llm: {
      provider: (getOptionalEnv('LLM_PROVIDER', 'openai') as 'anthropic' | 'openai'),
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
      model: getOptionalEnv('LLM_MODEL', 'gpt-4o'),
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

  // Validate the configuration
  validateConfig(config);

  return config;
}

export const config: Config = loadConfig();
