/**
 * 🦊 OpenAI Tool Adapter
 * 
 * Converts NOX capabilities to OpenAI's function calling format and vice versa.
 * Handles all tool-related transformations for OpenAI.
 * 
 * @enterprise-grade Clean separation of tool logic
 */

class OpenAIToolAdapter {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Convert NOX capabilities to OpenAI function format
   * @param {Array<Class>} capabilities - Array of capability classes
   * @returns {Array<Object>} - Tools in OpenAI format
   */
  convertCapabilitiesToTools(capabilities) {
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
   * Build JSON schema for function parameters
   * @param {Object} parameters - Parameter definitions
   * @returns {Object} - JSON schema
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
   * @param {Object} response - OpenAI response object
   * @returns {Array<Object>} - Array of { id, name, parameters }
   */
  parseToolCalls(response) {
    if (!response.tool_calls || !Array.isArray(response.tool_calls)) {
      return [];
    }

    return response.tool_calls.map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    }));
  }

  /**
   * Parse tool call from streaming chunk
   * Used during streaming to extract tool call deltas
   * @param {Object} delta - Streaming delta
   * @returns {Object|null} - Tool call data or null
   */
  parseStreamingToolCall(delta) {
    if (!delta.tool_calls || !Array.isArray(delta.tool_calls)) {
      return null;
    }

    // OpenAI sends tool calls as deltas
    const toolCall = delta.tool_calls[0];
    
    if (!toolCall) {
      return null;
    }

    return {
      index: toolCall.index,
      id: toolCall.id,
      type: toolCall.type,
      function: {
        name: toolCall.function?.name,
        arguments: toolCall.function?.arguments,
      },
    };
  }

  /**
   * Build tool result in OpenAI format
   * @param {string} toolCallId - Tool call ID
   * @param {Object} result - Tool execution result
   * @returns {Object} - Tool result in OpenAI format
   */
  buildToolResult(toolCallId, result) {
    return {
      role: "tool",
      tool_call_id: toolCallId,
      content: JSON.stringify(result),
    };
  }

  /**
   * Map tool_choice option to OpenAI format
   * @param {string} toolChoice - Tool choice option ("auto", "required", "none")
   * @returns {string|Object|null} - OpenAI tool_choice value or null
   */
  mapToolChoice(toolChoice) {
    if (!toolChoice) {
      return null;
    }

    switch (toolChoice) {
      case "auto":
        return "auto";
      case "required":
        return "required";
      case "none":
        return "none";
      default:
        // If it's already a string or object, return as-is
        return toolChoice;
    }
  }

  /**
   * Validate tool definition
   * @param {Object} tool - Tool definition
   * @returns {boolean}
   */
  validateTool(tool) {
    if (tool.type !== "function") {
      if (this.logger) {
        this.logger.warn("Tool must have type 'function'");
      }
      return false;
    }

    if (!tool.function || typeof tool.function !== "object") {
      if (this.logger) {
        this.logger.warn("Tool missing required 'function' field");
      }
      return false;
    }

    if (!tool.function.name || typeof tool.function.name !== "string") {
      if (this.logger) {
        this.logger.warn("Tool function missing required 'name' field");
      }
      return false;
    }

    if (!tool.function.description || typeof tool.function.description !== "string") {
      if (this.logger) {
        this.logger.warn(`Tool '${tool.function.name}' missing required 'description' field`);
      }
      return false;
    }

    if (!tool.function.parameters || typeof tool.function.parameters !== "object") {
      if (this.logger) {
        this.logger.warn(`Tool '${tool.function.name}' missing required 'parameters' field`);
      }
      return false;
    }

    return true;
  }

  /**
   * Validate all tools
   * @param {Array<Object>} tools - Array of tool definitions
   * @returns {boolean}
   */
  validateTools(tools) {
    if (!Array.isArray(tools)) {
      if (this.logger) {
        this.logger.warn("Tools must be an array");
      }
      return false;
    }

    return tools.every((tool) => this.validateTool(tool));
  }

  /**
   * Accumulate streaming tool call arguments
   * OpenAI sends function arguments in chunks, need to accumulate them
   * @param {Object} existingToolCall - Existing accumulated tool call
   * @param {Object} delta - New delta to add
   * @returns {Object} - Updated tool call
   */
  accumulateToolCallDelta(existingToolCall, delta) {
    if (!existingToolCall) {
      return {
        id: delta.id || "",
        type: delta.type || "function",
        function: {
          name: delta.function?.name || "",
          arguments: delta.function?.arguments || "",
        },
      };
    }

    return {
      ...existingToolCall,
      id: existingToolCall.id || delta.id,
      function: {
        name: existingToolCall.function.name || delta.function?.name || "",
        arguments: existingToolCall.function.arguments + (delta.function?.arguments || ""),
      },
    };
  }
}

module.exports = OpenAIToolAdapter;

