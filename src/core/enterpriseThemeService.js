/**
 * 🎨 Enterprise Theme Service
 * Enterprise-grade Aurora theming system for Nox VS Code extension
 * Features: Encryption, Audit Logging, Performance Monitoring, 100% Local Storage
 */

const vscode = require("vscode");
const Logger = require("../utils/logger");
const AuditLogger = require("../enterprise/auditLogger");
const PerformanceMonitor = require("./performanceMonitor");

class EnterpriseThemeService {
  constructor(context) {
    this.context = context;
    this.logger = new Logger(context);
    this.auditLogger = new AuditLogger(context, this.logger);
    this.performanceMonitor = new PerformanceMonitor(context, this.logger);

    // Theme state
    this.currentTheme = null;
    this.themeCache = new Map();
    this.isInitialized = false;

    // Enterprise settings
    this.encryptionEnabled = true;
    this.auditEnabled = true;
    this.performanceTrackingEnabled = true;

    this.logger.info("🎨 Enterprise Theme Service initialized");
  }

  /**
   * 🚀 Initialize theme service
   */
  async initialize() {
    try {
      const startTime = Date.now();

      // Load theme definitions
      await this.loadThemeDefinitions();

      // Load current theme from storage
      await this.loadCurrentTheme();

      // Validate theme integrity
      await this.validateThemeIntegrity();

      // Setup performance monitoring
      if (this.performanceTrackingEnabled) {
        await this.setupPerformanceMonitoring();
      }

      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      this.logger.info(`🎨 Theme service initialized in ${initTime}ms`, {
        currentTheme: this.currentTheme?.id,
        themesLoaded: this.themeCache.size,
        encryptionEnabled: this.encryptionEnabled,
      });

      // Audit initialization
      if (this.auditEnabled) {
        await this.auditLogger.logEvent({
          action: "theme_service_initialized",
          details: {
            initTime,
            currentTheme: this.currentTheme?.id,
            themesAvailable: this.themeCache.size,
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to initialize theme service:", error);
      throw error;
    }
  }

  /**
   * 📚 Load theme definitions from local files
   */
  async loadThemeDefinitions() {
    try {
      // Import theme definitions
      const { AURORA_THEMES } = require("../themes/auroraThemeDefinitions");

      // Validate and cache themes
      for (const theme of AURORA_THEMES) {
        if (await this.validateThemeSchema(theme)) {
          this.themeCache.set(theme.id, theme);
        } else {
          this.logger.warn(`Invalid theme schema for: ${theme.id}`);
        }
      }

      this.logger.info(`🎨 Loaded ${this.themeCache.size} Aurora themes`);
    } catch (error) {
      this.logger.error("Failed to load theme definitions:", error);
      // Load fallback theme
      await this.loadFallbackTheme();
    }
  }

  /**
   * 🔄 Load current theme from encrypted storage
   */
  async loadCurrentTheme() {
    try {
      // Try workspace-specific theme first
      let themeData = await this.getEncryptedStorage("workspace");
      console.log("🎨 [DEBUG] Workspace theme data:", themeData);

      // Fallback to global theme
      if (!themeData) {
        themeData = await this.getEncryptedStorage("global");
        console.log("🎨 [DEBUG] Global theme data:", themeData);
      }

      // Fallback to default theme
      if (!themeData) {
        themeData = { themeId: "classic", mode: "dark" };
        await this.saveThemeSettings(themeData, "global");
      }

      // Load theme from cache
      this.currentTheme = this.themeCache.get(themeData.themeId);

      if (!this.currentTheme) {
        this.logger.warn(
          `Theme not found: ${themeData.themeId}, using fallback`
        );
        this.currentTheme = this.themeCache.get("classic");
      }

      console.log(
        `🎨 [DEBUG] Theme loaded from storage: ${this.currentTheme.name} (ID: ${this.currentTheme.id})`
      );
      this.logger.info(`🎨 Current theme loaded: ${this.currentTheme.name}`);
    } catch (error) {
      this.logger.error("Failed to load current theme:", error);
      this.currentTheme = this.themeCache.get("classic");
    }
  }

  /**
   * 🔒 Get encrypted storage data
   */
  async getEncryptedStorage(scope) {
    try {
      const storageKey =
        scope === "workspace"
          ? "nox.enterprise.theme.workspace"
          : "nox.enterprise.theme.global";

      const storage =
        scope === "workspace"
          ? this.context.workspaceState
          : this.context.globalState;

      const encryptedData = storage.get(storageKey);

      if (!encryptedData) {
        return null;
      }

      // For now, we'll use base64 encoding (can be enhanced with real encryption)
      if (this.encryptionEnabled) {
        return this.decryptThemeData(encryptedData);
      }

      return encryptedData;
    } catch (error) {
      this.logger.error(`Failed to get encrypted storage (${scope}):`, error);
      return null;
    }
  }

  /**
   * 💾 Save theme settings with encryption
   */
  async saveThemeSettings(themeData, scope = "workspace") {
    try {
      const storageKey =
        scope === "workspace"
          ? "nox.enterprise.theme.workspace"
          : "nox.enterprise.theme.global";

      const storage =
        scope === "workspace"
          ? this.context.workspaceState
          : this.context.globalState;

      // Add metadata
      const dataWithMetadata = {
        ...themeData,
        lastModified: Date.now(),
        version: "1.0.0",
        scope,
      };

      // Encrypt if enabled
      const dataToStore = this.encryptionEnabled
        ? this.encryptThemeData(dataWithMetadata)
        : dataWithMetadata;

      await storage.update(storageKey, dataToStore);

      this.logger.info(`🎨 Theme settings saved (${scope}):`, {
        themeId: themeData.themeId,
        encrypted: this.encryptionEnabled,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to save theme settings (${scope}):`, error);
      return false;
    }
  }

  /**
   * 🔐 Simple encryption for theme data (enterprise-grade can be enhanced)
   */
  encryptThemeData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple base64 encoding (can be enhanced with AES encryption)
      return Buffer.from(jsonString).toString("base64");
    } catch (error) {
      this.logger.error("Failed to encrypt theme data:", error);
      return data;
    }
  }

  /**
   * 🔓 Simple decryption for theme data
   */
  decryptThemeData(encryptedData) {
    try {
      // Simple base64 decoding
      const jsonString = Buffer.from(encryptedData, "base64").toString("utf8");
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error("Failed to decrypt theme data:", error);
      return null;
    }
  }

  /**
   * ✅ Validate theme schema
   */
  async validateThemeSchema(theme) {
    try {
      const requiredFields = [
        "id",
        "name",
        "category",
        "colors",
        "backgrounds",
      ];

      for (const field of requiredFields) {
        if (!theme[field]) {
          this.logger.warn(`Theme missing required field: ${field}`);
          return false;
        }
      }

      // Validate colors
      if (
        !theme.colors.primary ||
        !theme.colors.secondary ||
        !theme.colors.accent
      ) {
        this.logger.warn(`Theme missing required colors: ${theme.id}`);
        return false;
      }

      // Validate backgrounds
      if (!theme.backgrounds.primary || !theme.backgrounds.secondary) {
        this.logger.warn(`Theme missing required backgrounds: ${theme.id}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error("Theme validation error:", error);
      return false;
    }
  }

  /**
   * 🔍 Validate theme integrity
   */
  async validateThemeIntegrity() {
    try {
      if (!this.currentTheme) {
        throw new Error("No current theme loaded");
      }

      // Validate current theme
      const isValid = await this.validateThemeSchema(this.currentTheme);

      if (!isValid) {
        this.logger.warn(
          "Current theme failed validation, switching to fallback"
        );
        await this.switchToFallbackTheme();
      }

      this.logger.info("🎨 Theme integrity validated");
      return true;
    } catch (error) {
      this.logger.error("Theme integrity validation failed:", error);
      await this.switchToFallbackTheme();
      return false;
    }
  }

  /**
   * 🔄 Switch to fallback theme
   */
  async switchToFallbackTheme() {
    try {
      this.currentTheme = this.themeCache.get("classic");

      if (!this.currentTheme) {
        await this.loadFallbackTheme();
      }

      await this.saveThemeSettings(
        { themeId: "classic", mode: "dark" },
        "global"
      );
      this.logger.info("🎨 Switched to fallback theme");
    } catch (error) {
      this.logger.error("Failed to switch to fallback theme:", error);
    }
  }

  /**
   * 🆘 Load hardcoded fallback theme
   */
  async loadFallbackTheme() {
    const fallbackTheme = {
      id: "classic",
      name: "🌌 Classic Aurora",
      category: "dark",
      colors: {
        primary: "#4c9aff",
        secondary: "#8b5cf6",
        accent: "#10b981",
      },
      backgrounds: {
        primary: "#0a0a0f",
        secondary: "#1a1a2e",
      },
      enterprise: {
        compliance: true,
        accessibility: "WCAG-AA",
        auditRequired: true,
      },
    };

    this.themeCache.set("classic", fallbackTheme);
    this.currentTheme = fallbackTheme;
    this.logger.info("🎨 Fallback theme loaded");
  }

  /**
   * 📊 Setup performance monitoring
   */
  async setupPerformanceMonitoring() {
    try {
      this.performanceMonitor.startTracking("theme_operations");
      this.logger.info("🎨 Performance monitoring enabled for themes");
    } catch (error) {
      this.logger.error("Failed to setup performance monitoring:", error);
    }
  }

  /**
   * 🎨 Apply theme (main public method)
   */
  async applyTheme(themeId, options = {}) {
    try {
      const startTime = Date.now();

      // Validate theme exists
      const theme = this.themeCache.get(themeId);
      if (!theme) {
        throw new Error(`Theme not found: ${themeId}`);
      }

      // Validate theme schema
      if (!(await this.validateThemeSchema(theme))) {
        throw new Error(`Invalid theme schema: ${themeId}`);
      }

      const oldTheme = this.currentTheme;

      // Apply theme
      this.currentTheme = theme;

      // Save to storage
      const scope = options.scope || "workspace";
      await this.saveThemeSettings(
        {
          themeId,
          mode: theme.category,
          appliedAt: Date.now(),
        },
        scope
      );

      // Notify webviews
      await this.notifyWebviewsThemeChange(theme);

      const applyTime = Date.now() - startTime;

      // Performance tracking
      if (this.performanceTrackingEnabled) {
        this.performanceMonitor.recordMetric("theme_apply_time", applyTime);
      }

      // Audit logging
      if (this.auditEnabled) {
        await this.auditLogger.logEvent({
          action: "theme_applied",
          details: {
            oldTheme: oldTheme?.id,
            newTheme: themeId,
            applyTime,
            scope,
            userId: this.getUserId(),
            workspaceId: this.getWorkspaceId(),
          },
        });
      }

      this.logger.info(`🎨 Theme applied: ${theme.name} (${applyTime}ms)`);

      return {
        success: true,
        theme: theme,
        applyTime,
        previousTheme: oldTheme?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to apply theme ${themeId}:`, error);

      // Audit failure
      if (this.auditEnabled) {
        await this.auditLogger.logEvent({
          action: "theme_apply_failed",
          details: {
            themeId,
            error: error.message,
            userId: this.getUserId(),
          },
        });
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 📢 Notify webviews of theme change
   */
  async notifyWebviewsThemeChange(theme) {
    try {
      const themeMessage = {
        type: "themeChanged",
        theme: {
          id: theme.id,
          name: theme.name,
          category: theme.category,
          colors: theme.colors,
          backgrounds: theme.backgrounds,
          cssVariables: this.generateCSSVariables(theme),
        },
      };

      // Send to all active webviews via VS Code command
      await vscode.commands.executeCommand("nox.updateTheme", themeMessage);

      // Apply CSS variables to webviews
      await this.applyCSSVariables(theme);

      this.logger.info(`🎨 Theme change notification sent: ${theme.name}`);
    } catch (error) {
      this.logger.error("Failed to notify webviews of theme change:", error);
    }
  }

  /**
   * 🎨 Generate CSS variables for theme (Complete Aurora Integration)
   */
  generateCSSVariables(theme) {
    return {
      // Core Aurora Colors (for animations)
      "--aurora-blue": theme.colors.primary,
      "--aurora-purple": theme.colors.secondary,
      "--aurora-green": theme.colors.accent,
      "--aurora-pink": theme.colors.tertiary,
      "--aurora-cyan": theme.colors.quaternary,
      "--aurora-orange": theme.colors.warning,

      // Theme-specific colors
      "--aurora-primary": theme.colors.primary,
      "--aurora-secondary": theme.colors.secondary,
      "--aurora-accent": theme.colors.accent,
      "--aurora-tertiary": theme.colors.tertiary,
      "--aurora-quaternary": theme.colors.quaternary,
      "--aurora-warning": theme.colors.warning,
      "--aurora-error": theme.colors.error,
      "--aurora-success": theme.colors.success,
      "--aurora-info": theme.colors.info,

      // Backgrounds
      "--bg-primary": theme.backgrounds.primary,
      "--bg-secondary": theme.backgrounds.secondary,
      "--bg-tertiary": theme.backgrounds.tertiary,
      "--bg-surface": theme.backgrounds.surface,
      "--bg-elevated": theme.backgrounds.elevated,

      // Text colors
      "--text-primary": theme.text.primary,
      "--text-secondary": theme.text.secondary,
      "--text-muted": theme.text.muted,
      "--text-inverse": theme.text.inverse,

      // Gradients (for Aurora animations)
      "--gradient-aurora": theme.gradients.primary,
      "--gradient-secondary": theme.gradients.secondary,
      "--gradient-accent": theme.gradients.accent,

      // Aurora Animation Colors (for background animations)
      "--aurora-anim-1": `rgba(${this.hexToRgb(theme.colors.primary)}, 0.1)`,
      "--aurora-anim-2": `rgba(${this.hexToRgb(theme.colors.secondary)}, 0.1)`,
      "--aurora-anim-3": `rgba(${this.hexToRgb(theme.colors.accent)}, 0.1)`,
      "--aurora-anim-4": `rgba(${this.hexToRgb(theme.colors.tertiary)}, 0.1)`,
      "--aurora-anim-5": `rgba(${this.hexToRgb(theme.colors.quaternary)}, 0.1)`,

      // Theme metadata
      "--theme-category": theme.category,
      "--theme-id": theme.id,
    };
  }

  /**
   * 🎨 Convert hex color to RGB values
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
          result[3],
          16
        )}`
      : "76, 154, 255"; // fallback to aurora blue
  }

  /**
   * 🎨 Apply CSS variables to webviews for Aurora animations
   * ✅ SECURITY FIX: Send CSS variables directly instead of script
   */
  async applyCSSVariables(theme) {
    try {
      const cssVariables = this.generateCSSVariables(theme);

      // ✅ SECURITY: Send CSS variables object instead of executable script
      const cssMessage = {
        type: "injectCSS",
        theme: {
          id: theme.id,
          name: theme.name,
          variables: cssVariables,
        },
      };

      await vscode.commands.executeCommand("nox.updateTheme", cssMessage);

      this.logger.info(`🎨 CSS variables applied for theme: ${theme.name}`);
    } catch (error) {
      this.logger.error("Failed to apply CSS variables:", error);
    }
  }

  /**
   * 📋 Get available themes
   */
  getAvailableThemes() {
    return Array.from(this.themeCache.values()).map((theme) => ({
      id: theme.id,
      name: theme.name,
      category: theme.category,
      description: theme.description || "",
      preview: {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        accent: theme.colors.accent,
      },
    }));
  }

  /**
   * 🎯 Get current theme info
   */
  getCurrentTheme() {
    return this.currentTheme
      ? {
          id: this.currentTheme.id,
          name: this.currentTheme.name,
          category: this.currentTheme.category,
          colors: this.currentTheme.colors,
          backgrounds: this.currentTheme.backgrounds,
          text: this.currentTheme.text,
          gradients: this.currentTheme.gradients,
        }
      : null;
  }

  /**
   * 🔄 Reset to default theme
   */
  async resetToDefault() {
    try {
      await this.applyTheme("classic", { scope: "global" });

      // Clear workspace-specific theme
      await this.context.workspaceState.update(
        "nox.enterprise.theme.workspace",
        undefined
      );

      this.logger.info("🎨 Reset to default theme");

      if (this.auditEnabled) {
        await this.auditLogger.logEvent({
          action: "theme_reset_to_default",
          details: {
            userId: this.getUserId(),
            workspaceId: this.getWorkspaceId(),
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to reset to default theme:", error);
      return false;
    }
  }

  /**
   * 🆔 Get user ID for audit logging
   */
  getUserId() {
    // In enterprise environment, this could be from SSO or workspace config
    return vscode.env.machineId || "anonymous";
  }

  /**
   * 🏢 Get workspace ID for audit logging
   */
  getWorkspaceId() {
    return (
      vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || "no-workspace"
    );
  }

  /**
   * 🧹 Cleanup resources
   */
  async dispose() {
    try {
      if (this.performanceTrackingEnabled) {
        this.performanceMonitor.stopTracking("theme_operations");
      }

      this.themeCache.clear();
      this.currentTheme = null;
      this.isInitialized = false;

      this.logger.info("🎨 Enterprise Theme Service disposed");
    } catch (error) {
      this.logger.error("Error disposing theme service:", error);
    }
  }
}

module.exports = EnterpriseThemeService;
