/**
 * 🦊 NOX Provider Base - Central Export
 * 
 * Exports all base provider infrastructure:
 * - IProvider: Interface contract
 * - BaseProvider: Shared functionality
 * - ProviderManager: Registry and routing
 */

const IProvider = require('./IProvider');
const BaseProvider = require('./BaseProvider');
const ProviderManager = require('./ProviderManager');

module.exports = {
  IProvider,
  BaseProvider,
  ProviderManager
};

