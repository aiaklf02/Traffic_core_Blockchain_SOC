/**
 * ============================================================================
 * Routes Simulation - Smart City Traffic Management System
 * ============================================================================
 * Routes API pour la simulation avec transactions blockchain réelles
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

const simulationController = require('../controllers/simulation.controller');

// ============================================================================
// Simulation Control
// ============================================================================

/**
 * @route   GET /api/v1/simulation/status
 * @desc    Get simulation status
 * @access  Public
 */
router.get('/status', simulationController.getStatus);

/**
 * @route   POST /api/v1/simulation/start
 * @desc    Start simulation mode
 * @access  Public
 */
router.post('/start', simulationController.startSimulation);

/**
 * @route   POST /api/v1/simulation/stop
 * @desc    Stop simulation mode
 * @access  Public
 */
router.post('/stop', simulationController.stopSimulation);

/**
 * @route   POST /api/v1/simulation/reset
 * @desc    Reset simulation stats
 * @access  Public
 */
router.post('/reset', simulationController.resetSimulation);

// ============================================================================
// Transaction Recording (Real blockchain transactions)
// ============================================================================

/**
 * @route   POST /api/v1/simulation/tx/vehicle
 * @desc    Record vehicle movement on blockchain
 * @access  Public
 */
router.post('/tx/vehicle', simulationController.recordVehicleMove);

/**
 * @route   POST /api/v1/simulation/tx/sensor
 * @desc    Record sensor reading on blockchain
 * @access  Public
 */
router.post('/tx/sensor', simulationController.recordSensorReading);

/**
 * @route   POST /api/v1/simulation/tx/event
 * @desc    Record traffic event on blockchain
 * @access  Public
 */
router.post('/tx/event', simulationController.recordTrafficEvent);

/**
 * @route   POST /api/v1/simulation/tx/signal
 * @desc    Record signal change on blockchain
 * @access  Public
 */
router.post('/tx/signal', simulationController.recordSignalChange);

/**
 * @route   POST /api/v1/simulation/tx/batch
 * @desc    Batch submit multiple transactions
 * @access  Public
 */
router.post('/tx/batch', simulationController.batchSubmit);

// ============================================================================
// Query
// ============================================================================

/**
 * @route   GET /api/v1/simulation/transactions
 * @desc    Get transaction history
 * @access  Public
 */
router.get('/transactions', simulationController.getTransactions);

/**
 * @route   GET /api/v1/simulation/blockchain
 * @desc    Get blockchain info
 * @access  Public
 */
router.get('/blockchain', simulationController.getBlockchainInfo);

module.exports = router;
