/**
 * ANALYZER AGENT - Threat Analysis & Pattern Recognition
 * 
 * Responsibilities:
 * - Analyze transaction patterns
 * - Detect attack signatures
 * - LLM-based threat detection using Mistral 7B Instruct (LM Studio)
 * - Behavioral analysis
 */

const EventEmitter = require('events');

class AnalyzerAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'Analyzer';
    this.status = 'inactive';
    this.attackSignatures = this.loadAttackSignatures();
    this.behaviorProfiles = new Map(); // entityId -> behavior profile
    this.threatScores = new Map(); // entityId -> threat score
    this.analysisHistory = [];
    this.mistralDecisions = []; // Store Mistral AI decisions
    this.stats = {
      analysesPerformed: 0,
      threatsIdentified: 0,
      falsePositives: 0,
      accuracy: 0.95,
      llmAnalyses: 0,
      mistralDecisions: 0,
    };
    this.logs = [];
    
    // LM Studio configuration (Mistral 7B Instruct)
    this.llmConfig = {
      enabled: true,
      baseUrl: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
      model: process.env.LM_STUDIO_MODEL || 'mistral-7b-instruct-v0.2',
      maxTokens: 1024,
      temperature: 0.3,
    };
    
    // Check Mistral availability on startup
    this.mistralAvailable = false;
    this.checkMistralAvailability();
  }

  /**
   * Check if Mistral (LM Studio) is available
   */
  async checkMistralAvailability() {
    try {
      const response = await fetch(`${this.llmConfig.baseUrl}/models`, {
        method: 'GET',
        timeout: 5000,
      });
      this.mistralAvailable = response.ok;
      if (this.mistralAvailable) {
        this.log('info', '🤖 Mistral LLM connected via LM Studio');
      }
    } catch (error) {
      this.mistralAvailable = false;
      this.log('warn', '⚠️ Mistral LLM not available - using rule-based analysis');
    }
  }

  /**
   * Get Mistral decisions history
   */
  getMistralDecisions(limit = 50) {
    return this.mistralDecisions.slice(-limit);
  }

  /**
   * Call LM Studio API (Mistral 7B Instruct) for advanced threat analysis
   */
  async analyzeThreatWithLLM(event, context = {}) {
    if (!this.llmConfig.enabled) {
      return this.generateFallbackDecision(event, 'LLM disabled');
    }

    // Combine system and user prompt for models that don't support system role
    const combinedPrompt = `You are an expert cybersecurity analyst for a Smart City Traffic Management System using Hyperledger Fabric blockchain.

🚨 SECURITY EVENT DETECTED:
${JSON.stringify(event, null, 2)}

📊 CONTEXT:
${JSON.stringify(context, null, 2)}

🎯 YOUR MISSION:
Analyze this threat and provide a DECISION in JSON format:

{
  "threatClassification": "sybil|ddos|double_spending|eclipse|replay|51_percent|data_manipulation|unauthorized_access|benign",
  "confidence": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "decision": {
    "action": "BLOCK|ALERT|MONITOR|QUARANTINE|ALLOW",
    "target": "<IP/Node/User>",
    "duration": <seconds>,
    "automated": true|false
  },
  "explanation": "<brief explanation>",
  "recommended_actions": [
    {"action": "<action>", "priority": "high|medium|low"}
  ],
  "blockchainImpact": "<impact on blockchain integrity>"
}

Respond ONLY with valid JSON.`;

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.llmConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.llmConfig.model,
          messages: [
            { role: 'user', content: combinedPrompt },
          ],
          max_tokens: this.llmConfig.maxTokens,
          temperature: this.llmConfig.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        this.stats.llmAnalyses++;
        this.stats.mistralDecisions++;
        
        // Try to parse JSON response
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const decision = JSON.parse(jsonMatch[0]);
            
            // Store Mistral decision
            const storedDecision = {
              id: `MISTRAL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              timestamp: new Date().toISOString(),
              event: event,
              analysis: decision,
              model: 'mistral-7b-instruct',
              responseTime: Date.now() - startTime,
            };
            this.mistralDecisions.unshift(storedDecision);
            if (this.mistralDecisions.length > 100) this.mistralDecisions.pop();
            
            this.log('info', `🤖 MISTRAL DECISION: ${decision.decision?.action || 'ANALYZE'} - ${decision.threatClassification} (${decision.confidence}% confidence)`);
            this.emit('mistral_decision', storedDecision);
            
            return decision;
          }
        } catch (parseError) {
          this.log('warn', `Failed to parse LLM response as JSON: ${parseError.message}`);
        }
        return { rawAnalysis: content };
      }

      return this.generateFallbackDecision(event, 'Empty response');
    } catch (error) {
      this.log('warn', `LLM analysis failed: ${error.message}`);
      return this.generateFallbackDecision(event, error.message);
    }
  }

  /**
   * Generate fallback decision when Mistral is unavailable
   */
  generateFallbackDecision(event, reason) {
    const severityMap = { low: 25, medium: 50, high: 75, critical: 95 };
    const confidence = severityMap[event.severity] || 50;
    
    let action = 'MONITOR';
    let duration = 0;
    
    if (event.type === 'ddos' || event.type === 'intrusion') {
      action = 'BLOCK';
      duration = 300;
    } else if (event.type === 'data_manipulation') {
      action = 'QUARANTINE';
      duration = 600;
    } else if (confidence > 70) {
      action = 'ALERT';
    }
    
    const decision = {
      threatClassification: event.type || 'unknown',
      confidence,
      riskLevel: event.severity || 'medium',
      decision: {
        action,
        target: event.source || 'unknown',
        duration,
        automated: action !== 'QUARANTINE',
      },
      explanation: `Rule-based decision (${reason})`,
      recommended_actions: [
        { action: 'Monitor system logs', priority: 'high' },
        { action: 'Review access patterns', priority: 'medium' },
      ],
      blockchainImpact: 'Requires manual verification',
      fallback: true,
    };
    
    // Store fallback decision
    const storedDecision = {
      id: `FALLBACK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      event,
      analysis: decision,
      model: 'rule-based-fallback',
      reason,
    };
    this.mistralDecisions.unshift(storedDecision);
    if (this.mistralDecisions.length > 100) this.mistralDecisions.pop();
    
    this.log('info', `📋 FALLBACK DECISION: ${action} - ${event.type} (rule-based)`);
    this.emit('fallback_decision', storedDecision);
    
    return decision;
  }

  /**
   * Enhanced analysis combining rule-based and LLM analysis
   */
  async analyzeEventWithLLM(event) {
    // First do rule-based analysis
    const ruleBasedAnalysis = this.analyzeEvent(event);

    // Then enhance with LLM analysis
    const llmAnalysis = await this.analyzeThreatWithLLM(event, {
      ruleBasedThreats: ruleBasedAnalysis.threats,
      ruleBasedScore: ruleBasedAnalysis.riskScore,
    });

    if (llmAnalysis) {
      ruleBasedAnalysis.llmAnalysis = llmAnalysis;
      
      // Merge LLM insights
      if (llmAnalysis.confidence && llmAnalysis.riskLevel) {
        ruleBasedAnalysis.llmConfidence = llmAnalysis.confidence;
        ruleBasedAnalysis.llmRiskLevel = llmAnalysis.riskLevel;
        ruleBasedAnalysis.llmExplanation = llmAnalysis.explanation;
        ruleBasedAnalysis.llmRecommendations = llmAnalysis.recommended_actions || llmAnalysis.recommendedActions;
        
        // Adjust risk score based on LLM confidence
        const combinedScore = (ruleBasedAnalysis.riskScore * 0.4) + (llmAnalysis.confidence * 0.6);
        ruleBasedAnalysis.combinedRiskScore = Math.round(combinedScore);
      }

      this.log('info', `LLM analysis completed: ${llmAnalysis.threatClassification || 'analyzed'}`);
    }

    return ruleBasedAnalysis;
  }

  /**
   * Set LLM configuration
   */
  setLLMConfig(config) {
    this.llmConfig = { ...this.llmConfig, ...config };
    this.log('info', `LLM config updated: ${JSON.stringify(this.llmConfig)}`);
  }

  /**
   * Enable/disable LLM analysis
   */
  setLLMEnabled(enabled) {
    this.llmConfig.enabled = enabled;
    this.log('info', `LLM analysis ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Load known attack signatures
   */
  loadAttackSignatures() {
    return {
      sybil: {
        name: 'Sybil Attack',
        patterns: [
          'multiple_identities_same_source',
          'rapid_node_registration',
          'identical_behavior_patterns',
          'coordinated_voting',
        ],
        indicators: {
          newNodesPerMinute: 5,
          identicalTransactionPatterns: 0.8,
          sameIPMultipleIdentities: 3,
        },
      },
      '51_percent': {
        name: '51% Attack',
        patterns: [
          'hashrate_concentration',
          'block_withholding',
          'chain_reorganization',
          'double_spend_attempt',
        ],
        indicators: {
          hashRateConcentration: 0.5,
          orphanBlockRate: 0.1,
          reorgDepth: 3,
        },
      },
      double_spending: {
        name: 'Double Spending Attack',
        patterns: [
          'same_utxo_multiple_tx',
          'race_condition_exploit',
          'finney_attack',
          'vector76_attack',
        ],
        indicators: {
          duplicateInputs: true,
          conflictingTransactions: 2,
          unconfirmedSpends: 3,
        },
      },
      ddos: {
        name: 'DDoS Attack',
        patterns: [
          'transaction_flooding',
          'resource_exhaustion',
          'memory_pool_spam',
          'peer_flooding',
        ],
        indicators: {
          txPerSecond: 1000,
          pendingTxCount: 10000,
          connectionAttempts: 500,
        },
      },
      replay: {
        name: 'Replay Attack',
        patterns: [
          'old_transaction_submission',
          'cross_chain_replay',
          'signature_reuse',
        ],
        indicators: {
          duplicateSignatures: true,
          oldTimestamps: true,
          invalidNonce: true,
        },
      },
      eclipse: {
        name: 'Eclipse Attack',
        patterns: [
          'peer_isolation',
          'connection_monopolization',
          'routing_manipulation',
        ],
        indicators: {
          singleSourceConnections: 0.8,
          peerDiversity: 0.2,
          networkPartition: true,
        },
      },
    };
  }

  start() {
    this.status = 'active';
    this.log('info', 'Analyzer Agent activated - Threat analysis engine online');
    this.emit('started', { agent: this.name });
    return { success: true, message: 'Analyzer Agent started' };
  }

  stop() {
    this.status = 'inactive';
    this.log('info', 'Analyzer Agent deactivated');
    this.emit('stopped', { agent: this.name });
    return { success: true, message: 'Analyzer Agent stopped' };
  }

  /**
   * Analyze an event for potential threats
   */
  analyzeEvent(event) {
    this.stats.analysesPerformed++;
    
    const analysis = {
      id: `ANALYSIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      event,
      threats: [],
      riskScore: 0,
      recommendations: [],
    };
    
    // Check against all attack signatures
    for (const [attackType, signature] of Object.entries(this.attackSignatures)) {
      const matchResult = this.matchSignature(event, signature);
      if (matchResult.isMatch) {
        analysis.threats.push({
          type: attackType,
          name: signature.name,
          confidence: matchResult.confidence,
          matchedPatterns: matchResult.matchedPatterns,
        });
        analysis.riskScore = Math.max(analysis.riskScore, matchResult.confidence * 100);
      }
    }
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis.threats);
    
    // Update stats
    if (analysis.threats.length > 0) {
      this.stats.threatsIdentified++;
      this.log('alert', `🔍 THREAT IDENTIFIED: ${analysis.threats.map(t => t.name).join(', ')}`);
      this.emit('threat_identified', analysis);
    }
    
    this.analysisHistory.push(analysis);
    if (this.analysisHistory.length > 500) {
      this.analysisHistory.shift();
    }
    
    return analysis;
  }

  /**
   * Match event against attack signature
   */
  matchSignature(event, signature) {
    let matchedPatterns = [];
    let totalScore = 0;
    
    // Check patterns
    signature.patterns.forEach(pattern => {
      if (this.checkPattern(event, pattern)) {
        matchedPatterns.push(pattern);
        totalScore += 1 / signature.patterns.length;
      }
    });
    
    // Check indicators
    for (const [indicator, threshold] of Object.entries(signature.indicators)) {
      if (this.checkIndicator(event, indicator, threshold)) {
        totalScore += 0.2;
      }
    }
    
    const confidence = Math.min(totalScore, 1);
    
    return {
      isMatch: confidence > 0.5,
      confidence,
      matchedPatterns,
    };
  }

  /**
   * Check if event matches a specific pattern
   */
  checkPattern(event, pattern) {
    // Simulate pattern matching (in production, use actual detection logic)
    const patternChecks = {
      multiple_identities_same_source: () => event.identityCount > 3,
      rapid_node_registration: () => event.registrationRate > 5,
      identical_behavior_patterns: () => event.behaviorSimilarity > 0.8,
      transaction_flooding: () => event.txRate > 1000,
      same_utxo_multiple_tx: () => event.duplicateInputs === true,
      peer_isolation: () => event.peerDiversity < 0.2,
      old_transaction_submission: () => event.txAge > 3600000,
      hashrate_concentration: () => event.topMinerShare > 0.5,
    };
    
    const check = patternChecks[pattern];
    return check ? check() : Math.random() > 0.8; // Random for unknown patterns
  }

  /**
   * Check indicator against threshold
   */
  checkIndicator(event, indicator, threshold) {
    if (event[indicator] !== undefined) {
      if (typeof threshold === 'boolean') {
        return event[indicator] === threshold;
      }
      return event[indicator] > threshold;
    }
    return false;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(threats) {
    const recommendations = [];
    
    threats.forEach(threat => {
      switch (threat.type) {
        case 'sybil':
          recommendations.push({
            action: 'Implement identity verification',
            priority: 'high',
            description: 'Add additional identity verification for new node registrations',
          });
          recommendations.push({
            action: 'Rate limit registrations',
            priority: 'medium',
            description: 'Limit new identity registrations per IP/time period',
          });
          break;
        case '51_percent':
          recommendations.push({
            action: 'Increase confirmation requirements',
            priority: 'critical',
            description: 'Require more block confirmations for high-value transactions',
          });
          recommendations.push({
            action: 'Alert consensus layer',
            priority: 'critical',
            description: 'Notify all nodes of potential majority attack',
          });
          break;
        case 'double_spending':
          recommendations.push({
            action: 'Freeze suspicious transactions',
            priority: 'critical',
            description: 'Hold conflicting transactions for manual review',
          });
          break;
        case 'ddos':
          recommendations.push({
            action: 'Activate rate limiting',
            priority: 'high',
            description: 'Reduce allowed requests per source',
          });
          recommendations.push({
            action: 'Scale resources',
            priority: 'medium',
            description: 'Increase network capacity to handle load',
          });
          break;
        case 'replay':
          recommendations.push({
            action: 'Verify transaction freshness',
            priority: 'high',
            description: 'Check nonce and timestamps on all transactions',
          });
          break;
        case 'eclipse':
          recommendations.push({
            action: 'Diversify peer connections',
            priority: 'high',
            description: 'Force new connections to different network segments',
          });
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Analyze entity behavior over time
   */
  analyzeBehavior(entityId, actions) {
    let profile = this.behaviorProfiles.get(entityId) || {
      entityId,
      firstSeen: new Date().toISOString(),
      actionCount: 0,
      patterns: {},
      riskLevel: 'low',
    };
    
    // Update profile with new actions
    profile.actionCount += actions.length;
    profile.lastSeen = new Date().toISOString();
    
    // Analyze action patterns
    actions.forEach(action => {
      profile.patterns[action.type] = (profile.patterns[action.type] || 0) + 1;
    });
    
    // Calculate threat score
    const threatScore = this.calculateThreatScore(profile);
    this.threatScores.set(entityId, threatScore);
    
    // Update risk level
    if (threatScore > 80) profile.riskLevel = 'critical';
    else if (threatScore > 60) profile.riskLevel = 'high';
    else if (threatScore > 40) profile.riskLevel = 'medium';
    else profile.riskLevel = 'low';
    
    this.behaviorProfiles.set(entityId, profile);
    
    if (profile.riskLevel === 'high' || profile.riskLevel === 'critical') {
      this.log('warn', `High-risk entity detected: ${entityId} (score: ${threatScore})`);
      this.emit('high_risk_entity', { entityId, profile, threatScore });
    }
    
    return { profile, threatScore };
  }

  /**
   * Calculate threat score for an entity
   */
  calculateThreatScore(profile) {
    let score = 0;
    
    // High action frequency
    const actionsPerDay = profile.actionCount / this.daysSinceFirstSeen(profile.firstSeen);
    if (actionsPerDay > 1000) score += 30;
    else if (actionsPerDay > 500) score += 20;
    else if (actionsPerDay > 100) score += 10;
    
    // Suspicious action patterns
    const suspiciousPatterns = ['failed_auth', 'invalid_tx', 'duplicate_request'];
    suspiciousPatterns.forEach(pattern => {
      if (profile.patterns[pattern] > 10) score += 20;
      else if (profile.patterns[pattern] > 5) score += 10;
    });
    
    // Add some randomness for simulation
    score += Math.random() * 10;
    
    return Math.min(Math.round(score), 100);
  }

  daysSinceFirstSeen(firstSeen) {
    const diff = Date.now() - new Date(firstSeen).getTime();
    return Math.max(diff / (1000 * 60 * 60 * 24), 1);
  }

  /**
   * Correlate multiple events to detect complex attacks
   */
  correlateEvents(events) {
    const correlation = {
      id: `CORR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventCount: events.length,
      correlatedThreats: [],
      overallRiskScore: 0,
    };
    
    // Analyze each event
    const analyses = events.map(e => this.analyzeEvent(e));
    
    // Look for correlated threats
    const threatCounts = {};
    analyses.forEach(a => {
      a.threats.forEach(t => {
        threatCounts[t.type] = (threatCounts[t.type] || 0) + 1;
      });
    });
    
    // Detect coordinated attacks
    for (const [threatType, count] of Object.entries(threatCounts)) {
      if (count >= 3) {
        correlation.correlatedThreats.push({
          type: threatType,
          occurrences: count,
          severity: 'coordinated_attack',
        });
        correlation.overallRiskScore += 25;
      }
    }
    
    if (correlation.correlatedThreats.length > 0) {
      this.log('alert', `🚨 COORDINATED ATTACK DETECTED: ${correlation.correlatedThreats.map(t => t.type).join(', ')}`);
      this.emit('coordinated_attack', correlation);
    }
    
    return correlation;
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
      mistralAvailable: this.mistralAvailable,
      llmConfig: {
        enabled: this.llmConfig.enabled,
        model: this.llmConfig.model,
        baseUrl: this.llmConfig.baseUrl,
      },
      recentAnalyses: this.analysisHistory.slice(-10),
      recentMistralDecisions: this.mistralDecisions.slice(0, 5),
      highRiskEntities: Array.from(this.threatScores.entries())
        .filter(([, score]) => score > 60)
        .map(([id, score]) => ({ id, score })),
    };
  }

  getAttackSignatures() {
    return this.attackSignatures;
  }

  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }
}

module.exports = AnalyzerAgent;
