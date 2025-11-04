/**
 * 🦊 NOX Mode Manager - 3-Tier Capability System
 * 
 * Manages three distinct operational modes:
 * - ASSISTANT: Collaborative AI (approval per action)
 * - AGENT: Intelligent partner (approval once per plan)
 * - AUTONOMOUS: Full autonomy (configurable restrictions)
 * 
 * @enterprise-grade Modular, scalable, security-first architecture
 */

const vscode = require('vscode');

class NoxModeManager {
  /**
   * Available NOX modes
   */
  static MODES = {
    ASSISTANT: 'assistant',   // Chat mode - approval per action
    AGENT: 'agent',           // Agentic mode - approval once (plan)
    AUTONOMOUS: 'autonomous'  // Full autonomy - no approval (configurable)
  };

  /**
   * High-risk operations that require special handling
   */
  static HIGH_RISK_OPERATIONS = [
    'git_push',
    'git_force_push',
    'deploy_production',
    'database_migration',
    'file_deletion_bulk',
    'npm_uninstall',
    'sudo_command',
    'rm_rf'
  ];

  constructor() {
    this.currentMode = NoxModeManager.MODES.ASSISTANT; // Default to safest mode
    this.userRestrictions = this.loadUserRestrictions();
    this.modeConfigs = this.initializeModeConfigs();
  }

  /**
   * Initialize mode configurations
   */
  initializeModeConfigs() {
    return {
      [NoxModeManager.MODES.ASSISTANT]: {
        displayName: '💬 Assistant',
        description: 'Collaborative AI that asks for approval on every action',
        icon: '💬',
        approvalStrategy: 'per_action',
        multiStepEnabled: false,
        batchOperationsEnabled: false,
        autonomousExecutionEnabled: false,
        recommendedFor: 'Beginners, learning, code review, quick questions',
        capabilities: {
          read: true,
          write: true,
          terminal: true,
          git: true,
          web: true,
          multiStep: false,
          batch: false,
          iterative: false
        }
      },
      
      [NoxModeManager.MODES.AGENT]: {
        displayName: '🤖 Agent',
        description: 'Intelligent partner that approves plan once, then executes autonomously',
        icon: '🤖',
        approvalStrategy: 'per_plan',
        multiStepEnabled: true,
        batchOperationsEnabled: true,
        autonomousExecutionEnabled: true,
        highRiskRequiresApproval: true, // Still ask for push, deploy, etc.
        recommendedFor: 'Feature development, refactoring, complex tasks',
        capabilities: {
          read: true,
          write: true,
          terminal: true,
          git: true,
          web: true,
          multiStep: true,
          batch: true,
          iterative: true,
          planning: true,
          errorRecovery: true
        }
      },
      
      [NoxModeManager.MODES.AUTONOMOUS]: {
        displayName: '🚀 Autonomous',
        description: 'Full autonomy with configurable restrictions - trusted execution',
        icon: '🚀',
        approvalStrategy: 'none',
        multiStepEnabled: true,
        batchOperationsEnabled: true,
        autonomousExecutionEnabled: true,
        highRiskRequiresApproval: false, // User configures restrictions
        userConfigurableRestrictions: true,
        recommendedFor: 'Rapid prototyping, trusted projects, experienced developers',
        warning: '⚠️ Advanced users only - AI has full control',
        capabilities: {
          read: true,
          write: true,
          terminal: true,
          git: true,
          web: true,
          multiStep: true,
          batch: true,
          iterative: true,
          planning: true,
          errorRecovery: true,
          projectScaffolding: true,
          codebaseMigration: true,
          deployment: true
        }
      }
    };
  }

  /**
   * Load user-configured restrictions from VS Code settings
   */
  loadUserRestrictions() {
    const config = vscode.workspace.getConfiguration('nox.autonomous');
    
    return {
      alwaysApprove: config.get('alwaysApprove', [
        'git_push',
        'deploy_production',
        'database_migration'
      ]),
      neverExecute: config.get('neverExecute', [
        'git_force_push',
        'rm_rf',
        'sudo_command'
      ]),
      maxOperationsPerTask: config.get('maxOperationsPerTask', 100),
      maxFilesPerBatch: config.get('maxFilesPerBatch', 50),
      allowedPaths: config.get('allowedPaths', ['src/', 'tests/', 'docs/']),
      blockedPaths: config.get('blockedPaths', ['node_modules/', '.git/', 'dist/', 'build/'])
    };
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Set current mode
   */
  setMode(mode) {
    if (!Object.values(NoxModeManager.MODES).includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    
    this.currentMode = mode;
    
    // Emit mode change event
    this.onModeChanged(mode);
    
    return this.modeConfigs[mode];
  }

  /**
   * Get mode configuration
   */
  getModeConfig(mode = null) {
    const targetMode = mode || this.currentMode;
    return this.modeConfigs[targetMode];
  }

  /**
   * Get all available modes
   */
  getAllModes() {
    return Object.keys(this.modeConfigs).map(mode => ({
      id: mode,
      ...this.modeConfigs[mode]
    }));
  }

  /**
   * Check if capability is available in current mode
   */
  isCapabilityAvailable(capabilityType) {
    const config = this.modeConfigs[this.currentMode];
    
    // Map capability types to mode capabilities
    const capabilityMap = {
      file_read: 'read',
      file_create: 'write',
      file_edit: 'write',
      file_delete: 'write',
      terminal_command: 'terminal',
      git_commit: 'git',
      git_push: 'git',
      web_search: 'web',
      multi_step: 'multiStep',
      batch_operation: 'batch',
      iterative_workflow: 'iterative'
    };
    
    const mappedCapability = capabilityMap[capabilityType];
    return config.capabilities[mappedCapability] === true;
  }

  /**
   * Get approval strategy for a capability
   * 
   * @param {Object} capability - Capability object with type, parameters, etc.
   * @param {Object} context - Execution context (isPartOfPlan, etc.)
   * @returns {string} - 'none', 'per_action', 'per_plan', 'always'
   */
  getApprovalStrategy(capability, context = {}) {
    const mode = this.modeConfigs[this.currentMode];
    
    // Check if operation is blocked
    if (this.isOperationBlocked(capability)) {
      throw new Error(`Operation ${capability.type} is blocked by user settings`);
    }
    
    // AUTONOMOUS MODE
    if (this.currentMode === NoxModeManager.MODES.AUTONOMOUS) {
      return this.getAutonomousApprovalStrategy(capability, context);
    }
    
    // AGENT MODE
    if (this.currentMode === NoxModeManager.MODES.AGENT) {
      return this.getAgentApprovalStrategy(capability, context);
    }
    
    // ASSISTANT MODE - always ask per action
    return 'per_action';
  }

  /**
   * Get approval strategy for autonomous mode
   */
  getAutonomousApprovalStrategy(capability, context) {
    // Check user-configured restrictions
    if (this.userRestrictions.alwaysApprove.includes(capability.type)) {
      return 'always';
    }
    
    // No approval needed in autonomous mode (unless user configured)
    return 'none';
  }

  /**
   * Get approval strategy for agent mode
   */
  getAgentApprovalStrategy(capability, context) {
    // High-risk operations always require approval
    if (this.isHighRisk(capability)) {
      return 'always';
    }
    
    // If part of an approved plan, no additional approval needed
    if (context.isPartOfPlan && context.planApproved) {
      return 'none';
    }
    
    // Otherwise, require plan approval
    return 'per_plan';
  }

  /**
   * Check if operation is high-risk
   */
  isHighRisk(capability) {
    return NoxModeManager.HIGH_RISK_OPERATIONS.includes(capability.type);
  }

  /**
   * Check if operation is blocked by user settings
   */
  isOperationBlocked(capability) {
    return this.userRestrictions.neverExecute.includes(capability.type);
  }

  /**
   * Validate operation against constraints
   */
  validateOperation(capability, context = {}) {
    const errors = [];
    
    // Check if capability is available in current mode
    if (!this.isCapabilityAvailable(capability.type)) {
      errors.push(`Capability ${capability.type} not available in ${this.currentMode} mode`);
    }
    
    // Check path restrictions (for file operations)
    if (capability.parameters?.path) {
      const pathErrors = this.validatePath(capability.parameters.path);
      errors.push(...pathErrors);
    }
    
    // Check batch size limits
    if (context.batchSize && context.batchSize > this.userRestrictions.maxFilesPerBatch) {
      errors.push(`Batch size ${context.batchSize} exceeds limit of ${this.userRestrictions.maxFilesPerBatch}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file path against allowed/blocked paths
   */
  validatePath(filePath) {
    const errors = [];
    
    // Check blocked paths
    for (const blockedPath of this.userRestrictions.blockedPaths) {
      if (filePath.startsWith(blockedPath)) {
        errors.push(`Path ${filePath} is in blocked directory: ${blockedPath}`);
      }
    }
    
    // In autonomous mode, check allowed paths
    if (this.currentMode === NoxModeManager.MODES.AUTONOMOUS) {
      const isAllowed = this.userRestrictions.allowedPaths.some(
        allowedPath => filePath.startsWith(allowedPath)
      );
      
      if (!isAllowed && this.userRestrictions.allowedPaths.length > 0) {
        errors.push(`Path ${filePath} is not in allowed directories: ${this.userRestrictions.allowedPaths.join(', ')}`);
      }
    }
    
    return errors;
  }

  /**
   * Mode change event handler (can be overridden)
   */
  onModeChanged(newMode) {
    console.log(`🦊 NOX mode changed to: ${this.modeConfigs[newMode].displayName}`);
  }
}

module.exports = NoxModeManager;

