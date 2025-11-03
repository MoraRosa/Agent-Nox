const vscode = require("vscode");

// Import core modules
const Logger = require("./src/utils/logger");
const PerformanceMonitor = require("./src/core/performanceMonitor");
const AgentController = require("./src/core/agentController");
const EnterpriseThemeService = require("./src/core/enterpriseThemeService");

const ExplainCommand = require("./src/commands/explainCommand");
const RefactorCommand = require("./src/commands/refactorCommand");
const AnalyzeCommand = require("./src/commands/analyzeCommand");
const ApiKeyCommand = require("./src/commands/apiKeyCommand");
const AuditLogger = require("./src/enterprise/auditLogger");
const NoxChatViewProvider = require("./src/webview/chatSidebar");

/**
 * 🦊 Nox - AI Coding Fox VS Code Extension
 * Your clever AI companion for enterprise-scale development
 */
class NoxExtension {
  constructor() {
    this.context = null;
    this.logger = null;
    this.performanceMonitor = null;
    this.agentController = null;
    this.auditLogger = null;
    this.chatSidebarProvider = null;
    this.themeService = null;
    this.isActivated = false;
    this.debugMode = false;
  }

  /**
   * Extension activation - called when VS Code starts or extension is activated
   */
  async activate(context) {
    const startTime = Date.now();

    try {
      this.context = context;

      // Initialize core services
      await this.initializeCore();

      // Register commands
      await this.registerCommands();

      // Register sidebar provider
      await this.registerSidebarProvider();

      // Set up event listeners
      this.setupEventListeners();

      // Mark as activated
      this.isActivated = true;
      await vscode.commands.executeCommand("setContext", "nox.activated", true);

      const activationTime = Date.now() - startTime;
      console.log(`🦊 Nox activated in ${activationTime}ms`);
      this.logger.info(
        `🦊 Nox extension activated successfully in ${activationTime}ms`
      );
      this.performanceMonitor.recordMetric("activation_time", activationTime);

      // Show welcome message for first-time users
      await this.showWelcomeMessage();
    } catch (error) {
      this.logger.error("Failed to activate Agent extension:", error);
      vscode.window.showErrorMessage(
        `Agent extension failed to activate: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Initialize core services with error handling
   */
  async initializeCore() {
    try {
      // Initialize logger first
      this.logger = new Logger(this.context);
      this.logger.info("Initializing Nox extension core services...");

      // Initialize performance monitoring
      this.performanceMonitor = new PerformanceMonitor(
        this.context,
        this.logger
      );

      // Initialize audit logging
      this.auditLogger = new AuditLogger(this.context, this.logger);

      // Initialize main agent controller
      this.agentController = new AgentController(
        this.context,
        this.logger,
        this.performanceMonitor
      );

      await this.agentController.initialize();

      // Initialize enterprise theme service
      this.themeService = new EnterpriseThemeService(this.context);
      await this.themeService.initialize();

      // Initialize debug mode from settings
      const config = vscode.workspace.getConfiguration("nox");
      this.debugMode = config.get("debugMode", false);
      if (this.agentController && this.agentController.aiClient) {
        this.agentController.aiClient.setDebugMode(this.debugMode);
      }
      this.logger.info(`🐛 Debug mode initialized: ${this.debugMode}`);

      this.logger.info("Core services initialized successfully");
    } catch (error) {
      console.error("🦊 Core initialization failed:", error);
      if (this.logger) {
        this.logger.error("Failed to initialize core services:", error);
      }
      throw new Error(`Core initialization failed: ${error.message}`);
    }
  }

  /**
   * Register all VS Code commands
   */
  async registerCommands() {
    try {
      const commands = [
        // Chat command (focus sidebar)
        vscode.commands.registerCommand("nox.chat", async () => {
          // Focus the Nox sidebar
          await vscode.commands.executeCommand("workbench.view.extension.nox");
        }),

        // Chat Panel command (focus sidebar chat)
        vscode.commands.registerCommand("nox.openChatPanel", async () => {
          // Focus the Nox sidebar and chat view
          await vscode.commands.executeCommand("workbench.view.extension.nox");
          await vscode.commands.executeCommand("noxChat.focus");
        }),

        // Explain code command
        vscode.commands.registerCommand("nox.explain", async () => {
          const explainCommand = new ExplainCommand(
            this.agentController,
            this.logger
          );
          return await explainCommand.execute();
        }),

        // Refactor code command
        vscode.commands.registerCommand("nox.refactor", async () => {
          const refactorCommand = new RefactorCommand(
            this.agentController,
            this.logger
          );
          return await refactorCommand.execute();
        }),

        // Analyze codebase command
        vscode.commands.registerCommand("nox.analyze", async () => {
          const analyzeCommand = new AnalyzeCommand(
            this.agentController,
            this.logger
          );
          return await analyzeCommand.execute();
        }),

        // Performance dashboard command
        vscode.commands.registerCommand("nox.dashboard", async () => {
          return await this.showDashboard();
        }),

        // Settings command
        vscode.commands.registerCommand("nox.settings", async () => {
          return await this.showSettings();
        }),

        // API Key management command
        vscode.commands.registerCommand("nox.apiKeys", async () => {
          const apiKeyCommand = new ApiKeyCommand(
            this.context,
            this.logger,
            this.agentController.aiClient
          );
          return await apiKeyCommand.execute();
        }),

        // Clear chat command
        vscode.commands.registerCommand("nox.clearChat", async () => {
          if (this.chatSidebarProvider) {
            await this.chatSidebarProvider.clearChatHistory();
          }
        }),

        // Settings panel command
        vscode.commands.registerCommand("nox.openSettingsPanel", async () => {
          await this.openSettingsPanel();
        }),

        // Toggle provider section command
        vscode.commands.registerCommand(
          "nox.toggleProviderSection",
          async () => {
            if (
              this.chatSidebarProvider &&
              this.chatSidebarProvider.webviewView
            ) {
              this.chatSidebarProvider.webviewView.webview.postMessage({
                type: "toggleProviderSection",
              });
              console.log("🦊 Toggle command sent to webview");
            } else {
              console.log("🦊 Toggle command failed - webview not available");
            }
          }
        ),

        // Individual settings commands (for submenu)
        vscode.commands.registerCommand("nox.manageApiKeys", async () => {
          await vscode.commands.executeCommand("nox.apiKeys");
        }),

        vscode.commands.registerCommand("nox.switchProvider", async () => {
          await this.showProviderSwitcher();
        }),

        vscode.commands.registerCommand("nox.showHelp", async () => {
          await this.showHelp();
        }),

        vscode.commands.registerCommand("nox.resetExtension", async () => {
          await this.resetExtension();
        }),

        // Theme commands
        vscode.commands.registerCommand("nox.applyTheme", async (themeId) => {
          await this.applyTheme(themeId);
        }),

        vscode.commands.registerCommand("nox.showThemeSettings", async () => {
          await this.showThemeSettings();
        }),

        vscode.commands.registerCommand(
          "nox.updateTheme",
          async (themeMessage) => {
            await this.updateWebviewTheme(themeMessage);
          }
        ),

        vscode.commands.registerCommand("nox.resetTheme", async () => {
          await this.resetTheme();
        }),
      ];

      // Register all commands with context
      commands.forEach((command) => {
        this.context.subscriptions.push(command);
      });

      this.logger.info(`Registered ${commands.length} commands successfully`);
    } catch (error) {
      this.logger.error("Failed to register commands:", error);
      throw new Error(`Command registration failed: ${error.message}`);
    }
  }

  /**
   * Register sidebar webview provider for chat interface
   */
  async registerSidebarProvider() {
    try {
      // Create and register the chat sidebar provider
      this.chatSidebarProvider = new NoxChatViewProvider(
        this.context,
        this.agentController,
        this.logger,
        this.themeService,
        this.debugMode
      );

      // Register the webview view provider
      const provider = vscode.window.registerWebviewViewProvider(
        "noxChat",
        this.chatSidebarProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      );

      // Add to subscriptions for cleanup
      this.context.subscriptions.push(provider);

      this.logger.info("🦊 Sidebar provider registered successfully");
    } catch (error) {
      this.logger.error("Failed to register sidebar provider:", error);
      throw new Error(`Sidebar provider registration failed: ${error.message}`);
    }
  }

  /**
   * ⚙️ Open settings panel (like Augment)
   */
  async openSettingsPanel() {
    try {
      // Create settings panel
      const panel = vscode.window.createWebviewPanel(
        "noxSettings",
        "🦊 Nox Settings",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this.context.extensionUri],
        }
      );

      // Get current theme and generate CSS variables
      const currentTheme = this.themeService.getCurrentTheme();
      const cssVariables = this.themeService.generateCSSVariables(currentTheme);

      // Set the HTML content with theme injected
      panel.webview.html = this.getSettingsPanelContent(cssVariables);

      // Handle messages from the settings panel
      panel.webview.onDidReceiveMessage(async (message) => {
        try {
          switch (message.type) {
            case "setApiKey":
              try {
                await this.agentController.aiClient.setApiKey(
                  message.provider,
                  message.apiKey
                );

                // Verify the key was saved by trying to retrieve it
                const savedKey = await this.agentController.aiClient.getApiKey(
                  message.provider
                );
                if (savedKey) {
                  panel.webview.postMessage({
                    type: "apiKeySet",
                    provider: message.provider,
                  });
                  this.logger.info(
                    `✅ API key successfully saved for ${message.provider}`
                  );
                } else {
                  throw new Error("API key was not saved properly");
                }
              } catch (error) {
                this.logger.error(
                  `❌ Failed to save API key for ${message.provider}:`,
                  error
                );
                panel.webview.postMessage({
                  type: "error",
                  message: `Failed to save ${message.provider} API key: ${error.message}`,
                  provider: message.provider,
                });
              }
              break;
            case "switchProvider":
              await this.agentController.aiClient.setProvider(message.provider);
              panel.webview.postMessage({
                type: "providerSwitched",
                provider: message.provider,
              });
              break;
            case "getProviderStatus":
              await this.sendProviderStatus(panel.webview);
              break;
            case "openExternal":
              vscode.env.openExternal(vscode.Uri.parse(message.url));
              break;
            case "openKeybindings":
              await vscode.commands.executeCommand(
                "workbench.action.openGlobalKeybindings",
                "nox"
              );
              break;
            case "resetExtension":
              await this.resetExtension();
              break;
            case "getVoiceStatus":
              await this.sendVoiceStatus(panel.webview);
              break;
            case "setVoiceSettings":
              await this.setVoiceSettings(message.settings);
              await this.sendVoiceStatus(panel.webview);
              break;
            case "setGoogleApiKey":
              await this.setGoogleApiKey(message.apiKey);
              await this.sendVoiceStatus(panel.webview);
              break;
            case "setAzureApiKey":
              await this.setAzureApiKey(message.apiKey, message.region);
              await this.sendVoiceStatus(panel.webview);
              break;
            case "setVoiceEngine":
              await this.setVoiceEngine(message.engine);
              await this.sendVoiceStatus(panel.webview);
              break;
            case "setVoiceLanguage":
              await this.setVoiceLanguage(message.language);
              await this.sendVoiceStatus(panel.webview);
              break;
            case "openDashboard":
              // Close settings panel and open dashboard
              panel.dispose();
              await this.showDashboard();
              break;
            case "applyTheme":
              await this.applyTheme(message.themeId);

              // Get updated theme and CSS variables
              const updatedTheme = this.themeService.getCurrentTheme();
              const updatedCSSVariables =
                this.themeService.generateCSSVariables(updatedTheme);

              // Send confirmation with updated theme to settings panel
              panel.webview.postMessage({
                type: "themeApplied",
                themeId: message.themeId,
                theme: updatedTheme,
                cssVariables: updatedCSSVariables,
              });
              break;
            case "resetTheme":
              await this.resetTheme();

              // Get reset theme and CSS variables
              const resetTheme = this.themeService.getCurrentTheme();
              const resetCSSVariables =
                this.themeService.generateCSSVariables(resetTheme);

              // Send confirmation with updated theme to settings panel
              panel.webview.postMessage({
                type: "themeApplied",
                themeId: "classic",
                theme: resetTheme,
                cssVariables: resetCSSVariables,
              });
              break;
            case "getCurrentTheme":
              if (this.themeService) {
                const currentTheme = this.themeService.getCurrentTheme();
                panel.webview.postMessage({
                  type: "currentTheme",
                  themeId: currentTheme?.id || "classic",
                });
              }
              break;
            case "updatePreference":
              try {
                const config = vscode.workspace.getConfiguration("nox");
                await config.update(
                  message.key,
                  message.value,
                  vscode.ConfigurationTarget.Global
                );

                // Update extension state if it's debugMode
                if (message.key === "debugMode") {
                  this.debugMode = message.value;
                  if (this.agentController && this.agentController.aiClient) {
                    this.agentController.aiClient.setDebugMode(message.value);
                  }
                  if (this.chatSidebarProvider) {
                    this.chatSidebarProvider.setDebugMode(message.value);
                  }
                  this.logger.info(
                    `🐛 Debug mode ${message.value ? "enabled" : "disabled"}`
                  );
                }

                panel.webview.postMessage({
                  type: "preferenceUpdated",
                  key: message.key,
                  value: message.value,
                });
              } catch (error) {
                this.logger.error(
                  `Failed to update preference ${message.key}:`,
                  error
                );
                panel.webview.postMessage({
                  type: "error",
                  message: `Failed to update preference: ${error.message}`,
                });
              }
              break;
            case "getPreferences":
              try {
                const config = vscode.workspace.getConfiguration("nox");
                const debugMode = config.get("debugMode", false);
                const logLevel = config.get("logLevel", "info");

                panel.webview.postMessage({
                  type: "preferencesData",
                  debugMode,
                  logLevel,
                });
              } catch (error) {
                this.logger.error("Failed to get preferences:", error);
              }
              break;
            default:
              this.logger.warn(
                `Unknown settings message type: ${message.type}`
              );
          }
        } catch (error) {
          this.logger.error("Error handling settings message:", error);
          panel.webview.postMessage({ type: "error", message: error.message });
        }
      });

      this.logger.info("🦊 Settings panel opened");
    } catch (error) {
      this.logger.error("Error opening settings panel:", error);
      vscode.window.showErrorMessage(
        `Failed to open settings: ${error.message}`
      );
    }
  }

  /**
   * Set up event listeners for workspace changes, file operations, etc.
   */
  setupEventListeners() {
    try {
      // Workspace change events
      const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(
        async (event) => {
          this.logger.info("Workspace folders changed, reinitializing...");
          await this.agentController.handleWorkspaceChange(event);
        }
      );

      // File change events for intelligent indexing
      const fileWatcher = vscode.workspace.onDidSaveTextDocument(
        async (document) => {
          await this.agentController.handleFileChange(document);
        }
      );

      // Configuration change events
      const configWatcher = vscode.workspace.onDidChangeConfiguration(
        async (event) => {
          if (event.affectsConfiguration("agent")) {
            this.logger.info("Agent configuration changed, updating...");
            await this.agentController.updateConfiguration();
          }

          // Handle Nox preferences changes
          if (event.affectsConfiguration("nox.debugMode")) {
            const config = vscode.workspace.getConfiguration("nox");
            this.debugMode = config.get("debugMode", false);
            if (this.agentController && this.agentController.aiClient) {
              this.agentController.aiClient.setDebugMode(this.debugMode);
            }
            if (this.chatSidebarProvider) {
              this.chatSidebarProvider.setDebugMode(this.debugMode);
            }
            this.logger.info(`🐛 Debug mode updated: ${this.debugMode}`);
          }
        }
      );

      // Register watchers for cleanup
      this.context.subscriptions.push(
        workspaceWatcher,
        fileWatcher,
        configWatcher
      );

      this.logger.info("Event listeners set up successfully");
    } catch (error) {
      this.logger.error("Failed to set up event listeners:", error);
    }
  }

  /**
   * 📊 Get dashboard panel HTML content
   */
  getDashboardPanelContent(webview, cssVariables = {}) {
    const nonce = this.getNonce();

    // Generate CSS variable declarations from theme
    const cssVariableDeclarations = Object.entries(cssVariables)
      .map(([key, value]) => `${key}: ${value} !important;`)
      .join("\n                ");

    const dashboardVendorsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview",
        "dashboardVendors.js"
      )
    );
    const dashboardUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview",
        "dashboardPanel.js"
      )
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "src",
        "webview",
        "dashboard-styles.css"
      )
    );

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
          webview.cspSource
        } 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
        <link rel="stylesheet" href="${stylesUri}">
        <style nonce="${nonce}">
          :root {
            ${cssVariableDeclarations}
          }
        </style>
        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <title>📊 Nox Performance Dashboard</title>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="dashboard-header">
                <div class="dashboard-title-section">
                    <button id="backBtn" class="back-btn" title="Back to Settings">←</button>
                    <h1 class="dashboard-title">Performance Dashboard</h1>
                </div>
                <div class="dashboard-controls">
                    <select id="filterSelect" class="filter-select">
                        <option value="lifetime">Lifetime</option>
                        <option value="last7days">Last 7 Days</option>
                        <option value="last30days">Last 30 Days</option>
                        <option value="last90days">Last 90 Days</option>
                        <option value="last365days">Last 365 Days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    <div class="export-dropdown-container">
                        <button id="exportBtn" class="export-btn">📥 Export ▼</button>
                        <div id="exportMenu" class="export-menu" style="display: none;">
                            <button class="export-menu-item" data-format="json">📄 Export JSON</button>
                            <button class="export-menu-item" data-format="csv">📊 Export CSV</button>
                            <button class="export-menu-item" data-format="pdf">📑 Export PDF</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Custom Date Range (hidden by default) -->
            <div id="customDateRange" style="display: none; margin-bottom: 20px; padding: 16px; background: rgba(76, 154, 255, 0.05); border-radius: 8px;">
                <label>Start Date: <input type="date" id="customDateStart"></label>
                <label style="margin-left: 16px;">End Date: <input type="date" id="customDateEnd"></label>
                <button id="applyCustomBtn" class="filter-select" style="margin-left: 16px;">Apply</button>
            </div>

            <!-- Summary Cards -->
            <div id="summaryCards" class="summary-cards">
                <div class="summary-card">
                    <div class="card-label">Loading...</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div id="chartsGrid" class="charts-grid">
                <div class="chart-container">
                    <div class="chart-title">💰 Cost Breakdown by Provider</div>
                    <canvas id="costBreakdownChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">📈 Cost Trends</div>
                    <canvas id="costTrendsChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">📊 Messages per Day</div>
                    <canvas id="messagesPerDayChart"></canvas>
                </div>
            </div>

            <!-- Tables -->
            <div id="tableContainer"></div>

            <!-- Loading State -->
            <div id="loadingState" class="loading" style="display: none;">
                <div class="spinner"></div>
            </div>
        </div>

        <script nonce="${nonce}" src="${dashboardVendorsUri}"></script>
        <script nonce="${nonce}" src="${dashboardUri}"></script>
        <script nonce="${nonce}">
            // Apply theme CSS variables to dashboard
            (function() {
              const themeVariables = ${JSON.stringify(cssVariables)};
              const root = document.documentElement;

              // Apply all CSS variables with !important to override defaults
              Object.entries(themeVariables).forEach(([property, value]) => {
                root.style.setProperty(property, value, 'important');
              });

              console.log('🎨 Dashboard theme applied');
            })();

            // Back button handler - use the vscode API from dashboardPanel
            document.addEventListener('DOMContentLoaded', () => {
                document.getElementById('backBtn')?.addEventListener('click', () => {
                    // Get vscode from window if available, otherwise create it
                    const vscode = window.vscode || acquireVsCodeApi();
                    vscode.postMessage({ type: 'backToSettings' });
                });
            });
        </script>
    </body>
    </html>`;
  }

  /**
   * 📄 Get settings panel HTML content (Scalable from settingsTabs.js)
   */
  getSettingsPanelContent(cssVariables = {}) {
    const nonce = this.getNonce();
    const settingsTabs = require("./src/config/settingsTabs.js");

    // Generate CSS variable declarations from theme
    const cssVariableDeclarations = Object.entries(cssVariables)
      .map(([key, value]) => `${key}: ${value} !important;`)
      .join("\n                ");

    // Generate navigation buttons from settingsTabs.js
    const navButtons = settingsTabs
      .map(
        (tab, index) =>
          `<li><button class="nav-btn${
            index === 0 ? " active" : ""
          }" data-section="${tab.id}">${tab.label}</button></li>`
      )
      .join("\n                    ");

    // Helper function to generate section HTML based on tab ID
    const getSectionHTML = (tabId) => {
      switch (tabId) {
        case "account":
          return `<div id="account" class="section">
                    <h2>👤 Account & Preferences</h2>
                    <div class="provider-grid">
                        <div class="provider-card">
                            <h3>👤 User Profile</h3>
                            <p>Manage your Nox user preferences and profile</p>
                            <input type="text" class="api-key-input" placeholder="Display Name" value="Developer">
                            <button class="btn">Save Profile</button>
                        </div>
                        <div class="provider-card">
                            <h3>🔔 Notifications</h3>
                            <p>Configure notification preferences</p>
                            <label><input type="checkbox" checked> Enable completion notifications</label><br>
                            <label><input type="checkbox" checked> Enable error notifications</label><br>
                            <label><input type="checkbox"> Enable usage analytics</label>
                        </div>
                        <div class="provider-card">
                            <h3>💾 Data & Privacy</h3>
                            <p>Manage your data and privacy settings</p>
                            <button class="btn">Export Chat History</button>
                            <button class="btn">Privacy Settings</button>
                        </div>
                        <div class="provider-card">
                            <h3>🔄 Reset Nox Extension</h3>
                            <p>This will clear all data including chat history, API keys, settings, and cached data.</p>
                            <p><strong>This action cannot be undone!</strong></p>
                            <div style="margin-top: 20px;">
                                <h4>What will be reset:</h4>
                                <ul>
                                    <li>• All chat conversations and history</li>
                                    <li>• Stored API keys (securely deleted)</li>
                                    <li>• Extension settings and preferences</li>
                                    <li>• Cached data and performance metrics</li>
                                    <li>• User profile and account data</li>
                                </ul>
                            </div>
                            <button class="btn" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);" onclick="resetExtension()">
                                🔄 Reset Everything
                            </button>
                        </div>
                    </div>
                </div>`;

        case "about":
          return `<div id="about" class="section">
                    <h2>ℹ️ About Nox</h2>
                    <div class="provider-grid">
                        <div class="provider-card">
                            <h3>🦊 Nox v0.1.0</h3>
                            <p>Your clever AI coding fox</p>
                            <p>Built with ❤️ for enterprise-scale development</p>
                            <button class="btn" onclick="openExternal('https://github.com/hadep275/Agent-Nox')">GitHub Repository</button>
                        </div>
                        <div class="provider-card">
                            <h3>🏢 Enterprise Features</h3>
                            <p>Designed for large-scale codebases (100K+ files)</p>
                            <ul>
                                <li>• Multi-AI provider support</li>
                                <li>• Performance monitoring</li>
                                <li>• Audit trails & logging</li>
                                <li>• ROI tracking</li>
                            </ul>
                        </div>
                        <div class="provider-card">
                            <h3>🎨 Aurora Theme</h3>
                            <p>Beautiful Northern Lights inspired interface</p>
                            <p>Crafted for long coding sessions with eye-friendly gradients</p>
                        </div>
                    </div>
                </div>`;

        case "api-keys":
          return `<div id="api-keys" class="section active">
                    <h2>🔑 API Keys</h2>
                    <p>Configure your AI provider API keys securely.</p>
                    <div class="provider-grid" id="apiKeysGrid">
                        <!-- API key cards will be populated here -->
                    </div>
                </div>`;

        case "voice":
          return `<div id="voice" class="section">
                    <h2>🎤 Voice Input</h2>
                    <p>Configure voice-to-text settings for hands-free coding.</p>

                    <div class="provider-card">
                        <h3>🎤 Voice Input Settings</h3>
                        <div style="margin: 16px 0;">
                            <label style="display: flex; align-items: center; margin-bottom: 12px;">
                                <input type="checkbox" id="voiceEnabled" style="margin-right: 8px;">
                                <span>Enable voice input</span>
                            </label>
                        </div>

                        <div style="margin: 16px 0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Voice Engine:</label>
                            <select id="voiceEngine" style="width: 100%; padding: 8px; border: 1px solid #444; background: #2a2a2a; color: #fff; border-radius: 4px;">
                                <option value="openai">🤖 OpenAI Whisper (Recommended)</option>
                                <option value="google">🌐 Google Speech</option>
                                <option value="azure">☁️ Azure Speech</option>
                                <option value="free" disabled>🆓 Vosk (Advanced Setup Required)</option>
                            </select>
                            <!-- Dynamic note that shows based on selected engine -->
                            <div id="voiceEngineNote" style="margin-top: 8px; padding: 8px; background: #1a1a1a; border-radius: 4px; font-size: 12px; color: #888; display: none;">
                                <!-- Content will be dynamically updated -->
                            </div>
                        </div>

                        <!-- 🌍 Language Selection Section -->
                        <div style="margin: 16px 0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Language:</label>
                            <select id="voiceLanguage" style="width: 100%; padding: 8px; border: 1px solid #444; background: #2a2a2a; color: #fff; border-radius: 4px;">
                                <option value="en-US">🇺🇸 English (US)</option>
                                <option value="en-GB">🇬🇧 English (UK)</option>
                                <option value="es-ES">🇪🇸 Spanish (Spain)</option>
                                <option value="es-MX">🇲🇽 Spanish (Mexico)</option>
                                <option value="fr-FR">🇫🇷 French (France)</option>
                                <option value="de-DE">🇩🇪 German (Germany)</option>
                                <option value="it-IT">🇮🇹 Italian (Italy)</option>
                                <option value="pt-PT">🇵🇹 Portuguese (Portugal)</option>
                                <option value="pt-BR">🇧🇷 Portuguese (Brazil)</option>
                                <option value="ja-JP">🇯🇵 Japanese (Japan)</option>
                                <option value="ko-KR">🇰🇷 Korean (Korea)</option>
                                <option value="zh-CN">🇨🇳 Chinese (Simplified)</option>
                                <option value="zh-TW">🇹🇼 Chinese (Traditional)</option>
                                <option value="hi-IN">🇮🇳 Hindi (India)</option>
                                <option value="ar-SA">🇸🇦 Arabic (Saudi Arabia)</option>
                                <option value="ru-RU">🇷🇺 Russian (Russia)</option>
                                <option value="nl-NL">🇳🇱 Dutch (Netherlands)</option>
                                <option value="sv-SE">🇸🇪 Swedish (Sweden)</option>
                                <option value="no-NO">🇳🇴 Norwegian (Norway)</option>
                                <option value="da-DK">🇩🇰 Danish (Denmark)</option>
                                <option value="pl-PL">🇵🇱 Polish (Poland)</option>
                            </select>
                            <!-- Dynamic language note -->
                            <div id="voiceLanguageNote" style="margin-top: 8px; padding: 8px; background: #1a1a1a; border-radius: 4px; font-size: 12px; color: #888; display: none;">
                                <!-- Content will be dynamically updated based on engine + language -->
                            </div>
                        </div>

                        <div id="googleApiKeySection" style="margin: 16px 0; display: none;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Google Cloud API Key:</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="password" id="googleApiKey" placeholder="Enter Google Cloud API key..."
                                       style="flex: 1; padding: 8px; border: 1px solid #444; background: #2a2a2a; color: #fff; border-radius: 4px;">
                                <button id="saveGoogleApiKey" class="btn">Save</button>
                            </div>
                        </div>

                        <div id="azureApiKeySection" style="margin: 16px 0; display: none;">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Azure Speech API Key:</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="password" id="azureApiKey" placeholder="Enter Azure Speech API key..."
                                       style="flex: 1; padding: 8px; border: 1px solid #444; background: #2a2a2a; color: #fff; border-radius: 4px;">
                                <button id="saveAzureApiKey" class="btn">Save</button>
                            </div>
                            <div style="margin-top: 8px;">
                                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #888;">Azure Region (e.g., eastus, westus2):</label>
                                <input type="text" id="azureRegion" placeholder="eastus"
                                       style="width: 100%; padding: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; border-radius: 4px; font-size: 12px;">
                            </div>
                        </div>

                        <div style="margin: 16px 0;">
                            <h4>Engine Status:</h4>
                            <div id="voiceEngineStatus" style="margin-top: 8px;">
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <span id="openaiStatus" style="margin-right: 8px;">🤖 OpenAI Whisper:</span>
                                    <span id="openaiStatusText" style="color: #f44336;">❌ No OpenAI API key</span>
                                    <span style="margin-left: 8px; font-size: 11px; color: #666;">(Set in API Keys section)</span>
                                </div>
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <span id="googleStatus" style="margin-right: 8px;">🌐 Google Speech:</span>
                                    <span id="googleStatusText" style="color: #f44336;">❌ No Google API key</span>
                                </div>
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <span id="azureStatus" style="margin-right: 8px;">☁️ Azure Speech:</span>
                                    <span id="azureStatusText" style="color: #f44336;">❌ No Azure API key</span>
                                </div>
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <span id="freeStatus" style="margin-right: 8px;">🆓 Vosk (Offline):</span>
                                    <span style="color: #ff9800;">⚠️ Advanced setup required</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

        case "theme":
          return `<div id="theme" class="section">
                    <h2>🎨 Aurora Themes</h2>
                    <p>Choose your perfect Aurora theme for an immersive coding experience.</p>

                    <div class="current-theme-display" style="margin-bottom: 20px; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <h3 style="margin: 0 0 8px 0; color: #64b5f6;">Current Theme: <span id="currentThemeName">🌌 Classic Aurora</span></h3>
                        <div class="theme-preview-bar" id="currentThemePreview" style="height: 4px; border-radius: 2px; background: linear-gradient(135deg, #4c9aff, #8b5cf6, #10b981);"></div>
                    </div>

                    <div class="provider-grid">
                        <!-- Dark Themes -->
                        <div class="provider-card theme-card" data-theme="classic" title="Default blue-purple aurora theme">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #4c9aff, #8b5cf6, #10b981);"></div>
                            <h3>🌌 Classic Aurora</h3>
                            <span class="theme-category">🌙</span>
                        </div>

                        <div class="provider-card theme-card" data-theme="fire" title="Warm orange-red aurora theme">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #ff6b35, #ef4444, #f59e0b);"></div>
                            <h3>🔥 Fire Aurora</h3>
                            <span class="theme-category">🌙</span>
                        </div>

                        <div class="provider-card theme-card" data-theme="forest" title="Green-teal aurora theme">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #10b981, #06b6d4, #059669);"></div>
                            <h3>🌿 Forest Aurora</h3>
                            <span class="theme-category">🌙</span>
                        </div>

                        <div class="provider-card theme-card" data-theme="sakura" title="Pink-purple cherry blossom theme">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #f472b6, #a855f7, #fb7185);"></div>
                            <h3>🌸 Sakura Aurora</h3>
                            <span class="theme-category">🌙</span>
                        </div>

                        <div class="provider-card theme-card" data-theme="midnight" title="Deep focus, minimal distraction">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6, #3b82f6);"></div>
                            <h3>🌙 Midnight Aurora</h3>
                            <span class="theme-category">🌙</span>
                        </div>

                        <!-- Light Theme -->
                        <div class="provider-card theme-card" data-theme="solar" title="Bright, energetic daytime coding">
                            <div class="theme-preview" style="height: 40px; border-radius: 6px; margin-bottom: 12px; background: linear-gradient(135deg, #f59e0b, #d97706, #ea580c);"></div>
                            <h3>☀️ Solar Aurora</h3>
                            <span class="theme-category">☀️</span>
                        </div>
                    </div>

                    <div class="theme-options" style="margin-top: 20px; padding: 16px; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
                        <button class="btn reset-theme-btn" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                            🔄 Reset to Default Theme
                        </button>
                    </div>
                </div>`;

        case "performance":
          return `<div id="performance" class="section">
                    <h2>📊 Performance Dashboard</h2>
                    <p>Monitor your Nox usage and performance metrics.</p>
                    <div class="provider-card">
                        <h3>📈 Usage Statistics</h3>
                        <p>View detailed analytics about your Nox usage, including cost breakdown by provider, token efficiency, and daily trends.</p>
                        <button id="openDashboardBtn" style="margin-top: 16px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                            🚀 Open Dashboard
                        </button>
                    </div>
                </div>`;

        case "preferences":
          return `<div id="preferences" class="section">
                    <h2>⚙️ Preferences</h2>
                    <p>Customize Nox behavior and debugging options.</p>

                    <div class="provider-grid">
                        <div class="provider-card">
                            <h3>🐛 Debug Mode</h3>
                            <p>Enable detailed logging for troubleshooting. Shows per-chunk streaming logs and diagnostic information.</p>
                            <div style="margin: 16px 0;">
                                <label class="debug-toggle-switch">
                                    <input type="checkbox" id="debugModeToggle" class="debug-mode-checkbox">
                                    <div class="toggle-switch"></div>
                                    <span style="cursor: pointer; user-select: none;">Enable Debug Mode</span>
                                </label>
                                <small style="color: #a0a9c0; display: block; margin-top: 12px;">
                                    When enabled, you'll see detailed logs in the VS Code output channel. Useful for troubleshooting issues.
                                </small>
                            </div>
                        </div>

                        <div class="provider-card">
                            <h3>📝 Log Level</h3>
                            <p>Set the minimum log level to display in the output channel.</p>
                            <div style="margin: 16px 0;">
                                <select id="logLevelSelect">
                                    <option value="debug">🐛 Debug - Show all logs</option>
                                    <option value="info" selected>ℹ️ Info - Show info and above</option>
                                    <option value="warn">⚠️ Warn - Show warnings and above</option>
                                    <option value="error">❌ Error - Show errors only</option>
                                </select>
                                <small style="color: #a0a9c0; display: block; margin-top: 8px;">
                                    Higher levels reduce console spam. Debug mode overrides this setting.
                                </small>
                            </div>
                        </div>

                        <div class="provider-card">
                            <h3>💾 Preferences Info</h3>
                            <p>Preferences are stored locally in VS Code settings.</p>
                            <div style="margin: 16px 0; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; border-left: 3px solid #64b5f6;">
                                <small style="color: #a0a9c0;">
                                    <strong>Debug Mode:</strong> nox.debugMode<br>
                                    <strong>Log Level:</strong> nox.logLevel<br><br>
                                    These settings sync across all your VS Code workspaces.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>`;

        case "help":
          return `<div id="help" class="section">
                    <h2>📖 Help & Documentation</h2>
                    <div class="provider-grid">
                        <div class="provider-card">
                            <h3>📚 User Guide</h3>
                            <p>Complete guide to using Nox effectively</p>
                            <button class="btn">Open User Guide</button>
                        </div>
                        <div class="provider-card">
                            <h3>⌨️ Keyboard Shortcuts</h3>
                            <p>List of all Nox commands and shortcuts</p>
                            <button class="btn" onclick="openKeybindings()">View Shortcuts</button>
                        </div>
                        <div class="provider-card">
                            <h3>🌐 Online Documentation</h3>
                            <p>Visit our comprehensive documentation website</p>
                            <button class="btn" onclick="openExternal('https://hadep275.github.io/Agent-Nox/')">Open Docs</button>
                        </div>
                        <div class="provider-card">
                            <h3>🐛 Report Issue</h3>
                            <p>Found a bug or have a feature request?</p>
                            <button class="btn" onclick="openExternal('https://github.com/hadep275/Agent-Nox/issues')">Report Issue</button>
                        </div>
                    </div>
                </div>`;

        default:
          return "";
      }
    };

    // Generate all sections from settingsTabs.js
    const sectionsHTML = settingsTabs
      .map((tab) => getSectionHTML(tab.id))
      .join("\n            ");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>🦊 Nox Settings</title>
        <style>
            :root {
                --bg-primary: #1a1a2e;
                --bg-secondary: #16213e;
                --bg-tertiary: #0f3460;
                --text-primary: #ffffff;
                --text-secondary: #a0a9c0;
                --text-muted: #6b7280;
                --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --gradient-success: linear-gradient(135deg, #10b981, #059669);
                --color-primary: #667eea;
                --color-secondary: #764ba2;
                --color-success: #10b981;
                --color-success-dark: #059669;
                --color-info: #64b5f6;
                --color-accent: #81c784;
                --status-success: #4caf50;
                --status-error: #f44336;
                --status-warning: #ff5722;
                --status-info: #ff9800;
                ${cssVariableDeclarations}
            }

            body {
                font-family: var(--vscode-font-family);
                background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
                color: var(--vscode-foreground);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }

            .settings-container {
                max-width: 1200px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 250px 1fr;
                gap: 30px;
                height: calc(100vh - 40px);
            }

            .settings-sidebar {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .settings-content {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 30px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                overflow-y: auto;
            }

            .settings-nav {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .settings-nav li {
                margin-bottom: 8px;
            }

            .settings-nav button {
                width: 100%;
                background: transparent;
                border: none;
                color: var(--vscode-foreground);
                padding: 12px 16px;
                text-align: left;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 14px;
            }

            .settings-nav button:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .settings-nav button.active {
                background: var(--gradient-primary);
                color: white;
            }

            .section {
                display: none;
            }

            .section.active {
                display: block;
            }

            .section h2 {
                margin-top: 0;
                color: var(--color-info);
                font-size: 24px;
                margin-bottom: 20px;
            }

            .provider-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }

            .provider-card {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }

            .provider-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .provider-card h3 {
                margin-top: 0;
                color: var(--color-accent);
                font-size: 18px;
            }

            /* 🎨 Theme Card Styles */
            .theme-card {
                cursor: pointer;
                border: 4px solid transparent;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            /* Inner shimmer effect for unselected cards on hover */
            .theme-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    135deg,
                    rgba(76, 154, 255, 0.05) 0%,
                    rgba(139, 92, 246, 0.05) 25%,
                    rgba(16, 185, 129, 0.05) 50%,
                    rgba(244, 114, 182, 0.05) 75%,
                    rgba(6, 182, 212, 0.05) 100%
                );
                background-size: 400% 400%;
                animation: aurora-shimmer 6s ease-in-out infinite;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
                z-index: 0;
                border-radius: 12px;
            }

            @keyframes aurora-shimmer {
                0%, 100% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
            }

            .theme-card:hover::before {
                opacity: 1;
            }

            .theme-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
                border-color: rgba(76, 154, 255, 0.3);
            }

            .theme-card.selected {
                border-color: #10b981;
                box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
            }

            .theme-card.selected::before {
                opacity: 1;
                background: linear-gradient(
                    135deg,
                    rgba(16, 185, 129, 0.15) 0%,
                    rgba(16, 185, 129, 0.08) 50%,
                    rgba(16, 185, 129, 0.15) 100%
                );
                animation: aurora-shimmer-selected 4s ease-in-out infinite;
            }

            @keyframes aurora-shimmer-selected {
                0%, 100% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
            }

            .theme-category {
                display: inline-block;
                font-size: 16px;
                margin-top: 8px;
                opacity: 0.8;
                transition: all 0.2s ease;
                position: relative;
                z-index: 1;
            }

            .theme-card:hover .theme-category {
                opacity: 1;
                transform: scale(1.1);
            }

            .input-container {
                position: relative;
                margin-top: 10px;
            }

            .api-key-input {
                width: 100%;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 10px 40px 10px 10px;
                color: var(--vscode-foreground);
                font-family: 'Courier New', monospace;
                font-size: 14px;
                box-sizing: border-box;
            }

            .api-key-input:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
            }

            .toggle-btn {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--vscode-foreground);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                font-size: 16px;
                opacity: 0.7;
                transition: all 0.2s ease;
            }

            .toggle-btn:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }

            /* 🐛 Debug Mode Toggle Switch */
            .debug-toggle-switch {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
            }

            .toggle-switch {
                position: relative;
                width: 50px;
                height: 28px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 14px;
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .toggle-switch::after {
                content: '';
                position: absolute;
                width: 24px;
                height: 24px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: all 0.3s ease;
            }

            input[type="checkbox"].debug-mode-checkbox {
                display: none;
            }

            input[type="checkbox"].debug-mode-checkbox:checked + .toggle-switch {
                background: var(--color-primary);
                border-color: var(--color-primary);
            }

            input[type="checkbox"].debug-mode-checkbox:checked + .toggle-switch::after {
                left: 24px;
                background: white;
            }

            /* 📝 Select Dropdown Styling */
            select {
                width: 100%;
                padding: 10px 12px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.08);
                color: var(--vscode-foreground);
                font-size: 14px;
                font-family: var(--vscode-font-family);
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            select:hover {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(255, 255, 255, 0.3);
            }

            select:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
                background: rgba(255, 255, 255, 0.1);
            }

            select option {
                background: var(--bg-secondary);
                color: var(--vscode-foreground);
                padding: 8px;
            }

            select option:hover {
                background: var(--color-primary);
                color: white;
            }

            select option:checked {
                background: var(--color-primary);
                color: white;
            }

            .status-indicator {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                margin-top: 8px;
            }

            .status-configured {
                background: var(--status-success);
                color: white;
            }

            .status-missing {
                background: var(--status-error);
                color: white;
            }

            .status-error {
                background: var(--status-warning);
                color: white;
            }

            .status-saving {
                background: var(--status-info);
                color: white;
            }

            .btn {
                background: var(--gradient-primary);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
                transition: all 0.2s ease;
            }

            .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .help-text {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 8px;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="settings-container">
            <div class="settings-sidebar">
                <h2>🦊 Nox Settings</h2>
                <ul class="settings-nav">
                    ${navButtons}
                </ul>
            </div>

            <div class="settings-content">
                ${sectionsHTML}
            </div>
        </div>

        <!-- PLACEHOLDER FOR REMOVED SECTIONS - All sections now generated from settingsTabs.js -->
        <!-- Old hardcoded sections removed and replaced with dynamic generation -->
        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();

            // Navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const section = btn.dataset.section;

                    // Update nav
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Update content
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    document.getElementById(section).classList.add('active');
                });
            });

            // Initialize
            window.addEventListener('load', () => {
                vscode.postMessage({ type: 'getProviderStatus' });
                vscode.postMessage({ type: 'getPreferences' });
                populateApiKeys();
                setupPreferencesEventListeners();
            });

            function populateApiKeys() {
                const providers = [
                    { id: 'anthropic', name: '🤖 Anthropic Claude', placeholder: 'sk-ant-api03-...', help: 'Get your key from: https://console.anthropic.com/' },
                    { id: 'openai', name: '🧠 OpenAI GPT-4', placeholder: 'sk-...', help: 'Get your key from: https://platform.openai.com/api-keys' },
                    { id: 'deepseek', name: '🔍 DeepSeek', placeholder: 'sk-...', help: 'Get your key from: https://platform.deepseek.com/' },
                    { id: 'local', name: '🏠 Local LLM', placeholder: 'http://localhost:11434', help: 'No API key needed for local models' }
                ];

                const grid = document.getElementById('apiKeysGrid');

                // Create HTML for each provider
                let html = '';
                providers.forEach(provider => {
                    html += '<div class="provider-card">';
                    html += '<h3>' + provider.name + '</h3>';
                    html += '<div class="input-container">';
                    html += '<input type="password" class="api-key-input"';
                    html += ' placeholder="' + provider.placeholder + '"';
                    html += ' data-provider="' + provider.id + '"';
                    html += ' id="input-' + provider.id + '">';
                    html += '<button class="toggle-btn" data-provider="' + provider.id + '"';
                    html += ' id="toggle-' + provider.id + '" title="Show/Hide API Key">👁️</button>';
                    html += '</div>';
                    html += '<div class="status-indicator status-missing" id="status-' + provider.id + '">Not Configured</div>';
                    html += '<button class="btn" data-provider="' + provider.id + '" id="save-' + provider.id + '" style="margin-left: 10px;">Save Key</button>';
                    html += '<div class="help-text">' + provider.help + '</div>';
                    html += '</div>';
                });

                grid.innerHTML = html;

                // Add event listeners after creating the HTML
                setupEventListeners();

                // Request current API key status from extension
                vscode.postMessage({ type: 'getProviderStatus' });
            }

            function setupEventListeners() {
                // Add event listeners for toggle buttons
                document.querySelectorAll('.toggle-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const provider = this.getAttribute('data-provider');
                        toggleVisibility(provider);
                    });
                });

                // Add event listeners for save buttons
                document.querySelectorAll('.btn[data-provider]').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const provider = this.getAttribute('data-provider');
                        setApiKey(provider);
                    });
                });

                // Add event listeners for input changes to detect when keys are cleared
                document.querySelectorAll('.api-key-input').forEach(input => {
                    input.addEventListener('input', function() {
                        const provider = this.getAttribute('data-provider');
                        const status = document.getElementById('status-' + provider);

                        if (this.value.trim() === '') {
                            // Key was cleared, update status
                            status.textContent = 'Not Configured';
                            status.className = 'status-indicator status-missing';
                        }
                    });
                });
            }

            function toggleVisibility(provider) {
                const input = document.getElementById('input-' + provider);
                const toggleBtn = document.getElementById('toggle-' + provider);

                if (input && toggleBtn) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        toggleBtn.textContent = '🙈';
                        toggleBtn.title = 'Hide API Key';
                    } else {
                        input.type = 'password';
                        toggleBtn.textContent = '👁️';
                        toggleBtn.title = 'Show API Key';
                    }
                }
            }

            function setApiKey(provider) {
                const input = document.getElementById('input-' + provider);
                const saveBtn = document.getElementById('save-' + provider);
                const statusDiv = document.getElementById('status-' + provider);

                if (!input || !saveBtn || !statusDiv) {
                    return;
                }

                const apiKey = input.value.trim();

                // Validate API key format based on provider
                const validation = validateApiKey(provider, apiKey);
                if (!validation.valid) {
                    statusDiv.textContent = validation.message;
                    statusDiv.className = 'status-indicator status-error';
                    setTimeout(() => {
                        statusDiv.textContent = 'Not Configured';
                        statusDiv.className = 'status-indicator status-missing';
                    }, 3000);
                    return;
                }

                // Update UI to show saving state
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;
                statusDiv.textContent = 'Saving...';
                statusDiv.className = 'status-indicator status-saving';

                // Send message to extension
                vscode.postMessage({ type: 'setApiKey', provider, apiKey });
            }

            function validateApiKey(provider, apiKey) {
                if (!apiKey) {
                    return { valid: false, message: 'API key cannot be empty' };
                }

                switch (provider) {
                    case 'anthropic':
                        if (!apiKey.startsWith('sk-ant-')) {
                            return { valid: false, message: 'Anthropic keys start with sk-ant-' };
                        }
                        if (apiKey.length < 50) {
                            return { valid: false, message: 'Anthropic key seems too short' };
                        }
                        break;

                    case 'openai':
                        if (!apiKey.startsWith('sk-')) {
                            return { valid: false, message: 'OpenAI keys start with sk-' };
                        }
                        if (apiKey.length < 40) {
                            return { valid: false, message: 'OpenAI key seems too short' };
                        }
                        break;

                    case 'deepseek':
                        if (!apiKey.startsWith('sk-')) {
                            return { valid: false, message: 'DeepSeek keys start with sk-' };
                        }
                        if (apiKey.length < 30) {
                            return { valid: false, message: 'DeepSeek key seems too short' };
                        }
                        break;

                    case 'local':
                        // For local, accept URLs or leave empty
                        if (apiKey && !apiKey.startsWith('http')) {
                            return { valid: false, message: 'Local endpoint should be a URL (http://...)' };
                        }
                        break;

                    default:
                        if (apiKey.length < 10) {
                            return { valid: false, message: 'API key seems too short' };
                        }
                }

                return { valid: true, message: 'Valid' };
            }

            function openExternal(url) {
                vscode.postMessage({ type: 'openExternal', url });
            }

            function openKeybindings() {
                vscode.postMessage({ type: 'openKeybindings' });
            }

            function resetExtension() {
                if (confirm('⚠️ Are you sure you want to reset Nox Extension?\\n\\nThis will permanently delete:\\n• All chat history\\n• API keys\\n• Settings\\n• Cached data\\n\\nThis cannot be undone!')) {
                    vscode.postMessage({ type: 'resetExtension' });
                }
            }

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.type) {
                    case 'apiKeySet':
                        const status = document.getElementById('status-' + message.provider);
                        const saveBtn = document.getElementById('save-' + message.provider);
                        const input = document.getElementById('input-' + message.provider);

                        if (status && saveBtn && input) {
                            // Show success message temporarily
                            status.textContent = 'Saved Successfully! ✅';
                            status.className = 'status-indicator status-configured';

                            // Reset save button
                            saveBtn.textContent = 'Saved!';
                            saveBtn.disabled = false;

                            // Clear the input for security
                            input.value = '';
                            input.type = 'password';

                            // Reset toggle button
                            const toggleBtn = document.getElementById('toggle-' + message.provider);
                            if (toggleBtn) {
                                toggleBtn.textContent = '👁️';
                                toggleBtn.title = 'Show API Key';
                            }

                            // After 2 seconds, change to "Configured"
                            setTimeout(() => {
                                status.textContent = 'Configured ✅';
                                saveBtn.textContent = 'Save Key';
                            }, 2000);
                        }
                        break;

                    case 'error':
                        // Handle any errors from the extension
                        console.error('Extension error:', message.message);

                        // Update UI for the specific provider that had an error
                        if (message.provider) {
                            const saveBtn = document.getElementById('save-' + message.provider);
                            const status = document.getElementById('status-' + message.provider);

                            if (saveBtn) {
                                saveBtn.textContent = 'Save Key';
                                saveBtn.disabled = false;
                            }

                            if (status) {
                                status.textContent = 'Error: ' + message.message;
                                status.className = 'status-indicator status-error';

                                // Clear error message after 5 seconds
                                setTimeout(() => {
                                    status.textContent = 'Not Configured';
                                    status.className = 'status-indicator status-missing';
                                }, 5000);
                            }
                        } else {
                            // Fallback: try to find which provider had the error
                            const allProviders = ['anthropic', 'openai', 'deepseek', 'local'];
                            allProviders.forEach(provider => {
                                const saveBtn = document.getElementById('save-' + provider);
                                if (saveBtn && saveBtn.disabled) {
                                    saveBtn.textContent = 'Save Key';
                                    saveBtn.disabled = false;
                                }
                            });
                        }
                        break;

                    case 'providerStatus':
                        // Update status indicators based on current API key status
                        if (message.status) {
                            Object.keys(message.status).forEach(provider => {
                                const status = document.getElementById('status-' + provider);
                                if (status) {
                                    if (message.status[provider]) {
                                        status.textContent = 'Configured ✅';
                                        status.className = 'status-indicator status-configured';
                                    } else {
                                        status.textContent = 'Not Configured';
                                        status.className = 'status-indicator status-missing';
                                    }
                                }
                            });
                        }
                        break;

                    case 'voiceStatus':
                        // Update voice settings status
                        if (message.status) {
                            updateVoiceStatus(message.status);
                        }
                        break;
                }
            });

            // Voice Settings Functions
            function initializeVoiceSettings() {
                const voiceEngineSelect = document.getElementById('voiceEngine');
                const googleApiKeySection = document.getElementById('googleApiKeySection');
                const azureApiKeySection = document.getElementById('azureApiKeySection');

                // Show/hide API key sections, dynamic notes, and instant engine switching
                voiceEngineSelect.addEventListener('change', () => {
                    const selectedEngine = voiceEngineSelect.value;
                    const voiceEngineNote = document.getElementById('voiceEngineNote');

                    // Show/hide API key sections
                    googleApiKeySection.style.display = selectedEngine === 'google' ? 'block' : 'none';
                    azureApiKeySection.style.display = selectedEngine === 'azure' ? 'block' : 'none';

                    // Show dynamic note based on selected engine
                    if (selectedEngine === 'openai') {
                        voiceEngineNote.style.display = 'block';
                        voiceEngineNote.innerHTML = '<strong>&#128161; Recommended:</strong> Uses your existing OpenAI API key. Most accurate and cost-effective (~$0.006/minute).';
                        voiceEngineNote.style.color = '#4CAF50';
                    } else if (selectedEngine === 'google') {
                        voiceEngineNote.style.display = 'block';
                        voiceEngineNote.innerHTML = '<strong>&#128161; Enterprise Option:</strong> Requires separate Google Cloud API key. Enterprise-grade accuracy and reliability.';
                        voiceEngineNote.style.color = '#888';
                    } else if (selectedEngine === 'azure') {
                        voiceEngineNote.style.display = 'block';
                        voiceEngineNote.innerHTML = '<strong>&#128161; Microsoft Integration:</strong> Requires Azure subscription. Great for Microsoft-integrated workflows.';
                        voiceEngineNote.style.color = '#888';
                    } else if (selectedEngine === 'free') {
                        voiceEngineNote.style.display = 'block';
                        voiceEngineNote.innerHTML = '<strong>&#9888; Advanced Setup:</strong> 100% offline but requires development tools installation. <a href="#" onclick="showAdvancedGuide()" style="color: #4CAF50;">View Setup Guide</a>';
                        voiceEngineNote.style.color = '#f44336';
                    }

                    // Instant voice engine switching (like chat provider switching)
                    vscode.postMessage({
                        type: 'setVoiceEngine',
                        engine: selectedEngine
                    });
                });

                // 🌍 Handle language selection change (instant switching)
                const voiceLanguageSelect = document.getElementById('voiceLanguage');
                voiceLanguageSelect.addEventListener('change', () => {
                    const selectedLanguage = voiceLanguageSelect.value;
                    const selectedEngine = voiceEngineSelect.value;
                    const voiceLanguageNote = document.getElementById('voiceLanguageNote');

                    // Show dynamic language note based on engine + language
                    updateLanguageNote(selectedEngine, selectedLanguage, voiceLanguageNote);

                    // Instant language switching (like provider switching)
                    vscode.postMessage({
                        type: 'setVoiceLanguage',
                        language: selectedLanguage
                    });
                });

                // Function to update language-specific notes
                function updateLanguageNote(engine, language, noteElement) {
                    const languageNames = {
                        'en-US': 'English (US)', 'en-GB': 'English (UK)',
                        'es-ES': 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico)',
                        'fr-FR': 'French (France)', 'de-DE': 'German (Germany)',
                        'it-IT': 'Italian (Italy)', 'pt-PT': 'Portuguese (Portugal)',
                        'pt-BR': 'Portuguese (Brazil)', 'ja-JP': 'Japanese (Japan)',
                        'ko-KR': 'Korean (Korea)', 'zh-CN': 'Chinese (Simplified)',
                        'zh-TW': 'Chinese (Traditional)', 'hi-IN': 'Hindi (India)',
                        'ar-SA': 'Arabic (Saudi Arabia)', 'ru-RU': 'Russian (Russia)',
                        'nl-NL': 'Dutch (Netherlands)', 'sv-SE': 'Swedish (Sweden)',
                        'no-NO': 'Norwegian (Norway)', 'da-DK': 'Danish (Denmark)',
                        'pl-PL': 'Polish (Poland)'
                    };

                    const langName = languageNames[language] || language;

                    if (engine === 'openai') {
                        noteElement.innerHTML = '<strong>&#128161; Auto-Detection:</strong> Whisper supports ' + langName + ' with 99% accuracy. Can auto-detect or use specified language for optimal results.';
                        noteElement.style.color = '#4CAF50';
                    } else if (engine === 'google') {
                        noteElement.innerHTML = '<strong>&#128161; Regional Optimization:</strong> Google Speech optimized for ' + langName + ' with regional accent recognition and cultural context.';
                        noteElement.style.color = '#888';
                    } else if (engine === 'azure') {
                        noteElement.innerHTML = '<strong>&#128161; Neural Processing:</strong> Azure Speech provides high-quality ' + langName + ' recognition with advanced neural voice processing.';
                        noteElement.style.color = '#888';
                    } else {
                        noteElement.innerHTML = '<strong>&#128161; Language Support:</strong> ' + langName + ' support varies by engine. Switch to OpenAI, Google, or Azure for best results.';
                        noteElement.style.color = '#888';
                    }

                    noteElement.style.display = 'block';
                }

                // Handle voice enabled checkbox change
                document.getElementById('voiceEnabled').addEventListener('change', () => {
                    const enabled = document.getElementById('voiceEnabled').checked;
                    vscode.postMessage({
                        type: 'setVoiceSettings',
                        settings: { enabled }
                    });
                });

                // Save Google API key
                document.getElementById('saveGoogleApiKey').addEventListener('click', () => {
                    const googleApiKey = document.getElementById('googleApiKey').value;
                    if (googleApiKey.trim()) {
                        vscode.postMessage({
                            type: 'setGoogleApiKey',
                            apiKey: googleApiKey.trim()
                        });
                        document.getElementById('googleApiKey').value = '';
                    }
                });

                // Save Azure API key
                document.getElementById('saveAzureApiKey').addEventListener('click', () => {
                    const azureApiKey = document.getElementById('azureApiKey').value;
                    const azureRegion = document.getElementById('azureRegion').value;
                    if (azureApiKey.trim() && azureRegion.trim()) {
                        vscode.postMessage({
                            type: 'setAzureApiKey',
                            apiKey: azureApiKey.trim(),
                            region: azureRegion.trim()
                        });
                        document.getElementById('azureApiKey').value = '';
                        document.getElementById('azureRegion').value = '';
                    }
                });

                // Request current voice status
                vscode.postMessage({ type: 'getVoiceStatus' });
            }

            function updateVoiceStatus(status) {
                // Update checkboxes and selects
                document.getElementById('voiceEnabled').checked = status.enabled;
                document.getElementById('voiceEngine').value = status.engine;

                // 🌍 Update language dropdown
                if (status.language) {
                    document.getElementById('voiceLanguage').value = status.language;
                }

                // Show/hide API key sections and dynamic notes
                const googleApiKeySection = document.getElementById('googleApiKeySection');
                const azureApiKeySection = document.getElementById('azureApiKeySection');
                const voiceEngineNote = document.getElementById('voiceEngineNote');

                googleApiKeySection.style.display = status.engine === 'google' ? 'block' : 'none';
                azureApiKeySection.style.display = status.engine === 'azure' ? 'block' : 'none';

                // Show dynamic note based on current engine
                if (status.engine === 'openai') {
                    voiceEngineNote.style.display = 'block';
                    if (status.engines.openai) {
                        voiceEngineNote.innerHTML = '<strong>&#9989; OpenAI Whisper is configured and ready to use.</strong>';
                        voiceEngineNote.style.color = '#4CAF50';
                    } else {
                        voiceEngineNote.innerHTML = '<strong>&#128161; Recommended:</strong> Uses your existing OpenAI API key. Most accurate and cost-effective (~$0.006/minute).';
                        voiceEngineNote.style.color = '#888';
                    }
                } else if (status.engine === 'google') {
                    voiceEngineNote.style.display = 'block';
                    if (status.engines.google) {
                        voiceEngineNote.innerHTML = '<strong>&#9989; Google Speech is configured and ready to use.</strong>';
                        voiceEngineNote.style.color = '#4CAF50';
                    } else {
                        voiceEngineNote.innerHTML = '<strong>&#128161; Enterprise Option:</strong> Requires separate Google Cloud API key. Enterprise-grade accuracy and reliability.';
                        voiceEngineNote.style.color = '#888';
                    }
                } else if (status.engine === 'azure') {
                    voiceEngineNote.style.display = 'block';
                    if (status.engines.azure) {
                        voiceEngineNote.innerHTML = '<strong>&#9989; Azure Speech is configured and ready to use.</strong>';
                        voiceEngineNote.style.color = '#4CAF50';
                    } else {
                        voiceEngineNote.innerHTML = '<strong>&#128161; Microsoft Integration:</strong> Requires Azure subscription. Great for Microsoft-integrated workflows.';
                        voiceEngineNote.style.color = '#888';
                    }
                } else if (status.engine === 'free') {
                    voiceEngineNote.style.display = 'block';
                    voiceEngineNote.innerHTML = '<strong>&#9888; Advanced Setup:</strong> 100% offline but requires development tools installation. <a href="#" onclick="showAdvancedGuide()" style="color: #4CAF50;">View Setup Guide</a>';
                    voiceEngineNote.style.color = '#f44336';
                }

                // Update engine status indicators
                const openaiStatusText = document.getElementById('openaiStatusText');
                const googleStatusText = document.getElementById('googleStatusText');
                const azureStatusText = document.getElementById('azureStatusText');

                if (status.engines.openai) {
                    openaiStatusText.textContent = '✅ Available (using OpenAI key)';
                    openaiStatusText.style.color = '#4CAF50';
                } else {
                    openaiStatusText.textContent = '❌ No OpenAI API key';
                    openaiStatusText.style.color = '#f44336';
                }

                if (status.engines.google) {
                    googleStatusText.textContent = '✅ Available';
                    googleStatusText.style.color = '#4CAF50';
                } else {
                    googleStatusText.textContent = '❌ No Google API key';
                    googleStatusText.style.color = '#f44336';
                }

                if (status.engines.azure) {
                    azureStatusText.textContent = '✅ Available';
                    azureStatusText.style.color = '#4CAF50';
                } else {
                    azureStatusText.textContent = '❌ No Azure API key';
                    azureStatusText.style.color = '#f44336';
                }
            }

            // Initialize voice settings when page loads
            window.addEventListener('load', () => {
                initializeVoiceSettings();
            });

            // Dashboard button handler
            document.getElementById('openDashboardBtn')?.addEventListener('click', () => {
                vscode.postMessage({ type: 'openDashboard' });
            });

            // Theme functions
            function applyThemeFromSettings(themeId) {
                console.log('🎨 Applying theme:', themeId);
                console.log('🎨 Sending message to extension...');
                vscode.postMessage({
                    type: 'applyTheme',
                    themeId: themeId
                });

                // Update UI immediately for better UX
                updateThemeButtons(themeId);
                console.log('🎨 UI updated for theme:', themeId);
            }

            function resetThemeFromSettings() {
                console.log('🎨 Resetting theme to default');
                vscode.postMessage({ type: 'resetTheme' });

                // Update UI to show classic theme
                updateThemeButtons('classic');
            }

            // Setup theme card event listeners
            function setupThemeEventListeners() {
                // Theme cards - click anywhere on card to select
                document.querySelectorAll('.theme-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        const themeId = card.getAttribute('data-theme');
                        if (themeId) {
                            applyThemeFromSettings(themeId);
                        }
                    });
                });

                // Reset theme button
                const resetBtn = document.querySelector('.reset-theme-btn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        resetThemeFromSettings();
                    });
                }
            }

            function updateThemeButtons(activeThemeId) {
                // Update all theme cards - remove selected class from all, add to active
                document.querySelectorAll('.theme-card').forEach(card => {
                    const themeId = card.getAttribute('data-theme');
                    if (themeId === activeThemeId) {
                        card.classList.add('selected');
                    } else {
                        card.classList.remove('selected');
                    }
                });

                // Update current theme display
                const themeNames = {
                    'classic': '🌌 Classic Aurora',
                    'fire': '🔥 Fire Aurora',
                    'forest': '🌿 Forest Aurora',
                    'sakura': '🌸 Sakura Aurora',
                    'midnight': '🌙 Midnight Aurora',
                    'solar': '☀️ Solar Aurora'
                };

                const themeGradients = {
                    'classic': 'linear-gradient(135deg, #4c9aff, #8b5cf6, #10b981)',
                    'fire': 'linear-gradient(135deg, #ff6b35, #ef4444, #f59e0b)',
                    'forest': 'linear-gradient(135deg, #10b981, #06b6d4, #059669)',
                    'sakura': 'linear-gradient(135deg, #f472b6, #a855f7, #fb7185)',
                    'midnight': 'linear-gradient(135deg, #6366f1, #8b5cf6, #3b82f6)',
                    'solar': 'linear-gradient(135deg, #f59e0b, #d97706, #ea580c)'
                };

                const currentThemeNameEl = document.getElementById('currentThemeName');
                const currentThemePreviewEl = document.getElementById('currentThemePreview');

                if (currentThemeNameEl && themeNames[activeThemeId]) {
                    currentThemeNameEl.textContent = themeNames[activeThemeId];
                }

                if (currentThemePreviewEl && themeGradients[activeThemeId]) {
                    currentThemePreviewEl.style.background = themeGradients[activeThemeId];
                }
            }

            // Setup preferences event listeners
            function setupPreferencesEventListeners() {
                const debugModeToggle = document.getElementById('debugModeToggle');
                const logLevelSelect = document.getElementById('logLevelSelect');

                if (debugModeToggle) {
                    debugModeToggle.addEventListener('change', (e) => {
                        vscode.postMessage({
                            type: 'updatePreference',
                            key: 'debugMode',
                            value: e.target.checked
                        });
                    });
                }

                if (logLevelSelect) {
                    logLevelSelect.addEventListener('change', (e) => {
                        vscode.postMessage({
                            type: 'updatePreference',
                            key: 'logLevel',
                            value: e.target.value
                        });
                    });
                }
            }

            // Initialize theme UI when page loads
            window.addEventListener('load', () => {
                // Setup event listeners for theme buttons
                setupThemeEventListeners();

                // Request current theme from extension
                vscode.postMessage({ type: 'getCurrentTheme' });
            });

            // Apply CSS variables to root element
            function applyCSSVariables(cssVariables) {
                const root = document.documentElement;
                Object.entries(cssVariables).forEach(([key, value]) => {
                    root.style.setProperty(key, value, 'important');
                });
                console.log('🎨 CSS variables applied to settings panel');
            }

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                if (message.type === 'currentTheme') {
                    updateThemeButtons(message.themeId);
                } else if (message.type === 'themeApplied') {
                    updateThemeButtons(message.themeId);

                    // Apply CSS variables if provided
                    if (message.cssVariables) {
                        applyCSSVariables(message.cssVariables);
                        console.log('🎨 Theme updated in settings panel:', message.themeId);
                    }
                } else if (message.type === 'injectCSS') {
                    // ✅ SECURITY FIX: Apply CSS variables directly instead of eval()
                    try {
                        if (message.theme?.variables) {
                            applyCSSVariables(message.theme.variables);

                            // Trigger Aurora animation refresh
                            const auroraElements = document.querySelectorAll('.aurora-bg, .progress-fill');
                            auroraElements.forEach(el => {
                                el.style.animation = 'none';
                                el.offsetHeight; // Trigger reflow
                                el.style.animation = null;
                            });

                            console.log('🎨 CSS injection successful for theme:', message.theme.name);
                        }
                    } catch (error) {
                        console.error('🎨 CSS injection failed:', error);
                    }
                } else if (message.type === 'preferencesData') {
                    // Update preferences UI with data from extension
                    const debugModeToggle = document.getElementById('debugModeToggle');
                    const logLevelSelect = document.getElementById('logLevelSelect');

                    if (debugModeToggle) {
                        debugModeToggle.checked = message.debugMode;
                    }
                    if (logLevelSelect) {
                        logLevelSelect.value = message.logLevel;
                    }
                } else if (message.type === 'preferenceUpdated') {
                    // Preference was successfully updated
                    console.log('✅ Preference updated:', message.key, '=', message.value);
                }
            });
        </script>
    </body>
    </html>`;
  }

  /**
   * 📊 Send provider status to settings panel
   */
  async sendProviderStatus(webview) {
    try {
      const providers = ["anthropic", "openai", "deepseek", "local"];
      const status = {};

      for (const provider of providers) {
        status[provider] = await this.agentController.aiClient.hasValidApiKey(
          provider
        );
      }

      webview.postMessage({ type: "providerStatus", status });
    } catch (error) {
      this.logger.error("Error sending provider status:", error);
    }
  }

  /**
   * 🎤 Send voice status to settings panel
   */
  async sendVoiceStatus(webview) {
    try {
      // Get voice settings from workspace state (engine preference, enabled state, and language)
      const voiceSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {
          enabled: true,
          engine: "openai", // Default to OpenAI (recommended)
          language: "en-US", // 🌍 Default to English (US)
        }
      );

      // Check engine availability from secure storage
      const engines = {
        openai: await this.agentController.aiClient.hasValidApiKey("openai"),
        google: !!(await this.context.secrets.get("nox.google.voice.apiKey")),
        azure: !!(await this.context.secrets.get("nox.azure.voice.apiKey")),
        free: false, // Vosk requires advanced setup
      };

      const status = {
        enabled: voiceSettings.enabled,
        engine: voiceSettings.engine,
        language: voiceSettings.language, // 🌍 Include current language
        engines: engines,
      };

      webview.postMessage({ type: "voiceStatus", status });
    } catch (error) {
      this.logger.error("Error sending voice status:", error);
    }
  }

  /**
   * 🎤 Set voice settings
   */
  async setVoiceSettings(settings) {
    try {
      // Get current settings (only enabled state and engine preference)
      const currentSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {
          enabled: true,
          engine: "openai",
        }
      );

      // Update with new settings
      const updatedSettings = { ...currentSettings, ...settings };

      // Save to workspace state
      await this.context.workspaceState.update(
        "nox.voiceSettings",
        updatedSettings
      );

      // Update voice recording service if it exists
      if (
        this.chatSidebarProvider &&
        this.chatSidebarProvider.voiceRecordingService
      ) {
        await this.chatSidebarProvider.voiceRecordingService.updateVoiceSettings(
          updatedSettings
        );
      }

      this.logger.info("🎤 Voice settings updated:", updatedSettings);
    } catch (error) {
      this.logger.error("Error setting voice settings:", error);
      throw error;
    }
  }

  /**
   * 🎤 Set Google API key for voice
   */
  async setGoogleApiKey(apiKey) {
    try {
      // Migrate existing key from workspace state if it exists
      const oldSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {}
      );
      if (oldSettings.googleApiKey && !apiKey) {
        // Migration: move old key to secure storage
        apiKey = oldSettings.googleApiKey;
        delete oldSettings.googleApiKey;
        await this.context.workspaceState.update(
          "nox.voiceSettings",
          oldSettings
        );
        this.logger.info("🔄 Migrated Google API key to secure storage");
      }

      // Store in VS Code secrets (secure)
      await this.context.secrets.store("nox.google.voice.apiKey", apiKey);

      // Update voice recording service immediately
      if (
        this.chatSidebarProvider &&
        this.chatSidebarProvider.voiceRecordingService
      ) {
        await this.chatSidebarProvider.voiceRecordingService.initializeVoiceEngines();
      }

      this.logger.info("🔑 Google Voice API key stored securely");
    } catch (error) {
      this.logger.error("Failed to store Google Voice API key:", error);
      throw error;
    }
  }

  /**
   * 🎤 Set Azure API key for voice
   */
  async setAzureApiKey(apiKey, region) {
    try {
      // Migrate existing keys from workspace state if they exist
      const oldSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {}
      );
      if (oldSettings.azureApiKey && !apiKey) {
        // Migration: move old keys to secure storage
        apiKey = oldSettings.azureApiKey;
        region = oldSettings.azureRegion || region;
        delete oldSettings.azureApiKey;
        delete oldSettings.azureRegion;
        await this.context.workspaceState.update(
          "nox.voiceSettings",
          oldSettings
        );
        this.logger.info("🔄 Migrated Azure API key to secure storage");
      }

      // Store in VS Code secrets (secure)
      await this.context.secrets.store("nox.azure.voice.apiKey", apiKey);
      await this.context.secrets.store("nox.azure.voice.region", region);

      // Update voice recording service immediately
      if (
        this.chatSidebarProvider &&
        this.chatSidebarProvider.voiceRecordingService
      ) {
        await this.chatSidebarProvider.voiceRecordingService.initializeVoiceEngines();
      }

      this.logger.info("🔑 Azure Voice API key stored securely");
    } catch (error) {
      this.logger.error("Failed to store Azure Voice API key:", error);
      throw error;
    }
  }

  /**
   * 🎤 Set voice engine for instant switching
   */
  async setVoiceEngine(engine) {
    try {
      // Get current settings (only enabled state and engine preference)
      const currentSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {
          enabled: true,
          engine: "openai",
        }
      );

      // Update selected engine
      currentSettings.engine = engine;

      // Save to workspace state (only engine preference)
      await this.context.workspaceState.update(
        "nox.voiceSettings",
        currentSettings
      );

      // Update voice recording service immediately
      if (
        this.chatSidebarProvider &&
        this.chatSidebarProvider.voiceRecordingService
      ) {
        await this.chatSidebarProvider.voiceRecordingService.updateVoiceSettings(
          currentSettings
        );
      }

      this.logger.info(`🎤 Voice engine switched to: ${engine}`);
    } catch (error) {
      this.logger.error("Failed to set voice engine:", error);
      throw error;
    }
  }

  /**
   * 🌍 Set voice language for instant switching
   */
  async setVoiceLanguage(language) {
    try {
      // Get current settings (enabled state, engine preference, and language)
      const currentSettings = this.context.workspaceState.get(
        "nox.voiceSettings",
        {
          enabled: true,
          engine: "openai",
          language: "en-US",
        }
      );

      // Update selected language
      currentSettings.language = language;

      // Save to workspace state (language preference)
      await this.context.workspaceState.update(
        "nox.voiceSettings",
        currentSettings
      );

      // Update voice recording service immediately
      if (
        this.chatSidebarProvider &&
        this.chatSidebarProvider.voiceRecordingService
      ) {
        await this.chatSidebarProvider.voiceRecordingService.updateVoiceSettings(
          currentSettings
        );
        // Re-initialize engines with new language
        await this.chatSidebarProvider.voiceRecordingService.initializeVoiceEngines();
      }

      this.logger.info(`🌍 Voice language switched to: ${language}`);
    } catch (error) {
      this.logger.error("Failed to set voice language:", error);
      throw error;
    }
  }

  /**
   * 🔐 Generate nonce for CSP
   */
  getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 🤖 Show provider switcher
   */
  async showProviderSwitcher() {
    try {
      const currentProvider =
        this.agentController.aiClient.getCurrentProvider();
      const configuredProviders =
        await this.agentController.aiClient.getConfiguredProviders();

      if (configuredProviders.length === 0) {
        vscode.window
          .showWarningMessage(
            "🔑 No API keys configured. Please set up API keys first!",
            "Set API Keys"
          )
          .then((selection) => {
            if (selection === "Set API Keys") {
              vscode.commands.executeCommand("nox.apiKeys");
            }
          });
        return;
      }

      const providerOptions = configuredProviders.map((provider) => ({
        label: `${provider.name} ${
          provider.id === currentProvider ? "(Current)" : ""
        }`,
        description: `Models: ${provider.models?.join(", ") || "Available"}`,
        id: provider.id,
        isCurrent: provider.id === currentProvider,
      }));

      const selectedProvider = await vscode.window.showQuickPick(
        providerOptions,
        {
          placeHolder: `🔄 Switch from ${currentProvider} to...`,
          matchOnDescription: true,
        }
      );

      if (selectedProvider && !selectedProvider.isCurrent) {
        await this.agentController.aiClient.setProvider(selectedProvider.id);
        vscode.window.showInformationMessage(
          `🤖 Switched to ${selectedProvider.label.replace(" (Current)", "")}`
        );
      }
    } catch (error) {
      this.logger.error("Error in provider switcher:", error);
      vscode.window.showErrorMessage(
        `Failed to switch provider: ${error.message}`
      );
    }
  }

  /**
   * 🎨 Show theme settings (Enterprise)
   */
  async showThemeSettings() {
    try {
      if (!this.themeService) {
        vscode.window.showErrorMessage("🎨 Theme service not available");
        return;
      }

      const availableThemes = this.themeService.getAvailableThemes();
      const currentTheme = this.themeService.getCurrentTheme();

      const themeOptions = availableThemes.map((theme) => ({
        label: theme.name,
        description: theme.description,
        detail: theme.category === "light" ? "☀️ Light Mode" : "🌙 Dark Mode",
        theme: theme.id,
        picked: currentTheme?.id === theme.id,
      }));

      const selectedTheme = await vscode.window.showQuickPick(themeOptions, {
        placeHolder: "🎨 Choose your Aurora theme",
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (selectedTheme) {
        await this.applyTheme(selectedTheme.theme);
      }
    } catch (error) {
      this.logger.error("Failed to show theme settings:", error);
      vscode.window.showErrorMessage(
        `🎨 Failed to show theme settings: ${error.message}`
      );
    }
  }

  /**
   * 🎨 Apply theme (Enterprise)
   */
  async applyTheme(themeId) {
    try {
      if (!this.themeService) {
        throw new Error("Theme service not available");
      }

      const result = await this.themeService.applyTheme(themeId);

      if (result.success) {
        vscode.window.showInformationMessage(
          `🎨 Applied theme: ${result.theme.name}`
        );
        this.logger.info(
          `Theme applied: ${result.theme.name} (${result.applyTime}ms)`
        );

        // CRITICAL FIX: Immediately apply theme to chat sidebar webview
        // This ensures the webview is updated with the new theme right away
        if (this.chatSidebarProvider) {
          await this.chatSidebarProvider.applyCurrentTheme();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Failed to apply theme ${themeId}:`, error);
      vscode.window.showErrorMessage(
        `🎨 Failed to apply theme: ${error.message}`
      );
    }
  }

  /**
   * 🔄 Update webview theme
   */
  async updateWebviewTheme(themeMessage) {
    try {
      // Update chat sidebar
      if (this.chatSidebarProvider && this.chatSidebarProvider.webviewView) {
        this.chatSidebarProvider.webviewView.webview.postMessage(themeMessage);
      }

      // Update any other webviews that need theme updates
      this.logger.info(
        `Theme update sent to webviews: ${themeMessage.theme.name}`
      );
    } catch (error) {
      this.logger.error("Failed to update webview theme:", error);
    }
  }

  /**
   * 🔄 Reset theme to default
   */
  async resetTheme() {
    try {
      if (!this.themeService) {
        throw new Error("Theme service not available");
      }

      const success = await this.themeService.resetToDefault();

      if (success) {
        vscode.window.showInformationMessage(
          "🎨 Theme reset to default (Classic Aurora)"
        );
        this.logger.info("Theme reset to default");
      } else {
        throw new Error("Failed to reset theme");
      }
    } catch (error) {
      this.logger.error("Failed to reset theme:", error);
      vscode.window.showErrorMessage(
        `🎨 Failed to reset theme: ${error.message}`
      );
    }
  }

  /**
   * 🔍 Show debug logs
   */
  async showDebugLogs() {
    const logOptions = [
      {
        label: "📋 View Current Logs",
        description: "Show recent extension logs",
        action: "view",
      },
      {
        label: "📁 Open Log File",
        description: "Open log file in editor",
        action: "open",
      },
      {
        label: "🗑️ Clear Logs",
        description: "Clear all log history",
        action: "clear",
      },
      {
        label: "📊 Performance Metrics",
        description: "View performance data",
        action: "metrics",
      },
    ];

    const selectedOption = await vscode.window.showQuickPick(logOptions, {
      placeHolder: "🔍 Debug & Logs Options",
    });

    if (selectedOption) {
      switch (selectedOption.action) {
        case "view":
          // TODO: Show logs in output channel
          vscode.window.showInformationMessage("📋 Log viewing coming soon!");
          break;
        case "open":
          // TODO: Open log file
          vscode.window.showInformationMessage(
            "📁 Log file opening coming soon!"
          );
          break;
        case "clear":
          // TODO: Clear logs
          vscode.window.showInformationMessage("🗑️ Log clearing coming soon!");
          break;
        case "metrics":
          await vscode.commands.executeCommand("nox.dashboard");
          break;
      }
    }
  }

  /**
   * 📖 Show help and documentation
   */
  async showHelp() {
    const helpOptions = [
      {
        label: "📖 User Guide",
        description: "Complete guide to using Nox",
        action: "guide",
      },
      {
        label: "⌨️ Keyboard Shortcuts",
        description: "List of all Nox commands and shortcuts",
        action: "shortcuts",
      },
      {
        label: "🌐 Online Documentation",
        description: "Open documentation website",
        action: "website",
      },
      {
        label: "🐛 Report Issue",
        description: "Report a bug or request feature",
        action: "issue",
      },
      {
        label: "ℹ️ About Nox",
        description: "Version info and credits",
        action: "about",
      },
    ];

    const selectedOption = await vscode.window.showQuickPick(helpOptions, {
      placeHolder: "📖 Help & Documentation",
    });

    if (selectedOption) {
      switch (selectedOption.action) {
        case "guide":
          vscode.window.showInformationMessage("📖 User guide coming soon!");
          break;
        case "shortcuts":
          await vscode.commands.executeCommand(
            "workbench.action.openGlobalKeybindings",
            "nox"
          );
          break;
        case "website":
          vscode.env.openExternal(
            vscode.Uri.parse("https://hadep275.github.io/Agent-Nox/")
          );
          break;
        case "issue":
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/hadep275/Agent-Nox/issues")
          );
          break;
        case "about":
          vscode.window.showInformationMessage(
            "🦊 Nox v0.1.0 - Your clever AI coding fox\n\nBuilt with ❤️ for enterprise-scale development"
          );
          break;
      }
    }
  }

  /**
   * 🔄 Reset extension
   */
  async resetExtension() {
    const confirmation = await vscode.window.showWarningMessage(
      "🔄 Reset Nox Extension?\n\nThis will clear all data including:\n• Chat history\n• API keys\n• Settings\n• Cached data\n\nThis cannot be undone!",
      { modal: true },
      "Reset Everything",
      "Cancel"
    );

    if (confirmation === "Reset Everything") {
      try {
        // Clear workspace state
        const keys = this.context.workspaceState.keys();
        for (const key of keys) {
          if (key.startsWith("nox.")) {
            await this.context.workspaceState.update(key, undefined);
          }
        }

        // Clear global state
        const globalKeys = this.context.globalState.keys();
        for (const key of globalKeys) {
          if (key.startsWith("nox.")) {
            await this.context.globalState.update(key, undefined);
          }
        }

        // Clear secrets (API keys)
        const providers = ["anthropic", "openai", "deepseek", "local"];
        for (const provider of providers) {
          try {
            await this.context.secrets.delete(`nox.${provider}.apiKey`);
          } catch (error) {
            // Ignore if key doesn't exist
          }
        }

        vscode.window
          .showInformationMessage(
            "🔄 Nox has been reset! Please reload VS Code to complete the reset.",
            "Reload Now"
          )
          .then((selection) => {
            if (selection === "Reload Now") {
              vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
          });

        this.logger.info("🔄 Extension reset completed");
      } catch (error) {
        this.logger.error("Error resetting extension:", error);
        vscode.window.showErrorMessage(
          `Failed to reset extension: ${error.message}`
        );
      }
    }
  }

  /**
   * Show welcome message for new users
   */
  async showWelcomeMessage() {
    const hasShownWelcome = this.context.globalState.get(
      "nox.hasShownWelcome",
      false
    );

    if (!hasShownWelcome) {
      const action = await vscode.window.showInformationMessage(
        "🦊 Welcome to Nox! Your clever AI coding fox is ready to help.",
        "Start Chat",
        "View Dashboard",
        "Settings"
      );

      switch (action) {
        case "Start Chat":
          await vscode.commands.executeCommand("nox.openChatPanel");
          break;
        case "View Dashboard":
          await vscode.commands.executeCommand("nox.dashboard");
          break;
        case "Settings":
          await vscode.commands.executeCommand("nox.settings");
          break;
      }

      await this.context.globalState.update("nox.hasShownWelcome", true);
    }
  }

  /**
   * Show performance dashboard
   */
  async showDashboard() {
    try {
      // Create dashboard panel
      const panel = vscode.window.createWebviewPanel(
        "noxDashboard",
        "📊 Nox Performance Dashboard",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this.context.extensionUri],
        }
      );

      // Get current theme and generate CSS variables
      const currentTheme = this.themeService.getCurrentTheme();
      const cssVariables = this.themeService.generateCSSVariables(currentTheme);

      // Set the HTML content with theme injected
      panel.webview.html = this.getDashboardPanelContent(
        panel.webview,
        cssVariables
      );

      // Handle messages from the dashboard
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === "getAnalyticsData") {
          try {
            // Get chat history from sidebar provider
            const chatHistory = this.chatSidebarProvider?.chatHistory || [];

            // Create analytics engine
            const AnalyticsEngine = require("./src/core/analyticsEngine.js");
            const analyticsEngine = new AnalyticsEngine(this.logger);

            // Get analytics report
            const report = analyticsEngine.getAnalyticsReport(
              chatHistory,
              message.filterType,
              message.customDates
            );

            // Send data back to dashboard
            panel.webview.postMessage({
              type: "analyticsData",
              data: report,
            });
          } catch (error) {
            this.logger.error("Failed to get analytics data:", error);
            panel.webview.postMessage({
              type: "error",
              message: "Failed to load analytics data",
            });
          }
        } else if (message.type === "backToSettings") {
          // Close dashboard and reopen settings
          panel.dispose();
          await this.openSettingsPanel();
        }
      });
    } catch (error) {
      this.logger.error("Failed to show dashboard:", error);
      vscode.window.showErrorMessage("Failed to open Performance Dashboard");
    }
  }

  /**
   * Show settings panel
   */
  async showSettings() {
    // TODO: Implement settings panel
    vscode.window.showInformationMessage("Settings coming soon!");
  }

  /**
   * Extension deactivation cleanup
   */
  async deactivate() {
    try {
      if (this.agentController) {
        await this.agentController.cleanup();
      }

      if (this.performanceMonitor) {
        await this.performanceMonitor.cleanup();
      }

      if (this.logger) {
        this.logger.info("Agent extension deactivated");
        await this.logger.cleanup();
      }
    } catch (error) {
      console.error("Error during extension deactivation:", error);
    }
  }
}

// Global extension instance
let extensionInstance = null;

/**
 * VS Code extension activation entry point
 */
async function activate(context) {
  console.log("🦊 Nox extension is being activated...");
  console.log("🦊 Extension context:", context.extensionPath);

  try {
    // Show immediate feedback
    vscode.window.showInformationMessage("🦊 Nox extension is loading...");

    extensionInstance = new NoxExtension();
    await extensionInstance.activate(context);

    // Show success message
    vscode.window.showInformationMessage(
      "🦊 Nox extension activated successfully! Try Ctrl+Shift+P and type 'Nox'"
    );

    console.log("🦊 Nox extension activation completed successfully!");
  } catch (error) {
    console.error("🦊 Nox extension activation failed:", error);
    vscode.window.showErrorMessage(
      `🦊 Nox activation failed: ${error.message}`
    );
  }
}

/**
 * VS Code extension deactivation entry point
 */
async function deactivate() {
  if (extensionInstance) {
    await extensionInstance.deactivate();
    extensionInstance = null;
  }
}

module.exports = {
  activate,
  deactivate,
};
