/**
 * 🛠️ STREAMING TOOL HANDLER - PHASE 2B-3
 *
 * Manages tool execution during streaming for the ultimate UX!
 *
 * Features:
 * - Executes tools mid-stream
 * - Formats status messages with icons
 * - Handles approval flow based on mode
 * - Tracks execution state
 * - Sends updates to webview in real-time
 */

const vscode = require("vscode");

class StreamingToolHandler {
  constructor(capabilityRegistry, modeManager, webviewView, logger) {
    this.capabilityRegistry = capabilityRegistry;
    this.modeManager = modeManager;
    this.webviewView = webviewView;
    this.logger = logger;

    // Track active tool executions
    this.activeExecutions = new Map();
  }

  /**
   * 🛠️ Handle tool call during streaming
   * This is called when AI wants to execute a tool
   */
  async handleToolCall(toolCall, messageId) {
    const { id, name, parameters } = toolCall;

    this.logger.info(`🛠️ Tool call detected: ${name}`, { id, parameters });

    // Get capability class from registry
    const CapabilityClass = this.capabilityRegistry.get(name);
    if (!CapabilityClass) {
      this.sendToolStatus(messageId, {
        icon: "❌",
        message: `Unknown capability: ${name}`,
        status: "error",
        toolId: id,
      });
      return {
        success: false,
        error: `Capability ${name} not found`,
      };
    }

    // Get metadata for status messages
    const metadata = CapabilityClass.metadata;

    // Send initial status
    this.sendToolStatus(messageId, {
      icon: this.getIconForCapability(metadata),
      message: this.getStatusMessage(metadata, parameters, "starting"),
      status: "starting",
      toolId: id,
      toolName: name,
    });

    // Check if approval is required
    const approvalStrategy = this.modeManager.getApprovalStrategy(
      { type: metadata.id, parameters },
      {}
    );
    const requiresApproval = approvalStrategy !== "none";

    if (requiresApproval) {
      // Request approval from user
      const approved = await this.requestApproval(
        messageId,
        metadata,
        parameters,
        id
      );

      if (!approved) {
        this.sendToolStatus(messageId, {
          icon: "🚫",
          message: `User denied: ${metadata.name}`,
          status: "denied",
          toolId: id,
        });
        return {
          success: false,
          error: "User denied approval",
        };
      }
    }

    // Execute the capability
    try {
      this.sendToolStatus(messageId, {
        icon: "⚙️",
        message: this.getStatusMessage(metadata, parameters, "executing"),
        status: "executing",
        toolId: id,
      });

      // Instantiate and execute capability
      const capabilityInstance = new CapabilityClass({
        fileOps: this.capabilityRegistry.context?.fileOps,
      });
      const result = await capabilityInstance.execute(parameters);

      this.sendToolStatus(messageId, {
        icon: "✅",
        message: this.getStatusMessage(metadata, parameters, "success"),
        status: "success",
        toolId: id,
        result: result,
      });

      return {
        success: true,
        result: result,
      };
    } catch (error) {
      this.logger.error(`Tool execution failed: ${name}`, error);

      this.sendToolStatus(messageId, {
        icon: "❌",
        message: `Error: ${error.message}`,
        status: "error",
        toolId: id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 📤 Send tool status update to webview
   */
  sendToolStatus(messageId, statusData) {
    if (!this.webviewView?.webview) {
      this.logger.warn("Cannot send tool status - webview not available");
      return;
    }

    this.webviewView.webview.postMessage({
      type: "toolStatus",
      messageId: messageId,
      status: statusData,
    });
  }

  /**
   * 🎨 Get icon for capability based on type
   * @param {Object} metadata - Capability metadata object
   */
  getIconForCapability(metadata) {
    const category = metadata.category;
    const name = metadata.name;

    // Icon mapping
    const iconMap = {
      read: "📖",
      write: "📝",
      execute: "⚙️",
      search: "🔍",
      git: "🔀",
      terminal: "💻",
      web: "🌐",
    };

    // Special cases
    if (name.includes("create")) return "📝";
    if (name.includes("delete")) return "🗑️";
    if (name.includes("read")) return "📖";
    if (name.includes("search")) return "🔍";
    if (name.includes("git")) return "🔀";
    if (name.includes("terminal")) return "💻";

    return iconMap[category] || "🛠️";
  }

  /**
   * 💬 Get status message for capability
   * @param {Object} metadata - Capability metadata object
   */
  getStatusMessage(metadata, parameters, status) {
    const name = metadata.name;

    switch (status) {
      case "starting":
        return this.formatStartingMessage(name, parameters);
      case "executing":
        return this.formatExecutingMessage(name, parameters);
      case "success":
        return this.formatSuccessMessage(name, parameters);
      default:
        return `${name}...`;
    }
  }

  /**
   * 📝 Format starting message
   */
  formatStartingMessage(name, parameters) {
    if (name === "file_create") {
      return `Creating ${parameters.path}...`;
    }
    if (name === "file_read") {
      return `Reading ${parameters.path}...`;
    }
    if (name === "file_edit") {
      return `Editing ${parameters.path}...`;
    }
    if (name === "file_delete") {
      return `Deleting ${parameters.path}...`;
    }
    if (name === "terminal_execute") {
      return `Running command: ${parameters.command}`;
    }
    if (name === "git_commit") {
      return `Committing changes...`;
    }
    return `Starting ${name}...`;
  }

  /**
   * ⚙️ Format executing message
   */
  formatExecutingMessage(name, parameters) {
    if (name === "file_create") {
      return `Creating ${parameters.path}...`;
    }
    if (name === "file_read") {
      return `Reading ${parameters.path}...`;
    }
    return `Executing ${name}...`;
  }

  /**
   * ✅ Format success message
   */
  formatSuccessMessage(name, parameters) {
    if (name === "file_create") {
      return `Created ${parameters.path}`;
    }
    if (name === "file_read") {
      return `Read ${parameters.path}`;
    }
    if (name === "file_edit") {
      return `Edited ${parameters.path}`;
    }
    if (name === "file_delete") {
      return `Deleted ${parameters.path}`;
    }
    if (name === "terminal_execute") {
      return `Command completed`;
    }
    if (name === "git_commit") {
      return `Changes committed`;
    }
    return `${name} completed`;
  }

  /**
   * 🔐 Request approval from user
   * @param {Object} metadata - Capability metadata object
   */
  async requestApproval(messageId, metadata, parameters, toolId) {
    // Send approval request to webview
    this.webviewView.webview.postMessage({
      type: "toolApprovalRequest",
      messageId: messageId,
      toolId: toolId,
      capability: {
        name: metadata.name,
        description: metadata.description,
        riskLevel: metadata.riskLevel,
      },
      parameters: parameters,
    });

    // Wait for user response (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn(`Approval timeout for tool: ${metadata.name}`);
        resolve(false);
      }, 30000); // 30 second timeout

      // Store approval handler
      const approvalKey = `${messageId}_${toolId}`;
      this.activeExecutions.set(approvalKey, {
        resolve: (approved) => {
          clearTimeout(timeout);
          this.activeExecutions.delete(approvalKey);
          resolve(approved);
        },
      });
    });
  }

  /**
   * ✅ Handle approval response from user
   */
  handleApprovalResponse(messageId, toolId, approved) {
    const approvalKey = `${messageId}_${toolId}`;
    const execution = this.activeExecutions.get(approvalKey);

    if (execution) {
      execution.resolve(approved);
    } else {
      this.logger.warn(`No pending approval found for: ${approvalKey}`);
    }
  }

  /**
   * 🧹 Cleanup active executions
   */
  cleanup() {
    // Reject all pending approvals
    for (const [key, execution] of this.activeExecutions.entries()) {
      execution.resolve(false);
    }
    this.activeExecutions.clear();
  }
}

module.exports = StreamingToolHandler;
