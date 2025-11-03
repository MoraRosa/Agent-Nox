/**
 * 🦊 NOX Message Protocol - Enterprise-grade API versioning and validation
 *
 * Purpose: Ensure backward/forward compatibility for 1M+ users
 * Features:
 * - Protocol version negotiation
 * - Message validation and type checking
 * - Migration handlers for old message formats
 * - Deprecation warnings
 * - Graceful error recovery
 *
 * @version 1.0.0
 */

// Optional vscode import (not available in tests)
let vscode;
try {
  vscode = require("vscode");
} catch (e) {
  // Running in test environment without vscode
  vscode = null;
}

/**
 * Current protocol version
 * Increment when making breaking changes to message format
 */
const CURRENT_PROTOCOL_VERSION = 1;

/**
 * Minimum supported protocol version
 * Messages from older versions will be migrated
 */
const MIN_SUPPORTED_VERSION = 1;

/**
 * Message validation schemas
 * Define required fields and types for each message
 */
const MESSAGE_SCHEMAS = {
  // Webview → Extension (Requests)
  sendMessage: {
    required: ["content"],
    types: { content: "string" },
  },
  sendStreamingMessage: {
    required: ["content"],
    types: { content: "string" },
  },
  streamStop: {
    required: ["messageId"],
    types: { messageId: "string" },
  },
  streamContinue: {
    required: ["messageId"],
    types: { messageId: "string" },
  },
  changeProvider: {
    required: ["provider"],
    types: { provider: "string" },
  },
  changeModel: {
    required: ["model"],
    types: { model: "string" },
  },
  regenerateMessage: {
    required: ["messageId"],
    types: { messageId: "string" },
  },
  clearHistory: {
    required: [],
    types: {},
  },
  clearChat: {
    required: [],
    types: {},
  },
  openSettings: {
    required: [],
    types: {},
  },
  setApiKey: {
    required: ["provider", "apiKey"],
    types: { provider: "string", apiKey: "string" },
  },
  changeTheme: {
    required: ["themeId"],
    types: { themeId: "string" },
  },
  startVoiceRecording: {
    required: [],
    types: {},
  },
  stopVoiceRecording: {
    required: [],
    types: {},
  },
  ready: {
    required: [],
    types: {},
  },

  // Protocol Handshake (Bidirectional)
  protocolHandshake: {
    required: ["version", "minVersion", "clientType"],
    types: {
      version: "number",
      minVersion: "number",
      clientType: "string",
    },
    optional: { timestamp: "number" },
  },
  protocolHandshakeResponse: {
    required: [
      "version",
      "minVersion",
      "negotiatedVersion",
      "compatible",
      "serverType",
    ],
    types: {
      version: "number",
      minVersion: "number",
      negotiatedVersion: ["number", "object"], // null if incompatible
      compatible: "boolean",
      serverType: "string",
    },
    optional: { timestamp: "number" },
  },

  // Extension → Webview (Responses)
  userMessage: {
    required: ["message"],
    types: { message: "object" },
  },
  aiMessage: {
    required: ["message"],
    types: { message: "object" },
  },
  aiThinking: {
    required: ["thinking"],
    types: { thinking: "boolean" },
  },
  error: {
    required: ["message"],
    types: { message: ["string", "object"] }, // Can be string or EnhancedError object
  },
  streamStart: {
    required: ["messageId"],
    types: { messageId: "string" },
  },
  streamChunk: {
    required: ["messageId", "chunk"],
    types: { messageId: "string", chunk: "string" },
    optional: { tokens: "number", isComplete: "boolean" },
  },
  streamComplete: {
    required: ["messageId", "finalMessage"],
    types: { messageId: "string", finalMessage: "object" },
  },
  streamStopped: {
    required: ["messageId"],
    types: { messageId: "string" },
    optional: { partialContent: "string" },
  },
  providerStatus: {
    required: ["currentProvider", "currentModel", "providers"],
    types: {
      currentProvider: "string",
      currentModel: "string",
      providers: "object",
    },
  },
  clearMessages: {
    required: [],
    types: {},
  },
  loadHistory: {
    required: ["history"],
    types: { history: "object" }, // Array of ChatMessage
  },
  voiceStatus: {
    required: ["status"],
    types: { status: "object" },
  },
  injectCSS: {
    required: ["theme"],
    types: { theme: "object" },
  },
};

/**
 * Migration handlers for converting old message formats to new formats
 * Each handler converts from version N to version N+1
 */
const MIGRATION_HANDLERS = {
  // Example: Migration from v0 (unversioned) to v1
  0: (message) => {
    // Add version field to unversioned messages
    return {
      version: 1,
      ...message,
    };
  },

  // Future migrations will be added here
  // Example: Migration from v1 to v2
  // 1: (message) => {
  //   // Handle breaking changes between v1 and v2
  //   if (message.type === 'oldMessageType') {
  //     return {
  //       ...message,
  //       version: 2,
  //       type: 'newMessageType',
  //       // Transform fields as needed
  //     };
  //   }
  //   return { ...message, version: 2 };
  // },
};

/**
 * MessageProtocol class - Handles versioning, validation, and migration
 */
class MessageProtocol {
  constructor(logger) {
    this.logger = logger || console;
    this.currentVersion = CURRENT_PROTOCOL_VERSION;
    this.minSupportedVersion = MIN_SUPPORTED_VERSION;
    this.negotiatedVersion = null;
    this.deprecationWarnings = new Set(); // Track shown warnings
    this.migrationHandlers = MIGRATION_HANDLERS;
  }

  /**
   * Wrap outgoing message with protocol version
   * @param {Object} message - Message to wrap
   * @returns {Object} Versioned message
   */
  wrapMessage(message) {
    if (!message || typeof message !== "object") {
      throw new Error("Message must be an object");
    }

    if (!message.type) {
      throw new Error("Message must have a type field");
    }

    // Add protocol version if not already present
    if (!message.version) {
      return {
        version: this.currentVersion,
        ...message,
      };
    }

    return message;
  }

  /**
   * Validate incoming message
   * @param {Object} message - Message to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateMessage(message) {
    const errors = [];

    // Check message is object
    if (!message || typeof message !== "object") {
      return { valid: false, errors: ["Message must be an object"] };
    }

    // Check required fields
    if (!message.type) {
      errors.push("Message missing required field: type");
    }

    // Get schema for message type
    const schema = MESSAGE_SCHEMAS[message.type];
    if (!schema) {
      // Unknown message type - log warning but don't fail
      this.logDeprecationWarning(
        `Unknown message type: ${message.type}. This may be from a newer version.`
      );
      return { valid: true, errors: [], warning: "unknown_type" };
    }

    // Validate required fields
    for (const field of schema.required) {
      if (!(field in message)) {
        errors.push(`Message missing required field: ${field}`);
      }
    }

    // Validate field types
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in message) {
        const actualType = typeof message[field];
        const expectedTypes = Array.isArray(expectedType)
          ? expectedType
          : [expectedType];

        if (!expectedTypes.includes(actualType)) {
          errors.push(
            `Field '${field}' has wrong type. Expected ${expectedTypes.join(
              " or "
            )}, got ${actualType}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if message version is supported
   * @param {Object} message - Message to check
   * @returns {boolean} True if supported
   */
  isVersionSupported(message) {
    const version = message.version || 0; // Treat unversioned as v0
    return (
      version >= this.minSupportedVersion && version <= this.currentVersion
    );
  }

  /**
   * Migrate old message format to current version
   * @param {Object} message - Message to migrate
   * @returns {Object} Migrated message
   */
  migrateMessage(message) {
    let currentMessage = { ...message };
    let version = currentMessage.version || 0;

    // No migration needed if already current version
    if (version === this.currentVersion) {
      return currentMessage;
    }

    // Log deprecation warning for old versions
    if (version < this.currentVersion) {
      this.logDeprecationWarning(
        `Received message with old protocol version ${version} (type: '${message.type}'). Current version: ${this.currentVersion}. Attempting migration...`
      );
    }

    // Apply migration handlers sequentially from old version to current
    try {
      while (version < this.currentVersion) {
        const migrationHandler = this.migrationHandlers[version];

        if (!migrationHandler) {
          // No migration handler available - try to add version field
          this.logger.warn(
            `🦊 No migration handler for version ${version} → ${
              version + 1
            }. Adding version field only.`
          );
          currentMessage = {
            ...currentMessage,
            version: version + 1,
          };
        } else {
          // Apply migration handler
          currentMessage = migrationHandler(currentMessage);
          this.logger.info(
            `🦊 Migrated message from v${version} to v${version + 1}`
          );
        }

        version++;
      }

      return currentMessage;
    } catch (error) {
      this.logger.error(
        `🦊 Migration failed for message type '${message.type}':`,
        error
      );
      // Return original message with version field added
      return {
        version: this.currentVersion,
        ...message,
      };
    }
  }

  /**
   * Process incoming message with validation and migration
   * @param {Object} message - Raw message from webview/extension
   * @returns {Object} { valid: boolean, message: Object, errors: string[] }
   */
  processIncomingMessage(message) {
    try {
      // Step 1: Check version support
      if (!this.isVersionSupported(message)) {
        const version = message.version || 0;
        return {
          valid: false,
          message: null,
          errors: [
            `Unsupported protocol version ${version}. Supported: ${this.minSupportedVersion}-${this.currentVersion}`,
          ],
        };
      }

      // Step 2: Migrate if needed
      const migratedMessage = this.migrateMessage(message);

      // Step 3: Validate
      const validation = this.validateMessage(migratedMessage);

      if (!validation.valid) {
        this.logger.error(
          `🦊 Message validation failed for type '${message.type}':`,
          validation.errors
        );
        return {
          valid: false,
          message: null,
          errors: validation.errors,
        };
      }

      return {
        valid: true,
        message: migratedMessage,
        errors: [],
        warning: validation.warning,
      };
    } catch (error) {
      this.logger.error("🦊 Error processing message:", error);
      return {
        valid: false,
        message: null,
        errors: [error.message],
      };
    }
  }

  /**
   * Log deprecation warning (only once per warning)
   * @param {string} warning - Warning message
   */
  logDeprecationWarning(warning) {
    if (!this.deprecationWarnings.has(warning)) {
      this.logger.warn(`🦊 [DEPRECATION] ${warning}`);
      this.deprecationWarnings.add(warning);
    }
  }

  /**
   * Get protocol version info
   * @returns {Object} Version info
   */
  getVersionInfo() {
    return {
      current: this.currentVersion,
      min: this.minSupportedVersion,
      negotiated: this.negotiatedVersion,
    };
  }

  /**
   * Create handshake request message
   * Sent by webview on startup to negotiate protocol version
   * @returns {Object} Handshake request message
   */
  createHandshakeRequest() {
    return {
      type: "protocolHandshake",
      version: this.currentVersion,
      minVersion: this.minSupportedVersion,
      clientType: "webview", // or "extension"
      timestamp: Date.now(),
    };
  }

  /**
   * Create handshake response message
   * Sent by extension in response to handshake request
   * @param {Object} request - Handshake request from webview
   * @returns {Object} Handshake response message
   */
  createHandshakeResponse(request) {
    // Determine negotiated version (lowest common version)
    const clientVersion = request.version || this.currentVersion;
    const clientMinVersion = request.minVersion || this.minSupportedVersion;

    // Find compatible version
    let negotiatedVersion = null;
    if (
      clientVersion >= this.minSupportedVersion &&
      this.currentVersion >= clientMinVersion
    ) {
      // Use the lower of the two current versions
      negotiatedVersion = Math.min(clientVersion, this.currentVersion);
    }

    // Store negotiated version
    this.negotiatedVersion = negotiatedVersion;

    return {
      type: "protocolHandshakeResponse",
      version: this.currentVersion,
      minVersion: this.minSupportedVersion,
      negotiatedVersion: negotiatedVersion,
      compatible: negotiatedVersion !== null,
      serverType: "extension",
      timestamp: Date.now(),
    };
  }

  /**
   * Process handshake response from extension
   * Called by webview after receiving handshake response
   * @param {Object} response - Handshake response from extension
   * @returns {Object} { compatible: boolean, version: number }
   */
  processHandshakeResponse(response) {
    if (!response || response.type !== "protocolHandshakeResponse") {
      this.logger.error("🦊 Invalid handshake response");
      return { compatible: false, version: null };
    }

    if (!response.compatible) {
      this.logger.error(
        `🦊 Protocol version incompatible. Extension: ${response.version} (min: ${response.minVersion}), Webview: ${this.currentVersion} (min: ${this.minSupportedVersion})`
      );
      return { compatible: false, version: null };
    }

    // Store negotiated version
    this.negotiatedVersion = response.negotiatedVersion;

    this.logger.info(
      `🦊 Protocol handshake successful. Negotiated version: ${this.negotiatedVersion}`
    );

    return {
      compatible: true,
      version: this.negotiatedVersion,
    };
  }

  /**
   * Check if handshake is complete
   * @returns {boolean} True if handshake completed successfully
   */
  isHandshakeComplete() {
    return this.negotiatedVersion !== null;
  }

  /**
   * Reset handshake state
   * Called when webview is reloaded or connection is lost
   */
  resetHandshake() {
    this.negotiatedVersion = null;
    this.deprecationWarnings.clear();
    this.logger.info("🦊 Protocol handshake reset");
  }

  /**
   * Register custom migration handler
   * Allows adding migration logic for future protocol versions
   * @param {number} fromVersion - Version to migrate from
   * @param {Function} handler - Migration function (message) => migratedMessage
   */
  registerMigrationHandler(fromVersion, handler) {
    if (typeof handler !== "function") {
      throw new Error("Migration handler must be a function");
    }

    if (typeof fromVersion !== "number" || fromVersion < 0) {
      throw new Error("fromVersion must be a non-negative number");
    }

    this.migrationHandlers[fromVersion] = handler;
    this.logger.info(
      `🦊 Registered migration handler: v${fromVersion} → v${fromVersion + 1}`
    );
  }

  /**
   * Get statistics about message processing
   * Useful for debugging and monitoring
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      currentVersion: this.currentVersion,
      minSupportedVersion: this.minSupportedVersion,
      negotiatedVersion: this.negotiatedVersion,
      handshakeComplete: this.isHandshakeComplete(),
      deprecationWarningsCount: this.deprecationWarnings.size,
      registeredMigrations: Object.keys(this.migrationHandlers).length,
    };
  }
}

module.exports = { MessageProtocol, CURRENT_PROTOCOL_VERSION };
