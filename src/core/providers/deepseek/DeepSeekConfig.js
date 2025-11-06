/**
 * 🦊 DeepSeek Provider Configuration
 * 
 * All DeepSeek-specific configuration in one place.
 * Makes it easy to update models, pricing, and settings.
 * 
 * @enterprise-grade Centralized configuration, easy maintenance
 */

const DeepSeekConfig = {
  // Provider metadata
  name: "⚡ DeepSeek",
  id: "deepseek",
  
  // API configuration
  baseUrl: "https://api.deepseek.com/v1",
  
  // Available models
  models: [
    "deepseek-chat",
    "deepseek-coder",
  ],
  
  // Default model
  defaultModel: "deepseek-chat",
  
  // Tool calling support
  supportsToolCalling: false, // DeepSeek doesn't support tool calling yet
  toolFormat: null,
  maxTools: 0,
  
  // Streaming support
  supportsStreaming: true,
  
  // Request defaults
  defaults: {
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 60000, // 60 seconds
  },
  
  // Pricing (per 1K tokens in USD) - Very competitive!
  pricing: {
    "deepseek-chat": { input: 0.00014, output: 0.00028 },
    "deepseek-coder": { input: 0.00014, output: 0.00028 },
  },
  
  // API key validation
  apiKeyPattern: /^sk-[a-zA-Z0-9_-]+$/,
  
  // Error messages
  errors: {
    invalidApiKey: "Invalid API key format for DeepSeek. Expected format: sk-...",
    invalidModel: "Invalid model for DeepSeek. Available models: ",
    rateLimitExceeded: "DeepSeek API rate limit exceeded. Please try again later.",
    serverError: "DeepSeek API server error. Please try again.",
    timeout: "DeepSeek API request timeout. Please try again.",
  },
};

module.exports = DeepSeekConfig;

