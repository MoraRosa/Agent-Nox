/**
 * 🦊 Claude Tool Adapter
 * 
 * Converts NOX capabilities to Claude's tool format and vice versa.
 * Handles all tool-related transformations for Claude.
 * 
 * @enterprise-grade Clean separation of tool logic
 */

class ClaudeToolAdapter {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Convert NOX capabilities to Claude tool format
   * @param {Array<Class>} capabilities - Array of capability classes
   * @returns {Array<Object>} - Tools in Claude format
   */
  convertCapabilitiesToTools(capabilities) {
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
   * Build JSON schema for tool parameters
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
   * Parse tool calls from Claude response
   * @param {Object} response - Claude response object
   * @returns {Array<Object>} - Array of { id, name, parameters }
   */
  parseToolCalls(response) {
    if (!response.content || !Array.isArray(response.content)) {
      return [];
    }

    const toolUses = response.content.filter(
      (block) => block.type === "tool_use"
    );

    return toolUses.map((toolUse) => ({
      id: toolUse.id,
      name: toolUse.name,
      parameters: toolUse.input,
    }));
  }

  /**
   * Parse tool call from streaming chunk
   * Used during streaming to extract tool use blocks
   * @param {Object} chunk - Streaming chunk
   * @returns {Object|null} - Tool call data or null
   */
  parseStreamingToolCall(chunk) {
    // Claude sends tool_use blocks in content_block_start events
    if (chunk.type === "content_block_start" && chunk.content_block?.type === "tool_use") {
      return {
        id: chunk.content_block.id,
        name: chunk.content_block.name,
        input: "", // Will be accumulated from deltas
      };
    }

    return null;
  }

  /**
   * Parse tool input delta from streaming chunk
   * @param {Object} chunk - Streaming chunk
   * @returns {string|null} - Partial JSON or null
   */
  parseStreamingToolInputDelta(chunk) {
    if (chunk.type === "content_block_delta" && chunk.delta?.type === "input_json_delta") {
      return chunk.delta.partial_json;
    }

    return null;
  }

  /**
   * Check if chunk indicates tool use completion
   * @param {Object} chunk - Streaming chunk
   * @returns {boolean}
   */
  isToolUseComplete(chunk) {
    return chunk.type === "content_block_stop";
  }

  /**
   * Build tool result in Claude format
   * @param {string} toolCallId - Tool call ID
   * @param {Object} result - Tool execution result
   * @returns {Object} - Tool result in Claude format
   */
  buildToolResult(toolCallId, result) {
    return {
      type: "tool_result",
      tool_use_id: toolCallId,
      content: JSON.stringify(result),
    };
  }

  /**
   * Map tool_choice option to Claude format
   * @param {string} toolChoice - Tool choice option ("auto", "required", etc.)
   * @returns {Object|null} - Claude tool_choice object or null
   */
  mapToolChoice(toolChoice) {
    if (!toolChoice) {
      return null;
    }

    switch (toolChoice) {
      case "auto":
        return { type: "auto" };
      case "required":
        return { type: "any" }; // Claude uses "any" instead of "required"
      default:
        // If it's already an object, return as-is
        if (typeof toolChoice === "object") {
          return toolChoice;
        }
        return null;
    }
  }

  /**
   * Validate tool definition
   * @param {Object} tool - Tool definition
   * @returns {boolean}
   */
  validateTool(tool) {
    if (!tool.name || typeof tool.name !== "string") {
      if (this.logger) {
        this.logger.warn("Tool missing required 'name' field");
      }
      return false;
    }

    if (!tool.description || typeof tool.description !== "string") {
      if (this.logger) {
        this.logger.warn(`Tool '${tool.name}' missing required 'description' field`);
      }
      return false;
    }

    if (!tool.input_schema || typeof tool.input_schema !== "object") {
      if (this.logger) {
        this.logger.warn(`Tool '${tool.name}' missing required 'input_schema' field`);
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
}

module.exports = ClaudeToolAdapter;

