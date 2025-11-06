/**
 * 🦊 OpenAI Provider Configuration
 * 
 * All OpenAI-specific configuration in one place.
 * Makes it easy to update models, pricing, and settings.
 * 
 * @enterprise-grade Centralized configuration, easy maintenance
 */

const OpenAIConfig = {
  // Provider metadata
  name: "🧠 OpenAI GPT",
  id: "openai",
  
  // API configuration
  baseUrl: "https://api.openai.com/v1",
  
  // Available models
  models: [
    // 🏆 Main Production Models
    "chatgpt-4o-latest", // Always latest GPT-4o
    "gpt-4o", // Latest stable GPT-4o
    "gpt-4o-mini", // Cost-effective, fast
    "gpt-4-turbo", // Most capable reasoning
    "gpt-3.5-turbo", // Legacy, cheapest

    // 🚀 Next Generation (if available)
    "gpt-4.1", // Newest generation
    "gpt-5", // Next-gen (preview)

    // 🎯 Specialized Models
    "gpt-4o-audio-preview", // Voice/audio processing
    "gpt-4o-search-preview", // Enhanced search
    "gpt-4o-realtime-preview", // Live conversations
  ],
  
  // Default model
  defaultModel: "gpt-4o-mini", // Best value for most tasks
  
  // Tool calling support
  supportsToolCalling: true,
  toolFormat: "openai_functions",
  maxTools: 128,
  
  // Streaming support
  supportsStreaming: true,
  
  // Request defaults
  defaults: {
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 60000, // 60 seconds
  },
  
  // Pricing (per 1K tokens in USD)
  pricing: {
    // 🏆 Main Production Models
    "chatgpt-4o-latest": { input: 0.0025, output: 0.01 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

    // 🚀 Next Generation (estimated pricing)
    "gpt-4.1": { input: 0.01, output: 0.03 },
    "gpt-5": { input: 0.02, output: 0.06 },

    // 🎯 Specialized Models (estimated)
    "gpt-4o-audio-preview": { input: 0.0025, output: 0.01 },
    "gpt-4o-search-preview": { input: 0.0025, output: 0.01 },
    "gpt-4o-realtime-preview": { input: 0.005, output: 0.02 },
  },
  
  // API key validation
  apiKeyPattern: /^sk-[a-zA-Z0-9_-]+$/,
  
  // Tool choice mapping
  // OpenAI uses "auto", "required", "none"
  toolChoiceMapping: {
    auto: "auto",
    required: "required",
    none: "none",
  },
  
  // Error messages
  errors: {
    invalidApiKey: "Invalid API key format for OpenAI. Expected format: sk-...",
    invalidModel: "Invalid model for OpenAI. Available models: ",
    rateLimitExceeded: "OpenAI API rate limit exceeded. Please try again later.",
    serverError: "OpenAI API server error. Please try again.",
    timeout: "OpenAI API request timeout. Please try again.",
  },
};

module.exports = OpenAIConfig;

