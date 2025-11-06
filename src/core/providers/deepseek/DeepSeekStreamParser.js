/**
 * 🦊 DeepSeek Stream Parser
 *
 * Handles all streaming response parsing for DeepSeek.
 * DeepSeek uses OpenAI-compatible API format.
 *
 * @enterprise-grade Robust streaming parser with error handling
 */

class DeepSeekStreamParser {
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

    // Check for stream end marker
    if (line.trim() === "[DONE]") {
      return { type: "done" };
    }

    // Skip empty lines
    if (!line.trim()) {
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
   * Check if delta contains text content
   * @param {Object} delta - Delta object from chunk
   * @returns {boolean}
   */
  hasTextContent(delta) {
    return delta && delta.content !== undefined && delta.content !== null;
  }

  /**
   * Extract text from delta
   * @param {Object} delta - Delta object from chunk
   * @returns {string|null}
   */
  extractTextContent(delta) {
    if (this.hasTextContent(delta)) {
      return delta.content;
    }
    return null;
  }

  /**
   * Check if delta indicates finish
   * @param {Object} choice - Choice object from chunk
   * @returns {boolean}
   */
  isFinished(choice) {
    return (
      choice &&
      choice.finish_reason !== null &&
      choice.finish_reason !== undefined
    );
  }

  /**
   * Get finish reason
   * @param {Object} choice - Choice object from chunk
   * @returns {string|null}
   */
  getFinishReason(choice) {
    if (this.isFinished(choice)) {
      return choice.finish_reason;
    }
    return null;
  }

  /**
   * Process streaming chunk and extract all relevant data
   * @param {string} line - Raw line from stream
   * @returns {Object} - Processed chunk data
   */
  processChunk(line) {
    const parsed = this.parseLine(line);

    if (!parsed) {
      return { type: "unknown", data: null };
    }

    // Stream end marker
    if (parsed.type === "done") {
      return { type: "done", data: null };
    }

    // Extract choice (DeepSeek follows OpenAI format)
    const choice = parsed.choices?.[0];

    if (!choice) {
      return { type: "unknown", data: null };
    }

    const delta = choice.delta;

    // Text content delta
    const textContent = this.extractTextContent(delta);
    if (textContent !== null) {
      return { type: "text", data: textContent };
    }

    // Role assignment (first chunk)
    if (delta && delta.role) {
      return { type: "role", data: delta.role };
    }

    // Finish reason
    const finishReason = this.getFinishReason(choice);
    if (finishReason) {
      return { type: "finish", data: finishReason };
    }

    // Unknown chunk type
    return { type: "unknown", data: parsed };
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

  /**
   * Extract usage information from response
   * @param {Object} response - Complete response object
   * @returns {Object|null} - Usage data
   */
  extractUsage(response) {
    if (response && response.usage) {
      return {
        prompt_tokens: response.usage.prompt_tokens || 0,
        completion_tokens: response.usage.completion_tokens || 0,
        total_tokens: response.usage.total_tokens || 0,
      };
    }
    return null;
  }
}

module.exports = DeepSeekStreamParser;
