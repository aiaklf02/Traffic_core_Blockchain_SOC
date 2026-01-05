/**
 * SOC MANAGER - Security Operations Center
 * 
 * Central manager that coordinates all security agents
 * and provides unified API for security operations
 * 
 * NOW WITH BLOCKCHAIN INTEGRATION:
 * - Security incidents are recorded on Hyperledger Fabric
 * - Defense actions are immutably logged
 * - Threat intelligence is stored on-chain
 */

const EventEmitter = require('events');
const { DefenderAgent, SensorAgent, AnalyzerAgent, ControllerAgent } = require('./agents');
const { socBlockchainService } = require('./SOCBlockchainService');

class SOCManager extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    
    // Blockchain service for immutable logging
    this.blockchain = socBlockchainService;
    
    // Initialize agents
    this.agents = {
      defender: new DefenderAgent(),
      sensor: new SensorAgent(),
      analyzer: new AnalyzerAgent(),
      controller: new ControllerAgent(),
    };
    
    // SOC state
    this.status = 'inactive';
    this.startTime = null;
    this.alerts = [];
    this.globalLogs = [];
    
    // Attack simulation history
    this.attackSimulations = [];
    
    // Blockchain-recorded incidents (IDs)
    this.recordedIncidents = [];
    this.recordedActions = [];
    
    // Setup agent interconnections
    this.setupAgentConnections();
  }

  /**
   * Setup connections between agents
   */
  setupAgentConnections() {
    // Connect all agents to controller
    this.agents.controller.connectAgent('defender', this.agents.defender);
    this.agents.controller.connectAgent('sensor', this.agents.sensor);
    this.agents.controller.connectAgent('analyzer', this.agents.analyzer);
    
    // Forward all agent logs to global log
    Object.values(this.agents).forEach(agent => {
      agent.on('log', (entry) => {
        this.globalLogs.push(entry);
        if (this.globalLogs.length > 2000) this.globalLogs.shift();
        
        if (entry.level === 'alert' || entry.level === 'error') {
          this.createAlert(entry);
        }
        
        this.emit('log', entry);
      });
    });
    
    // Forward important events AND record on blockchain
    this.agents.sensor.on('anomaly_detected', (anomaly) => {
      this.emit('anomaly', anomaly);
      // Record anomaly as potential incident on blockchain
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        this.recordIncidentOnChain({
          type: 'anomaly',
          severity: anomaly.severity,
          description: anomaly.message || 'Anomaly detected by sensor',
          detectedBy: 'SensorAgent',
          threatScore: anomaly.threatScore || 0.6,
        });
      }
    });
    
    this.agents.analyzer.on('threat_identified', (analysis) => {
      this.emit('threat', analysis);
      // Record confirmed threats on blockchain
      this.recordIncidentOnChain({
        type: analysis.threatType || 'threat',
        severity: analysis.severity || 'high',
        description: analysis.summary || analysis.message,
        detectedBy: 'AnalyzerAgent',
        threatScore: analysis.threatScore || 0.7,
        llmAnalysis: analysis.llmResponse || '',
      });
    });
    
    this.agents.controller.on('incident_created', (incident) => {
      this.emit('incident', incident);
      // Record incident on blockchain
      this.recordIncidentOnChain({
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        detectedBy: 'ControllerAgent',
        threatScore: incident.threatScore || 0.8,
      });
    });
    
    // Record defense actions on blockchain
    this.agents.defender.on('ip_blocked', (data) => {
      this.createAlert({
        level: 'warn',
        agent: 'Defender',
        message: `IP blocked: ${data.ip} - ${data.reason}`,
        timestamp: new Date().toISOString(),
      });
      // Record on blockchain
      this.recordDefenseActionOnChain({
        actionType: 'block_ip',
        target: data.ip,
        reason: data.reason,
        executedBy: 'DefenderAgent',
        duration: 300, // 5 minutes
        autoExpires: true,
      });
    });
    
    this.agents.defender.on('node_quarantined', (data) => {
      this.recordDefenseActionOnChain({
        actionType: 'quarantine_node',
        target: data.nodeId,
        reason: data.reason,
        executedBy: 'DefenderAgent',
        duration: 600, // 10 minutes
        autoExpires: true,
      });
    });
  }

  /**
   * Record incident on blockchain (async, non-blocking)
   */
  async recordIncidentOnChain(incident) {
    try {
      const result = await this.blockchain.recordIncident(incident);
      if (result.success) {
        this.recordedIncidents.push(result.id);
        const logMsg = `📋 BLOCKCHAIN: Incident ${result.id} recorded (${incident.type}, ${incident.severity})`;
        this.log('info', logMsg);
        // Add specific blockchain log entry
        this.globalLogs.push({
          timestamp: new Date().toISOString(),
          agent: 'Blockchain',
          level: 'info',
          message: logMsg,
          blockchain: true,
          data: { incidentId: result.id, type: incident.type, severity: incident.severity }
        });
      } else if (result.queued) {
        this.log('warn', `⏳ BLOCKCHAIN: Incident ${result.id} queued for later (blockchain unavailable)`);
      }
      return result;
    } catch (error) {
      this.log('warn', `❌ BLOCKCHAIN: Failed to record incident - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record defense action on blockchain (async, non-blocking)
   */
  async recordDefenseActionOnChain(action) {
    try {
      const result = await this.blockchain.recordDefenseAction(action);
      if (result.success) {
        this.recordedActions.push(result.id);
        const logMsg = `🛡️ BLOCKCHAIN: Defense action ${result.id} recorded (${action.actionType} on ${action.target})`;
        this.log('info', logMsg);
        // Add specific blockchain log entry
        this.globalLogs.push({
          timestamp: new Date().toISOString(),
          agent: 'Blockchain',
          level: 'info',
          message: logMsg,
          blockchain: true,
          data: { actionId: result.id, actionType: action.actionType, target: action.target }
        });
      } else if (result.queued) {
        this.log('warn', `⏳ BLOCKCHAIN: Defense action ${result.id} queued for later`);
      }
      return result;
    } catch (error) {
      this.log('warn', `❌ BLOCKCHAIN: Failed to record action - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create an alert
   */
  createAlert(entry) {
    const alert = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      acknowledged: false,
    };
    
    this.alerts.push(alert);
    if (this.alerts.length > 500) this.alerts.shift();
    
    this.emit('alert', alert);
    return alert;
  }

  /**
   * Start all agents
   */
  start() {
    if (this.status === 'active') {
      return { success: false, message: 'SOC already active' };
    }
    
    this.status = 'active';
    this.startTime = new Date();
    
    // Start all agents
    Object.values(this.agents).forEach(agent => agent.start());
    
    this.log('info', '🛡️ SOC ACTIVATED - All security agents online');
    this.initialized = true;
    
    return { 
      success: true, 
      message: 'SOC activated',
      agents: this.getAgentStatuses(),
    };
  }

  /**
   * Stop all agents
   */
  stop() {
    this.status = 'inactive';
    
    // Stop all agents
    Object.values(this.agents).forEach(agent => agent.stop());
    
    this.log('info', 'SOC deactivated - All agents offline');
    
    return { 
      success: true, 
      message: 'SOC deactivated',
    };
  }

  /**
   * Start a specific agent
   */
  startAgent(agentName) {
    const agent = this.agents[agentName];
    if (!agent) {
      return { success: false, message: `Agent ${agentName} not found` };
    }
    
    agent.start();
    return { success: true, message: `${agentName} agent started` };
  }

  /**
   * Stop a specific agent
   */
  stopAgent(agentName) {
    const agent = this.agents[agentName];
    if (!agent) {
      return { success: false, message: `Agent ${agentName} not found` };
    }
    
    agent.stop();
    return { success: true, message: `${agentName} agent stopped` };
  }

  /**
   * Get status of all agents
   */
  getAgentStatuses() {
    const statuses = {};
    for (const [name, agent] of Object.entries(this.agents)) {
      statuses[name] = agent.getStatus();
    }
    return statuses;
  }

  /**
   * Simulate a blockchain attack
   */
  simulateAttack(attackType, params = {}) {
    const attackSimulation = {
      id: `SIM-${Date.now()}`,
      type: attackType,
      startTime: new Date().toISOString(),
      params,
      results: null,
      status: 'running',
    };
    
    this.log('warn', `⚔️ ATTACK SIMULATION STARTED: ${attackType}`);
    
    const simulations = {
      sybil: () => this.simulateSybilAttack(params),
      '51_percent': () => this.simulate51PercentAttack(params),
      double_spending: () => this.simulateDoubleSpending(params),
      ddos: () => this.simulateDDoSAttack(params),
      replay: () => this.simulateReplayAttack(params),
      eclipse: () => this.simulateEclipseAttack(params),
    };
    
    const simulation = simulations[attackType];
    if (!simulation) {
      return { success: false, message: `Unknown attack type: ${attackType}` };
    }
    
    // Execute simulation
    const results = simulation();
    
    attackSimulation.results = results;
    attackSimulation.status = 'completed';
    attackSimulation.endTime = new Date().toISOString();
    attackSimulation.duration = Date.now() - new Date(attackSimulation.startTime).getTime();
    
    this.attackSimulations.push(attackSimulation);
    if (this.attackSimulations.length > 100) this.attackSimulations.shift();
    
    this.log('info', `Attack simulation completed: ${attackType}`);
    
    return {
      success: true,
      simulation: attackSimulation,
    };
  }

  /**
   * Simulate Sybil Attack
   */
  simulateSybilAttack(params) {
    const fakeNodes = params.nodeCount || 10;
    const sourceIP = params.sourceIP || '192.168.1.100';
    
    // Create event for analyzer
    const event = {
      type: 'node_registration',
      identityCount: fakeNodes,
      registrationRate: fakeNodes,
      sourceIP,
      behaviorSimilarity: 0.95,
      suspiciousNodes: Array.from({ length: fakeNodes }, (_, i) => `fake-node-${i}`),
    };
    
    // Analyze the event
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    // Sensor detects anomaly
    this.agents.sensor.reportAnomaly({
      type: 'rapid_node_registration',
      severity: 'high',
      source: sourceIP,
      message: `${fakeNodes} nodes registered from single source`,
    });
    
    return {
      attackType: 'sybil',
      fakeNodesCreated: fakeNodes,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      defenseTriggered: this.agents.defender.blockedIPs.has(sourceIP),
    };
  }

  /**
   * Simulate 51% Attack
   */
  simulate51PercentAttack(params) {
    const maliciousHashRate = params.hashRate || 0.55;
    const blocksWithheld = params.blocks || 5;
    
    const event = {
      type: 'consensus_anomaly',
      hashRateConcentration: maliciousHashRate,
      topMinerShare: maliciousHashRate,
      orphanBlockRate: 0.15,
      reorgDepth: blocksWithheld,
      maliciousNodes: ['node-attacker-1', 'node-attacker-2'],
    };
    
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    this.agents.sensor.reportAnomaly({
      type: 'hashrate_concentration',
      severity: 'critical',
      source: 'consensus-layer',
      message: `Single entity controls ${(maliciousHashRate * 100).toFixed(1)}% of hashrate`,
    });
    
    return {
      attackType: '51_percent',
      maliciousHashRate: `${(maliciousHashRate * 100).toFixed(1)}%`,
      blocksWithheld,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      chainReorganization: blocksWithheld > 3,
    };
  }

  /**
   * Simulate Double Spending Attack
   */
  simulateDoubleSpending(params) {
    const transactionValue = params.value || 1000;
    const targetAddress = params.target || '0xVictim123';
    
    const event = {
      type: 'transaction_conflict',
      duplicateInputs: true,
      conflictingTransactions: 2,
      unconfirmedSpends: 3,
      sourceAddress: '0xAttacker456',
      value: transactionValue,
    };
    
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    this.agents.sensor.reportAnomaly({
      type: 'conflicting_transactions',
      severity: 'critical',
      source: '0xAttacker456',
      message: `Double spend attempt: ${transactionValue} units to ${targetAddress}`,
    });
    
    return {
      attackType: 'double_spending',
      value: transactionValue,
      targetAddress,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      transactionFrozen: true,
    };
  }

  /**
   * Simulate DDoS Attack
   */
  simulateDDoSAttack(params) {
    const requestRate = params.rate || 5000;
    const attackingIPs = params.ips || ['10.0.0.1', '10.0.0.2', '10.0.0.3'];
    
    const event = {
      type: 'traffic_spike',
      txRate: requestRate,
      txPerSecond: requestRate,
      pendingTxCount: 15000,
      connectionAttempts: 800,
      attackingIPs,
    };
    
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    // Trigger rate limit checks for each IP
    attackingIPs.forEach(ip => {
      for (let i = 0; i < 150; i++) {
        this.agents.defender.checkRateLimit(ip);
      }
    });
    
    this.agents.sensor.reportAnomaly({
      type: 'transaction_flood',
      severity: 'high',
      source: attackingIPs.join(', '),
      message: `DDoS attack: ${requestRate} requests/second from ${attackingIPs.length} sources`,
    });
    
    return {
      attackType: 'ddos',
      requestRate,
      attackingIPs,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      ipsBlocked: attackingIPs.filter(ip => this.agents.defender.blockedIPs.has(ip)),
    };
  }

  /**
   * Simulate Replay Attack
   */
  simulateReplayAttack(params) {
    const transactionId = params.txId || 'TX-OLD-12345';
    const originalTimestamp = params.timestamp || Date.now() - 7200000; // 2 hours ago
    
    const event = {
      type: 'old_transaction',
      txAge: Date.now() - originalTimestamp,
      duplicateSignatures: true,
      oldTimestamps: true,
      invalidNonce: true,
      transactionId,
    };
    
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    this.agents.sensor.reportAnomaly({
      type: 'replay_attempt',
      severity: 'medium',
      source: transactionId,
      message: `Replay attack: Transaction ${transactionId} is ${Math.round((Date.now() - originalTimestamp) / 60000)} minutes old`,
    });
    
    return {
      attackType: 'replay',
      transactionId,
      transactionAge: `${Math.round((Date.now() - originalTimestamp) / 60000)} minutes`,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      transactionRejected: true,
    };
  }

  /**
   * Simulate Eclipse Attack
   */
  simulateEclipseAttack(params) {
    const targetNode = params.node || 'peer0.org1.traffic.com';
    const maliciousPeers = params.peers || 8;
    
    const event = {
      type: 'network_isolation',
      singleSourceConnections: 0.9,
      peerDiversity: 0.1,
      networkPartition: true,
      isolatedNodes: [targetNode],
    };
    
    const analysis = this.agents.analyzer.analyzeEvent(event);
    
    this.agents.sensor.reportAnomaly({
      type: 'peer_isolation',
      severity: 'high',
      source: targetNode,
      message: `Eclipse attack: ${targetNode} surrounded by ${maliciousPeers} malicious peers`,
    });
    
    return {
      attackType: 'eclipse',
      targetNode,
      maliciousPeers,
      detected: analysis.threats.length > 0,
      threatAnalysis: analysis,
      peerDiversificationTriggered: true,
    };
  }

  /**
   * Get SOC dashboard data
   */
  getDashboardData() {
    return {
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      agents: this.getAgentStatuses(),
      alerts: this.alerts.slice(-20),
      recentIncidents: this.agents.controller.getIncidents(null, 10),
      metrics: this.agents.sensor.getMetrics(),
      recentSimulations: this.attackSimulations.slice(-5),
      // Blockchain integration stats
      blockchain: {
        connected: this.blockchain.isBlockchainAvailable(),
        recordedIncidents: this.recordedIncidents.length,
        recordedActions: this.recordedActions.length,
        pendingRecords: this.blockchain.pendingRecords.length,
      },
    };
  }

  /**
   * Get blockchain security stats
   */
  async getBlockchainSecurityStats() {
    return {
      recordedIncidents: this.recordedIncidents,
      recordedActions: this.recordedActions,
      stats: await this.blockchain.getSecurityStats(),
    };
  }

  /**
   * Get incident from blockchain
   */
  async getIncidentFromBlockchain(incidentId) {
    return await this.blockchain.getIncident(incidentId);
  }

  /**
   * Get incident history from blockchain
   */
  async getIncidentHistory(incidentId) {
    return await this.blockchain.getIncidentHistory(incidentId);
  }

  /**
   * Process pending blockchain records
   */
  async syncPendingToBlockchain() {
    return await this.blockchain.processPendingRecords();
  }

  /**
   * Get all logs from all agents
   */
  getAllLogs(limit = 100) {
    return this.globalLogs.slice(-limit);
  }

  /**
   * Get alerts
   */
  getAlerts(limit = 50) {
    return this.alerts.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return { success: true, alert };
    }
    return { success: false, message: 'Alert not found' };
  }

  /**
   * Get attack simulation history
   */
  getSimulationHistory(limit = 20) {
    return this.attackSimulations.slice(-limit);
  }

  log(level, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent: 'SOC',
      level,
      message,
    };
    this.globalLogs.push(entry);
    if (this.globalLogs.length > 2000) this.globalLogs.shift();
    this.emit('log', entry);
  }
}

// Singleton instance
let socInstance = null;

function getSOCManager() {
  if (!socInstance) {
    socInstance = new SOCManager();
  }
  return socInstance;
}

module.exports = { SOCManager, getSOCManager };
