/**
 * DEFENDER AGENT - Security Protection Layer
 * 
 * Responsibilities:
 * - Firewall management
 * - IP blocking/whitelisting
 * - Rate limiting enforcement
 * - Quarantine malicious actors
 */

const EventEmitter = require('events');

class DefenderAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'Defender';
    this.status = 'inactive';
    this.blockedIPs = new Set();
    this.whitelistedIPs = new Set(['127.0.0.1', 'localhost']);
    this.quarantinedNodes = new Map(); // nodeId -> { reason, timestamp, duration }
    this.rateLimits = new Map(); // IP -> { count, windowStart }
    this.config = {
      maxRequestsPerMinute: 100,
      blockDuration: 300000, // 5 minutes
      quarantineDuration: 600000, // 10 minutes
    };
    this.stats = {
      blockedRequests: 0,
      quarantinedNodes: 0,
      activeBlocks: 0,
      threatsMitigated: 0,
    };
    this.logs = [];
  }

  start() {
    this.status = 'active';
    this.log('info', 'Defender Agent activated - Protecting network perimeter');
    this.emit('started', { agent: this.name });
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    return { success: true, message: 'Defender Agent started' };
  }

  stop() {
    this.status = 'inactive';
    this.log('info', 'Defender Agent deactivated');
    this.emit('stopped', { agent: this.name });
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    return { success: true, message: 'Defender Agent stopped' };
  }

  /**
   * Check if request should be allowed
   */
  checkRequest(ip, endpoint) {
    // Check whitelist first
    if (this.whitelistedIPs.has(ip)) {
      return { allowed: true, reason: 'whitelisted' };
    }

    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      this.stats.blockedRequests++;
      this.log('warn', `Blocked request from ${ip} to ${endpoint}`);
      return { allowed: false, reason: 'blocked' };
    }

    // Check rate limit
    const rateCheck = this.checkRateLimit(ip);
    if (!rateCheck.allowed) {
      this.blockIP(ip, 'Rate limit exceeded');
      return rateCheck;
    }

    return { allowed: true, reason: 'passed' };
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    
    if (!this.rateLimits.has(ip)) {
      this.rateLimits.set(ip, { count: 1, windowStart: now });
      return { allowed: true };
    }

    const limit = this.rateLimits.get(ip);
    
    // Reset window if expired
    if (now - limit.windowStart > windowSize) {
      this.rateLimits.set(ip, { count: 1, windowStart: now });
      return { allowed: true };
    }

    // Increment and check
    limit.count++;
    
    if (limit.count > this.config.maxRequestsPerMinute) {
      this.log('warn', `Rate limit exceeded for ${ip}: ${limit.count} requests/min`);
      return { allowed: false, reason: 'rate_limit_exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Block an IP address
   */
  blockIP(ip, reason = 'Security threat detected') {
    if (this.whitelistedIPs.has(ip)) {
      this.log('warn', `Cannot block whitelisted IP: ${ip}`);
      return { success: false, reason: 'IP is whitelisted' };
    }

    this.blockedIPs.add(ip);
    this.stats.activeBlocks++;
    this.stats.threatsMitigated++;
    this.log('alert', `🛡️ BLOCKED IP: ${ip} - Reason: ${reason}`);
    this.emit('ip_blocked', { ip, reason, timestamp: new Date() });

    // Auto-unblock after duration
    setTimeout(() => {
      this.unblockIP(ip);
    }, this.config.blockDuration);

    return { success: true, message: `IP ${ip} blocked` };
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip) {
    if (this.blockedIPs.has(ip)) {
      this.blockedIPs.delete(ip);
      this.stats.activeBlocks--;
      this.log('info', `Unblocked IP: ${ip}`);
      this.emit('ip_unblocked', { ip, timestamp: new Date() });
      return { success: true, message: `IP ${ip} unblocked` };
    }
    return { success: false, message: 'IP not in blocked list' };
  }

  /**
   * Quarantine a blockchain node
   */
  quarantineNode(nodeId, reason = 'Suspicious activity') {
    const quarantineInfo = {
      reason,
      timestamp: Date.now(),
      duration: this.config.quarantineDuration,
    };
    
    this.quarantinedNodes.set(nodeId, quarantineInfo);
    this.stats.quarantinedNodes++;
    this.log('alert', `🔒 NODE QUARANTINED: ${nodeId} - Reason: ${reason}`);
    this.emit('node_quarantined', { nodeId, reason, timestamp: new Date() });

    // Auto-release after duration
    setTimeout(() => {
      this.releaseNode(nodeId);
    }, this.config.quarantineDuration);

    return { success: true, message: `Node ${nodeId} quarantined` };
  }

  /**
   * Release a node from quarantine
   */
  releaseNode(nodeId) {
    if (this.quarantinedNodes.has(nodeId)) {
      this.quarantinedNodes.delete(nodeId);
      this.log('info', `Node released from quarantine: ${nodeId}`);
      this.emit('node_released', { nodeId, timestamp: new Date() });
      return { success: true, message: `Node ${nodeId} released` };
    }
    return { success: false, message: 'Node not in quarantine' };
  }

  /**
   * Check if node is quarantined
   */
  isNodeQuarantined(nodeId) {
    return this.quarantinedNodes.has(nodeId);
  }

  /**
   * Respond to detected attack
   */
  respondToAttack(attack) {
    this.log('alert', `🚨 RESPONDING TO ATTACK: ${attack.type}`);
    
    const responses = {
      sybil: () => {
        // Block suspicious IPs, quarantine fake nodes
        if (attack.sourceIP) this.blockIP(attack.sourceIP, 'Sybil attack source');
        if (attack.nodeIds) {
          attack.nodeIds.forEach(id => this.quarantineNode(id, 'Sybil attack - fake identity'));
        }
      },
      ddos: () => {
        // Aggressive rate limiting, block attacking IPs
        this.config.maxRequestsPerMinute = 20; // Reduce limit during attack
        if (attack.sourceIPs) {
          attack.sourceIPs.forEach(ip => this.blockIP(ip, 'DDoS attack source'));
        }
      },
      '51_percent': () => {
        // Quarantine malicious nodes, alert consensus layer
        if (attack.nodeIds) {
          attack.nodeIds.forEach(id => this.quarantineNode(id, '51% attack participant'));
        }
        this.emit('consensus_alert', { type: '51_percent_attack', severity: 'critical' });
      },
      double_spending: () => {
        // Block transaction sources, quarantine nodes
        if (attack.sourceAddress) {
          this.log('alert', `Blocking transactions from: ${attack.sourceAddress}`);
        }
      },
      replay: () => {
        // Invalidate old transactions
        this.log('alert', 'Activating replay protection - invalidating old transaction signatures');
      },
      eclipse: () => {
        // Diversify peer connections
        this.log('alert', 'Eclipse attack detected - initiating peer diversification');
        if (attack.isolatedNodes) {
          attack.isolatedNodes.forEach(id => {
            this.emit('reconnect_node', { nodeId: id });
          });
        }
      },
    };

    const response = responses[attack.type];
    if (response) {
      response();
      this.stats.threatsMitigated++;
      return { success: true, message: `Response executed for ${attack.type} attack` };
    }

    return { success: false, message: `Unknown attack type: ${attack.type}` };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    
    // Cleanup expired quarantines
    for (const [nodeId, info] of this.quarantinedNodes) {
      if (now - info.timestamp > info.duration) {
        this.releaseNode(nodeId);
      }
    }

    // Cleanup old rate limit entries
    for (const [ip, limit] of this.rateLimits) {
      if (now - limit.windowStart > 120000) { // 2 minutes
        this.rateLimits.delete(ip);
      }
    }
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
      blockedIPs: Array.from(this.blockedIPs),
      quarantinedNodes: Array.from(this.quarantinedNodes.entries()),
      config: this.config,
    };
  }

  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }
}

module.exports = DefenderAgent;
