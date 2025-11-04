const vscode = require("vscode");
const axios = require("axios");
const { ErrorBoundary, ErrorSeverity } = require("./errorBoundary");

/**
 * 🦊 Nox AI Client - Multi-provider support with user-controlled API keys
 * Enterprise-grade AI client with secure API key management
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

      // Set default model for current provider
      this.currentModel = this.providers[this.currentProvider].defaultModel;

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
   * 📋 Get all available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers).map((id) => ({
      id,
      ...this.providers[id],
    }));
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
          };

          switch (this.currentProvider) {
            case "anthropic":
              await this.callAnthropicStreamingAPIWithSystem(
                apiKey,
                systemPrompt,
                userPrompt,
                requestOptions,
                onChunk,
                onComplete,
                abortController
              );
              break;
            case "openai":
              // Real streaming for OpenAI with NOX consciousness
              await this.callOpenAIStreamingAPIWithSystem(
                apiKey,
                systemPrompt,
                userPrompt,
                requestOptions,
                onChunk,
                onComplete,
                abortController
              );
              break;
            case "deepseek":
              // Real streaming for DeepSeek with NOX consciousness
              await this.callDeepSeekStreamingAPIWithSystem(
                apiKey,
                systemPrompt,
                userPrompt,
                requestOptions,
                onChunk,
                onComplete,
                abortController
              );
              break;
            case "local":
              // Real streaming for Local LLMs with NOX consciousness
              await this.callLocalStreamingAPIWithSystem(
                systemPrompt,
                userPrompt,
                requestOptions,
                onChunk,
                onComplete,
                abortController
              );
              break;
            default:
              throw new Error(`Unsupported provider: ${this.currentProvider}`);
          }

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
          };

          // Route to provider-specific streaming + tools implementation
          switch (this.currentProvider) {
            case "openai":
              await this.callOpenAIStreamingAPIWithTools(
                apiKey,
                systemPrompt,
                userPrompt,
                tools,
                requestOptions,
                { onChunk, onToolCall, onToolResult, onComplete },
                abortController
              );
              break;
            case "anthropic":
              await this.callAnthropicStreamingAPIWithTools(
                apiKey,
                systemPrompt,
                userPrompt,
                tools,
                requestOptions,
                { onChunk, onToolCall, onToolResult, onComplete },
                abortController
              );
              break;
            default:
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

      // Route to appropriate streaming provider
      let finalMessage;
      switch (this.currentProvider) {
        case "anthropic":
          finalMessage = await this.callAnthropicStreamingAPI(
            apiKey,
            prompt,
            requestOptions,
            messageId,
            onChunk,
            onComplete,
            abortController
          );
          break;
        case "openai":
          finalMessage = await this.callOpenAIStreamingAPI(
            apiKey,
            prompt,
            requestOptions,
            messageId,
            onChunk,
            onComplete,
            abortController
          );
          break;
        case "deepseek":
          finalMessage = await this.callDeepSeekStreamingAPI(
            apiKey,
            prompt,
            requestOptions,
            messageId,
            onChunk,
            onComplete,
            abortController
          );
          break;
        case "local":
          finalMessage = await this.callLocalStreamingAPI(
            prompt,
            requestOptions,
            messageId,
            onChunk,
            onComplete,
            abortController
          );
          break;
        default:
          throw new Error(
            `Streaming not supported for provider: ${this.currentProvider}`
          );
      }

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
      let response;
      const requestOptions = {
        ...options,
        model: options.model || this.currentModel,
      };

      switch (this.currentProvider) {
        case "anthropic":
          response = await this.callAnthropicAPIWithSystem(
            apiKey,
            systemPrompt,
            userPrompt,
            requestOptions
          );
          break;
        case "openai":
          response = await this.callOpenAIAPIWithSystem(
            apiKey,
            systemPrompt,
            userPrompt,
            requestOptions
          );
          break;
        case "deepseek":
          response = await this.callDeepSeekAPIWithSystem(
            apiKey,
            systemPrompt,
            userPrompt,
            requestOptions
          );
          break;
        case "local":
          response = await this.callLocalAPIWithSystem(
            systemPrompt,
            userPrompt,
            requestOptions
          );
          break;
        default:
          throw new Error(`Unsupported provider: ${this.currentProvider}`);
      }

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
      let response;
      const requestOptions = {
        ...options,
        model: options.model || this.currentModel,
      };

      switch (this.currentProvider) {
        case "anthropic":
          response = await this.callAnthropicAPI(
            apiKey,
            prompt,
            requestOptions
          );
          break;
        case "openai":
          response = await this.callOpenAIAPI(apiKey, prompt, requestOptions);
          break;
        case "deepseek":
          response = await this.callDeepSeekAPI(apiKey, prompt, requestOptions);
          break;
        case "local":
          response = await this.callLocalAPI(prompt, requestOptions);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.currentProvider}`);
      }

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

  /**
   * 🦊 Call Anthropic Claude API with system prompt and tool use - NOX TOOL CALLING
   * @param {string} apiKey - Anthropic API key
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Array} tools - Array of tool definitions (Claude tool use format)
   * @param {Object} options - Request options
   */
  async callAnthropicAPIWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools = [],
    options = {}
  ) {
    try {
      const model = options.model || this.providers.anthropic.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      // Support both single prompt (backward compatible) and messages array
      let messages;
      if (typeof userPromptOrMessages === "string") {
        messages = [
          {
            role: "user",
            content: userPromptOrMessages,
          },
        ];
      } else if (Array.isArray(userPromptOrMessages)) {
        messages = userPromptOrMessages;
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const requestBody = {
        model: model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages,
        temperature: options.temperature || 0.7,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: data.content, // Claude returns array of content blocks
        tool_calls: data.content.filter((block) => block.type === "tool_use"), // Extract tool uses
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateAnthropicCost(data.usage, model),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Anthropic API with tools call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🦊 Call Anthropic Claude API with system prompt - NOX CONSCIOUSNESS
   * @param {string} apiKey - Anthropic API key
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Object} options - Request options
   */
  async callAnthropicAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options = {}
  ) {
    try {
      const model = options.model || this.providers.anthropic.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      // Support both single prompt (backward compatible) and messages array (Phase 2A)
      let messages;
      if (typeof userPromptOrMessages === "string") {
        // Backward compatible: single user prompt
        messages = [
          {
            role: "user",
            content: userPromptOrMessages,
          },
        ];
      } else if (Array.isArray(userPromptOrMessages)) {
        // Phase 2A: messages array for conversation history
        messages = userPromptOrMessages;
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: data.content[0].text,
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateAnthropicCost(data.usage, model),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Anthropic API with system call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🤖 Call Anthropic Claude API
   */
  async callAnthropicAPI(apiKey, prompt, options = {}) {
    try {
      const model = options.model || this.providers.anthropic.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: model,
          max_tokens: maxTokens,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        content: data.content[0].text,
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateAnthropicCost(data.usage, model),
      };
    } catch (error) {
      this.logger.error("Anthropic API call failed:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.error?.message ||
          error.response.data?.message ||
          JSON.stringify(error.response.data);
        throw new Error(
          `Anthropic API error: ${error.response.status} - ${errorMessage}`
        );
      } else if (error.request) {
        throw new Error("Anthropic API: No response received");
      } else {
        throw new Error(`Anthropic API: ${error.message}`);
      }
    }
  }

  /**
   * 🦊 Call OpenAI GPT API with system prompt and tool calling - NOX TOOL CALLING
   * @param {string} apiKey - OpenAI API key
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Array} tools - Array of tool definitions (OpenAI function calling format)
   * @param {Object} options - Request options
   */
  async callOpenAIAPIWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools = [],
    options = {}
  ) {
    try {
      const model = options.model || this.providers.openai.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      // Support both single prompt (backward compatible) and messages array
      let messages;
      if (typeof userPromptOrMessages === "string") {
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptOrMessages },
        ];
      } else if (Array.isArray(userPromptOrMessages)) {
        messages = [
          { role: "system", content: systemPrompt },
          ...userPromptOrMessages,
        ];
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const requestBody = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: options.temperature || 0.7,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = options.tool_choice || "auto";
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;
      const message = data.choices[0].message;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: message.content,
        tool_calls: message.tool_calls || [], // Include tool calls if present
        provider: "openai",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateOpenAICost(data.usage, model),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("OpenAI API with tools call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🦊 Call OpenAI GPT API with system prompt - NOX CONSCIOUSNESS
   * @param {string} apiKey - OpenAI API key
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Object} options - Request options
   */
  async callOpenAIAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options = {}
  ) {
    try {
      const model = options.model || this.providers.openai.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      // Support both single prompt (backward compatible) and messages array (Phase 2A)
      let messages;
      if (typeof userPromptOrMessages === "string") {
        // Backward compatible: single user prompt
        messages = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPromptOrMessages,
          },
        ];
      } else if (Array.isArray(userPromptOrMessages)) {
        // Phase 2A: messages array for conversation history
        // OpenAI includes system message in messages array
        messages = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...userPromptOrMessages,
        ];
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: data.choices[0].message.content,
        provider: "openai",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateOpenAICost(data.usage, model),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("OpenAI API with system call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🧠 Call OpenAI GPT API
   */
  async callOpenAIAPI(apiKey, prompt, options = {}) {
    try {
      const model = options.model || this.providers.openai.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        content: data.choices[0].message.content,
        provider: "openai",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateOpenAICost(data.usage, model),
      };
    } catch (error) {
      this.logger.error("OpenAI API call failed:", error);

      // Handle axios errors properly
      if (error.response) {
        const errorMessage =
          error.response.data?.error?.message ||
          error.response.data?.message ||
          JSON.stringify(error.response.data);
        throw new Error(
          `OpenAI API error: ${error.response.status} - ${errorMessage}`
        );
      } else if (error.request) {
        throw new Error("OpenAI API: No response received");
      } else {
        throw new Error(`OpenAI API: ${error.message}`);
      }
    }
  }

  /**
   * 🦊 Call OpenAI GPT Streaming API with system prompt - NOX CONSCIOUSNESS
   */
  async callOpenAIStreamingAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || this.providers.openai.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const messageId = options.messageId || Date.now().toString();

    // Support both single prompt (backward compatible) and messages array (Phase 2A)
    let messages;
    if (typeof userPromptOrMessages === "string") {
      // Backward compatible: single user prompt
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptOrMessages },
      ];
    } else if (Array.isArray(userPromptOrMessages)) {
      // Phase 2A: messages array for conversation history
      // OpenAI includes system message in messages array
      messages = [
        { role: "system", content: systemPrompt },
        ...userPromptOrMessages,
      ];
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      console.log(
        `🦊 NOX STREAMING: Starting NOX-conscious OpenAI stream for message: ${messageId}`
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            stream: true,
            temperature: options.temperature || 0.7,
          }),
          signal: abortController?.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      // Stream processing with NOX-conscious logging
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      while (true) {
        if (abortController?.signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const chunkText = parsed.choices[0].delta.content;
                fullContent += chunkText;
                totalTokens += 1; // Approximate token count

                if (this.debugMode) {
                  console.log(
                    `🦊 NOX STREAMING: Processing NOX-conscious OpenAI chunk for message: ${messageId}, abort state: ${abortController?.signal?.aborted}`
                  );
                }

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Complete the stream
      const usage = {
        prompt_tokens: Math.floor(totalTokens * 0.1), // Estimate 10% for prompt
        completion_tokens: Math.floor(totalTokens * 0.9), // Estimate 90% for completion
        total_tokens: totalTokens,
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "openai",
        model: model,
        tokens: totalTokens,
        cost: this.calculateOpenAICost(usage, model),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🦊 NOX STREAMING: NOX-conscious OpenAI stream completed for message: ${messageId}`
      );

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("OpenAI streaming API with system failed:", error);
      throw error;
    }
  }

  /**
   * 🛠️ OpenAI Streaming API with TOOL CALLING - PHASE 2B-3
   * Streams text AND handles tool calls mid-stream for ultimate UX!
   */
  async callOpenAIStreamingAPIWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options,
    callbacks,
    abortController = null
  ) {
    const model = options.model || this.providers.openai.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const messageId = options.messageId || Date.now().toString();

    const { onChunk, onToolCall, onToolResult, onComplete } = callbacks;

    // Build messages array
    let messages;
    if (typeof userPromptOrMessages === "string") {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptOrMessages },
      ];
    } else if (Array.isArray(userPromptOrMessages)) {
      messages = [
        { role: "system", content: systemPrompt },
        ...userPromptOrMessages,
      ];
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      console.log(
        `🛠️ STREAMING + TOOLS: Starting OpenAI stream with ${tools.length} tools for message: ${messageId}`
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            stream: true,
            temperature: options.temperature || 0.7,
            tools: tools, // 🛠️ TOOLS ENABLED!
            tool_choice: options.tool_choice || "auto",
          }),
          signal: abortController?.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      // Stream processing with tool call detection
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;
      let toolCalls = []; // Accumulate tool calls
      let currentToolCall = null;

      while (true) {
        if (abortController?.signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // Handle text content streaming
              if (delta?.content) {
                const chunkText = delta.content;
                fullContent += chunkText;
                totalTokens += 1;

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }

              // Handle tool calls streaming
              if (delta?.tool_calls) {
                for (const toolCallDelta of delta.tool_calls) {
                  const index = toolCallDelta.index;

                  // Initialize new tool call
                  if (!toolCalls[index]) {
                    toolCalls[index] = {
                      id: toolCallDelta.id || `tool_${index}`,
                      type: "function",
                      function: {
                        name: "",
                        arguments: "",
                      },
                    };
                  }

                  // Accumulate function name
                  if (toolCallDelta.function?.name) {
                    toolCalls[index].function.name +=
                      toolCallDelta.function.name;
                  }

                  // Accumulate function arguments
                  if (toolCallDelta.function?.arguments) {
                    toolCalls[index].function.arguments +=
                      toolCallDelta.function.arguments;
                  }
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Process tool calls if any were detected
      if (toolCalls.length > 0) {
        console.log(
          `🛠️ STREAMING + TOOLS: Detected ${toolCalls.length} tool calls`
        );

        for (const toolCall of toolCalls) {
          if (onToolCall && toolCall.id && toolCall.function?.name) {
            try {
              // 🔍 DEBUG: Log raw arguments string
              console.log(
                `🔍 DEBUG: Raw tool arguments for ${toolCall.function.name}:`,
                toolCall.function.arguments
              );

              // Parse arguments safely - only if it's valid JSON
              let parameters = {};
              if (toolCall.function.arguments) {
                try {
                  parameters = JSON.parse(toolCall.function.arguments);
                  console.log(
                    `✅ DEBUG: Parsed parameters:`,
                    JSON.stringify(parameters, null, 2)
                  );

                  // 🔧 FIX: OpenAI sometimes adds colons to parameter names
                  // Normalize parameter keys by removing trailing colons
                  const normalizedParams = {};
                  for (const [key, value] of Object.entries(parameters)) {
                    const normalizedKey = key.endsWith(":") ? key.slice(0, -1) : key;
                    normalizedParams[normalizedKey] = value;
                  }
                  parameters = normalizedParams;

                  console.log(
                    `🔧 DEBUG: Normalized parameters:`,
                    JSON.stringify(parameters, null, 2)
                  );
                } catch (jsonError) {
                  console.warn(
                    `🛠️ Invalid JSON in tool arguments for ${toolCall.function.name}:`,
                    toolCall.function.arguments
                  );
                  console.warn(`JSON Error:`, jsonError.message);
                  parameters = {};
                }
              }

              // Notify that tool is being called
              await onToolCall({
                id: toolCall.id,
                name: toolCall.function.name,
                parameters: parameters,
              });
            } catch (error) {
              console.error(
                `🛠️ Error processing tool call ${toolCall.function.name}:`,
                error
              );
            }
          }
        }
      }

      // Complete the stream
      const usage = {
        prompt_tokens: Math.floor(totalTokens * 0.1),
        completion_tokens: Math.floor(totalTokens * 0.9),
        total_tokens: totalTokens,
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        tool_calls: toolCalls, // Include tool calls in response
        provider: "openai",
        model: model,
        tokens: totalTokens,
        cost: this.calculateOpenAICost(usage, model),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🛠️ STREAMING + TOOLS: OpenAI stream completed for message: ${messageId}`
      );

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("OpenAI streaming API with tools failed:", error);
      throw error;
    }
  }

  /**
   * 🦊 Call DeepSeek API with system prompt - NOX CONSCIOUSNESS
   * @param {string} apiKey - DeepSeek API key
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Object} options - Request options
   */
  async callDeepSeekAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options = {}
  ) {
    try {
      const model = options.model || this.providers.deepseek.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      // Support both single prompt (backward compatible) and messages array (Phase 2A)
      let messages;
      if (typeof userPromptOrMessages === "string") {
        // Backward compatible: single user prompt
        messages = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPromptOrMessages,
          },
        ];
      } else if (Array.isArray(userPromptOrMessages)) {
        // Phase 2A: messages array for conversation history
        // DeepSeek uses OpenAI-compatible format (system message in messages array)
        messages = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...userPromptOrMessages,
        ];
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: data.choices[0].message.content,
        provider: "deepseek",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateDeepSeekCost(data.usage, model),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("DeepSeek API with system call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * ⚡ Call DeepSeek API
   */
  async callDeepSeekAPI(apiKey, prompt, options = {}) {
    try {
      const model = options.model || this.providers.deepseek.defaultModel;
      const maxTokens = options.maxTokens || 4000;

      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;

      return {
        content: data.choices[0].message.content,
        provider: "deepseek",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateDeepSeekCost(data.usage, model),
      };
    } catch (error) {
      this.logger.error("DeepSeek API call failed:", error);

      // Handle axios errors properly
      if (error.response) {
        throw new Error(
          `DeepSeek API error: ${error.response.status} - ${
            error.response.data.error?.message || error.response.data
          }`
        );
      } else if (error.request) {
        throw new Error("DeepSeek API: No response received");
      } else {
        throw new Error(`DeepSeek API: ${error.message}`);
      }
    }
  }

  /**
   * 🦊 Call Local LLM API with system prompt - NOX CONSCIOUSNESS
   * @param {string} systemPrompt - System prompt for AI identity
   * @param {string|Array} userPromptOrMessages - Single user prompt OR array of message objects [{role, content}]
   * @param {Object} options - Request options
   */
  async callLocalAPIWithSystem(
    systemPrompt,
    userPromptOrMessages,
    options = {}
  ) {
    try {
      const model = options.model || "llama2";
      const baseUrl = options.baseUrl || this.providers.local.baseUrl;

      // Support both single prompt (backward compatible) and messages array (Phase 2A)
      let combinedPrompt;
      if (typeof userPromptOrMessages === "string") {
        // Backward compatible: single user prompt
        combinedPrompt = `${systemPrompt}\n\nUser: ${userPromptOrMessages}\n\nAssistant:`;
      } else if (Array.isArray(userPromptOrMessages)) {
        // Phase 2A: messages array for conversation history
        // Combine system prompt and all messages into a single prompt for local models
        combinedPrompt = `${systemPrompt}\n\n`;
        for (const msg of userPromptOrMessages) {
          if (msg.role === "user") {
            combinedPrompt += `User: ${msg.content}\n\n`;
          } else if (msg.role === "assistant") {
            combinedPrompt += `Assistant: ${msg.content}\n\n`;
          }
        }
        combinedPrompt += "Assistant:";
      } else {
        throw new Error("userPromptOrMessages must be a string or array");
      }

      const response = await axios.post(
        `${baseUrl}/api/generate`,
        {
          model: model,
          prompt: combinedPrompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 120000, // 2 minute timeout for local models
        }
      );

      const data = response.data;

      return {
        id: Date.now().toString(),
        type: "assistant",
        content: data.response,
        provider: "local",
        model: model,
        tokens: 0, // Local models don't track tokens
        cost: 0, // Local models are free
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Local LLM API with system call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🦊 Call DeepSeek Streaming API with system prompt - NOX CONSCIOUSNESS
   */
  async callDeepSeekStreamingAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || this.providers.deepseek.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const messageId = options.messageId || Date.now().toString();

    // Support both single prompt (backward compatible) and messages array (Phase 2A)
    let messages;
    if (typeof userPromptOrMessages === "string") {
      // Backward compatible: single user prompt
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptOrMessages },
      ];
    } else if (Array.isArray(userPromptOrMessages)) {
      // Phase 2A: messages array for conversation history
      // DeepSeek uses OpenAI-compatible format (system message in messages array)
      messages = [
        { role: "system", content: systemPrompt },
        ...userPromptOrMessages,
      ];
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      console.log(
        `🦊 NOX STREAMING: Starting NOX-conscious DeepSeek stream for message: ${messageId}`
      );

      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            stream: true,
            temperature: options.temperature || 0.7,
          }),
          signal: abortController?.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText}`
        );
      }

      // Stream processing with NOX-conscious logging
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      while (true) {
        if (abortController?.signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const chunkText = parsed.choices[0].delta.content;
                fullContent += chunkText;
                totalTokens += 1; // Approximate token count

                if (this.debugMode) {
                  console.log(
                    `🦊 NOX STREAMING: Processing NOX-conscious DeepSeek chunk for message: ${messageId}, abort state: ${abortController?.signal?.aborted}`
                  );
                }

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Complete the stream
      const usage = {
        prompt_tokens: Math.floor(totalTokens * 0.1), // Estimate 10% for prompt
        completion_tokens: Math.floor(totalTokens * 0.9), // Estimate 90% for completion
        total_tokens: totalTokens,
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "deepseek",
        model: model,
        tokens: totalTokens,
        cost: this.calculateDeepSeekCost(usage, model),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🦊 NOX STREAMING: NOX-conscious DeepSeek stream completed for message: ${messageId}`
      );

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("DeepSeek streaming API with system failed:", error);
      throw error;
    }
  }

  /**
   * 🏠 Call Local LLM API (Ollama/LM Studio)
   */
  async callLocalAPI(prompt, options = {}) {
    try {
      const model = options.model || "llama2";
      const baseUrl = options.baseUrl || this.providers.local.baseUrl;

      const response = await axios.post(
        `${baseUrl}/api/generate`,
        {
          model: model,
          prompt: prompt,
          stream: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 120000, // 2 minute timeout for local models
        }
      );

      const data = response.data;

      return {
        content: data.response,
        provider: "local",
        model: model,
        tokens: 0, // Local models don't track tokens
        cost: 0, // Local models are free
      };
    } catch (error) {
      this.logger.error("Local LLM API call failed:", error);

      // Handle axios errors properly
      if (error.response) {
        throw new Error(
          `Local LLM API error: ${error.response.status} - ${error.response.data}`
        );
      } else if (error.request) {
        throw new Error(
          "Local LLM API: No response received - is your local LLM server running?"
        );
      } else {
        throw new Error(`Local LLM API: ${error.message}`);
      }
    }
  }

  /**
   * 💰 Calculate Anthropic API costs
   */
  calculateAnthropicCost(usage, model) {
    // Anthropic pricing (as of 2024-2025)
    const pricing = {
      // 🏆 Claude 3.5 Sonnet (Current Production)
      "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 }, // per 1K tokens
      "claude-3-5-sonnet-20240620": { input: 0.003, output: 0.015 },

      // 🚀 Claude 4.5 Sonnet (Latest)
      "claude-sonnet-4-5-20250929": { input: 0.003, output: 0.015 }, // Estimated pricing

      // 🏃 Claude 3.5 Haiku (Fast & Cheap)
      "claude-3-5-haiku-20241022": { input: 0.00025, output: 0.00125 },

      // 📚 Legacy Models
      "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
      "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
    };

    const rates = pricing[model] || pricing["claude-sonnet-4-5-20250929"];
    return (
      (usage.input_tokens * rates.input + usage.output_tokens * rates.output) /
      1000
    );
  }

  /**
   * 🦊 Call Local LLM Streaming API with system prompt - NOX CONSCIOUSNESS
   */
  async callLocalStreamingAPIWithSystem(
    systemPrompt,
    userPromptOrMessages,
    options,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || "llama2";
    const baseUrl = options.baseUrl || this.providers.local.baseUrl;
    const messageId = options.messageId || Date.now().toString();

    // Support both single prompt (backward compatible) and messages array (Phase 2A)
    let combinedPrompt;
    if (typeof userPromptOrMessages === "string") {
      // Backward compatible: single user prompt
      combinedPrompt = `${systemPrompt}\n\nUser: ${userPromptOrMessages}\n\nAssistant:`;
    } else if (Array.isArray(userPromptOrMessages)) {
      // Phase 2A: messages array for conversation history
      // Combine all messages into a single prompt for local models
      combinedPrompt = systemPrompt + "\n\n";
      for (const msg of userPromptOrMessages) {
        if (msg.role === "user") {
          combinedPrompt += `User: ${msg.content}\n\n`;
        } else if (msg.role === "assistant") {
          combinedPrompt += `Assistant: ${msg.content}\n\n`;
        }
      }
      combinedPrompt += "Assistant:";
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      console.log(
        `🦊 NOX STREAMING: Starting NOX-conscious Local LLM stream for message: ${messageId}`
      );

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: combinedPrompt,
          stream: true,
          options: {
            temperature: options.temperature || 0.7,
          },
        }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Local LLM API error: ${response.status} ${response.statusText}`
        );
      }

      // Stream processing with NOX-conscious logging
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      while (true) {
        if (abortController?.signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                const chunkText = parsed.response;
                fullContent += chunkText;
                totalTokens += 1; // Approximate token count

                if (this.debugMode) {
                  console.log(
                    `🦊 NOX STREAMING: Processing NOX-conscious Local LLM chunk for message: ${messageId}, abort state: ${abortController?.signal?.aborted}`
                  );
                }

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }

              // Check if done
              if (parsed.done) {
                break;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Complete the stream
      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "local",
        model: model,
        tokens: totalTokens,
        cost: 0, // Local models are free
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🦊 NOX STREAMING: NOX-conscious Local LLM stream completed for message: ${messageId}`
      );

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("Local LLM streaming API with system failed:", error);
      throw error;
    }
  }

  /**
   * 💰 Calculate OpenAI API costs
   */
  calculateOpenAICost(usage, model) {
    // OpenAI pricing (as of 2024-2025)
    const pricing = {
      // 🏆 Main Production Models
      "chatgpt-4o-latest": { input: 0.0025, output: 0.01 },
      "gpt-4o": { input: 0.0025, output: 0.01 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-4-turbo": { input: 0.01, output: 0.03 },
      "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

      // 🚀 Next Generation (estimated pricing)
      "gpt-4.1": { input: 0.005, output: 0.015 },
      "gpt-5": { input: 0.01, output: 0.03 },

      // 🎯 Specialized Models (premium pricing)
      "gpt-4o-audio-preview": { input: 0.005, output: 0.02 },
      "gpt-4o-search-preview": { input: 0.005, output: 0.02 },
      "gpt-4o-realtime-preview": { input: 0.005, output: 0.02 },

      // Legacy models (deprecated but still available)
      "gpt-4": { input: 0.03, output: 0.06 },
      "gpt-4o-2024-11-20": { input: 0.0025, output: 0.01 },
      "gpt-4o-mini-2024-07-18": { input: 0.00015, output: 0.0006 },
    };

    const rates = pricing[model] || pricing["gpt-4o-mini"];
    return (
      (usage.prompt_tokens * rates.input +
        usage.completion_tokens * rates.output) /
      1000
    );
  }

  /**
   * 💰 Calculate DeepSeek API costs
   */
  calculateDeepSeekCost(usage, model) {
    // DeepSeek pricing (very competitive)
    const pricing = {
      "deepseek-chat": { input: 0.00014, output: 0.00028 }, // per 1K tokens
      "deepseek-coder": { input: 0.00014, output: 0.00028 },
    };

    const rates = pricing[model] || pricing["deepseek-chat"];
    return (
      (usage.prompt_tokens * rates.input +
        usage.completion_tokens * rates.output) /
      1000
    );
  }

  /**
   * 🔄 Set current provider
   */
  async setCurrentProvider(provider) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    this.currentProvider = provider;
    this.currentModel = this.providers[provider].defaultModel;

    // Update configuration
    const config = vscode.workspace.getConfiguration("nox");
    await config.update(
      "aiProvider",
      provider,
      vscode.ConfigurationTarget.Global
    );

    this.logger.info(`🔄 Current provider set to: ${provider}`);
  }

  /**
   * 🔄 Set current model
   */
  async setCurrentModel(model) {
    const provider = this.providers[this.currentProvider];
    if (!provider.models.includes(model)) {
      throw new Error(
        `Model ${model} not available for provider ${this.currentProvider}`
      );
    }

    this.currentModel = model;
    this.logger.info(`🔄 Current model set to: ${model}`);
  }

  /**
   * 📋 Get current provider ID (string)
   */
  getCurrentProviderId() {
    return this.currentProvider;
  }

  /**
   * 📋 Get current model
   */
  getCurrentModel() {
    return (
      this.currentModel || this.providers[this.currentProvider].defaultModel
    );
  }

  /**
   * 📋 Get all providers
   */
  getProviders() {
    return this.providers;
  }

  /**
   * 📋 Get models for current provider
   */
  getCurrentProviderModels() {
    return this.providers[this.currentProvider].models;
  }

  /**
   * 📋 Get models for specific provider
   */
  getProviderModels(provider) {
    return this.providers[provider]?.models || [];
  }

  /**
   * 🚨 Enhanced error message formatting
   */
  formatErrorMessage(error, provider) {
    const errorInfo = this.categorizeError(error, provider);

    return {
      title: errorInfo.title,
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      category: errorInfo.category,
      helpUrl: errorInfo.helpUrl,
    };
  }

  /**
   * 🔍 Categorize and enhance error messages
   */
  categorizeError(error, provider) {
    const errorMessage = error.message || error.toString();

    // API Key errors
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Invalid API key")
    ) {
      return {
        title: "🔑 API Key Issue",
        message: `Your ${
          this.providers[provider]?.name || provider
        } API key appears to be invalid or missing.`,
        suggestion: `Please check your API key in Nox Settings and ensure it's correctly configured for ${provider}.`,
        category: "api_key",
        helpUrl: this.getProviderHelpUrl(provider, "api_key"),
      };
    }

    // Rate limit errors
    if (
      errorMessage.includes("429") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("quota")
    ) {
      return {
        title: "⏱️ Rate Limit Exceeded",
        message: `You've exceeded the rate limit for ${
          this.providers[provider]?.name || provider
        }.`,
        suggestion:
          "Please wait a moment before trying again, or consider upgrading your API plan for higher limits.",
        category: "rate_limit",
        helpUrl: this.getProviderHelpUrl(provider, "rate_limit"),
      };
    }

    // Network errors
    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout")
    ) {
      return {
        title: "🌐 Network Connection Issue",
        message: "Unable to connect to the AI service.",
        suggestion:
          "Please check your internet connection and try again. If using a local LLM, ensure the server is running.",
        category: "network",
        helpUrl: this.getProviderHelpUrl(provider, "network"),
      };
    }

    // Model errors
    if (
      errorMessage.includes("404") ||
      errorMessage.includes("model") ||
      errorMessage.includes("not found")
    ) {
      return {
        title: "🤖 Model Not Available",
        message: `The selected model is not available or doesn't exist for ${
          this.providers[provider]?.name || provider
        }.`,
        suggestion:
          "Please select a different model from the dropdown or check if your API plan includes access to this model.",
        category: "model",
        helpUrl: this.getProviderHelpUrl(provider, "model"),
      };
    }

    // Token/context errors
    if (
      errorMessage.includes("context") ||
      errorMessage.includes("token") ||
      errorMessage.includes("too long")
    ) {
      return {
        title: "📏 Message Too Long",
        message: "Your message exceeds the maximum token limit for this model.",
        suggestion:
          "Please shorten your message or break it into smaller parts.",
        category: "context",
        helpUrl: this.getProviderHelpUrl(provider, "context"),
      };
    }

    // Generic error
    return {
      title: "❌ Unexpected Error",
      message: errorMessage,
      suggestion:
        "Please try again. If the problem persists, check your API key and internet connection.",
      category: "generic",
      helpUrl: this.getProviderHelpUrl(provider, "generic"),
    };
  }

  /**
   * 🔗 Get help URLs for different providers and error types
   */
  getProviderHelpUrl(provider, errorType) {
    const helpUrls = {
      anthropic: {
        api_key: "https://console.anthropic.com/account/keys",
        rate_limit: "https://docs.anthropic.com/claude/reference/rate-limits",
        model: "https://docs.anthropic.com/claude/docs/models-overview",
        network: "https://docs.anthropic.com/claude/reference/getting-started",
        context:
          "https://docs.anthropic.com/claude/docs/models-overview#context-window",
        generic: "https://docs.anthropic.com/claude/reference/errors",
      },
      openai: {
        api_key: "https://platform.openai.com/account/api-keys",
        rate_limit: "https://platform.openai.com/docs/guides/rate-limits",
        model: "https://platform.openai.com/docs/models",
        network: "https://platform.openai.com/docs/quickstart",
        context: "https://platform.openai.com/docs/guides/text-generation",
        generic: "https://platform.openai.com/docs/guides/error-codes",
      },
      deepseek: {
        api_key: "https://platform.deepseek.com/api_keys",
        rate_limit: "https://platform.deepseek.com/docs",
        model: "https://platform.deepseek.com/docs",
        network: "https://platform.deepseek.com/docs",
        context: "https://platform.deepseek.com/docs",
        generic: "https://platform.deepseek.com/docs",
      },
      local: {
        api_key: null,
        rate_limit: null,
        model: "https://ollama.com/library",
        network: "https://ollama.com/docs",
        context: "https://ollama.com/docs",
        generic: "https://ollama.com/docs",
      },
    };

    return helpUrls[provider]?.[errorType] || null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.logger.info("Cleaning up AI Client...");
      this.isInitialized = false;
    } catch (error) {
      this.logger.error("Error during AI Client cleanup:", error);
    }
  }

  /**
   * 📊 Estimate token count for streaming progress
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token for most languages
    // This is a conservative estimate that works well for progress tracking
    return Math.ceil(text.length / 4);
  }

  /**
   * 🦊 Anthropic Claude Streaming API with system prompt - NOX CONSCIOUSNESS
   */
  async callAnthropicStreamingAPIWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || this.providers.anthropic.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const messageId = options.messageId || Date.now().toString();

    // Support both single prompt (backward compatible) and messages array (Phase 2A)
    let messages;
    if (typeof userPromptOrMessages === "string") {
      // Backward compatible: single user prompt
      messages = [
        {
          role: "user",
          content: userPromptOrMessages,
        },
      ];
    } else if (Array.isArray(userPromptOrMessages)) {
      // Phase 2A: messages array for conversation history
      messages = userPromptOrMessages;
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
          stream: true,
          temperature: options.temperature || 0.7,
        }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      console.log(
        `🦊 NOX STREAMING: Starting NOX-conscious stream for message: ${messageId}`
      );
      console.log(
        `🦊 NOX STREAMING: Initial abort signal state: ${abortController?.signal?.aborted}`
      );

      // Process streaming chunks with NOX consciousness
      while (true) {
        if (abortController?.signal?.aborted) {
          console.log(
            `🦊 NOX STREAMING: Stream aborted for message: ${messageId}`
          );
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const chunkText = parsed.delta.text;
                fullContent += chunkText;
                totalTokens += 1; // Approximate token count

                if (this.debugMode) {
                  console.log(
                    `🦊 NOX STREAMING: Processing NOX-conscious chunk for message: ${messageId}, abort state: ${abortController?.signal?.aborted}`
                  );
                }

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Complete the stream
      const usage = {
        input_tokens: Math.floor(totalTokens * 0.1), // Estimate 10% for prompt
        output_tokens: Math.floor(totalTokens * 0.9), // Estimate 90% for completion
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "anthropic",
        model: model,
        tokens: totalTokens,
        cost: this.calculateAnthropicCost(usage, model),
        timestamp: new Date().toISOString(),
      };

      if (this.debugMode) {
        console.log(
          `🦊 NOX STREAMING: NOX-conscious stream completed for message: ${messageId}`
        );
      }

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("Anthropic streaming API with system failed:", error);
      throw error;
    }
  }

  /**
   * 🛠️ Anthropic Claude Streaming API with TOOL CALLING - PHASE 2B-3
   * Streams text AND handles tool calls mid-stream for ultimate UX!
   */
  async callAnthropicStreamingAPIWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options,
    callbacks,
    abortController = null
  ) {
    const model = options.model || this.providers.anthropic.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const messageId = options.messageId || Date.now().toString();

    const { onChunk, onToolCall, onToolResult, onComplete } = callbacks;

    // Build messages array
    let messages;
    if (typeof userPromptOrMessages === "string") {
      messages = [{ role: "user", content: userPromptOrMessages }];
    } else if (Array.isArray(userPromptOrMessages)) {
      messages = userPromptOrMessages;
    } else {
      throw new Error("userPromptOrMessages must be a string or array");
    }

    try {
      console.log(
        `🛠️ STREAMING + TOOLS: Starting Claude stream with ${tools.length} tools for message: ${messageId}`
      );

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
          stream: true,
          temperature: options.temperature || 0.7,
          tools: tools, // 🛠️ TOOLS ENABLED!
        }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;
      let toolUses = []; // Claude calls them "tool_use" blocks
      let currentToolUse = null;

      // Process streaming chunks with tool detection
      while (true) {
        if (abortController?.signal?.aborted) {
          console.log(
            `🛠️ STREAMING + TOOLS: Stream aborted for message: ${messageId}`
          );
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // Handle text content streaming
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const chunkText = parsed.delta.text;
                fullContent += chunkText;
                totalTokens += 1;

                if (onChunk) {
                  onChunk({
                    messageId: messageId,
                    chunk: chunkText,
                    tokens: totalTokens,
                    isComplete: false,
                  });
                }
              }

              // Handle tool use blocks (Claude's tool calling format)
              if (
                parsed.type === "content_block_start" &&
                parsed.content_block?.type === "tool_use"
              ) {
                currentToolUse = {
                  id: parsed.content_block.id,
                  name: parsed.content_block.name,
                  input: "",
                };
              }

              // Accumulate tool input
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "input_json_delta"
              ) {
                if (currentToolUse) {
                  currentToolUse.input += parsed.delta.partial_json;
                }
              }

              // Complete tool use block
              if (parsed.type === "content_block_stop" && currentToolUse) {
                toolUses.push(currentToolUse);
                currentToolUse = null;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Process tool uses if any were detected
      if (toolUses.length > 0) {
        console.log(
          `🛠️ STREAMING + TOOLS: Detected ${toolUses.length} tool uses`
        );

        for (const toolUse of toolUses) {
          if (onToolCall && toolUse.id && toolUse.name) {
            try {
              // Parse input safely - only if it's valid JSON
              let parameters = {};
              if (toolUse.input) {
                try {
                  parameters = JSON.parse(toolUse.input);
                } catch (jsonError) {
                  console.warn(
                    `🛠️ Invalid JSON in tool input for ${toolUse.name}, using empty object:`,
                    toolUse.input
                  );
                  parameters = {};
                }
              }

              // Notify that tool is being called
              await onToolCall({
                id: toolUse.id,
                name: toolUse.name,
                parameters: parameters,
              });
            } catch (error) {
              console.error(
                `🛠️ Error processing tool use ${toolUse.name}:`,
                error
              );
            }
          }
        }
      }

      // Complete the stream
      const usage = {
        input_tokens: Math.floor(totalTokens * 0.1),
        output_tokens: Math.floor(totalTokens * 0.9),
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        tool_uses: toolUses, // Include tool uses in response
        provider: "anthropic",
        model: model,
        tokens: totalTokens,
        cost: this.calculateAnthropicCost(usage, model),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🛠️ STREAMING + TOOLS: Claude stream completed for message: ${messageId}`
      );

      if (onComplete) {
        onComplete(finalMessage);
      }

      return finalMessage;
    } catch (error) {
      this.logger.error("Anthropic streaming API with tools failed:", error);
      throw error;
    }
  }

  /**
   * 🌊 Anthropic Claude Streaming API
   */
  async callAnthropicStreamingAPI(
    apiKey,
    prompt,
    options,
    messageId,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || this.providers.anthropic.defaultModel;
    const maxTokens = options.maxTokens || 4000;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      console.log(
        `🛑 AI CLIENT: Starting stream loop for message: ${messageId}`
      );
      console.log(
        `🛑 AI CLIENT: Initial abort signal state: ${abortController?.signal.aborted}`
      );

      try {
        while (true) {
          // Check if stream was aborted
          if (abortController?.signal.aborted) {
            this.logger.info(`⏹️ Stream aborted for message: ${messageId}`);
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT: Stream aborted in main loop for message: ${messageId}`
              );
            }
            break;
          }

          // Check abort before reading
          if (abortController?.signal.aborted) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT: Abort detected before read for message: ${messageId}`
              );
            }
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT: Stream done for message: ${messageId}`
              );
            }
            break;
          }

          if (this.debugMode) {
            console.log(
              `🛑 AI CLIENT: Processing chunk for message: ${messageId}, abort state: ${abortController?.signal.aborted}`
            );
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            // Check abort signal before processing each line
            if (abortController?.signal.aborted) {
              this.logger.info(
                `⏹️ Stream aborted during chunk processing: ${messageId}`
              );
              if (this.debugMode) {
                console.log(
                  `🛑 AI CLIENT: Stream aborted during chunk processing: ${messageId}`
                );
              }
              return null; // Exit early if aborted
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "content_block_delta") {
                  const text = parsed.delta.text;
                  if (text) {
                    fullContent += text;
                    totalTokens += this.estimateTokens(text);

                    // Check abort before sending chunk
                    if (abortController?.signal.aborted) {
                      console.log(
                        `🛑 AI CLIENT: Abort detected before sending chunk for message: ${messageId}`
                      );
                      return null;
                    }

                    // Send chunk to UI
                    if (onChunk) {
                      console.log(
                        `🛑 AI CLIENT: Sending chunk for message: ${messageId}, abort state: ${abortController?.signal.aborted}`
                      );
                      onChunk({
                        messageId,
                        chunk: text,
                        tokens: totalTokens,
                        isComplete: false,
                      });
                    }
                  }
                }
              } catch (e) {
                // Skip invalid JSON
                this.logger.debug("Skipping invalid JSON in stream:", data);
              }
            }
          }
        }

        // Calculate final cost
        const usage = {
          input_tokens: this.estimateTokens(prompt),
          output_tokens: totalTokens,
        };
        const cost = this.calculateAnthropicCost(usage, model);

        const finalMessage = {
          id: messageId,
          type: "assistant",
          content: fullContent,
          timestamp: new Date().toISOString(),
          tokens: totalTokens,
          cost: cost,
          provider: "anthropic",
          model: model,
        };

        // Record metrics
        this.performanceMonitor.recordCost(
          "anthropic",
          model,
          totalTokens,
          cost
        );

        // Send completion
        if (onComplete) {
          onComplete(finalMessage);
        }

        return finalMessage;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error("Anthropic streaming API call failed:", error);
      throw error;
    }
  }

  /**
   * 🌊 OpenAI GPT Streaming API
   */
  async callOpenAIStreamingAPI(
    apiKey,
    prompt,
    options,
    messageId,
    onChunk,
    onComplete,
    abortController = null
  ) {
    const model = options.model || this.providers.openai.defaultModel;
    const maxTokens = options.maxTokens || 4000;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            stream: true,
          }),
          signal: abortController?.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      try {
        while (true) {
          // Check if stream was aborted
          if (abortController?.signal.aborted) {
            this.logger.info(
              `⏹️ OpenAI stream aborted for message: ${messageId}`
            );
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            // Check abort signal before processing each line
            if (abortController?.signal.aborted) {
              this.logger.info(
                `⏹️ OpenAI stream aborted during chunk processing: ${messageId}`
              );
              return null; // Exit early if aborted
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  const text = delta.content;
                  fullContent += text;
                  totalTokens += this.estimateTokens(text);

                  // Send chunk to UI
                  if (onChunk) {
                    onChunk({
                      messageId,
                      chunk: text,
                      tokens: totalTokens,
                      isComplete: false,
                    });
                  }
                }
              } catch (e) {
                // Skip invalid JSON
                this.logger.debug("Skipping invalid JSON in stream:", data);
              }
            }
          }
        }

        // Calculate final cost
        const usage = {
          prompt_tokens: this.estimateTokens(prompt),
          completion_tokens: totalTokens,
          total_tokens: this.estimateTokens(prompt) + totalTokens,
        };
        const cost = this.calculateOpenAICost(usage, model);

        const finalMessage = {
          id: messageId,
          type: "assistant",
          content: fullContent,
          timestamp: new Date().toISOString(),
          tokens: totalTokens,
          cost: cost,
          provider: "openai",
          model: model,
        };

        // Record metrics
        this.performanceMonitor.recordCost("openai", model, totalTokens, cost);

        // Send completion
        if (onComplete) {
          onComplete(finalMessage);
        }

        return finalMessage;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error("OpenAI streaming API call failed:", error);
      throw error;
    }
  }

  /**
   * 🌊 DeepSeek Streaming API
   */
  async callDeepSeekStreamingAPI(
    apiKey,
    prompt,
    options,
    messageId,
    onChunk,
    onComplete,
    abortController = null
  ) {
    console.log(
      `🛑 AI CLIENT (DeepSeek): Received abortController for ${messageId}:`,
      !!abortController
    );
    console.log(
      `🛑 AI CLIENT (DeepSeek): AbortController object ID for ${messageId}:`,
      abortController ? abortController.toString() : "null"
    );

    // 🔍 PHASE 1 DIAGNOSTICS: Enhanced DeepSeek entry logging
    if (abortController) {
      console.log(
        `🔍 DEEPSEEK: AbortController ID: ${
          abortController._debugID || "NO_ID"
        }`
      );
      console.log(
        `🔍 DEEPSEEK: AbortController reference: ${abortController.toString()}`
      );
      console.log(
        `🔍 DEEPSEEK: Signal state on method entry: ${abortController.signal.aborted}`
      );
      console.log(
        `🔍 DEEPSEEK: Timestamp on method entry: ${new Date().toISOString()}`
      );
    }
    const model = options.model || this.providers.deepseek.defaultModel;
    const maxTokens = options.maxTokens || 4000;

    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            stream: true,
          }),
          signal: abortController?.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      // 🔧 ROBUST ABORT HANDLING: Set up abort signal listener
      let isAborted = false;
      if (abortController) {
        abortController.signal.addEventListener("abort", () => {
          isAborted = true;
          console.log(
            `🔧 ABORT LISTENER: Signal received for message: ${messageId}`
          );
        });
      }

      console.log(
        `🛑 AI CLIENT (DeepSeek): Starting stream loop for message: ${messageId}`
      );
      console.log(
        `🛑 AI CLIENT (DeepSeek): Initial abort signal state: ${abortController?.signal.aborted}`
      );
      console.log(
        `🛑 AI CLIENT (DeepSeek): AbortController reference for ${messageId}:`,
        abortController ? "EXISTS" : "NULL"
      );

      // 🔍 PHASE 1 DIAGNOSTICS: Enhanced stream loop entry
      if (abortController) {
        console.log(
          `🔍 DEEPSEEK LOOP: Starting with AbortController ID: ${
            abortController._debugID || "NO_ID"
          }`
        );
        console.log(
          `🔍 DEEPSEEK LOOP: Signal state at loop start: ${abortController.signal.aborted}`
        );
        console.log(
          `🔍 DEEPSEEK LOOP: Timestamp at loop start: ${new Date().toISOString()}`
        );
      }

      try {
        while (true) {
          // 🔧 ROBUST ABORT CHECK: Use event listener flag
          if (isAborted || abortController?.signal.aborted) {
            this.logger.info(
              `⏹️ DeepSeek stream aborted for message: ${messageId}`
            );
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Stream aborted in main loop for message: ${messageId} (isAborted: ${isAborted}, signal.aborted: ${abortController?.signal.aborted})`
              );
            }
            break;
          }

          // 🔧 ROBUST ABORT CHECK: Check again before read
          if (isAborted || abortController?.signal.aborted) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Abort detected before read for message: ${messageId} (isAborted: ${isAborted}, signal.aborted: ${abortController?.signal.aborted})`
              );
            }
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Stream done for message: ${messageId}`
              );
            }
            break;
          }

          if (this.debugMode) {
            console.log(
              `🛑 AI CLIENT (DeepSeek): Processing chunk for message: ${messageId}, abort state: ${abortController?.signal.aborted}`
            );
          }

          // 🔍 PHASE 1 DIAGNOSTICS: Enhanced chunk processing monitoring
          if (this.debugMode && abortController) {
            console.log(
              `🔍 DEEPSEEK CHUNK: AbortController ID: ${
                abortController._debugID || "NO_ID"
              }`
            );
            console.log(
              `🔍 DEEPSEEK CHUNK: Signal state during chunk: ${abortController.signal.aborted}`
            );
            console.log(
              `🔍 DEEPSEEK CHUNK: Timestamp during chunk: ${new Date().toISOString()}`
            );
            console.log(
              `🛑 AI CLIENT (DeepSeek): AbortController still exists for ${messageId}, signal.aborted: ${abortController.signal.aborted}`
            );
          } else {
            console.log(
              `🛑 AI CLIENT (DeepSeek): AbortController is NULL for ${messageId}!`
            );
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            // 🔧 ROBUST ABORT CHECK: Check abort signal before processing each line
            if (isAborted || abortController?.signal.aborted) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Stream aborted during chunk processing: ${messageId} (isAborted: ${isAborted}, signal.aborted: ${abortController?.signal.aborted})`
              );
              return null; // Exit early if aborted
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  const text = delta.content;
                  fullContent += text;
                  totalTokens += this.estimateTokens(text);

                  // 🔧 ROBUST ABORT CHECK: Check abort before sending chunk
                  if (isAborted || abortController?.signal.aborted) {
                    console.log(
                      `🛑 AI CLIENT (DeepSeek): Abort detected before sending chunk for message: ${messageId} (isAborted: ${isAborted}, signal.aborted: ${abortController?.signal.aborted})`
                    );
                    return null;
                  }

                  // 🔍 PHASE 1 DIAGNOSTICS: Pre-chunk send verification
                  if (abortController) {
                    console.log(
                      `🔍 DEEPSEEK SEND: About to send chunk, AbortController ID: ${
                        abortController._debugID || "NO_ID"
                      }`
                    );
                    console.log(
                      `🔍 DEEPSEEK SEND: Signal state before send: ${abortController.signal.aborted}`
                    );
                    console.log(
                      `🔍 DEEPSEEK SEND: Timestamp before send: ${new Date().toISOString()}`
                    );
                  }

                  // Send chunk to UI
                  if (onChunk) {
                    console.log(
                      `🛑 AI CLIENT (DeepSeek): Sending chunk for message: ${messageId}, abort state: ${abortController?.signal.aborted}`
                    );
                    onChunk({
                      messageId,
                      chunk: text,
                      tokens: totalTokens,
                      isComplete: false,
                    });
                  }
                }
              } catch (e) {
                // Skip invalid JSON
                this.logger.debug("Skipping invalid JSON in stream:", data);
              }
            }
          }
        }

        // Calculate final cost
        const usage = {
          prompt_tokens: this.estimateTokens(prompt),
          completion_tokens: totalTokens,
          total_tokens: this.estimateTokens(prompt) + totalTokens,
        };
        const cost = this.calculateDeepSeekCost(usage, model);

        const finalMessage = {
          id: messageId,
          type: "assistant",
          content: fullContent,
          timestamp: new Date().toISOString(),
          tokens: totalTokens,
          cost: cost,
          provider: "deepseek",
          model: model,
        };

        // Record metrics
        this.performanceMonitor.recordCost(
          "deepseek",
          model,
          totalTokens,
          cost
        );

        // Send completion
        if (onComplete) {
          onComplete(finalMessage);
        }

        return finalMessage;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error("DeepSeek streaming API call failed:", error);
      throw this.enhanceError(error);
    }
  }

  /**
   * 🌊 Local LLM Streaming API (Ollama/LM Studio)
   */
  async callLocalStreamingAPI(prompt, options, messageId, onChunk, onComplete) {
    const model = options.model || "llama2";
    const baseUrl = options.baseUrl || this.providers.local.baseUrl;

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Local LLM API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let totalTokens = 0;

      if (this.debugMode) {
        console.log(
          `🛑 AI CLIENT (DeepSeek): Starting stream loop for message: ${messageId}`
        );
        console.log(
          `🛑 AI CLIENT (DeepSeek): Initial abort signal state: ${abortController?.signal.aborted}`
        );
      }

      try {
        while (true) {
          // Check if stream was aborted
          if (abortController?.signal.aborted) {
            this.logger.info(
              `⏹️ DeepSeek stream aborted for message: ${messageId}`
            );
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Stream aborted in main loop for message: ${messageId}`
              );
            }
            break;
          }

          // Check abort before reading
          if (abortController?.signal.aborted) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Abort detected before read for message: ${messageId}`
              );
            }
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            if (this.debugMode) {
              console.log(
                `🛑 AI CLIENT (DeepSeek): Stream done for message: ${messageId}`
              );
            }
            break;
          }

          if (this.debugMode) {
            console.log(
              `🛑 AI CLIENT (DeepSeek): Processing chunk for message: ${messageId}, abort state: ${abortController?.signal.aborted}`
            );
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);

              if (parsed.response) {
                const text = parsed.response;
                fullContent += text;
                totalTokens += this.estimateTokens(text);

                // Send chunk to UI
                if (onChunk) {
                  onChunk({
                    messageId,
                    chunk: text,
                    tokens: totalTokens,
                    isComplete: parsed.done || false,
                  });
                }

                // Check if streaming is complete
                if (parsed.done) {
                  break;
                }
              }
            } catch (e) {
              // Skip invalid JSON
              this.logger.debug("Skipping invalid JSON in local stream:", line);
            }
          }
        }

        const finalMessage = {
          id: messageId,
          type: "assistant",
          content: fullContent,
          timestamp: new Date().toISOString(),
          tokens: totalTokens,
          cost: 0, // Local models are free
          provider: "local",
          model: model,
        };

        // Record metrics (no cost for local)
        this.performanceMonitor.recordCost("local", model, totalTokens, 0);

        // Send completion
        if (onComplete) {
          onComplete(finalMessage);
        }

        return finalMessage;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error("Local LLM streaming API call failed:", error);
      throw error;
    }
  }
}

module.exports = AIClient;
