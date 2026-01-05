/**
 * SOC BLOCKCHAIN SERVICE
 * 
 * Service for recording SOC incidents and actions on blockchain
 * Provides immutable audit trail for security operations
 */

const { fabricService } = require('../services/fabric.service');
const { logger } = require('../utils/logger');

const CHAINCODE = 'sensor-data';

class SOCBlockchainService {
  constructor() {
    this.enabled = true;
    this.pendingRecords = []; // Queue for when blockchain is not available
  }

  /**
   * Generate unique ID
   */
  generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Check if blockchain is available
   */
  isBlockchainAvailable() {
    return fabricService.isConnectionActive && fabricService.isConnectionActive();
  }

  /**
   * Record a security incident on blockchain
   */
  async recordIncident(incident) {
    const incidentId = incident.id || this.generateId('INC');
    
    const record = {
      id: incidentId,
      type: incident.type || 'unknown',
      severity: incident.severity || 'medium',
      description: incident.description || '',
      sourceIP: incident.sourceIP || '',
      detectedBy: incident.detectedBy || 'SOC',
      threatScore: incident.threatScore || 0.5,
      llmAnalysis: incident.llmAnalysis || '',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!this.isBlockchainAvailable()) {
        logger.warn('Blockchain not available, queuing incident record', { incidentId });
        this.pendingRecords.push({ type: 'incident', data: record });
        return { success: true, queued: true, id: incidentId };
      }

      await fabricService.submitTransaction(
        CHAINCODE,
        'RecordSecurityIncident',
        record.id,
        record.type,
        record.severity,
        record.description,
        record.sourceIP,
        record.detectedBy,
        record.threatScore.toString(),
        record.llmAnalysis
      );

      logger.info('Security incident recorded on blockchain', { incidentId, type: record.type });
      return { success: true, id: incidentId, txRecorded: true };

    } catch (error) {
      logger.error('Failed to record incident on blockchain', { error: error.message, incidentId });
      this.pendingRecords.push({ type: 'incident', data: record });
      return { success: false, error: error.message, queued: true, id: incidentId };
    }
  }

  /**
   * Record a defense action on blockchain
   */
  async recordDefenseAction(action) {
    const actionId = action.id || this.generateId('ACT');
    
    const record = {
      id: actionId,
      incidentId: action.incidentId || '',
      actionType: action.type || action.actionType || 'unknown',
      target: action.target || action.ip || action.nodeId || '',
      reason: action.reason || '',
      executedBy: action.agent || action.executedBy || 'Defender',
      duration: action.duration || 300, // 5 minutes default
      autoExpires: action.autoExpires !== false,
      timestamp: new Date().toISOString(),
    };

    try {
      if (!this.isBlockchainAvailable()) {
        logger.warn('Blockchain not available, queuing defense action', { actionId });
        this.pendingRecords.push({ type: 'action', data: record });
        return { success: true, queued: true, id: actionId };
      }

      await fabricService.submitTransaction(
        CHAINCODE,
        'RecordDefenseAction',
        record.id,
        record.incidentId,
        record.actionType,
        record.target,
        record.reason,
        record.executedBy,
        record.duration.toString(),
        record.autoExpires.toString()
      );

      logger.info('Defense action recorded on blockchain', { actionId, type: record.actionType });
      return { success: true, id: actionId, txRecorded: true };

    } catch (error) {
      logger.error('Failed to record defense action on blockchain', { error: error.message, actionId });
      this.pendingRecords.push({ type: 'action', data: record });
      return { success: false, error: error.message, queued: true, id: actionId };
    }
  }

  /**
   * Record threat intelligence on blockchain
   */
  async recordThreatIntel(threat) {
    const threatId = threat.id || this.generateId('THR');
    
    const record = {
      id: threatId,
      threatType: threat.type || threat.threatType || 'unknown',
      indicator: threat.indicator || threat.ip || threat.pattern || '',
      indicatorType: threat.indicatorType || 'ip',
      source: threat.source || 'internal',
      confidence: threat.confidence || 0.5,
      notes: threat.notes || threat.description || '',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!this.isBlockchainAvailable()) {
        logger.warn('Blockchain not available, queuing threat intel', { threatId });
        this.pendingRecords.push({ type: 'threat', data: record });
        return { success: true, queued: true, id: threatId };
      }

      await fabricService.submitTransaction(
        CHAINCODE,
        'RecordThreatIntelligence',
        record.id,
        record.threatType,
        record.indicator,
        record.indicatorType,
        record.source,
        record.confidence.toString(),
        record.notes
      );

      logger.info('Threat intelligence recorded on blockchain', { threatId, type: record.threatType });
      return { success: true, id: threatId, txRecorded: true };

    } catch (error) {
      logger.error('Failed to record threat intel on blockchain', { error: error.message, threatId });
      this.pendingRecords.push({ type: 'threat', data: record });
      return { success: false, error: error.message, queued: true, id: threatId };
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, newStatus) {
    try {
      if (!this.isBlockchainAvailable()) {
        logger.warn('Blockchain not available for status update', { incidentId });
        return { success: false, error: 'Blockchain not available' };
      }

      await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateIncidentStatus',
        incidentId,
        newStatus
      );

      logger.info('Incident status updated on blockchain', { incidentId, newStatus });
      return { success: true, incidentId, newStatus };

    } catch (error) {
      logger.error('Failed to update incident status', { error: error.message, incidentId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke a defense action
   */
  async revokeDefenseAction(actionId) {
    try {
      if (!this.isBlockchainAvailable()) {
        return { success: false, error: 'Blockchain not available' };
      }

      await fabricService.submitTransaction(
        CHAINCODE,
        'RevokeDefenseAction',
        actionId
      );

      logger.info('Defense action revoked on blockchain', { actionId });
      return { success: true, actionId };

    } catch (error) {
      logger.error('Failed to revoke defense action', { error: error.message, actionId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get incident from blockchain
   */
  async getIncident(incidentId) {
    try {
      if (!this.isBlockchainAvailable()) {
        return null;
      }

      const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetSecurityIncident',
        incidentId
      );

      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Failed to get incident', { error: error.message, incidentId });
      return null;
    }
  }

  /**
   * Get defense action from blockchain
   */
  async getDefenseAction(actionId) {
    try {
      if (!this.isBlockchainAvailable()) {
        return null;
      }

      const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetDefenseAction',
        actionId
      );

      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Failed to get defense action', { error: error.message, actionId });
      return null;
    }
  }

  /**
   * Get incident history from blockchain
   */
  async getIncidentHistory(incidentId) {
    try {
      if (!this.isBlockchainAvailable()) {
        return [];
      }

      const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetIncidentHistory',
        incidentId
      );

      return result ? JSON.parse(result) : [];
    } catch (error) {
      logger.error('Failed to get incident history', { error: error.message, incidentId });
      return [];
    }
  }

  /**
   * Process pending records when blockchain becomes available
   */
  async processPendingRecords() {
    if (!this.isBlockchainAvailable() || this.pendingRecords.length === 0) {
      return { processed: 0 };
    }

    let processed = 0;
    const failed = [];

    while (this.pendingRecords.length > 0) {
      const record = this.pendingRecords.shift();
      
      try {
        switch (record.type) {
          case 'incident':
            await this.recordIncident(record.data);
            break;
          case 'action':
            await this.recordDefenseAction(record.data);
            break;
          case 'threat':
            await this.recordThreatIntel(record.data);
            break;
        }
        processed++;
      } catch (error) {
        failed.push(record);
      }
    }

    // Re-queue failed records
    this.pendingRecords.push(...failed);

    logger.info('Processed pending SOC records', { processed, failed: failed.length });
    return { processed, failed: failed.length };
  }

  /**
   * Get security statistics from blockchain
   */
  async getSecurityStats() {
    const stats = {
      incidentsOnChain: 0,
      actionsOnChain: 0,
      threatsOnChain: 0,
      pendingRecords: this.pendingRecords.length,
      blockchainConnected: this.isBlockchainAvailable(),
    };

    // Try to get counts by querying known IDs
    // Note: With CouchDB, we could use rich queries to count all
    // With LevelDB, we just check if blockchain is working
    
    if (this.isBlockchainAvailable()) {
      try {
        // Test blockchain connectivity
        await fabricService.evaluateTransaction(CHAINCODE, 'GetSensor', 'TEST-CONNECTIVITY');
      } catch (e) {
        // Expected to fail, but confirms connectivity
        stats.blockchainConnected = !e.message.includes('not connected');
      }
    }

    return stats;
  }
}

// Singleton instance
const socBlockchainService = new SOCBlockchainService();

module.exports = {
  socBlockchainService,
  SOCBlockchainService,
};
