/**
 * 🦊 Local LLM Stream Parser
 *
 * Handles all streaming response parsing for Local LLMs (Ollama/LM Studio).
 * Ollama uses a different streaming format than OpenAI.
 *
 * @enterprise-grade Robust streaming parser with error handling
 */

class LocalStreamParser {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Parse a single line from the stream
   * @param {string} line - Raw line from stream
   * @returns {Object|null} - Parsed event or null
   */
  parseLine(line) {
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
   * Check if chunk contains response text
   * @param {Object} chunk - Parsed chunk
   * @returns {boolean}
   */
  hasResponse(chunk) {
    return chunk && chunk.response !== undefined && chunk.response !== null;
  }

  /**
   * Extract response text from chunk
   * @param {Object} chunk - Parsed chunk
   * @returns {string|null}
   */
  extractResponse(chunk) {
    if (this.hasResponse(chunk)) {
      return chunk.response;
    }
    return null;
  }

  /**
   * Check if chunk indicates completion
   * @param {Object} chunk - Parsed chunk
   * @returns {boolean}
   */
  isDone(chunk) {
    return chunk && chunk.done === true;
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

    // Response text
    const responseText = this.extractResponse(parsed);
    if (responseText !== null) {
      return { type: "text", data: responseText };
    }

    // Done marker
    if (this.isDone(parsed)) {
      return { type: "done", data: parsed };
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
   * Extract model from response
   * @param {Object} response - Complete response object
   * @returns {string|null}
   */
  extractModel(response) {
    return response?.model || null;
  }

  /**
   * Extract context from response (for Ollama)
   * @param {Object} response - Complete response object
   * @returns {Array|null}
   */
  extractContext(response) {
    return response?.context || null;
  }
}

module.exports = LocalStreamParser;
