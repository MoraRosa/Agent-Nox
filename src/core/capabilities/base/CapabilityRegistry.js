/**
 * 🦊 NOX Capability Registry
 *
 * Central registry for all NOX capabilities.
 * Manages capability registration, discovery, and instantiation.
 *
 * @enterprise-grade Singleton pattern, thread-safe, extensible
 */

const CapabilityBase = require("./CapabilityBase");

class CapabilityRegistry {
  constructor() {
    if (CapabilityRegistry.instance) {
      return CapabilityRegistry.instance;
    }

    this.capabilities = new Map();
    this.categorizedCapabilities = new Map();
    this.initialized = false;

    CapabilityRegistry.instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry();
    }
    return CapabilityRegistry.instance;
  }

  /**
   * Register a capability
   *
   * @param {Class} CapabilityClass - Capability class (extends CapabilityBase)
   */
  register(CapabilityClass) {
    // Validate that class extends CapabilityBase
    if (!(CapabilityClass.prototype instanceof CapabilityBase)) {
      throw new Error(
        `Capability must extend CapabilityBase: ${CapabilityClass.name}`
      );
    }

    const metadata = CapabilityClass.getMetadata();

    // Check for duplicate IDs
    if (this.capabilities.has(metadata.id)) {
      throw new Error(
        `Capability with ID ${metadata.id} is already registered`
      );
    }

    // Register capability
    this.capabilities.set(metadata.id, CapabilityClass);

    // Add to category map
    if (!this.categorizedCapabilities.has(metadata.category)) {
      this.categorizedCapabilities.set(metadata.category, []);
    }
    this.categorizedCapabilities.get(metadata.category).push(metadata.id);

    console.log(`✅ Registered capability: ${metadata.name} (${metadata.id})`);
  }

  /**
   * Register multiple capabilities
   *
   * @param {Array<Class>} capabilities - Array of capability classes
   */
  registerBatch(capabilities) {
    for (const CapabilityClass of capabilities) {
      this.register(CapabilityClass);
    }
  }

  /**
   * Get capability class by ID
   *
   * @param {string} capabilityId - Capability ID
   * @returns {Class} - Capability class
   */
  get(capabilityId) {
    const CapabilityClass = this.capabilities.get(capabilityId);

    if (!CapabilityClass) {
      throw new Error(`Capability not found: ${capabilityId}`);
    }

    return CapabilityClass;
  }

  /**
   * Create capability instance
   *
   * @param {string} capabilityId - Capability ID
   * @param {Object} context - Execution context
   * @returns {CapabilityBase} - Capability instance
   */
  create(capabilityId, context = {}) {
    const CapabilityClass = this.get(capabilityId);
    return new CapabilityClass(context);
  }

  /**
   * Check if capability exists
   *
   * @param {string} capabilityId - Capability ID
   * @returns {boolean}
   */
  has(capabilityId) {
    return this.capabilities.has(capabilityId);
  }

  /**
   * Get all registered capabilities
   *
   * @returns {Array<Object>} - Array of capability metadata
   */
  getAll() {
    return Array.from(this.capabilities.values()).map((CapabilityClass) =>
      CapabilityClass.getMetadata()
    );
  }

  /**
   * Get capabilities by category
   *
   * @param {string} category - Category name
   * @returns {Array<Object>} - Array of capability metadata
   */
  getByCategory(category) {
    const capabilityIds = this.categorizedCapabilities.get(category) || [];
    return capabilityIds.map((id) => this.get(id).getMetadata());
  }

  /**
   * Get capabilities available in specific mode
   *
   * @param {string} mode - Mode name (assistant, agent, autonomous)
   * @returns {Array<Class>} - Array of capability classes (not instances)
   */
  getByMode(mode) {
    return Array.from(this.capabilities.values()).filter(
      (CapabilityClass) => CapabilityClass.metadata.modes[mode] === true
    );
  }

  /**
   * Get capabilities by risk level
   *
   * @param {string} riskLevel - Risk level (low, medium, high, critical)
   * @returns {Array<Object>} - Array of capability metadata
   */
  getByRiskLevel(riskLevel) {
    return this.getAll().filter((metadata) => metadata.riskLevel === riskLevel);
  }

  /**
   * Search capabilities by name or description
   *
   * @param {string} query - Search query
   * @returns {Array<Object>} - Array of capability metadata
   */
  search(query) {
    const lowerQuery = query.toLowerCase();

    return this.getAll().filter(
      (metadata) =>
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery) ||
        metadata.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all categories
   *
   * @returns {Array<string>} - Array of category names
   */
  getCategories() {
    return Array.from(this.categorizedCapabilities.keys());
  }

  /**
   * Get capability count
   *
   * @returns {number} - Total number of registered capabilities
   */
  getCount() {
    return this.capabilities.size;
  }

  /**
   * Get capability metadata by ID
   *
   * @param {string} capabilityId - Capability ID
   * @returns {Object} - Capability metadata
   */
  getMetadata(capabilityId) {
    return this.get(capabilityId).getMetadata();
  }

  /**
   * Validate capability parameters
   *
   * @param {string} capabilityId - Capability ID
   * @param {Object} parameters - Parameters to validate
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  validate(capabilityId, parameters) {
    const instance = this.create(capabilityId);
    return instance.validate(parameters);
  }

  /**
   * Check if capability supports rollback
   *
   * @param {string} capabilityId - Capability ID
   * @returns {boolean}
   */
  supportsRollback(capabilityId) {
    return this.get(capabilityId).supportsRollback();
  }

  /**
   * Get capabilities that depend on a specific capability
   *
   * @param {string} capabilityId - Capability ID
   * @returns {Array<Object>} - Array of dependent capability metadata
   */
  getDependents(capabilityId) {
    return this.getAll().filter((metadata) =>
      metadata.dependencies.includes(capabilityId)
    );
  }

  /**
   * Get dependency tree for a capability
   *
   * @param {string} capabilityId - Capability ID
   * @returns {Array<string>} - Array of dependency IDs (ordered)
   */
  getDependencyTree(capabilityId) {
    const metadata = this.getMetadata(capabilityId);
    const dependencies = [];
    const visited = new Set();

    const traverse = (id) => {
      if (visited.has(id)) return;
      visited.add(id);

      const meta = this.getMetadata(id);
      for (const depId of meta.dependencies) {
        traverse(depId);
      }

      dependencies.push(id);
    };

    traverse(capabilityId);

    return dependencies;
  }

  /**
   * Unregister a capability
   *
   * @param {string} capabilityId - Capability ID
   */
  unregister(capabilityId) {
    const metadata = this.getMetadata(capabilityId);

    // Remove from main map
    this.capabilities.delete(capabilityId);

    // Remove from category map
    const categoryCapabilities = this.categorizedCapabilities.get(
      metadata.category
    );
    if (categoryCapabilities) {
      const index = categoryCapabilities.indexOf(capabilityId);
      if (index > -1) {
        categoryCapabilities.splice(index, 1);
      }
    }

    console.log(
      `❌ Unregistered capability: ${metadata.name} (${capabilityId})`
    );
  }

  /**
   * Clear all registered capabilities
   */
  clear() {
    this.capabilities.clear();
    this.categorizedCapabilities.clear();
    this.initialized = false;
  }

  /**
   * Export registry as JSON
   *
   * @returns {Object} - Registry data
   */
  export() {
    return {
      capabilities: this.getAll(),
      categories: this.getCategories(),
      count: this.getCount(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get registry statistics
   *
   * @returns {Object} - Statistics
   */
  getStats() {
    const stats = {
      total: this.getCount(),
      byCategory: {},
      byRiskLevel: {},
      byMode: {
        assistant: 0,
        agent: 0,
        autonomous: 0,
      },
      withRollback: 0,
    };

    // Count by category
    for (const category of this.getCategories()) {
      stats.byCategory[category] = this.getByCategory(category).length;
    }

    // Count by risk level
    for (const metadata of this.getAll()) {
      stats.byRiskLevel[metadata.riskLevel] =
        (stats.byRiskLevel[metadata.riskLevel] || 0) + 1;

      // Count by mode
      if (metadata.modes.assistant) stats.byMode.assistant++;
      if (metadata.modes.agent) stats.byMode.agent++;
      if (metadata.modes.autonomous) stats.byMode.autonomous++;

      // Count rollback support
      if (metadata.rollback.supported) stats.withRollback++;
    }

    return stats;
  }
}

module.exports = CapabilityRegistry;
