/**
 * 🛡️ NOX Error Boundary - Webview Edition
 * 
 * Browser-compatible error handling for webview
 * Prevents crashes and ensures graceful degradation
 * 
 * @version 1.0.0
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',       // Recoverable, no user impact
  MEDIUM = 'medium', // Recoverable, minor user impact
  HIGH = 'high',     // Requires user action
  CRITICAL = 'critical' // System failure, requires restart
}

/**
 * Error categories for better tracking
 */
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  DOM = 'dom',
  MESSAGE = 'message',
  STREAMING = 'streaming',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * Error info structure
 */
interface ErrorInfo {
  message: string;
  stack?: string;
  context: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: string;
}

/**
 * Error boundary options
 */
interface ErrorBoundaryOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableTelemetry?: boolean;
}

/**
 * ErrorBoundary class - Reusable error handling utilities for webview
 */
export class ErrorBoundary {
  private logger: Console;
  private options: Required<ErrorBoundaryOptions>;
  private errorCount: Map<string, number>;
  private lastErrors: ErrorInfo[];
  private maxErrorHistory: number = 100;

  constructor(logger: Console = console, options: ErrorBoundaryOptions = {}) {
    this.logger = logger;
    this.options = {
      enableRetry: options.enableRetry !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableTelemetry: options.enableTelemetry || false
    };
    this.errorCount = new Map();
    this.lastErrors = [];
  }

  /**
   * Wrap async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    context: string,
    fallback: T | null = null
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logError(error as Error, context, ErrorSeverity.MEDIUM);
      return fallback;
    }
  }

  /**
   * Wrap async function with automatic retry
   */
  async wrapAsyncWithRetry<T>(
    fn: () => Promise<T>,
    context: string,
    options: Partial<ErrorBoundaryOptions> = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.options.maxRetries;
    const retryDelay = options.retryDelay || this.options.retryDelay;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && this.isRetryableError(lastError)) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          this.logger.warn(
            `🔄 Retry attempt ${attempt + 1}/${maxRetries} for ${context} after ${delay}ms`
          );
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    this.logError(lastError!, context, ErrorSeverity.HIGH);
    throw lastError;
  }

  /**
   * Wrap message handler with error boundary
   */
  wrapMessageHandler<T>(
    handler: (message: T) => Promise<void> | void,
    onError?: (error: Error, message: T) => void
  ): (message: T) => Promise<void> {
    return async (message: T) => {
      try {
        // Validate message structure
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message: must be an object');
        }

        if (!(message as any).type) {
          throw new Error('Invalid message: missing type field');
        }

        await handler(message);
      } catch (error) {
        const err = error as Error;
        this.logError(
          err,
          `Message handler (type: ${(message as any)?.type})`,
          ErrorSeverity.MEDIUM
        );
        
        if (onError) {
          onError(err, message);
        }
      }
    };
  }

  /**
   * Wrap DOM operation with safety checks
   */
  safeDOM<T>(
    operation: () => T,
    fallback: T | null = null,
    context: string = 'DOM operation'
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.logError(error as Error, context, ErrorSeverity.LOW);
      return fallback;
    }
  }

  /**
   * Wrap streaming operation with cleanup
   */
  async wrapStreaming<T>(
    streamFn: () => Promise<T>,
    cleanup: () => Promise<void> | void,
    context: string
  ): Promise<T> {
    try {
      return await streamFn();
    } catch (error) {
      this.logError(error as Error, context, ErrorSeverity.HIGH);
      
      // Always run cleanup on error
      try {
        await cleanup();
      } catch (cleanupError) {
        this.logger.error('🧹 Cleanup failed:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Validate message structure
   */
  validateMessage(
    message: any,
    schema: { required?: string[]; types?: Record<string, string> } = {}
  ): { valid: boolean; errors: string[]; message: any | null } {
    const errors: string[] = [];

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
      message: errors.length === 0 ? message : null
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /fetch failed/i,
      /503/,
      /502/,
      /429/ // Rate limit
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Categorize error
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message || error.toString();

    if (/network|fetch|timeout/i.test(message)) {
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
   */
  private logError(error: Error, context: string, severity: ErrorSeverity): void {
    const category = this.categorizeError(error);
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      category,
      timestamp: new Date().toISOString()
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
   */
  getStats(): {
    totalErrors: number;
    categoryCounts: Record<string, number>;
    topErrors: Array<{ error: string; count: number }>;
    recentErrors: ErrorInfo[];
  } {
    const categoryCounts: Record<string, number> = {};
    for (const error of this.lastErrors) {
      categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
    }

    return {
      totalErrors: this.lastErrors.length,
      categoryCounts,
      topErrors: Array.from(this.errorCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([error, count]) => ({ error, count })),
      recentErrors: this.lastErrors.slice(-10)
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.lastErrors = [];
    this.errorCount.clear();
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

