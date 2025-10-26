const vscode = require("vscode");
const path = require("path");

// NOX consciousness components
const NoxSystemPrompt = require("./noxSystemPrompt");
const NoxCapabilities = require("./noxCapabilities");
const NoxContextBuilder = require("./noxContextBuilder");

/**
 * Main Agent Controller - orchestrates all agent operations with enterprise-grade architecture
 */
class AgentController {
  constructor(context, logger, performanceMonitor) {
    this.context = context;
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;

    // Core components (will be initialized)
    this.aiClient = null;
    this.contextManager = null;
    this.fileOps = null;
    this.indexEngine = null;
    this.cacheManager = null;
    this.capabilityExecutor = null;

    // NOX consciousness components
    this.noxSystemPrompt = null;
    this.noxCapabilities = null;
    this.noxContextBuilder = null;

    // State management
    this.isInitialized = false;
    this.workspacePath = null;
    this.configuration = null;
  }

  /**
   * Initialize the agent controller and all core components
   */
  async initialize() {
    const timer = this.performanceMonitor.startTimer("agent_initialization");

    try {
      this.logger.info("Initializing Agent Controller...");

      // Load configuration
      await this.loadConfiguration();

      // Initialize workspace
      await this.initializeWorkspace();

      // Initialize core components
      await this.initializeCoreComponents();

      // Validate initialization
      await this.validateInitialization();

      this.isInitialized = true;
      timer.end();

      this.logger.info("Agent Controller initialized successfully");
      this.performanceMonitor.recordMetric("initialization_success", 1);
    } catch (error) {
      timer.end();
      this.logger.error("Failed to initialize Agent Controller:", error);
      this.performanceMonitor.recordMetric("initialization_failure", 1);
      throw error;
    }
  }

  /**
   * Load and validate configuration
   */
  async loadConfiguration() {
    try {
      this.configuration = vscode.workspace.getConfiguration("nox");

      // Set default values if not configured
      const aiProvider = this.configuration.get("aiProvider", "anthropic");
      const enableCaching = this.configuration.get("enableCaching", true);
      const enableTelemetry = this.configuration.get("enableTelemetry", true);
      const maxContextSize = this.configuration.get("maxContextSize", 100000);
      const logLevel = this.configuration.get("logLevel", "info");

      this.logger.info("🦊 Nox configuration loaded", {
        provider: aiProvider,
        caching: enableCaching,
        telemetry: enableTelemetry,
        maxContextSize: maxContextSize,
        logLevel: logLevel,
      });

      // Store configuration for easy access
      this.configValues = {
        aiProvider,
        enableCaching,
        enableTelemetry,
        maxContextSize,
        logLevel,
      };
    } catch (error) {
      this.logger.error("Configuration loading failed:", error);
      // Use defaults if configuration fails
      this.configValues = {
        aiProvider: "anthropic",
        enableCaching: true,
        enableTelemetry: true,
        maxContextSize: 100000,
        logLevel: "info",
      };
      this.logger.info("🦊 Using default configuration values");
    }
  }

  /**
   * Get configuration value with fallback
   */
  get(key, defaultValue = null) {
    return this.configValues ? this.configValues[key] : defaultValue;
  }

  /**
   * Initialize workspace context
   */
  async initializeWorkspace() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (workspaceFolders && workspaceFolders.length > 0) {
        this.workspacePath = workspaceFolders[0].uri.fsPath;
        this.logger.info("Workspace detected", { path: this.workspacePath });
      } else {
        this.logger.warn(
          "No workspace folder detected - some features may be limited"
        );
      }
    } catch (error) {
      throw new Error(`Workspace initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize core components with dependency injection
   */
  async initializeCoreComponents() {
    try {
      // Import core modules (lazy loading for performance)
      const AIClient = require("./aiClient");
      const ContextManager = require("./contextManager");
      const FileOps = require("./fileOps");
      const IndexEngine = require("./indexEngine");
      const CacheManager = require("../storage/cacheManager");
      const CapabilityExecutor = require("./capabilityExecutor");

      // Initialize in dependency order
      this.cacheManager = new CacheManager(this.context, this.logger);
      await this.cacheManager.initialize();

      this.aiClient = new AIClient(
        this.context,
        this.logger,
        this.performanceMonitor
      );
      await this.aiClient.initialize(this.configuration);

      this.fileOps = new FileOps(
        this.context,
        this.logger,
        this.performanceMonitor
      );
      await this.fileOps.initialize();

      this.contextManager = new ContextManager(
        this.context,
        this.logger,
        this.performanceMonitor,
        this.cacheManager
      );
      await this.contextManager.initialize();

      this.indexEngine = new IndexEngine(
        this.context,
        this.logger,
        this.performanceMonitor,
        this.contextManager
      );
      await this.indexEngine.initialize(this.workspacePath);

      // Initialize NOX consciousness components
      this.noxSystemPrompt = new NoxSystemPrompt(
        this.logger,
        this.performanceMonitor
      );
      this.noxCapabilities = new NoxCapabilities(
        this.logger,
        this.performanceMonitor
      );
      this.noxContextBuilder = new NoxContextBuilder(
        this.contextManager,
        this.indexEngine,
        this.logger,
        this.performanceMonitor
      );

      // Initialize capability executor AFTER all other components
      this.capabilityExecutor = new CapabilityExecutor(
        this,
        this.fileOps,
        this.logger,
        this.performanceMonitor
      );

      this.logger.info(
        "Core components and NOX consciousness initialized successfully"
      );
    } catch (error) {
      throw new Error(
        `Core components initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Validate that all components are properly initialized
   */
  async validateInitialization() {
    const components = [
      { name: "aiClient", instance: this.aiClient },
      { name: "contextManager", instance: this.contextManager },
      { name: "fileOps", instance: this.fileOps },
      { name: "indexEngine", instance: this.indexEngine },
      { name: "cacheManager", instance: this.cacheManager },
      { name: "capabilityExecutor", instance: this.capabilityExecutor },
    ];

    for (const component of components) {
      if (!component.instance) {
        throw new Error(`Component ${component.name} is null or undefined`);
      }
      if (!component.instance.isInitialized) {
        this.logger.error(`Component ${component.name} validation failed:`, {
          hasInstance: !!component.instance,
          isInitialized: component.instance?.isInitialized,
          componentType: typeof component.instance,
          componentConstructor: component.instance?.constructor?.name,
        });
        throw new Error(
          `Component ${component.name} failed to initialize properly (isInitialized: ${component.instance?.isInitialized})`
        );
      }
    }

    this.logger.debug("All components validated successfully");
  }

  /**
   * Handle workspace folder changes
   */
  async handleWorkspaceChange(_event) {
    try {
      this.logger.info("Handling workspace change...");

      // Reinitialize workspace
      await this.initializeWorkspace();

      // Reinitialize index engine with new workspace
      if (this.indexEngine) {
        await this.indexEngine.reinitialize(this.workspacePath);
      }

      this.logger.info("Workspace change handled successfully");
    } catch (error) {
      this.logger.error("Failed to handle workspace change:", error);
    }
  }

  /**
   * Handle file changes for intelligent indexing
   */
  async handleFileChange(document) {
    try {
      if (!this.indexEngine || !this.isInitialized) return;

      const filePath = document.uri.fsPath;
      this.logger.debug("File changed, updating index", { filePath });

      await this.indexEngine.updateFileIndex(filePath, document.getText());
    } catch (error) {
      this.logger.error("Failed to handle file change:", error);
    }
  }

  /**
   * Update configuration when settings change
   */
  async updateConfiguration() {
    try {
      this.logger.info("Updating configuration...");

      await this.loadConfiguration();

      // Update AI client configuration
      if (this.aiClient) {
        await this.aiClient.updateConfiguration(this.configuration);
      }

      this.logger.info("Configuration updated successfully");
    } catch (error) {
      this.logger.error("Failed to update configuration:", error);
    }
  }

  /**
   * Get agent status and health information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      workspace: this.workspacePath,
      components: {
        aiClient: (this.aiClient && this.aiClient.isInitialized) || false,
        contextManager:
          (this.contextManager && this.contextManager.isInitialized) || false,
        fileOps: (this.fileOps && this.fileOps.isInitialized) || false,
        indexEngine:
          (this.indexEngine && this.indexEngine.isInitialized) || false,
        cacheManager:
          (this.cacheManager && this.cacheManager.isInitialized) || false,
        capabilityExecutor: !!this.capabilityExecutor,
        noxSystemPrompt: !!this.noxSystemPrompt,
        noxCapabilities: !!this.noxCapabilities,
        noxContextBuilder: !!this.noxContextBuilder,
      },
      noxConsciousness: {
        enabled: !!(
          this.noxSystemPrompt &&
          this.noxCapabilities &&
          this.noxContextBuilder
        ),
        sessionId: this.noxContextBuilder?.sessionId || null,
        chatHistoryLength:
          this.noxContextBuilder?.getChatHistory()?.length || 0,
        capabilityStats: this.noxCapabilities?.getCapabilityStats() || null,
      },
      performance: this.performanceMonitor.getSystemMetrics(),
      costs: this.performanceMonitor.getCostSummary(),
    };
  }

  /**
   * 🦊 Execute NOX task with full AI consciousness and capabilities
   */
  async executeTask(taskType, parameters = {}) {
    if (!this.isInitialized) {
      throw new Error("Agent controller not initialized");
    }

    const timer = this.performanceMonitor.startTimer(`nox_task_${taskType}`);

    try {
      this.logger.info(`🦊 NOX executing task: ${taskType}`, parameters);

      // 1. Build comprehensive NOX context
      const noxContext = await this.buildNoxContext(taskType, parameters);

      // 2. Create NOX-aware system prompt
      const systemPrompt = this.buildNoxSystemPrompt(taskType, noxContext);

      // 3. Build task-specific prompt with NOX identity
      const taskPrompt = this.buildNoxTaskPrompt(
        taskType,
        parameters,
        noxContext
      );

      // 4. Execute with full NOX consciousness
      const aiResponse = await this.executeNoxTask(
        systemPrompt,
        taskPrompt,
        parameters
      );

      // 5. Process response and execute NOX capabilities
      const result = await this.processNoxResult(
        taskType,
        aiResponse,
        parameters,
        noxContext
      );

      // 6. Add to chat history for context continuity
      this.addToChatHistory(
        "user",
        this.buildUserMessage(taskType, parameters),
        noxContext
      );
      this.addToChatHistory(
        "assistant",
        result.content || result.message,
        noxContext
      );

      timer.end();
      this.performanceMonitor.recordMetric(`nox_task_${taskType}_success`, 1);

      this.logger.info(
        `🦊 NOX task completed: ${taskType} (${timer.duration}ms)`
      );
      return result;
    } catch (error) {
      timer.end();
      this.performanceMonitor.recordMetric(`nox_task_${taskType}_failure`, 1);
      this.logger.error(`🦊 NOX task ${taskType} failed:`, error);
      throw error;
    }
  }

  /**
   * 🧠 Build comprehensive NOX context
   */
  async buildNoxContext(taskType, parameters) {
    return await this.noxContextBuilder.buildNoxContext(taskType, parameters);
  }

  /**
   * 🦊 Build NOX system prompt with full consciousness
   */
  buildNoxSystemPrompt(taskType, noxContext) {
    const currentProvider = this.aiClient.currentProvider;
    return this.noxSystemPrompt.buildSystemPrompt(
      taskType,
      noxContext,
      currentProvider
    );
  }

  /**
   * 🎯 Build task-specific NOX prompt
   */
  buildNoxTaskPrompt(taskType, parameters, noxContext) {
    return this.noxSystemPrompt.buildTaskPrompt(
      taskType,
      parameters,
      noxContext
    );
  }

  /**
   * 🤖 Execute NOX task with AI consciousness
   */
  async executeNoxTask(systemPrompt, taskPrompt, parameters) {
    // Send to AI with proper system/user message structure
    const response = await this.aiClient.sendRequestWithSystem(
      systemPrompt,
      taskPrompt,
      {
        maxTokens: parameters.maxTokens || 4000,
        temperature: parameters.temperature || 0.7,
      }
    );

    return response;
  }

  /**
   * 🌊 Execute NOX streaming task with AI consciousness
   */
  async executeNoxStreamingTask(
    systemPrompt,
    taskPrompt,
    parameters,
    onChunk,
    onComplete,
    abortController
  ) {
    // Send streaming request with proper system/user message structure
    await this.aiClient.sendStreamingRequestWithSystem(
      systemPrompt,
      taskPrompt,
      {
        maxTokens: parameters.maxTokens || 4000,
        temperature: parameters.temperature || 0.7,
        messageId: parameters.messageId,
      },
      onChunk,
      onComplete,
      abortController
    );
  }

  /**
   * 🔄 Process NOX result and execute capabilities
   */
  async processNoxResult(taskType, aiResponse, parameters, noxContext) {
    const timer = this.performanceMonitor.startTimer(
      `nox_capability_execution_${taskType}`
    );

    try {
      this.logger.info(
        `🦊 Processing NOX result for ${taskType} with capabilities`
      );

      const result = {
        taskType,
        parameters,
        status: "completed",
        timestamp: Date.now(),
        content: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        cost: aiResponse.cost,
        noxContext: {
          sessionId: noxContext.sessionId,
          contextBuildTime: noxContext.contextBuildTime,
          relevanceScore: noxContext.relevanceScore,
        },
        capabilities: {
          executed: [],
          suggested: [],
          requiresApproval: [],
        },
      };

      // Execute task-specific capabilities
      await this.executeTaskCapabilities(
        taskType,
        aiResponse,
        parameters,
        noxContext,
        result
      );

      // Parse AI response for capability suggestions
      await this.parseCapabilitySuggestions(aiResponse.content, result);

      timer.end();
      result.processingTime = timer.duration;

      this.logger.info(
        `🦊 NOX capabilities processed for ${taskType} (${timer.duration}ms)`
      );
      return result;
    } catch (error) {
      timer.end();
      this.logger.error(
        `Failed to process NOX capabilities for ${taskType}:`,
        error
      );

      // Return basic result even if capability processing fails
      return {
        taskType,
        parameters,
        status: "completed_with_errors",
        timestamp: Date.now(),
        content: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        cost: aiResponse.cost,
        error: error.message,
        noxContext: {
          sessionId: noxContext.sessionId,
          contextBuildTime: noxContext.contextBuildTime,
          relevanceScore: noxContext.relevanceScore,
        },
      };
    }
  }

  /**
   * 🚀 Execute task-specific capabilities
   */
  async executeTaskCapabilities(
    taskType,
    aiResponse,
    parameters,
    noxContext,
    result
  ) {
    try {
      this.logger.debug(`🚀 Executing capabilities for task: ${taskType}`);

      switch (taskType) {
        case "explain":
          await this.executeExplainCapabilities(
            aiResponse,
            parameters,
            noxContext,
            result
          );
          break;
        case "refactor":
          await this.executeRefactorCapabilities(
            aiResponse,
            parameters,
            noxContext,
            result
          );
          break;
        case "analyze":
          await this.executeAnalyzeCapabilities(
            aiResponse,
            parameters,
            noxContext,
            result
          );
          break;
        case "generate":
          await this.executeGenerateCapabilities(
            aiResponse,
            parameters,
            noxContext,
            result
          );
          break;
        case "chat":
          await this.executeChatCapabilities(
            aiResponse,
            parameters,
            noxContext,
            result
          );
          break;
        default:
          this.logger.debug(
            `No specific capabilities for task type: ${taskType}`
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute capabilities for ${taskType}:`,
        error
      );
      result.capabilities.errors = result.capabilities.errors || [];
      result.capabilities.errors.push({
        type: "capability_execution",
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 💡 Execute explain task capabilities
   */
  async executeExplainCapabilities(aiResponse, parameters, noxContext, result) {
    try {
      // For explain tasks, we enhance the response with additional context
      const { fileName, code } = parameters;

      if (fileName && this.contextManager) {
        // Get related files and symbols
        const relatedContext = await this.contextManager.getContext(
          this.extractKeywords(code || ""),
          { maxFiles: 5, maxLines: 20 }
        );

        if (relatedContext.files.length > 0) {
          result.capabilities.executed.push({
            type: "context_enhancement",
            description: "Enhanced explanation with related code context",
            data: {
              relatedFiles: relatedContext.files.length,
              relatedSymbols: relatedContext.symbols.length,
            },
          });
        }
      }

      // Suggest follow-up actions
      result.capabilities.suggested.push({
        type: "refactor_suggestion",
        description: "Would you like me to suggest improvements for this code?",
        action: "refactor",
        parameters: { code: parameters.code, fileName: parameters.fileName },
      });
    } catch (error) {
      this.logger.error("Failed to execute explain capabilities:", error);
    }
  }

  /**
   * 🔧 Execute refactor task capabilities
   */
  async executeRefactorCapabilities(
    aiResponse,
    parameters,
    noxContext,
    result
  ) {
    try {
      const { fileName, code } = parameters;

      // Parse AI response for actual code suggestions
      const codeBlocks = this.extractCodeBlocks(aiResponse.content);

      if (codeBlocks.length > 0 && fileName) {
        // Suggest applying the refactoring
        result.capabilities.requiresApproval.push({
          type: "file_edit",
          description: `Apply refactoring suggestions to ${fileName}`,
          action: "apply_refactor",
          parameters: {
            fileName,
            originalCode: code,
            refactoredCode: codeBlocks[0].code,
            language: codeBlocks[0].language,
          },
          risk: "medium",
        });
      }

      // Suggest running tests after refactoring
      if (this.detectTestFiles(noxContext)) {
        result.capabilities.suggested.push({
          type: "test_execution",
          description:
            "Run tests to verify refactoring doesn't break functionality",
          action: "run_tests",
        });
      }
    } catch (error) {
      this.logger.error("Failed to execute refactor capabilities:", error);
    }
  }

  /**
   * 📊 Execute analyze task capabilities
   */
  async executeAnalyzeCapabilities(aiResponse, parameters, noxContext, result) {
    try {
      // Get comprehensive project statistics
      const stats = this.indexEngine.getStats();
      const contextStats = this.contextManager.getStats();

      result.capabilities.executed.push({
        type: "codebase_analysis",
        description: "Performed comprehensive codebase analysis",
        data: {
          totalFiles: contextStats.totalFiles,
          totalSymbols: contextStats.totalSymbols,
          indexingTime: stats.lastIndexDuration,
          projectStructure: noxContext.projectStructure?.length || 0,
        },
      });

      // Suggest specific improvements based on analysis
      if (contextStats.totalFiles > 100) {
        result.capabilities.suggested.push({
          type: "performance_optimization",
          description:
            "Large codebase detected - would you like performance optimization suggestions?",
          action: "optimize_performance",
        });
      }

      // Suggest security analysis
      result.capabilities.suggested.push({
        type: "security_analysis",
        description: "Run security vulnerability scan on dependencies",
        action: "security_scan",
      });
    } catch (error) {
      this.logger.error("Failed to execute analyze capabilities:", error);
    }
  }

  /**
   * 🚀 Execute generate task capabilities
   */
  async executeGenerateCapabilities(
    aiResponse,
    parameters,
    noxContext,
    result
  ) {
    try {
      // Parse generated code from AI response
      const codeBlocks = this.extractCodeBlocks(aiResponse.content);

      if (codeBlocks.length > 0) {
        for (const codeBlock of codeBlocks) {
          // Suggest creating files for generated code
          const suggestedFileName = this.suggestFileName(codeBlock, parameters);

          if (suggestedFileName) {
            result.capabilities.requiresApproval.push({
              type: "file_creation",
              description: `Create ${suggestedFileName} with generated code`,
              action: "create_file",
              parameters: {
                fileName: suggestedFileName,
                content: codeBlock.code,
                language: codeBlock.language,
              },
              risk: "low",
            });
          }
        }
      }

      // Suggest related files that might need updates
      if (parameters.type === "component" || parameters.type === "module") {
        result.capabilities.suggested.push({
          type: "dependency_update",
          description: "Update import statements in related files",
          action: "update_imports",
        });
      }
    } catch (error) {
      this.logger.error("Failed to execute generate capabilities:", error);
    }
  }

  /**
   * 💬 Execute chat task capabilities
   */
  async executeChatCapabilities(aiResponse, parameters, noxContext, result) {
    try {
      // Parse chat response for actionable items
      const actionItems = this.parseActionItems(aiResponse.content);

      for (const item of actionItems) {
        if (item.type === "file_operation") {
          result.capabilities.requiresApproval.push({
            type: item.operation,
            description: item.description,
            action: item.action,
            parameters: item.parameters,
            risk: item.risk || "medium",
          });
        } else {
          result.capabilities.suggested.push(item);
        }
      }

      // 🔥 NEW: Enhanced file operation detection
      const fileOperations = this.detectFileOperations(
        parameters.message || "",
        aiResponse.content || ""
      );

      this.logger.info(
        `🔍 DEBUG: Detected ${fileOperations.length} file operations`
      );
      for (const fileOp of fileOperations) {
        this.logger.info(
          `🔍 DEBUG: Adding file operation: ${fileOp.type} - ${fileOp.description}`
        );
        result.capabilities.requiresApproval.push({
          type: fileOp.type,
          description: fileOp.description,
          action: fileOp.action,
          parameters: fileOp.parameters,
          risk: fileOp.risk || "medium",
        });
      }

      // Check for Git operations in user message and AI response
      const gitOperations = this.detectGitOperations(
        parameters.message || "",
        aiResponse.content || ""
      );

      // Debug logging
      this.logger.info(
        `🔍 Detected ${gitOperations.length} Git operations from message: "${parameters.message}"`
      );
      if (gitOperations.length > 0) {
        this.logger.info(`🔍 Git operations:`, gitOperations);
      }

      for (const gitOp of gitOperations) {
        // Execute Git operations automatically if they're safe
        if (gitOp.autoExecute) {
          try {
            const gitResult = await this.executeCapability(gitOp, noxContext);
            result.capabilities.executed.push({
              type: gitOp.type,
              description: gitOp.description,
              result: gitResult,
            });
          } catch (error) {
            this.logger.error(
              `Failed to execute Git operation ${gitOp.type}:`,
              error
            );
            result.capabilities.suggested.push({
              type: gitOp.type,
              description: `${gitOp.description} (failed: ${error.message})`,
              action: "manual_retry",
            });
          }
        } else {
          // Add to approval queue for destructive operations
          result.capabilities.requiresApproval.push(gitOp);
        }
      }

      // Enhance response with context if user asks about specific files
      const mentionedFiles = this.extractFileMentions(parameters.message || "");
      if (mentionedFiles.length > 0) {
        result.capabilities.executed.push({
          type: "file_context",
          description: "Enhanced response with file context",
          data: { mentionedFiles },
        });
      }
    } catch (error) {
      this.logger.error("Failed to execute chat capabilities:", error);
    }
  }

  /**
   * 💬 Add message to chat history
   */
  addToChatHistory(role, content, context) {
    this.noxContextBuilder.addChatMessage(role, content, context);
  }

  /**
   * 🔍 Parse capability suggestions from AI response
   */
  async parseCapabilitySuggestions(content, result) {
    try {
      // Look for common capability patterns in AI response
      const suggestions = [];

      // File creation suggestions
      const fileCreationPattern =
        /(?:create|generate|add)\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+)?["`']?([^"`'\s]+\.[a-zA-Z]+)["`']?/gi;
      let match;
      while ((match = fileCreationPattern.exec(content)) !== null) {
        suggestions.push({
          type: "file_creation",
          description: `Create file: ${match[1]}`,
          action: "create_file",
          parameters: { fileName: match[1] },
        });
      }

      // Terminal command suggestions
      const commandPattern = /(?:run|execute)\s+["`']([^"`']+)["`']/gi;
      while ((match = commandPattern.exec(content)) !== null) {
        suggestions.push({
          type: "terminal_command",
          description: `Run command: ${match[1]}`,
          action: "run_command",
          parameters: { command: match[1] },
          risk: "medium",
        });
      }

      // Package installation suggestions
      const packagePattern =
        /(?:install|add)\s+(?:package\s+)?["`']?([a-zA-Z0-9@\-_\/]+)["`']?/gi;
      while ((match = packagePattern.exec(content)) !== null) {
        suggestions.push({
          type: "package_installation",
          description: `Install package: ${match[1]}`,
          action: "install_package",
          parameters: { package: match[1] },
          risk: "low",
        });
      }

      // Add suggestions to result
      result.capabilities.suggested.push(...suggestions);
    } catch (error) {
      this.logger.error("Failed to parse capability suggestions:", error);
    }
  }

  /**
   * 🔤 Extract keywords from text for context search
   */
  extractKeywords(text) {
    if (!text) return "";

    // Extract meaningful words (functions, classes, variables)
    const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const keywords = words.filter(
      (word) =>
        word.length > 2 &&
        ![
          "the",
          "and",
          "for",
          "are",
          "but",
          "not",
          "you",
          "all",
          "can",
          "had",
          "her",
          "was",
          "one",
          "our",
          "out",
          "day",
          "get",
          "has",
          "him",
          "his",
          "how",
          "man",
          "new",
          "now",
          "old",
          "see",
          "two",
          "way",
          "who",
          "boy",
          "did",
          "its",
          "let",
          "put",
          "say",
          "she",
          "too",
          "use",
        ].includes(word.toLowerCase())
    );

    return [...new Set(keywords)].slice(0, 10).join(" ");
  }

  /**
   * 📄 Extract code blocks from AI response
   */
  extractCodeBlocks(content) {
    const codeBlocks = [];
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;

    let match;
    while ((match = codeBlockPattern.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  }

  /**
   * 📁 Suggest file name for generated code
   */
  suggestFileName(codeBlock, parameters) {
    const { language, code } = codeBlock;

    // Try to extract class or function names
    let name = null;

    if (language === "javascript" || language === "typescript") {
      const classMatch = code.match(/class\s+(\w+)/);
      const functionMatch = code.match(/(?:function\s+|const\s+)(\w+)/);
      name = classMatch?.[1] || functionMatch?.[1];
    } else if (language === "python") {
      const classMatch = code.match(/class\s+(\w+)/);
      const functionMatch = code.match(/def\s+(\w+)/);
      name = classMatch?.[1] || functionMatch?.[1];
    }

    if (name) {
      const extensions = {
        javascript: ".js",
        typescript: ".ts",
        python: ".py",
        java: ".java",
        csharp: ".cs",
        go: ".go",
        rust: ".rs",
      };

      const ext = extensions[language] || ".txt";
      return `${name.toLowerCase()}${ext}`;
    }

    // Fallback based on parameters
    if (parameters.type) {
      return `${parameters.type.toLowerCase()}.${
        language === "typescript" ? "ts" : "js"
      }`;
    }

    return null;
  }

  /**
   * 🧪 Detect test files in project
   */
  detectTestFiles(noxContext) {
    if (!noxContext.projectStructure) return false;

    return noxContext.projectStructure.some(
      (item) =>
        item.name.includes("test") ||
        item.name.includes("spec") ||
        item.path.includes("__tests__") ||
        item.path.includes("tests")
    );
  }

  /**
   * 🔍 Detect file operations from user message and AI response
   */
  detectFileOperations(userMessage, aiResponse) {
    const fileOperations = [];
    const detectedFiles = new Set(); // Prevent duplicates
    const combinedText = `${userMessage} ${aiResponse}`;

    this.logger.info(
      `🔍 File operation detection - User: "${userMessage}", AI: "${aiResponse.substring(
        0,
        100
      )}..."`
    );

    // Enhanced file creation patterns
    const createPatterns = [
      // Direct file creation: "create file called test.html"
      /(?:create|make|add|generate)\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+|named\s+)?["`']?([^"`'\s]+\.[a-zA-Z]+)["`']?/gi,
      // AI response: "I'll create test.html"
      /(?:I'll|I will|Let me)\s+create\s+(?:a\s+)?(?:new\s+)?file\s+["`']?([^"`'\s]+\.[a-zA-Z]+)["`']?/gi,
      // Multiple files: "create index.html and styles.css"
      /(?:create|make|add|generate)\s+([a-zA-Z0-9_\-]+\.[a-zA-Z]+)(?:\s+and\s+([a-zA-Z0-9_\-]+\.[a-zA-Z]+))?/gi,
      // File mentions in paths: "templates/file.html"
      /(?:^|\s)([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\.[a-zA-Z]+)(?:\s|$)/gi,
      // Explicit file creation: "Creating: file.html"
      /Creating:\s*([^"`'\s]+\.[a-zA-Z]+)/gi,
    ];

    for (const pattern of createPatterns) {
      let match;
      // Reset regex lastIndex to avoid issues with global flag
      pattern.lastIndex = 0;

      while ((match = pattern.exec(combinedText)) !== null) {
        // Handle multiple captures (for "file1 and file2" pattern)
        for (let i = 1; i < match.length; i++) {
          const fileName = match[i];
          if (fileName && !detectedFiles.has(fileName)) {
            detectedFiles.add(fileName);
            this.logger.info(`🔍 Detected file creation: ${fileName}`);

            fileOperations.push({
              type: "file_creation",
              description: `Create file: ${fileName}`,
              action: "create_file",
              parameters: {
                fileName: fileName,
                content: this.extractFileContent(aiResponse, fileName) || "",
              },
              risk: "medium",
            });
          }
        }
      }
    }

    return fileOperations;
  }

  /**
   * 🔍 Detect Git operations from user message and AI response
   */
  detectGitOperations(userMessage, aiResponse) {
    const gitOperations = [];
    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();

    // Debug logging
    this.logger.info(
      `🔍 Git detection - User: "${userMessage}", AI: "${aiResponse.substring(
        0,
        100
      )}..."`
    );
    this.logger.info(
      `🔍 Combined text: "${combinedText.substring(0, 200)}..."`
    );

    // Git status - safe operation, auto-execute
    if (
      combinedText.includes("git status") ||
      combinedText.includes("what's my git status") ||
      combinedText.includes("check git") ||
      combinedText.includes("repository status")
    ) {
      this.logger.info(`🔍 Detected Git status request!`);
      gitOperations.push({
        type: "git_status",
        description: "Check Git repository status",
        parameters: {},
        autoExecute: true,
        risk: "low",
      });
    }

    // Git commit - requires approval
    if (
      combinedText.includes("git commit") ||
      combinedText.includes("commit changes") ||
      combinedText.includes("commit my changes")
    ) {
      gitOperations.push({
        type: "git_commit",
        description: "Commit current changes with intelligent message",
        parameters: {
          autoStage: true,
        },
        autoExecute: false,
        risk: "medium",
      });
    }

    // Git push - requires approval
    if (
      combinedText.includes("git push") ||
      combinedText.includes("push changes") ||
      combinedText.includes("push to github")
    ) {
      gitOperations.push({
        type: "git_push",
        description: "Push changes to remote repository",
        parameters: {},
        autoExecute: false,
        risk: "medium",
      });
    }

    // Branch creation - requires approval
    const branchMatch = combinedText.match(
      /create.*branch.*?(?:for|called|named)\s+([a-zA-Z0-9\-_]+)/
    );
    if (branchMatch || combinedText.includes("create branch")) {
      const branchName = branchMatch ? branchMatch[1] : null;
      gitOperations.push({
        type: "git_branch_create",
        description: `Create new branch${branchName ? ` '${branchName}'` : ""}`,
        parameters: branchName ? { branchName } : {},
        autoExecute: false,
        risk: "low",
      });
    }

    return gitOperations;
  }

  /**
   * 🎯 Parse action items from chat response
   */
  parseActionItems(content) {
    const actionItems = [];

    // Look for explicit action suggestions
    const actionPattern =
      /(?:I suggest|I recommend|You should|Consider)\s+([^.!?]+)/gi;
    let match;

    while ((match = actionPattern.exec(content)) !== null) {
      const suggestion = match[1].trim();

      actionItems.push({
        type: "suggestion",
        description: suggestion,
        action: "manual_action",
      });
    }

    return actionItems;
  }

  /**
   * 📄 Extract file mentions from text
   */
  extractFileMentions(text) {
    const filePattern = /(?:^|\s)([a-zA-Z0-9_\-\/]+\.[a-zA-Z]+)(?:\s|$)/g;
    const files = [];
    let match;

    while ((match = filePattern.exec(text)) !== null) {
      files.push(match[1]);
    }

    return [...new Set(files)];
  }

  /**
   * 📄 Extract file content from AI response
   */
  extractFileContent(aiResponse, fileName) {
    try {
      // Look for code blocks that might contain the file content
      const codeBlocks = this.extractCodeBlocks(aiResponse);

      // Try to find a code block that matches the file type
      const fileExt = fileName.split(".").pop().toLowerCase();
      const langMap = {
        html: ["html", "htm"],
        js: ["javascript", "js"],
        ts: ["typescript", "ts"],
        css: ["css"],
        json: ["json"],
        md: ["markdown", "md"],
        py: ["python", "py"],
        java: ["java"],
        cpp: ["cpp", "c++"],
        c: ["c"],
        cs: ["csharp", "c#"],
        php: ["php"],
        rb: ["ruby"],
        go: ["go"],
        rs: ["rust"],
      };

      // Find matching code block
      for (const block of codeBlocks) {
        const blockLang = block.language.toLowerCase();
        if (langMap[fileExt] && langMap[fileExt].includes(blockLang)) {
          return block.code;
        }
      }

      // If no specific match, return the first code block
      if (codeBlocks.length > 0) {
        return codeBlocks[0].code;
      }

      // Generate basic template if no content found
      return this.generateBasicFileTemplate(fileName);
    } catch (error) {
      this.logger.warn(
        `Failed to extract file content for ${fileName}:`,
        error
      );
      return this.generateBasicFileTemplate(fileName);
    }
  }

  /**
   * 📄 Generate basic file template
   */
  generateBasicFileTemplate(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const baseName = fileName.split(".")[0];

    switch (ext) {
      case "html":
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${baseName}</title>
</head>
<body>
    <h1>${baseName}</h1>
    <!-- Content generated by NOX 🦊 -->
</body>
</html>`;
      case "js":
        return `/**
 * ${baseName}
 * Generated by NOX 🦊
 */

console.log('Hello from ${baseName}!');`;
      case "css":
        return `/* ${baseName} styles - Generated by NOX 🦊 */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}`;
      case "md":
        return `# ${baseName}

Generated by NOX 🦊

## Description

Add your content here.`;
      default:
        return `// ${baseName} - Generated by NOX 🦊\n\n// Add your content here`;
    }
  }

  /**
   * 🚀 Execute capability from result
   */
  async executeCapability(capability, context = {}) {
    if (!this.capabilityExecutor) {
      throw new Error("Capability executor not initialized");
    }

    return await this.capabilityExecutor.executeCapability(capability, context);
  }

  /**
   * 📊 Get capability execution statistics
   */
  getCapabilityStats() {
    if (!this.capabilityExecutor) {
      return { error: "Capability executor not initialized" };
    }

    return this.capabilityExecutor.getStats();
  }

  /**
   * 📝 Build user message for chat history
   */
  buildUserMessage(taskType, parameters) {
    switch (taskType) {
      case "explain":
        return `Explain this code: ${parameters.code?.substring(0, 100)}...`;
      case "refactor":
        return `Refactor this code: ${parameters.code?.substring(0, 100)}...`;
      case "analyze":
        return "Analyze the codebase";
      case "chat":
        return parameters.message || "Chat interaction";
      default:
        return `Execute ${taskType} task`;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.logger.info("Cleaning up Agent Controller...");

      const cleanupPromises = [];

      if (this.indexEngine) {
        cleanupPromises.push(this.indexEngine.cleanup());
      }
      if (this.contextManager) {
        cleanupPromises.push(this.contextManager.cleanup());
      }
      if (this.aiClient) {
        cleanupPromises.push(this.aiClient.cleanup());
      }
      if (this.fileOps) {
        cleanupPromises.push(this.fileOps.cleanup());
      }
      if (this.cacheManager) {
        cleanupPromises.push(this.cacheManager.cleanup());
      }
      if (this.capabilityExecutor) {
        cleanupPromises.push(this.capabilityExecutor.cleanup());
      }

      await Promise.all(cleanupPromises);

      this.isInitialized = false;
      this.logger.info("Agent Controller cleanup completed");
    } catch (error) {
      this.logger.error("Error during Agent Controller cleanup:", error);
    }
  }
}

module.exports = AgentController;
