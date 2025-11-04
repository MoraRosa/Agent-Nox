/**
 * 🦊 NOX Capability Base Class
 * 
 * Abstract base class for all NOX capabilities.
 * Provides common interface for execution, validation, rollback, and metadata.
 * 
 * @enterprise-grade All capabilities inherit from this base
 */

class CapabilityBase {
  /**
   * Capability metadata - MUST be overridden by subclasses
   */
  static metadata = {
    id: 'base_capability',
    name: 'Base Capability',
    category: 'base',
    description: 'Abstract base capability',
    version: '1.0.0',
    
    // Risk level: 'low', 'medium', 'high', 'critical'
    riskLevel: 'low',
    
    // Mode availability
    modes: {
      assistant: true,
      agent: true,
      autonomous: true
    },
    
    // Approval requirements per mode
    approval: {
      assistant: 'always',     // Always require approval in assistant mode
      agent: 'batch',          // Batch approval in agent mode
      autonomous: 'none',      // No approval in autonomous mode
      highRisk: 'always'       // Always if high-risk
    },
    
    // Execution constraints
    constraints: {
      maxExecutionsPerBatch: 1,
      timeout: 30000, // 30 seconds
      retryable: true,
      maxRetries: 3
    },
    
    // Required permissions
    permissions: [],
    
    // Rollback support
    rollback: {
      supported: false,
      strategy: null // 'backup', 'transaction', 'compensating'
    },
    
    // Dependencies on other capabilities
    dependencies: []
  };

  constructor(context = {}) {
    this.context = context;
    this.executionHistory = [];
    this.rollbackPoints = [];
  }

  /**
   * Get capability metadata
   */
  static getMetadata() {
    return this.metadata;
  }

  /**
   * Execute the capability - MUST be implemented by subclasses
   * 
   * @param {Object} parameters - Capability-specific parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async execute(parameters, context = {}) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate parameters before execution
   * 
   * @param {Object} parameters - Parameters to validate
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  validate(parameters) {
    const errors = [];
    
    // Subclasses should override this to add specific validation
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a rollback point before execution
   * 
   * @param {Object} parameters - Execution parameters
   * @returns {Promise<Object>} - Rollback point data
   */
  async createRollbackPoint(parameters) {
    if (!this.constructor.metadata.rollback.supported) {
      return null;
    }
    
    // Subclasses should override this to implement rollback point creation
    throw new Error('createRollbackPoint() must be implemented by subclass if rollback is supported');
  }

  /**
   * Rollback to a previous state
   * 
   * @param {Object} rollbackPoint - Rollback point data
   * @returns {Promise<Object>} - Rollback result
   */
  async rollback(rollbackPoint) {
    if (!this.constructor.metadata.rollback.supported) {
      throw new Error('Rollback not supported for this capability');
    }
    
    // Subclasses should override this to implement rollback
    throw new Error('rollback() must be implemented by subclass if rollback is supported');
  }

  /**
   * Execute with automatic rollback on failure
   * 
   * @param {Object} parameters - Execution parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithRollback(parameters, context = {}) {
    let rollbackPoint = null;
    
    try {
      // Create rollback point if supported
      if (this.constructor.metadata.rollback.supported) {
        rollbackPoint = await this.createRollbackPoint(parameters);
        this.rollbackPoints.push(rollbackPoint);
      }
      
      // Execute capability
      const result = await this.execute(parameters, context);
      
      // Record successful execution
      this.recordExecution(parameters, result, 'success');
      
      return result;
      
    } catch (error) {
      // Record failed execution
      this.recordExecution(parameters, error, 'failed');
      
      // Attempt rollback if supported
      if (rollbackPoint) {
        try {
          await this.rollback(rollbackPoint);
          console.log(`✅ Rollback successful for ${this.constructor.metadata.name}`);
        } catch (rollbackError) {
          console.error(`❌ Rollback failed for ${this.constructor.metadata.name}:`, rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute with retry logic
   * 
   * @param {Object} parameters - Execution parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithRetry(parameters, context = {}) {
    const maxRetries = this.constructor.metadata.constraints.maxRetries;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithRollback(parameters, context);
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && this.constructor.metadata.constraints.retryable) {
          console.log(`⚠️ Attempt ${attempt} failed, retrying... (${this.constructor.metadata.name})`);
          
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Record execution in history
   */
  recordExecution(parameters, result, status) {
    this.executionHistory.push({
      timestamp: Date.now(),
      parameters,
      result: status === 'success' ? result : result.message,
      status
    });
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return this.executionHistory;
  }

  /**
   * Get last rollback point
   */
  getLastRollbackPoint() {
    return this.rollbackPoints[this.rollbackPoints.length - 1] || null;
  }

  /**
   * Clear rollback points
   */
  clearRollbackPoints() {
    this.rollbackPoints = [];
  }

  /**
   * Sleep utility for retry backoff
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if capability is available in given mode
   */
  static isAvailableInMode(mode) {
    return this.metadata.modes[mode] === true;
  }

  /**
   * Get approval requirement for given mode
   */
  static getApprovalRequirement(mode, isHighRisk = false) {
    if (isHighRisk) {
      return this.metadata.approval.highRisk;
    }
    return this.metadata.approval[mode];
  }

  /**
   * Get risk level
   */
  static getRiskLevel() {
    return this.metadata.riskLevel;
  }

  /**
   * Check if rollback is supported
   */
  static supportsRollback() {
    return this.metadata.rollback.supported;
  }

  /**
   * Get required permissions
   */
  static getRequiredPermissions() {
    return this.metadata.permissions;
  }

  /**
   * Get dependencies
   */
  static getDependencies() {
    return this.metadata.dependencies;
  }

  /**
   * Format capability for display
   */
  static formatForDisplay() {
    return {
      id: this.metadata.id,
      name: this.metadata.name,
      category: this.metadata.category,
      description: this.metadata.description,
      riskLevel: this.metadata.riskLevel,
      icon: this.getRiskIcon(this.metadata.riskLevel)
    };
  }

  /**
   * Get risk level icon
   */
  static getRiskIcon(riskLevel) {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[riskLevel] || '⚪';
  }
}

module.exports = CapabilityBase;

