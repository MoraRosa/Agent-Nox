/**
 * 🦊 DeepSeek Provider
 *
 * Complete implementation of DeepSeek API.
 * Handles all DeepSeek-specific logic in isolation.
 *
 * @enterprise-grade Zero cross-contamination, fully testable, production-ready
 */

const BaseProvider = require("../base/BaseProvider");
const DeepSeekConfig = require("./DeepSeekConfig");
const DeepSeekStreamParser = require("./DeepSeekStreamParser");

class DeepSeekProvider extends BaseProvider {
  constructor(config, logger, performanceMonitor) {
    super(config, logger, performanceMonitor);

    // Merge provided config with defaults
    this.config = { ...DeepSeekConfig, ...config };

    // Initialize stream parser
    this.streamParser = new DeepSeekStreamParser(logger);
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
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }

    // DeepSeek API keys start with "sk-"
    return this.config.apiKeyPattern.test(apiKey);
  }

  validateModel(model) {
    return this.config.models.includes(model);
  }

  // ============================================================================
  // COST CALCULATION
  // ============================================================================

  calculateCost(usage, model) {
    const pricing = this.config.pricing[model];

    if (!pricing) {
      this.logger?.warn(`No pricing data for model: ${model}`);
      return 0;
    }

    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  // ============================================================================
  // TOOL HANDLING METHODS (NOT SUPPORTED)
  // ============================================================================

  convertCapabilitiesToTools(capabilities) {
    // DeepSeek doesn't support tool calling yet
    return [];
  }

  parseToolCalls(response) {
    // DeepSeek doesn't support tool calling yet
    return [];
  }

  buildToolResult(toolCallId, result) {
    // DeepSeek doesn't support tool calling yet
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
    const maxTokens = options.maxTokens || this.config.defaults.maxTokens;

    try {
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        content: data.choices[0].message.content,
        provider: "deepseek",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateCost(data.usage, model),
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
    const maxTokens = options.maxTokens || this.config.defaults.maxTokens;
    const messages = this.buildMessages(userPromptOrMessages);

    // Prepend system message
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: allMessages,
          max_tokens: maxTokens,
          temperature: options.temperature || this.config.defaults.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        id: Date.now().toString(),
        type: "assistant",
        content: data.choices[0].message.content,
        provider: "deepseek",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateCost(data.usage, model),
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
    throw new Error("DeepSeek does not support tool calling yet");
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
    const maxTokens = options.maxTokens || this.config.defaults.maxTokens;
    const messageId = options.messageId || Date.now().toString();
    const messages = this.buildMessages(userPromptOrMessages);

    // Prepend system message
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: allMessages,
          max_tokens: maxTokens,
          temperature: options.temperature || this.config.defaults.temperature,
          stream: true,
        }),
        signal: abortController?.signal,
      });

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

      // Process streaming chunks
      for await (const chunk of this.streamParser.readStream(
        reader,
        decoder,
        abortController?.signal
      )) {
        if (chunk.type === "text") {
          fullContent += chunk.data;
          totalTokens += 1; // Approximate

          if (onChunk) {
            onChunk({
              messageId: messageId,
              chunk: chunk.data,
              tokens: totalTokens,
              isComplete: false,
            });
          }
        } else if (chunk.type === "done") {
          break;
        }
      }

      // Build final message
      const usage = {
        prompt_tokens: this.estimateTokens(
          systemPrompt + JSON.stringify(messages)
        ),
        completion_tokens: totalTokens,
        total_tokens:
          this.estimateTokens(systemPrompt + JSON.stringify(messages)) +
          totalTokens,
      };

      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        provider: "deepseek",
        model: model,
        tokens: usage.total_tokens,
        cost: this.calculateCost(usage, model),
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
    throw new Error("DeepSeek does not support tool calling yet");
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to estimate
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

module.exports = DeepSeekProvider;
