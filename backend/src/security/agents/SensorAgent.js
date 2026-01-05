/**
 * SENSOR AGENT - Network Monitoring & Data Collection
 * 
 * Responsibilities:
 * - Monitor blockchain network activity
 * - Collect transaction metrics
 * - Detect anomalies in real-time
 * - Measure network health
 */

const EventEmitter = require('events');

class SensorAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'Sensor';
    this.status = 'inactive';
    this.metrics = {
      transactions: {
        total: 0,
        perSecond: 0,
        failed: 0,
        pending: 0,
      },
      network: {
        activeNodes: 6,
        latency: 0,
        bandwidth: 0,
        connections: 0,
      },
      blocks: {
        height: 0,
        lastBlockTime: null,
        avgBlockTime: 0,
      },
      security: {
        suspiciousActivities: 0,
        failedAuthentications: 0,
        invalidTransactions: 0,
      },
    };
    this.transactionHistory = []; // Last 100 transactions
    this.anomalyThresholds = {
      maxTxPerSecond: 1000,
      maxLatency: 5000, // 5 seconds
      maxFailedAuth: 10,
      minActiveNodes: 2,
    };
    this.detectedAnomalies = [];
    this.logs = [];
    this.monitoringInterval = null;
  }

  start() {
    this.status = 'active';
    this.log('info', 'Sensor Agent activated - Monitoring network activity');
    this.emit('started', { agent: this.name });
    
    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => this.collectMetrics(), 5000);
    
    return { success: true, message: 'Sensor Agent started' };
  }

  stop() {
    this.status = 'inactive';
    this.log('info', 'Sensor Agent deactivated');
    this.emit('stopped', { agent: this.name });
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    return { success: true, message: 'Sensor Agent stopped' };
  }

  /**
   * Collect current network metrics
   */
  collectMetrics() {
    // Simulate metric collection (in production, this would query actual network)
    const newMetrics = this.simulateMetricCollection();
    
    // Check for anomalies
    this.detectAnomalies(newMetrics);
    
    // Update metrics
    this.metrics = { ...this.metrics, ...newMetrics };
    
    this.emit('metrics_updated', this.metrics);
    
    return this.metrics;
  }

  /**
   * Simulate metric collection (replace with actual blockchain queries)
   */
  simulateMetricCollection() {
    const baseLatency = 50;
    const variance = Math.random() * 100;
    
    return {
      transactions: {
        total: this.metrics.transactions.total + Math.floor(Math.random() * 10),
        perSecond: Math.floor(Math.random() * 50) + 10,
        failed: this.metrics.transactions.failed + (Math.random() > 0.95 ? 1 : 0),
        pending: Math.floor(Math.random() * 20),
      },
      network: {
        activeNodes: 6 - (Math.random() > 0.98 ? 1 : 0),
        latency: baseLatency + variance,
        bandwidth: Math.floor(Math.random() * 1000) + 500,
        connections: Math.floor(Math.random() * 50) + 20,
      },
      blocks: {
        height: this.metrics.blocks.height + (Math.random() > 0.8 ? 1 : 0),
        lastBlockTime: new Date().toISOString(),
        avgBlockTime: 2000 + Math.random() * 500,
      },
      security: {
        suspiciousActivities: this.metrics.security.suspiciousActivities,
        failedAuthentications: this.metrics.security.failedAuthentications + (Math.random() > 0.98 ? 1 : 0),
        invalidTransactions: this.metrics.security.invalidTransactions + (Math.random() > 0.99 ? 1 : 0),
      },
    };
  }

  /**
   * Record a transaction for monitoring
   */
  recordTransaction(tx) {
    const txRecord = {
      id: tx.id || `TX-${Date.now()}`,
      type: tx.type || 'unknown',
      from: tx.from,
      to: tx.to,
      timestamp: new Date().toISOString(),
      status: tx.status || 'pending',
      latency: tx.latency,
      size: tx.size || 0,
    };
    
    this.transactionHistory.push(txRecord);
    if (this.transactionHistory.length > 100) {
      this.transactionHistory.shift();
    }
    
    this.metrics.transactions.total++;
    
    // Check for suspicious patterns
    this.checkTransactionPattern(txRecord);
    
    this.emit('transaction_recorded', txRecord);
    
    return txRecord;
  }

  /**
   * Check transaction patterns for suspicious activity
   */
  checkTransactionPattern(tx) {
    const recentTx = this.transactionHistory.slice(-20);
    
    // Check for rapid transactions from same source
    const sameSourceTx = recentTx.filter(t => t.from === tx.from);
    if (sameSourceTx.length > 10) {
      this.reportAnomaly({
        type: 'rapid_transactions',
        severity: 'medium',
        source: tx.from,
        message: `Rapid transactions detected from ${tx.from}: ${sameSourceTx.length} in short period`,
      });
    }
    
    // Check for identical transactions (potential replay)
    const duplicates = recentTx.filter(t => 
      t.from === tx.from && 
      t.to === tx.to && 
      t.type === tx.type
    );
    if (duplicates.length > 5) {
      this.reportAnomaly({
        type: 'potential_replay',
        severity: 'high',
        source: tx.from,
        message: `Potential replay attack: ${duplicates.length} identical transactions`,
      });
    }
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(metrics) {
    const anomalies = [];
    
    // High transaction rate
    if (metrics.transactions.perSecond > this.anomalyThresholds.maxTxPerSecond) {
      anomalies.push({
        type: 'high_tx_rate',
        severity: 'high',
        value: metrics.transactions.perSecond,
        threshold: this.anomalyThresholds.maxTxPerSecond,
        message: `Transaction rate ${metrics.transactions.perSecond} exceeds threshold`,
      });
    }
    
    // High latency
    if (metrics.network.latency > this.anomalyThresholds.maxLatency) {
      anomalies.push({
        type: 'high_latency',
        severity: 'medium',
        value: metrics.network.latency,
        threshold: this.anomalyThresholds.maxLatency,
        message: `Network latency ${metrics.network.latency}ms exceeds threshold`,
      });
    }
    
    // Low active nodes (potential network issue or attack)
    if (metrics.network.activeNodes < this.anomalyThresholds.minActiveNodes) {
      anomalies.push({
        type: 'low_node_count',
        severity: 'critical',
        value: metrics.network.activeNodes,
        threshold: this.anomalyThresholds.minActiveNodes,
        message: `Only ${metrics.network.activeNodes} active nodes - possible network attack`,
      });
    }
    
    // Failed authentications spike
    if (metrics.security.failedAuthentications > this.anomalyThresholds.maxFailedAuth) {
      anomalies.push({
        type: 'auth_failures',
        severity: 'high',
        value: metrics.security.failedAuthentications,
        threshold: this.anomalyThresholds.maxFailedAuth,
        message: `High failed authentication attempts: ${metrics.security.failedAuthentications}`,
      });
    }
    
    // Report detected anomalies
    anomalies.forEach(a => this.reportAnomaly(a));
    
    return anomalies;
  }

  /**
   * Report an anomaly
   */
  reportAnomaly(anomaly) {
    const fullAnomaly = {
      ...anomaly,
      id: `ANOMALY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      agent: this.name,
    };
    
    this.detectedAnomalies.push(fullAnomaly);
    if (this.detectedAnomalies.length > 100) {
      this.detectedAnomalies.shift();
    }
    
    this.metrics.security.suspiciousActivities++;
    
    this.log('warn', `ANOMALY DETECTED: ${anomaly.type} - ${anomaly.message}`);
    this.emit('anomaly_detected', fullAnomaly);
    
    return fullAnomaly;
  }

  /**
   * Monitor specific peer health
   */
  monitorPeer(peerId) {
    // Simulate peer health check
    const health = {
      peerId,
      status: Math.random() > 0.1 ? 'healthy' : 'degraded',
      latency: Math.floor(Math.random() * 100) + 20,
      lastSeen: new Date().toISOString(),
      blocksProcessed: Math.floor(Math.random() * 1000),
      errorRate: Math.random() * 0.05,
    };
    
    if (health.status === 'degraded') {
      this.reportAnomaly({
        type: 'peer_degraded',
        severity: 'medium',
        source: peerId,
        message: `Peer ${peerId} is in degraded state`,
      });
    }
    
    return health;
  }

  /**
   * Get network topology snapshot
   */
  getNetworkTopology() {
    const peers = [
      'peer0.org1.traffic.com',
      'peer1.org1.traffic.com',
      'peer0.org2.traffic.com',
      'peer1.org2.traffic.com',
      'peer0.org3.traffic.com',
      'peer1.org3.traffic.com',
    ];
    
    return peers.map(peerId => ({
      ...this.monitorPeer(peerId),
      connections: peers.filter(p => p !== peerId).slice(0, Math.floor(Math.random() * 3) + 2),
    }));
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
      metrics: this.metrics,
      recentAnomalies: this.detectedAnomalies.slice(-10),
      thresholds: this.anomalyThresholds,
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getAnomalies(limit = 20) {
    return this.detectedAnomalies.slice(-limit);
  }

  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }
}

module.exports = SensorAgent;
