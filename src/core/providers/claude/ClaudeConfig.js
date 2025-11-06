/**
 * 🦊 Claude Provider Configuration
 * 
 * All Claude-specific configuration in one place.
 * Makes it easy to update models, pricing, and settings.
 * 
 * @enterprise-grade Centralized configuration, easy maintenance
 */

const ClaudeConfig = {
  // Provider metadata
  name: "🤖 Anthropic Claude",
  id: "anthropic",
  
  // API configuration
  baseUrl: "https://api.anthropic.com/v1",
  apiVersion: "2023-06-01",
  
  // Available models
  models: [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ],
  
  // Default model
  defaultModel: "claude-sonnet-4-5-20250929",
  
  // Tool calling support
  supportsToolCalling: true,
  toolFormat: "claude_tools",
  maxTools: 64,
  
  // Streaming support
  supportsStreaming: true,
  
  // Request defaults
  defaults: {
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 60000, // 60 seconds
  },
  
  // Pricing (per 1M tokens in USD)
  pricing: {
    "claude-sonnet-4-5-20250929": {
      input: 3.00,
      output: 15.00,
    },
    "claude-sonnet-4-20250514": {
      input: 3.00,
      output: 15.00,
    },
    "claude-3-5-haiku-20241022": {
      input: 0.80,
      output: 4.00,
    },
    "claude-3-haiku-20240307": {
      input: 0.25,
      output: 1.25,
    },
  },
  
  // API key validation
  apiKeyPattern: /^sk-ant-[a-zA-Z0-9_-]+$/,
  
  // Tool choice mapping
  // Claude uses "auto" and "any" instead of OpenAI's "auto" and "required"
  toolChoiceMapping: {
    auto: { type: "auto" },
    required: { type: "any" }, // Claude uses "any" instead of "required"
  },
  
  // Error messages
  errors: {
    invalidApiKey: "Invalid API key format for Claude. Expected format: sk-ant-...",
    invalidModel: "Invalid model for Claude. Available models: ",
    rateLimitExceeded: "Claude API rate limit exceeded. Please try again later.",
    serverError: "Claude API server error. Please try again.",
    timeout: "Claude API request timeout. Please try again.",
  },
};

module.exports = ClaudeConfig;

