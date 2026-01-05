/**
 * SECURITY INDEX
 * Exports all security components
 */

const { SOCManager, getSOCManager } = require('./SOCManager');
const { socBlockchainService, SOCBlockchainService } = require('./SOCBlockchainService');
const agents = require('./agents');

module.exports = {
  SOCManager,
  getSOCManager,
  socBlockchainService,
  SOCBlockchainService,
  agents,
};
