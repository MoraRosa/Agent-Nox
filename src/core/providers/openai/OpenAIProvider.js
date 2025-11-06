/**
 * 🦊 OpenAI Provider
 *
 * Complete implementation of OpenAI GPT API.
 * Handles all OpenAI-specific logic in isolation.
 *
 * @enterprise-grade Zero cross-contamination, fully testable, production-ready
 */

const BaseProvider = require("../base/BaseProvider");
const OpenAIConfig = require("./OpenAIConfig");
const OpenAIToolAdapter = require("./OpenAIToolAdapter");
const OpenAIStreamParser = require("./OpenAIStreamParser");

class OpenAIProvider extends BaseProvider {
  constructor(config, logger, performanceMonitor) {
    super(config, logger, performanceMonitor);

    // Merge provided config with defaults
    this.config = { ...OpenAIConfig, ...config };

    // Initialize adapters
    this.toolAdapter = new OpenAIToolAdapter(logger);
    this.streamParser = new OpenAIStreamParser(logger);
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

    // OpenAI API keys start with "sk-"
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
  // TOOL HANDLING METHODS
  // ============================================================================

  convertCapabilitiesToTools(capabilities) {
    return this.toolAdapter.convertCapabilitiesToTools(capabilities);
  }

  parseToolCalls(response) {
    return this.toolAdapter.parseToolCalls(response);
  }

  buildToolResult(toolCallId, result) {
    return this.toolAdapter.buildToolResult(toolCallId, result);
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
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        content: data.choices[0].message.content,
        provider: "openai",
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
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        id: Date.now().toString(),
        type: "assistant",
        content: data.choices[0].message.content,
        provider: "openai",
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
   * Send a request with tools (non-streaming)
   */
  async sendRequestWithTools(
    apiKey,
    systemPrompt,
    userPromptOrMessages,
    tools,
    options = {}
  ) {
    const timer = this.logRequestStart("sendRequestWithTools", {
      toolCount: tools.length,
    });

    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || this.config.defaults.maxTokens;
    const messages = this.buildMessages(userPromptOrMessages);

    // Prepend system message
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const requestBody = {
        model: model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature: options.temperature || this.config.defaults.temperature,
        tools: tools,
      };

      // Add tool_choice if specified
      if (options.tool_choice) {
        requestBody.tool_choice = this.toolAdapter.mapToolChoice(
          options.tool_choice
        );
      }

      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();
      const message = data.choices[0].message;

      const result = {
        id: Date.now().toString(),
        type: "assistant",
        content: message.content,
        tool_calls: message.tool_calls || [],
        provider: "openai",
        model: model,
        tokens: data.usage.total_tokens,
        cost: this.calculateCost(data.usage, model),
        timestamp: new Date().toISOString(),
      };

      this.logRequestComplete("sendRequestWithTools", {
        tokens: result.tokens,
        cost: result.cost,
        toolCalls: result.tool_calls.length,
      });

      return result;
    } catch (error) {
      this.handleApiError(error, "sendRequestWithTools");
    }
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
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`
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
        provider: "openai",
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
   * Send a streaming request with tools (MOST IMPORTANT METHOD)
   * This is where the magic happens for OpenAI!
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
    const timer = this.logRequestStart("sendStreamingRequestWithTools", {
      toolCount: tools.length,
    });

    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || this.config.defaults.maxTokens;
    const messageId = options.messageId || Date.now().toString();
    const messages = this.buildMessages(userPromptOrMessages);

    const { onChunk, onToolCall, onToolResult, onComplete } = callbacks;

    // Prepend system message
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      // Build request payload
      const requestPayload = {
        model: model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature: options.temperature || this.config.defaults.temperature,
        stream: true,
        tools: tools,
      };

      // Add tool_choice if specified
      if (options.tool_choice) {
        requestPayload.tool_choice = this.toolAdapter.mapToolChoice(
          options.tool_choice
        );
      }

      this.logger?.info(`🔍 OPENAI REQUEST PAYLOAD:`, {
        model: requestPayload.model,
        messageCount: requestPayload.messages.length,
        toolCount: requestPayload.tools.length,
        toolNames: requestPayload.tools.map((t) => t.function.name),
        tool_choice: requestPayload.tool_choice,
        temperature: requestPayload.temperature,
      });

      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
        signal: abortController?.signal,
      });

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
      let toolCalls = [];
      let currentToolCalls = {}; // Track tool calls by index

      // Process streaming chunks
      for await (const chunk of this.streamParser.readStream(
        reader,
        decoder,
        abortController?.signal
      )) {
        if (chunk.type === "text") {
          // Text content delta
          fullContent += chunk.data;
          totalTokens += 1;

          if (onChunk) {
            onChunk({
              messageId: messageId,
              chunk: chunk.data,
              tokens: totalTokens,
              isComplete: false,
            });
          }
        } else if (chunk.type === "tool_calls") {
          // Tool call delta
          for (const toolCallDelta of chunk.data) {
            const index = toolCallDelta.index;

            // Accumulate tool call
            currentToolCalls[index] = this.toolAdapter.accumulateToolCallDelta(
              currentToolCalls[index],
              toolCallDelta
            );

            // ✅ Silent accumulation - no per-chunk logging
          }
        } else if (chunk.type === "finish") {
          // Stream finished - process any accumulated tool calls
          if (chunk.data === "tool_calls") {
            for (const [index, toolCall] of Object.entries(currentToolCalls)) {
              this.logger?.info(`🔍 OPENAI TOOL CALL COMPLETE:`, {
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              });

              // Parse tool arguments
              let parameters = {};
              if (toolCall.function.arguments) {
                try {
                  parameters = JSON.parse(toolCall.function.arguments);
                } catch (jsonError) {
                  this.logger?.warn(
                    `🛠️ Invalid JSON in tool arguments for ${toolCall.function.name}, using empty object:`,
                    toolCall.function.arguments
                  );
                  parameters = {};
                }
              }

              // Call tool handler
              if (onToolCall) {
                await onToolCall({
                  id: toolCall.id,
                  name: toolCall.function.name,
                  parameters: parameters,
                });
              }

              toolCalls.push(toolCall);
            }
          }
          break;
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
        tool_calls: toolCalls,
        provider: "openai",
        model: model,
        tokens: usage.total_tokens,
        cost: this.calculateCost(usage, model),
        timestamp: new Date().toISOString(),
        wasSilent: fullContent.trim() === "" && toolCalls.length > 0,
      };

      this.logRequestComplete("sendStreamingRequestWithTools", {
        tokens: finalMessage.tokens,
        cost: finalMessage.cost,
        toolCalls: toolCalls.length,
        wasSilent: finalMessage.wasSilent,
      });

      if (onComplete) {
        onComplete(finalMessage);
      }
    } catch (error) {
      this.handleApiError(error, "sendStreamingRequestWithTools");
    }
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

module.exports = OpenAIProvider;
