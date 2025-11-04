/**
 * 🦊 NOX Tool Adapter - Converts capabilities to tool definitions for AI providers
 *
 * Supports:
 * - OpenAI Function Calling
 * - Claude Tool Use
 * - Gemini Function Calling
 * - Text parsing fallback for unsupported providers
 */
class NoxToolAdapter {
  constructor(capabilityRegistry, logger) {
    this.capabilityRegistry = capabilityRegistry;
    this.logger = logger;

    // Provider capabilities
    this.providerSupport = {
      openai: {
        supportsToolCalling: true,
        format: "openai_functions",
        maxTools: 128,
      },
      anthropic: {
        supportsToolCalling: true,
        format: "claude_tools",
        maxTools: 64,
      },
      gemini: {
        supportsToolCalling: true,
        format: "gemini_functions",
        maxTools: 128,
      },
      deepseek: {
        supportsToolCalling: false,
        format: "text_parsing",
        maxTools: 0,
      },
      local: {
        supportsToolCalling: false,
        format: "text_parsing",
        maxTools: 0,
      },
    };
  }

  /**
   * Check if provider supports tool calling
   */
  supportsToolCalling(provider) {
    return this.providerSupport[provider]?.supportsToolCalling || false;
  }

  /**
   * Get provider format
   */
  getProviderFormat(provider) {
    return this.providerSupport[provider]?.format || "text_parsing";
  }

  /**
   * Convert NOX capabilities to tool definitions for specific provider
   */
  capabilitiesToTools(capabilities, provider) {
    const format = this.getProviderFormat(provider);

    switch (format) {
      case "openai_functions":
        return this.toOpenAIFunctions(capabilities);
      case "claude_tools":
        return this.toClaudeTools(capabilities);
      case "gemini_functions":
        return this.toGeminiFunctions(capabilities);
      default:
        return null; // Text parsing doesn't use tools
    }
  }

  /**
   * Convert to OpenAI function calling format
   * @param {Array<Class>} capabilities - Array of capability classes
   */
  toOpenAIFunctions(capabilities) {
    return capabilities.map((CapabilityClass) => {
      const metadata = CapabilityClass.metadata;

      return {
        type: "function",
        function: {
          name: metadata.id,
          description: metadata.description || metadata.name,
          parameters: this.buildParameterSchema(metadata.parameters || {}),
        },
      };
    });
  }

  /**
   * Convert to Claude tool use format
   * @param {Array<Class>} capabilities - Array of capability classes
   */
  toClaudeTools(capabilities) {
    return capabilities.map((CapabilityClass) => {
      const metadata = CapabilityClass.metadata;

      return {
        name: metadata.id,
        description: metadata.description || metadata.name,
        input_schema: this.buildParameterSchema(metadata.parameters || {}),
      };
    });
  }

  /**
   * Convert to Gemini function calling format
   * @param {Array<Class>} capabilities - Array of capability classes
   */
  toGeminiFunctions(capabilities) {
    return capabilities.map((CapabilityClass) => {
      const metadata = CapabilityClass.metadata;

      return {
        name: metadata.id,
        description: metadata.description || metadata.name,
        parameters: this.buildParameterSchema(metadata.parameters || {}),
      };
    });
  }

  /**
   * Build JSON schema for parameters
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

  /**
   * Parse tool calls from OpenAI response
   */
  parseOpenAIToolCalls(response) {
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return [];
    }

    return response.tool_calls.map((toolCall) => ({
      id: toolCall.id,
      capabilityId: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    }));
  }

  /**
   * Parse tool calls from Claude response
   */
  parseClaudeToolCalls(response) {
    if (!response.content || !Array.isArray(response.content)) {
      return [];
    }

    const toolUses = response.content.filter(
      (block) => block.type === "tool_use"
    );

    return toolUses.map((toolUse) => ({
      id: toolUse.id,
      capabilityId: toolUse.name,
      parameters: toolUse.input,
    }));
  }

  /**
   * Parse tool calls from Gemini response
   */
  parseGeminiToolCalls(response) {
    if (!response.functionCalls || response.functionCalls.length === 0) {
      return [];
    }

    return response.functionCalls.map((call, index) => ({
      id: `call_${index}`,
      capabilityId: call.name,
      parameters: call.args,
    }));
  }

  /**
   * Parse tool calls from any provider response
   */
  parseToolCalls(response, provider) {
    const format = this.getProviderFormat(provider);

    switch (format) {
      case "openai_functions":
        return this.parseOpenAIToolCalls(response);
      case "claude_tools":
        return this.parseClaudeToolCalls(response);
      case "gemini_functions":
        return this.parseGeminiToolCalls(response);
      default:
        return this.parseTextToolCalls(response);
    }
  }

  /**
   * Parse tool calls from text (fallback for unsupported providers)
   */
  parseTextToolCalls(response) {
    const text = response.content || response.text || "";
    const toolCalls = [];

    // Look for [ACTION: capability_id] markers
    const actionRegex = /\[ACTION:\s*(\w+)\]\s*\{([^}]+)\}\s*\[\/ACTION\]/g;
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const capabilityId = match[1];
        const parametersJson = match[2];
        const parameters = JSON.parse(`{${parametersJson}}`);

        toolCalls.push({
          id: `text_call_${toolCalls.length}`,
          capabilityId,
          parameters,
        });
      } catch (error) {
        this.logger.warn(`Failed to parse text tool call: ${match[0]}`, error);
      }
    }

    return toolCalls;
  }

  /**
   * Build tool result for OpenAI
   */
  buildOpenAIToolResult(toolCallId, result) {
    return {
      role: "tool",
      tool_call_id: toolCallId,
      content: JSON.stringify(result),
    };
  }

  /**
   * Build tool result for Claude
   */
  buildClaudeToolResult(toolCallId, result) {
    return {
      type: "tool_result",
      tool_use_id: toolCallId,
      content: JSON.stringify(result),
    };
  }

  /**
   * Build tool result for Gemini
   */
  buildGeminiToolResult(toolCallId, result) {
    return {
      functionResponse: {
        name: toolCallId,
        response: result,
      },
    };
  }

  /**
   * Build tool result for any provider
   */
  buildToolResult(toolCallId, result, provider) {
    const format = this.getProviderFormat(provider);

    switch (format) {
      case "openai_functions":
        return this.buildOpenAIToolResult(toolCallId, result);
      case "claude_tools":
        return this.buildClaudeToolResult(toolCallId, result);
      case "gemini_functions":
        return this.buildGeminiToolResult(toolCallId, result);
      default:
        return null; // Text parsing doesn't send results back
    }
  }

  /**
   * Get enhanced prompt for text parsing (fallback)
   */
  getTextParsingPrompt(capabilities) {
    const capabilityList = capabilities
      .map((cap) => {
        const metadata = cap.constructor.metadata;
        return `- ${metadata.id}: ${metadata.description || metadata.name}`;
      })
      .join("\n");

    return `
When you want to perform an action, use this format:

[ACTION: capability_id]
{
  "parameter1": "value1",
  "parameter2": "value2"
}
[/ACTION]

Available capabilities:
${capabilityList}

Example:
[ACTION: file_create]
{
  "path": "src/test.js",
  "content": "console.log('hello');"
}
[/ACTION]
`;
  }
}

module.exports = NoxToolAdapter;
