/**
 * SOC Routes - Security Operations Center API Routes
 */

const express = require('express');
const router = express.Router();
const socController = require('../controllers/soc.controller');

// Dashboard
router.get('/dashboard', socController.getDashboard);

// SOC Control
router.post('/start', socController.startSOC);
router.post('/stop', socController.stopSOC);

// Agents
router.get('/agents', socController.getAgentStatuses);
router.post('/agents/:agentName/start', socController.startAgent);
router.post('/agents/:agentName/stop', socController.stopAgent);

// Attack Simulation
router.post('/simulate/:attackType', socController.simulateAttack);
router.get('/simulations', socController.getSimulationHistory);

// Logs & Alerts
router.get('/logs', socController.getLogs);
router.get('/alerts', socController.getAlerts);
router.post('/alerts/:alertId/acknowledge', socController.acknowledgeAlert);

// Incidents
router.get('/incidents', socController.getIncidents);
router.post('/incidents/:incidentId/resolve', socController.resolveIncident);

// Policies
router.get('/policies', socController.getPolicies);
router.put('/policies/:category', socController.updatePolicy);

// Metrics & Anomalies
router.get('/metrics', socController.getMetrics);
router.get('/anomalies', socController.getAnomalies);

// Attack Signatures
router.get('/signatures', socController.getAttackSignatures);

// Defender Actions
router.post('/block-ip', socController.blockIP);
router.delete('/block-ip/:ip', socController.unblockIP);
router.post('/quarantine', socController.quarantineNode);
router.delete('/quarantine/:nodeId', socController.releaseNode);

// Automated Responses
router.post('/automated-responses', socController.setAutomatedResponses);

// LLM Configuration (Mistral 7B Instruct via LM Studio)
router.get('/llm/config', socController.getLLMConfig);
router.post('/llm/config', socController.configureLLM);
router.post('/llm/analyze', socController.analyzeWithLLM);

// Mistral Decisions
router.get('/mistral/decisions', socController.getMistralDecisions);
router.get('/mistral/status', socController.getMistralStatus);

module.exports = router;
