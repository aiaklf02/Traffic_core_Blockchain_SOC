/**
 * CONTROLLER AGENT - Security Policy & Response Orchestration
 * 
 * Responsibilities:
 * - Define and enforce security policies
 * - Orchestrate responses to threats
 * - Coordinate between agents
 * - Manage incident response
 */

const EventEmitter = require('events');

class ControllerAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'Controller';
    this.status = 'inactive';
    this.policies = this.loadDefaultPolicies();
    this.incidents = [];
    this.responseQueue = [];
    this.automatedResponses = true;
    this.stats = {
      policiesEnforced: 0,
      incidentsHandled: 0,
      responsesExecuted: 0,
      escalations: 0,
    };
    this.connectedAgents = {
      defender: null,
      sensor: null,
      analyzer: null,
    };
    this.logs = [];
  }

  /**
   * Load default security policies
   */
  loadDefaultPolicies() {
    return {
      authentication: {
        maxFailedAttempts: 5,
        lockoutDuration: 300000, // 5 minutes
        requireMFA: false,
        sessionTimeout: 3600000, // 1 hour
      },
      rateLimit: {
        requestsPerMinute: 100,
        burstLimit: 150,
        penaltyDuration: 60000,
      },
      transaction: {
        maxPendingPerEntity: 10,
        maxValueWithoutVerification: 10000,
        requireMultiSig: false,
        cooldownPeriod: 1000,
      },
      network: {
        minPeers: 3,
        maxPeers: 50,
        connectionTimeout: 30000,
        heartbeatInterval: 10000,
      },
      incident: {
        autoEscalate: true,
        escalationThreshold: 'high',
        notifyAdmins: true,
        logRetention: 30, // days
      },
      response: {
        autoBlock: true,
        autoQuarantine: true,
        requireApproval: false,
        maxAutomatedActions: 10,
      },
    };
  }

  start() {
    this.status = 'active';
    this.log('info', 'Controller Agent activated - Security orchestration online');
    this.emit('started', { agent: this.name });
    
    // Start response processing
    this.responseInterval = setInterval(() => this.processResponseQueue(), 1000);
    
    return { success: true, message: 'Controller Agent started' };
  }

  stop() {
    this.status = 'inactive';
    this.log('info', 'Controller Agent deactivated');
    this.emit('stopped', { agent: this.name });
    
    if (this.responseInterval) {
      clearInterval(this.responseInterval);
    }
    
    return { success: true, message: 'Controller Agent stopped' };
  }

  /**
   * Connect other agents to controller
   */
  connectAgent(agentName, agent) {
    this.connectedAgents[agentName] = agent;
    
    // Subscribe to agent events
    if (agent) {
      agent.on('log', (entry) => this.handleAgentLog(agentName, entry));
      
      if (agentName === 'sensor') {
        agent.on('anomaly_detected', (anomaly) => this.handleAnomaly(anomaly));
      }
      
      if (agentName === 'analyzer') {
        agent.on('threat_identified', (analysis) => this.handleThreat(analysis));
        agent.on('coordinated_attack', (correlation) => this.handleCoordinatedAttack(correlation));
      }
    }
    
    this.log('info', `Connected to ${agentName} agent`);
    return { success: true, message: `${agentName} agent connected` };
  }

  /**
   * Handle log from connected agent
   */
  handleAgentLog(agentName, entry) {
    if (entry.level === 'alert' || entry.level === 'error') {
      this.emit('agent_alert', { agent: agentName, entry });
    }
  }

  /**
   * Handle detected anomaly from sensor
   */
  handleAnomaly(anomaly) {
    this.log('warn', `Anomaly received from Sensor: ${anomaly.type}`);
    
    // Create incident if severity is high enough
    if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
      this.createIncident({
        type: 'anomaly',
        source: 'sensor',
        data: anomaly,
        severity: anomaly.severity,
      });
    }
    
    // Queue automated response if enabled
    if (this.automatedResponses && this.policies.response.autoBlock) {
      this.queueResponse({
        type: 'investigate',
        target: anomaly.source,
        reason: anomaly.message,
        priority: anomaly.severity === 'critical' ? 1 : 2,
      });
    }
  }

  /**
   * Handle identified threat from analyzer
   */
  handleThreat(analysis) {
    this.log('alert', `Threat received from Analyzer: ${analysis.threats.map(t => t.name).join(', ')}`);
    
    // Create incident
    const incident = this.createIncident({
      type: 'threat',
      source: 'analyzer',
      data: analysis,
      severity: analysis.riskScore > 80 ? 'critical' : analysis.riskScore > 50 ? 'high' : 'medium',
    });
    
    // Execute response for each threat
    analysis.threats.forEach(threat => {
      if (this.automatedResponses) {
        this.executeAutomatedResponse(threat, analysis);
      }
    });
    
    // Apply recommendations
    analysis.recommendations.forEach(rec => {
      if (rec.priority === 'critical') {
        this.log('alert', `CRITICAL RECOMMENDATION: ${rec.action} - ${rec.description}`);
      }
    });
    
    return incident;
  }

  /**
   * Handle coordinated attack detection
   */
  handleCoordinatedAttack(correlation) {
    this.log('alert', `🚨 COORDINATED ATTACK: ${correlation.correlatedThreats.length} correlated threats`);
    
    // Create high-priority incident
    const incident = this.createIncident({
      type: 'coordinated_attack',
      source: 'analyzer',
      data: correlation,
      severity: 'critical',
    });
    
    // Escalate immediately
    this.escalateIncident(incident.id);
    
    // Execute defensive measures
    if (this.automatedResponses) {
      this.queueResponse({
        type: 'lockdown',
        reason: 'Coordinated attack detected',
        priority: 0, // Highest priority
      });
    }
    
    return incident;
  }

  /**
   * Create a new incident
   */
  createIncident(data) {
    const incident = {
      id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'open',
      ...data,
      assignee: null,
      actions: [],
      notes: [],
    };
    
    this.incidents.push(incident);
    if (this.incidents.length > 1000) {
      this.incidents.shift();
    }
    
    this.stats.incidentsHandled++;
    this.log('info', `Incident created: ${incident.id} (${incident.severity})`);
    this.emit('incident_created', incident);
    
    // Auto-escalate if configured
    if (this.policies.incident.autoEscalate && 
        (incident.severity === 'critical' || incident.severity === this.policies.incident.escalationThreshold)) {
      this.escalateIncident(incident.id);
    }
    
    return incident;
  }

  /**
   * Escalate an incident
   */
  escalateIncident(incidentId) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return { success: false, message: 'Incident not found' };
    
    incident.escalated = true;
    incident.escalatedAt = new Date().toISOString();
    this.stats.escalations++;
    
    this.log('alert', `🔺 INCIDENT ESCALATED: ${incidentId}`);
    this.emit('incident_escalated', incident);
    
    // Notify admins
    if (this.policies.incident.notifyAdmins) {
      this.emit('admin_notification', {
        type: 'incident_escalation',
        incident,
        message: `Critical incident requires attention: ${incident.type}`,
      });
    }
    
    return { success: true, message: 'Incident escalated' };
  }

  /**
   * Execute automated response to threat
   */
  executeAutomatedResponse(threat, analysis) {
    const responses = {
      sybil: () => {
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: 'sybil',
            sourceIP: analysis.event?.sourceIP,
            nodeIds: analysis.event?.suspiciousNodes,
          });
        }
      },
      '51_percent': () => {
        // Critical - require manual intervention
        this.log('alert', '⚠️ 51% attack - manual intervention required');
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: '51_percent',
            nodeIds: analysis.event?.maliciousNodes,
          });
        }
      },
      double_spending: () => {
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: 'double_spending',
            sourceAddress: analysis.event?.sourceAddress,
          });
        }
      },
      ddos: () => {
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: 'ddos',
            sourceIPs: analysis.event?.attackingIPs,
          });
        }
      },
      replay: () => {
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: 'replay',
          });
        }
      },
      eclipse: () => {
        if (this.connectedAgents.defender) {
          this.connectedAgents.defender.respondToAttack({
            type: 'eclipse',
            isolatedNodes: analysis.event?.isolatedNodes,
          });
        }
      },
    };
    
    const response = responses[threat.type];
    if (response) {
      response();
      this.stats.responsesExecuted++;
      this.log('info', `Automated response executed for ${threat.type}`);
    }
  }

  /**
   * Queue a response for processing
   */
  queueResponse(response) {
    response.queuedAt = new Date().toISOString();
    response.status = 'pending';
    this.responseQueue.push(response);
    this.responseQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Process response queue
   */
  processResponseQueue() {
    if (this.responseQueue.length === 0) return;
    
    const response = this.responseQueue.shift();
    this.executeResponse(response);
  }

  /**
   * Execute a response action
   */
  executeResponse(response) {
    this.log('info', `Executing response: ${response.type}`);
    
    switch (response.type) {
      case 'block':
        if (this.connectedAgents.defender && response.target) {
          this.connectedAgents.defender.blockIP(response.target, response.reason);
        }
        break;
      case 'quarantine':
        if (this.connectedAgents.defender && response.target) {
          this.connectedAgents.defender.quarantineNode(response.target, response.reason);
        }
        break;
      case 'investigate':
        this.log('info', `Investigating: ${response.target} - ${response.reason}`);
        break;
      case 'lockdown':
        this.log('alert', '🔒 INITIATING NETWORK LOCKDOWN');
        // Reduce rate limits drastically
        this.updatePolicy('rateLimit', { requestsPerMinute: 10, burstLimit: 15 });
        break;
    }
    
    response.status = 'executed';
    response.executedAt = new Date().toISOString();
    this.stats.responsesExecuted++;
  }

  /**
   * Update a security policy
   */
  updatePolicy(category, updates) {
    if (!this.policies[category]) {
      return { success: false, message: `Policy category ${category} not found` };
    }
    
    this.policies[category] = { ...this.policies[category], ...updates };
    this.stats.policiesEnforced++;
    
    this.log('info', `Policy updated: ${category}`);
    this.emit('policy_updated', { category, updates });
    
    return { success: true, message: 'Policy updated', policy: this.policies[category] };
  }

  /**
   * Get all policies
   */
  getPolicies() {
    return this.policies;
  }

  /**
   * Resolve an incident
   */
  resolveIncident(incidentId, resolution) {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return { success: false, message: 'Incident not found' };
    
    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();
    incident.resolution = resolution;
    
    this.log('info', `Incident resolved: ${incidentId}`);
    this.emit('incident_resolved', incident);
    
    return { success: true, message: 'Incident resolved', incident };
  }

  /**
   * Get open incidents
   */
  getOpenIncidents() {
    return this.incidents.filter(i => i.status === 'open');
  }

  /**
   * Enable/disable automated responses
   */
  setAutomatedResponses(enabled) {
    this.automatedResponses = enabled;
    this.log('info', `Automated responses ${enabled ? 'enabled' : 'disabled'}`);
    return { success: true, automatedResponses: this.automatedResponses };
  }

  log(level, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent: this.name,
      level,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 1000) this.logs.shift();
    this.emit('log', entry);
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      stats: this.stats,
      automatedResponses: this.automatedResponses,
      openIncidents: this.getOpenIncidents().length,
      pendingResponses: this.responseQueue.length,
      connectedAgents: Object.keys(this.connectedAgents).filter(k => this.connectedAgents[k] !== null),
    };
  }

  getIncidents(status = null, limit = 50) {
    let incidents = this.incidents;
    if (status) {
      incidents = incidents.filter(i => i.status === status);
    }
    return incidents.slice(-limit);
  }

  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }
}

module.exports = ControllerAgent;
