/**
 * 🦊 Claude Provider
 *
 * Complete implementation of Anthropic Claude API.
 * Handles all Claude-specific logic in isolation.
 *
 * @enterprise-grade Zero cross-contamination, fully testable, production-ready
 */

const BaseProvider = require("../base/BaseProvider");
const ClaudeConfig = require("./ClaudeConfig");
const ClaudeToolAdapter = require("./ClaudeToolAdapter");
const ClaudeStreamParser = require("./ClaudeStreamParser");

class ClaudeProvider extends BaseProvider {
  constructor(config, logger, performanceMonitor) {
    super(config, logger, performanceMonitor);

    // Merge provided config with defaults
    this.config = { ...ClaudeConfig, ...config };

    // Initialize adapters
    this.toolAdapter = new ClaudeToolAdapter(logger);
    this.streamParser = new ClaudeStreamParser(logger);
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

    // Claude API keys start with "sk-ant-"
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

    const inputCost = (usage.input_tokens / 1000000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000000) * pricing.output;

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
      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.config.apiVersion,
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        content: data.content[0].text,
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
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

    try {
      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.config.apiVersion,
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        content: data.content[0].text,
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateCost(data.usage, model),
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

    try {
      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.config.apiVersion,
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
          tools: tools,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      const result = {
        id: Date.now().toString(),
        type: "assistant",
        content: data.content,
        tool_calls: data.content.filter((block) => block.type === "tool_use"),
        provider: "anthropic",
        model: model,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateCost(data.usage, model),
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

    try {
      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.config.apiVersion,
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages,
          stream: true,
          temperature: options.temperature || this.config.defaults.temperature,
        }),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${errorData}`
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
        } else if (chunk.type === "usage_delta") {
          totalTokens = chunk.data.output_tokens || totalTokens;
        } else if (chunk.type === "error") {
          throw new Error(`Claude streaming error: ${chunk.data.message}`);
        }
      }

      // Build final message
      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        timestamp: new Date().toISOString(),
        provider: "anthropic",
        model: model,
        tokens: totalTokens,
        cost: this.calculateCost(
          { input_tokens: 0, output_tokens: totalTokens },
          model
        ),
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
   * This is where the magic happens for Claude!
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

    try {
      // Build request payload
      const requestPayload = {
        model: model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages,
        stream: true,
        temperature: options.temperature || this.config.defaults.temperature,
        tools: tools,
      };

      // Add tool_choice if specified
      if (options.tool_choice) {
        requestPayload.tool_choice = this.toolAdapter.mapToolChoice(
          options.tool_choice
        );
      }

      this.logger?.info(`🔍 CLAUDE REQUEST PAYLOAD:`, {
        model: requestPayload.model,
        messageCount: requestPayload.messages.length,
        toolCount: requestPayload.tools.length,
        toolNames: requestPayload.tools.map((t) => t.name),
        tool_choice: requestPayload.tool_choice,
        temperature: requestPayload.temperature,
      });

      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.config.apiVersion,
        },
        body: JSON.stringify(requestPayload),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullContent = "";
      let totalTokens = 0;
      let toolUses = [];
      let currentToolUse = null;

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
        } else if (chunk.type === "tool_use_start") {
          // Tool use started
          this.logger?.info(`🔍 CLAUDE TOOL USE START:`, chunk.data);
          currentToolUse = {
            id: chunk.data.id,
            name: chunk.data.name,
            input: "",
          };
        } else if (chunk.type === "tool_input_delta") {
          // Tool input delta - accumulate silently
          if (currentToolUse) {
            currentToolUse.input += chunk.data;
          }
        } else if (chunk.type === "content_block_stop") {
          // Content block stopped (tool use complete)
          if (currentToolUse) {
            this.logger?.info(`🔍 CLAUDE TOOL USE COMPLETE:`, {
              id: currentToolUse.id,
              name: currentToolUse.name,
              input: currentToolUse.input,
            });

            // Parse tool input
            let parameters = {};
            if (currentToolUse.input) {
              try {
                parameters = JSON.parse(currentToolUse.input);
              } catch (jsonError) {
                this.logger?.warn(
                  `🛠️ Invalid JSON in tool input for ${currentToolUse.name}, using empty object:`,
                  currentToolUse.input
                );
                parameters = {};
              }
            }

            // Call tool handler
            if (onToolCall) {
              await onToolCall({
                id: currentToolUse.id,
                name: currentToolUse.name,
                parameters: parameters,
              });
            }

            toolUses.push(currentToolUse);
            currentToolUse = null;
          }
        } else if (chunk.type === "usage_delta") {
          totalTokens = chunk.data.output_tokens || totalTokens;
        } else if (chunk.type === "error") {
          throw new Error(`Claude streaming error: ${chunk.data.message}`);
        }
      }

      // Build final message
      const finalMessage = {
        id: messageId,
        type: "assistant",
        content: fullContent,
        timestamp: new Date().toISOString(),
        tool_uses: toolUses,
        provider: "anthropic",
        model: model,
        tokens: totalTokens,
        cost: this.calculateCost(
          { input_tokens: 0, output_tokens: totalTokens },
          model
        ),
        wasSilent: fullContent.length === 0 && toolUses.length > 0,
      };

      this.logRequestComplete("sendStreamingRequestWithTools", {
        tokens: finalMessage.tokens,
        cost: finalMessage.cost,
        toolCalls: toolUses.length,
        wasSilent: finalMessage.wasSilent,
      });

      if (onComplete) {
        onComplete(finalMessage);
      }
    } catch (error) {
      this.handleApiError(error, "sendStreamingRequestWithTools");
    }
  }
}

module.exports = ClaudeProvider;
