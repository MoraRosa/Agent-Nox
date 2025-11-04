/**
 * 🦊 NOX File Create Capability
 *
 * Creates new files in the workspace.
 * Supports rollback via backup system.
 *
 * @enterprise-grade Atomic operations, validation, rollback support
 */

const vscode = require("vscode");
const path = require("path");
const CapabilityBase = require("../base/CapabilityBase");

class FileCreateCapability extends CapabilityBase {
  static metadata = {
    id: "file_create",
    name: "Create File",
    category: "write",
    description: "Create a new file in the workspace with specified content",
    version: "1.0.0",

    riskLevel: "medium",

    modes: {
      assistant: true,
      agent: true,
      autonomous: true,
    },

    approval: {
      assistant: "always",
      agent: "batch",
      autonomous: "none",
      highRisk: "always",
    },

    constraints: {
      maxExecutionsPerBatch: 50,
      timeout: 10000,
      retryable: true,
      maxRetries: 3,
    },

    permissions: ["workspace.write", "filesystem.create"],

    rollback: {
      supported: true,
      strategy: "backup",
    },

    dependencies: [],

    // Parameters schema for tool calling
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            'File path relative to workspace root (e.g., "src/components/Button.js")',
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
        language: {
          type: "string",
          description:
            "Programming language for syntax highlighting (optional)",
          enum: [
            "javascript",
            "typescript",
            "python",
            "java",
            "csharp",
            "go",
            "rust",
            "html",
            "css",
            "json",
            "markdown",
          ],
        },
      },
      required: ["path", "content"],
    },
  };

  constructor(context = {}) {
    super(context);
    this.fileOps = context.fileOps; // Inject existing fileOps service
  }

  /**
   * Execute file creation
   */
  async execute(parameters, context = {}) {
    const { path: filePath, content, language } = parameters;

    // Validate parameters
    const validation = this.validate(parameters);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    try {
      // Use existing fileOps service if available
      if (this.fileOps) {
        const result = await this.fileOps.createFile(filePath, content, {
          createBackup: true,
          language,
        });

        return {
          success: true,
          filePath,
          size: content.length,
          message: `Created file: ${filePath}`,
        };
      }

      // Fallback to VS Code API
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder open");
      }

      const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
      const uri = vscode.Uri.file(fullPath);

      // Check if file already exists
      try {
        await vscode.workspace.fs.stat(uri);
        throw new Error(`File already exists: ${filePath}`);
      } catch (error) {
        // File doesn't exist - good!
        if (error.code !== "FileNotFound") {
          throw error;
        }
      }

      // Create file
      const contentBytes = Buffer.from(content, "utf8");
      await vscode.workspace.fs.writeFile(uri, contentBytes);

      // Open file in editor
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      return {
        success: true,
        filePath,
        size: content.length,
        message: `Created file: ${filePath}`,
      };
    } catch (error) {
      throw new Error(`Failed to create file ${filePath}: ${error.message}`);
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

    if (!parameters.content && parameters.content !== "") {
      errors.push("Missing required parameter: content");
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

  /**
   * Create rollback point
   */
  async createRollbackPoint(parameters) {
    // For file creation, rollback point is just the file path
    // (we'll delete it on rollback)
    return {
      type: "file_create",
      filePath: parameters.path,
      timestamp: Date.now(),
    };
  }

  /**
   * Rollback file creation (delete the file)
   */
  async rollback(rollbackPoint) {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder open");
      }

      const fullPath = path.join(
        workspaceFolder.uri.fsPath,
        rollbackPoint.filePath
      );
      const uri = vscode.Uri.file(fullPath);

      // Delete the file
      await vscode.workspace.fs.delete(uri);

      return {
        success: true,
        message: `Rolled back file creation: ${rollbackPoint.filePath}`,
      };
    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }
}

module.exports = FileCreateCapability;
