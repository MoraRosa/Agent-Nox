/**
 * 🦊 NOX Provider System - Central Export & Registration
 * 
 * This is the main entry point for the provider system.
 * It exports all providers and provides a convenient initialization function.
 * 
 * @enterprise-grade Modular, scalable, zero cross-contamination
 */

// Import base infrastructure
const { IProvider, BaseProvider, ProviderManager } = require('./base');

// Import all provider modules
const { ClaudeProvider, ClaudeConfig, ClaudeToolAdapter, ClaudeStreamParser } = require('./claude');
const { OpenAIProvider, OpenAIConfig, OpenAIToolAdapter, OpenAIStreamParser } = require('./openai');
const { DeepSeekProvider, DeepSeekConfig, DeepSeekStreamParser } = require('./deepseek');
const { LocalProvider, LocalConfig, LocalStreamParser } = require('./local');

/**
 * Initialize the provider system
 * Registers all providers with the ProviderManager
 * 
 * @param {Object} logger - Logger instance
 * @param {Object} performanceMonitor - Performance monitor instance
 * @returns {ProviderManager} - Initialized provider manager
 */
function initializeProviders(logger, performanceMonitor) {
  // Get or create provider manager instance
  const providerManager = ProviderManager.getInstance(logger, performanceMonitor);

  // Register all providers
  providerManager.register('anthropic', ClaudeProvider, {});
  providerManager.register('openai', OpenAIProvider, {});
  providerManager.register('deepseek', DeepSeekProvider, {});
  providerManager.register('local', LocalProvider, {});

  // Mark as initialized
  providerManager.markInitialized();

  if (logger) {
    logger.info('🦊 NOX Provider System initialized with 4 providers:');
    logger.info('  ✅ Anthropic Claude (anthropic)');
    logger.info('  ✅ OpenAI GPT (openai)');
    logger.info('  ✅ DeepSeek (deepseek)');
    logger.info('  ✅ Local LLM (local)');
  }

  return providerManager;
}

/**
 * Get provider manager instance (must be initialized first)
 * @returns {ProviderManager}
 */
function getProviderManager() {
  return ProviderManager.getInstance();
}

// Export everything
module.exports = {
  // Base infrastructure
  IProvider,
  BaseProvider,
  ProviderManager,

  // Provider classes
  ClaudeProvider,
  OpenAIProvider,
  DeepSeekProvider,
  LocalProvider,

  // Provider configs
  ClaudeConfig,
  OpenAIConfig,
  DeepSeekConfig,
  LocalConfig,

  // Tool adapters
  ClaudeToolAdapter,
  OpenAIToolAdapter,

  // Stream parsers
  ClaudeStreamParser,
  OpenAIStreamParser,
  DeepSeekStreamParser,
  LocalStreamParser,

  // Initialization functions
  initializeProviders,
  getProviderManager,
};

