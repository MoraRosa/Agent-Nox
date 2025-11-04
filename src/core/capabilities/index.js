/**
 * 🦊 NOX Capabilities - Central Export
 * 
 * Registers and exports all NOX capabilities.
 * 
 * @enterprise-grade Single source of truth for all capabilities
 */

const CapabilityRegistry = require('./base/CapabilityRegistry');

// Import all capabilities
const FileReadCapability = require('./read/FileReadCapability');
const FileCreateCapability = require('./write/FileCreateCapability');

/**
 * Initialize and register all capabilities
 * 
 * @param {Object} context - Initialization context (fileOps, gitOps, etc.)
 * @returns {CapabilityRegistry} - Initialized registry
 */
function initializeCapabilities(context = {}) {
  const registry = CapabilityRegistry.getInstance();
  
  // Clear existing registrations (for hot reload)
  registry.clear();
  
  console.log('🦊 Initializing NOX capabilities...');
  
  // Register READ capabilities
  registry.register(FileReadCapability);
  
  // Register WRITE capabilities
  registry.register(FileCreateCapability);
  
  // TODO: Register more capabilities as we build them:
  // - FileEditCapability
  // - FileDeleteCapability
  // - TerminalCommandCapability
  // - GitCommitCapability
  // - GitPushCapability
  // - WebSearchCapability
  // - CodeAnalysisCapability
  // - etc.
  
  const stats = registry.getStats();
  console.log(`✅ Registered ${stats.total} capabilities:`);
  console.log(`   - Read: ${stats.byCategory.read || 0}`);
  console.log(`   - Write: ${stats.byCategory.write || 0}`);
  console.log(`   - Terminal: ${stats.byCategory.terminal || 0}`);
  console.log(`   - Git: ${stats.byCategory.git || 0}`);
  console.log(`   - Analysis: ${stats.byCategory.analysis || 0}`);
  
  return registry;
}

/**
 * Get capability registry instance
 */
function getCapabilityRegistry() {
  return CapabilityRegistry.getInstance();
}

module.exports = {
  initializeCapabilities,
  getCapabilityRegistry,
  CapabilityRegistry,
  
  // Export base classes
  CapabilityBase: require('./base/CapabilityBase'),
  
  // Export individual capabilities (for direct import if needed)
  FileReadCapability,
  FileCreateCapability
};

