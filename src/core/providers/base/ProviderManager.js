/**
 * 🦊 NOX Provider Manager
 * 
 * Central registry for all AI providers.
 * Manages provider registration, discovery, and routing.
 * 
 * @enterprise-grade Singleton pattern, plugin architecture, zero cross-contamination
 */

const IProvider = require('./IProvider');

class ProviderManager {
  constructor(logger, performanceMonitor) {
    // Singleton pattern
    if (ProviderManager.instance) {
      return ProviderManager.instance;
    }

    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.providers = new Map();
    this.currentProvider = null;
    this.initialized = false;

    ProviderManager.instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance(logger, performanceMonitor) {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager(logger, performanceMonitor);
    }
    return ProviderManager.instance;
  }

  // ============================================================================
  // PROVIDER REGISTRATION
  // ============================================================================

  /**
   * Register a provider
   * @param {string} providerId - Provider ID (e.g., "anthropic", "openai")
   * @param {Class} ProviderClass - Provider class (must extend IProvider)
   * @param {Object} config - Provider configuration
   */
  register(providerId, ProviderClass, config = {}) {
    // Validate that class extends IProvider
    if (!(ProviderClass.prototype instanceof IProvider)) {
      throw new Error(
        `Provider must extend IProvider: ${ProviderClass.name}`
      );
    }

    // Check for duplicate IDs
    if (this.providers.has(providerId)) {
      throw new Error(
        `Provider with ID ${providerId} is already registered`
      );
    }

    // Instantiate provider
    const providerInstance = new ProviderClass(
      config,
      this.logger,
      this.performanceMonitor
    );

    // Register provider
    this.providers.set(providerId, providerInstance);

    if (this.logger) {
      this.logger.info(
        `✅ Registered provider: ${providerInstance.getName()} (${providerId})`
      );
    }

    // Set as current provider if it's the first one
    if (!this.currentProvider) {
      this.currentProvider = providerId;
    }
  }

  /**
   * Register multiple providers at once
   * @param {Array<Object>} providerConfigs - Array of { id, class, config }
   */
  registerBatch(providerConfigs) {
    for (const { id, class: ProviderClass, config } of providerConfigs) {
      this.register(id, ProviderClass, config);
    }
  }

  /**
   * Unregister a provider
   * @param {string} providerId - Provider ID
   */
  unregister(providerId) {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    this.providers.delete(providerId);

    if (this.logger) {
      this.logger.info(
        `❌ Unregistered provider: ${provider.getName()} (${providerId})`
      );
    }

    // If this was the current provider, switch to another
    if (this.currentProvider === providerId) {
      const remaining = Array.from(this.providers.keys());
      this.currentProvider = remaining.length > 0 ? remaining[0] : null;
    }
  }

  /**
   * Clear all registered providers
   */
  clear() {
    this.providers.clear();
    this.currentProvider = null;
    this.initialized = false;
  }

  // ============================================================================
  // PROVIDER ACCESS
  // ============================================================================

  /**
   * Get provider instance by ID
   * @param {string} providerId - Provider ID
   * @returns {IProvider} - Provider instance
   */
  getProvider(providerId) {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return provider;
  }

  /**
   * Get current provider instance
   * @returns {IProvider} - Current provider instance
   */
  getCurrentProvider() {
    if (!this.currentProvider) {
      throw new Error("No provider is currently selected");
    }

    return this.getProvider(this.currentProvider);
  }

  /**
   * Set current provider
   * @param {string} providerId - Provider ID
   */
  setCurrentProvider(providerId) {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    this.currentProvider = providerId;

    if (this.logger) {
      const provider = this.getProvider(providerId);
      this.logger.info(
        `🔄 Current provider set to: ${provider.getName()} (${providerId})`
      );
    }
  }

  /**
   * Get current provider ID
   * @returns {string} - Current provider ID
   */
  getCurrentProviderId() {
    return this.currentProvider;
  }

  /**
   * Check if provider exists
   * @param {string} providerId - Provider ID
   * @returns {boolean}
   */
  hasProvider(providerId) {
    return this.providers.has(providerId);
  }

  // ============================================================================
  // PROVIDER DISCOVERY
  // ============================================================================

  /**
   * Get all registered provider IDs
   * @returns {Array<string>}
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all provider metadata
   * @returns {Array<Object>} - Array of { id, name, models, supportsTools, supportsStreaming }
   */
  getAllProviderInfo() {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.getName(),
      models: provider.getModels(),
      defaultModel: provider.getDefaultModel(),
      supportsToolCalling: provider.supportsToolCalling(),
      supportsStreaming: provider.supportsStreaming(),
      toolFormat: provider.supportsToolCalling() ? provider.getToolFormat() : null,
      maxTools: provider.supportsToolCalling() ? provider.getMaxTools() : 0
    }));
  }

  /**
   * Get providers that support tool calling
   * @returns {Array<string>} - Array of provider IDs
   */
  getProvidersWithToolSupport() {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.supportsToolCalling())
      .map(([id, _]) => id);
  }

  /**
   * Get providers that support streaming
   * @returns {Array<string>} - Array of provider IDs
   */
  getProvidersWithStreamingSupport() {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.supportsStreaming())
      .map(([id, _]) => id);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get statistics for all providers
   * @returns {Object} - Stats by provider ID
   */
  getAllStats() {
    const stats = {};
    
    for (const [id, provider] of this.providers.entries()) {
      if (typeof provider.getStats === 'function') {
        stats[id] = provider.getStats();
      }
    }

    return stats;
  }

  /**
   * Get statistics for current provider
   * @returns {Object} - Current provider stats
   */
  getCurrentProviderStats() {
    const provider = this.getCurrentProvider();
    
    if (typeof provider.getStats === 'function') {
      return provider.getStats();
    }

    return null;
  }

  /**
   * Reset statistics for all providers
   */
  resetAllStats() {
    for (const provider of this.providers.values()) {
      if (typeof provider.resetStats === 'function') {
        provider.resetStats();
      }
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate API key for a provider
   * @param {string} providerId - Provider ID
   * @param {string} apiKey - API key to validate
   * @returns {boolean}
   */
  validateApiKey(providerId, apiKey) {
    const provider = this.getProvider(providerId);
    return provider.validateApiKey(apiKey);
  }

  /**
   * Validate model for a provider
   * @param {string} providerId - Provider ID
   * @param {string} model - Model ID to validate
   * @returns {boolean}
   */
  validateModel(providerId, model) {
    const provider = this.getProvider(providerId);
    return provider.validateModel(model);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Mark manager as initialized
   */
  markInitialized() {
    this.initialized = true;
    
    if (this.logger) {
      this.logger.info(
        `🦊 Provider Manager initialized with ${this.providers.size} providers`
      );
    }
  }

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = ProviderManager;

