const vscode = require("vscode");
const { ErrorBoundary, ErrorSeverity } = require("./errorBoundary");
const { initializeProviders, getProviderManager } = require("./providers");

/**
 * 🦊 Nox AI Client - Multi-provider support with user-controlled API keys
 * Enterprise-grade AI client with secure API key management
 *
 * @refactored Now uses modular provider architecture for scalability
 */
class AIClient {
  constructor(context, logger, performanceMonitor) {
    this.context = context;
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.isInitialized = false;
    this.currentProvider = "anthropic";
    this.currentModel = null; // Will be set to default model of current provider
    this.debugMode = false; // Debug mode for detailed logging

    // Initialize error boundary
    this.errorBoundary = new ErrorBoundary(logger, {
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
    });

    // 🦊 Initialize modular provider system
    this.providerManager = initializeProviders(logger, performanceMonitor);
    this.providers = {
      anthropic: {
        name: "🤖 Anthropic Claude",
        models: [
          "claude-sonnet-4-5-20250929",
          "claude-sonnet-4-20250514",
          "claude-3-5-haiku-20241022",
          "claude-3-haiku-20240307",
        ],
        baseUrl: "https://api.anthropic.com/v1",
        defaultModel: "claude-sonnet-4-5-20250929",
      },
      openai: {
        name: "🧠 OpenAI GPT",
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
        baseUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-4o-mini", // Best value for most tasks
      },
      deepseek: {
        name: "⚡ DeepSeek",
        models: ["deepseek-chat", "deepseek-coder"],
        baseUrl: "https://api.deepseek.com/v1",
        defaultModel: "deepseek-chat",
      },
      local: {
        name: "🏠 Local LLM",
        models: ["ollama", "lm-studio"],
        baseUrl: "http://localhost:11434",
        defaultModel: "ollama",
      },
    };
  }

  /**
   * 🔐 Get API key securely from VS Code SecretStorage
   */
  async getApiKey(provider) {
    try {
      const secretKey = `nox.${provider}.apiKey`;
      const apiKey = await this.context.secrets.get(secretKey);

      if (!apiKey) {
        this.logger.warn(`🔑 No API key found for ${provider}`);
        return null;
      }

      this.logger.info(`🔑 Retrieved API key for ${provider}`);
      return apiKey;
    } catch (error) {
      this.logger.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * 🔐 Store API key securely in VS Code SecretStorage
   */
  async setApiKey(provider, apiKey) {
    try {
      const secretKey = `nox.${provider}.apiKey`;
      await this.context.secrets.store(secretKey, apiKey);

      this.logger.info(`🔑 Stored API key for ${provider} securely`);

      // Also update VS Code settings for UI display (without the actual key)
      const config = vscode.workspace.getConfiguration("nox");
      await config.update(
        `${provider}.apiKey`,
        "••••••••",
        vscode.ConfigurationTarget.Global
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to store API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 🔐 Remove API key from secure storage
   */
  async removeApiKey(provider) {
    try {
      const secretKey = `nox.${provider}.apiKey`;
      await this.context.secrets.delete(secretKey);

      // Also clear from VS Code settings
      const config = vscode.workspace.getConfiguration("nox");
      await config.update(
        `${provider}.apiKey`,
        "",
        vscode.ConfigurationTarget.Global
      );

      this.logger.info(`🔑 Removed API key for ${provider}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 🔍 Check if provider has valid API key
   */
  async hasValidApiKey(provider) {
    const apiKey = await this.getApiKey(provider);
    return apiKey && apiKey.length > 0;
  }

  /**
   * 🐛 Set debug mode for detailed logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.logger.info(`🐛 Debug mode set to: ${enabled}`);
  }

  /**
   * Initialize AI client with configuration
   */
  async initialize(configuration) {
    try {
      this.logger.info("🦊 Initializing Nox AI client...");

      this.currentProvider = configuration.get("aiProvider", "anthropic");

      // 🔧 Load saved model or use default
      const savedModel = configuration.get("aiModel");
      if (
        savedModel &&
        this.providers[this.currentProvider].models.includes(savedModel)
      ) {
        this.currentModel = savedModel;
        this.logger.info(`🧠 Loaded saved model: ${savedModel}`);
      } else {
        this.currentModel = this.providers[this.currentProvider].defaultModel;
        this.logger.info(`🧠 Using default model: ${this.currentModel}`);
      }

      // Check for available API keys
      const availableProviders = [];
      for (const provider of Object.keys(this.providers)) {
        if (await this.hasValidApiKey(provider)) {
          availableProviders.push(provider);
        }
      }

      this.logger.info(
        `🔑 Available providers: ${availableProviders.join(", ")}`
      );

      if (availableProviders.length === 0) {
        this.logger.warn(
          "⚠️ No API keys configured. Please set up your API keys in Nox settings."
        );
      }

      this.logger.info("🦊 Nox AI client initialized successfully");
      this.isInitialized = true;
    } catch (error) {
      this.logger.error("Failed to initialize AI Client:", error);
      throw error;
    }
  }

  /**
   * 🔄 Switch AI provider
   */
  async setProvider(provider) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unknown AI provider: ${provider}`);
      }

      const hasKey = await this.hasValidApiKey(provider);
      if (!hasKey) {
        throw new Error(
          `No API key configured for ${provider}. Please set up your API key first.`
        );
      }

      this.currentProvider = provider;
      this.logger.info(
        `🔄 Switched to AI provider: ${this.providers[provider].name}`
      );

      // Update configuration
      const config = vscode.workspace.getConfiguration("nox");
      await config.update(
        "aiProvider",
        provider,
        vscode.ConfigurationTarget.Global
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to switch provider to ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 📋 Get current provider info
   */
  getCurrentProvider() {
    return {
      id: this.currentProvider,
      ...this.providers[this.currentProvider],
    };
  }

  /**
   * 📋 Get all available providers (alias for backward compatibility)
   */
  getProviders() {
    return this.providers;
  }

  /**
   * 🔄 Set current provider (backward compatibility)
   */
  async setCurrentProvider(providerId) {
    if (!this.providers[providerId]) {
      throw new Error(`Provider ${providerId} not found`);
    }
    this.currentProvider = providerId;
    this.currentModel = this.providers[providerId].defaultModel; // ✅ Update model too!
    this.logger?.info(
      `🔄 Provider changed to: ${providerId}, model: ${this.currentModel}`
    );

    // 💾 Save provider to settings
    const config = vscode.workspace.getConfiguration("nox");
    await config.update(
      "aiProvider",
      providerId,
      vscode.ConfigurationTarget.Global
    );
  }

  /**
   * 🔄 Set current model
   */
  async setCurrentModel(model) {
    // Validate model exists for current provider
    if (!this.providers[this.currentProvider].models.includes(model)) {
      throw new Error(
        `Model ${model} not available for provider ${this.currentProvider}`
      );
    }

    this.currentModel = model;
    this.logger?.info(`🧠 Model changed to: ${model}`);

    // 💾 Save model to settings
    const config = vscode.workspace.getConfiguration("nox");
    await config.update("aiModel", model, vscode.ConfigurationTarget.Global);
  }

  /**
   * 📋 Get all available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers).map((id) => ({
      id,
      ...this.providers[id],
    }));
  }

  /**
   * 📋 Get current model (alias for backward compatibility)
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * 📋 Get providers with valid API keys
   */
  async getConfiguredProviders() {
    const configured = [];
    for (const provider of Object.keys(this.providers)) {
      if (await this.hasValidApiKey(provider)) {
        configured.push({
          id: provider,
          ...this.providers[provider],
        });
      }
    }
    return configured;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(configuration) {
    try {
      const newProvider = configuration.get("aiProvider");
      if (newProvider !== this.currentProvider) {
        await this.setProvider(newProvider);
      }
    } catch (error) {
      this.logger.error("Failed to update AI Client configuration:", error);
    }
  }

  /**
   * 🦊 Send streaming request with system prompt - NOX CONSCIOUSNESS
   */
  async sendStreamingRequestWithSystem(
    systemPrompt,
    userPrompt,
    options = {},
    onChunk = null,
    onComplete = null,
    abortController = null
  ) {
    if (!this.isInitialized) {
      throw new Error("AI Client not initialized");
    }

    const timer = this.performanceMonitor.startTimer(
      "ai_streaming_request_with_system"
    );
    const provider = this.providers[this.currentProvider];
    const messageId = options.messageId || Date.now().toString();

    // Wrap with error boundary retry logic for network failures
    return await this.errorBoundary.wrapAsyncWithRetry(
      async () => {
        try {
          this.logger.info(
            `🦊 Sending NOX-conscious streaming request to ${provider.name}...`
          );

          // Get API key
          const apiKey = await this.getApiKey(this.currentProvider);
          if (!apiKey) {
            throw new Error(
              `No API key configured for ${provider.name}. Please set up your API key first.`
            );
          }

          // Route to appropriate provider with system message support
          const requestOptions = {
            ...options,
            model: options.model || this.currentModel,
            messageId: messageId,
          };

          // 🦊 Use ProviderManager to delegate to provider
          const providerInstance = this._getProvider();
          await providerInstance.sendStreamingRequest(
            apiKey,
            systemPrompt,
            userPrompt,
            requestOptions,
            onChunk,
            onComplete,
            abortController
          );

          timer.end();
          this.performanceMonitor.recordMetric(
            "ai_streaming_request_with_system_success",
            1
          );
        } catch (error) {
          timer.end();
          this.performanceMonitor.recordMetric(
            "ai_streaming_request_with_system_error",
            1
          );
          this.logger.error(`NOX-conscious streaming request failed:`, error);
          throw error;
        }
      },
      `Streaming request to ${provider.name}`,
      {
        maxRetries: 2, // Retry network failures up to 2 times
        retryDelay: 1000,
        shouldRetry: (error) => {
          // Only retry network failures, not API errors (401, 403, etc.)
          return this.errorBoundary.isRetryableError(error);
        },
      }
    );
  }

  /**
   * 🛠️ Send streaming request with TOOL CALLING support - PHASE 2B-3
   * This enables AI to stream text AND call tools mid-stream for the best UX!
   */
  async sendStreamingRequestWithTools(
    systemPrompt,
    userPrompt,
    tools = [],
    options = {},
    callbacks = {},
    abortController = null
  ) {
    if (!this.isInitialized) {
      throw new Error("AI Client not initialized");
    }

    const timer = this.performanceMonitor.startTimer(
      "ai_streaming_request_with_tools"
    );
    const provider = this.providers[this.currentProvider];
    const messageId = options.messageId || Date.now().toString();

    // Callbacks: onChunk, onToolCall, onToolResult, onComplete
    const {
      onChunk = null,
      onToolCall = null,
      onToolResult = null,
      onComplete = null,
    } = callbacks;

    return await this.errorBoundary.wrapAsyncWithRetry(
      async () => {
        try {
          this.logger.info(
            `🛠️ Sending streaming request with ${tools.length} tools to ${provider.name}...`
          );

          // Get API key
          const apiKey = await this.getApiKey(this.currentProvider);
          if (!apiKey) {
            throw new Error(
              `No API key configured for ${provider.name}. Please set up your API key first.`
            );
          }

          const requestOptions = {
            ...options,
            model: options.model || this.currentModel,
            messageId: messageId,
          };

          // 🦊 Use ProviderManager to delegate to provider
          const providerInstance = this._getProvider();

          // Check if provider supports tool calling
          if (
            providerInstance.supportsToolCalling &&
            providerInstance.supportsToolCalling()
          ) {
            await providerInstance.sendStreamingRequestWithTools(
              apiKey,
              systemPrompt,
              userPrompt,
              tools,
              requestOptions,
              { onChunk, onToolCall, onToolResult, onComplete },
              abortController
            );
          } else {
            // Fallback: streaming without tools for unsupported providers
            this.logger.warn(
              `Provider ${this.currentProvider} doesn't support streaming + tools. Falling back to regular streaming.`
            );
            await this.sendStreamingRequestWithSystem(
              systemPrompt,
              userPrompt,
              requestOptions,
              onChunk,
              onComplete,
              abortController
            );
          }

          timer.end();
          this.performanceMonitor.recordMetric(
            "ai_streaming_request_with_tools_success",
            1
          );
        } catch (error) {
          timer.end();
          this.performanceMonitor.recordMetric(
            "ai_streaming_request_with_tools_error",
            1
          );
          this.logger.error(`Streaming request with tools failed:`, error);
          throw error;
        }
      },
      `Streaming request with tools to ${provider.name}`,
      {
        maxRetries: 2,
        retryDelay: 1000,
        shouldRetry: (error) => {
          return this.errorBoundary.isRetryableError(error);
        },
      }
    );
  }

  /**
   * 🌊 Send streaming request to AI provider - REAL-TIME IMPLEMENTATION
   */
  async sendStreamingRequest(
    prompt,
    options = {},
    onChunk = null,
    onComplete = null,
    abortController = null
  ) {
    if (!this.isInitialized) {
      throw new Error("AI Client not initialized");
    }

    const timer = this.performanceMonitor.startTimer("ai_streaming_request");
    const provider = this.providers[this.currentProvider];
    const messageId = options.messageId || Date.now().toString();

    // 🔍 PHASE 1 DIAGNOSTICS: Verify AbortController reception
    console.log(
      `🔍 AI CLIENT: sendStreamingRequest called for message: ${messageId}`
    );
    console.log(`🔍 AI CLIENT: Received abortController: ${!!abortController}`);
    if (abortController) {
      console.log(
        `🔍 AI CLIENT: AbortController ID: ${
          abortController._debugID || "NO_ID"
        }`
      );
      console.log(
        `🔍 AI CLIENT: AbortController reference: ${abortController.toString()}`
      );
      console.log(
        `🔍 AI CLIENT: Signal state on entry: ${abortController.signal.aborted}`
      );
      console.log(
        `🔍 AI CLIENT: Timestamp on entry: ${new Date().toISOString()}`
      );
    } else {
      console.log(`🔍 AI CLIENT: AbortController is NULL!`);
    }

    try {
      this.logger.info(`🌊 Starting streaming request to ${provider.name}...`);

      // Get API key
      const apiKey = await this.getApiKey(this.currentProvider);
      if (!apiKey) {
        throw new Error(
          `No API key configured for ${provider.name}. Please set up your API key first.`
        );
      }

      const requestOptions = {
        ...options,
        model: options.model || this.currentModel,
        stream: true, // Enable streaming
      };

      // 🔍 PHASE 1 DIAGNOSTICS: Pre-provider call verification
      console.log(
        `🔍 AI CLIENT: About to call ${this.currentProvider} provider for message: ${messageId}`
      );
      if (abortController) {
        console.log(
          `🔍 AI CLIENT: AbortController ID before provider call: ${
            abortController._debugID || "NO_ID"
          }`
        );
        console.log(
          `🔍 AI CLIENT: Signal state before provider call: ${abortController.signal.aborted}`
        );
        console.log(
          `🔍 AI CLIENT: Timestamp before provider call: ${new Date().toISOString()}`
        );
      }

      // 🦊 Use ProviderManager to delegate to provider
      const providerInstance = this._getProvider();
      const finalMessage = await providerInstance.sendStreamingRequest(
        apiKey,
        prompt,
        requestOptions,
        { onChunk, onComplete },
        abortController
      );

      timer.end();
      this.logger.info(`🌊 Streaming request completed in ${timer.duration}ms`);
      return finalMessage;
    } catch (error) {
      timer.end();
      this.logger.error("Streaming request failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🦊 Send request with system prompt to AI provider - NOX CONSCIOUSNESS
   */
  async sendRequestWithSystem(systemPrompt, userPrompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error("AI Client not initialized");
    }

    const timer = this.performanceMonitor.startTimer("ai_request_with_system");
    const provider = this.providers[this.currentProvider];

    try {
      this.logger.info(
        `🦊 Sending NOX-conscious request to ${provider.name}...`
      );

      // Get API key
      const apiKey = await this.getApiKey(this.currentProvider);
      if (!apiKey) {
        throw new Error(
          `No API key configured for ${provider.name}. Please set up your API key first.`
        );
      }

      // Route to appropriate provider with system message support
      const requestOptions = {
        ...options,
        model: options.model || this.currentModel,
      };

      // 🦊 Use ProviderManager to delegate to provider
      const providerInstance = this._getProvider();
      const response = await providerInstance.sendRequestWithSystem(
        apiKey,
        systemPrompt,
        userPrompt,
        requestOptions
      );

      timer.end();
      this.performanceMonitor.recordMetric("ai_request_with_system_success", 1);

      this.logger.info(
        `🦊 NOX-conscious response received from ${provider.name} (${timer.duration}ms)`
      );

      return response;
    } catch (error) {
      timer.end();
      this.performanceMonitor.recordMetric("ai_request_with_system_error", 1);

      this.logger.error(`AI request with system failed:`, error);
      throw error;
    }
  }

  /**
   * 🤖 Send request to AI provider - REAL IMPLEMENTATION
   */
  async sendRequest(prompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error("AI Client not initialized");
    }

    const timer = this.performanceMonitor.startTimer("ai_request");
    const provider = this.providers[this.currentProvider];

    try {
      this.logger.info(`🤖 Sending request to ${provider.name}...`);

      // Get API key
      const apiKey = await this.getApiKey(this.currentProvider);
      if (!apiKey) {
        throw new Error(
          `No API key configured for ${provider.name}. Please set up your API key first.`
        );
      }

      // Route to appropriate provider
      const requestOptions = {
        ...options,
        model: options.model || this.currentModel,
      };

      // 🦊 Use ProviderManager to delegate to provider
      const providerInstance = this._getProvider();
      const response = await providerInstance.sendRequest(
        apiKey,
        prompt,
        requestOptions
      );

      timer.end();
      this.performanceMonitor.recordCost(
        response.provider,
        response.model,
        response.tokens,
        response.cost
      );

      this.logger.info(`🤖 Request completed in ${timer.duration}ms`);
      return response;
    } catch (error) {
      timer.end();
      this.logger.error("AI request failed:", error);
      throw error;
    }
  }

  // ============================================================================
  // 🦊 PROVIDER METHODS - Now delegated to ProviderManager
  // ============================================================================

  /**
   * Get the current provider instance from ProviderManager
   */
  _getProvider(providerId = null) {
    const id = providerId || this.currentProvider;
    return this.providerManager.getProvider(id);
  }

  /**
   * Estimate tokens (rough approximation)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      return new Error(`API Error ${status}: ${JSON.stringify(data)}`);
    }
    return error;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.logger?.info("🧹 Cleaning up AI Client resources...");

      // Cleanup all providers
      if (this.providerManager) {
        const providerIds = this.providerManager.listProviders();
        for (const providerId of providerIds) {
          try {
            const provider = this.providerManager.getProvider(providerId);
            if (provider.cleanup && typeof provider.cleanup === "function") {
              await provider.cleanup();
            }
          } catch (error) {
            this.logger?.warn(
              `Failed to cleanup provider ${providerId}:`,
              error
            );
          }
        }
      }

      this.isInitialized = false;
      this.logger?.info("✅ AI Client cleanup complete");
    } catch (error) {
      this.logger?.error("Failed to cleanup AI Client:", error);
    }
  }
}

module.exports = AIClient;
