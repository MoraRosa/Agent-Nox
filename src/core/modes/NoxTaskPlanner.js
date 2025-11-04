/**
 * 🦊 NOX Task Planner
 * 
 * Breaks down complex user requests into executable task plans.
 * Used in AGENT and AUTONOMOUS modes for multi-step execution.
 * 
 * @enterprise-grade Intelligent planning, progress tracking, error recovery
 */

const vscode = require('vscode');

class NoxTaskPlanner {
  constructor(aiClient, capabilityRegistry, modeManager) {
    this.aiClient = aiClient;
    this.capabilityRegistry = capabilityRegistry;
    this.modeManager = modeManager;
    this.activePlans = new Map();
  }

  /**
   * Create a task plan from user request
   * 
   * @param {string} userRequest - User's request
   * @param {Object} context - Execution context (workspace, files, etc.)
   * @returns {Promise<Object>} - Task plan
   */
  async createTaskPlan(userRequest, context = {}) {
    const systemPrompt = this.buildPlanningSystemPrompt(context);
    const planningPrompt = this.buildPlanningPrompt(userRequest, context);
    
    try {
      // Request AI to create structured plan
      const response = await this.aiClient.sendRequestWithSystem(
        systemPrompt,
        [{ role: 'user', content: planningPrompt }],
        {
          maxTokens: 2000,
          temperature: 0.3, // Lower temperature for more deterministic planning
          response_format: { type: 'json_object' } // Request JSON output if supported
        }
      );
      
      // Parse plan from AI response
      const plan = this.parsePlan(response.content);
      
      // Validate plan
      const validation = this.validatePlan(plan);
      if (!validation.valid) {
        throw new Error(`Invalid plan: ${validation.errors.join(', ')}`);
      }
      
      // Enrich plan with metadata
      plan.id = this.generatePlanId();
      plan.createdAt = Date.now();
      plan.status = 'pending';
      plan.userRequest = userRequest;
      plan.context = context;
      
      return plan;
      
    } catch (error) {
      console.error('❌ Failed to create task plan:', error);
      throw new Error(`Task planning failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt for task planning
   */
  buildPlanningSystemPrompt(context) {
    const availableCapabilities = this.capabilityRegistry.getByMode(
      this.modeManager.getCurrentMode()
    );
    
    return `You are NOX Task Planner, an expert at breaking down coding tasks into executable steps.

## Your Role:
- Analyze user requests and create detailed, executable task plans
- Break complex tasks into sequential steps
- Identify required capabilities for each step
- Estimate time and risk for each operation
- Detect dependencies between steps

## Available Capabilities:
${availableCapabilities.map(cap => `- ${cap.id}: ${cap.description} (${cap.riskLevel} risk)`).join('\n')}

## Current Context:
- Workspace: ${context.workspacePath || 'Unknown'}
- Project Type: ${context.projectType || 'Unknown'}
- Files Indexed: ${context.totalFiles || 0}

## Output Format:
Return a JSON object with this structure:
{
  "taskName": "Brief task description",
  "estimatedTime": "5 minutes",
  "totalSteps": 5,
  "steps": [
    {
      "id": "step_1",
      "description": "Create authentication service",
      "capability": "file_create",
      "parameters": {
        "path": "src/auth/service.js",
        "content": "// File content here"
      },
      "riskLevel": "low",
      "estimatedTime": "30 seconds",
      "dependencies": []
    }
  ],
  "dependencies": ["jsonwebtoken", "bcrypt"],
  "highRiskOperations": ["git_push"],
  "rollbackSupported": true
}

Be specific, detailed, and executable. Each step must be actionable.`;
  }

  /**
   * Build planning prompt from user request
   */
  buildPlanningPrompt(userRequest, context) {
    return `Create a detailed task plan for this request:

"${userRequest}"

Consider:
1. What files need to be created/edited/deleted?
2. What terminal commands need to run?
3. What dependencies need to be installed?
4. What git operations are needed?
5. What is the optimal order of operations?

Return the plan as JSON.`;
  }

  /**
   * Parse plan from AI response
   */
  parsePlan(responseContent) {
    try {
      // Try to parse as JSON
      const plan = JSON.parse(responseContent);
      return plan;
    } catch (error) {
      // If not JSON, try to extract JSON from markdown code blocks
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      throw new Error('Could not parse plan from AI response');
    }
  }

  /**
   * Validate task plan
   */
  validatePlan(plan) {
    const errors = [];
    
    // Required fields
    if (!plan.taskName) errors.push('Missing taskName');
    if (!plan.steps || !Array.isArray(plan.steps)) errors.push('Missing or invalid steps array');
    if (plan.steps && plan.steps.length === 0) errors.push('Plan must have at least one step');
    
    // Validate each step
    if (plan.steps) {
      plan.steps.forEach((step, index) => {
        if (!step.id) errors.push(`Step ${index + 1}: Missing id`);
        if (!step.description) errors.push(`Step ${index + 1}: Missing description`);
        if (!step.capability) errors.push(`Step ${index + 1}: Missing capability`);
        
        // Check if capability exists
        if (step.capability && !this.capabilityRegistry.has(step.capability)) {
          errors.push(`Step ${index + 1}: Unknown capability ${step.capability}`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Show plan approval UI
   * 
   * @param {Object} plan - Task plan
   * @returns {Promise<boolean>} - True if approved
   */
  async showPlanForApproval(plan) {
    const message = this.formatPlanForDisplay(plan);
    
    const choice = await vscode.window.showInformationMessage(
      `🦊 NOX Task Plan: ${plan.taskName}`,
      { modal: true, detail: message },
      '✅ Approve & Execute',
      '📝 Show Details',
      '❌ Cancel'
    );
    
    if (choice === '📝 Show Details') {
      // Show detailed view in output channel or webview
      await this.showDetailedPlan(plan);
      // Ask again
      return this.showPlanForApproval(plan);
    }
    
    return choice === '✅ Approve & Execute';
  }

  /**
   * Format plan for display
   */
  formatPlanForDisplay(plan) {
    const steps = plan.steps.map((step, i) => {
      const riskIcon = this.getRiskIcon(step.riskLevel);
      return `  ${i + 1}. ${riskIcon} ${step.description} (${step.estimatedTime || 'unknown time'})`;
    }).join('\n');
    
    const dependencies = plan.dependencies && plan.dependencies.length > 0
      ? `\n\n📦 Dependencies:\n${plan.dependencies.map(dep => `  - ${dep}`).join('\n')}`
      : '';
    
    const highRisk = plan.highRiskOperations && plan.highRiskOperations.length > 0
      ? `\n\n⚠️ High-Risk Operations:\n${plan.highRiskOperations.map(op => `  - ${op}`).join('\n')}`
      : '';
    
    return `⏱️ Estimated time: ${plan.estimatedTime || 'unknown'}
📋 Total steps: ${plan.totalSteps || plan.steps.length}

Steps:
${steps}${dependencies}${highRisk}

${plan.rollbackSupported ? '✅ Rollback supported' : '⚠️ Rollback not supported'}`;
  }

  /**
   * Show detailed plan in output channel
   */
  async showDetailedPlan(plan) {
    const outputChannel = vscode.window.createOutputChannel('NOX Task Plan');
    outputChannel.clear();
    outputChannel.appendLine('🦊 NOX TASK PLAN - DETAILED VIEW');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('');
    outputChannel.appendLine(`Task: ${plan.taskName}`);
    outputChannel.appendLine(`Estimated Time: ${plan.estimatedTime || 'unknown'}`);
    outputChannel.appendLine(`Total Steps: ${plan.totalSteps || plan.steps.length}`);
    outputChannel.appendLine('');
    outputChannel.appendLine('STEPS:');
    outputChannel.appendLine('-'.repeat(80));
    
    plan.steps.forEach((step, i) => {
      outputChannel.appendLine('');
      outputChannel.appendLine(`Step ${i + 1}: ${step.description}`);
      outputChannel.appendLine(`  Capability: ${step.capability}`);
      outputChannel.appendLine(`  Risk Level: ${step.riskLevel}`);
      outputChannel.appendLine(`  Estimated Time: ${step.estimatedTime || 'unknown'}`);
      
      if (step.parameters) {
        outputChannel.appendLine(`  Parameters:`);
        outputChannel.appendLine(`    ${JSON.stringify(step.parameters, null, 2).split('\n').join('\n    ')}`);
      }
      
      if (step.dependencies && step.dependencies.length > 0) {
        outputChannel.appendLine(`  Dependencies: ${step.dependencies.join(', ')}`);
      }
    });
    
    outputChannel.show();
  }

  /**
   * Execute task plan
   * 
   * @param {Object} plan - Task plan
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - Execution results
   */
  async executePlan(plan, onProgress = null) {
    plan.status = 'executing';
    plan.startedAt = Date.now();
    this.activePlans.set(plan.id, plan);
    
    const results = [];
    
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        // Notify progress
        if (onProgress) {
          onProgress({
            planId: plan.id,
            step: i + 1,
            totalSteps: plan.steps.length,
            stepId: step.id,
            status: 'executing',
            description: step.description
          });
        }
        
        // Execute step
        const result = await this.executeStep(step, plan);
        results.push({ step: step.id, success: true, result });
        
        // Notify completion
        if (onProgress) {
          onProgress({
            planId: plan.id,
            step: i + 1,
            totalSteps: plan.steps.length,
            stepId: step.id,
            status: 'completed',
            result
          });
        }
      }
      
      plan.status = 'completed';
      plan.completedAt = Date.now();
      plan.results = results;
      
      return {
        success: true,
        plan,
        results
      };
      
    } catch (error) {
      plan.status = 'failed';
      plan.error = error.message;
      plan.failedAt = Date.now();
      
      throw error;
    } finally {
      this.activePlans.delete(plan.id);
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step, plan) {
    // Create capability instance
    const capability = this.capabilityRegistry.create(step.capability, {
      isPartOfPlan: true,
      planApproved: true,
      planId: plan.id
    });
    
    // Execute with rollback support
    return await capability.executeWithRollback(step.parameters, {
      isPartOfPlan: true,
      planApproved: true
    });
  }

  /**
   * Generate unique plan ID
   */
  generatePlanId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get risk icon
   */
  getRiskIcon(riskLevel) {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[riskLevel] || '⚪';
  }

  /**
   * Get active plans
   */
  getActivePlans() {
    return Array.from(this.activePlans.values());
  }

  /**
   * Cancel plan execution
   */
  async cancelPlan(planId) {
    const plan = this.activePlans.get(planId);
    if (plan) {
      plan.status = 'cancelled';
      this.activePlans.delete(planId);
    }
  }
}

module.exports = NoxTaskPlanner;

