/**
 * 🦊 NOX Base Provider
 *
 * Abstract base class that provides shared functionality for all providers.
 * Implements common logic to reduce code duplication.
 *
 * @enterprise-grade DRY principle, shared utilities, error handling
 */

const IProvider = require("./IProvider");

class BaseProvider extends IProvider {
  constructor(config, logger, performanceMonitor) {
    super(config, logger, performanceMonitor);

    // Shared state
    this.requestCount = 0;
    this.totalTokens = 0;
    this.totalCost = 0;
  }

  // ============================================================================
  // SHARED VALIDATION METHODS
  // ============================================================================

  /**
   * Validate API key format (basic validation)
   * Override in provider if specific format required
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }

    // Basic validation: non-empty string
    return apiKey.trim().length > 0;
  }

  /**
   * Validate model ID
   * Checks if model is in the provider's model list
   */
  validateModel(model) {
    const models = this.getModels();
    return models.includes(model);
  }

  // ============================================================================
  // SHARED MESSAGE BUILDING
  // ============================================================================

  /**
   * Build messages array from user prompt or messages
   * Handles both string prompts and message arrays
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

  // ============================================================================
  // SHARED PARAMETER SCHEMA BUILDING
  // ============================================================================

  /**
   * Build JSON schema for tool parameters
   * Used by all providers that support tool calling
   */
  buildParameterSchema(parameters) {
    // If parameters already has a schema, use it
    if (parameters.type === "object") {
      return parameters;
    }

    // Otherwise, build schema from parameter definitions
    const schema = {
      type: "object",
      properties: {},
      required: [],
    };

    for (const [name, def] of Object.entries(parameters)) {
      schema.properties[name] = {
        type: def.type || "string",
        description: def.description || name,
      };

      if (def.required) {
        schema.required.push(name);
      }

      // Add enum if provided
      if (def.enum) {
        schema.properties[name].enum = def.enum;
      }

      // Add default if provided
      if (def.default !== undefined) {
        schema.properties[name].default = def.default;
      }
    }

    return schema;
  }

  // ============================================================================
  // SHARED LOGGING METHODS
  // ============================================================================

  /**
   * Log request start with performance tracking
   */
  logRequestStart(method, details = {}) {
    this.requestCount++;

    if (this.logger) {
      this.logger.info(`🚀 [${this.getName()}] ${method}`, {
        requestNumber: this.requestCount,
        ...details,
      });
    }

    // Start performance timer if available
    if (this.performanceMonitor) {
      return this.performanceMonitor.startTimer(`${this.getName()}_${method}`);
    }

    return null;
  }

  /**
   * Log request complete with performance tracking
   */
  logRequestComplete(method, details = {}) {
    if (this.logger) {
      this.logger.info(`✅ [${this.getName()}] ${method} complete`, details);
    }

    // Update stats
    if (details.tokens) {
      this.totalTokens += details.tokens;
    }
    if (details.cost) {
      this.totalCost += details.cost;
    }
  }

  /**
   * Log request error
   */
  logRequestError(method, error) {
    if (this.logger) {
      this.logger.error(`❌ [${this.getName()}] ${method} failed`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // ============================================================================
  // SHARED ERROR HANDLING
  // ============================================================================

  /**
   * Handle API errors consistently
   * Logs the error and re-throws it
   */
  handleApiError(error, method) {
    this.logRequestError(method, error);

    // Re-throw the error (providers already format errors appropriately)
    throw error;
  }

  // ============================================================================
  // SHARED STREAMING UTILITIES
  // ============================================================================

  /**
   * Parse streaming chunks (SSE format)
   * Used by providers that use Server-Sent Events
   */
  parseStreamChunk(line) {
    // Remove "data: " prefix if present
    if (line.startsWith("data: ")) {
      line = line.substring(6);
    }

    // Skip empty lines and [DONE] markers
    if (!line.trim() || line.trim() === "[DONE]") {
      return null;
    }

    try {
      return JSON.parse(line);
    } catch (error) {
      // Ignore parse errors for incomplete chunks
      return null;
    }
  }

  /**
   * Read streaming response body
   * Generic stream reader for fetch API
   */
  async *readStream(reader, decoder) {
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield line;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      yield buffer;
    }
  }

  // ============================================================================
  // SHARED STATISTICS
  // ============================================================================

  /**
   * Get provider statistics
   */
  getStats() {
    return {
      provider: this.getName(),
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      averageTokensPerRequest:
        this.requestCount > 0
          ? Math.round(this.totalTokens / this.requestCount)
          : 0,
      averageCostPerRequest:
        this.requestCount > 0
          ? (this.totalCost / this.requestCount).toFixed(4)
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.requestCount = 0;
    this.totalTokens = 0;
    this.totalCost = 0;
  }
}

module.exports = BaseProvider;
