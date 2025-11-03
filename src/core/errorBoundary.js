/**
 * 🛡️ NOX Error Boundary - Enterprise-grade error handling
 *
 * Purpose: Prevent crashes and ensure graceful degradation for 1M+ users
 * Features:
 * - Async function error wrapping
 * - Message handler error boundaries
 * - DOM operation safety wrappers
 * - Automatic retry with exponential backoff
 * - Error recovery mechanisms
 * - User-friendly error messages
 *
 * @version 1.0.0
 */

/**
 * Error severity levels
 */
const ErrorSeverity = {
  LOW: "low", // Recoverable, no user impact
  MEDIUM: "medium", // Recoverable, minor user impact
  HIGH: "high", // Requires user action
  CRITICAL: "critical", // System failure, requires restart
};

/**
 * Error categories for better tracking
 */
const ErrorCategory = {
  NETWORK: "network",
  API: "api",
  DOM: "dom",
  MESSAGE: "message",
  STREAMING: "streaming",
  VALIDATION: "validation",
  UNKNOWN: "unknown",
};

/**
 * ErrorBoundary class - Reusable error handling utilities
 */
class ErrorBoundary {
  constructor(logger, options = {}) {
    this.logger = logger || console;
    this.options = {
      enableRetry: options.enableRetry !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableTelemetry: options.enableTelemetry || false,
      ...options,
    };
    this.errorCount = new Map(); // Track error frequency
    this.lastErrors = []; // Keep last 100 errors
    this.maxErrorHistory = 100;
  }

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context description for logging
   * @param {any} fallback - Fallback value on error
   * @returns {Promise<any>} Result or fallback
   */
  async wrapAsync(fn, context, fallback = null) {
    try {
      return await fn();
    } catch (error) {
      this.logError(error, context, ErrorSeverity.MEDIUM);
      return fallback;
    }
  }

  /**
   * Wrap async function with automatic retry
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context description
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Result or throws after max retries
   */
  async wrapAsyncWithRetry(fn, context, options = {}) {
    const maxRetries = options.maxRetries || this.options.maxRetries;
    const retryDelay = options.retryDelay || this.options.retryDelay;
    const shouldRetry = options.shouldRetry || this.isRetryableError.bind(this);

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries && shouldRetry(error)) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          this.logger.warn(
            `🔄 Retry attempt ${
              attempt + 1
            }/${maxRetries} for ${context} after ${delay}ms`
          );
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    this.logError(lastError, context, ErrorSeverity.HIGH);
    throw lastError;
  }

  /**
   * Wrap message handler with error boundary
   * @param {Function} handler - Message handler function
   * @param {Function} onError - Optional error callback
   * @returns {Function} Wrapped handler
   */
  wrapMessageHandler(handler, onError = null) {
    return async (message) => {
      try {
        // Validate message structure
        if (!message || typeof message !== "object") {
          throw new Error("Invalid message: must be an object");
        }

        if (!message.type) {
          throw new Error("Invalid message: missing type field");
        }

        await handler(message);
      } catch (error) {
        this.logError(
          error,
          `Message handler (type: ${message?.type})`,
          ErrorSeverity.MEDIUM
        );

        if (onError) {
          onError(error, message);
        }
      }
    };
  }

  /**
   * Wrap DOM operation with safety checks
   * @param {Function} operation - DOM operation function
   * @param {any} fallback - Fallback value on error
   * @param {string} context - Context description
   * @returns {any} Result or fallback
   */
  safeDOM(operation, fallback = null, context = "DOM operation") {
    try {
      return operation();
    } catch (error) {
      this.logError(error, context, ErrorSeverity.LOW);
      return fallback;
    }
  }

  /**
   * Wrap streaming operation with cleanup
   * @param {Function} streamFn - Streaming function
   * @param {Function} cleanup - Cleanup function
   * @param {string} context - Context description
   * @returns {Promise<any>} Stream result
   */
  async wrapStreaming(streamFn, cleanup, context) {
    try {
      return await streamFn();
    } catch (error) {
      this.logError(error, context, ErrorSeverity.HIGH);

      // Always run cleanup on error
      try {
        if (cleanup) {
          await cleanup();
        }
      } catch (cleanupError) {
        this.logger.error("🧹 Cleanup failed:", cleanupError);
      }

      throw error;
    }
  }

  /**
   * Validate and sanitize message
   * @param {any} message - Message to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateMessage(message, schema = {}) {
    const errors = [];

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in message)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check field types
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in message) {
          const actualType = typeof message[field];
          if (actualType !== expectedType) {
            errors.push(
              `Field '${field}' has wrong type: expected ${expectedType}, got ${actualType}`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? message : null,
    };
  }

  /**
   * Check if error is retryable (PUBLIC method)
   * @param {Error} error - Error to check
   * @returns {boolean} True if retryable
   */
  isRetryableError(error) {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /fetch failed/i,
      /ENOTFOUND/i,
      /503/,
      /502/,
      /429/, // Rate limit
      /500/, // Server error
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Categorize error
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message || error.toString();

    if (/network|fetch|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
      return ErrorCategory.NETWORK;
    }
    if (/API|401|403|404|500/i.test(message)) {
      return ErrorCategory.API;
    }
    if (/DOM|element|querySelector|appendChild/i.test(message)) {
      return ErrorCategory.DOM;
    }
    if (/message|type|invalid/i.test(message)) {
      return ErrorCategory.MESSAGE;
    }
    if (/stream|chunk|buffer/i.test(message)) {
      return ErrorCategory.STREAMING;
    }
    if (/validation|schema|required/i.test(message)) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Log error with context and severity
   * @param {Error} error - Error to log
   * @param {string} context - Context description
   * @param {string} severity - Error severity
   */
  logError(error, context, severity = ErrorSeverity.MEDIUM) {
    const category = this.categorizeError(error);
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      category,
      timestamp: new Date().toISOString(),
    };

    // Track error frequency
    const errorKey = `${category}:${error.message}`;
    this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);

    // Add to error history
    this.lastErrors.push(errorInfo);
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors.shift();
    }

    // Log based on severity
    const logPrefix = `🛡️ [${severity.toUpperCase()}] [${category}]`;
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`${logPrefix} ${context}:`, error);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`${logPrefix} ${context}:`, error);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`${logPrefix} ${context}:`, error);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(`${logPrefix} ${context}:`, error.message);
        break;
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Error stats
   */
  getStats() {
    const categoryCounts = {};
    for (const error of this.lastErrors) {
      categoryCounts[error.category] =
        (categoryCounts[error.category] || 0) + 1;
    }

    return {
      totalErrors: this.lastErrors.length,
      categoryCounts,
      topErrors: Array.from(this.errorCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ error: key, count })),
      recentErrors: this.lastErrors.slice(-10),
    };
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.lastErrors = [];
    this.errorCount.clear();
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = {
  ErrorBoundary,
  ErrorSeverity,
  ErrorCategory,
};
