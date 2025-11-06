/**
 * 🦊 NOX Provider Interface
 * 
 * All AI providers MUST implement this interface to ensure:
 * - Consistent API across all providers
 * - Zero cross-contamination between providers
 * - Easy add/remove of providers without breaking core
 * - Testability in isolation
 * 
 * @enterprise-grade Contract-based architecture for 1M+ users
 */

class IProvider {
  /**
   * Constructor
   * @param {Object} config - Provider configuration
   * @param {Object} logger - Logger instance
   * @param {Object} performanceMonitor - Performance monitor instance
   */
  constructor(config, logger, performanceMonitor) {
    if (this.constructor === IProvider) {
      throw new Error("IProvider is an interface and cannot be instantiated directly");
    }
    
    this.config = config;
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
  }

  // ============================================================================
  // METADATA METHODS (Required)
  // ============================================================================

  /**
   * Get provider name
   * @returns {string} - Provider name (e.g., "🤖 Anthropic Claude")
   */
  getName() {
    throw new Error("getName() must be implemented by provider");
  }

  /**
   * Get available models
   * @returns {Array<string>} - Array of model IDs
   */
  getModels() {
    throw new Error("getModels() must be implemented by provider");
  }

  /**
   * Get default model
   * @returns {string} - Default model ID
   */
  getDefaultModel() {
    throw new Error("getDefaultModel() must be implemented by provider");
  }

  /**
   * Get base URL for API
   * @returns {string} - Base URL
   */
  getBaseUrl() {
    throw new Error("getBaseUrl() must be implemented by provider");
  }

  /**
   * Check if provider supports native tool calling
   * @returns {boolean}
   */
  supportsToolCalling() {
    throw new Error("supportsToolCalling() must be implemented by provider");
  }

  /**
   * Check if provider supports streaming
   * @returns {boolean}
   */
  supportsStreaming() {
    throw new Error("supportsStreaming() must be implemented by provider");
  }

  /**
   * Get tool calling format
   * @returns {string} - Format identifier (e.g., "claude_tools", "openai_functions")
   */
  getToolFormat() {
    throw new Error("getToolFormat() must be implemented by provider");
  }

  /**
   * Get maximum number of tools supported
   * @returns {number}
   */
  getMaxTools() {
    throw new Error("getMaxTools() must be implemented by provider");
  }

  // ============================================================================
  // CORE REQUEST METHODS (Required)
  // ============================================================================

  /**
   * Send a simple request (non-streaming, no tools)
   * @param {string} apiKey - API key
   * @param {string} prompt - User prompt
   * @param {Object} options - Request options (model, maxTokens, temperature)
   * @returns {Promise<Object>} - Response object { content, tokens, cost, model }
   */
  async sendRequest(apiKey, prompt, options = {}) {
    throw new Error("sendRequest() must be implemented by provider");
  }

  /**
   * Send a request with system prompt (non-streaming, no tools)
   * @param {string} apiKey - API key
   * @param {string} systemPrompt - System prompt
   * @param {string|Array} userPromptOrMessages - User prompt or messages array
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async sendRequestWithSystem(apiKey, systemPrompt, userPromptOrMessages, options = {}) {
    throw new Error("sendRequestWithSystem() must be implemented by provider");
  }

  /**
   * Send a streaming request with system prompt (no tools)
   * @param {string} apiKey - API key
   * @param {string} systemPrompt - System prompt
   * @param {string|Array} userPromptOrMessages - User prompt or messages array
   * @param {Object} options - Request options (model, maxTokens, temperature, messageId)
   * @param {Function} onChunk - Callback for each chunk: (data) => void
   * @param {Function} onComplete - Callback when complete: (finalMessage) => void
   * @param {AbortController} abortController - Abort controller for cancellation
   * @returns {Promise<void>}
   */
  async sendStreamingRequest(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options,
    onChunk,
    onComplete,
    abortController = null
  ) {
    throw new Error("sendStreamingRequest() must be implemented by provider");
  }

  /**
   * Send a request with tools (non-streaming)
   * @param {string} apiKey - API key
   * @param {string} systemPrompt - System prompt
   * @param {string|Array} userPromptOrMessages - User prompt or messages array
   * @param {Array} tools - Tool definitions (in provider-specific format)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object with tool_calls if any
   */
  async sendRequestWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options = {}
  ) {
    throw new Error("sendRequestWithTools() must be implemented by provider");
  }

  /**
   * Send a streaming request with tools (MOST IMPORTANT METHOD)
   * @param {string} apiKey - API key
   * @param {string} systemPrompt - System prompt
   * @param {string|Array} userPromptOrMessages - User prompt or messages array
   * @param {Array} tools - Tool definitions (in provider-specific format)
   * @param {Object} options - Request options (model, maxTokens, temperature, messageId, tool_choice)
   * @param {Object} callbacks - Callbacks object
   * @param {Function} callbacks.onChunk - Called for each text chunk: ({ messageId, chunk, tokens, isComplete }) => void
   * @param {Function} callbacks.onToolCall - Called when tool is invoked: ({ id, name, parameters }) => Promise<result>
   * @param {Function} callbacks.onToolResult - Called after tool execution: ({ id, result }) => void
   * @param {Function} callbacks.onComplete - Called when stream ends: (finalMessage) => void
   * @param {AbortController} abortController - Abort controller for cancellation
   * @returns {Promise<void>}
   */
  async sendStreamingRequestWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options,
    callbacks,
    abortController = null
  ) {
    throw new Error("sendStreamingRequestWithTools() must be implemented by provider");
  }

  // ============================================================================
  // TOOL HANDLING METHODS (Required for providers that support tools)
  // ============================================================================

  /**
   * Convert NOX capability definitions to provider-specific tool format
   * @param {Array<Class>} capabilities - Array of capability classes
   * @returns {Array<Object>} - Tools in provider-specific format
   */
  convertCapabilitiesToTools(capabilities) {
    throw new Error("convertCapabilitiesToTools() must be implemented by provider");
  }

  /**
   * Parse tool calls from provider response
   * @param {Object} response - Provider response object
   * @returns {Array<Object>} - Array of { id, name, parameters }
   */
  parseToolCalls(response) {
    throw new Error("parseToolCalls() must be implemented by provider");
  }

  /**
   * Build tool result in provider-specific format
   * @param {string} toolCallId - Tool call ID
   * @param {Object} result - Tool execution result
   * @returns {Object} - Tool result in provider format
   */
  buildToolResult(toolCallId, result) {
    throw new Error("buildToolResult() must be implemented by provider");
  }

  // ============================================================================
  // VALIDATION METHODS (Required)
  // ============================================================================

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} - True if valid
   */
  validateApiKey(apiKey) {
    throw new Error("validateApiKey() must be implemented by provider");
  }

  /**
   * Validate model ID
   * @param {string} model - Model ID to validate
   * @returns {boolean} - True if valid
   */
  validateModel(model) {
    throw new Error("validateModel() must be implemented by provider");
  }

  // ============================================================================
  // COST CALCULATION METHODS (Required)
  // ============================================================================

  /**
   * Calculate cost for a request
   * @param {Object} usage - Usage object (input_tokens, output_tokens, etc.)
   * @param {string} model - Model ID
   * @returns {number} - Cost in USD
   */
  calculateCost(usage, model) {
    throw new Error("calculateCost() must be implemented by provider");
  }

  // ============================================================================
  // HELPER METHODS (Optional - can be overridden)
  // ============================================================================

  /**
   * Build messages array from user prompt or messages
   * @param {string|Array} userPromptOrMessages - User prompt or messages array
   * @returns {Array} - Messages array in provider format
   */
  buildMessages(userPromptOrMessages) {
    if (typeof userPromptOrMessages === "string") {
      return [{ role: "user", content: userPromptOrMessages }];
    } else if (Array.isArray(userPromptOrMessages)) {
      return userPromptOrMessages;
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }
  }

  /**
   * Log request start
   * @param {string} method - Method name
   * @param {Object} details - Request details
   */
  logRequestStart(method, details = {}) {
    if (this.logger) {
      this.logger.info(`🚀 [${this.getName()}] ${method}`, details);
    }
  }

  /**
   * Log request complete
   * @param {string} method - Method name
   * @param {Object} details - Response details
   */
  logRequestComplete(method, details = {}) {
    if (this.logger) {
      this.logger.info(`✅ [${this.getName()}] ${method} complete`, details);
    }
  }

  /**
   * Log request error
   * @param {string} method - Method name
   * @param {Error} error - Error object
   */
  logRequestError(method, error) {
    if (this.logger) {
      this.logger.error(`❌ [${this.getName()}] ${method} failed`, error);
    }
  }
}

module.exports = IProvider;

