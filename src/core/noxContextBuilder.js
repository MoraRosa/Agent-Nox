const vscode = require("vscode");
const path = require("path");
const fs = require("fs").promises;

/**
 * 🦊 NOX Context Builder - Gathers comprehensive project context for AI consciousness
 * Provides full project visibility and intelligent context assembly
 */
class NoxContextBuilder {
  constructor(contextManager, indexEngine, logger, performanceMonitor) {
    this.contextManager = contextManager;
    this.indexEngine = indexEngine;
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;

    // Chat history storage
    this.chatHistory = [];
    // Enterprise-grade chat history: No arbitrary message limit
    // Token-based trimming happens in buildMessagesFromHistory() instead
    // This ensures we never lose important context from earlier in the conversation
    this.maxChatHistory = Infinity; // No limit - let token budget control context window

    // Session management
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * 🧠 Build comprehensive NOX context for AI consciousness
   */
  async buildNoxContext(taskType, parameters = {}) {
    const timer = this.performanceMonitor.startTimer("nox_context_build");

    try {
      this.logger.debug(`🦊 Building NOX context for task: ${taskType}`);

      // Gather all context components in parallel for performance
      const [
        workspaceContext,
        projectStructure,
        activeFileContext,
        relevantContext,
        gitContext,
        environmentContext,
      ] = await Promise.all([
        this.getWorkspaceContext(),
        this.getProjectStructure(),
        this.getActiveFileContext(parameters),
        this.getRelevantContext(taskType, parameters),
        this.getGitContext(),
        this.getEnvironmentContext(),
      ]);

      const context = {
        // Session information
        sessionId: this.sessionId,
        sessionStartTime: this.sessionStartTime,
        timestamp: Date.now(),
        taskType,

        // Workspace context
        ...workspaceContext,

        // Project structure
        projectStructure,

        // Active file context
        ...activeFileContext,

        // Relevant context for the task
        ...relevantContext,

        // Git context
        ...gitContext,

        // Environment context
        ...environmentContext,

        // Chat history
        chatHistory: this.getChatHistory(),

        // Performance metrics
        contextBuildTime: 0, // Will be set after timer ends
      };

      timer.end();
      context.contextBuildTime = timer.duration;

      this.logger.debug(
        `🦊 NOX context built successfully (${timer.duration}ms)`
      );
      return context;
    } catch (error) {
      timer.end();
      this.logger.error("Failed to build NOX context:", error);
      throw error;
    }
  }

  /**
   * 🏠 Get workspace context
   */
  async getWorkspaceContext() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (!workspaceFolders || workspaceFolders.length === 0) {
        return {
          workspacePath: null,
          workspaceName: null,
          hasWorkspace: false,
          totalFiles: 0,
        };
      }

      const workspaceFolder = workspaceFolders[0];
      const workspacePath = workspaceFolder.uri.fsPath;
      const workspaceName = workspaceFolder.name;

      // Get file count from context manager
      const stats = this.contextManager.getStats();

      return {
        workspacePath,
        workspaceName,
        hasWorkspace: true,
        totalFiles: stats.totalFiles,
        totalSymbols: stats.totalSymbols,
      };
    } catch (error) {
      this.logger.error("Failed to get workspace context:", error);
      return {
        workspacePath: null,
        workspaceName: null,
        hasWorkspace: false,
        totalFiles: 0,
      };
    }
  }

  /**
   * 📁 Get project structure
   */
  async getProjectStructure() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;
      const structure = await this.scanProjectStructure(workspacePath, 2); // 2 levels deep

      return structure;
    } catch (error) {
      this.logger.error("Failed to get project structure:", error);
      return [];
    }
  }

  /**
   * 🔍 Scan project structure recursively
   */
  async scanProjectStructure(dirPath, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const structure = [];

      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (
          entry.name.startsWith(".") ||
          ["node_modules", "dist", "build", "__pycache__", "target"].includes(
            entry.name
          )
        ) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          fullPath
        );

        if (entry.isDirectory()) {
          structure.push({
            name: entry.name,
            type: "directory",
            path: relativePath,
            depth: currentDepth,
          });

          // Recursively scan subdirectories
          const subStructure = await this.scanProjectStructure(
            fullPath,
            maxDepth,
            currentDepth + 1
          );
          structure.push(...subStructure);
        } else {
          structure.push({
            name: entry.name,
            type: "file",
            path: relativePath,
            depth: currentDepth,
            extension: path.extname(entry.name),
          });
        }
      }

      return structure;
    } catch (error) {
      this.logger.debug(`Failed to scan directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * 📄 Get active file context
   */
  async getActiveFileContext(parameters) {
    try {
      const editor = vscode.window.activeTextEditor;
      const context = {
        activeFile: null,
        activeLanguage: null,
        selectedText: null,
        cursorPosition: null,
        fileContent: null,
      };

      if (editor) {
        context.activeFile = editor.document.fileName;
        context.activeLanguage = editor.document.languageId;
        context.cursorPosition = {
          line: editor.selection.active.line,
          character: editor.selection.active.character,
        };

        // Get selected text if any
        const selection = editor.selection;
        if (!selection.isEmpty) {
          context.selectedText = editor.document.getText(selection);
        }

        // Get file content for context (limit size for performance)
        const fullText = editor.document.getText();
        if (fullText.length < 50000) {
          // 50KB limit
          context.fileContent = fullText;
        }
      }

      // Override with parameters if provided (for command-based tasks)
      if (parameters.fileName) {
        context.activeFile = parameters.fileName;
      }
      if (parameters.code) {
        context.selectedText = parameters.code;
      }
      if (parameters.language) {
        context.activeLanguage = parameters.language;
      }

      return context;
    } catch (error) {
      this.logger.error("Failed to get active file context:", error);
      return {
        activeFile: null,
        activeLanguage: null,
        selectedText: null,
        cursorPosition: null,
        fileContent: null,
      };
    }
  }

  /**
   * 🎯 Get relevant context for specific task
   */
  async getRelevantContext(taskType, parameters) {
    try {
      let query = "";

      // Build query based on task type and parameters
      if (parameters.code) {
        query = this.extractKeywordsFromCode(parameters.code);
      } else if (parameters.message) {
        query = parameters.message;
      } else if (taskType === "analyze") {
        query = "main entry point index app"; // General analysis query
      }

      if (!query) {
        return {
          relevantFiles: [],
          relevantSymbols: [],
          relevanceScore: 0,
        };
      }

      // Get relevant context from context manager
      const contextResult = await this.contextManager.getContext(query, {
        maxFiles: 10,
        maxLines: 50,
      });

      return {
        relevantFiles: contextResult.files || [],
        relevantSymbols: contextResult.symbols || [],
        relevanceScore: contextResult.relevanceScore || 0,
        searchQuery: query,
      };
    } catch (error) {
      this.logger.error("Failed to get relevant context:", error);
      return {
        relevantFiles: [],
        relevantSymbols: [],
        relevanceScore: 0,
      };
    }
  }

  /**
   * 🔤 Extract keywords from code for context search
   */
  extractKeywordsFromCode(code) {
    // Extract function names, class names, and important identifiers
    const keywords = [];

    // Function declarations
    const functionMatches = code.match(
      /(?:function\s+|const\s+|let\s+|var\s+)(\w+)/g
    );
    if (functionMatches) {
      keywords.push(
        ...functionMatches.map((match) => match.split(/\s+/).pop())
      );
    }

    // Class names
    const classMatches = code.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map((match) => match.split(/\s+/).pop()));
    }

    // Import statements
    const importMatches = code.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      keywords.push(
        ...importMatches
          .map((match) => {
            const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            return moduleMatch ? moduleMatch[1] : "";
          })
          .filter(Boolean)
      );
    }

    // Remove duplicates and join
    return [...new Set(keywords)].join(" ");
  }

  /**
   * 🌿 Get Git context
   */
  async getGitContext() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return { hasGit: false };
      }

      // Check if .git directory exists
      const gitPath = path.join(workspaceFolders[0].uri.fsPath, ".git");
      try {
        await fs.access(gitPath);
        return {
          hasGit: true,
          gitPath,
          // Additional git info could be added here
        };
      } catch {
        return { hasGit: false };
      }
    } catch (error) {
      this.logger.error("Failed to get git context:", error);
      return { hasGit: false };
    }
  }

  /**
   * 🌍 Get environment context
   */
  async getEnvironmentContext() {
    try {
      return {
        vscodeVersion: vscode.version,
        platform: process.platform,
        nodeVersion: process.version,
        workspaceCount: vscode.workspace.workspaceFolders?.length || 0,
        extensionHost: vscode.env.appHost,
        language: vscode.env.language,
      };
    } catch (error) {
      this.logger.error("Failed to get environment context:", error);
      return {};
    }
  }

  /**
   * 💬 Add message to chat history
   */
  addChatMessage(role, content, context = {}) {
    const message = {
      role,
      content,
      timestamp: Date.now(),
      context: {
        taskType: context.taskType,
        activeFile: context.activeFile,
        summary: content.substring(0, 200), // Store summary for context
      },
    };

    this.chatHistory.push(message);

    // Enterprise approach: Keep ALL messages in history
    // Token-based trimming happens in buildMessagesFromHistory() when sending to AI
    // This preserves full conversation context for the entire session
    // (No arbitrary message count limits that lose important context)

    this.logger.debug(
      `💬 Added chat message: ${role} (${content.length} chars) - Total history: ${this.chatHistory.length} messages`
    );
  }

  /**
   * 💬 Get chat history
   */
  getChatHistory() {
    return this.chatHistory;
  }

  /**
   * 🔄 Clear chat history
   */
  clearChatHistory() {
    this.chatHistory = [];
    this.logger.info("💬 Chat history cleared");
  }

  /**
   * 🆔 Generate session ID
   */
  generateSessionId() {
    return `nox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📊 Get context statistics
   */
  getContextStats() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      chatHistoryLength: this.chatHistory.length,
      lastContextBuild: this.lastContextBuild || null,
    };
  }

  /**
   * 🔧 Detect project type
   */
  async detectProjectType(workspacePath) {
    if (!workspacePath) return "unknown";

    try {
      const files = await fs.readdir(workspacePath);

      if (files.includes("package.json")) return "node";
      if (files.includes("requirements.txt") || files.includes("setup.py"))
        return "python";
      if (files.includes("Cargo.toml")) return "rust";
      if (files.includes("go.mod")) return "go";
      if (files.includes("composer.json")) return "php";
      if (files.includes("pom.xml") || files.includes("build.gradle"))
        return "java";
      if (files.includes("Gemfile")) return "ruby";
      if (files.some((f) => f.endsWith(".csproj") || f.endsWith(".sln")))
        return "csharp";

      return "unknown";
    } catch (error) {
      this.logger.debug("Failed to detect project type:", error);
      return "unknown";
    }
  }
}

module.exports = NoxContextBuilder;
