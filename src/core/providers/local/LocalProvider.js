/**
 * 🦊 Local LLM Provider
 *
 * Complete implementation of Local LLM API (Ollama/LM Studio).
 * Handles all Local LLM-specific logic in isolation.
 *
 * @enterprise-grade Zero cross-contamination, fully testable, production-ready
 */

const BaseProvider = require("../base/BaseProvider");
const LocalConfig = require("./LocalConfig");
const LocalStreamParser = require("./LocalStreamParser");

class LocalProvider extends BaseProvider {
  constructor(config, logger, performanceMonitor) {
    super(config, logger, performanceMonitor);

    // Merge provided config with defaults
    this.config = { ...LocalConfig, ...config };

    // Initialize stream parser
    this.streamParser = new LocalStreamParser(logger);
  }

  // ============================================================================
  // METADATA METHODS
  // ============================================================================

  getName() {
    return this.config.name;
  }

  getModels() {
    return this.config.models;
  }

  getDefaultModel() {
    return this.config.defaultModel;
  }

  getBaseUrl() {
    return this.config.baseUrl;
  }

  supportsToolCalling() {
    return this.config.supportsToolCalling;
  }

  supportsStreaming() {
    return this.config.supportsStreaming;
  }

  getToolFormat() {
    return this.config.toolFormat;
  }

  getMaxTools() {
    return this.config.maxTools;
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  validateApiKey(apiKey) {
    // Local LLMs don't require API keys
    return true;
  }

  validateModel(model) {
    // Local models are user-configurable, so we're lenient
    return true;
  }

  // ============================================================================
  // COST CALCULATION
  // ============================================================================

  calculateCost(usage, model) {
    // Local LLMs are free!
    return 0;
  }

  // ============================================================================
  // TOOL HANDLING METHODS (NOT SUPPORTED)
  // ============================================================================

  convertCapabilitiesToTools(capabilities) {
    // Local LLMs don't support tool calling yet
    return [];
  }

  parseToolCalls(response) {
    // Local LLMs don't support tool calling yet
    return [];
  }

  buildToolResult(toolCallId, result) {
    // Local LLMs don't support tool calling yet
    return null;
  }

  // ============================================================================
  // CORE REQUEST METHODS
  // ============================================================================

  /**
   * Send a simple request (non-streaming, no tools)
   */
  async sendRequest(apiKey, prompt, options = {}) {
    const timer = this.logRequestStart("sendRequest", {
      prompt: prompt.substring(0, 100),
    });

    const model = options.model || this.getDefaultModel();
    const baseUrl = options.baseUrl || this.getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature:
              options.temperature || this.config.defaults.temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Local LLM API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        content: data.response,
        provider: "local",
        model: model,
        tokens: 0, // Local models don't track tokens
        cost: 0, // Free!
      };

      this.logRequestComplete("sendRequest", {
        tokens: result.tokens,
        cost: result.cost,
      });

      return result;
    } catch (error) {
      this.handleApiError(error, "sendRequest");
    }
  }

  /**
   * Send a request with system prompt (non-streaming, no tools)
   */
  async sendRequestWithSystem(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    options = {}
  ) {
    const timer = this.logRequestStart("sendRequestWithSystem");

    const model = options.model || this.getDefaultModel();
    const baseUrl = options.baseUrl || this.getBaseUrl();
    const messages = this.buildMessages(userPromptOrMessages);

    // Combine system prompt and user messages into a single prompt
    let combinedPrompt = `System: ${systemPrompt}\n\n`;

    if (typeof userPromptOrMessages === "string") {
      combinedPrompt += `User: ${userPromptOrMessages}\n\nAssistant:`;
    } else if (Array.isArray(userPromptOrMessages)) {
      for (const msg of messages) {
        const role = msg.role === "user" ? "User" : "Assistant";
        combinedPrompt += `${role}: ${msg.content}\n\n`;
      }
      combinedPrompt += "Assistant:";
    }

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: combinedPrompt,
          stream: false,
          options: {
            temperature:
              options.temperature || this.config.defaults.temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Local LLM API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        id: Date.now().toString(),
        type: "assistant",
        content: data.response,
        provider: "local",
        model: model,
        tokens: 0, // Local models don't track tokens
        cost: 0, // Free!
        timestamp: new Date().toISOString(),
      };

      this.logRequestComplete("sendRequestWithSystem", {
        tokens: result.tokens,
        cost: result.cost,
      });

      return result;
    } catch (error) {
      this.handleApiError(error, "sendRequestWithSystem");
    }
  }

  /**
   * Send a request with tools (NOT SUPPORTED)
   */
  async sendRequestWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options = {}
  ) {
    throw new Error("Local LLMs do not support tool calling yet");
  }

  // ============================================================================
  // STREAMING METHODS
  // ============================================================================

  /**
   * Send a streaming request with system prompt (no tools)
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
    const timer = this.logRequestStart("sendStreamingRequest");

    const model = options.model || this.getDefaultModel();
    const baseUrl = options.baseUrl || this.getBaseUrl();
    const messageId = options.messageId || Date.now().toString();
    const messages = this.buildMessages(userPromptOrMessages);

    // Combine system prompt and user messages into a single prompt
    let combinedPrompt = `System: ${systemPrompt}\n\n`;

    if (typeof userPromptOrMessages === "string") {
      combinedPrompt += `User: ${userPromptOrMessages}\n\nAssistant:`;
    } else if (Array.isArray(userPromptOrMessages)) {
      for (const msg of messages) {
        const role = msg.role === "user" ? "User" : "Assistant";
        combinedPrompt += `${role}: ${msg.content}\n\n`;
      }
      combinedPrompt += "Assistant:";
    }

    try {
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
            temperature:
              options.temperature || this.config.defaults.temperature,
          },
        }),
        signal: abortController?.signal,
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

      // Process streaming chunks
      for await (const chunk of this.streamParser.readStream(
        reader,
        decoder,
        abortController?.signal
      )) {
        if (chunk.type === "text") {
          fullContent += chunk.data;

          if (onChunk) {
            onChunk({
              messageId: messageId,
              chunk: chunk.data,
              tokens: 0, // Local models don't track tokens
              isComplete: false,
            });
          }
        } else if (chunk.type === "done") {
          break;
        }
      }

      // Build final message
      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "local",
        model: model,
        tokens: 0, // Local models don't track tokens
        cost: 0, // Free!
        timestamp: new Date().toISOString(),
      };

      this.logRequestComplete("sendStreamingRequest", {
        tokens: finalMessage.tokens,
        cost: finalMessage.cost,
      });

      if (onComplete) {
        onComplete(finalMessage);
      }
    } catch (error) {
      this.handleApiError(error, "sendStreamingRequest");
    }
  }

  /**
   * Send a streaming request with tools (NOT SUPPORTED)
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
    throw new Error("Local LLMs do not support tool calling yet");
  }
}

module.exports = LocalProvider;
