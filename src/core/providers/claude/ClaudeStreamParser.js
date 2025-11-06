/**
 * 🦊 Claude Stream Parser
 *
 * Handles all streaming response parsing for Claude.
 * Processes Server-Sent Events (SSE) and extracts:
 * - Text content deltas
 * - Tool use blocks
 * - Tool input deltas
 * - Message completion
 *
 * @enterprise-grade Robust streaming parser with error handling
 */

class ClaudeStreamParser {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Parse a single line from the stream
   * @param {string} line - Raw line from stream
   * @returns {Object|null} - Parsed event or null
   */
  parseLine(line) {
    // Remove "data: " prefix if present
    if (line.startsWith("data: ")) {
      line = line.substring(6);
    }

    // Skip empty lines and event type markers
    if (!line.trim() || line.startsWith("event:")) {
      return null;
    }

    try {
      return JSON.parse(line);
    } catch (error) {
      // Ignore parse errors for incomplete chunks
      return null;
    }
  }

  /**
   * Check if event is a text content delta
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isTextDelta(event) {
    return (
      event.type === "content_block_delta" && event.delta?.type === "text_delta"
    );
  }

  /**
   * Extract text from text delta event
   * @param {Object} event - Parsed event
   * @returns {string|null}
   */
  extractTextDelta(event) {
    if (this.isTextDelta(event)) {
      return event.delta.text;
    }
    return null;
  }

  /**
   * Check if event is a tool use start
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isToolUseStart(event) {
    return (
      event.type === "content_block_start" &&
      event.content_block?.type === "tool_use"
    );
  }

  /**
   * Extract tool use metadata from start event
   * @param {Object} event - Parsed event
   * @returns {Object|null} - { id, name }
   */
  extractToolUseStart(event) {
    if (this.isToolUseStart(event)) {
      return {
        id: event.content_block.id,
        name: event.content_block.name,
      };
    }
    return null;
  }

  /**
   * Check if event is a tool input delta
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isToolInputDelta(event) {
    return (
      event.type === "content_block_delta" &&
      event.delta?.type === "input_json_delta"
    );
  }

  /**
   * Extract tool input delta from event
   * @param {Object} event - Parsed event
   * @returns {string|null}
   */
  extractToolInputDelta(event) {
    if (this.isToolInputDelta(event)) {
      return event.delta.partial_json;
    }
    return null;
  }

  /**
   * Check if event is a content block stop
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isContentBlockStop(event) {
    return event.type === "content_block_stop";
  }

  /**
   * Check if event is a message start
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isMessageStart(event) {
    return event.type === "message_start";
  }

  /**
   * Check if event is a message delta (usage update)
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isMessageDelta(event) {
    return event.type === "message_delta";
  }

  /**
   * Extract usage from message delta
   * @param {Object} event - Parsed event
   * @returns {Object|null} - { output_tokens }
   */
  extractUsageDelta(event) {
    if (this.isMessageDelta(event) && event.usage) {
      return event.usage;
    }
    return null;
  }

  /**
   * Check if event is a message stop
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isMessageStop(event) {
    return event.type === "message_stop";
  }

  /**
   * Check if event is an error
   * @param {Object} event - Parsed event
   * @returns {boolean}
   */
  isError(event) {
    return event.type === "error";
  }

  /**
   * Extract error details
   * @param {Object} event - Parsed event
   * @returns {Object|null} - { type, message }
   */
  extractError(event) {
    if (this.isError(event)) {
      return {
        type: event.error?.type || "unknown",
        message: event.error?.message || "Unknown error",
      };
    }
    return null;
  }

  /**
   * Process streaming chunk and extract all relevant data
   * @param {string} line - Raw line from stream
   * @returns {Object} - Processed chunk data
   */
  processChunk(line) {
    const event = this.parseLine(line);

    if (!event) {
      return { type: "unknown", data: null };
    }

    // Text content delta
    const textDelta = this.extractTextDelta(event);
    if (textDelta !== null) {
      return { type: "text", data: textDelta };
    }

    // Tool use start
    const toolUseStart = this.extractToolUseStart(event);
    if (toolUseStart) {
      return { type: "tool_use_start", data: toolUseStart };
    }

    // Tool input delta
    const toolInputDelta = this.extractToolInputDelta(event);
    if (toolInputDelta !== null) {
      return { type: "tool_input_delta", data: toolInputDelta };
    }

    // Content block stop
    if (this.isContentBlockStop(event)) {
      return { type: "content_block_stop", data: null };
    }

    // Message start
    if (this.isMessageStart(event)) {
      return { type: "message_start", data: event.message };
    }

    // Usage delta
    const usageDelta = this.extractUsageDelta(event);
    if (usageDelta) {
      return { type: "usage_delta", data: usageDelta };
    }

    // Message stop
    if (this.isMessageStop(event)) {
      return { type: "message_stop", data: null };
    }

    // Error
    const error = this.extractError(event);
    if (error) {
      return { type: "error", data: error };
    }

    // Unknown event type
    return { type: "unknown", data: event };
  }

  /**
   * Read and process streaming response
   * @param {ReadableStreamDefaultReader} reader - Stream reader
   * @param {TextDecoder} decoder - Text decoder
   * @param {AbortSignal} signal - Optional abort signal
   * @yields {Object} - Processed chunks
   */
  async *readStream(reader, decoder, signal = null) {
    let buffer = "";

    try {
      while (true) {
        // Check if aborted before reading
        if (signal?.aborted) {
          this.logger?.info("🛑 Stream aborted by user");
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            const processed = this.processChunk(line);
            if (processed.type !== "unknown") {
              yield processed;
            }
          }
        }
      }
    } catch (error) {
      // Handle abort errors gracefully
      if (error.name === "AbortError" || signal?.aborted) {
        this.logger?.info("🛑 Stream reading aborted");
        return;
      }
      throw error;
    } finally {
      // Always release the reader
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore errors when releasing lock
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const processed = this.processChunk(buffer);
      if (processed.type !== "unknown") {
        yield processed;
      }
    }
  }
}

module.exports = ClaudeStreamParser;
