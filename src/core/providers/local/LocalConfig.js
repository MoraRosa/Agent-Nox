/**
 * 🦊 Local LLM Provider Configuration
 * 
 * All Local LLM-specific configuration in one place.
 * Supports Ollama and LM Studio.
 * 
 * @enterprise-grade Centralized configuration, easy maintenance
 */

const LocalConfig = {
  // Provider metadata
  name: "🏠 Local LLM",
  id: "local",
  
  // API configuration
  baseUrl: "http://localhost:11434", // Default Ollama port
  
  // Available models (user-configurable)
  models: [
    "ollama",
    "lm-studio",
    "llama2",
    "codellama",
    "mistral",
    "phi",
  ],
  
  // Default model
  defaultModel: "ollama",
  
  // Tool calling support
  supportsToolCalling: false, // Local LLMs don't support tool calling yet
  toolFormat: null,
  maxTools: 0,
  
  // Streaming support
  supportsStreaming: true,
  
  // Request defaults
  defaults: {
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 120000, // 2 minutes for local models (can be slower)
  },
  
  // Pricing (FREE!)
  pricing: {
    // All local models are free
    "ollama": { input: 0, output: 0 },
    "lm-studio": { input: 0, output: 0 },
    "llama2": { input: 0, output: 0 },
    "codellama": { input: 0, output: 0 },
    "mistral": { input: 0, output: 0 },
    "phi": { input: 0, output: 0 },
  },
  
  // API key validation (not needed for local)
  apiKeyPattern: null,
  
  // Error messages
  errors: {
    invalidApiKey: "Local LLMs don't require API keys",
    invalidModel: "Invalid model for Local LLM. Available models: ",
    connectionFailed: "Failed to connect to local LLM server. Is Ollama/LM Studio running?",
    serverError: "Local LLM server error. Please check your local server.",
    timeout: "Local LLM request timeout. Model may be too large or server is slow.",
  },
};

module.exports = LocalConfig;

