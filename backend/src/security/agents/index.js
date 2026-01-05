/**
 * SECURITY AGENTS INDEX
 * Exports all security agents
 */

const DefenderAgent = require('./DefenderAgent');
const SensorAgent = require('./SensorAgent');
const AnalyzerAgent = require('./AnalyzerAgent');
const ControllerAgent = require('./ControllerAgent');

module.exports = {
  DefenderAgent,
  SensorAgent,
  AnalyzerAgent,
  ControllerAgent,
};
