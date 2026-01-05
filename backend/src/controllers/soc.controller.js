/**
 * SOC Controller - Security Operations Center API
 */

const { getSOCManager } = require('../security');

/**
 * Get SOC dashboard data
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const dashboard = soc.getDashboardData();
    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start SOC (all agents)
 */
exports.startSOC = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const result = soc.start();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Stop SOC (all agents)
 */
exports.stopSOC = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const result = soc.stop();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get status of all agents
 */
exports.getAgentStatuses = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const statuses = soc.getAgentStatuses();
    res.json({
      success: true,
      agents: statuses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a specific agent
 */
exports.startAgent = async (req, res, next) => {
  try {
    const { agentName } = req.params;
    const soc = getSOCManager();
    const result = soc.startAgent(agentName);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Stop a specific agent
 */
exports.stopAgent = async (req, res, next) => {
  try {
    const { agentName } = req.params;
    const soc = getSOCManager();
    const result = soc.stopAgent(agentName);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Simulate an attack
 */
exports.simulateAttack = async (req, res, next) => {
  try {
    const { attackType } = req.params;
    const params = req.body || {};
    
    const soc = getSOCManager();
    const result = soc.simulateAttack(attackType, params);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get attack simulation history
 */
exports.getSimulationHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const soc = getSOCManager();
    const history = soc.getSimulationHistory(limit);
    res.json({
      success: true,
      simulations: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all logs
 */
exports.getLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const soc = getSOCManager();
    const logs = soc.getAllLogs(limit);
    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get alerts
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const soc = getSOCManager();
    const alerts = soc.getAlerts(limit);
    res.json({
      success: true,
      alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge an alert
 */
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const soc = getSOCManager();
    const result = soc.acknowledgeAlert(alertId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get incidents
 */
exports.getIncidents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const soc = getSOCManager();
    const incidents = soc.agents.controller.getIncidents(status, limit);
    res.json({
      success: true,
      incidents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve an incident
 */
exports.resolveIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    const { resolution } = req.body;
    const soc = getSOCManager();
    const result = soc.agents.controller.resolveIncident(incidentId, resolution);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get security policies
 */
exports.getPolicies = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const policies = soc.agents.controller.getPolicies();
    res.json({
      success: true,
      policies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a security policy
 */
exports.updatePolicy = async (req, res, next) => {
  try {
    const { category } = req.params;
    const updates = req.body;
    const soc = getSOCManager();
    const result = soc.agents.controller.updatePolicy(category, updates);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get network metrics from sensor
 */
exports.getMetrics = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const metrics = soc.agents.sensor.getMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detected anomalies
 */
exports.getAnomalies = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const soc = getSOCManager();
    const anomalies = soc.agents.sensor.getAnomalies(limit);
    res.json({
      success: true,
      anomalies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attack signatures
 */
exports.getAttackSignatures = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const signatures = soc.agents.analyzer.getAttackSignatures();
    res.json({
      success: true,
      signatures,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Block an IP manually
 */
exports.blockIP = async (req, res, next) => {
  try {
    const { ip, reason } = req.body;
    const soc = getSOCManager();
    const result = soc.agents.defender.blockIP(ip, reason || 'Manual block');
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Unblock an IP
 */
exports.unblockIP = async (req, res, next) => {
  try {
    const { ip } = req.params;
    const soc = getSOCManager();
    const result = soc.agents.defender.unblockIP(ip);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Quarantine a node
 */
exports.quarantineNode = async (req, res, next) => {
  try {
    const { nodeId, reason } = req.body;
    const soc = getSOCManager();
    const result = soc.agents.defender.quarantineNode(nodeId, reason || 'Manual quarantine');
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Release a node from quarantine
 */
exports.releaseNode = async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const soc = getSOCManager();
    const result = soc.agents.defender.releaseNode(nodeId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle automated responses
 */
exports.setAutomatedResponses = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const soc = getSOCManager();
    const result = soc.agents.controller.setAutomatedResponses(enabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Configure LLM settings for Analyzer Agent
 */
exports.configureLLM = async (req, res, next) => {
  try {
    const { enabled, baseUrl, model, maxTokens, temperature } = req.body;
    const soc = getSOCManager();
    const config = {};
    
    if (enabled !== undefined) config.enabled = enabled;
    if (baseUrl) config.baseUrl = baseUrl;
    if (model) config.model = model;
    if (maxTokens) config.maxTokens = maxTokens;
    if (temperature !== undefined) config.temperature = temperature;
    
    soc.agents.analyzer.setLLMConfig(config);
    
    res.json({
      success: true,
      message: 'LLM configuration updated',
      config: soc.agents.analyzer.llmConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get LLM configuration
 */
exports.getLLMConfig = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    res.json({
      success: true,
      config: soc.agents.analyzer.llmConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze event with LLM (Mistral 7B Instruct)
 */
exports.analyzeWithLLM = async (req, res, next) => {
  try {
    const { event } = req.body;
    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event data is required',
      });
    }
    
    const soc = getSOCManager();
    const analysis = await soc.agents.analyzer.analyzeEventWithLLM(event);
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Mistral AI decisions history
 */
exports.getMistralDecisions = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const soc = getSOCManager();
    const decisions = soc.agents.analyzer.getMistralDecisions(parseInt(limit));
    
    res.json({
      success: true,
      data: decisions,
      count: decisions.length,
      model: 'mistral-7b-instruct',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Mistral status and availability
 */
exports.getMistralStatus = async (req, res, next) => {
  try {
    const soc = getSOCManager();
    const analyzer = soc.agents.analyzer;
    
    // Re-check availability
    await analyzer.checkMistralAvailability();
    
    res.json({
      success: true,
      mistral: {
        available: analyzer.mistralAvailable,
        config: {
          enabled: analyzer.llmConfig.enabled,
          model: analyzer.llmConfig.model,
          baseUrl: analyzer.llmConfig.baseUrl,
        },
        stats: {
          totalAnalyses: analyzer.stats.llmAnalyses,
          totalDecisions: analyzer.stats.mistralDecisions,
          recentDecisions: analyzer.mistralDecisions.slice(0, 5),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
