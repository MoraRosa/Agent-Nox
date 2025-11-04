/**
 * 🦊 NOX File Read Capability
 *
 * Reads file contents from the workspace.
 * No approval required (read-only operation).
 *
 * @enterprise-grade Safe, fast, no side effects
 */

const vscode = require("vscode");
const path = require("path");
const CapabilityBase = require("../base/CapabilityBase");

class FileReadCapability extends CapabilityBase {
  static metadata = {
    id: "file_read",
    name: "Read File",
    category: "read",
    description: "Read contents of a file from the workspace",
    version: "1.0.0",

    riskLevel: "low",

    modes: {
      assistant: true,
      agent: true,
      autonomous: true,
    },

    approval: {
      assistant: "none",
      agent: "none",
      autonomous: "none",
      highRisk: "none",
    },

    constraints: {
      maxExecutionsPerBatch: 100,
      timeout: 5000,
      retryable: true,
      maxRetries: 2,
    },

    permissions: ["workspace.read", "filesystem.read"],

    rollback: {
      supported: false,
      strategy: null,
    },

    dependencies: [],

    // Parameters schema for tool calling
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            'File path relative to workspace root (e.g., "src/index.js")',
        },
      },
      required: ["path"],
    },
  };

  /**
   * Execute file read
   */
  async execute(parameters, context = {}) {
    const { path: filePath, encoding = "utf8" } = parameters;

    // Validate parameters
    const validation = this.validate(parameters);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder open");
      }

      const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
      const uri = vscode.Uri.file(fullPath);

      // Read file
      const contentBytes = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(contentBytes).toString(encoding);

      return {
        success: true,
        filePath,
        content,
        size: content.length,
        lines: content.split("\n").length,
        message: `Read file: ${filePath}`,
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Validate parameters
   */
  validate(parameters) {
    const errors = [];

    if (!parameters.path) {
      errors.push("Missing required parameter: path");
    }

    // Validate path format
    if (parameters.path) {
      if (parameters.path.includes("..")) {
        errors.push('Path cannot contain ".." (path traversal)');
      }

      if (path.isAbsolute(parameters.path)) {
        errors.push("Path must be relative to workspace root");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = FileReadCapability;
